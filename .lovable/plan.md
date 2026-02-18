

# Add Home Hold'em Logo to Center of Poker Table

Place the uploaded HH logo image at the center of the table felt, at 75% opacity, layered below the community cards so cards appear on top when dealt.

## Steps

1. **Copy the uploaded image** into the project at `src/assets/poker/hh-logo.webp`.

2. **Add a LOGO z-index** to `src/components/poker/z.ts` with value `3` (between TRIM_GLOW at 2 and CARDS at 5), so the logo sits above the table but below cards.

3. **Add the logo element** in `src/components/poker/OnlinePokerTable.tsx`, right after the `<TableFelt />` line (~line 1119). It will be an absolutely positioned `<img>` centered on the table at 75% opacity using `zIndex: Z.LOGO`.

## Technical Details

**File: `src/components/poker/z.ts`**
- Add `LOGO: 3` entry between TRIM_GLOW and CARDS.

**File: `src/components/poker/OnlinePokerTable.tsx`**
- Import the logo: `import hhLogo from '@/assets/poker/hh-logo.webp';`
- After `<TableFelt />`, add:
```tsx
<img
  src={hhLogo}
  alt=""
  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-auto pointer-events-none select-none"
  style={{ zIndex: Z.LOGO, opacity: 0.75 }}
  draggable={false}
/>
```

## Files Changed

| File | Change |
|------|--------|
| `src/assets/poker/hh-logo.webp` | New file (copied from upload) |
| `src/components/poker/z.ts` | Add `LOGO: 3` |
| `src/components/poker/OnlinePokerTable.tsx` | Add centered logo image below cards |

## NOT Changed
- Mobile layout, seat positions, bottom navigation, dealer position, card positions

