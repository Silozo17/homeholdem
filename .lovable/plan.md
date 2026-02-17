

# Comprehensive XP & Level System for Online Poker

## Overview
Add an unlimited levelling system where players earn XP from online poker activity. A small level badge is displayed on every avatar across the app.

## XP Earning Rules

| Action | XP Awarded |
|---|---|
| Win a hand | +10 XP |
| Win a pot (side pot counts too) | +5 XP |
| Complete a game (stay until end, not just disconnect) | +25 XP |
| Win a game (1st place finish) | +100 XP |
| Finish top 3 in a tournament | +50 XP |
| Play a hand (participate, not just sit out) | +1 XP |

## Level Formula (unlimited)

```text
Level = floor(sqrt(totalXP / 100)) + 1
XP needed for level N = (N - 1)^2 * 100
```

Examples:
- Level 1: 0 XP
- Level 2: 100 XP
- Level 5: 1,600 XP
- Level 10: 8,100 XP
- Level 20: 36,100 XP
- Level 50: 240,100 XP

This scales infinitely with no cap.

## Database Changes

**New table: `player_xp`**

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | default gen_random_uuid() |
| user_id | uuid NOT NULL | references profiles(id) |
| total_xp | integer NOT NULL | default 0 |
| level | integer NOT NULL | default 1 (computed via trigger) |
| updated_at | timestamptz | auto-updated |

- Unique constraint on `user_id`
- RLS: users can read all rows, only service role can insert/update

**New table: `xp_events`** (audit log)

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid NOT NULL | |
| xp_amount | integer NOT NULL | |
| reason | text NOT NULL | e.g. "hand_won", "game_completed" |
| reference_id | uuid | optional link to hand/game |
| created_at | timestamptz | |

- RLS: users can read their own rows

**Database trigger:** On INSERT to `xp_events`, automatically update `player_xp.total_xp` (sum) and recalculate `level` using the formula.

## Backend: XP Award Logic

Modify the existing edge functions that resolve hands and end games to insert rows into `xp_events`:

- **`poker-start-hand/index.ts`** (or hand resolution logic): Award +1 XP per participant, +10 XP to hand winner
- **Game completion logic**: Award +25 XP for completing, +100 XP for winning

These are server-side inserts using the service role, so no client manipulation is possible.

## New Shared Hook: `usePlayerLevel`

```typescript
// src/hooks/usePlayerLevel.ts
// Fetches level + XP for a given user_id from player_xp table
// Returns { level, totalXp, xpForNextLevel, progress }
// Caches results and subscribes to realtime updates
```

## UI: Level Badge Component

**New file: `src/components/common/LevelBadge.tsx`**

A small circular badge positioned at the bottom-left of any avatar showing the player's current level number.

```text
Size variants matching avatar sizes:
- xs/sm: 14px circle, 8px font
- md: 16px circle, 9px font  
- lg: 18px circle, 10px font
- xl/2xl: 22px circle, 12px font
```

Styling: dark background with gold border, white text. Positioned `absolute -bottom-1 -left-1` on the avatar container.

## Files Modified

1. **`src/components/common/UserAvatar.tsx`** -- Wrap in relative container, add optional `level` prop, render LevelBadge when level is provided
2. **`src/components/poker/PlayerAvatar.tsx`** -- Add optional `level` prop, render LevelBadge at bottom-left (replacing or beside the status dot which is bottom-right)
3. **`src/components/common/LevelBadge.tsx`** -- New component
4. **`src/hooks/usePlayerLevel.ts`** -- New hook to fetch/cache player levels
5. **`src/pages/Profile.tsx`** -- Show level + XP progress bar in profile header
6. **`src/components/poker/PlayerSeat.tsx`** -- Pass level to PlayerAvatar
7. **`src/components/poker/OnlinePokerTable.tsx`** -- Fetch levels for seated players, pass to PlayerSeat

## New Files

- `src/components/common/LevelBadge.tsx`
- `src/hooks/usePlayerLevel.ts`

## Database Migration

- Create `player_xp` table with RLS
- Create `xp_events` table with RLS
- Create trigger function to auto-update `player_xp` on `xp_events` insert
- Enable realtime on `player_xp`

## Edge Function Changes

- Modify hand resolution and game-end logic to insert `xp_events` rows for relevant players

