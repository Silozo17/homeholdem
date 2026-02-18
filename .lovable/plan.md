

# Update Logo Component Across the App

Redesign the `Logo` component to show the HH logo image on the left with the "Home Hold'em" text and "Club" subtitle on the right, removing the heart and spade card suit icons.

## Changes

### 1. Copy the logo image
Copy the uploaded logo to `src/assets/poker/hh-logo.webp` (already exists from the table logo -- reuse the same file).

### 2. Update `src/components/layout/Logo.tsx`
- Remove the `CardSuit` imports and the heart/spade icons
- Import the `hh-logo.webp` image
- Restructure layout: horizontal flex with logo image on left, text block on right
- Logo image sizes scale with the `size` prop (sm: 24px, md: 32px, lg: 48px)
- "Home Hold'em" title and "Club" subtitle stack vertically on the right side, left-aligned

### Files Changed

| File | Change |
|------|--------|
| `src/components/layout/Logo.tsx` | Replace card suits with logo image, horizontal layout |

### NOT Changed
- No page files changed (they all import `Logo` and will pick up the new design automatically)
- No seat positions, bottom navigation, spacing, or other layout changes

