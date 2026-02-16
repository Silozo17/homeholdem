Here you go — a Lovable-style implementation plan you can paste straight in and edit. It’s detailed, code-first, and removes the “guessing” that’s causing the current mess.

&nbsp;

&nbsp;

&nbsp;

&nbsp;

**Premium Poker Table v5 — Table-Driven Layout + Ellipse-Anchored Seats (Production Plan)**

&nbsp;

&nbsp;

&nbsp;

**Goal**

&nbsp;

&nbsp;

Rebuild the poker table as a proper responsive scene so it matches premium apps:

&nbsp;

- Table asset is the size driver (not the viewport).
- Seats are anchored to the table rail ellipse, not hand-placed in a rectangle.
- No overlaps, no dead vertical space, no clipping on sides.
- Local player always at bottom (without assuming seat 0).

&nbsp;

&nbsp;

&nbsp;

**Root cause (confirmed)**

&nbsp;

&nbsp;

- Seats are positioned relative to a full-height middle zone (viewport-ish container), while the table asset is only part of that zone.
- Top seat + dealer share the same Y band because coordinates are wrong reference frame.
- Side seats clip because X% ignores seat width + safe margins.

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

**Architecture Fix (non-negotiable)**

&nbsp;

&nbsp;

&nbsp;

**1) Replace flex layout with a 3-row CSS grid**

&nbsp;

&nbsp;

Grid rows:

&nbsp;

1. Header row (fixed)
2. Dealer HUD row (fixed)
3. Table scene row (flexible, contains the aspect-locked table wrapper)
4. Action bar row (fixed)

&nbsp;

&nbsp;

Yes, that’s 4 rows. It’s clearer and avoids dealer competing with table content.

&nbsp;

&nbsp;

**Layout spec**

&nbsp;

&nbsp;

- Container: height: 100dvh; width: 100vw;
- Padding: padding-top: env(safe-area-inset-top);
- Action bar: padding-bottom: max(env(safe-area-inset-bottom), 10px);

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

**Seat Positioning Fix (non-negotiable)**

&nbsp;

&nbsp;

&nbsp;

**2) Seats are anchored to an ellipse that matches the table rail**

&nbsp;

&nbsp;

We define ellipse params as CSS variables on the table wrapper so we can tune them per asset:

:root {

  --rail-cx: 50; /* percent */

  --rail-cy: 50;

  --rail-rx: 44;

  --rail-ry: 34;

}

Seats are placed by:

&nbsp;

- theta -> x,y on ellipse
- x/y are % of the table wrapper, not viewport.

&nbsp;

&nbsp;

&nbsp;

**3) Local player always at bottom (no hardcoded seat 0)**

&nbsp;

&nbsp;

We rotate seat indices so the current user’s seat renders at theta=270.

relativeIndex = (seatIndex - mySeatIndex + maxSeats) % maxSeats

Then we map relativeIndex -> theta angle.

&nbsp;

&nbsp;

&nbsp;

&nbsp;

**Debug Tooling (mandatory)**

&nbsp;

&nbsp;

&nbsp;

**4) Add a debug overlay**

**?debug=1**

&nbsp;

&nbsp;

This draws:

&nbsp;

- ellipse path
- dots for seat anchors
- labels for theta/index

&nbsp;

&nbsp;

This is essential so we can tune rx/ry/cy to match the table asset rail perfectly.

&nbsp;

&nbsp;

&nbsp;

&nbsp;

**Files and Implementation (Lovable format)**

&nbsp;

&nbsp;

&nbsp;

**New file:**

**src/lib/poker/ui/ellipse.ts**

&nbsp;

&nbsp;

Purpose: stable math helpers.

export type Ellipse = { cx: number; cy: number; rx: number; ry: number };

&nbsp;

export function degToRad(deg: number) {

  return (deg * Math.PI) / 180;

}

&nbsp;

export function pointOnEllipsePct(e: Ellipse, thetaDeg: number) {

  const t = degToRad(thetaDeg);

  const x = [e.cx](http://e.cx) + e.rx * Math.cos(t);

  const y = [e.cy](http://e.cy) + e.ry * Math.sin(t);

  return { xPct: x, yPct: y };

}

&nbsp;

// Useful for pushing seat outward from rail (normal direction)

export function offsetFromCenterPct(

  e: Ellipse,

  xPct: number,

  yPct: number,

  distancePct: number

) {

  const dx = xPct - [e.cx](http://e.cx);

  const dy = yPct - [e.cy](http://e.cy);

  const len = Math.sqrt(dx  *dx + dy*  dy) || 1;

  return {

    xPct: xPct + (dx / len) * distancePct,

    yPct: yPct + (dy / len) * distancePct,

  };

}

&nbsp;

export function clampPct(v: number, min = 4, max = 96) {

  return Math.max(min, Math.min(max, v));

}

&nbsp;

&nbsp;

&nbsp;

&nbsp;

**Rewrite:**

**src/lib/poker/ui/seatLayout.ts**

&nbsp;

&nbsp;

Purpose: produce seat positions relative to table wrapper using ellipse.

&nbsp;

&nbsp;

**Angle maps (defaults)**

&nbsp;

&nbsp;

These are starting points and must be tuned with debug overlay.

&nbsp;

Portrait angles (clockwise, bottom=270):

const portraitAngles: Record<number, number[]> = {

  2: [270, 90],

  3: [270, 135, 45],

  4: [270, 315, 45, 90],

  5: [270, 320, 20, 80, 140],

  6: [270, 315, 15, 60, 120, 200],

  7: [270, 310, 350, 30, 70, 120, 190],

  8: [270, 305, 340, 20, 55, 95, 140, 210],

  9: [270, 300, 330, 0, 30, 70, 110, 150, 210],

};

Landscape angles (slightly wider):

const landscapeAngles: Record<number, number[]> = {

  2: [270, 90],

  3: [270, 150, 30],

  4: [270, 330, 30, 90],

  5: [270, 330, 30, 90, 150],

  6: [270, 330, 30, 70, 110, 200],

  7: [270, 320, 350, 30, 70, 110, 190],

  8: [270, 315, 345, 15, 55, 95, 140, 210],

  9: [270, 310, 340, 10, 40, 70, 110, 150, 210],

};

&nbsp;

**Main API (keep signature compatible)**

&nbsp;

import { pointOnEllipsePct, offsetFromCenterPct, clampPct, Ellipse } from "./ellipse";

&nbsp;

export type SeatPos = {

  seatIndex: number;

  xPct: number;

  yPct: number;

  anchor: "center";

};

&nbsp;

export function getSeatPositions(opts: {

  maxSeats: number;          // e.g. 9

  seatedCount: number;       // number of active seats in this hand

  seatOrder: number[];       // seat indices in table order

  mySeatIndex: number;       // seat index of local player

  isLandscape: boolean;

  ellipse: Ellipse;

}) : SeatPos[] {

  const { maxSeats, seatOrder, mySeatIndex, isLandscape, ellipse } = opts;

&nbsp;

  const count = Math.max(2, Math.min(seatOrder.length, 9));

  const angles = (isLandscape ? landscapeAngles : portraitAngles)[count] || portraitAngles[9];

&nbsp;

  return [seatOrder.map](http://seatOrder.map)((seatIndex, i) => {

    // rotate so local player is bottom

    const rel = (i - seatOrder.indexOf(mySeatIndex) + count) % count;

    const theta = angles[rel] ?? angles[0];

&nbsp;

    const p = pointOnEllipsePct(ellipse, theta);

&nbsp;

    // push seats slightly outward so they sit on rail not in felt

    const pushed = offsetFromCenterPct(ellipse, p.xPct, p.yPct, 3);

&nbsp;

    return {

      seatIndex,

      xPct: clampPct(pushed.xPct, 6, 94),

      yPct: clampPct(pushed.yPct, 6, 94),

      anchor: "center",

    };

  });

}

&nbsp;

&nbsp;

&nbsp;

&nbsp;

**Rewrite:**

**src/components/poker/PokerTablePro.tsx**

**(major)**

&nbsp;

&nbsp;

Purpose: enforce grid + wrapper + correct positioning context.

&nbsp;

&nbsp;

**Layout structure**

&nbsp;

&nbsp;

- PokerTablePro becomes the scene root.
- Contains: Header, DealerHUD, TableScene (aspect wrapper), ActionBar.

&nbsp;

&nbsp;

Pseudo-structure:

return (

  <div className="PokerSceneRoot">

    <HeaderBar />

    <DealerHud />

    <div className="TableSceneRow">

      <div className="TableWrapper" ref={wrapperRef}>

        <TableFelt />  {/* visual only */}

        <DebugOverlay ... />

        <SeatsLayer ... />   {/* absolute inside wrapper */}

        <BoardLayer ... />   {/* pot + community cards + phase */}

      </div>

    </div>

    <ActionBar />

  </div>

)

&nbsp;

**CSS (must)**

&nbsp;

.PokerSceneRoot{

  height: 100dvh;

  width: 100vw;

  display: grid;

  grid-template-rows: 44px 72px 1fr auto;

  padding-top: env(safe-area-inset-top);

  background: radial-gradient(ellipse at center, rgba(0,0,0,.35), rgba(0,0,0,.85));

  overflow: hidden;

}

&nbsp;

.TableSceneRow{

  display:flex;

  align-items:center;

  justify-content:center;

  padding: 10px 10px 0 10px;

}

&nbsp;

.TableWrapper{

  position: relative;

  aspect-ratio: 16 / 9;

  height: min(56vh, 440px);

  width: auto;

  max-width: 1000px;

}

&nbsp;

@media (orientation: landscape){

  .PokerSceneRoot{ grid-template-rows: 44px 64px 1fr auto; }

  .TableWrapper{

    height: min(68vh, 520px);

    width: min(94vw, 1000px);

  }

}

&nbsp;

.ActionBarRow{

  padding: 10px 10px max(env(safe-area-inset-bottom), 10px);

}

&nbsp;

**Ellipse params from CSS vars**

&nbsp;

&nbsp;

In TS:

&nbsp;

- read computed styles from .TableWrapper
- parse --rail-* into numbers
- pass into getSeatPositions.

&nbsp;

&nbsp;

Example helper:

function readEllipseVars(el: HTMLElement) {

  const s = getComputedStyle(el);

  const get = (name: string, fallback: number) => {

    const v = parseFloat(s.getPropertyValue(name));

    return Number.isFinite(v) ? v : fallback;

  };

  return {

    cx: get("--rail-cx", 50),

    cy: get("--rail-cy", 50),

    rx: get("--rail-rx", 44),

    ry: get("--rail-ry", 34),

  };

}

&nbsp;

&nbsp;

&nbsp;

&nbsp;

**Simplify:**

**src/components/poker/TableFelt.tsx**

&nbsp;

&nbsp;

Must be purely visual. No children overlay layers.

export function TableFelt() {

  return (

    <img

      src="/assets/poker/table-premium.png"

      alt="Poker table"

      className="TableAsset"

      draggable={false}

    />

  );

}

.TableAsset{

  position:absolute;

  inset:0;

  width:100%;

  height:100%;

  object-fit: contain;

  pointer-events:none;

  user-select:none;

}

&nbsp;

&nbsp;

&nbsp;

&nbsp;

**Update:**

**src/components/poker/DealerCharacter.tsx**

&nbsp;

&nbsp;

Dealer is in HUD row, centred, with slight rail overlap via translate.

&nbsp;

CSS:

.DealerHud{

  display:flex;

  align-items:center;

  justify-content:center;

  transform: translateY(8px);

}

.DealerAvatar{

  width: clamp(52px, 12vw, 76px);

  height: clamp(52px, 12vw, 76px);

  border-radius: 999px;

  box-shadow: 0 0 24px rgba(255,215,0,.25);

}

&nbsp;

&nbsp;

&nbsp;

&nbsp;

**New:**

**src/components/poker/DebugOverlay.tsx**

&nbsp;

&nbsp;

Enabled only when new URLSearchParams([location.search](http://location.search)).has("debug").

&nbsp;

Renders SVG ellipse and seat dots inside wrapper.

export function DebugOverlay({ ellipse, seatPositions }: { ellipse: Ellipse; seatPositions: SeatPos[] }) {

  return (

    <svg className="DebugSvg" viewBox="0 0 100 100" preserveAspectRatio="none">

      <ellipse

        cx={[ellipse.cx](http://ellipse.cx)}

        cy={[ellipse.cy](http://ellipse.cy)}

        rx={ellipse.rx}

        ry={ellipse.ry}

        fill="none"

        stroke="rgba(255,0,0,.8)"

        strokeWidth="0.5"

      />

      {[seatPositions.map](http://seatPositions.map)(s => (

        <g key={s.seatIndex}>

          <circle cx={s.xPct} cy={s.yPct} r="1.2" fill="rgba(0,255,255,.9)" />

          <text x={s.xPct+1.2} y={s.yPct-1.2} fontSize="3" fill="white">

            {s.seatIndex}

          </text>

        </g>

      ))}

    </svg>

  );

}

.DebugSvg{

  position:absolute;

  inset:0;

  width:100%;

  height:100%;

  pointer-events:none;

  opacity:.9;

  z-index: 999;

}

&nbsp;

&nbsp;

&nbsp;

&nbsp;

**Premium table look (must match reference)**

&nbsp;

&nbsp;

&nbsp;

**Use an actual table asset (not CSS-only)**

&nbsp;

&nbsp;

Stop trying to approximate rail/felt with gradients. Use a rendered PNG/WebP table asset like your example.

&nbsp;

Asset requirements:

&nbsp;

- 4k source (4096px wide)
- Export to:  

  - table-premium.webp (2048px wide)
  - table-premium@2x.webp (4096px wide)
- &nbsp;
- Transparent background if possible (or include subtle shadow baked in)

&nbsp;

&nbsp;

AI generation prompt (for Lovable image gen):

“Ultra premium poker table top view, oval casino table with dark leather padded rail, gold trim inner ring, patterned green felt texture, realistic studio lighting, soft vignette shadow, 3D render, high detail, 4k, clean centered composition, no text, no logos, no people, no chips, no cards”

&nbsp;

&nbsp;

&nbsp;

&nbsp;

**Acceptance Criteria (Lovable must show proof)**

&nbsp;

&nbsp;

Before marking complete, Lovable must deliver:

&nbsp;

1. Screenshots

&nbsp;

&nbsp;

&nbsp;

- Portrait: 390×844
- Landscape: 844×390
- Small portrait: ~360×740
- Tablet portrait: ~820×1180

&nbsp;

&nbsp;

&nbsp;

2. Debug screenshot

&nbsp;

&nbsp;

&nbsp;

- Same portrait with ?debug=1 showing ellipse and anchor dots aligned to rail.

&nbsp;

&nbsp;

&nbsp;

3. No clipping

&nbsp;

&nbsp;

&nbsp;

- Side seats never cut off at edges.
- Dealer never overlaps top seat.
- Table is always dominant; no huge dead space above/below.

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

**Implementation Order**

&nbsp;

&nbsp;

1. Rewrite PokerTablePro.tsx into grid + wrapper layout
2. Simplify TableFelt.tsx to visual-only asset
3. Add ellipse.ts + rewrite seatLayout.ts for ellipse anchoring + local seat rotation
4. Add DebugOverlay.tsx and tune --rail-* values until dots sit on rail
5. Fix seat scaling/clamping so nothing clips
6. Final polish (dealer HUD translate, shadows, spacing)

&nbsp;

&nbsp;

&nbsp;

&nbsp;

If you paste this into Lovable, it should stop “pretending it did it” and actually rebuild the scene properly.

&nbsp;

If you want, I can also provide starter --rail-* values specifically tuned to the exact table asset you showed (gold inner ring + dark outer rail) — but the debug overlay makes that a 2-minute job anyway.