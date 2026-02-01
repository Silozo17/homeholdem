

## Plan: Comprehensive Fix for Multiple Issues

This plan addresses 6 distinct problems identified in the analysis:

---

### 1. Season Standings: Jan 2026 Game Not Showing in Season 3

**Problem**: The `finalizeGame` function in `src/lib/game-finalization.ts` uses `is_active: true` to find the season, but Season 3 has `is_active: false` in the database. The season determination should be based on **date range**, not the `is_active` flag.

**Root Cause** (lines 135-140 in `game-finalization.ts`):
```typescript
const { data: activeSeason } = await supabase
  .from('seasons')
  .select('*')
  .eq('club_id', clubId)
  .eq('is_active', true)  // Bug: should use date range instead
  .single();
```

**Fix**: Change the query to find the season where the current date falls within `start_date` and `end_date`:

```typescript
const today = new Date().toISOString().split('T')[0];
const { data: activeSeason } = await supabase
  .from('seasons')
  .select('*')
  .eq('club_id', clubId)
  .lte('start_date', today)
  .gte('end_date', today)
  .single();
```

**File**: `src/lib/game-finalization.ts`

---

### 2. Prize Pool Display: Showing Negative Values (-£120)

**Problem**: The `GameHistory.tsx` component calculates prize pool by summing ALL transactions, including negative payout transactions, which results in negative totals.

**Root Cause** (lines 85-90 in `GameHistory.tsx`):
```typescript
const { data: transactions } = await supabase
  .from('game_transactions')
  .select('amount')
  .eq('game_session_id', session.id);

const prizePool = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
```

**Fix**: Filter to only include buy-in, rebuy, and addon transactions (positive pool contributions):

```typescript
const { data: transactions } = await supabase
  .from('game_transactions')
  .select('amount, transaction_type')
  .eq('game_session_id', session.id);

const prizePool = transactions
  ?.filter(t => ['buyin', 'rebuy', 'addon'].includes(t.transaction_type))
  .reduce((sum, t) => sum + t.amount, 0) || 0;
```

**File**: `src/components/clubs/GameHistory.tsx`

---

### 3. House Rules: Restrict Editing to Owner Only

**Problem**: Both admins and owners can currently edit House Rules. The user requested that only the **owner** should be able to edit.

**Current Logic** (line 35 and 169 in `HouseRules.tsx`):
```typescript
interface HouseRulesProps {
  clubId: string;
  isAdmin: boolean;  // Used for showing edit buttons
}
```

**Fix**: 
1. Add a new prop `isOwner` to `HouseRulesProps`
2. Update the component to use `isOwner` instead of `isAdmin` for showing edit/delete buttons
3. Update `ClubDetail.tsx` to pass `isOwner` prop

**Files**: 
- `src/components/clubs/HouseRules.tsx`
- `src/pages/ClubDetail.tsx`

---

### 4. Email Notifications for New Events

**Problem**: The `CreateEventDialog.tsx` already sends emails when events are created (lines 215-270), but we should verify this works correctly.

**Current Implementation**: Already exists and looks correct:
```typescript
const sendEventNotifications = async (eventId: string, eventTitle: string, description?: string) => {
  // ... fetches club members and sends emails
}
```

**Review**: The existing implementation should work. No changes needed unless testing reveals issues.

**File**: `src/components/events/CreateEventDialog.tsx` (no changes needed)

---

### 5. Fix All Number Input Fields to Not Show "0" Immediately

**Problem**: Several components still use `type="number"` inputs which can cause the "0" auto-fill issue. Need to update:

**Files to Update**:

| File | Issue | Fix |
|------|-------|-----|
| `src/components/admin/UserDetailSheet.tsx` | Uses `type="number"` for refund amount | Use `NumericInput` or string state pattern |
| `src/components/clubs/PaymentLedger.tsx` | Uses `type="number"` for settlement amount | Use `NumericInput` or string state pattern |

**Pattern to Apply**: Replace `type="number"` with the string-state pattern:
```typescript
const [amountInput, setAmountInput] = useState('');

<Input
  type="text"
  inputMode="numeric"
  pattern="[0-9]*"
  value={amountInput}
  onChange={(e) => {
    const value = e.target.value;
    if (value === '' || /^\d*$/.test(value)) {
      setAmountInput(value);
    }
  }}
  onBlur={() => {
    if (amountInput === '') setAmountInput('0');
  }}
/>
```

---

### 6. Active Game Mini Bar: Global Time Synchronization

**Analysis**: The current implementation in `TournamentMiniBar.tsx` and `ActiveGameContext.tsx` already uses a drift-resistant approach based on database timestamps:

```typescript
const calculateTimeRemaining = useCallback(() => {
  if (!activeGame) return 0;
  
  if (activeGame.status !== 'active') {
    return activeGame.timeRemainingSeconds ?? 0;
  }
  
  const startTime = new Date(activeGame.levelStartedAt).getTime();
  const initialSeconds = activeGame.timeRemainingSeconds ?? 0;
  const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
  
  return Math.max(0, initialSeconds - elapsedSeconds);
}, [activeGame]);
```

**Current Strengths**:
- Uses `level_started_at` timestamp from database as source of truth
- Recalculates on visibility change (when app returns from background)
- Uses realtime subscriptions to sync across users

**Potential Enhancement**: Ensure the realtime subscription in `ActiveGameContext.tsx` triggers a full refresh when `level_started_at` or `time_remaining_seconds` changes, not just when status changes.

**File**: `src/contexts/ActiveGameContext.tsx` (minor enhancement to ensure time fields trigger updates)

---

## Summary of All File Changes

| File | Change Type | Description |
|------|-------------|-------------|
| `src/lib/game-finalization.ts` | Bug fix | Use date range instead of `is_active` for season lookup |
| `src/components/clubs/GameHistory.tsx` | Bug fix | Filter transactions to only positive pool contributions |
| `src/components/clubs/HouseRules.tsx` | Feature change | Add `isOwner` prop, restrict editing to owner only |
| `src/pages/ClubDetail.tsx` | Feature change | Pass `isOwner` prop to HouseRules |
| `src/components/admin/UserDetailSheet.tsx` | UX fix | Convert refund input to string-state pattern |
| `src/components/clubs/PaymentLedger.tsx` | UX fix | Convert amount input to string-state pattern |
| `src/contexts/ActiveGameContext.tsx` | Enhancement | Ensure time fields trigger realtime updates |
| `src/i18n/locales/en.json` | Localization | Add any new translation keys |
| `src/i18n/locales/pl.json` | Localization | Add Polish translations |

---

## Technical Details

### Season Lookup Fix Logic:
```sql
-- Before (buggy):
SELECT * FROM seasons WHERE club_id = ? AND is_active = true

-- After (correct):
SELECT * FROM seasons 
WHERE club_id = ? 
  AND start_date <= '2026-02-01' 
  AND end_date >= '2026-02-01'
```

### Prize Pool Calculation Fix:
```typescript
// Before: includes payout transactions (negative amounts)
const prizePool = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;

// After: only positive contributions
const prizePool = transactions
  ?.filter(t => ['buyin', 'rebuy', 'addon'].includes(t.transaction_type))
  .reduce((sum, t) => sum + t.amount, 0) || 0;
```

### Owner-Only House Rules:
```typescript
// In HouseRules.tsx
interface HouseRulesProps {
  clubId: string;
  isOwner: boolean;  // Changed from isAdmin
}

// Show edit buttons only for owner
{isOwner && (
  <Button onClick={() => openEditDialog(rule)}>Edit</Button>
)}
```

---

## Validation Checklist After Implementation

1. Complete a game in Season 3 date range → verify it appears in Season 3 standings
2. Check Game History → verify prize pool shows positive values (sum of buy-ins)
3. Log in as Admin (not Owner) → verify House Rules are read-only
4. Log in as Owner → verify House Rules can be edited
5. Test all number input fields → verify "0" only appears on blur, not during typing
6. Start a game → verify mini bar shows correct time for all club members
7. Navigate away and return → verify time didn't drift

