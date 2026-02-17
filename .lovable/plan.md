

# Fix: Push Toast Notifications Below iPhone Notch

## Problem
On iOS PWA, Sonner toast notifications render behind the iPhone notch/Dynamic Island, making them unreadable and impossible to dismiss.

## Root Cause
In `src/components/ui/sonner.tsx`, the `offset` is set to `20px`. While `mt-safe` (margin-top with safe-area-inset) is applied via className, Sonner positions toasts using inline CSS `top` values, which override the Tailwind margin. The safe-area inset (~50px on notched iPhones) is not being respected.

## Fix
Replace the static `offset={20}` with a dynamic value that accounts for the safe area. Since the Sonner `offset` prop only accepts a number, we will use CSS to apply the safe-area padding directly on the toaster container via a `style` prop with `--offset` or by increasing the offset to a value that clears the notch, combined with using `top` style instead of relying on the class.

**Concrete change in `sonner.tsx`:**
- Add a `style` prop: `style={{ '--offset': 'calc(env(safe-area-inset-top, 0px) + 20px)' }}` which Sonner respects as a CSS custom property for positioning
- Remove the `offset={20}` prop (the CSS variable takes over)
- Keep `mt-safe` as a fallback

**Single file changed:** `src/components/ui/sonner.tsx`

