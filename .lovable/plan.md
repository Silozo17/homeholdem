

# Visual Fixes for iPad/Tablet/Desktop Screens Only

These 3 changes apply only to screens 900px+ wide (iPads and larger). Mobile layout stays untouched.

## 1. Dealer Avatar — Move Down 35px (iPad+ only)

**File:** `src/components/poker/OnlinePokerTable.tsx` (line 1119)

The dealer position currently uses:
- Mobile landscape: `calc(-4% - 32px)` 
- Everything else (including iPad): `calc(-4% - 62px)`

Change the non-mobile branch to `calc(-4% - 27px)` (62 - 35 = 27, moving it 35px lower).

**Before:** `top: isMobileLandscape ? 'calc(-4% - 32px)' : 'calc(-4% - 62px)'`
**After:** `top: isMobileLandscape ? 'calc(-4% - 32px)' : 'calc(-4% - 27px)'`

## 2. YOUR TURN Badge — Move Up 35px (iPad+ only)

**File:** `src/components/poker/OnlinePokerTable.tsx` (line 1336)

Current: `bottom: isLandscape ? 'calc(18% + 65px)' : 'calc(22% + 65px)'`

Add a third condition using `isMobileLandscape` to differentiate mobile from iPad landscape:
- Mobile landscape (under 900px): keep `calc(18% + 65px)`
- iPad/desktop landscape: `calc(18% + 100px)` (65 + 35 = 100)
- Portrait: keep `calc(22% + 65px)`

**After:** `bottom: isMobileLandscape ? 'calc(18% + 65px)' : isLandscape ? 'calc(18% + 100px)' : 'calc(22% + 65px)'`

## 3. Community Cards — Move Down 12px (iPad+ only)

**File:** `src/components/poker/OnlinePokerTable.tsx` (line 1130)

Current: `top: '44%'`

Change to use `isMobileLandscape` to keep mobile at 44% but shift iPad/desktop to `calc(44% + 12px)`.

**After:** `top: isMobileLandscape ? '44%' : 'calc(44% + 12px)'`

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/poker/OnlinePokerTable.tsx` | 3 style tweaks (dealer top, YOUR TURN bottom, cards top) -- all gated to 900px+ screens |

## NOT Changed
- Mobile layout (gated behind `isMobileLandscape`)
- Bottom navigation
- Seat positions
- Any other files or components

