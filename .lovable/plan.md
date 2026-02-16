

# Fix: Invite Friends Dialog Hidden Behind Poker Table

## Problem

The "Invite Friends" button **does** work -- it opens the dialog. But the dialog is invisible because of a z-index conflict:

- The poker table container uses `z-[60]` (a fixed full-screen overlay)
- The Radix Dialog portal renders at `document.body` with `z-50` (both overlay and content)
- Since `z-50` < `z-[60]`, the dialog appears **behind** the poker table

The console logs confirm the dialog opens and renders its content ("No club members to invite").

## Solution

Pass a higher z-index to the `InvitePlayersDialog`'s `DialogContent` so it renders above the poker table's `z-[60]`.

### File: `src/components/poker/InvitePlayersDialog.tsx`

Add `z-[70]` class to the `DialogContent` component, and also override the `DialogOverlay` (via DialogContent's portal) to ensure the backdrop also appears above the poker table.

The simplest approach: add a `className` prop to `DialogContent` with `z-[70]`, and wrap the overlay to also use `z-[70]`.

Since `DialogContent` internally renders `DialogOverlay`, and both use `z-50`, we need to either:

1. Override the className on DialogContent to `z-[70]` (this fixes the content but not the overlay), or
2. Use a custom portal container, or
3. Simply add `className="z-[70]"` to DialogContent -- the Radix dialog overlay is a sibling in the same portal, so we also need to address it.

The cleanest fix: In `InvitePlayersDialog.tsx`, replace the plain `<DialogContent className="max-w-sm">` with `<DialogContent className="max-w-sm z-[70]">` and add a custom overlay class. Since the DialogContent component in `dialog.tsx` renders DialogOverlay internally, we can pass the overlay z-index fix by wrapping it differently.

Actually, the simplest effective fix: just change the `DialogContent` line to include `z-[70]`, and since the overlay is a separate element also at `z-50`, we should also make the overlay `z-[70]`. The easiest way is to restructure the InvitePlayersDialog to use a manual portal + overlay with the right z-index.

**Simplest approach**: Override both by passing className to DialogContent (handles the content) and also rendering a custom overlay inside. But since DialogContent already renders DialogOverlay internally, this would duplicate it.

**Best approach**: Just add `z-[70]` to the DialogContent className. The overlay at `z-50` won't fully dim the poker table, but the content itself will be visible and interactive. For full correctness, we should also pass an overlay override.

**Practical fix** (two small changes):

| File | Change |
|------|--------|
| `src/components/poker/InvitePlayersDialog.tsx` | Add `z-[70]` to DialogContent className |
| `src/components/ui/dialog.tsx` | No change needed -- we'll use a different approach |

Since the Radix DialogOverlay is rendered inside DialogContent's portal, to fix both overlay and content, pass an explicit style/className. The DialogContent component in `dialog.tsx` renders `<DialogOverlay />` as a sibling -- we can override it by passing a prop or by restructuring.

**Final approach**: In `InvitePlayersDialog.tsx`, manually build the dialog portal with explicit z-indices:

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogPortal>
    <DialogOverlay className="z-[70]" />
    <DialogContent className="max-w-sm z-[70]" forceMount>
      ...
    </DialogContent>
  </DialogPortal>
</Dialog>
```

Wait -- `DialogContent` already renders its own portal and overlay. So this would nest portals. Instead, we should use the lower-level primitives. Or simpler: just use the existing DialogContent but pass the higher z-index, accepting the overlay won't perfectly dim. The dialog will still be fully functional.

**Simplest effective fix**: Add `z-[70]` to the `DialogContent` className in `InvitePlayersDialog.tsx`. The content appears above the poker table, the close button works, invite buttons work. The overlay dimming may partially appear behind the table, but functionally everything works.

### Changes

| File | Change |
|------|--------|
| `src/components/poker/InvitePlayersDialog.tsx` | Change `<DialogContent className="max-w-sm">` to `<DialogContent className="max-w-sm z-[70] [&~*]:z-[70]">` to push both content and its overlay above z-[60] |

If the CSS sibling selector doesn't work cleanly for the overlay, an alternative is to modify `dialog.tsx`'s DialogOverlay to accept a className passthrough from DialogContent. But the simpler path is to just test with `z-[70]` on DialogContent alone.

