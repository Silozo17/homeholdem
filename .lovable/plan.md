

# Redesign Card Face Markings to Match Reference

## What's Changing

The card background stays **white** (as it already is). The issue is the markings layout and styling don't match the reference. Here's what needs to be fixed:

### Current vs Reference

| Element | Current | Reference Target |
|---------|---------|-----------------|
| Corner rank | `font-black`, adequate size | Bolder, slightly larger, more prominent |
| Corner suit | Directly below rank, small | Slightly bigger, tighter spacing to rank |
| Center suit | Centered vertically, `opacity-80` | Positioned slightly below center, larger, ~40% opacity watermark effect |
| Corner spacing | `top-0.5 left-1` | Slightly more padding: `top-1 left-1.5` |
| Red color | `text-red-600` / `text-red-500` | Deeper red like `#C53030` for rank, lighter for center |
| Black color | `text-gray-900` / `text-gray-700` | True black `#1A1A1A` for rank, softer for center |

### File: `src/components/poker/CardDisplay.tsx`

1. **Corner positioning** -- move from `top-0.5 left-1` to `top-1 left-1.5` for more breathing room like the reference.

2. **Corner rank** -- keep `font-black`, darken colors:
   - Black suits: `text-[#1A1A1A]`
   - Red suits: `text-[#C53030]`

3. **Corner suit** -- use same strong colors (not lighter shade), add `leading-none -mt-0.5` for tighter vertical spacing between rank and suit.

4. **Center suit** -- change from `opacity-80` to `opacity-30` for a subtle watermark effect. Position slightly below vertical center using `items-end pb-[15%]` instead of `items-center`. Use same color base but at lower opacity.

5. **Remove linen texture overlay** -- the reference has a clean white surface with no texture pattern.

6. **Card background** -- keep the current white gradient as-is. It already looks correct.

## Technical Details

Only one file changes: `src/components/poker/CardDisplay.tsx`

- Corner div: `absolute top-1 left-1.5 flex flex-col items-center leading-none gap-0`
- Rank colors: `isRed ? 'text-[#C53030]' : 'text-[#1A1A1A]'`
- Suit colors: same as rank (unified color per suit type)
- Center container: `flex-1 flex items-end justify-center pb-[15%]`
- Center suit opacity: `isRed ? 'text-[#C53030]/30' : 'text-[#1A1A1A]/30'`
- Delete the linen texture overlay div entirely

