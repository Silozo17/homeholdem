

# Fix: Toast Notifications Hidden Under iPhone Notch (Root Cause Found)

## Why Previous Fixes Failed

After reading Sonner's actual source code, the reason is clear. Sonner's internal rendering does this:

```
style: { ...yourStyleProp, ...generatedOffsets }
```

The library generates `--offset-top` and `--mobile-offset-top` from its own `offset`/`mobileOffset` props and spreads them **after** the `style` prop. This means our CSS variables get **overwritten** every single time -- no matter what we put in the `style` prop.

## The Fix

Use Sonner's dedicated `offset` and `mobileOffset` props, which accept objects with a `top` property that can be a string (including CSS `calc()` expressions). Remove the `style` prop entirely.

**File: `src/components/ui/sonner.tsx`**

Replace the current `style` prop with:

```tsx
<Sonner
  ...
  offset={{ top: 'calc(env(safe-area-inset-top, 0px) + 20px)' }}
  mobileOffset={{ top: 'calc(env(safe-area-inset-top, 0px) + 20px)' }}
  // remove the style prop with --offset-top / --mobile-offset-top
  ...
/>
```

This feeds the safe-area value directly into Sonner's internal offset generator, so the CSS variables are set correctly from the start rather than being overwritten.

## Technical Details

- Single file change: `src/components/ui/sonner.tsx`
- The `Offset` type in Sonner explicitly supports `{ top?: string | number }`, so this is fully type-safe
- `env(safe-area-inset-top)` returns ~47px on notched iPhones in PWA mode, plus our 20px buffer = ~67px from top

