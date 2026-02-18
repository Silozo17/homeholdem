

# Fix: Allow Retry After Abandoned Stripe Checkout

## Problem
When a user clicks "Register", a `pending` registration is created and they're redirected to Stripe Checkout. If they close the checkout without paying, the registration stays `pending` forever. The UI shows "Payment pending..." with no way to retry.

## Solution

### 1. Edge function fix (`supabase/functions/paid-tournament-register/index.ts`)
Update the "already registered" check to allow re-registration when status is `pending` (not just `cancelled`):
- Change: `if (existingReg && existingReg.status !== "cancelled")` 
- To: `if (existingReg && !["cancelled", "pending"].includes(existingReg.status))`

This way, if the user abandoned checkout, clicking Register again creates a new Stripe session and updates the existing pending row.

### 2. UI fix (`src/components/poker/PaidTournamentDetail.tsx`)
Replace the static "Payment pending..." text (line 187) with a retry button that calls `onRegister` again, plus a note explaining they can try again.

### 3. Fix existing data (SQL)
Reset the stuck pending registration so the user can retry immediately:
- `UPDATE paid_tournament_registrations SET status = 'cancelled' WHERE id = '0022a98f-dc41-4154-94cc-4aa5d1726e19' AND status = 'pending';`

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/paid-tournament-register/index.ts` | Allow re-register when status is `pending` |
| `src/components/poker/PaidTournamentDetail.tsx` | Add "Try Again" button for pending registrations |
| SQL migration | Reset stuck pending registration |

## NOT Changed
- Bottom navigation
- Styles, layout, spacing
- Any other files or components
