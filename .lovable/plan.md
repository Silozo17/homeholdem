

# Fix Player Seat Sizing for Mobile PWA (Landscape)

## Root Cause

The mobile PWA runs in **landscape mode**, which triggers `compact=true` in `PokerTablePro.tsx`. Compact mode uses avatar size `lg` = **56px** and card size `lg` = **48x68px**. This is why everything looks tiny compared to the reference.

The non-compact `xl` size (96px avatar) is never used on mobile landscape. So all previous size increases to `xl` had zero effect on what the user actually sees.

## What Needs to Change

The fix targets the `lg` (compact) sizes primarily, plus keeping `xl` correct for non-compact. The reference image shows approximately:
- Avatar: ~120-130px dominant circle
- Cards: ~45-50px wide, markings filling the card
- Wide nameplate bar below

Since the table has 9 players in landscape and space is tight, we need to balance bigger profiles with table fit. The `lg` sizes need to increase significantly.

### Size Comparison Table

| Element | Current `lg` | Target `lg` | Current `xl` | Target `xl` |
|---------|-------------|-------------|-------------|-------------|
| Avatar | 56px (`w-14 h-14`) | 80px (`w-20 h-20`) | 96px | 96px (keep) |
| Card | 48x68px (`w-12 h-[68px]`) | 40x58px (`w-10 h-[58px]`) | 50x72px | 50x72px (keep) |
| Card rank text | `text-xs` | `text-base` | `text-xl` | `text-xl` (keep) |
| Card center suit | `text-xl` | `text-3xl` | `text-5xl` | `text-5xl` (keep) |
| Nameplate min-w | 68px | 100px | 120px | 120px (keep) |
| Nameplate text | 9px/8px | 11px/10px | 13px/12px | 13px/12px (keep) |
| Nameplate overlap | -mt-3 (est.) | -mt-4 | -mt-5 | -mt-5 (keep) |

## Detailed File Changes

### 1. `src/components/poker/PlayerAvatar.tsx`

Increase `lg` avatar size from `w-14 h-14` (56px) to `w-20 h-20` (80px):

```
lg: 'w-14 h-14 text-base'  -->  lg: 'w-20 h-20 text-base'
```

### 2. `src/components/poker/CardDisplay.tsx`

**Reduce `lg` card dimensions** (cards are too big relative to avatar):
```
lg: 'w-12 h-[68px]'  -->  lg: 'w-10 h-[58px]'
```

**Increase `lg` text sizes** (markings need to fill the card):
```
lg rank:   'text-xs'     -->  'text-base'
lg suit:   'text-[11px]' -->  'text-sm'
lg center: 'text-xl'     -->  'text-3xl'
```

### 3. `src/components/poker/PlayerSeat.tsx`

**Nameplate compact sizing** -- increase from tiny pill to wider bar:
```
compact: 'min-w-[68px] px-3 py-0.5'  -->  'min-w-[100px] px-4 py-1'
```

**Nameplate compact text sizes:**
```
compact name:  'text-[9px] max-w-[56px]'   -->  'text-[11px] max-w-[80px]'
compact chips: 'text-[8px]'                -->  'text-[10px]'
```

**Nameplate overlap for compact:**
Change from `-mt-5` (shared) to conditional: compact uses `-mt-4`, non-compact uses `-mt-5`.

**Card fan overlap for compact:**
```
marginLeft: i > 0 ? '-18px' : '0'  -->  marginLeft: i > 0 ? (compact uses '-14px') : '0'
```

Pass `compact` into cardFan so it can use tighter values for compact.

**Level badge and flag positioning** -- adjust `bottom` for compact to match new bigger avatar:
```
compact bottom: '18px'  -->  '16px'
```

### 4. `src/components/common/LevelBadge.tsx`

Increase `lg` size to match the bigger compact avatar:
```
lg: { wrapper: 'w-[18px] h-[18px]', font: 'text-[10px]' }
-->
lg: { wrapper: 'w-[22px] h-[22px]', font: 'text-[11px]' }
```

### 5. `src/components/poker/CountryFlag.tsx`

Increase `lg` size:
```
lg: 'w-[18px] h-[18px] text-[10px]'
-->
lg: 'w-[22px] h-[22px] text-[12px]'
```

## Summary

The core issue was that mobile landscape triggers `compact=true` which uses the `lg` size tier -- all previous changes to `xl` were invisible on mobile. This plan increases `lg` avatar from 56px to 80px (~1.4x), shrinks `lg` cards from 48x68 to 40x58, and makes card markings much bolder. The nameplate and badges also scale up proportionally.

