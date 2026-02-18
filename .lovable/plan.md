

# Fix: Auto-Publish Tournaments on Creation

## Problem
Tournaments are created with `status: "draft"` but there is no "Publish" button in the UI, so they never become visible. The listing page only shows tournaments with status `scheduled`, `running`, or `complete`.

## Solution
The simplest fix: change the `paid-tournament-create` edge function to set `status: "scheduled"` instead of `"draft"`, so tournaments appear immediately after creation. The draft/publish workflow adds unnecessary complexity for a single-admin app.

Also update the existing draft tournament in the database to `scheduled` so it shows up right away.

## Technical Details

### 1. Update edge function (`supabase/functions/paid-tournament-create/index.ts`)
- Change `status: "draft"` to `status: "scheduled"` in the insert statement (line ~50)

### 2. Fix existing data (SQL migration)
- `UPDATE paid_tournaments SET status = 'scheduled' WHERE status = 'draft';`

### 3. Update admin UI text (`src/components/poker/PaidTournamentAdmin.tsx`)
- Change button text from "Create Tournament (Draft)" to "Create Tournament"
- Remove the "Publish it to open registration" hint text

### 4. Remove publish action references
- The `paid-tournament-manage` edge function still has the `publish` action -- keep it for backward compatibility but it is no longer needed in the flow.

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/paid-tournament-create/index.ts` | `status: "draft"` -> `status: "scheduled"` |
| `supabase/migrations/xxx.sql` | Update existing draft tournaments to scheduled |
| `src/components/poker/PaidTournamentAdmin.tsx` | Update button label and remove draft hint |

## NOT Changed
- Bottom navigation
- Styles, layout, spacing
- Routes or other components
