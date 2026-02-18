
# Make Stripe Checkout Mobile-Friendly + Round Prize Up

## 1. Stripe Checkout Branding & Mobile UX

**File:** `supabase/functions/paid-tournament-register/index.ts`

Update the `stripe.checkout.sessions.create()` call to add mobile-friendly and on-brand options:

- Add `ui_mode` and `custom_text` for a cleaner mobile experience
- Add `payment_method_types: ['card']` for simplicity on mobile
- Set `locale: 'auto'` so Stripe auto-detects the user's language
- Add a tournament description to the line item for clarity on the checkout page

These are Stripe Checkout Session API options that improve the mobile experience without needing custom UI.

## 2. Prize Rounded Up (Math.floor to Math.ceil)

Change `Math.floor(... * 5 / 9)` to `Math.ceil(... * 5 / 9)` in three places:

| File | Line | Change |
|------|------|--------|
| `src/pages/PaidTournaments.tsx` | 88 | `Math.floor` to `Math.ceil` |
| `src/components/poker/PaidTournamentDetail.tsx` | 113 | `Math.floor` to `Math.ceil` |
| `supabase/functions/paid-tournament-tick/index.ts` | 220 | `Math.floor` to `Math.ceil` |

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/paid-tournament-register/index.ts` | Add Stripe checkout branding and mobile options |
| `src/pages/PaidTournaments.tsx` | Prize rounding: floor to ceil |
| `src/components/poker/PaidTournamentDetail.tsx` | Prize rounding: floor to ceil |
| `supabase/functions/paid-tournament-tick/index.ts` | Prize rounding: floor to ceil |

## NOT Changed
- Bottom navigation
- Styles, layout, spacing
- Any other files
