

# Add Country Selector to Profile + Forced Picker for Existing Users

## Overview

The `profiles.country_code` column already exists and is already piped through to the multiplayer game (`poker-table-state` fetches it, `OnlineSeatInfo` carries it, `PlayerSeat` renders the `CountryFlag`). The only missing pieces are a way to SET it, and a gate for users who haven't set it yet.

---

## What Gets Built

### 1. Country Selector Component

**New file**: `src/components/profile/CountrySelector.tsx`

A searchable dropdown/command palette of ~250 ISO 3166-1 alpha-2 country codes with flag emoji + country name. Uses the existing `Command` (cmdk) component for search. Shows the current selection as a flag emoji + name.

### 2. Country Selector in Profile Page

**File**: `src/pages/Profile.tsx`

Add a "Country" row in the Profile Header Card, below the member-since line. Shows the current flag + country name with a tap-to-change button. On change, updates `profiles.country_code` via Supabase.

### 3. Country Selector in Settings Page

**File**: `src/pages/Settings.tsx`

Add a "Country / Region" section (similar to Language and Currency settings) so users can also change it from Settings.

### 4. Forced Country Selector Modal for Existing Users

**New file**: `src/components/profile/CountryGate.tsx`

A non-dismissable dialog that appears when:
- User is logged in (`user` exists)
- User's `profiles.country_code` is null

This component:
- Fetches the user's profile on mount
- If `country_code` is null, shows a full-screen Dialog (no close button, no backdrop dismiss)
- User must select a country and tap "Confirm" to proceed
- On confirm, updates `profiles.country_code` and closes the dialog
- Only runs once -- after setting the country, the dialog never appears again

**File**: `src/App.tsx`

Render `<CountryGate />` inside the `AuthProvider` + `BrowserRouter` tree, so it has access to auth state and appears on any route.

---

## Technical Details

### Country Data

A static array of ~250 countries with `{ code: string, name: string }` stored in a new file `src/lib/countries.ts`. No external API needed. Flag emojis are generated using the existing `isoToEmoji` function from `CountryFlag.tsx` (will be extracted to a shared util or imported).

### CountryGate Logic

```
1. useAuth() -> get user
2. If no user -> render nothing
3. Fetch profiles.country_code for user.id
4. If country_code is not null -> render nothing
5. If country_code is null -> show forced Dialog
6. On submit -> UPDATE profiles SET country_code = X WHERE id = user.id
7. Close dialog, set local state so it doesn't re-show
```

The dialog uses Radix Dialog with `onPointerDownOutside` and `onEscapeKeyDown` both prevented, and no close button. The only way out is to select a country.

### Profile Page Changes

Below the "Member since" line (line 310), add:

```
Country: [Flag] [Country Name] [Edit pencil]
```

Tapping edit opens the CountrySelector inline or as a popover.

### Files Changed / Created

| File | Action |
|------|--------|
| `src/lib/countries.ts` | **New** -- static country list |
| `src/components/profile/CountrySelector.tsx` | **New** -- searchable country picker component |
| `src/components/profile/CountryGate.tsx` | **New** -- forced one-time country selection dialog |
| `src/pages/Profile.tsx` | **Edit** -- add country display + edit inline |
| `src/pages/Settings.tsx` | **Edit** -- add Country/Region settings section |
| `src/App.tsx` | **Edit** -- add `<CountryGate />` component |

### No Database Changes Needed

`profiles.country_code` (text, nullable) already exists. No migration required.

### No Edge Function Changes Needed

`poker-table-state` already reads `country_code` from profiles and includes it in the seat response. The flag will automatically appear for all players once they set their country.

