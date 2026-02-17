

# Fix: Landscape Bottom Padding on Full-Screen Lobby Pages

## Problem

Several poker lobby/menu pages use `fixed inset-0` positioning, which bypasses AppLayout's bottom padding entirely. They rely on the CSS class `safe-area-bottom` which only adds `padding-bottom: env(safe-area-inset-bottom, 0px)`.

In portrait mode on iPhones, `safe-area-inset-bottom` is ~34px, which partially clears the bottom nav. In landscape mode, `safe-area-inset-bottom` is 0px on most devices, so there is zero gap -- the last items are hidden behind the bottom nav with no way to scroll them into view.

## Fix

Add an inline `paddingBottom` style to the inner scrollable content div of each affected page, matching the same formula already used in `AppLayout.tsx`: `calc(6rem + env(safe-area-inset-bottom, 0px))`. This ensures 96px + safe-area clearance regardless of orientation.

The padding goes on the inner content container (the `flex-1` div), not the outer `fixed inset-0` wrapper, so it only adds scrollable space at the bottom.

## Files Changed

| File | Line | Change |
|------|------|--------|
| `src/components/poker/OnlinePokerLobby.tsx` | 228 | Add `style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}` to the `flex-1 px-4` content div |
| `src/components/poker/PlayPokerLobby.tsx` | 52 | Add same inline style to the `flex-1` content div |
| `src/pages/PokerHub.tsx` | 37 | Add same inline style to the `flex-1` content div |
| `src/components/poker/TournamentLobby.tsx` | 227 | Add same inline style to the detail view content div |
| `src/components/poker/TournamentLobby.tsx` | ~381 | Add same inline style to the list view content div (need to check exact line) |

## What Does NOT Change

- BottomNav component -- untouched
- AppLayout -- untouched
- No styling, layout, or behavior changes beyond adding bottom padding to these 4 components
- No refactoring or renaming

## Why This Fixes It

These pages create their own full-screen scroll containers that sit on top of AppLayout. In landscape, `safe-area-inset-bottom` is 0, so content has no clearance from the bottom nav. Adding `6rem` (96px) of base padding ensures the last item is always scrollable above the nav bar, on any orientation and any device.

