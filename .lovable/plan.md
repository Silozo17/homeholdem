

# Add Quit Confirmation Dialog to Online Multiplayer Table

## Problem

The back button on the MP table immediately leaves or calls `handleLeave` without any confirmation. The bot table (`PokerTablePro`) already has a proper quit confirmation dialog and browser back-button interception -- the MP table has neither.

## Changes

### File: `src/components/poker/OnlinePokerTable.tsx`

**1. Add `showQuitConfirm` state** (near other state declarations around line 130):
```typescript
const [showQuitConfirm, setShowQuitConfirm] = useState(false);
```

**2. Intercept browser back button** (same pattern as `PokerTablePro`):
```typescript
useEffect(() => {
  const handlePopState = (e: PopStateEvent) => {
    e.preventDefault();
    window.history.pushState(null, '', window.location.href);
    setShowQuitConfirm(true);
  };
  window.history.pushState(null, '', window.location.href);
  window.addEventListener('popstate', handlePopState);
  return () => window.removeEventListener('popstate', handlePopState);
}, []);
```

**3. Change back button click** (line 321) from directly calling `handleLeave`/`onLeave` to opening the dialog:
```typescript
<button onClick={() => setShowQuitConfirm(true)} ...>
```

**4. Add AlertDialog** (before the closing `</div>` of the component, matching the bot table's dialog):
```tsx
<AlertDialog open={showQuitConfirm} onOpenChange={setShowQuitConfirm}>
  <AlertDialogContent className="z-[70]">
    <AlertDialogHeader>
      <AlertDialogTitle>Leave Table?</AlertDialogTitle>
      <AlertDialogDescription>
        Are you sure you want to leave? You will forfeit your seat.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <div className="flex gap-3 justify-end">
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction
        onClick={isSeated ? handleLeave : onLeave}
        className="bg-red-600 hover:bg-red-700"
      >
        Leave Table
      </AlertDialogAction>
    </div>
  </AlertDialogContent>
</AlertDialog>
```

**5. Import** `AlertDialog` components (already used elsewhere in the file for kick/close dialogs -- just verify the imports are present).

