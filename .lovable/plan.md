

# Fix Player Seat to Match Reference Design

## Key Differences (Current vs Reference)

| Element | Current (Wrong) | Reference (Target) |
|---------|----------------|-------------------|
| Avatar size | 88px -- too small next to cards | Needs to be bigger (~96-100px) to dominate |
| Card angle | 14 degrees -- too wide | 10 degrees, closer together |
| Card gap | -14px margin overlap | Tighter: -18px or more overlap |
| Card markings | `text-base` rank, `text-3xl` center suit -- too small | Much larger: `text-xl` rank, `text-4xl+` center suit, like the reference where "A" and "K" fill most of the card |
| Nameplate shape | Tiny `rounded-full` pill, `min-w-[90px]` | Wide, tall `rounded-2xl` bar (~120px wide), more padding, clearly two-line layout |
| Nameplate overlap | `-mt-3` (barely overlaps avatar) | Deeper overlap (~`-mt-4` to `-mt-5`) so it tucks under avatar chin |
| Level badge | Inside avatar container, hidden behind nameplate z-index | Must render OUTSIDE avatar container at z-[5], anchored to avatar's bottom-left edge |
| Country flag | Inside avatar container, hidden behind nameplate z-index | Must render OUTSIDE avatar container at z-[5], anchored to avatar's bottom-right edge |
| Badge/flag size | 22px -- too small | Slightly larger (~24-26px) to be clearly visible beside the nameplate |
| Badge/flag position | `absolute -bottom-1 -left-1` inside avatar parent | Needs absolute positioning relative to the whole seat, calculated to sit at the avatar circle edge, flanking the nameplate |

## Detailed Changes

### 1. `src/components/poker/PlayerAvatar.tsx`
- Increase `xl` size from `w-[88px] h-[88px]` to `w-[96px] h-[96px]`

### 2. `src/components/poker/CardDisplay.tsx`
- Increase `xl` text sizes significantly:
  - Corner rank: from `text-base` to `text-xl` (bold, prominent like the reference "A", "K")
  - Corner suit: from `text-sm` to `text-base`
  - Center suit: from `text-3xl` to `text-5xl` (fills most of the card body)
- Corner position: move slightly inward for better framing (top-1 left-1.5)

### 3. `src/components/poker/PlayerSeat.tsx`

**Cards:**
- Reduce fan angle from 14deg to 10deg
- Increase card overlap from `-14px` to `-18px` (cards closer together)

**Nameplate:**
- Change shape from `rounded-full` (pill) to `rounded-2xl` (wider rounded rectangle)
- Increase `min-w` from `90px` to `120px`
- Increase padding from `px-3 py-0.5` to `px-5 py-1.5`
- Increase text sizes: name from `text-[11px]` to `text-[13px]`, chips from `text-[10px]` to `text-[12px]`
- Deepen overlap from `-mt-3` to `-mt-5`

**Level Badge and Country Flag -- fix z-index stacking:**
- Move both OUT of the `<div className="relative">` (avatar container)
- Render them as direct children of the outer seat container
- Position them absolutely so they anchor at the avatar circle's bottom-left (level) and bottom-right (flag) edges
- Set z-[5] so they paint ABOVE the nameplate (z-[4])
- Increase badge/flag size for `xl` from 22px to 26px

### 4. `src/components/common/LevelBadge.tsx`
- Increase `xl` size from `w-[22px] h-[22px]` to `w-[26px] h-[26px]`
- Increase font from `text-[12px]` to `text-[13px]`
- Change positioning from `absolute -bottom-1 -left-1` to just flex (parent will position it)

### 5. `src/components/poker/CountryFlag.tsx`
- Increase `xl` size from `w-[22px] h-[22px]` to `w-[26px] h-[26px]`
- Increase font from `text-[12px]` to `text-[14px]`
- Same positioning change as LevelBadge

## Z-Index Layering (unchanged logic, fixed implementation)

```text
z-[1]: Avatar body
z-[2]: Active/All-in glow rings
z-[3]: Cards (fanned above avatar, 10deg, tight)
z-[4]: Nameplate bar (wide rounded rectangle, overlapping avatar bottom)
z-[5]: Level badge + Country flag (at avatar edges, above nameplate)
```

## Visual Result
The player seat will have a large dominant avatar circle, with two cards peeking above at a gentle 10-degree angle with bold prominent markings. Below sits a wide dark nameplate bar showing name and chips. The level badge and flag flank the nameplate at the avatar's bottom corners, always visible on top.

