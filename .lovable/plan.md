

## Ensure All Poker Animations Work Properly

After auditing every animation in the codebase, the CSS keyframes are all properly defined. The issues are with how they're applied and their visual impact.

### Issues Found

**1. Community card reveal is too subtle**
Community cards (flop/turn/river) are always rendered face-up so they only get `animate-card-reveal` (scale 0.85 to 1.0 over 0.35s). This is barely visible -- needs a more dramatic entrance matching the premium feel.

**Fix**: Enhance the `card-reveal` keyframe to include a slight vertical slide and a brief scale overshoot for a satisfying "pop":
```css
@keyframes card-reveal {
  0% { opacity: 0; transform: scale(0.5) translateY(8px); }
  60% { opacity: 1; transform: scale(1.08) translateY(-2px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
.animate-card-reveal { animation: card-reveal 0.4s ease-out both; }
```

**2. Winner glow overrides reveal animation**
When `isWinner` is true, `CardDisplay` applies both `animate-card-reveal` and `animate-winner-glow`. Since both classes set the CSS `animation` shorthand, the winner glow (later in the stylesheet) completely overrides the reveal. Winner cards skip the entrance animation.

**Fix**: Use `animationName` composition in the style attribute instead of conflicting classes. When `isWinner` is true, apply both animations via comma-separated inline style, so both run:
```
animation: card-reveal 0.4s ease-out both, winner-glow 1.5s ease-in-out 0.4s infinite
```

**3. Dealing card-back sprites need a visible card-back texture**
The deal animation sprites use the CSS class `card-back-premium` which renders a gradient pattern. This works but could be more visible. No change needed here -- this is working correctly.

**4. Opponent showdown reveal works**
The `animate-showdown-reveal` class on opponent cards does a 3D rotateY flip -- this is defined and connected correctly. No fix needed.

**5. Chip-to-winner animation works**
`ChipAnimation` uses `chip-sweep` keyframe with CSS custom properties. Connected correctly. No fix needed.

**6. Winner banner works**
`animate-winner-banner` fades in then out after 2s. Connected correctly. No fix needed.

**7. Phase flash, spotlight pulse, all-in shockwave all work**
All CSS classes are defined and applied correctly.

---

### Files to Modify

| File | Change |
|------|--------|
| `src/index.css` | Enhance `card-reveal` keyframe for more dramatic entrance |
| `src/components/poker/CardDisplay.tsx` | Fix winner glow + reveal animation conflict using inline animation composition |

### What Does NOT Change
- No logic changes
- No layout changes
- No seat positioning changes
- Dealing animation (card sprites flying from dealer) -- already working
- Showdown reveal, chip animations, winner banner -- all working
- All other animations untouched
