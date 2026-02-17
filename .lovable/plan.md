

# Fix: Toast Notifications Under iPhone Notch (Final Solution)

## Root Cause (confirmed after 3 failed attempts)

Safari/WebKit does NOT evaluate `env(safe-area-inset-top)` inside inline styles (the HTML `style` attribute). Every previous fix -- whether using `style` prop, `offset` prop, or `mobileOffset` prop -- ultimately writes to the element's inline style. Safari sees `env(safe-area-inset-top)` there and treats it as 0, so the toast sits at the very top of the screen.

The `env()` function only works properly in **stylesheet rules** (CSS files, `<style>` tags), not in inline `style` attributes on Safari.

## The Fix

Two changes:

### 1. `src/index.css` -- Add a CSS rule targeting Sonner's toaster

```css
/* Force toasts below safe area on notched devices (Safari inline env() bug workaround) */
[data-sonner-toaster][data-y-position="top"] {
  top: calc(env(safe-area-inset-top, 0px) + 20px) !important;
}
```

This single rule handles both desktop and mobile widths because it directly overrides the `top` property with `!important`, bypassing whatever inline variables Sonner generates.

### 2. `src/components/ui/sonner.tsx` -- Remove the broken offset props

Remove the `offset` and `mobileOffset` props from the Sonner component since they have no effect on Safari. The CSS rule above handles positioning.

```tsx
<Sonner
  theme={theme as ToasterProps["theme"]}
  position="top-center"
  className="toaster group"
  toastOptions={...}
  {...props}
/>
```

## Why this works

- `env(safe-area-inset-top)` in a CSS stylesheet rule is fully supported by Safari 11.1+ and all WebKit browsers
- `!important` ensures it overrides Sonner's inline style `top: var(--offset-top)` and `top: var(--mobile-offset-top)`
- No JavaScript, no props, no CSS variables -- just a direct CSS rule that Safari will correctly evaluate

## Files changed

- `src/index.css` -- Add 1 CSS rule (4 lines)
- `src/components/ui/sonner.tsx` -- Remove offset/mobileOffset props

