

# Move Human Player Cards Up by 3px

A small UI tweak to raise the human player's hole cards (which fan behind the avatar) by 3 additional pixels.

## Technical Detail

In `src/components/poker/PlayerSeat.tsx`, line 68, change the `bottom` CSS value from `calc(30% + 4px)` to `calc(30% + 7px)`.

This is the inline style on the human cards container div that positions the card fan behind the avatar.

