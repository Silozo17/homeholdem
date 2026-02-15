

# Multiplayer Poker Plan v4 — Final Refinements

Three targeted changes applied to the approved v3 plan. Everything else remains unchanged.

---

## Change 1: Split Showdown Card Fetch into Separate RPC

**Problem:** `read_poker_hand_state` currently returns ALL players' hole cards on every action. This increases blast radius if the Edge Function ever leaks data via logs, error responses, or debugging code.

**Fix:** Two separate read RPCs:

### `read_poker_hand_state` (used on every action)
Returns hand state, seats, and the deck seed — but NO hole cards.

```sql
CREATE OR REPLACE FUNCTION public.read_poker_hand_state(
  _table_id UUID,
  _hand_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _hand poker_hands%ROWTYPE;
  _seats JSONB;
BEGIN
  SELECT * INTO _hand
  FROM poker_hands
  WHERE id = _hand_id
    AND table_id = _table_id
    AND completed_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'hand_not_found');
  END IF;

  SELECT jsonb_agg(row_to_json(s)) INTO _seats
  FROM poker_seats s WHERE s.table_id = _table_id;

  RETURN jsonb_build_object(
    'hand', row_to_json(_hand),
    'seats', _seats
  );
END;
$$;
```

### `read_showdown_cards` (called ONLY at showdown)
Returns all active players' hole cards for hand evaluation.

```sql
CREATE OR REPLACE FUNCTION public.read_showdown_cards(
  _hand_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(jsonb_build_object(
      'player_id', hc.player_id,
      'seat_number', hc.seat_number,
      'cards', hc.cards
    ))
    FROM poker_hole_cards hc
    WHERE hc.hand_id = _hand_id
  );
END;
$$;
```

### Updated Edge Function flow

```text
poker-action:
  1. Call read_poker_hand_state (no hole cards)
  2. Validate action, compute new state
  3. If new phase == showdown:
     a. Call read_showdown_cards (fetch all hole cards)
     b. Evaluate hands, determine winners
     c. Include results in commit
  4. Call commit_poker_state
  5. Broadcast public state
```

This means hole cards are only loaded into Edge Function memory during showdown — never during normal betting rounds.

---

## Change 2: Atomic Versioned UPDATE in commit_poker_state

**Problem:** The v3 RPC reads the version in a SELECT, then writes in a separate UPDATE. Between those two statements (even inside a single function), another transaction could theoretically commit.

**Fix:** Combine the version check into the UPDATE WHERE clause and check `FOUND`:

```sql
-- Inside commit_poker_state, replace the SELECT + UPDATE with:

UPDATE poker_hands SET
  phase = _new_phase::poker_hand_phase,
  community_cards = _community_cards,
  pots = _pots,
  current_actor_seat = _current_actor_seat,
  current_bet = _current_bet,
  min_raise = _min_raise,
  action_deadline = _action_deadline,
  state_version = state_version + 1,
  completed_at = _completed_at,
  results = _results,
  deck_seed_revealed = _deck_seed_revealed
WHERE id = _hand_id
  AND state_version = _expected_version;

IF NOT FOUND THEN
  RETURN jsonb_build_object('error', 'version_conflict');
END IF;
```

Key differences from v3:
- No separate `SELECT state_version` before the update
- `state_version = state_version + 1` (server increments, not caller)
- Remove `_state_version` input parameter — the server controls versioning
- Single statement = truly atomic version check + write

The return value includes the new version for broadcasting:

```sql
RETURN jsonb_build_object(
  'success', true,
  'state_version', _expected_version + 1
);
```

---

## Change 3: Spectating Rules for Private Tables

**Decision:** Friends-only tables are NOT spectatable by default. Public tables allow spectating.

### Implementation

The broadcast RLS policy is scoped by table type:

```sql
CREATE POLICY "Poker broadcast access"
ON "realtime"."messages"
FOR SELECT TO authenticated
USING (
  realtime.messages.extension = 'broadcast'
  AND (
    -- Lobby channel: open to all
    realtime.topic() = 'poker:lobby'
    -- Table channels: must be seated OR table is public
    OR EXISTS (
      SELECT 1 FROM public.poker_tables pt
      WHERE pt.id = (
        regexp_match(realtime.topic(), '^poker:table:([0-9a-f-]+)$')
      )[1]::uuid
      AND (
        pt.table_type = 'public'
        OR pt.created_by = (select auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.poker_seats ps
          WHERE ps.table_id = pt.id
            AND ps.player_id = (select auth.uid())
        )
        OR (
          pt.club_id IS NOT NULL
          AND is_club_member((select auth.uid()), pt.club_id)
        )
      )
    )
    -- Tournament channels: must be registered
    OR EXISTS (
      SELECT 1 FROM public.poker_tournament_players tp
      WHERE tp.tournament_id = (
        regexp_match(realtime.topic(), '^poker:tournament:([0-9a-f-]+)$')
      )[1]::uuid
      AND tp.player_id = (select auth.uid())
    )
  )
);
```

### Who can see what

| Table Type | Who Can Subscribe to Broadcast |
|-----------|-------------------------------|
| `public` | Any authenticated user (spectating allowed) |
| `friends` | Table creator + seated players only |
| `club` | Any club member (spectating within club allowed) |

### Performance note

The regex + subquery runs once on channel join (not per message). If this proves too slow, fall back to `USING (true)` for MVP and add filtering later — since broadcasts never contain hole cards, the security risk is limited to unwanted spectating of private games, not card leakage.

---

## Summary of All Changes (v3 to v4)

| Area | v3 | v4 |
|------|----|----|
| Hole cards in read RPC | Always returned (all players) | Only at showdown via separate `read_showdown_cards` |
| Version check in commit | SELECT then UPDATE (two statements) | Single UPDATE WHERE version matches |
| Version increment | Caller provides new version | Server increments (`state_version + 1`) |
| Broadcast RLS | `USING(true)` for all broadcasts | Scoped by table type (public/friends/club) |
| Spectating | Implicitly allowed for all | Public: yes. Friends: no. Club: club members only. |

---

## Updated RPC Function List

| RPC | When Called | Returns Hole Cards? |
|-----|-----------|-------------------|
| `read_poker_hand_state` | Every action | No |
| `read_showdown_cards` | Showdown only | Yes (all active players) |
| `commit_poker_state` | After computing new state | N/A (write-only) |

---

## Updated Must-Fix Checklist (Final)

1. Audit broadcasts: zero occurrences of `hole_cards` in any broadcast payload
2. Test `poker-my-cards` RLS: fetching another player's cards returns null
3. Test version conflict: two concurrent commits, exactly one succeeds
4. Test `poker_hands_public` view: `deck_seed_internal` never returned
5. Test showdown isolation: `read_showdown_cards` only called when phase transitions to showdown
6. Test spectating rules: non-seated user cannot subscribe to friends table broadcast
7. Test timeout ping: action after deadline triggers auto-fold

Everything else from the v3 plan (architecture, endpoints, schema, phases, event payloads) remains unchanged.

