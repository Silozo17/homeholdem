

# Fix: Voice Announces All Wins + Speed Up Game

## Changes Overview

Three files modified. No style, layout, navigation, or BottomNav changes.

---

## Fix 1: Voice Announces ALL Winners with Hand Name

**File:** `src/components/poker/OnlinePokerTable.tsx`, lines 392-398

**Problem:** Only `handWinners[0]` is announced. If there are multiple winners (split pot, side pots), only the first winner is voiced. Also, fold-wins say "with Last standing" which sounds wrong.

**Fix:** Loop through ALL winners. For fold-wins ("Last standing"), say "takes the pot" instead. For real showdowns, announce the hand name (pair, straight, flush, etc.).

Before:
```tsx
useEffect(() => {
  if (handWinners.length === 0 || !user) return;
  const winner = handWinners[0];
  const isHero = winner.player_id === user.id;
  const name = isHero ? 'You' : winner.display_name;
  announceWinner(name, winner.amount, winner.hand_name || undefined);
}, [handWinners, user, announceWinner]);
```

After:
```tsx
useEffect(() => {
  if (handWinners.length === 0 || !user) return;
  for (const winner of handWinners) {
    const isHero = winner.player_id === user.id;
    const name = isHero ? 'You' : winner.display_name;
    const handName = winner.hand_name && winner.hand_name !== 'Last standing'
      ? winner.hand_name
      : undefined;
    if (handName) {
      announceCustom(`${name} win${isHero ? '' : 's'} ${winner.amount} chips with ${handName}`);
    } else {
      announceCustom(`${name} take${isHero ? '' : 's'} the pot, ${winner.amount} chips`);
    }
  }
}, [handWinners, user, announceCustom]);
```

This ensures:
- Every winner is announced (split pots, side pots)
- Showdown wins say the hand name: "Tomek wins 5000 chips with Two Pair"
- Fold wins say: "Tomek takes the pot, 200 chips"

---

## Fix 2: Sync Deal Animation Sprite Stagger

**File:** `src/components/poker/OnlinePokerTable.tsx`, line 1114

**Problem:** The visual flying card sprites still use `0.35` stagger while the card reveal uses `0.18`. Cards appear to still be flying after the reveal happens.

Before:
```tsx
const delay = (cardIdx * activeSeatCount + seatOrder) * 0.35;
```

After:
```tsx
const delay = (cardIdx * activeSeatCount + seatOrder) * 0.18;
```

---

## Fix 3: Reduce actionPending Fallback from 3s to 1.5s

**File:** `src/hooks/useOnlinePokerTable.ts`, line 478

**Problem:** If a broadcast is missed or delayed, the player's buttons stay hidden for 3 full seconds before the fallback kicks in. This feels laggy.

Before:
```tsx
}, 3000);
```

After:
```tsx
}, 1500);
```

---

## Fix 4: Speed Up Game Pace

### 4a. Reduce Turn Timer from 30s to 20s
**File:** `supabase/functions/poker-action/index.ts`, line 538

Before:
```tsx
const actionDeadline = nextActorSeat !== null ? new Date(Date.now() + 30_000).toISOString() : null;
```

After:
```tsx
const actionDeadline = nextActorSeat !== null ? new Date(Date.now() + 20_000).toISOString() : null;
```

20 seconds is standard for online poker (PokerStars uses 15-25s depending on format). 30s feels sluggish.

### 4b. Reduce Auto-Deal Delay from 2s to 1.2s
**File:** `src/hooks/useOnlinePokerTable.ts`, line 534

Before:
```tsx
}, 2000 + jitter);
```

After:
```tsx
}, 1200 + jitter);
```

This starts the next hand faster after the showdown display clears.

### 4c. Reduce Showdown Display Time
**File:** `src/hooks/useOnlinePokerTable.ts`, line 318

Before:
```tsx
const showdownDelay = communityCount >= 5 ? 8500 : 5000;
```

After:
```tsx
const showdownDelay = communityCount >= 5 ? 6000 : 3500;
```

8.5 seconds for showdown display is too long. 6 seconds for runout showdowns and 3.5 seconds for normal showdowns is snappier while still giving players time to see the result.

### 4d. Reduce Turn Timer in poker-start-hand
**File:** `supabase/functions/poker-start-hand/index.ts`

The same 30s timer is likely set in start-hand for the first actor. Need to change to 20s there too.

---

## Summary

| Change | File | What |
|--------|------|------|
| Announce all winners with hand name | OnlinePokerTable.tsx | Loop all winners, use hand name or "takes the pot" |
| Sync deal sprite stagger | OnlinePokerTable.tsx | 0.35 to 0.18 |
| Faster button recovery | useOnlinePokerTable.ts | 3000ms to 1500ms |
| Turn timer 30s to 20s | poker-action/index.ts + poker-start-hand/index.ts | Faster pace |
| Auto-deal 2s to 1.2s | useOnlinePokerTable.ts | Quicker next hand |
| Showdown display 8.5s/5s to 6s/3.5s | useOnlinePokerTable.ts | Less waiting |

## What Does NOT Change
- No style, layout, navigation, or spacing changes
- No changes to BottomNav
- No refactoring or renaming
- Chip accounting logic unchanged
- All-in logic unchanged (already fixed)
- ElevenLabs edge function unchanged
