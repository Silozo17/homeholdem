

# Fix: Chat Bubbles Disappear After 1.5s Instead of 6s

## Root Cause

The CSS animation `animate-float-up` has a duration of **1.5 seconds** and uses `animation-fill-mode: both`, which means the bubble reaches `opacity: 0` at 1.5s and stays invisible. The React timer removes it from state after 6s, but visually it vanishes at 1.5s.

```css
/* Current (broken) */
@keyframes float-up {
  0% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-20px); }
}
.animate-float-up { animation: float-up 1.5s ease-out both; }
```

## Fix

Change the animation so the bubble stays fully visible for most of the 6 seconds, then fades out near the end.

### File: `src/index.css`

Update the keyframes and duration:

```css
@keyframes float-up {
  0% { opacity: 1; transform: translateY(0); }
  75% { opacity: 1; transform: translateY(-8px); }
  100% { opacity: 0; transform: translateY(-20px); }
}
.animate-float-up { animation: float-up 6s ease-out both; }
```

This keeps the bubble visible for ~4.5 seconds (75% of 6s), then fades out over the final 1.5 seconds -- matching the 6-second React timer exactly.

## Summary

| Change | File |
|--------|------|
| Extend `float-up` animation to 6s with late fade-out | `src/index.css` |

