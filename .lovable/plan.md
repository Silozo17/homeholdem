

## Fix: YOUR TURN Pill Position + Restore Card Animations

### 1. YOUR TURN Pill -- Move Up 40px

The "YOUR TURN" badge is at `bottom: 18%` (landscape) / `bottom: 22%` (portrait). To shift it up by 40px, change these to `calc(18% + 40px)` and `calc(22% + 40px)` respectively. Same adjustment for the "5 SEC LEFT" pill (currently `bottom: 22%` / `bottom: 26%`).

**File**: `src/components/poker/OnlinePokerTable.tsx` (line 769, line 790)

---

### 2. Restore Card Animations

The problem: when the last fix removed `animate-fade-in` from the face-up branch of `CardDisplay.tsx`, it left NO animation at all. This means:
- Community cards (flop/turn/river) appear instantly with no transition -- they are always rendered face-up
- Player hole cards that flip from face-down to face-up also have no visual transition

**Fix**: Add a subtle but visible reveal animation to the face-up card branch. Instead of `animate-fade-in` (which has a `translateY(10px)` that causes jumping), add a custom `animate-card-reveal` class that uses only a quick scale-up + opacity fade with no translation. This keeps cards in place while giving a premium feel.

**File**: `src/index.css` -- Add new keyframe:
```css
@keyframes card-reveal {
  0% { opacity: 0; transform: scale(0.85); }
  100% { opacity: 1; transform: scale(1); }
}
.animate-card-reveal { animation: card-reveal 0.35s ease-out both; }
```

**File**: `src/components/poker/CardDisplay.tsx` (line 59) -- Add `'animate-card-reveal'` to the face-up card's className. Also pass through `dealDelay` as `animationDelay` so community cards stagger their reveal (flop cards already pass `dealDelay`).

### Technical Details

| File | Line(s) | Change |
|------|---------|--------|
| `src/components/poker/OnlinePokerTable.tsx` | 769 | `bottom: isLandscape ? 'calc(18% + 40px)' : 'calc(22% + 40px)'` |
| `src/components/poker/OnlinePokerTable.tsx` | 790 | `bottom: isLandscape ? 'calc(22% + 40px)' : 'calc(26% + 40px)'` |
| `src/index.css` | After line 547 | Add `card-reveal` keyframe + class |
| `src/components/poker/CardDisplay.tsx` | 59-64 | Add `animate-card-reveal` class and `animationDelay: dealDelay + 's'` style |

No other changes. No logic, layout, or feature modifications.
