

# Remove Free Tournaments Card from Poker Hub

## What Changes

Only one file needs editing: `src/pages/PokerHub.tsx`

Remove the "Tournaments" `GameModeCard` (the one with the Trophy icon, purple accent, PRO badge, and route `/poker-tournament`). The "Paid Tournaments" card stays as the single tournaments option.

The free tournament routes (`/poker-tournament`, `/club/:clubId/tournament`) and their page (`PokerTournament.tsx`) will remain in the codebase but simply won't be linked from the hub. This avoids breaking any existing deep links or club-level tournament references.

## Result

The Poker Hub will show 3 cards:
1. Play with Bots
2. Online Multiplayer (PRO)
3. Paid Tournaments

## Files Changed

| File | Change |
|------|--------|
| `src/pages/PokerHub.tsx` | Remove the "Tournaments" GameModeCard block (lines ~60-75 approximately) |

## NOT Changed
- Bottom navigation
- Routes in App.tsx (kept for backward compatibility)
- Paid Tournaments page or components
- Styles, layout, spacing
