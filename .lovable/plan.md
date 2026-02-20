
# Audit: Missing Translation Keys Across Poker Components

## Summary

Beyond the `BettingControls` and `PreActionButtons` fixes already applied, there are **8+ components** in `src/components/poker/` that contain hardcoded English strings and do NOT use `useTranslation` at all. Each one will show raw English text regardless of the user's language setting.

## Components With Hardcoded English

### 1. `HandResult.tsx` (6 strings)
- "Game Over", "Hand Complete", "chips", "Quit", "Next Hand"
- Note: This component may be unused (replaced by `WinnerOverlay.tsx` which IS translated), but should still be fixed for consistency.

### 2. `InvitePlayersDialog.tsx` (~8 strings)
- Dialog title: "Invite Players"
- Empty state: "No club members to invite. Join a club first!"
- Buttons: "Sent", "Invite"
- Toast messages: "Invite sent!", "Failed to load members", "Failed to send invite"

### 3. `PlayerProfileDrawer.tsx` (~15 strings)
- SR title: "Player Profile"
- Labels: "Level", "Games", "Wins"
- Buttons: "Send Message", "Add Friend", "Request Sent", "Accept Request", "Friends", "Kick Player"
- Loading state: "Loading..."
- Toast messages: "Friend request sent", "Friend request accepted", "Friend removed", "Request cancelled"

### 4. `TournamentLobby.tsx` (~30+ strings)
- Title: "Tournaments"
- Badges: "Registration Open", "In Progress"
- Labels: "Invite Code", "Players", "Stack", "Tables", "BREAK", "Level", "Blind Schedule"
- Buttons: "Register", "Start Tournament (X players)", "Go to My Table"
- Gated state: "Tournaments Locked", "Reach Level 5 to unlock tournaments"
- Toast messages: "Registered!", "Tournament started!", "Error", "Enter a tournament name"
- Note: this file shadows the `t` variable (uses `const t = detail.tournament`) which conflicts with `useTranslation`'s `t` function.

### 5. `OnlinePokerLobby.tsx` (~40+ strings)
- Titles: "Online Tables", "Club Tables"
- Actions: "Create Table", "Join by Code", "Invite Friends", "Set up a new game", "Enter invite code"
- Form labels: "Type", "Description (optional)", "Blinds", "Max Buy-in", "Blind Timer"
- Select options: "Friends (Invite Only)", "Public", "Private (Hidden)", "Community (Permanent)"
- Buttons: "Create & Sit Down", "Join Table", "Creating...", "Joining..."
- Filter tabs: "All", "Public", "Friends", "Mine"
- Empty/loading states, toast messages, table type labels
- Delete dialog: "Delete Table?", "This will permanently close..."

### 6. `QuickChat.tsx` (~20+ strings)
- Reaction labels: "Thumbs Up", "Clap", "Laugh", etc.
- Chat messages: "Nice hand!", "Good luck!", "Bluff!", "GG", etc.
- Section header: "Most Used"
- Note: these are poker slang/phrases -- some may intentionally stay in English as universal poker language, but labels should be translated.

### 7. `PotOddsDisplay.tsx` (2 strings)
- "to win" and "Need X% equity"

### 8. `PokerErrorBoundary.tsx` (likely has error messages)

## Estimated Scope

- **~130+ hardcoded strings** across these 8 components
- **~130 new translation keys** needed in both `en.json` and `pl.json`
- Each component needs `useTranslation` added and all string literals replaced with `t()` calls

## Recommended Approach

Due to the large number of strings, I recommend tackling this in batches:

**Batch 1 (High visibility -- player-facing during gameplay):**
- `PotOddsDisplay.tsx` (2 strings)
- `HandResult.tsx` (6 strings)
- `QuickChat.tsx` (labels only, keep poker slang in English)

**Batch 2 (Lobby and social):**
- `InvitePlayersDialog.tsx` (~8 strings)
- `PlayerProfileDrawer.tsx` (~15 strings)

**Batch 3 (Largest -- lobby screens):**
- `OnlinePokerLobby.tsx` (~40 strings)
- `TournamentLobby.tsx` (~30 strings)

## Special Consideration: `TournamentLobby.tsx`
This file uses `const t = detail.tournament` which shadows any `useTranslation` `t` function. The tournament variable will need to be renamed (e.g., `const tourney = detail.tournament`) before adding translations.

## What Will NOT Change
- Game engine, hooks, reducers
- Layout, spacing, button sizes
- Bottom navigation
- Database or auth
- Components that already use `useTranslation` correctly (WinnerOverlay, BettingControls, CoachOverlay, etc.)
