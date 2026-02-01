
# Plan: Prevent Unwanted Button Focus/Highlight on Navigation and Modal Open

## Problem

When navigating to a new page or when a modal/dialog/drawer opens, buttons are getting unexpectedly highlighted (focused). This creates a visually jarring experience where random buttons appear selected.

## Root Cause Analysis

1. **Radix UI Auto-Focus Behavior**: All Radix dialog primitives (Dialog, Sheet, Drawer) automatically focus the first focusable element when opened for accessibility. This causes buttons to show their focus ring.

2. **Focus-Visible Ring Styling**: The button component uses `focus-visible:ring-2 focus-visible:ring-ring` which shows a gold ring when focused.

3. **Browser Navigation Behavior**: When navigating between pages, browsers may auto-focus interactive elements.

## Solution

### Part 1: Prevent Dialog/Sheet/Drawer Auto-Focus

Add `onOpenAutoFocus` event handlers to prevent automatic focus when modals open. This is done by calling `e.preventDefault()` on the event.

**Files to modify:**
- `src/components/ui/dialog.tsx`
- `src/components/ui/sheet.tsx`
- `src/components/ui/drawer.tsx`

Example change for DialogContent:
```typescript
<DialogPrimitive.Content
  ref={ref}
  onOpenAutoFocus={(e) => e.preventDefault()}
  className={...}
  {...props}
>
```

### Part 2: Add Global Focus Reset on Navigation

Update the `ScrollToTop` component to blur any focused element when the route changes:

```typescript
useEffect(() => {
  window.scrollTo(0, 0);
  // Remove focus from any element to prevent highlight
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
}, [pathname]);
```

### Part 3: CSS Enhancement for Touch Devices (Optional)

Add a CSS rule to only show focus rings for keyboard navigation, not touch/mouse:

```css
/* Only show focus rings for keyboard users */
@media (pointer: coarse) {
  *:focus-visible {
    outline: none !important;
    box-shadow: none !important;
    ring: none !important;
  }
}
```

However, this may impact accessibility. A better approach is to let components handle focus themselves.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/ui/dialog.tsx` | Add `onOpenAutoFocus={(e) => e.preventDefault()}` to DialogContent |
| `src/components/ui/sheet.tsx` | Add `onOpenAutoFocus={(e) => e.preventDefault()}` to SheetContent |
| `src/components/ui/drawer.tsx` | Add `onOpenAutoFocus={(e) => e.preventDefault()}` to DrawerContent |
| `src/components/layout/ScrollToTop.tsx` | Add `document.activeElement.blur()` on route change |

## Technical Details

### Dialog Component Change
```typescript
// In DialogContent:
<DialogPrimitive.Content
  ref={ref}
  onOpenAutoFocus={(e) => e.preventDefault()}
  className={cn(...)}
  {...props}
>
```

### Sheet Component Change
```typescript
// In SheetContent:
<SheetPrimitive.Content 
  ref={ref} 
  onOpenAutoFocus={(e) => e.preventDefault()}
  className={cn(sheetVariants({ side }), className)} 
  {...props}
>
```

### Drawer Component Change
```typescript
// In DrawerContent:
<DrawerPrimitive.Content
  ref={ref}
  onOpenAutoFocus={(e) => e.preventDefault()}
  className={cn(...)}
  {...props}
>
```

### ScrollToTop Change
```typescript
useEffect(() => {
  window.scrollTo(0, 0);
  // Blur any focused element to prevent unwanted highlights
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
}, [pathname]);
```

## Testing Recommendations

After implementation:
1. Navigate between Dashboard, Events, Stats, and Profile pages - no buttons should be highlighted
2. Open the Quick Create modal from the bottom nav - no button inside should be pre-selected
3. Open the Paywall drawer - no button should be highlighted
4. Open any dialog (Create Club, Join Club, etc.) - no unexpected focus
5. Verify keyboard navigation still works (Tab to focus elements should still show focus ring)
