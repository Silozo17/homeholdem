

# Fix: Toast Notifications Hidden Under iPhone Notch

## Problem
The previous fix set `--offset` as a CSS variable, but Sonner's CSS actually uses `--offset-top` for desktop and `--mobile-offset-top` for mobile positioning. The variable we set is completely ignored by Sonner.

## Solution
Override the correct CSS variables that Sonner actually reads:

**File: `src/components/ui/sonner.tsx`**

Replace the current `style` prop with the correct Sonner CSS custom properties:

```tsx
style={{
  '--offset-top': 'calc(env(safe-area-inset-top, 0px) + 20px)',
  '--mobile-offset-top': 'calc(env(safe-area-inset-top, 0px) + 20px)',
} as React.CSSProperties}
```

This targets the exact CSS selectors Sonner uses:
- `[data-sonner-toaster][data-y-position='top'] { top: var(--offset-top) }` (desktop)
- `[data-sonner-toaster][data-y-position='top'] { top: var(--mobile-offset-top) }` (mobile, under 600px)

Both will now account for the iPhone safe area inset (notch/Dynamic Island) plus 20px padding.

**Single file change:** `src/components/ui/sonner.tsx` (1 line edit)

