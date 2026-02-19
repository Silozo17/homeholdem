

# Add Hamburger Menu to Every Screen + Enhance Menu Items

## What changes

### 1. Make Settings permanent in the hamburger menu
**File:** `src/components/layout/HeaderSocialIcons.tsx`
- Remove the `showSettings` prop -- Settings menu item will always show
- Add additional quick actions:
  - **Rules** (BookOpen icon) -- navigates to `/rules`
  - **Install App** (Download icon) -- navigates to `/install`
  - **Settings** (Settings icon) -- always visible, navigates to `/settings`

### 2. Add hamburger menu to pages that are missing it

| Page | Current header | Change |
|------|---------------|--------|
| `src/pages/Stats.tsx` | Has `NotificationBell` only | Replace with `HeaderSocialIcons` |
| `src/pages/Settings.tsx` | Back arrow + title only | Add `HeaderSocialIcons` to the right side |
| `src/pages/Rules.tsx` | Back arrow + Logo only | Add `HeaderSocialIcons` to the right side |
| `src/pages/EventDetail.tsx` | Back arrow + Logo only | Add `HeaderSocialIcons` to the right side |
| `src/pages/Friends.tsx` | Back arrow + title only | Add `HeaderSocialIcons` to the right side |
| `src/pages/Inbox.tsx` | Back arrow + title only | Add `HeaderSocialIcons` to the right side |

### 3. Clean up the `showSettings` prop usage
**File:** `src/pages/Profile.tsx`
- Remove the `showSettings` prop from the `<HeaderSocialIcons showSettings />` call since it's now always shown

## What does NOT change
- Bottom navigation -- untouched
- Page layouts, spacing, or styling -- untouched
- Existing hamburger menu items (Messages, Friends, Notifications) -- untouched
- No database changes

## Files changed summary

| File | Change |
|------|--------|
| `src/components/layout/HeaderSocialIcons.tsx` | Remove `showSettings` prop, always show Settings + add Rules and Install items |
| `src/pages/Stats.tsx` | Replace `NotificationBell` with `HeaderSocialIcons` |
| `src/pages/Settings.tsx` | Add `HeaderSocialIcons` to header |
| `src/pages/Rules.tsx` | Add `HeaderSocialIcons` to header |
| `src/pages/EventDetail.tsx` | Add `HeaderSocialIcons` to header |
| `src/pages/Friends.tsx` | Add `HeaderSocialIcons` to header |
| `src/pages/Inbox.tsx` | Add `HeaderSocialIcons` to header |
| `src/pages/Profile.tsx` | Remove `showSettings` prop |

