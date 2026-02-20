

# Fix Coach UI: Bigger Avatar, Cloud Bubble, Clean Up Hands

## Issues Identified

1. **Coach avatar too small** -- currently 48x48px (w-12), image 40x40px (w-10)
2. **Speech bubble doesn't look like a chat cloud** -- it's a plain card with a tiny triangle tail
3. **Hand emojis duplicated** -- pointing hands appear BOTH as floating elements on screen AND embedded in message text (e.g., "Tap 'Call'. pointing down"). The text ones are redundant since the floating hand already points at the element
4. **Floating pointer hand misplaced** -- for `require_action` steps that don't have `highlight` set, NO pointer appears at all. For steps that DO have `highlight: 'pot'` or `highlight: 'community'`, the hand points at the wrong thing when the user needs to click an action button
5. **Button text has emoji clutter** -- the require_action prompt shows "pointing up Tap Call below pointing down" with multiple hands

## Changes

### File 1: `src/components/poker/CoachOverlay.tsx`

**Avatar size increase:**
- Avatar container: `w-12 h-12` to `w-14 h-14`
- Image inside: `w-10 h-10` to `w-12 h-12`

**Speech bubble redesign to look like a proper cloud bubble:**
- More rounded corners: `rounded-2xl` to `rounded-3xl`
- Softer background: use `bg-card/90` with stronger `backdrop-blur-md`
- Larger speech tail (the triangle pointing left toward the avatar)
- Subtle inner glow/shadow for cloud-like appearance

**Pointer hand logic fix:**
- For `require_action` steps: ALWAYS show the hand pointing at the action buttons (bottom-right area), regardless of whether `highlight` is explicitly set. The pointer for actions is the default for any `require_action` step.
- For `coach_message` / `deal_community` steps with a `highlight`: show the pointer pointing at the highlighted element as before.
- This prevents the hand pointing at the pot/community when the step is actually asking the user to click an action button.

**Clean up button text:**
- Remove hand emojis from `buttonText` for require_action. Change from `"pointing up Tap Call below pointing down"` to just `"Tap Call"` (plain text, no emojis)

### File 2: `src/lib/poker/tutorial-lessons.ts`

**Remove ALL hand emojis from message strings:**
Every `message` field containing pointing down, pointing up, pointing left, pointing right emojis will have them stripped. This affects approximately 30+ lines across all 10 lessons. The floating pointer on screen already does the pointing job.

Examples of changes:
- `"Tap 'Raise' below. pointing down"` becomes `"Tap 'Raise' below."`
- `"Tap 'Call'. pointing down"` becomes `"Tap 'Call'."`
- `"Tap 'Check'. pointing down"` becomes `"Tap 'Check'."`
- `"Tap 'Fold'. pointing down"` becomes `"Tap 'Fold'."`

Also remove intro step emojis that are redundant (like upward arrows in messages where the floating hand already points).

---

## Files changed summary

| File | Change |
|------|--------|
| `src/components/poker/CoachOverlay.tsx` | Bigger avatar (14x14), cloud-style speech bubble with larger tail, fix pointer hand to always point at actions for require_action steps, clean button text emojis |
| `src/lib/poker/tutorial-lessons.ts` | Remove all pointing hand emojis from ~30+ message strings across all 10 lessons |

## What does NOT change
- Bottom navigation
- Game logic or hooks
- Seat layout or table positioning
- Database
- Translations (the messages are in English in the lesson file, not in i18n)
