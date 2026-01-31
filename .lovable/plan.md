

## Plan: Fix TV Display Safe Areas, Mini Bar Position, and Multi-Device Responsiveness

### Overview
This plan addresses the four distinct issues:
1. **TV Display header safe area** - Exit/Settings buttons overlapped by phone status bar (only affects TV mode)
2. **Mini bar position** - Currently at bottom, hidden under navigation. Move to TOP of page, below header
3. **TV mode landscape** - Better orientation handling with portrait fallback
4. **Responsive TV layouts** - Dedicated portrait mode and improved landscape responsiveness for all devices

---

### Part 1: Fix Mini Bar Position (Move to Top of Page)

#### Problem
The `TournamentMiniBar` is positioned at `bottom-20` which places it UNDER the `BottomNav` (which also uses z-40), making it barely visible or completely hidden.

#### Solution
Move the mini bar to the TOP of the page, directly below the header navigation. This makes it:
- Always visible
- Not competing with bottom navigation
- Similar to how Uber shows delivery tracking at the top

**File: `src/components/game/TournamentMiniBar.tsx`**

Change positioning from bottom to top:
```typescript
// Before:
className="fixed bottom-20 left-2 right-2 z-40"

// After:
className="fixed top-[calc(4rem+env(safe-area-inset-top,0px))] left-3 right-3 z-40"
```

The mini bar will sit just below the standard header height (h-16 = 4rem) plus any safe area inset.

Also improve the styling for better visibility:
- Stronger gradient background
- More prominent border and shadow
- Display prize pool alongside timer

---

### Part 2: Fix TV Display Safe Area (Header Buttons)

#### Problem
In `TVDisplay.tsx`, the exit button and wake lock indicator are positioned at `top-4` which doesn't account for the device status bar on notched phones (iPhone, newer Android). This ONLY affects TV mode, not other pages.

#### Solution
Add safe area padding to all elements in the TV display header area.

**File: `src/components/game/TVDisplay.tsx`**

```typescript
// Before:
<Button
  className="absolute top-4 left-4 z-50 ..."
>

// After - account for safe area:
<Button
  className="absolute top-[max(1rem,env(safe-area-inset-top,1rem))] left-[max(1rem,env(safe-area-inset-left,1rem))] z-50 ..."
>
```

Apply same pattern to:
- Exit button (top-left)
- Wake lock indicator (top-left, after exit button)
- Settings button (top-right)

**Also update the TV mode display components** to add top padding for the stats bar:

**File: `src/components/game/tv/ClassicTimerMode.tsx`**
```typescript
// Stats bar needs safe area padding
<div className="flex flex-wrap items-center justify-between 
  px-4 pt-[max(0.5rem,env(safe-area-inset-top,0px))] pb-2 
  md:px-16 md:pt-[max(0.75rem,env(safe-area-inset-top,0px))] md:pb-3 
  bg-black/40 ...">
```

Same for `DashboardMode.tsx`, `TableViewMode.tsx`, and `CombinedMode.tsx`.

---

### Part 3: Create Portrait TV Layout

#### Problem
The current TV modes are designed for landscape/TV screens. On a phone in portrait mode, they look cramped and unusable. Need a dedicated portrait layout.

#### Solution
Create a new `PortraitTimerMode` component optimized for portrait orientation on mobile:

**New file: `src/components/game/tv/PortraitTimerMode.tsx`**

Layout structure (top to bottom):
```text
┌─────────────────────────┐
│      LEVEL 1            │  ← Badge (small)
│                         │
│        15:42            │  ← Large timer (fills width)
│                         │
│       SB: 100           │  ← Blinds stacked vertically
│       BB: 200           │
│      Ante: 25           │
│                         │
│   Next: 200/400         │  ← Next level preview
│                         │
│  ┌─────────┬─────────┐  │  ← Stats row
│  │  8/10   │  £300   │  │
│  │ Players │  Prize  │  │
│  └─────────┴─────────┘  │
│                         │
│   ════════════════      │  ← Progress bar
└─────────────────────────┘
```

Key styling:
- Timer: `text-[clamp(4rem,22vw,8rem)]` - Large, width-constrained
- Blinds: Stacked vertically, not side-by-side
- Full width utilization
- Simplified stats (no average stack in portrait)
- No table visualization (too cramped)

---

### Part 4: Add Orientation Detection and Layout Switching

#### Problem
The Screen Orientation API's `lock()` method isn't supported on iOS Safari. Need to detect actual orientation and switch layouts accordingly.

#### Solution
Add orientation detection to `TVDisplay.tsx` and automatically switch to portrait layout when needed.

**File: `src/components/game/TVDisplay.tsx`**

```typescript
const [isLandscape, setIsLandscape] = useState(true);

useEffect(() => {
  const checkOrientation = () => {
    // Use matchMedia for reliable orientation detection
    const landscape = window.matchMedia('(orientation: landscape)').matches;
    setIsLandscape(landscape);
  };
  
  checkOrientation();
  
  const mql = window.matchMedia('(orientation: landscape)');
  mql.addEventListener('change', checkOrientation);
  
  return () => mql.removeEventListener('change', checkOrientation);
}, []);
```

Then in the render:
```typescript
// Portrait mode - use dedicated portrait layout
if (!isLandscape) {
  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950">
      {/* Exit button with safe area */}
      <Button ... />
      
      <PortraitTimerMode
        session={session}
        blindStructure={blindStructure}
        prizePool={prizePool}
        currencySymbol={currencySymbol}
        playersRemaining={activePlayers.length}
        totalPlayers={players.length}
        onUpdateSession={onUpdateSession}
        isAdmin={isAdmin}
        chipToCashRatio={chipToCashRatio}
      />
    </div>
  );
}

// Landscape mode - use existing modes based on displayMode setting
return (
  <div className="fixed inset-0 z-50 ...">
    {displayMode === 'classic' && <ClassicTimerMode ... />}
    {/* etc */}
  </div>
);
```

---

### Part 5: Improve Landscape Responsiveness for All Devices

#### Problem
Even in landscape, the layouts don't adapt well to different screen sizes (phone landscape vs iPad landscape vs desktop/TV).

#### Solution
Use viewport-relative units (`vw`, `vh`) with CSS `clamp()` more aggressively.

**File: `src/components/game/tv/ClassicTimerMode.tsx`**

```typescript
// Timer - scales from small phone landscape to large TV
<div className={`text-[clamp(3rem,15vh,12rem)] font-mono font-black ...`}>

// Blinds - also viewport-relative
<div className="text-[clamp(1.25rem,5vh,3.75rem)] font-bold text-blue-400">

// Stats bar values - responsive
<div className="text-[clamp(1rem,3vh,2rem)] font-bold text-white">
```

**File: `src/components/game/tv/DashboardMode.tsx`**

The right sidebar (fixed 400px width) is problematic on smaller screens:
```typescript
// Before:
<div className="w-[400px] bg-black/40 ...">

// After - responsive width:
<div className="w-[min(400px,35vw)] bg-black/40 ...">
```

Timer sizing:
```typescript
// Before:
<div className="text-[10rem] font-mono ...">

// After:
<div className="text-[clamp(4rem,12vh,10rem)] font-mono ...">
```

**File: `src/components/game/tv/TableViewMode.tsx`**

The stats bar needs responsive padding:
```typescript
// Before:
<div className="flex items-center justify-between pl-20 pr-20 py-4 ...">

// After - responsive padding that accounts for overlay buttons:
<div className="flex items-center justify-between 
  px-[max(5rem,env(safe-area-inset-left,1rem)+4rem)] 
  pt-[max(1rem,env(safe-area-inset-top,0.5rem))] pb-4 ...">
```

Table sizing - ensure it fills available space:
```typescript
// Before:
<div className="relative w-full max-w-5xl aspect-[2.5/1]">

// After - more flexible:
<div className="relative w-full max-w-[90vw] max-h-[70vh] aspect-[2.5/1]">
```

---

### Part 6: Update AppLayout for Top-Positioned Mini Bar

Since the mini bar moves to the top, pages need padding at the top when the mini bar is shown:

**File: `src/components/layout/AppLayout.tsx`**

```typescript
export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const { activeGame } = useActiveGame();

  // ... existing logic ...

  const showMiniBar = activeGame && 
    activeGame.status !== 'completed' && 
    !isOnGamePage && 
    showBottomNav;

  return (
    <div className="min-h-screen safe-area-top">
      {/* Mini bar at top, only when there's an active game */}
      {showMiniBar && <TournamentMiniBar />}
      
      {/* Main content - add top padding when mini bar is shown */}
      <div className={cn(
        showBottomNav ? 'pb-20' : '',
        showMiniBar ? 'pt-16' : '' // Space for mini bar
      )}>
        {children}
      </div>
      
      {showBottomNav && <BottomNav />}
    </div>
  );
}
```

---

### Summary of File Changes

| File | Change |
|------|--------|
| `src/components/game/TournamentMiniBar.tsx` | Move to top position, improve styling |
| `src/components/layout/AppLayout.tsx` | Move mini bar render to top, add content padding |
| `src/components/game/TVDisplay.tsx` | Add safe area to buttons, add orientation detection, portrait layout |
| `src/components/game/tv/PortraitTimerMode.tsx` | **New file** - Portrait-optimized TV layout |
| `src/components/game/tv/ClassicTimerMode.tsx` | Add safe area to stats bar, improve responsive sizing |
| `src/components/game/tv/DashboardMode.tsx` | Responsive sidebar width, safe area padding |
| `src/components/game/tv/TableViewMode.tsx` | Safe area padding, responsive table sizing |
| `src/components/game/tv/CombinedMode.tsx` | Safe area padding, responsive sizing |

---

### Device Support Matrix

| Device | Orientation | Layout Used |
|--------|-------------|-------------|
| iPhone (portrait) | Portrait | PortraitTimerMode |
| iPhone (landscape) | Landscape | ClassicTimerMode (or selected mode) |
| iPad (portrait) | Portrait | PortraitTimerMode (larger text) |
| iPad (landscape) | Landscape | Selected mode (Classic/Dashboard/Table/Combined) |
| Desktop browser | Landscape | Selected mode, full size |
| TV via AirPlay/HDMI | Landscape | Full landscape, large text |

---

### Technical Details

#### Safe Area CSS Pattern for Fixed Elements
```css
/* For buttons in TV display */
top: max(1rem, env(safe-area-inset-top, 1rem));
left: max(1rem, env(safe-area-inset-left, 1rem));
right: max(1rem, env(safe-area-inset-right, 1rem));
```

#### Orientation Detection
```typescript
const mql = window.matchMedia('(orientation: landscape)');
mql.addEventListener('change', (e) => setIsLandscape(e.matches));
```

#### Viewport-Relative Typography
```css
/* clamp(min, preferred, max) */
font-size: clamp(3rem, 15vh, 12rem);
/* - Never smaller than 3rem
   - Prefers 15% of viewport height
   - Never larger than 12rem */
```

---

### User Experience After Fix

1. **Mini Bar**: Visible at TOP of screen when tournament is active, below header navigation
2. **TV Mode on Phone (Portrait)**: Clean, stacked layout optimized for vertical screen
3. **TV Mode on Phone (Landscape)**: Responsive layout that fills the screen
4. **TV Mode on iPad**: Works in both orientations with appropriate layouts
5. **TV Mode on TV (via casting)**: Full-size landscape layout with large, readable text
6. **Safe Areas**: All buttons and content respect device notches and status bars

