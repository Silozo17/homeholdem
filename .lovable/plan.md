

# Raise Human Cards by 4px on Multiplayer Table

## Problem

The human player's hole cards behind the avatar are positioned slightly too low, making them not properly visible above the profile icon.

## Change

### File: `src/components/poker/PlayerSeat.tsx`

Update the `bottom` style on the human cards container (line ~60) from `30%` to `calc(30% + 4px)`:

```typescript
// Before
style={{ zIndex: 1, bottom: '30%', transform: '...' }}

// After
style={{ zIndex: 1, bottom: 'calc(30% + 4px)', transform: '...' }}
```

Single line change -- shifts the fanned cards 4px higher behind the avatar.

