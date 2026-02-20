

# Replace Text Card Examples with Real Card Graphics

## What Changes

Both the **tutorial explainer** (3rd screen - Hand Rankings) and the **Rules page** currently show hand examples as plain monospaced text like `A♠ K♠ Q♠ J♠ 10♠`. These will be replaced with the existing `CardDisplay` component that renders beautiful mini playing cards with proper suit colours (red for hearts/diamonds, black for spades/clubs).

## Approach

### 1. Create a shared hand example data structure

Instead of string examples like `'A♠ K♠ Q♠ J♠ 10♠'`, define each hand's example as an array of `Card` objects. For example:

```text
Royal Flush -> [{rank:14, suit:'spades'}, {rank:13, suit:'spades'}, {rank:12, suit:'spades'}, {rank:11, suit:'spades'}, {rank:10, suit:'spades'}]
```

This data will be shared between both components.

### 2. Create a `MiniCardRow` helper component

A small reusable component that takes an array of `Card` objects and renders a horizontal row of `CardDisplay` components at the `xs` size (24x34px each). This keeps the cards compact enough to fit in each ranking row on mobile.

### 3. Update `TutorialExplainer.tsx` (Page3)

- Import `CardDisplay` from `@/components/poker/CardDisplay`
- Replace the text-based `HAND_RANKINGS` array (lines 16-27) with card object arrays
- In Page3, replace the `<div className="text-xs font-mono ...">` line with a row of mini `CardDisplay` components
- Each row shows 5 tiny cards side by side

### 4. Update `PokerHandRankings.tsx` (Rules page)

- Import `CardDisplay` from `@/components/poker/CardDisplay`
- Replace the string `example` field in `handRankings` with card object arrays
- Replace `<div className="text-sm font-mono ...">` with the same mini card row

## Visual Result

Each hand ranking row will look like:

```text
[1]  Royal Flush
     A, K, Q, J, 10 all same suit
     [A♠][K♠][Q♠][J♠][10♠]  <-- tiny rendered cards
```

Instead of the current plain text `A♠ K♠ Q♠ J♠ 10♠`.

## Card Data for All 10 Hands

| Hand | Cards |
|------|-------|
| Royal Flush | A♠ K♠ Q♠ J♠ 10♠ |
| Straight Flush | 9♥ 8♥ 7♥ 6♥ 5♥ |
| Four of a Kind | K♠ K♥ K♦ K♣ 3♠ |
| Full House | Q♠ Q♥ Q♦ 9♣ 9♠ |
| Flush | A♦ J♦ 8♦ 6♦ 2♦ |
| Straight | 10♠ 9♥ 8♦ 7♣ 6♠ |
| Three of a Kind | 7♠ 7♥ 7♦ K♣ 2♠ |
| Two Pair | J♠ J♥ 4♦ 4♣ A♠ |
| One Pair | 10♠ 10♥ K♦ 7♣ 4♠ |
| High Card | A♠ J♥ 8♦ 6♣ 2♠ |

(Same examples as currently used, just rendered as real cards.)

## Files Modified

- `src/components/poker/TutorialExplainer.tsx` -- Page3 renders real cards
- `src/components/clubs/PokerHandRankings.tsx` -- Hand Rankings accordion renders real cards

## What Does NOT Change

- No layout, spacing, or navigation changes
- No game logic or engine changes
- Bottom navigation untouched
- Card sizes remain compact (xs) to fit mobile screens
- All other pages/sections in the Tutorial Explainer (pages 1,2,4,5) remain the same
- Betting rounds, actions, and blinds sections in Rules page remain the same

