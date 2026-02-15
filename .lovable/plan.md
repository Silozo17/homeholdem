

# Fix Poker Table Visuals: Professional Layout + Dealer Avatar

## What's Wrong (3 issues)

1. **Table shape looks round/egg-shaped** -- The felt surface uses `border-radius: 50%` inside a near-square container, creating a tall oval instead of the wide, flat ellipse of a real poker table.
2. **Dealer is just a tiny Crown icon** -- The AI dealer portrait was planned but never wired up. The component still shows a placeholder Lucide icon.
3. **Dealer position overlaps with the top player** -- Both sit at roughly the same vertical position (8-12% from top), causing visual collision.

## The Fix

### 1. Reshape the Table to a Professional Flat Ellipse

Modify `TableFelt.tsx` to use a constrained aspect ratio and explicit elliptical shape:
- Change the oval container to use a fixed aspect ratio (~2:1 width-to-height) centered vertically in the screen
- Use `border-radius: 50%` on a properly proportioned container (wider than tall) so it creates the classic flat poker table shape
- Tighten horizontal insets and increase vertical insets to force a landscape-oriented ellipse regardless of screen orientation

### 2. Upgrade DealerCharacter to Use a Real Avatar Image

Modify `DealerCharacter.tsx` to:
- Import and display the AI-generated dealer portrait image (or a high-quality static placeholder if the AI asset isn't ready)
- Use a proper portrait image inside the gold-bordered circular frame instead of the Crown icon
- Keep the breathing animation and expression system
- Fallback to the Crown icon only if the image fails to load

### 3. Fix Layout Positioning

Modify `PokerTablePro.tsx` seat positions and dealer placement:
- Move the dealer character to the absolute top-center of the table, above the felt (not overlapping any player seat)
- Push the top row of bot seats down slightly (from y: 3-8% to y: 15-20%) to make room for the dealer
- Ensure the human player seat at the bottom has enough room for cards + betting controls

### 4. Create a Dealer Portrait Asset

Generate or add a static dealer portrait image to `src/assets/poker/dealer-portrait.png` that shows a professional casino dealer bust.

---

## Technical Details

### Files to modify:

**`src/components/poker/TableFelt.tsx`**
- Wrap the oval in a container with `aspect-ratio: 2.2 / 1` and `max-height: 55vh` to force proper proportions
- Reduce top/bottom insets, keep side insets to produce a wide flat ellipse
- The felt, rail, vignette, and betting line all stay but inside the correctly proportioned shape

**`src/components/poker/DealerCharacter.tsx`**
- Add an `img` element for the dealer portrait with `onError` fallback to Crown icon
- Import dealer portrait from `src/assets/poker/dealer-portrait.png`
- Scale the avatar frame up slightly (w-14 h-14) to show the portrait properly

**`src/components/poker/PokerTablePro.tsx`**
- Move dealer `top` from `12%` to `6%` (above the table oval)
- Update all `SEAT_POSITIONS_PORTRAIT` entries to push top-row seats lower and spread seats around the new flatter table shape
- Adjust community cards and pot positions to sit within the newly proportioned oval center

**New file: `src/assets/poker/dealer-portrait.png`**
- Generate a dealer bust image using AI or add a placeholder asset

### Seat position adjustments (portrait):

```text
Before:                          After:
  Bot at y:3-8%                    Dealer at y:3%
  Dealer at y:12%                  Bot at y:16-20%
  (overlapping!)                   (clear separation)
  
  Table: tall egg shape            Table: wide flat ellipse
  (border-radius on tall box)      (constrained aspect ratio)
```

### No backend changes needed -- this is purely visual/CSS/component work.

