

# Fix: Red Toast Notifications Under iPhone Notch

## Root Cause

The app uses **two completely separate toast systems**:

1. **Sonner** (green success toasts) -- already fixed with the CSS rule in `index.css`
2. **Radix/shadcn Toaster** (red error/destructive toasts) -- completely untouched by all previous fixes

The red toasts are rendered by `ToastViewport` in `src/components/ui/toast.tsx`, which has `fixed top-0` with no safe-area padding whatsoever. This is why the red notifications still appear under the notch.

## The Fix

**File: `src/components/ui/toast.tsx`** (line 17)

Change the `ToastViewport` className from:

```
fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 ...
```

to:

```
fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] ...
```

This adds `pt-[calc(env(safe-area-inset-top,0px)+1rem)]` which pushes the toast container below the notch on iPhones. On non-notched devices, `env(safe-area-inset-top)` returns 0 so the padding stays at the normal 1rem.

Since this is a Tailwind class in a stylesheet (not an inline style), Safari evaluates `env()` correctly.

## Files Changed

- `src/components/ui/toast.tsx` -- 1 line change in `ToastViewport` className
