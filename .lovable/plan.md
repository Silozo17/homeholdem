

# Fix Desktop View - Cards Too Large, Covering Avatar

## Problem

On desktop (`compact=false`), the `xl` size tier is used. The current `xl` card dimensions (50x72px) are too large relative to the 96px avatar, and the card markings (`text-xl` rank, `text-5xl` center suit) are comically oversized -- the cards completely cover the avatar's face as shown in the screenshot.

## Changes

### 1. `src/components/poker/CardDisplay.tsx`

Reduce `xl` card dimensions and tone down markings to be prominent but proportional:

| Property | Current `xl` | Target `xl` |
|----------|-------------|-------------|
| Card size | `w-[50px] h-[72px]` | `w-[44px] h-[62px]` |
| Corner rank | `text-xl` | `text-base` |
| Corner suit | `text-base` | `text-sm` |
| Center suit | `text-5xl` | `text-3xl` |

### 2. `src/components/poker/PlayerSeat.tsx`

Adjust the card fan positioning so cards peek above the avatar rather than covering the face:

- Change card fan `top` from `-30%` to `-25%` for non-compact mode (cards sit slightly higher, less overlap with face)
- Tighten non-compact card overlap from `-18px` to `-16px`

### 3. `src/components/poker/PlayerAvatar.tsx`

No changes needed -- 96px avatar is correct for desktop.

## Summary

Desktop cards shrink from 50x72 to 44x62 with proportional markings, and shift upward so the avatar face is visible beneath them. The cards will peek above the avatar head like the reference, not cover the entire face.

