# Component deep-dive: Page-navigation controls (the "blue scroll arrows")

Scope: the left/right arrows that page the Wii Menu's channel grid, everything that drives
them (hover, click, drag-hold, +/− buttons), the page transition they trigger, and the
question of whether a page indicator exists.

This doc closes several gaps flagged in `context/component-inventory.md` (items 5 and 14b)
and in `context/animations-interactions.md` §4 ("no authoritative source describes the
page-transition motion itself"). **That gap is now closed** — see §6.

---

## 0. Sources and how they are tiered

| Tag | Meaning | Sources used here |
|---|---|---|
| **[Official]** | Nintendo-authored | Wii Operations Manual — Channels & Settings (printed booklet, scanned w/ OCR): https://archive.org/details/wii-opmanual-chset (text: https://archive.org/download/wii-opmanual-chset/WiiRVKChEng_djvu.txt); Nintendo Support "How to Arrange Channels": https://en-americas-support.nintendo.com/app/answers/detail/a_id/1520/ |
| **[Decomp]** | Fan-produced **decompilation of Nintendo's own System Menu binary** — not Nintendo-published, but it *is* Nintendo's logic, symbol-for-symbol. Strongest behavioural source in this corpus. | `koopthekoopa/wii-ipl` — "Wii Menu Decompilation brought to you by fans", 183★, actively maintained (last push 2026-07-23): https://github.com/koopthekoopa/wii-ipl |
| **[Screenshot]** | Direct pixel measurement of this repo's `reference_screen.png` (420×236). Objective, but a single frame of one build. | `/Users/brunoneira/orchids-projects/wiimenu-website/reference_screen.png` |
| **[Fan/community]** | Wikis | https://en.wikipedia.org/wiki/Wii_Menu |
| **[Inferred]** | My reasoning on top of the above | — |

**New this pass:** the `wii-ipl` decompilation. It contains the actual arrow class
(`src/scene/button/iplArrow.cpp`), the button/arrow state machine
(`src/scene/button/iplButton.cpp`, `include/scene/button/iplButton.h`) and the channel-grid
scene that owns paging (`src/scene/channelSelect/iplChannelSelect.cpp`). Every animation is
frame-exact. This should probably be adopted as a standing source for the whole project —
see §11.

> **Important caveat about the decomp:** it gives us *timings, triggers, state logic and
> asset/animation names* with certainty. It does **not** give us the *contents* of the
> animations — those live in the console's binary layout files (`cmnBtn.ash` →
> `my_IplTop_e.brlyt` / `my_IplTop_e.brlan`) on NAND, which the repo does not (and legally
> cannot) ship. So "the hover animation runs for exactly 15 frames" is certain; "the hover
> animation is a scale-up + glow" is still inference.

---

## 1. Naming

- **[Official]** The manual calls them **"blue scroll arrows"**: *"The Wii Menu can have up
  to 48 Channels at one time. If you have more Channels than can be shown on the screen at
  one time, these can be accessed by selecting the blue scroll arrows."*
  (https://archive.org/download/wii-opmanual-chset/WiiRVKChEng_djvu.txt)
- **[Official]** Nintendo Support calls it the **"arrow button"**: *"To move a channel to
  another page, hold it over the arrow button until the page changes."*
  (https://en-americas-support.nintendo.com/app/answers/detail/a_id/1520/)
- **[Decomp]** Internally: pane `ArwR` / `ArwL` (the arrow graphic), hit-target panes
  `B_ArwR` / `B_ArwL`, enums `BTN_ARROW_RIGHT` / `BTN_ARROW_LEFT`, class `ipl::scene::Arrow`.
- **[Official]** The arrows are **not** their own callout in the manual's annotated Wii Menu
  diagram. The diagram's callouts are exactly: *Current Time*, *Wii Settings and Data
  Management*, *SD Card Menu*, *Wii Channels*, *Current Date*, *Wii Message Board* — the
  scroll-arrow sentence lives *inside* the "Wii Channels" callout. Nintendo treated the
  arrows as part of the grid affordance, not as a top-level element.

Suggested component name for this codebase: `PageArrow` (props: `direction`, `visible`),
rendered by a `PageNavigation` container. Avoid "chevron" — the shape is a solid triangle,
not a stroke chevron (§2).

---

## 2. Exact visual design

All numbers below are measured directly from `reference_screen.png` at 420×236. **Note:
that screenshot is 16:9** (420/236 = 1.78; tiles measure 83×45 ≈ 1.84 aspect, matching
Nintendo's 170×96 16:9 icon canvas rather than the 128×96 4:3 one). The decomp confirms the
menu ships both layouts — panes named `4x3`, `16x9` and `ChangeTex16x9` appear in
`iplChannelSelect.cpp`. **4:3 metrics are therefore unmeasured.** [Screenshot] [Decomp]

### Silhouette

A **solid right-pointing triangle with a slightly concave (inward-curving) back edge** — a
"sail"/dart shape, not a stroked chevron and not a perfect triangle.

Traced boundary (x per scanline; screenshot coordinates):

```
y=80  ▸ back edge at x=392 ─┐
y=86  ▸ back edge at x=394  │  back edge bows RIGHT by ~1.5px at mid-height
y=90  ▸ back edge at x=394  │  → concave back, confirming the "curved-back"
y=94  ▸ back edge at x=394  │     silhouette hypothesis
y=100 ▸ back edge at x=392 ─┘
tip apex: x≈404–405 at y≈90
```

- **Bounding box:** x 392→405 (**w ≈ 13.5 px**), y 79→101 (**h ≈ 23 px**). Aspect ≈ **1 : 1.7
  (w : h)**.
- **Leading edges are dead straight at 45°** — exactly 1 px of horizontal travel per 1 px of
  vertical travel from each corner to the tip. Only the *back* edge is curved.
- **Corners/tip:** slightly rounded (2–3 px of anti-aliased falloff at the tip, ~1–2 px at
  the top/bottom corners). Not razor-sharp, not visibly filleted at this resolution.
- **No button chrome:** no circle, capsule, plate, ring or background behind the arrow. It
  floats directly on the page background. [Screenshot]

Portable SVG approximation (viewBox `0 0 27 46`, i.e. 2× the measured pixels — scale freely):

```svg
<svg viewBox="0 0 27 46" xmlns="http://www.w3.org/2000/svg">
  <!-- back edge is a quadratic curve bulging toward the tip (concave from outside) -->
  <path d="M 3 2 Q 6 23 3 44 L 25 23 Z"
        fill="url(#g)" stroke="#3A72B8" stroke-width="1.6"
        stroke-linejoin="round" />
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#7BDBFB"/>
      <stop offset="45%"  stop-color="#BDF7FF"/>
      <stop offset="100%" stop-color="#43BDF3"/>
    </linearGradient>
  </defs>
</svg>
```

### Colour (sampled hex, [Screenshot])

| Part | Sampled values | Recommended token |
|---|---|---|
| Fill — upper third | `#7BDBFB`, `#84D2F3`, `#77E2FF` | `#7BDBFB` |
| Fill — mid (brightest) | `#BDF7FF`, `#B4F4FF`, `#ADF3FF` | `#BDF7FF` |
| Fill — lower third | `#5FD4FB`, `#4DBDEC`, `#43BDF3` | `#45BFF4` |
| Outline / stroke | `#3888CE`, `#3A7BC2`, `#4B71B1`, `#546CA8`, `#2875C0` | `#3A72B8` |
| Background immediately around it | `#D1D1D1`–`#D8D8D8` | (page bg, not the arrow) |

Two things worth internalising:

1. **The stroke is a different hue from the fill.** Fill is cyan (hue ≈ 190°); stroke is a
   cooler royal/cornflower blue (hue ≈ 212°) and much darker. Do **not** implement the
   outline as "darker cyan" — it reads wrong.
2. **There is a vertical gloss gradient**, brightest around 40–50% height and deepening
   toward the bottom. Consistent with the rest of the Wii Menu's glossy-plastic language.
   The gradient is subtle at this resolution; treat the three stops above as a reasonable
   reconstruction rather than a precise ramp. [Screenshot + Inferred]
3. **No drop shadow or outer glow** detected — background pixels immediately outside the
   stroke match background pixels 10 px away. [Screenshot]

### Size relative to everything else

Measured grid geometry from the same screenshot: tiles start at x=36; column boundaries at
~119, ~207, ~297; grid right edge ~385 (tile edge) / ~388 (shadow). Rows: 20→65, 69→114,
119→164. So a tile is **≈ 83 × 45 px** and the grid is **≈ 349 × 144 px**.

| Ratio | Value |
|---|---|
| Arrow width : screen width | **3.2%** (13.5 / 420) |
| Arrow height : screen height | **9.7%** (23 / 236) |
| Arrow height : one tile height | **≈ 0.51** (about half a tile tall) |
| Arrow width : one tile width | **≈ 0.16** |
| Arrow height : full grid height | **≈ 0.16** |

At a notional 640×480-era output this is roughly a **20 × 35 px** glyph. It is small — much
smaller than fan recreations usually make it.

---

## 3. Placement

- **Horizontally: outside the grid, in the right margin.** The grid's right tile edge is at
  x≈385; the arrow's back edge starts at x≈392 — a **~7 px gap (1.7% of screen width)**. The
  tip lands at x≈405, leaving **~15 px (3.6% of screen width)** to the right screen edge.
  The arrow does **not** overlap any tile. [Screenshot]
- **Vertically: centred on the channel grid, not on the screen.** Grid vertical centre is
  y≈92; arrow centre is y≈90 (within 1% of screen height). Screen centre would be y=118 —
  the arrow is ~28 px above it, because the bottom bar occupies the lower fifth. In
  percentage terms the arrow's centre sits at **≈ 38% of screen height**. This is a real
  trap: "vertically centred" is true *of the grid* and false *of the viewport*. [Screenshot]
- **Left arrow is mirrored.** Not directly observable (the screenshot is page 1, where the
  left arrow is hidden — see §4), but the decomp treats `ArwL`/`ArwR` as a symmetric pair
  with identical animation frame ranges throughout, so a mirrored position/geometry is
  safe. [Decomp + Inferred]
- **Z-order: topmost.** `ipl::scene::Arrow::draw()` is a *separate draw pass*: the arrow
  panes are kept `SetVisible(false)` during the normal layout draw, then explicitly turned
  on, drawn, and turned off again in a late pass
  (https://github.com/koopthekoopa/wii-ipl/blob/main/src/scene/button/iplArrow.cpp). Net
  effect: **the arrows render above everything else, including a channel tile being
  dragged.** In CSS, give them the highest `z-index` in the menu. [Decomp]
- **Layer membership:** the arrows live in the *button* layout (`cmnBtn.ash` →
  `my_IplTop_e.brlyt`) alongside the Wii button, SD Card button and Message Board button —
  **not** in the channel-grid layout (`my_IplTop_a.brlan`). Consequence: **the arrows do not
  move during a page transition; only the grid slides beneath them.** [Decomp]

---

## 4. States

### 4.1 Disabled → the arrow is **removed, not greyed** — resolved

This was an open question. It is now settled from two independent directions:

- **[Decomp]** `ChannelSelect` maintains `mbLeftArrowVisible` / `mbRightArrowVisible` and,
  at scene creation, calls:

  ```cpp
  mCurrentPage = System::getSaveData()->getPrevPage();
  if (mCurrentPage == 0)              mbLeftArrowVisible  = false;
  if (mCurrentPage == mMaxPages - 1)  mbRightArrowVisible = false;
  ```

  and then `initArrowAppearance(ARROW_BTN_LEFT, false)`, which snaps the arrow to the **end
  frame of its DISAPPEAR animation**. There is no greyed/disabled visual variant anywhere in
  the enum set — the states are only APPEAR and DISAPPEAR. Hit-testing is also gated:
  `startPointEvent`/`startLeftEvent` both bail out unless `mbArrowVisible[...] == true`.
- **[Screenshot]** Independent confirmation: I scanned the entire left margin of
  `reference_screen.png` (x 0→36, y 55→130) for any non-background pixel. **Nothing** — the
  left margin is a flat ~`#E3E3E3` gradient. On page 1 the left arrow is fully absent, not
  faded, not ghosted.

**Implement as:** conditionally rendered / opacity-0, with the appear-disappear transition
in §5. Never render a grey arrow.

### 4.2 Idle (visible)

The arrow is **never static**. A group animation `G_ArwRoop` ("Arw Loop") is bound at scene
creation with `ANIM_TYPE_LOOP` and started immediately, frames **10000 → 10055**, and is
never stopped:

```cpp
layout::GroupAnimator* arrowLoop = mpLayout->bindToGroup("my_IplTop_e.brlan", "G_ArwRoop", false);
arrowLoop->setMinFrame(10000.0f); arrowLoop->setMaxFrame(10055.0f);
arrowLoop->setAnmType(ANIM_TYPE_LOOP); arrowLoop->play();
```

That is a **55-frame ≈ 917 ms continuous loop** at 60 fps (≈1100 ms on 50 Hz PAL). Contents
unknown — most likely a gentle pulse/shimmer/breathing on brightness or scale, consistent
with the rest of the Wii Menu's idle-motion language. [Decomp; content = Inferred]

### 4.3 Hover / point-at

`Button::startPointEvent()` fires when the pointer enters `B_ArwR`/`B_ArwL`:

1. Plays the arrow's **focus group** animation (`G_ArwR_Focus` / `G_ArwL_Focus`), frames
   **10600 → 10615** — **15 frames ≈ 250 ms**.
2. Plays the SE **`WIPL_SE_BT_TARGETTING`** (the same "targeting" tick used by the other
   bottom-row buttons).
3. **Rumbles the Wii Remote** (`con->rumble()`).
4. Does **not** show a text balloon. Balloons are allocated only for `BALLOON_MAX = 5`
   buttons (Message Board, Channels, Settings, Calendar, Create); the arrows are indices 9
   and 10, past the end. **So there is no tooltip/label on hover.** [Decomp]

Hover-out (`startLeftEvent`) plays frames **10800 → 10815** — also **15 frames ≈ 250 ms**.

Additional quirk: the arrows stay hoverable even when the rest of the button row has been
disabled — the guard is `(mbEnabled || btnNo == BTN_ARROW_RIGHT || btnNo == BTN_ARROW_LEFT)`.
[Decomp]

### 4.4 Click / press (A button while pointing)

In `CsChanSelButtonEventHandler::onEventDerived`, on `ON_TRIG` with `BTN_INTERACT` (A):

```cpp
button->animation(Button::IDANIM_ARROW_RIGHT_SELECT);          // G_ArwR_Ac, frames 10700 → 10730
mpInstance->preparePageScrolling(ChannelSelect::STATE_PREP_RIGHT_PAGE_SCROLL);
```

- Press animation = **30 frames ≈ 500 ms** (group `G_ArwR_Ac`, "Ac" = active).
- `preparePageScrolling()` immediately plays SE **`WSD_SELECT`** and moves to the prep state.
- Notably the arrows do **not** play `WIPL_SE_DECIDE` (the normal button-confirm sound) —
  the page-scroll sound *is* the click feedback.
- The click is rejected outright if you are already on the first/last page
  (`&& mCurrentPage > 0` / `&& mCurrentPage < mMaxPages - 1`), a belt-and-braces guard on
  top of the arrow being invisible anyway. [Decomp]

### 4.5 Drag-hold (channel rearranging)

- **[Official]** *"To move a channel to another page, hold it over the arrow button until
  the page changes."*
  (https://en-americas-support.nintendo.com/app/answers/detail/a_id/1520/)
- **[Decomp]** Exact mechanics (`calcNormalDrag`): pointing a dragged channel at the arrow
  starts a frame counter; once it reaches **15 frames (250 ms)** and the neighbouring page
  has finished loading, the menu plays `IDANIM_ARROW_*_SELECT`, runs the page-scroll
  animation, plays `WSD_SELECT`, and **resets the counter to 0** — so continuing to hover
  pages again every ~250 ms + transition time.
- There is a dedicated **hold** animation in the layout — `G_ArwR_HDAc` / `G_ArwL_HDAc`,
  frames **10500 → 10580** (80 frames ≈ 1333 ms) with a repeat sub-range 10503 → 10580 —
  but the decomp marks its enum entries `IDANIM_ARROW_*_SELECT_ALT` as **`// unused`**, and
  the channel-select drag path calls the ordinary SELECT animation instead. **Uncertain**
  whether the console ever plays HDAc on the main menu (it may belong to the Message Board
  scene, which shares this layout). Do not build the recreation around it. [Decomp]

### 4.6 Contextual hide

The arrows animate *away* whenever you leave the grid, rather than just being covered:
`startChanTtlScene()` (opening a channel) and `tryToStartBoardScene()` (opening the Message
Board) both explicitly fire `IDANIM_ARROW_LEFT_DISAPPEAR` / `IDANIM_ARROW_RIGHT_DISAPPEAR`
before the scene change. Worth mirroring if you build the channel-preview overlay. [Decomp]

> **ℹ️ ADDENDUM (2026-07-24): the arrows are repurposed, not retired.** The disappear
> animation is correct, but `ChannelTitle` **re-shows them in some paths**
> (`iplChannelTitle.cpp:1002–1003`) and they stay event-bound inside the channel-preview
> overlay — where they no longer page the grid but **step to the previous/next installed
> channel** without returning to the menu (`searchChannel()` → `startChangeChannel()`,
> sound `WSD_SELECT`, banner swapped via `ChangeIn` → `ChangeRoop` → `ChangeOut` and the
> button label crossfaded via `ChangeTextIn`/`ChangeTextOut`). Nintendo's own spec
> corroborates: *"Arrows are displayed on the screen edges, so make sure that important
> information is not obscured by them."*
> See `context/decomp-findings.md` §4.4 and `wii_design_specs.pdf` §3.4.1.
> Evidence tier: decomp + official.

---

## 5. Appear / disappear animation

| Event | Group | Frames | Duration @60fps |
|---|---|---|---|
| Arrow appears | `G_ArwR_End` / `G_ArwL_End` | 10150 → 10160 | **10 frames ≈ 167 ms** |
| Arrow disappears | `G_ArwR_End` / `G_ArwL_End` | 10100 → 10110 | **10 frames ≈ 167 ms** |

Both are short. They are triggered *during* a page transition, at the moment the page index
actually changes (`calcNormalScrl`), i.e. the outgoing arrow vanishes and the incoming one
appears **as the slide settles**, not before it starts:

```cpp
if (++mCurrentPage == mMaxPages - 1) {                    // arrived at last page
    button->animation(Button::IDANIM_ARROW_RIGHT_DISAPPEAR);
    mbRightArrowVisible = false;
} else if (!mbLeftArrowVisible) {                          // left page 1
    button->animation(Button::IDANIM_ARROW_LEFT_APPEAR);
    mbLeftArrowVisible = true;
}
```

On cold entry to the menu the appearance is **snapped, not animated**
(`initArrowAppearance()` calls `initAnmFrame(endFrame)`), so the arrows are simply already
in their correct state when the menu fades in. When you come *back* from the Message Board
they animate in properly (`IDANIM_ARROW_*_APPEAR`). [Decomp]

---

## 6. The page transition — **gap closed**

`context/animations-interactions.md` §4 flagged this as unresolved ("cuts instantly, slides
horizontally, or crossfades — nothing found"). The decomp answers it.

### It is a horizontal slide, and it is 20 frames

```cpp
void ChannelSelect::startPageScroll(int nextState) {
    if (nextState == STATE_LEFT_PAGE_SCROLL) { mpLayout->setMinFrame( 0.0f); mpLayout->setMaxFrame(20.0f); }
    else                                     { mpLayout->setMinFrame(40.0f); mpLayout->setMaxFrame(60.0f); }
    mpLayout->setAnmType(ANIM_TYPE_FORWARD);
    mpLayout->start();
}
```

- The animation runs on **`my_IplTop_a.brlan`**, the *channel-grid* layout — i.e. the grid
  itself is animated, the surrounding chrome is not.
- **Left paging = frames 0→20. Right paging = frames 40→60. Both are exactly 20 frames.**
- **Duration: 20 / 60 = 333 ms on NTSC**, 20 / 50 = **400 ms on PAL**. Recommend **333 ms**.
- Easing is **not** recoverable from the decomp (it is baked into the `.brlan` keyframes,
  which are not in the repo). Nintendo's NW4R layout animations default to Hermite
  interpolation, so an ease-in-out is the safe reconstruction. [Decomp + Inferred]

### Why we know it's a slide and not a cut or fade

The grid layout is built as a **5-slot horizontal carousel**, which only makes sense for
horizontal translation ([Decomp], `mscChanPaneNames`, `mscBasePaneNames`, `mscUnk1PaneNames`):

| Container | Panes | Slots present |
|---|---|---|
| `BaseMask0` | `N_Ch_a01`…`a12` | **only 04, 08, 12** — the rightmost column |
| `BaseMask1` | `N_Ch_b01`…`b12` | all 12 |
| `BaseMask2` | `N_Ch_c01`…`c12` | all 12 (current page) |
| `BaseMask3` | `N_Ch_d01`…`d12` | all 12 |
| `BaseMask4` | `N_Ch_e01`…`e12` | **only 01, 05, 09** — the leftmost column |

Three full pages (previous / current / next) plus two "edge" containers that hold *only the
single column that can peek in at the extremes*, each with a matching `Edge0`…`Edge4` mask
pane and a `ChMask` clipping pane. That is textbook horizontal-carousel recycling: after the
20-frame slide the code calls `refreshChannelList(mCurrentPage)` and re-binds, snapping the
containers back and repopulating them. A cut or crossfade would need none of this. [Decomp]

**Bonus finding, relevant to `clock.md` / the date doc:** the layout has **three clock panes**
(`N_Clock0`, `N_Clock1`, `N_Clock2`) — one per full page container — which implies the
clock/date readout is parented *inside* each page and therefore **slides horizontally along
with the grid** during a page turn. Worth verifying against video before implementing.
[Decomp + Inferred]

> **✅ CONFIRMED (2026-07-24) — upgrade from [Inferred] to [Decomp].** `clock::draw()`
> reads the anchor pane's **global** matrix and writes its translation onto the clock
> layout's root (`N_WiiMenu`) before drawing, and `ChannelSelect::draw()` calls
> `mClock.draw(pane)` once for each of `N_Clock0/1/2`. So it is **one clock object
> repositioned and drawn three times per frame**, not three clocks — all three show the
> same time and blink in unison — and because the anchors are children of the page
> containers, it genuinely translates with the grid. `ChMask`, drawn last, clips the
> off-screen copies. Draw order also settles z-index: page containers → thumbnails →
> layout → disc layer → **clock ×3** → cursors → balloons → `ChMask` → dragged tile. So
> the clock renders **above the grid chrome but below the hover cursor and balloons**.
> This kills `clock.md` §1's "stays fixed on-screen as you page" claim outright.
> See `context/decomp-findings.md` §9.7. Evidence tier: decomp.

### Full trigger → settle sequence

1. Input (arrow click, or `+`/`−`) → `preparePageScrolling()`: state = `PREP_*_PAGE_SCROLL`,
   SE **`WSD_SELECT`** plays **immediately**, before any motion.
2. The menu **waits** in `calcNormalWaitScrl()` until `isPageCreatedAllDone(mCurrentPage)` —
   the neighbouring page's channel banners must be loaded. On real hardware this is where a
   perceptible stall can occur; in a web recreation it is a no-op.
3. `startPageScroll()` runs the 20-frame (333 ms) slide.
4. `calcNormalScrl()` waits for `mpLayout->isPlaying(0)` to go false, then increments/
   decrements `mCurrentPage`, fires any arrow APPEAR/DISAPPEAR (§5), calls
   `refreshChannelList()` + `restartChannelModules()` (channel tile animations restart), and
   returns to `STATE_NORMAL`.

Note step 4: **channel tile banner animations restart when a page settles.** [Decomp]

### Persistence

`mCurrentPage` is initialised from `System::getSaveData()->getPrevPage()` and written back
via `setLastPrevPage(mCurrentPage)`. **The Wii Menu remembers which page you were on** across
channel launches and reboots. Cheap and authentic to replicate with `localStorage`. [Decomp]

---

## 7. Alternative inputs — confirmed, with one correction

```cpp
// include/system/iplController.h
BTN_NEXT_RIGHT = REVO_BTN_PLUS  | CL_BTN_PLUS  | CL_BTN_L,
BTN_NEXT_LEFT  = REVO_BTN_MINUS | CL_BTN_MINUS | CL_BTN_R,

// src/scene/channelSelect/iplChannelSelect.cpp — calcNormalNormal()
if (con->down(controller::BTN_NEXT_LEFT))  { if (mCurrentPage > 0)              preparePageScrolling(STATE_PREP_LEFT_PAGE_SCROLL);  }
else if (con->down(controller::BTN_NEXT_RIGHT)) { if (mCurrentPage < mMaxPages-1) preparePageScrolling(STATE_PREP_RIGHT_PAGE_SCROLL); }
```

- **Confirmed:** Wii Remote **`+` = next page (right)**, **`−` = previous page (left)**.
  Classic Controller `+`/`−` and, additionally, **`L` = right, `R` = left** (yes, inverted
  relative to intuition — that is what the enum says). [Decomp]
- **Correction to existing docs:** `context/channels.md` and `context/visual-design.md` §1
  both say paging is done with "the +/− buttons **(or D-pad)**". **The D-pad does not page
  the Wii Menu.** `BTN_LEFT`/`BTN_RIGHT`/`BTN_UP`/`BTN_DOWN` appear **zero times** in
  `iplChannelSelect.cpp`; the only paging inputs in the channel-select scene are
  `BTN_NEXT_LEFT`/`BTN_NEXT_RIGHT`. This should be fixed in those two docs. (The D-pad
  claim likely leaked in from Wikipedia-adjacent summaries or from other Wii screens that do
  use it.) [Decomp]
- Also note `con->down(...)` (held), not `downTrg(...)` (edge) — but the state machine only
  reads input in `STATE_NORMAL`, so holding `+` pages once per completed transition rather
  than continuously. Effective repeat rate ≈ one page per 333 ms + load. [Decomp + Inferred]
- Paging is read from `System::getMasterController()` — **only the primary remote pages the
  menu**, matching Nintendo's own note elsewhere in the manual (*"If more than one remote is
  connected, use Player 1"*). [Decomp + Official]

---

## 8. Page indicator — **resolved: there is none**

`context/component-inventory.md` §14b flagged this as ambiguous, and
`context/animations-interactions.md` §4 leaned on "the existence of visible page-indicator
dots" as an argument. **That premise is wrong.** Three independent lines of evidence:

1. **[Decomp]** The channel-select scene has no page-number or page-dot pane. The full set of
   panes it looks up is: `BaseMask0-4`, `Picture_00-04`, `Edge0-4`, `N_Ch_[a-e]01-12`,
   `N_Clock0-2`, `ChMask`, `4x3`, `16x9`, `ChangeTex16x9`, `DiskIn`, `N_GCIcon`,
   `N_DiscUpdateIcon`, `Picture_16`, `4x3_dummy`. No `Page`, no `Num`, no dot group. The
   only page state is the integer `mCurrentPage`, which is never rendered.
2. **[Official]** The manual's Wii Menu diagram has no page-count callout (§1), whereas the
   **SD Card Menu** — a deliberately similar 12-per-page grid — explicitly does: *"Current
   and total page numbers"*, alongside *"Select the scroll icon to scroll to next page if
   you have more than 12 items stored. (You can also press the + or − Buttons on the Wii
   Remote Plus.)"* The Address Book likewise has a *"Page display / Current and total
   pages."* callout. Nintendo documented that indicator where it exists; its absence from
   the Wii Menu diagram is meaningful, not an oversight.
3. **[Screenshot]** No dots, counter, or bar anywhere in `reference_screen.png` — the area
   below the grid contains only the clock/date and the bottom-bar buttons.

**Implement:** arrows only. No dots, no "1/4". `context/technical-specs.md` §7's passing
reference to a "page-dot/date-time footer" and `animations-interactions.md` §4's dot
argument should both be corrected.

---

## 9. Number of pages, and what the arrows do when pages are empty

```c
// include/system/iplChannelManager.h
#define MAX_CHANNEL_COLUMN 3
#define MAX_CHANNEL_ROW    4
#define MAX_CHANNEL_INDEX  (MAX_CHANNEL_ROW * MAX_CHANNEL_COLUMN)   // 12
#define MAX_CHANNEL_PAGE   4
#define MAX_CHANNEL_TOTAL  (MAX_CHANNEL_PAGE * MAX_CHANNEL_INDEX)   // 48
```

- **Confirmed: 4 pages × 12 slots = 48.** [Decomp], matching the manual's *"up to 48
  Channels at one time"* [Official] and Wikipedia's *"four pages, each with a 4x3 grid …
  48 customizable slots"* (https://en.wikipedia.org/wiki/Wii_Menu) [Fan/community].
- **`mMaxPages = MAX_CHANNEL_PAGE;` — unconditionally 4.** It is never recomputed from how
  many channels you actually own. **Arrow visibility depends only on the page index, never
  on population.** [Decomp]
- Therefore: on page 1 you see a right arrow **even if pages 2–4 are completely empty**; on
  page 4 you see only a left arrow; on pages 2 and 3 you see both. Exactly matches the
  reference screenshot (6 channels installed, right arrow present). [Decomp + Screenshot]
- This is also *necessary* — Nintendo's rearrange flow requires dragging a channel onto the
  arrow to reach an empty page. [Official + Inferred]
- The `mMaxPages > 1` guards sprinkled through the code are dead defensive branches, not
  evidence of a variable page count. [Decomp]
- Wikipedia's phrasing corroborates from the user side: users *"scroll across accessing
  empty slots."* [Fan/community]

---

## 10. Implementation cheat-sheet

```
Geometry (fractions of the 16:9 menu viewport)
  arrow width            3.2% of viewport width
  arrow height           9.7% of viewport height  (≈ half a channel tile)
  centre x               94.9% (right arrow) / 5.1% (left, mirrored)
  centre y               38%  — vertically centred ON THE GRID, not the viewport
  gap grid→arrow         ~1.7% of viewport width
  tip→screen edge        ~3.6% of viewport width

Colour
  fill gradient (top→bottom)  #7BDBFB → #BDF7FF (45%) → #45BFF4
  stroke                       #3A72B8, ~1.5px at 640px-wide scale
  no shadow, no glow, no button plate

Motion (60 fps source; ms values are NTSC)
  idle loop            917 ms, infinite      (content unknown — subtle pulse)
  hover in / out       250 ms each           + tick SE + rumble; NO tooltip
  press (A)            500 ms
  appear / disappear   167 ms each           fires as the page settles, not before
  drag-hold dwell      250 ms before flipping, then repeats
  PAGE TRANSITION      333 ms horizontal slide of the grid, ease-in-out (easing inferred)

Behaviour
  4 fixed pages, always. Left arrow absent on page 1, right arrow absent on page 4.
  Absent = removed entirely. There is no greyed state and no tooltip.
  Arrows render above everything, including a dragged tile.
  Arrows do not move during the transition; only the grid slides.
  + = next page, − = previous page. The D-pad does NOT page.
  Current page persists across sessions.
  No page indicator of any kind.
```

Sound hooks, if `audio.md` ever sources the actual samples: hover =
`WIPL_SE_BT_TARGETTING`, page turn = `WSD_SELECT` (fires on trigger, before motion).
`context/audio.md` currently documents neither.

---

## 11. What is still unknown (be honest about these)

1. **The *content* of every arrow animation.** We have exact durations and trigger points,
   never the keyframes. Whether hover is a scale-up, a brightness lift, a horizontal nudge,
   or a glow is **[Inferred]**. Resolving this needs frame-stepped video of a real console
   or a `.brlan` dump — not achievable from text sources.
2. **The page-transition easing curve.** 333 ms is certain; ease-in-out is a reasonable
   guess based on NW4R's Hermite default.
3. **Whether the neighbouring page's edge column is visible during the slide.** The 5-slot
   carousel with single-column edge containers implies yes, but the `ChMask`/`Edge*` clip
   panes could equally be masking it off. Video would settle it.
4. **4:3 metrics.** Every measurement here is from a 16:9 screenshot. The 4:3 layout exists
   and will place the arrow differently.
5. **Whether the clock/date really slides with the grid** (implied by `N_Clock0/1/2`).
   Feeds directly into the higher-priority date-display deep-dive.
6. **Whether `G_ArwR_HDAc` is ever used on the main menu** (§4.5) — its enum entries are
   marked unused.
7. **Sub-pixel silhouette.** The concave back edge is real but measured across only 23 px;
   the exact curvature is a reconstruction.

## 12. Recommended follow-ups for other docs

- `context/channels.md` and `context/visual-design.md` §1: **remove the D-pad paging claim**
  (§7).
- `context/animations-interactions.md` §4: **close the page-transition gap** (333 ms
  horizontal slide, §6) and **retract the page-dot premise** (§8); its recommended
  "300–450 ms ease-in-out" turned out to be a good guess — 333 ms is inside that band.
- `context/technical-specs.md` §7: drop "page-dot" from the footer description (§8).
- `context/visual-design.md` §1: grid right edge is x≈385, not x≈401 as currently stated
  (measured this pass); and the reference screenshot is **16:9**, which the doc does not say.
- `context/clock.md` / the pending date deep-dive: three clock panes, one per page container
  (§6).
- Project-wide: adopt **https://github.com/koopthekoopa/wii-ipl** as a standing primary-tier
  source. It is likely to resolve several other open questions in the corpus outright —
  empty-slot click behaviour, the channel-preview/"Start" overlay, the Message Board
  open/close animation, and the exact tile hover treatment.
