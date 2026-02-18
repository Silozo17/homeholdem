

# Fix: Table Card Shrinks When Tapping Delete Button

## Problem
The table card is a `<button>` element with `active:scale-[0.98]`. The trash icon is a child button inside it. When you tap the trash icon, the browser applies `:active` to the parent first, causing the whole card to visually shrink -- making the trash icon shift and feel broken.

CSS `:active` propagates to all ancestors automatically. There is no way to stop it with JavaScript.

## Solution
Change the table card from a `<button>` to a `<div>`. Keep the `onClick` for joining and add `cursor-pointer` + `role="button"`. Remove `active:scale-[0.98]` from the card entirely (or replace it with a JS-driven approach that only fires when the card itself is the click target).

This way, tapping the trash icon no longer triggers a parent `:active` scale effect.

## Technical Detail

**File:** `src/components/poker/OnlinePokerLobby.tsx`

**Line 420-423:** Change:
```tsx
<button
  className="... active:scale-[0.98] ..."
  onClick={() => onJoinTable(t.id)}
>
```
To:
```tsx
<div
  role="button"
  className="... cursor-pointer ..."
  onClick={() => onJoinTable(t.id)}
>
```

And close with `</div>` instead of `</button>` (line 465).

The `active:scale-[0.98]` is removed. The card still looks and behaves the same (clickable, hover shadow) but no longer shrinks on press, so the trash icon stays perfectly stable.

## Files Changed

| File | Change |
|------|--------|
| `src/components/poker/OnlinePokerLobby.tsx` | Change card `<button>` to `<div>`, remove `active:scale-[0.98]` |

