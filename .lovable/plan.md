

## Fix: Card Dealing Animation Not Visible

### Problem
The sequential card reveal system causes a visual glitch. When the human player's cards are dealt:
1. Cards first appear face-down with the `card-deal-from-deck` fly-in animation (correct)
2. After the deal delay, cards switch to face-up -- but this causes React to switch from the "faceDown" render branch to the "face-up" render branch in `CardDisplay`
3. The face-up branch also has the `animate-card-deal-deck` class, so the card replays the fly-in animation (starting from opacity 0, translating from -60px above), making the dealing animation invisible or broken

### Solution
Remove the deal-from-deck animation from the face-up card render path in `CardDisplay`. The deal animation should only play on the face-down card back. When the card flips to face-up, it should use a simple fade-in or instant appearance instead.

### Technical Changes

**File: `src/components/poker/CardDisplay.tsx`**
- Remove the `animate-card-deal-deck` class from the face-up card branch (line 60)
- Remove the `animationDelay` style from the face-up card branch (line 65)
- Add a quick fade-in class (`animate-fade-in` or a subtle scale) so the reveal feels smooth rather than jarring
- Keep the `animate-card-deal-deck` on the face-down branch (line 33) -- this is the actual dealing animation and should remain

This is a one-file, two-line change that preserves the dealing animation on face-down cards while preventing the animation replay when cards flip face-up.

