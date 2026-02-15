

## Home Screen and Quick Create Game Option

### What Changes

**1. Add "Play Poker" option to the Quick Create modal (bottom nav + button)**

The center button in the bottom nav opens `QuickCreateDialog`. Currently it only has "New Club" and "New Event". A third option will be added: "Play Poker" — navigating the user to `/online-poker`.

**2. Turn Dashboard into a proper Home Screen**

The current Dashboard page is a clubs-only list. It will be restructured into a welcoming home screen with two main sections:

- **Play Poker** — a prominent card/button that takes users to `/online-poker` (the multiplayer lobby)
- **Your Clubs** — the existing clubs list, kept below

The layout will feel like a hub: the user lands here after login and can quickly choose what to do.

---

### Technical Details

**QuickCreateDialog.tsx** — Add a third button in the `mode === 'select'` section:
- Icon: a playing card or `Gamepad2` icon from lucide
- Label: "Play Poker" / "Join or create a table"
- On click: close dialog, navigate to `/online-poker`

**Dashboard.tsx** — Restructure the page:
- Keep the existing header (Crown, Logo, NotificationBell)
- Add a "Play Poker" hero card at the top with a clear CTA button that navigates to `/online-poker`
- Keep the "Your Clubs" section below (all existing club list logic unchanged)
- Optionally show upcoming events if the user has any (minor enhancement)

**en.json** — Add translation keys:
- `quick_create.play_poker`: "Play Poker"
- `quick_create.play_poker_desc`: "Join or create a table"
- `dashboard.play_poker`: "Play Poker"
- `dashboard.play_poker_desc`: "Jump into a multiplayer game"

**pl.json** — Add matching Polish translations.

### No database or backend changes needed. This is purely a UI/navigation update.

