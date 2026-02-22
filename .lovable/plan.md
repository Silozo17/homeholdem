

# Fix: Player Profile Drawer invisible behind poker table

## Problem

Players **can** click opponents at the table (the click handler works), but the profile drawer is invisible. The poker table renders inside a `fixed inset-0 z-[60]` container. The Sheet component (Radix Dialog portal) renders at the document body root with `z-50` for both the overlay and content. Since 50 < 60, the drawer opens completely hidden behind the poker table.

## Fix (2 files, minimal changes)

### File 1: `src/components/ui/sheet.tsx`

Add an optional `overlayClassName` prop to `SheetContent` so callers can override the overlay's z-index without affecting all Sheets app-wide.

In the `SheetContentProps` interface, add:
```tsx
interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  overlayClassName?: string;
}
```

In the `SheetContent` component, destructure and pass it:
```tsx
const SheetContent = React.forwardRef<...>(
  ({ side = "right", className, children, style, overlayClassName, ...props }, ref) => (
    <SheetPortal>
      <SheetOverlay className={overlayClassName} />
      ...
```

### File 2: `src/components/poker/PlayerProfileDrawer.tsx`

Add `z-[70]` to both the content and overlay so the drawer renders above the poker table's z-60:

```tsx
<SheetContent
  side="left"
  className="w-[300px] sm:w-[340px] bg-card border-border/50 p-0 z-[70]"
  overlayClassName="z-[70]"
>
```

## Why this works

- The poker table container is `z-[60]` (z-index 60)
- Sheet default is `z-50` (z-index 50) -- hidden behind the table
- Setting both overlay and content to `z-[70]` (z-index 70) puts the drawer above the table
- `cn()` / `tailwind-merge` correctly overrides the default `z-50` with `z-[70]`
- Only the poker PlayerProfileDrawer is affected; all other Sheets keep their default z-50
- No changes to OnlinePokerTable.tsx, PlayerSeat.tsx, or any other file
