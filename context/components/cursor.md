# Component deep-dive: the Wii Remote pointer (the on-screen hand cursor)

**Research date:** 2026-07-24
**Scope:** Part A — what the real Wii Menu hand cursor *is* (shape, colours, states, rotation,
smoothing, sound). Part B — how to actually replace the browser cursor with it on the web.

This doc supersedes and considerably deepens `context/animations-interactions.md` §2. Several
claims in that section are **corrected** here on the strength of new evidence — most importantly
the "index finger curls on A-press" fan memory (§5.4) and the assumption that per-player colour
coding exists (§4.3).

---

## 0. Sources and how they are tiered

| Tag | Meaning | Sources used here |
|---|---|---|
| **[Decomp — code evidence]** | Fan decompilation of Nintendo's *actual* System Menu 4.3 binary. Symbol-for-symbol Nintendo logic. Strongest behavioural source available. | `koopthekoopa/wii-ipl` — https://github.com/koopthekoopa/wii-ipl <br>Key files: `include/system/iplPointer.h`, `src/system/iplPointer.cpp`, `src/system/iplPointerCore.cpp`, `src/system/iplController.cpp`, `include/system/iplController.h`, `src/utility/iplUtility.cpp`, `src/system/iplSystem.cpp`, `src/homebutton/HBMBase.cpp`, `include/sound/IplSound.rsid` |
| **[Asset — measured]** | Direct pixel measurement of the **ripped cursor texture atlas** from the real console. Objective. | *Pointer* sheet, Wii Menu, The Spriters Resource: https://www.spriters-resource.com/wii/wiimenu/asset/167191/ (image: `https://www.spriters-resource.com/media/assets/164/167191.png`, 129 × 259 RGBA PNG). Measured with PIL during this research pass. |
| **[Official]** | Nintendo-authored | Nintendo Support — "Cursor is off-centre, jerky, erratic, disappears": https://www.nintendo.com/en-gb/Support/Wii/Troubleshooting/Wii-Remote-Controllers-amp-Sensor-Bar/Cursor-is-off-centre-jerky-erratic-disappears-etc-/Cursor-is-off-centre-jerky-erratic-disappears-etc-244285.html |
| **[Official/MDN]** | MDN + browser engine source | MDN `cursor`: https://developer.mozilla.org/en-US/docs/Web/CSS/cursor · Chromium `ui/base/cursor/cursor.cc` and `third_party/blink/renderer/core/input/event_handler.cc` · WebKit `Source/WebCore/page/EventHandler.cpp` · MDN browser-compat-data `css/properties/cursor.json` |
| **[Fan/community]** | Wikis, cursor packs | WiiBrew — Wiimote/Pointing: https://wiibrew.org/wiki/Wiimote/Pointing |
| **[Inferred]** | My reasoning on top of the above | — |

> **Standing caveat about the decomp.** It gives *logic, names, constants and triggers* with near
> certainty. It does **not** ship the layout/animation binaries — those live in `cursor.ash` on the
> console's NAND. So "the cursor has no bound animations" is certain (§5.4); "the rotation pivot is
> the fingertip" is inference (§6.3). The repo is also explicitly WIP and some functions are marked
> `// non-matching`, so treat exact float constants as *very likely* rather than *proven*.
>
> **Standing caveat about the sprite sheet.** It is a community rip, not an official release. Its
> internal consistency with the decomp (exactly two hand poses, exactly four numerals, a separate
> shadow silhouette pair — matching `P*_Def` / `P*_Cat` / `N_SRot`) is strong mutual corroboration,
> but a rip can still contain flattening artefacts. Where I reconstructed the composite (§4.2) I say so.

---

## 1. Naming and architecture (what Nintendo actually called it)

**[Decomp — code evidence]** The cursor system is `ipl::Pointer`, a single global owned by
`System` (`System::getPointer()`), constructed in `src/system/iplSystem.cpp`:

```cpp
smArg.mpPointer = new (getMem1Sys(), 4) Pointer(getMem2Sys());
```

Internally it is a three-layer structure (`include/system/iplPointer.h`):

- **`ipl::Pointer`** — the public façade. Owns the layout archive, visibility, and the on-screen
  B-scroll arrow. Exposes `calc()`, `draw()`, `setState()`, `changeType()`, `setVisible()`.
- **`ipl::PointerCore`** — holds `PointerCoreObject mCursors[WPAD_MAX_CONTROLLERS]` — i.e. **four**
  independent cursor objects, one per Wii Remote channel.
- **`ipl::PointerCoreObject`** — one hand. Holds its layout, state, type and channel.

The header carries an explicit warning that only `ipl::Pointer` is public API:

```cpp
/** @warning Do not use `ipl::PointerCoreObject`, Please instead use `ipl::Pointer` */
```

Nintendo's user-facing vocabulary for the same thing is just **"the cursor"** or **"the pointer"**
([Official] — the Nintendo Support page is titled "Cursor is off-centre, jerky, erratic, disappears").

**Suggested component name for this codebase:** `WiiPointer` (or `WiiCursor`). Props:
`enabled`, `playerNumber`, `pose` (`'point' | 'grab'`), `tiltMode`. See §12 for a full component.

---

## 2. The asset: `cursor.ash` and nine layout files

**[Decomp — code evidence]** `src/system/iplPointer.cpp`, verbatim:

```cpp
#define MIN_LENGTH 32.f
#define MAX_LENGTH 128.f

static const char* scLayoutName[MAX_LAYOUT_FILES] = {
    #define LYT_INVALID_ID     -1

    // Point
    #define LYT_POINT_ID       0
    "P1_Def.brlyt",
    "P2_Def.brlyt",
    "P3_Def.brlyt",
    "P4_Def.brlyt",

    // Grab
    #define LYT_GRAB_ID        4
    "P1_Cat.brlyt",
    "P2_Cat.brlyt",
    "P3_Cat.brlyt",
    "P4_Cat.brlyt",

    // Scroller
    #define LYT_SCROLLER_ID    8
     "my_BScroll_a.brlyt"
};

Pointer::Pointer(EGG::Heap* heap) : ... {
    mpLayoutArchive = System::getNandManager()->readLayout(heap, "cursor.ash");
    for (int i = 0; i < MAX_LAYOUT_FILES; i++) {
        mpLayout[i] = new (heap, 4) layout::Object(heap, mpLayoutArchive, "arc", scLayoutName[i]);
        mpLayout[i]->finishBinding();
    }
}
```

Facts that fall straight out of this:

1. **Everything cursor-related lives in one NAND archive, `cursor.ash`** (ASH-compressed U8 archive).
2. There are exactly **two hand poses**, ×4 players: `Def` (default/pointing) and `Cat`
   (**[Inferred]** almost certainly Japanese-dev shorthand for "**cat**ch" = grab).
3. **There is a separate layout per player number.** This is *why* there are four files per pose —
   the numeral is baked into the layout, not switched at runtime. (§4.)
4. The ninth file is a completely separate widget, the **B-scroll arrow** (`my_BScroll_a.brlyt`), not
   a hand at all. See §7.
5. **`finishBinding()` is called with zero preceding `bind()` calls.** In this codebase
   `layout::Object::bind(...)` is what attaches a `.brlan` animation to a layout
   (`include/layout/iplLayout.h`). Compare `ChannelObj::initCursor()` in
   `src/scene/channelSelect/iplChannelObj.cpp`, which *does* bind three animations. **The hand cursor
   layouts have no animations bound to them at all.** This is the single most consequential finding in
   this document — see §5.4.

The `Pointer` class also exposes a third type that has no layout behind it:

```cpp
enum { TYPE_POINT = 0, TYPE_GRAB, TYPE_UNK2, TYPE_MAX };
```

`get_layout()` only maps `TYPE_POINT`→0 and `TYPE_GRAB`→4; anything else falls through with
`grabId = LYT_INVALID_ID (-1)`. **[Inferred]** `TYPE_UNK2` is dead/unused — most likely a cut third
pose. No call site anywhere in the repo passes it.

---

## 3. Exact visual design (measured from the real texture)

**[Asset — measured]** The ripped atlas is **129 × 259 px**, laid out as a **2 × 4 grid of 64 × 64
cells** (with 1 px gutters). Contents, top-left to bottom-right:

| Cell | Contents |
|---|---|
| (0,0) | **Pointing hand** — white fill, heavy black outline |
| (0,1) | **Closed fist** — white fill, heavy black outline |
| (1,0) | **Pointing-hand shadow** — pure white soft-edged silhouette |
| (1,1) | **Fist shadow** — pure white soft-edged silhouette |
| (2,0) / (2,1) | Numeral overlay tiles **1** and **3** |
| (3,0) / (3,1) | Numeral overlay tiles **2** and **4** |

### 3.1 Silhouette — the pointing (default) hand

**It is a fist with the index finger extended straight up.** Not an open palm, not a "pointing
right" hand. Measured tight bounding box: **43 px wide × 62 px tall** inside its 64 × 64 cell.

Per-row extents (cell coordinates, y down from the cell top):

| y | x-extent | what it is |
|---|---|---|
| 1 | 21–24 | rounded fingertip apex |
| 4–18 | 16–29 | the index finger — a **14 px-wide vertical column** with a rounded cap |
| 20 | 16–35 | first knuckle appears to the right |
| 22 | 16–42 | second knuckle |
| 24 | 16–49 | third knuckle — all three curled fingers now present |
| 36–44 | 10–52 | widest point (43 px) — the fist/palm, thumb bulge on the **left** |
| 50 | 13–50 | narrowing |
| 58 | 20–47 | wrist |
| 62 | 23–44 | flat-ish bottom edge (22 px wide) |

Reading that as a drawing: a chunky **cartoon fist seen from the back of the hand**, three
knuckle-bumps stepping down-right from the base of the index finger, a **thumb bump on the left
side** of the fist, and a slightly narrowed, blunt wrist at the bottom. The index finger is **not**
centred — it sits noticeably left of the hand's centre (finger centre ≈ x22.5 vs hand centre ≈ x31).

### 3.2 Silhouette — the grab (Cat) pose

**[Asset — measured]** Same 43 px width, but only **43 px tall**, occupying y20–62 of its cell —
i.e. **bottom-aligned to the pointing hand, with the extended finger simply removed.** The three
knuckle bumps and thumb are identical. So the two poses share the same fist and differ only by the
finger.

This is important for a web implementation: **the fist does not move between poses.** Draw one fist
and toggle the finger.

### 3.3 Colours and stroke

**[Asset — measured]** The artwork is **pure achromatic** — every opaque pixel has R = G = B. There
is no colour anywhere in the cursor atlas.

- **Fill:** `#FFFFFF`, flat, no gradient in the base sprite.
- **Outline:** `#000000`, hard, with a 1–2 px antialiased ramp (measured intermediate values
  `#111111`, `#222222`, `#333333`, `#444444`, `#666666`, `#888888`, `#AAAAAA`, `#CCCCCC` — a clean
  8-step blend, consistent with a downscaled/antialiased vector original).
- **Outline weight:** **≈3 px on a 62 px-tall hand** (measured at the fingertip: rows y2, y3, y4 are
  solid black at x22 before white begins at y5). That is **≈4.8 % of the hand's height**, or in
  stroke terms roughly `stroke-width: 6` on a 43 × 62 viewBox with the stroke centred on the path.
  This is a *very* heavy outline — it is what makes the cursor read against any background.
- **Gloss/gradient:** **none in the hand sprite itself.** A subtle grey gradient *is* present, but it
  lives in the numeral overlay tile and is multiplied on at render time (§4.2). There is no specular
  highlight, no bevel, no rim light. The Frutiger-Aero gloss of the Wii Menu does *not* extend to the
  cursor — it is deliberately flat, high-contrast, and readable.

### 3.4 The drop shadow

**[Decomp — code evidence]** The shadow is a real, first-class thing, not a CSS afterthought.
`src/system/iplPointerCore.cpp` rotates it as a separate pane:

```cpp
nw4r::lyt::Pane* pRotatePane       = mpLayout->FindPaneByName("N_Rot");
nw4r::lyt::Pane* pRotateShadowPane = mpLayout->FindPaneByName("N_SRot");

pRotatePane->SetRotate(cursorRotateVec);
pRotateShadowPane->SetRotate(cursorRotateVec);
```

`src/homebutton/HBMBase.cpp` names the same three panes explicitly:

```cpp
const char* HomeButton::scCursorPaneName    = "N_Trans";
const char* HomeButton::scCursorRotPaneName = "N_Rot";
const char* HomeButton::scCursorSRotPaneName= "N_SRot";
```

**[Asset — measured]** The shadow sprites are **pure white, soft-edged silhouettes** of each pose,
**44 px wide × 62 px tall** (pointing) — i.e. **1 px larger than the hand and offset 1 px left**
(x9–52 vs x10–52), with a several-pixel alpha falloff at the edges. Being pure white means they are
**tinted at draw time by the layout's vertex/material colour** — almost certainly to a low-alpha
black.

**[Inferred]** So the render order per cursor is: *soft dark blurred silhouette (offset), then the
white+black hand on top, then the numeral multiply overlay.* The shadow rotating on its own pane
(`N_SRot`, separate from `N_Rot`) means Nintendo could give it a slightly different pivot/offset so
the shadow lags or sits down-right of the hand — the exact offset is inside `cursor.ash` and is **not
recoverable from the decomp**. A soft `drop-shadow(2px 3px 3px rgba(0,0,0,0.35))` is a defensible
web stand-in.

---

## 4. The player-number badge

### 4.1 Where it sits

**[Asset — measured]** The four numeral tiles are 64 × 64 overlays that register **1:1 with the hand
cell**. The digit glyph occupies:

| Tile | glyph bbox (cell coords) | size |
|---|---|---|
| 1 | x30–35, y34–50 | 6 × 17 |
| 2 | x27–38, y34–50 | 12 × 17 |
| 3 | x27–38, y34–50 | 12 × 17 |
| 4 | x26–39, y34–50 | 14 × 17 |

All four share **y34–50** and are horizontally centred on **x ≈ 32.5**. Relative to the 43 × 62 hand
artwork that is:

- **horizontal centre ≈ 52 % of the hand's width** (essentially dead centre of the fist)
- **vertical centre ≈ 66 % of the hand's height**
- **glyph height = 17 / 62 ≈ 27 % of the hand's height**

In plain language: **the numeral is stamped on the back of the fist**, centred, in the lower-middle
of the hand. It is *not* a badge floating beside the cursor, not on the wrist, and not in a bubble.

### 4.2 How it's rendered — and it is *not* a coloured badge

**[Asset — measured]** In the ripped atlas the numeral tiles look inside-out: the digit is
**alpha = 0 with RGB = 0**, and the surrounding plate is opaque and light. Critically, **RGB equals
alpha at every pixel** — the signature of a GameCube/Wii **intensity-only (I8/IA8) texture** that the
ripper expanded into RGBA.

Read as an intensity map, the tile is: **value 255 (white) across the top ~60 %, ramping down to
~187 grey toward the bottom, with the numeral punched to 0 (black).**

**[Inferred, but verified by reconstruction]** That is a **multiply/shading overlay for the hand's
white fill**. I reconstructed the composite during this research pass (hand RGB × numeral-tile
intensity, hand alpha preserved) and it produces **exactly the iconic Wii cursor**: a white hand with
a **solid black numeral on the fist** and a **subtle grey shading gradient across the lower third of
the hand**. Two separate jobs, one texture:

1. the player numeral, in **black**, and
2. a soft grey **bottom-shading gradient** on the hand (255 → ~187, starting around y40 of 64) that
   gives the otherwise-flat white fill a hint of form.

**Practical spec for redrawing:** numeral in `#000000` (or a very dark grey), and a vertical linear
gradient over the lower ~35 % of the hand from `#FFFFFF` to `#BBBBBB` (187 = `#BB`).

### 4.3 Per-player colours: **there are none** — correcting a common assumption

**[Asset — measured]** The entire cursor atlas is achromatic. There is no blue-P1 / red-P2 /
green-P3 / yellow-P4 coding anywhere in it.

**[Decomp — code evidence]** Corroborating: the four layouts per pose differ *only* by which numeral
tile they reference; nothing in `Pointer`, `PointerCore` or `PointerCoreObject` ever sets a colour,
tint, or material parameter per channel. The only per-channel state is `mChan`, used purely to index
into `mpLayout[]`.

> **Correction to prior project context.** Any assumption of "P1 blue, P2 red…" (a *Mario Kart Wii* /
> *Wii Sports* convention, and the colour of the Wii Remote's player LEDs on some later hardware) does
> **not** apply to the System Menu cursor. In the Wii Menu, **all four hands are identical white; only
> the numeral differs.**
>
> The Pinterest pin the owner saved — "hand-shaped pointer glove with a '1' player-number badge"
> (`context/pinterest-board.md`) — is exactly this: a white hand with a black **1** on the fist.

**[Inferred] Design implication for a single-player web clone:** you can legitimately either (a) draw
the **1** to be faithful, or (b) omit it. Faithful is better — the numeral is a large part of what
makes the shape read as "Wii" rather than "generic pointing hand".

---

## 5. States and animation

### 5.1 The two state axes

**[Decomp — code evidence]** `include/system/iplPointer.h`:

```cpp
enum { STATE_NORMAL = 0, STATE_SCROLL };          // drawn / not drawn
enum { TYPE_POINT = 0, TYPE_GRAB, TYPE_UNK2, TYPE_MAX };  // which hand layout
```

`STATE_*` is *not* a visual variant — it is a draw gate. `PointerCoreObject::draw()`:

```cpp
void PointerCoreObject::draw() {
    if (!mpLayout) return;                          // no IR lock → nothing drawn
    if (mState != Pointer::STATE_NORMAL) return;    // scrolling → hand hidden
    mpLayout->draw();
}
```

So when you hold **B** to scroll (§7), the hand **disappears entirely** and is replaced by the arrow
widget. Not dimmed, not faded — gone.

### 5.2 Idle / pointing

`TYPE_POINT`, `STATE_NORMAL`. The default and the initial value set in `PointerCore`'s constructor:

```cpp
PointerCore::PointerCore() : mCursors() {
    int chan = 0;
    for (int i = WPAD_MAX_CONTROLLERS - 1; i >= 0; i--) {
        mCursors[chan].changeType(Pointer::TYPE_POINT);
        mCursors[chan].setChan(chan);
        chan++;
    }
}
```

### 5.3 Hovering an interactive element — **the target changes, the cursor does not**

**[Decomp — code evidence]** Hover is dispatched through the GUI event system
(`include/layout/GUIManager.h`):

```cpp
enum { ON_TRIG = 0, ON_POINT, ON_LEFT, ON_MOVE, ON_DRAG, ON_RELEASE };
```

`ON_POINT` = pointer entered a pane, `ON_LEFT` = pointer left it. Every hover handler in the codebase
animates **the target**, plays a sound and rumbles — none of them touch the cursor. Representative
example, `src/scene/button/iplButton.cpp`:

```cpp
void OptOutButton::start_point_event(const char* paneName, controller::Interface* con) {
    if (strcmp(paneName, "B_Stop") == 0) {
        if (mbHovered == FALSE) {
            // Play hover in animation
            mpLayout->getAnim(ANIM_OPT_OUT_FOCUS_IN)->play();
            // Play nice sound
            snd::getSystem()->startSE("WIPL_SE_BT_TARGETTING");
            // Rumble!!... with no null check on `con`.
            con->rumble();
        }
        mbHovered++;
    }
}
```

Channel tiles do the same via `ChannelObj::onPoint()` → `setCursorAnim(1)`, which drives
`my_IplTop_d.brlyt` — **that is the selection *ring* drawn around a channel tile**, confusingly also
called "cursor" internally (`ANIM_CURSOR_FOCUS_ON / FOCUS_OFF / SELECT`). It is a completely separate
object from the hand. Don't conflate them.

**Conclusion:** **the hand cursor does not change on hover.** Hover feedback = target animation +
`WIPL_SE_*_TARGETTING` + a rumble pulse.

### 5.4 A-button press — **the finger does NOT curl.** Correcting the fan consensus.

`context/animations-interactions.md` §2 records, as fan consensus, that "on an A press the hand
pointer's index finger curls inward — a brief open-hand → pointing/curled-finger → open-hand cycle."

**[Decomp — code evidence] This does not happen in the Wii Menu.** Three independent lines of
evidence:

1. **No animations exist on the cursor layouts.** `Pointer::Pointer()` calls `finishBinding()`
   without a single `bind()` (§2). There is no `.brlan` attached to `P*_Def` or `P*_Cat`. The hand is
   a static image that can only be translated (`N_Trans`) and rotated (`N_Rot`).
2. **`changeType()` is called from exactly two places in the entire codebase**, and both are
   drag-related, not press-related:
   - `src/scene/channelSelect/iplChannelSelect.cpp` — `startDrag()` → `TYPE_GRAB`;
     `finishDrag()` → `TYPE_POINT` (channel reordering).
   - `src/scene/board/iplBoardObject.cpp` — `TYPE_GRAB` on pinch of a Message Board item,
     `TYPE_POINT` on release.
   A plain A-press (`BTN_INTERACT`) never changes the pose.
3. **`PointerCoreObject::calc()` reads nothing about buttons.** Its entire body is: pick the layout
   for `(chan, type)`, set `N_Trans` translate, set `N_Rot`/`N_SRot` rotation, `calc()`. No button
   state is consulted.

**What people are actually remembering** **[Inferred]** is almost certainly one of:
- the **grab pose** (§5.5) — a genuine open-finger → closed-fist swap, just triggered by A+B, not A;
- the **rumble pulse** on hover/press, which is tactile, not visual;
- the **target's** press animation (`_cntBtn_psh.brlan` etc. on buttons — `psh` = push);
- **other Wii software** — first-party games and later system software did animate their cursors. The
  System Menu specifically does not.

> **Recommendation for this project:** you are building a *feeling*, not a museum piece. A press
> animation is a nice web affordance and I would still implement one — but **know that it is an
> invention**, and if the goal is fidelity, the honest press feedback is *no cursor change at all*.
> Consider a very small scale-down (`scale(0.94)`, 60–80 ms) as a compromise: it reads as "click"
> without asserting a pose that never existed. Make it a flag.

### 5.5 Grab / drag (A + B held) — a real, distinct pose

**[Decomp — code evidence]** The A+B combination is a named constant,
`include/system/iplController.h`:

```cpp
BTN_INTERACT = REVO_BTN_A | CL_BTN_A,   /* 0x00100800 */
BTN_BACK     = REVO_BTN_B | CL_BTN_B,   /* 0x00400400 */
BTN_DRAG     = REVO_BTN_A | REVO_BTN_B, /* 0x00000C00 */
```

Grab start, `ChannelSelect::startDrag()`:

```cpp
System::getPointer()->changeType(con->getChannel(), Pointer::TYPE_GRAB);
mpMoveLytMask->getAnim(0)->play();
mpMoveLytObject->getAnim(0)->play();
getButton()->disableBtn();
...
snd::getSystem()->startSEwithPos("WIPL_SE_CH_HOLD", mDragPos.x);
mState = STATE_NORMAL_GRAB;
```

Grab end, `ChannelSelect::finishDrag()`:

```cpp
if (isReleasableArea(mMoveNewPage, mMoveNewIndex)) {
    ...
    snd::getSystem()->startSEwithPos("WIPL_SE_CH_SET", mDragPos.x);
    mState = STATE_NORMAL_MOVE_CHAN_IN;
} else {
    snd::getSystem()->startSEwithPos("WIPL_SE_CH_NOT_MOVE", mDragPos.x);
    mState = STATE_NORMAL_RELEASE_WAIT;
}
System::getPointer()->changeType(mConChan, Pointer::TYPE_POINT);
```

**The swap is instantaneous** — a layout switch, not a tween. The visual difference is exactly the
finger disappearing (§3.2). Also note the **positional audio**: `startSEwithPos(..., mDragPos.x)` pans
the sound to the cursor's horizontal position, and during the drag it holds a looping
`WIPL_SE_CH_DRAG` with pan *and* speed: `holdSEwithPosDis("WIPL_SE_CH_DRAG", pos.x, speed)`.

### 5.6 Off-screen / lost IR tracking — it vanishes instantly

**[Decomp — code evidence]** `PointerCoreObject::calc()` gates on IR validity:

```cpp
void PointerCoreObject::calc(Pointer* pointer, const controller::Interface* pController) {
    mpLayout = NULL;                                    // <-- default is "nothing"
    if (pController && pController->isValidDpd()) {
        mpLayout = pointer->get_layout(mChan, mLayoutType);
        ...
    }
}
```

If the DPD (IR) is invalid, `mpLayout` stays `NULL` and `draw()` returns immediately. **No fade, no
edge indicator, no ghost — the hand simply is not drawn that frame, and reappears the frame tracking
returns.** `isValidDpd()` for a Wii Remote is:

```cpp
bool Revolution::isValidDpd() const {
    return (unk_0x20->wpad_err == 0 || unk_0x20->wpad_err == -7) && unk_0x20->dpd_valid_fg != 0;
}
```

**[Official]** Nintendo's own troubleshooting page attributes cursor disappearance/jerkiness to being
outside 3–8 ft (1–3 m) of the sensor bar and to IR interference (sunlight, heaters, candles) —
consistent with "IR lock lost → cursor gone."

Edge behaviour is separate and is handled in the *position* pipeline, not the draw gate — see §6.4.

### 5.7 Global visibility

**[Decomp — code evidence]** `Pointer::setVisible(bool)` hides all four hands *and* the scroll arrow
at once. Scenes that hide it: `iplHealth.cpp` (Health & Safety screen), `iplBackMenu.cpp`,
`iplChannelTitle.cpp` (during channel boot), `iplLimitOver.cpp`. `System::warning_run()` force-shows
it for the duration of a system warning dialog and restores the previous value afterwards:

```cpp
// Force pointer to be visible, and push it's old state
bool isVisible = System::getPointer()->isVisible();
System::getPointer()->setVisible(true);
... loop ...
if (isVisible) System::getPointer()->setVisible(true);
else          System::getPointer()->setVisible(false);
```

**[Inferred]** Web analogue: the cursor should be hidden during full-screen transitions (channel
launch zoom, boot sequence) and force-shown for any modal dialog.

---

## 6. Position, rotation, smoothing

### 6.1 The full position pipeline

**[Decomp — code evidence]** Three stages.

**(a) KPAD → projection space.** `Revolution::getDpdProjectionPos()` in `src/system/iplController.cpp`:

```cpp
Vec2 src = {unk_0x20->pos.x, unk_0x20->pos.y};   // already-smoothed KPAD position
System::getProjectionRect(&nw4r_rect);
kpad_rect = { nw4r_rect.left, nw4r_rect.top, nw4r_rect.right, nw4r_rect.bottom };
KPADGetProjectionPos(&dest, &src, &kpad_rect, 1.10132f);
if (SCGetAspectRatio() == 1) { dest.x *= 1.15f; dest.y *= 1.15f; }
```

Two magic numbers worth stealing: **`1.10132f`** (the sensitivity/scale argument — the pointer
travels ~10 % *more* than the raw IR range, so you can reach the screen edges without aiming past the
sensor bar) and **`1.15f`** (an extra 15 % gain applied in **16:9** mode).

**(b) Edge clamp.** Immediately after, with a **100-unit overshoot allowance**:

```cpp
// regswap
if      (nw4r_rect.left   - 100.0f > dest.x) dest.x = nw4r_rect.left;
else if (nw4r_rect.right  + 100.0f < dest.x) dest.x = nw4r_rect.right;
else if (nw4r_rect.top    - 100.0f > dest.y) dest.y = nw4r_rect.top;
else if (nw4r_rect.bottom + 100.0f < dest.y) dest.y = nw4r_rect.bottom;
```

So the hand is **allowed to drift up to 100 layout units past the screen edge** (≈16 % of the 608-unit
4:3 width — a lot) before it is snapped back onto the border. This is why the Wii cursor feels like it
"leans off the edge" rather than being hard-walled.

*(The decomp marks this block `// regswap`, meaning the exact instruction ordering is a
reconstruction; the else-if chaining may not be literal. Treat the 100-unit tolerance as solid, the
axis-independence as slightly uncertain.)*

**(c) Layout space.** `utility::get_cursor_pos()` in `src/utility/iplUtility.cpp`:

```cpp
math::VEC2 get_cursor_pos(const math::VEC2& basePos) {
    nw4r::ut::Rect rect16x9; System::getProjectionRect(&rect16x9);      // aspect-dependent
    nw4r::ut::Rect rect4x3;  System::getProjectionRect4x3(&rect4x3);    // always 608 wide
    return math::VEC2(basePos.x * (rect4x3.GetWidth() / rect16x9.GetWidth()), -basePos.y);
}
```

Two things: an **aspect compensation** on X (× 1.0 in 4:3, × 608/832 = **0.7308** in 16:9) and a **Y
axis flip** (KPAD is Y-down, nw4r lyt is Y-up).

Screen rects (`src/system/iplSystem.cpp`):

```cpp
void System::getProjectionRect4x3 (nw4r::ut::Rect* r) { r->left=-304; r->right=304; r->bottom=228; r->top=-228; }
void System::getProjectionRect16x9(nw4r::ut::Rect* r) { r->left=-416; r->right=416; r->bottom=228; r->top=-228; }
```

**The Wii Menu's layout space is 608 × 456 (4:3) or 832 × 456 (16:9), origin centred.** Every measured
pixel figure in §3 is in those units.

### 6.2 Smoothing — Nintendo used the KPAD library defaults

**[Decomp — code evidence]** `KPADStatus` (`libs/RVL_SDK/include/revolution/kpad.h`) already carries
*filtered* values plus their derivatives:

```c
Vec2 pos;        // 0x20   smoothed pointer position
Vec2 vec;        // 0x28   velocity
f32  speed;      // 0x30
Vec2 horizon;    // 0x34   smoothed roll/horizon vector
Vec2 hori_vec;   // 0x3C
f32  hori_speed; // 0x44
f32  dist, dist_vec, dist_speed;
Vec2 acc_vertical;
```

The tuning entry point is `void KPADSetPosParam(s32 chan, f32 x, f32 y);`. A repo-wide GitHub code
search for `KPADSetPosParam` in `koopthekoopa/wii-ipl` returns **only the SDK header declaration — no
call site anywhere in the System Menu.** Likewise there is no `KPADSetHoriParam` call.

**Conclusion [Decomp + Inferred]: the Wii Menu does not tune pointer smoothing at all — it consumes
`KPADStatus.pos` with the library's stock filter.** The System Menu adds **zero** additional
smoothing of its own: `PointerCoreObject::calc()` writes `get_cursor_pos(getDpdProjectionPos())`
straight into `N_Trans` every frame.

So the smoothing everyone remembers is **entirely inside KPAD**, whose implementation is not in this
repo. For the actual algorithm shape we fall back to [Fan/community] WiiBrew
(https://wiibrew.org/wiki/Wiimote/Pointing):

- **Dragging-circle smoothing**, quoted verbatim: *"The software will draw an imaginary circle around
  the new pointing position. If the cursor is outside of this circle, it will immediately drag it to
  lie within this circle. However, if the cursor is already within the circle, it will move it towards
  the circle's center at a speed proportional to the distance from the center."* **WiiBrew gives no
  radius value.**
- **Velocity-adaptive smoothing** (the alternative it names): smooth *more* when the remote moves
  slowly (kills hand tremor while you hold on a target), *less* when it moves fast (keeps flicks
  responsive). Again, no parameters published.

**[Inferred] Web translation.** Both descriptions are the same family. A dragging-circle
implementation is ~8 lines and feels more "Wii" than a plain lerp because it has a dead-ish zone:

```js
// r = circle radius in px; k = ease factor inside the circle
function draggingCircle(cur, target, r, k) {
  const dx = target.x - cur.x, dy = target.y - cur.y;
  const d = Math.hypot(dx, dy);
  if (d === 0) return cur;
  if (d > r) {                              // outside: snap to the circle's rim
    const t = (d - r) / d;
    return { x: cur.x + dx * t, y: cur.y + dy * t };
  }
  return { x: cur.x + dx * k, y: cur.y + dy * k };  // inside: ease toward centre
}
```

Suggested starting values for a 1080p viewport: `r ≈ 6–10` px, `k ≈ 0.18–0.25` per frame at 60 fps.
Make `k` frame-rate independent (§12). A plain exponential lerp (`pos += (target - pos) * 0.25`) is a
perfectly good simpler substitute and is what `animations-interactions.md` already recommends.

### 6.3 Rotation / tilt — the signature behaviour

**[Decomp — code evidence]** `src/system/iplPointerCore.cpp`, verbatim, the whole of it:

```cpp
// Rotation
math::VEC2 cursorHorizon(pController->getHorizon());
math::VEC3 cursorRotateVec(0.f, 0.f, nw4r::math::Atan2Deg(-cursorHorizon.y, cursorHorizon.x));
nw4r::lyt::Pane* pRotatePane       = mpLayout->FindPaneByName("N_Rot");
nw4r::lyt::Pane* pRotateShadowPane = mpLayout->FindPaneByName("N_SRot");

pRotatePane->SetRotate(cursorRotateVec);
pRotateShadowPane->SetRotate(cursorRotateVec);
```

So: **`angle_degrees = atan2(-horizon.y, horizon.x)`**, applied as a Z rotation to both the hand and
its shadow. `horizon` is `KPADStatus.horizon` — the accelerometer-derived, KPAD-smoothed "which way is
up" unit vector.

**There is no clamping and no additional smoothing.** The clamp/filter is whatever KPAD already did to
`horizon`. A Remote rolled 90° gives a hand rolled 90°; a Remote pointed straight down gives a hand
pointing down — which is exactly what **[Official]** Nintendo Support says you should see when the
Remote works correctly.

**The resting-tilt constant — a genuinely useful find.** When a **Classic Controller** is used (no IR,
no meaningful roll), `Classic::getHorizon()` returns a hard-coded fallback:

```cpp
math::VEC2 Classic::getHorizon() const {
    if (Revolution::isValidDpd()) { ret.set(unk_0x20->horizon.x, unk_0x20->horizon.y); return ret; }
    else { return math::VEC2(1.0f, -0.2679492f); }
}
```

`atan2(0.2679492, 1.0)` = **exactly 15.000°** (tan 15° = 0.26794919…). **Nintendo's chosen "neutral"
cursor tilt, when there is no roll data to read, is 15 degrees.** That is a strong, citable answer to
"what angle should a mouse-driven Wii cursor sit at?" — see §11.

**[Inferred]** Sign/direction: `get_cursor_pos` flips Y so the layout space is Y-up; under the
standard convention a positive Z rotation in a Y-up space is **counter-clockwise**, i.e. the fingertip
leans **left**. I am ~80 % confident in that direction — the magnitude (15°) is certain, the sign is
derived rather than observed. If it looks wrong on screen, negate it.

**[Inferred]** Pivot: `N_Trans` is set to the pointer position and `N_Rot` is a descendant pane, so
rotation happens about the pane origin, which must coincide with the point-of-aim — otherwise rolling
the Remote would move where you're aiming, which it demonstrably does not. **Rotate about the
fingertip.** (The exact pane offsets are inside `cursor.ash`; not recoverable here.)

### 6.4 Lost-dot estimation

**[Fan/community]** WiiBrew: when one of the two sensor-bar dots is occluded, the reference algorithm
keeps the last known dot-to-dot distance and reconstructs the missing dot's position from the
accelerometer angle. This is why a partially-occluded pointer *hunts* and jitters rather than cleanly
vanishing. Nintendo's own KPAD presumably does something equivalent (it exposes `dist`, `dist_vec`,
`dist_speed`). No web analogue; flavour only.

---

## 7. The B-scroll arrow (not a hand, but part of `Pointer`)

**[Decomp — code evidence]** Holding **B** on a scrollable surface hides the hand and draws a
stretchy arrow instead. `Pointer::calc()`:

```cpp
if (mScrollState >= SCROLL) {
    nw4r::lyt::Pane* pRootPane   = mpLayout[LYT_SCROLLER_ID]->FindPaneByName("N_BArw");
    nw4r::lyt::Pane* pLengthPane = mpLayout[LYT_SCROLLER_ID]->FindPaneByName("W_BArw");
    nw4r::lyt::Pane* pOriginPane = mpLayout[LYT_SCROLLER_ID]->FindPaneByName("BArwBase");

    pRootPane->SetTranslate(mOriginPos);
    pOriginPane->SetTranslate(mOriginPos);

    nw4r::lyt::Size arrowSize = pLengthPane->GetSize();
    arrowSize.height = IPL_MATH_CLAMP(mArrowLength, MIN_LENGTH, MAX_LENGTH);  // 32 .. 128
    pLengthPane->SetSize(arrowSize);

    // Y Scale:  1.0 = Down     Y Scale: -1.0 = Up
    f32 arrowDirection = (mPointDirection == POINT_DOWN) ? 1.0f : -1.0f;
    pRootPane->SetScale(math::VEC2(1.0f, arrowDirection));

    pRootPane  ->SetVisible(mbCursorScrolling);
    pOriginPane->SetVisible(!mbCursorScrolling);
}
```

Behaviour: press B → the cursor's current position becomes a **fixed anchor** (`setOrigin`,
`BArwBase` shown); drag away from it → an arrow (`N_BArw`) grows from the anchor toward the drag,
**length clamped 32–128 units**, **flipped vertically** for up vs down, and scroll speed follows the
arrow length. Driven by `ipl::utility::BScroller` in `src/utility/iplUtility.cpp`, which also emits a
ratcheting `WIPL_SE_B_SCROLL` tick every 128 units of accumulated scroll.

**[Inferred]** Worth building only if the clone gets a scrollable surface (Message Board, settings).
The channel grid pages with +/− and the arrows, not with B-scroll.

---

## 8. Size on screen

**[Asset + Decomp — derived]** Hand artwork **43 × 62** layout units; screen **608 × 456** (4:3) or
**832 × 456** (16:9).

| Metric | 4:3 | 16:9 |
|---|---|---|
| width as % of screen width | 43/608 = **7.07 %** | 43/832 = **5.17 %** |
| height as % of screen height | 62/456 = **13.60 %** | **13.60 %** |

Because a 16:9 screen is 4/3 wider for the same height, the hand's **physical** size is effectively
identical in both modes (6.9 % vs 7.1 % of the physical screen width). The aspect-independent way to
state it, and the one to use on the web:

> **Cursor height ≈ 13.6 % of viewport height; width ≈ 9.4 % of viewport height (43/456).**
> Aspect ratio of the artwork = 43 : 62 ≈ **0.694**.

On a 1920 × 1080 browser window that is **≈ 102 × 147 CSS px**. That is *large* — and it is the single
fact that decides the Part B implementation (§10.3): **it is above every browser's `cursor: url()`
size cap.**

**Does it scale?** **[Decomp]** Nothing in `Pointer`/`PointerCore` ever calls `SetScale` on a hand
pane — only the scroll arrow gets a `SetScale`, and only to flip it. **[Inferred]** The Wii rendered at
a fixed 480p-class resolution, so a fixed layout-unit size *was* a fixed fraction of the screen.
On the web, scaling with `vh` reproduces that; scaling with a fixed `px` does not. **Use `vh`, and
clamp it** — 13.6 vh on a 2160-tall display is a 294 px hand, which is comical. `clamp(72px, 13.6vh, 160px)`
for the height is a sane compromise **[Inferred]**.

---

## 9. Multiple cursors

**[Decomp — code evidence]** Four, always allocated, always calculated:

```cpp
void PointerCore::calc(Pointer* pointer) {
    for (int i = 0; i < WPAD_MAX_CONTROLLERS; i++)
        mCursors[i].calc(pointer, System::getController(i));
}

void PointerCore::draw() {
    layout::Object::setDefaultCamera();
    for (int i = WPAD_MAX_CONTROLLERS - 1; i >= 0; i--)   // note: reverse order
        mCursors[i].draw();
}
```

- Each channel's cursor draws only if that channel has a controller with valid IR — so unconnected
  Remotes cost nothing visually.
- **Draw order is reversed (3 → 0), so player 1's hand is drawn *last* and therefore sits on top.**
- Differentiation is **the numeral only** (§4.3).
- Grab type is per-channel: `changeType(int chan, int type)`. Two players can be dragging
  simultaneously, each with their own pose.
- The scroll arrow is a **single shared instance** on `Pointer`, not per-channel — `BScroller` grabs
  one channel (`mState = chan`) and only that player scrolls.

**[Inferred]** For the web clone this is almost certainly out of scope, but it is a cute idea: a
"local multiplayer" mode where extra cursors are driven by e.g. a WebSocket, or a demo cursor that
idles. If you build it, keep `zIndex` descending with player number.

---

## 10. Sound and rumble

### 10.1 Movement is silent — confirmed

**[Decomp — code evidence]** `include/sound/IplSound.rsid` in the decomp is a **complete generated
list of every sound ID in `IplSound.brsar`** — 90 entries. There is **no** `WIPL_SE_POINTER_*`,
`WIPL_SE_CURSOR_MOVE` or anything equivalent. Neither `Pointer`, `PointerCore` nor `PointerCoreObject`
contains a single `startSE` call.

This **corroborates `context/audio.md` §2 conclusively**: *plain cursor motion is silent.* Upgrade
that from "treat as silent unless better evidence surfaces" to **confirmed**.

### 10.2 Hover does blip — confirmed, and now with exact names

**[Decomp — code evidence]** Two distinct hover/"targeting" effects, fired from `ON_POINT`:

| ID | Fired by | Meaning |
|---|---|---|
| `WIPL_SE_BT_TARGETTING` (34) | `src/scene/button/iplButton.cpp` | pointer enters a **button** |
| `WIPL_SE_CH_TARGETTING` (35) | `src/scene/channelSelect/iplChannelSelect.cpp` | pointer enters a **channel tile** |

Two separate IDs for two kinds of target — worth mirroring in the web audio layer.
`context/audio.md` §3's "light metallic click/blip on focus" is confirmed; the naming Nintendo used is
"**targetting**" (their spelling, two Ts).

Other cursor-adjacent IDs from the same list: `WIPL_SE_CH_SELECT` (32), `WIPL_SE_CH_UNSELECT` (33),
`WIPL_SE_DECIDE` (36), `WIPL_SE_CH_HOLD` (62), `WIPL_SE_CH_DRAG` (63), `WIPL_SE_CH_SET` (64),
`WIPL_SE_CH_NOT_MOVE` (65), `WIPL_SE_B_SCROLL` (67), `WIPL_SE_BT_PUSH` (46), `WIPL_SE_CANCEL` (47),
`WIPL_SE_ERROR` (53), `WIPL_SE_GRAY_BUTTON` (57).

### 10.3 Rumble on hover — a detail worth knowing

**[Decomp — code evidence]** `controller::Base::read()` in `src/system/iplController.cpp`:

```cpp
const f32 lbl_8160D2C0[] = {0.2, 0.3, 0, 0};
...
u32 time = OSTicksToMilliseconds(OSGetTick() - mLastRumbleTime);
f32 f1 = (f32)time / 1000.0f;
if      (f1 < 7.0f / 120.0f)        WPADControlMotor(mChan, 1);   // motor ON for 58.3 ms
else if (f1 < lbl_8160D2C0[mRumbleType]) WPADControlMotor(mChan, 0);
```

A hover rumble is a **58.3 ms (7/120 s) motor pulse**, with a 200 ms or 300 ms lockout depending on
type. **[Inferred]** No web equivalent on desktop; the Gamepad Haptics API only applies to connected
gamepads. Mentioned because it explains why Wii hover *felt* like more than a blip.

---

## 11. Asset availability (and why you should still draw your own)

| Source | What's there | Notes |
|---|---|---|
| **The Spriters Resource — Wii Menu → "Pointer"** <br>https://www.spriters-resource.com/wii/wiimenu/asset/167191/ | The genuine ripped atlas: 2 hand poses + 2 shadow silhouettes + 4 numeral overlays, 129 × 259 PNG | The best reference. Direct image: `https://www.spriters-resource.com/media/assets/164/167191.png` (needs a normal browser `User-Agent`; the site 403s bare fetchers). The whole Wii Menu category is at https://www.spriters-resource.com/wii/wiimenu/ |
| **`koopthekoopa/wii-ipl`** <br>https://github.com/koopthekoopa/wii-ipl | **No assets at all** — README states it "does **not** contain any assets or assembly of the executable whatsoever" | Code/behaviour only. Which is what makes it safe to cite freely. |
| **Wii Pointer Cursors (primmr)** <br>https://primmr.dev/projects/wii-pointer-cursors/ | Desktop cursor pack | Cited in `animations-interactions.md`; the site refused connection during this pass — unverified. |
| **rw-designer / custom-cursor.com** <br>https://www.rw-designer.com/cursor-set/wii-cursor-by-stefano-tinaglia · https://custom-cursor.com/en/collection/games/nintendo-wii-hand | Fan `.cur`/`.ani` packs | Fan redraws of varying accuracy; the "idle/busy variants" they list are Windows cursor-role conventions, **not** Wii states. Do not treat their state list as evidence about the Wii. |

> **Recommendation — draw your own SVG.** The shape is simple (one fist outline, one finger, one
> numeral, one gradient) and §3 gives you every measurement needed to redraw it faithfully. Shipping
> Nintendo's ripped texture in a public repo is both a legal risk and unnecessary. Use the rip on
> screen, beside your SVG, as a visual diff target — never in `src/`.
>
> **Redraw spec, ready to use** (viewBox `0 0 43 62`, matching the measured artwork exactly):
> - fingertip apex at `(12.5, 0)` — **this is the hotspot**
> - index finger: vertical column x `6→19`, y `0→19`, rounded cap
> - knuckles appear at y20 (to x25), y22 (to x32), y24 (to x39)
> - widest point y36–44, x `0→42`; thumb bump on the left at x0
> - bottom edge y62, x `13→34`
> - fill `#FFF`; stroke `#000` at `stroke-width: 6` centred (≈3 px visible each side)
> - numeral: black, glyph box centred at `(22.5, 41)`, cap height `17`
> - bottom shading: linear gradient `#FFF → #BBB` over y `39→62`, multiply
> - grab pose: identical, minus the finger, `viewBox 0 0 43 43` (bottom-aligned)

---

# PART B — Implementing a custom cursor on the web

## 12.1 Approach A — `cursor: url()`

**[Official/MDN]** Syntax (https://developer.mozilla.org/en-US/docs/Web/CSS/cursor):

```css
cursor: url("hand.png") 12 0, auto;
```

```
<cursor-image> = [<url> | <url-set>] <number>{2}?
```

- The two numbers are the **hotspot**, in *image pixels*, **relative to the image's top-left corner**,
  clamped to the image bounds. If omitted, read from the file (`.cur`) or defaulting to top-left.
  For our hand: `12 0`.
- **A keyword fallback at the end is mandatory.** `cursor: url(x.png);` is *invalid* and the whole
  declaration is dropped. `cursor: url(a.svg), url(b.png) 4 4, auto;` is valid — the list is tried in
  order.
- **Formats:** MDN, quoting the spec — *"User agents are required by the specification to support PNG
  files, SVG v1.1 files in secure static mode that contain a natural size, and any other non-animated
  image file formats that they support for images in other properties. Desktop browsers also broadly
  support the `.cur` file format."* Animated SVG is a *should*, not a *must*.
- **`url()` support** (MDN BCD `css/properties/cursor.json`): Chrome 1, Edge 12, Firefox 1.5 (macOS
  from Firefox 4), Safari 3, **Safari iOS 13.4**. The **`x y` positioning syntax** is separately
  tracked and is **`false` on Safari iOS** — "If this value is used, the iPad will display the
  `default` pointer instead."
- **SVG cursors are the inconsistent part.** MDN documents the requirement, and Chromium's code
  explicitly branches on `image->IsSVGImage()` (it rasterises SVG against the OS's system-cursor size
  and *skips* the device-scale multiplier for SVG). But BCD does not track an `svg` subfeature for
  `cursor`, so there is no per-version support table to cite. **[Inferred]** Treat SVG cursors as
  "works in Firefox and Chromium, do not rely on it in Safari" and always list a PNG before the
  keyword fallback.

### The size caps — the numbers, from engine source

This is the part that kills Approach A for this project.

| Engine | Constant | Behaviour |
|---|---|---|
| **Chromium/Blink** | `kMaximumCursorDIPSize = 128` in `ui/base/cursor/cursor.cc` (`Cursor::AreDimensionsValidForWeb`) | Anything **> 128 × 128 DIP** is rejected and the declaration is skipped — silently, moving to the next item in the cursor list. |
| **Chromium/Blink** | `kMaximumCursorSizeWithoutFallback = 32` in `third_party/blink/renderer/core/input/event_handler.cc` | For cursors **> 32 DIP** in either dimension, Blink additionally computes the cursor's rect and **drops it entirely if it is not fully contained in the visual viewport**. The comment: *"For large cursors below the max size, limit their ability to cover UI elements by removing them when they are not fully contained by the visual viewport."* |
| **WebKit** | `const int maximumCursorSize = 128;` in `Source/WebCore/page/EventHandler.cpp` | *"Limit the size of cursors (in UI pixels) so that they cannot be used to cover UI elements in chrome."* — over 128 → `continue` (skip this cursor). **And WebKit applies the containment check to *every* url() cursor regardless of size:** `if (!visibleContentRect.contains(cursorRect)) continue;` |
| **Firefox** | — | MDN: *"on Firefox and Chromium cursor images are restricted to 128x128 pixels by default, but it is recommended to limit the cursor image size to 32x32 pixels."* |

Also from Blink: `static constexpr base::TimeDelta kCursorUpdateInterval = base::Milliseconds(20);`
— *"Set to 50Hz, no need to be faster than common screen refresh rate."* **Native cursor-shape updates
are throttled to 50 Hz**, so a `cursor: url()` that swaps images on state change has up to 20 ms of
built-in latency. And Chromium multiplies custom cursors by `cursor_accessibility_scale_factor_` — an
**OS accessibility "large cursor" setting can push a legal 100 px cursor over the 128 cap and make it
vanish for exactly the users who most need to see it.**

**Verdict on Approach A.** The authentic cursor is ~102 × 147 CSS px at 1080p (§8). That is over the
128 cap on height, so it would be **silently ignored** in Chromium *and* WebKit. Even shrunk to fit,
anything over 32 px vanishes near the window edges in both engines. And rotation is impossible — you
would need a pre-rendered image per angle. **`cursor: url()` cannot do what this project wants.**

*(Where it **is** the right tool: a small, static, non-rotating cursor ≤ 32 × 32. If you want a
low-cost "Wii flavour" fallback, ship a 32 × 32 PNG of the hand for reduced-motion / low-power users —
see §12.6.)*

## 12.2 Approach B — `cursor: none` + a DOM element that follows the pointer

```css
html.wii-cursor, html.wii-cursor * { cursor: none; }
```

**[Official/MDN]** `cursor: none` — Chrome 5, Edge 12, Firefox 3, Safari 5. **Not supported on Safari
iOS** (BCD: `safari_ios: false`). Note the `, * ` — `cursor` inherits, but any element that sets its
own `cursor` (`pointer`, `text`, a library's `grab`) will override it, so you need the universal
selector or you get a native cursor flickering back on buttons and inputs.

### Why naive versions feel laggy, and the fixes

1. **Animating `top`/`left`.** These are layout properties: every mousemove triggers layout →
   paint → composite for the whole document. Use `transform: translate3d(x, y, 0)` — a
   compositor-only property. This is the single biggest win.
2. **Writing to the DOM inside the event handler.** `pointermove` fires *"at a very high rate"*
   (MDN) — on a 1000 Hz mouse that can be far more often than you paint. Worse, mixing a style write
   with any read (`getBoundingClientRect`, `offsetWidth`) in the same handler causes forced synchronous
   layout ("layout thrash"). **Store the coordinates in a ref in the handler; write the transform in a
   `requestAnimationFrame` loop.** One write per frame, always aligned with paint.
3. **React state.** Never put cursor coordinates in `useState` — that is a full render tree
   reconciliation per mouse move. Use `useRef` + direct `el.style.transform`.
4. **`will-change: transform`.** Promotes the element to its own compositor layer up front, so the
   browser doesn't re-promote/demote it. Set it once on a permanently-visible element (this is the
   textbook legitimate use; the usual "don't overuse `will-change`" warning is about applying it to
   many elements).
5. **The smoothing is a feature here.** Because we *want* Wii-style lag (§6.2), the rAF loop isn't a
   compromise — the interpolation is the point.

### `pointermove` vs `mousemove`

**Use `pointermove`.** **[Official/MDN]** It is Baseline / widely available since July 2020, unifies
mouse/pen/touch, and gives you `event.pointerType` so you can *ignore touch* in one line:

```js
if (e.pointerType === 'touch') return;
```

That alone justifies it. `mousemove` on a touchscreen fires synthesised events after a tap, which
makes a custom cursor teleport around on mobile.

Two extras worth knowing:
- **`event.getCoalescedEvents()`** returns the sub-frame samples the browser merged into this event.
  Useful for drawing apps; **not** useful here — we only want the latest position.
- **`setPointerCapture()`** — relevant if you build channel drag-and-drop, so the drag keeps receiving
  events when the pointer leaves the element.

### Leaving and entering the window

Handle three cases:

| Event | Meaning | Do |
|---|---|---|
| `pointerleave` / `mouseleave` on `document.documentElement` | pointer left the viewport | hide the cursor element (`opacity: 0`) |
| `pointerenter` / `mouseover` | pointer came back | **snap** position (skip the smoothing for one frame) then show — otherwise the hand visibly flies in from wherever it was |
| `blur` on `window` | tab/window lost focus (alt-tab, devtools) | hide |

Also `document.visibilitychange` → hide and **stop the rAF loop** when hidden (browsers throttle rAF
in background tabs anyway, but stopping it is cleaner).

**[Inferred]** Nice touch of authenticity: the real cursor *vanishes instantly* when IR tracking is
lost (§5.6). So `opacity: 0` with **no** transition on leave is actually *more* faithful than a fade.

### `pointer-events: none`

Mandatory. Without it the cursor element sits under the physical pointer and swallows every click,
hover and `:hover` style on the page. It also breaks `document.elementFromPoint`. Add it to the
cursor element **and** any child.

## 12.3 Which approach — recommendation

**Use Approach B (`cursor: none` + DOM follower), unconditionally, for this project.**

Reasoning, against the three stated requirements:

| Requirement | `cursor: url()` | DOM follower |
|---|---|---|
| **(a) fairly large** (~102 × 147 px) | **Impossible.** Over the 128 cap in Chromium and WebKit → silently ignored. Even under it, >32 px cursors are dropped near viewport edges in both engines. | Unlimited. |
| **(b) possibly rotate** | **Impossible** without pre-rendering N images and swapping — and shape swaps are throttled to 50 Hz. | `transform: rotate()` on the compositor, free. |
| **(c) change state on press** | Possible (`:active { cursor: url(fist.png) }`) but with up to 20 ms latency and a decode hitch on first use. | Instant, and animatable. |

Secondary wins for B: you get the **smoothing/lag** (§6.2) which is a defining characteristic and is
flatly impossible with `cursor: url()`; you get the **rotating drop shadow** (§3.4) as a real layer;
and you can render the **player numeral** as live text rather than four PNGs.

The cost is everything in §12.6 (accessibility) and §12.9 (pitfalls). Budget for those — they are not
optional extras.

**Hybrid worth considering [Inferred]:** ship a 32 × 32 `cursor: url()` hand as the *fallback* for the
cases where the DOM cursor is disabled (reduced motion, user toggle off, low-end device). It stays
under every cap, needs no JS, and still reads as "Wii".

## 12.4 Rotation on the web — the options, with trade-offs

The real trigger (Wii Remote roll, §6.3) **has no mouse equivalent**. There is no way to recover it.
So this is a design decision, and the project has to make it. Four defensible options:

**Option 1 — Fixed 15° tilt (recommended default).**
Set `rotate(15deg)` (counter-clockwise, fingertip leaning left) and never change it.
- *For:* It is **Nintendo's own number** — the hard-coded `Classic::getHorizon()` fallback used when
  there is no roll data, which is exactly our situation (§6.3). It is not an invention; it is the
  documented "no roll available" answer.
- *For:* Zero cost, zero motion, immune to `prefers-reduced-motion` concerns, deterministic for
  screenshot tests.
- *Against:* Loses the liveliness people remember.

**Option 2 — Velocity/direction-driven tilt.**
Map horizontal (or full 2D) pointer velocity to an angle, e.g.
`angle = clamp(vx * k, -25, 25)`, smoothed, with a spring back to 15° at rest.
- *For:* Reads as physical and playful; genuinely feels Wii-like in motion.
- *Against:* **It is an invention.** The real cursor's angle is completely independent of where the
  pointer is going — you can roll the Remote while holding still, and sweep across the screen with
  zero roll. This can read as *wrong* to someone who remembers the console.
- *Against:* Needs careful damping or it wobbles; needs a `prefers-reduced-motion` opt-out.
- *If you take it:* keep the range small (±15–25° around a 15° rest), smooth the angle with the same
  lerp as position, and treat it as a stylistic flourish, not a recreation.

**Option 3 — No rotation (0°).**
- *For:* Simplest; matches the raw sprite as authored.
- *Against:* The Wii cursor is *never* seen at a perfect 0° in practice (nobody holds a Remote
  perfectly level), so a bolt-upright hand actually looks less authentic than the tilted one.

**Option 4 — Device orientation on mobile.**
`DeviceOrientationEvent.gamma` is a literal roll angle. Faithful in spirit!
- *Against:* Mobile has no cursor at all (§12.7), requires a permission prompt on iOS
  (`DeviceOrientationEvent.requestPermission()`), and is a solution looking for a problem. Mention it
  only as a possible easter egg on a "point at the screen" demo page.

**My recommendation:** ship **Option 1** as the default (15°, static, honest, cheap), and put
**Option 2** behind a settings toggle labelled as a stylistic extra. Do not do Option 3.

## 12.5 Press state

```js
const onDown = (e) => { if (e.button === 0) pressRef.current = true;  };
const onUp   = ()  => { pressRef.current = false; };
window.addEventListener('pointerdown', onDown);
window.addEventListener('pointerup',   onUp);
window.addEventListener('pointercancel', onUp);   // don't forget this one
```

Keeping it responsive:
- Listen on `window` (capture phase optional) so a `stopPropagation()` deep in the tree can't
  swallow it, and so `pointerup` outside the original element still resets the pose.
- **Do not** route it through React state if you can avoid it — flip a class or a CSS custom property
  directly on the element inside the rAF loop. A `useState` round-trip adds a render before the visual
  change.
- **Apply the pose change immediately, not on the smoothed position.** Position lags (deliberately);
  the pose must not.
- `pointercancel` matters: on a trackpad-with-touch or when the browser takes over the gesture, you
  get `pointercancel` and never a `pointerup`, leaving the cursor stuck in the pressed pose.

What the pose *should* be — see §5.4. Authentic answer: **nothing changes on plain click**; the fist
is for **A+B drag**. If you want click feedback anyway, prefer `scale(0.94)` for 70 ms over a pose
swap, and reserve the fist for actual drags (`pointerdown` + movement over a channel tile).

## 12.6 Accessibility and UX — the honest version

This is where custom cursors earn their bad reputation. Be straight about it:

**A custom cursor is a genuine accessibility regression, and there is no way to make it a neutral
one.** The mitigations below reduce the harm; they do not eliminate it.

1. **Users depend on the native cursor.** Operating systems let people enlarge the pointer, invert it,
   change its colour, add a locator ring, or use high-contrast pointer themes — precisely because
   pointer visibility is a real access need. `cursor: none` **overrides every one of those settings**.
   A user who has set a 3× black-on-white pointer in Windows Ease of Access gets your 100 px white
   glove instead. Chromium's `cursor_accessibility_scale_factor_` exists specifically to honour that
   OS setting for `cursor: url()`; a DOM follower bypasses it entirely.
   *Note also:* people with motor impairments often move the pointer in small corrective increments —
   **and our smoothing (§6.2) actively fights that.** Lag that reads as charming to one user reads as
   "the computer is not responding to me" to another. This is the strongest argument for §12.6.6.
2. **`prefers-reduced-motion`.** The smoothing/lag *is* motion — an element moving independently of
   the user's input is exactly the class of thing the query is for. Under
   `@media (prefers-reduced-motion: reduce)`, drop the interpolation to 1:1 (`k = 1`), disable any
   velocity-driven rotation, and disable press animations. **[Inferred]** Also consider treating
   reduced-motion as a signal to fall back to the native cursor entirely — it is a reasonable, and
   defensible, reading.
   Docs: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
3. **Visibility against all backgrounds.** The Wii's own solution is the ~3 px black outline plus a
   drop shadow (§3.3, §3.4) — that is *why* it is drawn that way. Keep both. Do not "modernise" the
   cursor into a thin-stroked or flat-white shape; it will disappear over the light-blue Wii Menu
   gradient. If you add a dark theme, verify against the darkest surface too — a white hand on a black
   background loses its shadow and needs the outline to carry it.
4. **Don't break text selection.** `cursor: none` on `*` also kills the I-beam, so users lose the
   affordance that tells them text is selectable. Options: swap the hand for a Wii-styled I-beam over
   text, or (simpler and safer) **exempt text-bearing regions**: `:where(input, textarea, [contenteditable]) { cursor: auto; }`
   and hide the DOM cursor while over them.
5. **Don't break form inputs or focus indicators.** Forms need their native cursors (text, pointer,
   `not-allowed` on disabled controls). And `pointer-events: none` is *not* enough on its own — make
   sure the cursor element is not focusable (`tabindex="-1"` is unnecessary if it's a plain `div`, but
   do add `aria-hidden="true"` so screen readers never announce it) and that it does not sit above a
   focus ring in a way that obscures it. Keyboard users get no cursor at all, which is correct — but
   make sure the cursor doesn't reappear at a stale position on the next keystroke.
6. **Provide an escape hatch. Yes, this is best practice.** A visible, persistent toggle ("Use normal
   cursor") that restores the native pointer, remembered in `localStorage`. Reasons: it costs almost
   nothing; it is the only genuine mitigation for points 1 and 4; and it turns an imposed change into
   a choice. Put it somewhere thematically appropriate (a Wii Settings-style panel) so it doesn't
   spoil the aesthetic. **[Inferred]** Default the toggle **on** (Wii cursor) — the whole point of the
   site — but honour `prefers-reduced-motion` as an automatic opt-out on first visit.
7. **Never hide the cursor without replacing it.** If the JS fails to load or throws, `cursor: none`
   applied from a stylesheet leaves the user with *no pointer at all*. **Apply `cursor: none` from
   JavaScript** (add a class to `<html>` in the effect), so the CSS-only state is always the native
   cursor. This is a genuine "site is unusable" failure mode and it is trivially avoidable.

## 12.7 Touch devices

There is no cursor on a touchscreen, and rendering one is actively harmful (it appears where the last
tap was, lags behind scrolls, and covers content).

**Detect capability, not device.** Use media queries, not user-agent sniffing:

```js
// true for mouse/trackpad/pen: a pointing device that can hover accurately
const hasFinePointer = window.matchMedia('(any-pointer: fine) and (any-hover: hover)').matches;
```

- `(pointer: coarse)` — the *primary* input is imprecise (finger).
- `(any-pointer: fine)` — *some* input is precise. Important for hybrids: a Surface or an iPad with a
  trackpad should get the cursor when the mouse is used.
- Best of all: **decide per event.** `pointermove` gives you `e.pointerType`; enable the cursor on the
  first `pointerType === 'mouse' | 'pen'` event and hide it on the first `'touch'`. That handles a
  laptop with a touchscreen correctly, in both directions, with no guessing.

Degradation is then trivially correct: never apply `cursor: none`, never mount the element, never
start the rAF loop. Note also **`cursor: none` is unsupported on Safari iOS** (BCD), so even the CSS
half would silently no-op there — but relying on that is not a plan.

## 12.8 Performance

The cost of a per-frame-updated element is small **if** it is confined to the compositor:

- **One rAF loop, one element, one `style.transform` write per frame.** That is a compositor-thread
  transform update — no layout, no paint. Budget: well under 0.1 ms/frame.
- **Keep the cursor out of the main document's paint work.** Give it `position: fixed`,
  `will-change: transform`, `pointer-events: none`, and a high `z-index`. `position: fixed` +
  compositing means scrolling does not repaint it.
- **Don't animate `filter: drop-shadow()` per frame.** A drop-shadow on a rotating element re-rasterises
  the layer whenever the rotation changes. Cheaper: bake the shadow into the SVG as a second, offset,
  blurred path (which is what the Wii does — a separate shadow sprite, §3.4), or use a static
  `filter` on a parent that doesn't rotate.
- **Prefer inline SVG or a single `<img>`, not a nested DOM tree.** Every extra element is another
  thing to composite. One `<svg>` with two paths (shadow + hand) plus one `<text>` is plenty.
- **Cancel the loop** on unmount, on `visibilitychange`, and when the cursor is hidden. A rAF loop that
  runs while nothing is visible is pure waste, and on battery it is measurable.
- **Don't re-render React.** Coordinates live in refs. If the component re-renders on every mouse
  move, you have already lost — that is 60+ reconciliations/second for a `div` that never changes.

## 12.9 Known pitfalls

1. **Flicker on page load.** Between first paint and the effect running, the user sees the native
   cursor; then it snaps away and the hand appears at `(0,0)` or wherever. Fixes: (a) render the
   cursor element with `opacity: 0` and only reveal it on the first `pointermove` (you genuinely do
   not know where the pointer is until then — there is no API for "current mouse position"); (b) apply
   the `cursor: none` class in the same effect that reveals it, never in static CSS (also §12.6.7).
2. **Cursor lag on heavy pages.** The rAF loop is starved by long main-thread tasks — a slow render,
   a big JSON parse, a layout-thrashing third-party script. The native cursor is drawn by the compositor
   (or the OS) and never lags; **yours will, and the contrast is very visible.** Mitigations: keep the
   main thread free, avoid synchronous work in event handlers, and consider hiding the custom cursor
   during known-heavy transitions (channel launch zoom) and letting the native one through.
   **[Inferred]** There is no way to fully solve this short of an off-main-thread animation, which is
   not available for pointer-following.
3. **Screenshot pollution — directly relevant to this repo.** `docs/methodology/visual-regression-tooling.md`
   plans Playwright `toHaveScreenshot()` baselines plus a `pixelmatch`/SSIM comparison against
   `reference_screen.png`. A cursor element **will** be captured by `page.screenshot()` (the *native*
   cursor is not, but a DOM element is), it will sit at a semi-arbitrary position, and it will produce
   diff noise on every run. Do all three:
   - render the cursor only when a flag is set: `if (import.meta.env.MODE === 'test') return null;`
     or a `?nocursor=1` query param the test harness appends;
   - mark it for CSS removal — `<div data-testid="wii-cursor">` plus a Playwright
     `styleTag`/`mask` — `toHaveScreenshot({ mask: [page.getByTestId('wii-cursor')] })` is the
     purpose-built option and is the least invasive;
   - never let it into the `reference_screen.png` comparison path, since the reference has no cursor.
   Doing this from day one is much cheaper than debugging flaky diffs later.
4. **Iframe boundaries.** A `position: fixed` element in the top document **cannot be drawn over an
   iframe's content in any way you control** — it is drawn over it visually (it's the same compositor),
   but the iframe never sends you `pointermove`, so **your cursor freezes at the iframe's edge while
   the real pointer moves inside it.** And the iframe shows its own native cursor. There is no
   cross-origin fix. Options: avoid iframes; or on `pointerenter` of the iframe, hide the custom cursor
   and restore `cursor: auto` so the user gets a working native pointer inside it. Same-origin iframes
   can be handled by injecting the same listeners into the child document.
5. **`cursor` inheritance leaks.** Any component or library that sets `cursor: pointer` /
   `grab` / `text` re-enables the native cursor on that element. The universal selector
   (`html.wii-cursor * { cursor: none; }`) fixes it but is a blunt instrument — remember to
   re-exempt inputs (§12.6.4) *after* it.
6. **Drag ghosting.** Native HTML5 drag, and text selection drags, both draw their own OS-level
   feedback and can force the native cursor back. If you implement channel reordering, use pointer
   events + `setPointerCapture`, **not** HTML5 drag-and-drop.
7. **Right-click / context menu.** The context menu is OS chrome; your cursor keeps following the
   pointer *behind* it and can look wrong. Minor, but hide on `contextmenu` if it bothers you.
8. **The 50 Hz native-cursor throttle** (`kCursorUpdateInterval`, §12.1) does not apply to the DOM
   follower — a mild point in Approach B's favour.

## 12.10 Reference implementation (React)

Drop-in, no dependencies, covers everything above. `src/components/WiiCursor.jsx`:

```jsx
import { useEffect, useRef, useState } from 'react';
import './WiiCursor.css';

// Measured from the real Wii Menu cursor texture — see context/components/cursor.md §3, §8.
const ART_W = 43;          // artwork width  (layout units)
const ART_H = 62;          // artwork height (layout units)
const HOTSPOT_X = 12.5;    // fingertip, in artwork units
const HOTSPOT_Y = 0;
const REST_TILT_DEG = 15;  // Nintendo's own no-roll-data fallback (Classic::getHorizon)

// Dragging-circle smoothing (WiiBrew). r in px, k per-frame ease inside the circle.
const CIRCLE_R = 8;
const EASE_K = 0.22;

export default function WiiCursor({ playerNumber = 1, enabled = true }) {
  const rootRef = useRef(null);
  const target = useRef({ x: 0, y: 0 });
  const pos = useRef({ x: 0, y: 0 });
  const pressed = useRef(false);
  const seen = useRef(false);      // have we ever had a real pointer position?
  const raf = useRef(0);
  const last = useRef(0);

  // Only mount for precise pointing devices; flips to false on the first touch event.
  const [fine, setFine] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(any-pointer: fine) and (any-hover: hover)').matches
  );
  const [reduced] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  const active = enabled && fine;

  useEffect(() => {
    if (!active) return;
    const el = rootRef.current;
    if (!el) return;

    // Hide the native cursor from JS, never from static CSS — if this module fails to
    // load the user must still have a working pointer. (§12.6.7)
    document.documentElement.classList.add('wii-cursor-active');

    const onMove = (e) => {
      if (e.pointerType === 'touch') { setFine(false); return; }
      target.current.x = e.clientX;
      target.current.y = e.clientY;
      if (!seen.current) {                 // first sighting: snap, don't fly in
        pos.current.x = e.clientX;
        pos.current.y = e.clientY;
        seen.current = true;
        el.style.opacity = '1';
      }
    };
    const onEnter = () => { if (seen.current) el.style.opacity = '1'; };
    const onLeave = () => { el.style.opacity = '0'; };   // instant, like losing IR lock (§5.6)
    const onDown = (e) => { if (e.button === 0) pressed.current = true; };
    const onUp = () => { pressed.current = false; };
    const onVis = () => { if (document.hidden) el.style.opacity = '0'; };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('pointercancel', onUp, { passive: true });
    window.addEventListener('blur', onLeave);
    document.addEventListener('visibilitychange', onVis);
    document.documentElement.addEventListener('pointerleave', onLeave);
    document.documentElement.addEventListener('pointerenter', onEnter);

    const tick = (t) => {
      raf.current = requestAnimationFrame(tick);
      const dt = last.current ? Math.min((t - last.current) / 16.667, 4) : 1; // in 60fps frames
      last.current = t;

      const p = pos.current, g = target.current;
      if (reduced) {
        p.x = g.x; p.y = g.y;                       // 1:1, no lag (§12.6.2)
      } else {
        const dx = g.x - p.x, dy = g.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d > CIRCLE_R) {                          // outside the circle: catch up to the rim
          const s = (d - CIRCLE_R) / d;
          p.x += dx * s; p.y += dy * s;
        } else if (d > 0) {                          // inside: ease toward the centre
          const k = 1 - Math.pow(1 - EASE_K, dt);    // frame-rate independent
          p.x += dx * k; p.y += dy * k;
        }
      }

      // One compositor-only write per frame. Hotspot offset is applied in CSS via
      // transform-origin + a translate on the inner art, so rotate() pivots on the fingertip.
      el.style.transform =
        `translate3d(${p.x}px, ${p.y}px, 0) rotate(${REST_TILT_DEG}deg)` +
        (pressed.current && !reduced ? ' scale(0.94)' : '');
    };
    raf.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf.current);
      last.current = 0;
      document.documentElement.classList.remove('wii-cursor-active');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('blur', onLeave);
      document.removeEventListener('visibilitychange', onVis);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      document.documentElement.removeEventListener('pointerenter', onEnter);
    };
  }, [active, reduced]);

  if (!active) return null;

  return (
    <div ref={rootRef} className="wii-cursor" data-testid="wii-cursor" aria-hidden="true">
      <svg viewBox={`0 0 ${ART_W} ${ART_H}`} className="wii-cursor__art">
        {/* TODO: replace with the redrawn paths — see cursor.md §11 for the measured spec.
            Two layers: a soft dark silhouette (the N_SRot shadow), then the white+black hand. */}
        <path className="wii-cursor__shadow" d="…" />
        <path className="wii-cursor__hand"   d="…" />
        <text className="wii-cursor__num" x={22.5} y={49} textAnchor="middle">{playerNumber}</text>
      </svg>
    </div>
  );
}
```

`src/components/WiiCursor.css`:

```css
/* Applied from JS only — never let a stylesheet leave the user with no pointer. */
.wii-cursor-active,
.wii-cursor-active * { cursor: none; }

/* …but text entry keeps its native affordance. Must come after the rule above. */
.wii-cursor-active :where(input, textarea, select, [contenteditable]) { cursor: auto; }

.wii-cursor {
  position: fixed;
  top: 0;
  left: 0;
  width: calc(9.43vh);                     /* 43/456 of viewport height — see §8 */
  height: clamp(72px, 13.6vh, 160px);      /* 62/456, clamped so it stays sane on 4K */
  aspect-ratio: 43 / 62;
  height: auto;
  pointer-events: none;                    /* mandatory (§12.2) */
  will-change: transform;                  /* one legitimate use: a permanent, always-moving layer */
  z-index: 2147483647;
  opacity: 0;                              /* revealed on the first real pointermove (§12.9.1) */
  /* Pivot on the fingertip so rotation doesn't move the point of aim (§6.3). */
  transform-origin: 29.07% 0;              /* 12.5 / 43 */
  margin-left: -29.07%;                    /* place the fingertip on the pointer position */
}
.wii-cursor__art  { display: block; width: 100%; height: 100%; overflow: visible; }
.wii-cursor__hand { fill: #fff; stroke: #000; stroke-width: 6; stroke-linejoin: round; }
.wii-cursor__shadow { fill: rgba(0, 0, 0, 0.3); transform: translate(2px, 3px); }
.wii-cursor__num  { fill: #000; font-weight: 700; font-size: 17px; }

@media (prefers-reduced-motion: reduce) {
  .wii-cursor { transition: none; }
}
```

Playwright, to keep it out of visual baselines (§12.9.3):

```js
await expect(page).toHaveScreenshot({
  mask: [page.getByTestId('wii-cursor')],
});
```

---

## 13. Spec summary (the numbers, in one place)

| Property | Value | Tag |
|---|---|---|
| Archive | `cursor.ash` (NAND), 9 `.brlyt` files | Decomp |
| Poses | `P{1..4}_Def` (point), `P{1..4}_Cat` (grab) | Decomp |
| Animations bound to cursor layouts | **zero** — static images only | Decomp |
| Artwork size | 43 × 62 layout units (point); 43 × 43 (grab, bottom-aligned) | Asset |
| Screen space | 608 × 456 (4:3) / 832 × 456 (16:9), origin centred | Decomp |
| On-screen height | **13.6 % of viewport height**; width 9.4 % of viewport height | Derived |
| Fill / outline | `#FFFFFF` / `#000000`, outline ≈3 px on a 62 px hand (≈4.8 %) | Asset |
| Shading | grey gradient `#FFF → #BB` over the lower ~35 %, multiply | Asset |
| Numeral | black, centred at 52 % width / 66 % height of the hand, cap height 27 % of hand height | Asset |
| Per-player colour | **none** — numeral only | Asset + Decomp |
| Shadow | separate soft white silhouette, 1 px larger, own rotate pane `N_SRot` | Asset + Decomp |
| Hotspot | fingertip, artwork (12.5, 0) → **29 % across, 0 % down** | Asset |
| Rotation | `atan2Deg(-horizon.y, horizon.x)`, no clamp, applied to hand *and* shadow | Decomp |
| Rest tilt (no roll data) | **exactly 15°** | Decomp |
| Pointer gain | `KPADGetProjectionPos(..., 1.10132f)`, ×1.15 extra in 16:9 | Decomp |
| Edge overshoot | 100 layout units past the border before snapping back | Decomp |
| Smoothing | KPAD library default — System Menu adds none and tunes none | Decomp |
| Smoothing algorithm (reference) | dragging circle, or velocity-adaptive; **no published parameters** | Fan |
| Lost tracking | instantly not drawn, no fade | Decomp |
| Hover effect on cursor | **none** — target animates instead | Decomp |
| Press effect on cursor | **none** | Decomp |
| Grab trigger | `BTN_DRAG = A \| B` → instant pose swap | Decomp |
| Cursors on screen | 4 max, drawn 3→0 so P1 is on top | Decomp |
| Movement sound | **none** — no such ID exists in the 90-entry sound bank | Decomp |
| Hover sound | `WIPL_SE_BT_TARGETTING` (buttons) / `WIPL_SE_CH_TARGETTING` (channels) | Decomp |
| Hover rumble | 58.3 ms (7/120 s) motor pulse, 200/300 ms lockout | Decomp |
| B-scroll arrow | length clamped **32–128** units, Y-scale ±1 for down/up | Decomp |

---

## 14. Open gaps and things I could not verify

1. **The contents of `cursor.ash`.** Pane offsets, the exact shadow offset, the rotation pivot, and
   any material colours are inside layout binaries the decomp cannot ship. Everything in §3.4 about
   the shadow's *placement* (as opposed to its existence and its artwork) is inference.
2. **Whether the `.brlyt` scales the texture.** I assume 1:1 (a 64 px cell drawn at 64 layout units),
   which makes §8's percentages exact. If the layout applies a scale, every size figure moves
   proportionally. Confidence: high but not certain — the atlas being authored at exactly 64 × 64 for a
   456-unit-tall screen is strong circumstantial evidence.
3. **Rotation sign.** 15° is certain; whether it is clockwise or counter-clockwise on screen is derived
   from nw4r's Y-up convention, not observed. Verify against a screenshot before committing.
4. **KPAD's actual smoothing parameters.** Not in the decomp (KPAD is not decompiled here) and not
   published by WiiBrew. The dragging-circle radius in particular is a free parameter — tune by feel.
5. **The numeral overlay's blend mode.** I inferred multiply from the intensity-texture structure and
   verified by reconstruction (the composite matches the iconic cursor exactly). It could technically
   be a different GX TEV configuration that produces the same result. The *visual outcome* is not in
   doubt.
6. **Whether other Wii system software animated its cursor.** The Wii Shop Channel, Photo Channel and
   most games ran their own cursor code. The "finger curls on click" memory may well be accurate for
   *some* Wii software — it is just not true of the System Menu, which is what this project clones.
7. **Spriters Resource / primmr availability.** TSR requires a browser `User-Agent` and 403s otherwise;
   `primmr.dev` refused connection during this pass. Both may need manual browsing.
8. **SVG-as-cursor per-browser versions.** MDN documents the requirement but browser-compat-data has no
   `svg` subfeature under `cursor`, so no version table exists to cite. Moot for this project given the
   Approach B recommendation, but flagged as an unresolved fact.
