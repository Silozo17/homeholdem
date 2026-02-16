
# Improve Opponent Showdown Cards: Fan Layout, 1.5x Bigger, Centered

## Current Issue
Opponent showdown cards use size `xs`/`sm` (compact-dependent), are laid out flat side-by-side with `gap-0.5`, and positioned with `-top-1` which shifts them off-center vertically.

## Changes in `src/components/poker/PlayerSeat.tsx`

### 1. Increase size 1.5x
- Currently: `cardSize` is `xs` (compact) or `sm` (normal)
- New: `md` (compact) or `lg` (normal) — each is roughly 1.5x the current size

### 2. Fan layout with overlap
- Replace the flat `flex gap-0.5` with overlapping rotated cards, similar to the human player's fan:
  - Card 0: `rotate(-8deg) translateX(-4px)`
  - Card 1: `rotate(8deg) translateX(4px)`
- Remove the gap so cards overlap naturally

### 3. Center on avatar
- Change positioning from `-top-1` to `top-1/2 -translate-y-1/2` so the fan is vertically centered on the avatar circle, not offset to the side/top

## File to Modify

| File | Change |
|------|--------|
| `src/components/poker/PlayerSeat.tsx` | Update opponent showdown card size, add fan rotation/overlap, center on avatar |
