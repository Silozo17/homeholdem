

# Give Bots Fake Personas (Avatars, Levels, Flags)

## Overview

Currently bots have generic names ("Alex", "Blake", etc.) and no avatar images, levels, or country flags. This change creates a rich persona system so each bot feels like a real player at the table.

## What Changes

### 1. New file: `src/lib/poker/bot-personas.ts`

A data file containing an array of 8 bot personas, each with:
- **name** -- A more colorful poker nickname (e.g., "Viktor", "Luna", "Ace", "Maverick")
- **avatarUrl** -- A generated avatar URL using DiceBear API (e.g., `https://api.dicebear.com/9.x/adventurer/svg?seed=Viktor`) -- free, no API key needed, deterministic per seed
- **level** -- Random level between 3 and 45 (feels realistic)
- **countryCode** -- Random 2-letter ISO code from a curated list (US, GB, BR, JP, DE, FR, AU, CA, PL, KR, etc.)

Each persona is tied to a specific bot index so it stays consistent across games.

### 2. Update: `src/hooks/usePokerGame.ts`

- Import the bot personas array
- When creating bot players in the `START_GAME` reducer, assign each bot its persona name (replacing the old `BOT_NAMES` array)
- Store the persona index on the player object (or just use seatIndex to look up persona later)

### 3. Update: `src/components/poker/PlayPokerLobby.tsx`

- Import bot personas to show the correct names and avatar URLs in the lobby preview
- Pass `avatarUrl`, `level`, and `countryCode` from the persona to the `PlayerAvatar` component shown in the lobby

### 4. Update: `src/components/poker/PokerTablePro.tsx`

- Import bot personas
- For bot players, pass `avatarUrl`, `level`, and `countryCode` from their persona to `PlayerSeat` (currently these are `undefined` for bots)

### 5. Update: `src/components/poker/PokerTable.tsx` (fallback table)

- Same treatment as PokerTablePro -- pass persona data to `PlayerSeat` for bots

## Bot Persona Data (Example)

| Index | Name     | Flag | Level | Avatar Seed |
|-------|----------|------|-------|-------------|
| 0     | Viktor   | RU   | 32    | viktor      |
| 1     | Luna     | BR   | 18    | luna        |
| 2     | Ace      | US   | 41    | ace         |
| 3     | Maverick | AU   | 12    | maverick    |
| 4     | Sakura   | JP   | 27    | sakura      |
| 5     | Klaus    | DE   | 35    | klaus       |
| 6     | Priya    | IN   | 9     | priya       |
| 7     | Carlos   | MX   | 22    | carlos      |

## Files to Create/Modify

- **Create**: `src/lib/poker/bot-personas.ts`
- **Modify**: `src/hooks/usePokerGame.ts` -- use persona names
- **Modify**: `src/components/poker/PlayPokerLobby.tsx` -- show persona avatars/flags in lobby
- **Modify**: `src/components/poker/PokerTablePro.tsx` -- pass persona props to PlayerSeat for bots
- **Modify**: `src/components/poker/PokerTable.tsx` -- pass persona props to PlayerSeat for bots

## No database or edge function changes needed

This is purely a frontend/cosmetic change for the practice (vs bots) game mode. Multiplayer already pulls real profile data from the database.

