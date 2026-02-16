

# Fix Poker Pages: No Scroll, Card Overlap, and Proper Headers

## Problems Identified

1. **Pages scroll unnecessarily** -- All poker pages (`/poker`, `/online-poker`, `/play-poker`, `/poker-tournament`) use `min-h-[100dvh]` which allows content to exceed the viewport. Additionally, `AppLayout` adds `pb-20` for bottom nav padding on top of the pages' own `pb-24`, creating double padding and overflow.

2. **CardFan overlaps text** -- The CardFan component uses absolute-positioned cards that overlap the page title (visible on the Play Poker lobby where "Play Poker" text is behind the card fan).

3. **No proper header** -- All poker pages use a plain ghost back button floating in the top-left corner instead of the app's standard fixed header (with Logo center, Crown left, NotificationBell right) used on Dashboard, Events, Stats, Profile, etc.

## Solution

### 1. Add standard fixed headers to all 4 pages

Replace the simple back-button header in each poker page/component with the app's standard header pattern:

```
<header class="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 safe-area-top">
  <div class="container relative flex items-center justify-center h-16 px-4">
    <Button (back) class="absolute left-4" />
    <Logo size="sm" />  <!-- or page title -->
    <NotificationBell class="absolute right-4" />
  </div>
</header>
<div class="h-16 safe-area-top" />  <!-- spacer -->
```

Affected files:
- `src/pages/PokerHub.tsx` -- back to `/dashboard`
- `src/components/poker/OnlinePokerLobby.tsx` -- back to `/poker`, keep refresh button
- `src/components/poker/PlayPokerLobby.tsx` -- back to `/poker`
- `src/components/poker/TournamentLobby.tsx` -- back to `/poker`, keep refresh button (both list and detail views)

### 2. Fix scrolling by removing double padding

**`src/components/layout/AppLayout.tsx`**: Add `/poker`, `/poker-tournament` to `fullscreenRoutes` so they don't get the bottom nav `pb-20`. Wait -- actually looking at the screenshots, the bottom nav IS showing on `/poker` and `/poker-tournament`. The bottom nav should show on these pages. The real fix is:

- Remove `pb-24` from each poker page/component (they already get `pb-20` from AppLayout)
- Change `min-h-[100dvh]` to just use normal flow -- the content should fit naturally with the fixed header + bottom nav
- For PokerHub specifically, keep `h-[100dvh] overflow-hidden` but account for the header spacer and bottom nav

### 3. Fix CardFan overlap

The CardFan renders cards with `position: absolute` which causes them to overlap surrounding content. Fix:
- Reduce the CardFan container height and add `mb-2` margin
- On the PlayPokerLobby, make the CardFan smaller and ensure z-index doesn't overlap the title text by adding `relative z-0` to the fan and `relative z-10` to the title

### 4. Ensure proper spacing between sections

Add consistent `gap` / `space-y` values and ensure no section bleeds into another.

## Files to Modify

1. **`src/pages/PokerHub.tsx`** -- Replace ghost back button with standard fixed header (Logo + NotificationBell). Remove `poker-felt-bg` full-screen approach, use standard page layout. Ensure no scroll with proper sizing.

2. **`src/components/poker/OnlinePokerLobby.tsx`** -- Replace header with standard fixed header (back button left, title center, refresh right). Remove `pb-24`, remove `poker-felt-bg` wrapper (let AppLayout handle background). Use standard scrollable content area.

3. **`src/components/poker/PlayPokerLobby.tsx`** -- Same header fix. Reduce CardFan size so it doesn't overlap "Play Poker" title. Remove `pb-24`.

4. **`src/components/poker/TournamentLobby.tsx`** -- Same header fix for both list and detail views. Remove `pb-24`.

5. **`src/components/layout/AppLayout.tsx`** -- Remove `/play-poker` and `/online-poker` from `fullscreenRoutes` so the bottom nav shows on these lobby pages (it should only hide during active table gameplay, not in the lobby).

6. **`src/components/poker/CardFan.tsx`** -- Add `overflow-hidden` to prevent card edges from extending beyond the container bounds and overlapping adjacent elements.

