

# Paid Multiplayer Poker Tournaments -- Implementation Plan

## Overview

Add admin-only paid poker tournaments where players pay a Stripe entry fee to register, compete across multiple tables with synchronized blinds, and the winner receives a prize pool. Only the app admin (`amir_wanas@wp.pl`) can create and manage tournaments.

---

## Step 1: Database Schema

### New table: `paid_tournaments`

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid | gen_random_uuid() | PK |
| name | text | NOT NULL | Tournament name |
| status | text | 'draft' | draft, scheduled, running, complete, cancelled |
| entry_fee_pence | integer | NOT NULL | Entry fee in pence (e.g. 100 = GBP1) |
| max_players | integer | NOT NULL | 9-900 |
| starting_stack | integer | 5000 | Tournament chips |
| starting_sb | integer | 25 | Starting small blind |
| starting_bb | integer | 50 | Starting big blind |
| starting_ante | integer | 0 | Starting ante |
| blind_interval_minutes | integer | 15 | Minutes per blind level |
| current_blind_level | integer | 0 | Current level (0 = not started) |
| level_started_at | timestamptz | NULL | When current level started |
| payout_preset | text | 'winner_takes_all' | Preset key |
| payout_structure | jsonb | '[]' | Computed payout splits |
| start_at | timestamptz | NOT NULL | Scheduled start time |
| started_at | timestamptz | NULL | Actual start time |
| completed_at | timestamptz | NULL | When tournament ended |
| created_by | uuid | auth.uid() | Must be app admin |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

Payout presets stored in `payout_preset`:
- `winner_takes_all` -- 1st: 100%
- `top_2` -- 1st: 70%, 2nd: 30%
- `top_3` -- 1st: 60%, 2nd: 30%, 3rd: 10%

### New table: `paid_tournament_registrations`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| tournament_id | uuid | FK to paid_tournaments |
| user_id | uuid | Registered player |
| paid_amount_pence | integer | Amount paid |
| stripe_checkout_session_id | text | Stripe session ID |
| stripe_payment_intent_id | text | Nullable |
| status | text | pending, paid, cancelled, refunded |
| created_at | timestamptz | |

Constraints:
- UNIQUE (tournament_id, user_id) -- prevents double registration
- Registration count enforced server-side with row-level locking for race safety

### New table: `paid_tournament_payouts`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| tournament_id | uuid | FK |
| user_id | uuid | Winner |
| position | integer | Finishing position |
| amount_pence | integer | Prize amount |
| status | text | pending, paid |
| due_at | timestamptz | completed_at + 48h |
| paid_at | timestamptz | Nullable |
| notes | text | Admin notes |
| created_at | timestamptz | |

### RLS Policies

- `paid_tournaments`: SELECT for all authenticated users (tournaments are public listings). No client INSERT/UPDATE/DELETE (admin uses service role via edge functions).
- `paid_tournament_registrations`: SELECT for own registrations + admin. No client INSERT (edge function handles).
- `paid_tournament_payouts`: SELECT for own payouts + admin. No client INSERT/UPDATE.

### Existing table changes

- `poker_tables` already has `tournament_id` column -- reuse for paid tournaments.
- Add `paid_tournament_id uuid` column to `poker_tables` to link to the new `paid_tournaments` table (separate from existing `tournament_id` which links to `poker_tournaments`).

---

## Step 2: Edge Functions

### A) `paid-tournament-create` (admin only)
- Validates caller is app admin (checks `app_admins` table, NOT email string comparison)
- Creates tournament in `draft` status
- Admin can later set status to `scheduled` to open registration

### B) `paid-tournament-manage` (admin only)
- Actions: `publish` (draft -> scheduled), `cancel`, `mark_payout_paid`
- All actions validate admin via `app_admins`

### C) `paid-tournament-register` (Stripe Checkout)
- Validates: user authenticated, Level 5+, tournament is `scheduled`, not already registered, not full
- Race-safe max_players check: uses `SELECT count(*) ... FOR UPDATE` via a DB function
- Creates Stripe Checkout Session with `mode: "payment"`, `metadata: { tournament_id, user_id }`
- Inserts registration with status `pending`
- Returns checkout URL

### D) `paid-tournament-webhook` (Stripe webhook, no JWT)
- Receives `checkout.session.completed` events
- Validates Stripe webhook signature
- Looks up registration by `stripe_checkout_session_id`
- Updates status to `paid`, stores `payment_intent_id`
- Idempotent: skips if already `paid`
- Added to `config.toml` with `verify_jwt = false`

### E) `paid-tournament-start` (admin only, or cron-triggered)
- Validates all conditions: tournament is `scheduled`, start_at has passed, enough paid players (minimum 2)
- Seats all `paid` registrations into tables of max 9
- Creates poker_tables with `paid_tournament_id` set
- Round-robin player assignment
- Sets tournament status to `running`, records `started_at`, sets blind level 1
- Returns table IDs

### F) `paid-tournament-advance-blinds` (cron or admin-triggered)
- Checks all `running` paid tournaments
- If `blind_interval_minutes` has elapsed since `level_started_at`, advances blind level
- Updates all tournament tables' `small_blind`, `big_blind`, `ante`
- Broadcasts `blinds_up` to each table channel
- Auto-doubling formula: `sb = starting_sb * 2^(level-1)`, `bb = starting_bb * 2^(level-1)`, ante added from level 3+

### G) Elimination handling
- When a player busts at a tournament table (stack reaches 0), the existing `poker-tournament-eliminate` pattern is reused but adapted for paid tournaments
- On final player remaining: compute prize pool, create payout records, set tournament to `complete`
- Prize pool formula: `floor(total_paid_pence * 5 / 9)`
- House take: `total_paid_pence - prize_pool_pence`

### H) Table balancing
- After each elimination, check if tables are unbalanced (difference >= 2 players)
- Move players between tables only between hands
- When remaining players fit at one table, merge to final table

---

## Step 3: Prize Pool Calculation

```
total_paid_pence = count(paid registrations) * entry_fee_pence
prize_pool_pence = floor(total_paid_pence * 5 / 9)
house_take_pence = total_paid_pence - prize_pool_pence
```

Payout distribution based on preset:
- winner_takes_all: 1st gets 100% of prize_pool_pence
- top_2: 1st gets 70%, 2nd gets 30%
- top_3: 1st gets 60%, 2nd gets 30%, 3rd gets 10%

Rounding: each position gets `floor(prize_pool_pence * percentage / 100)`, remainder goes to 1st place.

---

## Step 4: Blind Schedule (Auto-Doubling)

Starting from admin-configured `starting_sb` / `starting_bb`:

| Level | SB | BB | Ante |
|-------|----|----|------|
| 1 | sb | bb | 0 |
| 2 | sb*2 | bb*2 | 0 |
| 3 | sb*4 | bb*4 | sb*2 |
| 4 | sb*8 | bb*8 | sb*4 |
| ... | doubling | doubling | ~half SB |

Advance triggered by cron job (`paid-tournament-advance-blinds`) running every minute, checking elapsed time.

---

## Step 5: Client UI

### A) Tournament List Screen (new route: `/tournaments`)
- Shows all `scheduled` and `running` paid tournaments
- Each card shows: name, entry fee, prize pool estimate, player count / max, start time
- "Register" button (opens Stripe Checkout)
- Level 5 gate (same pattern as existing TournamentLobby)

### B) Tournament Detail View
- Players registered, blind schedule preview, current status
- If running: current blinds, players remaining, tables, "Go to My Table" button
- Admin-only controls: publish, cancel, payout management

### C) Admin Payout Screen
- List of pending payouts with due dates
- "Mark as Paid" action with notes field

### D) PokerHub update
- Add a new card for "Paid Tournaments" pointing to `/tournaments`
- No subscription gate (entry fee is the monetization)

---

## Step 6: XP Boost

- Tournament multiplayer games award +15% XP
- Implementation: in the XP saving logic (multiplayer hand completion), detect if the table has a `paid_tournament_id`
- If yes, multiply XP amounts by 1.15 before inserting into `xp_events`

---

## Step 7: Security Enforcement

All admin checks are server-side:
- Edge functions query `app_admins` table to verify caller is admin
- No email string comparisons in edge functions
- RLS prevents direct client writes to tournament tables
- Stripe webhook validates signature

Level 5 gate:
- Server-side check in `paid-tournament-register`: queries `player_xp` table

Race-safe registration:
- DB function with `FOR UPDATE` lock to check + increment count atomically

Stripe idempotency:
- Webhook checks if registration already `paid` before updating
- Checkout session metadata includes `tournament_id` + `user_id`

---

## Step 8: Cron Jobs

Two cron jobs needed:
1. **Tournament auto-start**: Every minute, check for `scheduled` tournaments where `start_at <= now()` and auto-start them
2. **Blind advancement**: Every minute, check `running` tournaments and advance blinds if interval elapsed

Both implemented via `pg_cron` + `pg_net` calling edge functions.

---

## Step 9: Stripe Webhook Secret

A new secret `STRIPE_WEBHOOK_SECRET` needs to be added for webhook signature validation. You will need to:
1. Set up the webhook endpoint in Stripe dashboard pointing to `https://kmsthmtbvuxmpjzmwybj.supabase.co/functions/v1/paid-tournament-webhook`
2. Copy the webhook signing secret and add it as a secret

---

## Files to Create/Modify

### New files:
| File | Purpose |
|------|---------|
| `supabase/migrations/xxx_paid_tournaments.sql` | Schema + RLS |
| `supabase/functions/paid-tournament-create/index.ts` | Admin creates tournament |
| `supabase/functions/paid-tournament-manage/index.ts` | Admin publish/cancel/payout |
| `supabase/functions/paid-tournament-register/index.ts` | Stripe checkout for registration |
| `supabase/functions/paid-tournament-webhook/index.ts` | Stripe webhook handler |
| `supabase/functions/paid-tournament-start/index.ts` | Start tournament + seat players |
| `supabase/functions/paid-tournament-tick/index.ts` | Cron: auto-start + blind advancement |
| `src/pages/PaidTournaments.tsx` | Tournament list + detail page |
| `src/components/poker/PaidTournamentList.tsx` | Tournament cards UI |
| `src/components/poker/PaidTournamentDetail.tsx` | Detail view + admin controls |
| `src/components/poker/PaidTournamentAdmin.tsx` | Admin create + payout management |

### Modified files:
| File | Change |
|------|--------|
| `src/App.tsx` | Add `/tournaments` route |
| `src/pages/PokerHub.tsx` | Add "Paid Tournaments" card |
| `supabase/config.toml` | Add `verify_jwt = false` for webhook + tick functions |

### NOT modified:
- Bottom navigation
- Existing multiplayer poker flow (reused as-is for tournament tables)
- Existing TournamentLobby (kept for free tournaments)

---

## Optional Features NOT Implemented (for your reference)

| Feature | What it is | Effort |
|---------|-----------|--------|
| Late registration | Join after start, during early blind levels | Medium -- needs mid-tournament seating logic |
| Rebuys/Add-ons | Pay more to get more chips after busting | Medium -- additional Stripe payments + chip tracking |
| Blind ante | Progressive ante alongside blinds | Low -- already in auto-doubling formula above |
| Pause/Resume | Admin pauses tournament clock | Low -- add `paused` status + pause timestamp |
| Time bank | Extra thinking time per player | Medium -- per-player timer tracking |
| Payout top N | Custom payout splits beyond presets | Low -- UI for custom percentages |
| Minimum prize guarantee | Guaranteed minimum prize pool | Low -- just a display/marketing field |
| Cancellation with refunds | Cancel and auto-refund via Stripe | High -- requires Stripe refund API integration |
| Anti-collusion | Detect chip dumping between players | High -- statistical analysis + monitoring |
| Table balancing algorithms | Optimal seat assignment | Medium -- more sophisticated than simple round-robin |

---

## Test Checklist

1. Admin creates a tournament with GBP1 entry, 9 max players
2. Non-admin user cannot see create button
3. Level 4 player cannot register (level gate enforced)
4. Level 5+ player clicks Register -> redirected to Stripe Checkout
5. After payment, webhook fires -> registration status becomes `paid`
6. Double registration prevented (same user, same tournament)
7. At scheduled start time, tournament auto-starts
8. Players seated across correct number of tables (e.g. 9 players = 1 table, 12 = 2 tables)
9. Blinds auto-advance every configured interval, synchronized across tables
10. After elimination, tables rebalance if needed
11. When 1 player remains, tournament completes
12. Prize pool = floor(total_paid * 5/9), payout records created
13. Admin can mark payout as paid
14. XP awarded with 15% boost for tournament hands
15. Works on iPhone SE and Android in portrait mode

