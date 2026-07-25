# Decomp findings — `koopthekoopa/wii-ipl` (Wii System Menu 4.3)

Systematic mining of the fan decompilation of Nintendo's actual Wii System Menu binary, for
every open question in this project's research corpus **except** page navigation (already
covered in `context/components/page-navigation.md`).

---

## 0. Source, method, and how much to trust it

**Repo:** https://github.com/koopthekoopa/wii-ipl — "A work-in-progress decompilation of the
Wii Menu (4.3)". Analysed at commit `42a49cb` (2026-07-23).
Local working copy for this pass: a full `git clone` (not WebFetch — the whole tree was read
directly, which is why file/line citations below are exact).

**Version targeted:** **System Menu 4.3**, four regional builds — `43U` (USA), `43E` (Europe),
`43J` (Japan), `43K` (Korea) (`README.md`). This is the version most people picture, and it
matches what this project is recreating. No 1.0–4.2 code is present.

### What the repo does and does not contain

| Contains | Does **not** contain |
|---|---|
| Full C++ source for every menu scene, reconstructed to compile to Nintendo's original machine code | Any `.brlyt` (layout), `.brlan` (animation), `.brsar` (audio) or texture asset |
| Exact **frame ranges** for every animation | The **keyframe content** of those animations |
| Exact **pane names**, **animation-group names**, **layout file names** | Pane positions, sizes, colours (those live in the `.brlyt`) |
| Exact **sound-effect identifiers** and where they fire | The actual audio samples |
| Full state machines, hit-test guards, input mapping, timers | — |

> **The single most important caveat.** "The zoom runs for exactly 28 frames" is *certain*.
> "The zoom is a scale-up of the tile" is *inference*. Everywhere below I tag claims:
> **[Decomp]** = read directly out of the code; **[Inferred]** = my reading on top of it;
> **[Not found]** = the decomp is silent.

### Per-file confidence (from `configure.py` lines ~608–700)

The build config labels every translation unit. `Matching` = the C++ recompiles **byte-for-byte
identical** to Nintendo's shipped code — as strong as evidence gets short of the binary itself.
`Equivalent` = functionally identical, compiles to equivalent-but-not-identical code (register
allocation / scheduling differences); the *logic* is trustworthy, the exact instruction stream
is not.

| File | Status | Covers |
|---|---|---|
| `src/scene/channelSelect/iplClock.cpp` | **Matching** | the clock |
| `src/scene/health/iplHealth.cpp` | **Matching** | Health & Safety screen |
| `src/scene/button/iplArrow.cpp` | **Matching** | arrow draw pass |
| `src/scene/backMenu/iplBackMenu.cpp` | **Matching** | "returning to Wii Menu" screen |
| `src/scene/channelSelect/iplChannelSelect.cpp` | Equivalent | channel grid, paging, drag/drop |
| `src/scene/channelSelect/iplChannelObj.cpp` | Equivalent | per-tile cursor/balloon/thumbnail |
| `src/scene/channelTitle/iplChannelTitle.cpp` | Equivalent | channel preview overlay |
| `src/scene/button/iplButton.cpp` | Equivalent | bottom bar |
| `src/scene/board/iplBoard.cpp` | Equivalent | Message Board |
| `src/scene/sdButton/iplSDMenuButton.cpp` | *(unlisted in the snippet read; treated as Equivalent)* | SD card icon |

Essentially **no stubbing** in the menu scenes — a repo-wide grep for `TODO` / `not
implemented` / `stripped out` returns 2 hits in the scenes this document covers
(`iplChannelSelect.cpp:650` `setDebugRsoInterval` — a debug-only function, and
`iplChannelSelect.cpp:1148` a style comment). The subsystems below are **complete**, not
partial.

### Frame → millisecond conversion

All frame counts are at the Wii's **60 Hz NTSC** field rate. `ms = frames / 60 × 1000`.
PAL 50 Hz builds run the same frame counts 20% slower. Every duration below is quoted in NTSC ms.

---

## 1. The coordinate system (new, foundational — adopt this project-wide)

**[Decomp — direct code evidence]** `src/system/iplSystem.cpp:1187–1199`

```cpp
void System::getProjectionRect4x3(nw4r::ut::Rect* rect) {
    rect->left = -304.0;  rect->right = 304.0;
    rect->bottom = 228.0; rect->top = -228.0;
}
void System::getProjectionRect16x9(nw4r::ut::Rect* rect) {
    rect->left = -416.0;  rect->right = 416.0;
    rect->bottom = 228.0; rect->top = -228.0;
}
```

The entire menu is laid out in a **virtual pixel space, origin at screen centre**:

- **4:3 → 608 × 456** (x ∈ [−304, 304], y ∈ [−228, 228])
- **16:9 → 832 × 456** (x ∈ [−416, 416], same vertical)

The vertical extent is **identical** across aspect ratios; only horizontal width changes. The
16:9 scale factor used throughout the code is `832 / 608 = 1.36842`
(`iplChannelSelect.cpp:204–205`, `iplChannelObj.cpp:176`).

**Channel tile size** — `iplChannelSelect.cpp:140–149` and `iplChannelTitle.cpp:~124` both
define the same table of *half-extents*:

```cpp
static const f32 cfChanThumbOfss[2][2] = {
    { 64.0f, 48.0f },   // index 0 = SC_ASPECT_RATIO_4x3
    { 85.0f, 48.0f },   // index 1 = SC_ASPECT_RATIO_16x9
};
```

→ **Tile is 128 × 96 in 4:3 and 170 × 96 in 16:9.** This confirms the inference in
`page-navigation.md` §2 that the reference screenshot is 16:9 with a 170×96 icon canvas. It
also means:

- Tile aspect: 1.333 (4:3) / **1.771** (16:9).
- Tile height is **96 / 456 = 21.05% of viewport height in both aspect ratios**.
- Tile width is 128/608 = **21.05%** in 4:3 and 170/832 = **20.43%** in 16:9.

**Recommendation:** build the recreation against a `608×456` or `832×456` virtual canvas
scaled to fit. Every measurement below is in those units and is exact.

---

## 2. Channel tile hover / focus — Q1

### 2.1 There is no wobble, no jiggle, and no "pop" on the tile itself

**[Decomp — direct code evidence]** The tile's own thumbnail layout (`icon.brlyt` from the
channel's banner) is **never touched by hover**. Hover drives two *separate, overlaid layouts*:

`src/scene/channelSelect/iplChannelObj.cpp:13–21`

```cpp
static const char* scCursur = "Cursur_a";
static const char* scCursorAnims[] = {
    "my_IplTop_d_FocusOff.brlan",
    "my_IplTop_d_FocusOn.brlan",
    "my_IplTop_d_Select.brlan",
};
static const char* scBalloonText = "T_Balloon";
```

- **Cursor / highlight layout:** `my_IplTop_d.brlyt`, single pane `Cursur_a`
  (`iplChannelObj.cpp:844–853`). Created per-tile, from its own dedicated heap
  (`mpCursorHeap`, 0x25900 bytes). Root pane starts `SetVisible(false)`.
- **Name balloon layout:** `my_IplTopBalloon_a.brlyt`, animation
  `my_IplTopBalloon_a_BalloonInOut.brlan` (`iplChannelObj.cpp:953–965`).

So: pointing at a tile **draws a highlight object on top of it** and **fades in a name
balloon**. The icon graphic underneath does not deform. **[Decomp]** for the mechanism;
whether `my_IplTop_d_FocusOn.brlan` internally scales/glows the highlight ring is
**[Not found in decomp]** — that's inside the `.brlan`.

### 2.2 The hover state machine

`iplChannelObj.cpp:861–951`. Five logical states (`unk_0x58`), with a queued "next intent"
(`unk_0x5C`) so rapid on/off is never dropped:

| `setCursorAnim(n)` | Meaning | Effect |
|---|---|---|
| `0` | reset | all cursor anims rewound, root pane hidden |
| `1` | focus in | show root, play `my_IplTop_d_FocusOn.brlan` |
| `2` | (internal) focus-in finished, steady hover | — |
| `3` | focus out | play `my_IplTop_d_FocusOff.brlan` |
| `4` | **decide/select** | play `my_IplTop_d_Select.brlan` |

Key behaviour: `calcCursorAnim()` will **not** start the out animation until the in animation
has finished (`case 1: if (!mpCursorAnims[ANIM_CURSOR_FOCUS_ON]->isPlaying())`), and it stores
the pending intent so a flick-over-and-off still plays in→out in full. Worth replicating —
naive CSS `:hover` transitions will interrupt mid-way and look wrong.

Frame counts for these three animations are **[Not found in decomp]** — unlike the button-bar
animations, they are whole `.brlan` files played end-to-end rather than frame ranges the code
selects, so the durations live in the asset.

### 2.3 Sounds and haptics on hover — definitive

`src/scene/channelSelect/iplChannelSelect.cpp:2273–2286`

```cpp
case ::gui::EventHandler::ON_POINT: {
    if (mpInstance->mState == ChannelSelect::STATE_NORMAL && chanObj->isValid()) {
        chanObj->onPoint(0);
        snd::getSystem()->startSE("WIPL_SE_CH_TARGETTING");
        con->rumble(1);
    }
    break;
}
case ::gui::EventHandler::ON_LEFT: {
    if (... && chanObj->isValid()) { chanObj->onLeft(0); }   // NO sound on un-hover
    break;
}
```

| Event | Sound | Rumble |
|---|---|---|
| Point at a **channel tile** | **`WIPL_SE_CH_TARGETTING`** | yes, type 1 |
| Leave a channel tile | **none** | no |
| Point at a **bottom-bar button / arrow** | **`WIPL_SE_BT_TARGETTING`** | yes (`iplButton.cpp:411–416`) |
| Balloon finishes its delay and pops in | **`WIPL_SE_BALLOON`** | — |
| **Click** a channel (launch) | **`WIPL_SE_BT_PUSH`** (`iplChannelSelect.cpp:1527`) | — |
| Zoom actually starts | **`WIPL_SE_CH_SELECT`** (`iplChannelSelect.cpp:1546`) | — |
| Back out of a channel | **`WIPL_SE_CH_UNSELECT`** (`iplChannelTitle.cpp:1436`) | — |

**Note the two distinct "targeting" ticks.** Channels use `CH_TARGETTING`; buttons and arrows
use `BT_TARGETTING`. They are different BRSAR entries (IDs 35 and 34 — §11). `context/audio.md`
should not conflate them.

**Rumble duration** — `src/system/iplController.cpp:42–60`: the motor is driven ON while
`elapsed < 7/120 s`, then OFF. That is **58.3 ms ≈ 3.5 frames**.

### 2.4 The hover balloon (channel name tooltip)

**[Decomp — direct code evidence]**

- **Delay before it appears: 20 frames = 333 ms.** `iplChannelObj.cpp:1108–1115`:
  ```cpp
  case 1: { if ((++unk_0x70) >= 20.0f) { setBalloonAnim(2); break; } }
  ```
  Only then does state 2 show the root pane, play `BalloonInOut.brlan` forward, and fire
  `WIPL_SE_BALLOON` (`iplChannelObj.cpp:1065–1071`).
- **Out is the same animation played backward** (`setAnmType(ANIM_TYPE_BACKWARD)`,
  `iplChannelObj.cpp:1090`), so in and out are exactly symmetric.
- **Balloon structure:** panes `N_Balloon` (root), `W_Base` (body), `W_Shade` (drop shadow —
  a *separate pane resized in lockstep*, `iplChannelObj.cpp:1013–1014`), `T_Balloon` (text).
- **Width is dynamic:** `width = textWidth + 40`, floored at `160` (4:3) / `219` (16:9)
  virtual px (`iplChannelObj.cpp:1007–1011`).
- **Text truncation:** channel names are trimmed until they fit **391.5** virtual px, appending
  `…` on Japanese systems and `...` everywhere else (`iplChannelObj.cpp:982–1001`). Generic
  balloons additionally cap at **20 characters** (`iplBalloon.cpp` `set_textbox`).
- **Edge clamping:** the balloon is pushed inward so it never comes within **60** virtual px of
  the left/right screen edge (`iplChannelObj.cpp:1034–1038`).
- **Vertical offset:** `|Δy| = tileHalfHeight(48) + balloonHalfHeight − 2`
  (`iplChannelObj.cpp:1023`). The *sign* (above vs. below the tile) depends on which of two
  camera conventions is in play and I could not resolve it from code alone — **[Inferred /
  unresolved]**; verify against a screenshot.

### 2.5 Bottom-bar button balloons use a *different* delay

`include/scene/textBalloon/iplBalloon.h:16` — `WAIT_UNTIL_FADE_IN = 15`, and
`src/scene/textBalloon/iplBalloon.cpp` `on_pre_fadein()`:

```cpp
if (mWaitUntilFadeIn++ > WAIT_UNTIL_FADE_IN) { anm_fadein(); startSE("WIPL_SE_BALLOON"); }
```

Counter starts at 0 and fires when it exceeds 15 → **16 frames ≈ 267 ms**.

> **So: channel-tile balloon = 333 ms delay; bottom-bar button balloon = 267 ms delay.**
> Two different numbers, both exact.

Button balloons are offset **+50 virtual px in Y** from the button pane
(`iplButton.cpp:722`) and edge-clamped to **120** px (16:9) / **30** px (4:3)
(`iplButton.cpp:262` passes those as the constructor's `unk3`/`unk4`).

**Which bottom-bar items get a balloon:** exactly five —
`MESG_BUTTON_BBS_BOARD`, `MESG_BUTTON_CH_SEL`, `MESG_BUTTON_SETTING`, `MESG_BUTTON_CALENDAR`,
`MESG_BUTTON_CREATE` (`iplButton.cpp:137–143`) — **plus** the SD card icon, which owns its own
balloon (message ID 161, `iplSDMenuButton.cpp:14–16`). The **arrows get none** (already noted
in `page-navigation.md` §4.3, confirmed here).

### 2.6 Clicking a tile requires holding A for 5 frames

**[Decomp — direct code evidence]**, and a genuinely surprising detail.
`src/system/iplController.cpp:19–40, 121–123`:

```cpp
void Base::read() {
    if (downTrg(BTN_INTERACT)) mButton = 1;
    if (pinch())               mButton = 0;      // A+B cancels the "decide" accumulation
    if (mButton != 0) { if (down(BTN_INTERACT)) unk_0x08++; else { unk_0x08 = 0; mButton = 0; } }
    else                unk_0x08 = 0;
}
int Base::decide() const { return unk_0x08 == 5; }
```

`ChannelSelectEventHandler` launches a channel on `con->decide()`
(`iplChannelSelect.cpp:2267`). `decide()` is true **only on the 5th consecutive frame A is
held** → **~83 ms of A-hold before a channel opens**, and it fires exactly once. This is the
mechanism that lets A+B (grab) and A (launch) coexist on the same tile without conflict:
pressing B during those 5 frames zeroes the counter and the launch never fires.

**Implementation note for the web recreation:** a plain `click` handler is close enough, but if
you want fidelity, `mousedown` → 83 ms → fire, cancelled by a second button.

---

## 3. The channel launch transition — Q2

### 3.1 It is a 28-frame (467 ms) camera zoom, with an exact easing curve

**[Decomp — direct code evidence]** Two things run in lockstep.

**(a) A layout animation on the grid**, `iplChannelSelect.cpp:1540–1550`:

```cpp
BOOL ChannelSelect::tellStartingZoomAnm() {
    mpLayout->setMinFrame(200.0f);
    mpLayout->setMaxFrame(228.0f);       // my_IplTop_a.brlan, frames 200 → 228
    mpLayout->setAnmType(ANIM_TYPE_FORWARD);
    mpLayout->start();
    snd::getSystem()->startSE("WIPL_SE_CH_SELECT");
    mState = STATE_NORMAL_FADE_ZOOM;
    return TRUE;
}
```

**(b) An orthographic-projection interpolation**, `iplChannelSelect.cpp` `initChanZoomParam()`:

```cpp
math::VEC3 iStack_34(projRect.left,  -projRect.top,    0.0f);   // screen top-left
math::VEC3 iStack_40(pos.x - mChanThumbOff_X, pos.y + mChanThumbOff_Y, 0.0f);  // tile top-left
... (all four corners) ...
if (!unk) {  // zoom IN: screen corners  →  tile corners
    mpChanZoomParams[0]->init(iStack_34, iStack_40, 28.0f, 0.0f, 0.0f, ANIM_TYPE_FORWARD);
    ... [1],[2],[3] ...
} else {     // zoom OUT: tile corners  →  screen corners
    mpChanZoomParams[0]->init(iStack_40, iStack_34, 28.0f, 0.0f, 0.0f, ANIM_TYPE_FORWARD);
}
```

The four **corners of the viewport** are interpolated onto the four **corners of the selected
tile** over **28 frames = 467 ms**, then `setChanZoomOrtho()` derives a translate + scale from
them and `utility::Graphics::setOrthoTransAndScale()` applies it to the whole scene
(`iplChannelSelect.cpp:531–533`). Net visual: **the camera flies into the tile until the tile
fills the screen**, everything else scaling out past the edges.

### 3.2 The easing curve is exactly smoothstep — this is a hard number

**[Decomp — direct code evidence]** `include/math/iplInterporation.h`, `HermiteIntp<T>::get()`.
Both tangent parameters (`param_5`, `param_6`) are passed as `0.0f`. With zero tangents the
Hermite basis collapses to:

```
lerp(start, end, 3t² − 2t³)      where t = frame / maxFrame
```

i.e. **classic smoothstep**. This is not my guess — it falls straight out of the code with the
supplied arguments.

**CSS equivalent:** `cubic-bezier(0.5, 0, 0.5, 1)` is a very close approximation of smoothstep
(max error < 0.5%). Use it, not `ease-in-out` (which is `cubic-bezier(0.42,0,0.58,1)` and
noticeably different at the ends).

> **This resolves the easing question generally, not just for the zoom.** `HermiteIntp` with
> zero tangents is the engine's *standard* interpolator. `page-navigation.md` §6 correctly
> guessed "ease-in-out"; **smoothstep / `cubic-bezier(0.5,0,0.5,1)` is the precise answer** and
> should be adopted as the project's default easing token.

### 3.3 The reverse is the identical animation, played backward

`iplChannelSelect.cpp:1562–1564`:

```cpp
void ChannelSelect::restart(int page, int index) {
    mpLayout->setAnmType(ANIM_TYPE_BACKWARD);
    mpLayout->start();
    math::VEC3 myVec(getDispChanTrans(index));
    initChanZoomParam(myVec, 1);          // note the `1` → corners run tile → screen
    ...
}
```

**Zoom out = 28 frames = 467 ms, same smoothstep, exact mirror.** Triggered by
`ChannelTitle::tryToGoBackward()` (`iplChannelTitle.cpp:1425–1445`), which also plays
`WIPL_SE_CH_UNSELECT` and fades the channel's banner sound out over 28 frames
(`stopBannerSound(28)`).

### 3.4 What crossfades during the zoom

`iplChannelTitle.cpp:351–353, 760–806`:

```cpp
mpZoomAnim = new math::HermiteIntp<float>();
mpZoomAnim->init(0.0f, 255.0f, 28.0f, 0.0f, 0.0f, ANIM_TYPE_FORWARD);   // alpha 0 → 255, 28f
...
nw4r::ut::Rect drawRect(mDispTrans.x - chanThumbOff_X, mDispTrans.y + chanThumbOff_Y,
                        mDispTrans.x + chanThumbOff_X, mDispTrans.y - chanThumbOff_Y);
utility::Graphics::drawTexture(drawRect, mpCapture->getGXTex(), {255,255,255,(u8)mpZoomAnim->get()}, 1);
drawPolygonAroundRect(drawRect, {0, 0, 0, (u8)mpZoomAnim->get()});
```

The `ChannelTitle` scene **screen-captures itself** (`mpCapture->capture(TRUE)`, line 803) and
draws that capture **into the tile's rectangle**, alpha ramping 0 → 255 over the same 28
frames, with **black polygons filling everything outside the tile rect** at matching alpha
(`drawPolygonAroundRect`, `iplChannelTitle.cpp:2371+`).

Combined with §3.1's camera zoom, the perceived effect is: **the channel's preview screen
materialises inside the tile's footprint and grows to fill the viewport, while the rest of the
menu is blacked out.** That is the definitive description of the launch transition.

CSS reconstruction: a full-screen element with `transform-origin` at the tile's centre,
`transform: scale(viewportW / tileW)` over 467 ms smoothstep, plus a black overlay and an
opacity 0→1 crossfade of the destination screen on the same timeline.

---

## 4. The channel preview overlay ("Start" / "Wii Menu") — Q3

### 4.1 Layout and buttons

**[Decomp — direct code evidence]** `src/scene/channelTitle/iplChannelTitle.cpp:245` — layout
file **`my_ChTop_a.brlyt`**.

```cpp
const char* ChannelTitle::mscBtnNames[BTN_MAX]      = { "B_BtnA", "B_BtnB" };   // hit panes
const char* ChannelTitle::mscButtonTextName[BTN_MAX]= { "T_BtnA", "T_BtnB" };   // label panes
```

`iplChannelTitle.cpp:259–265`:

```cpp
setMessage(FindPaneByName(mscButtonTextName[0]), MESG_CMN_WII_MENU);            // BtnA = "Wii Menu"
if (checkNeedUpdate(page,index)) setMessage(..[BTN_B], MESG_CHAN_TTL_BTN_UPDATE);// BtnB = "Update"
else                             setMessage(..[BTN_B], MESG_CMN_START);          // BtnB = "Start"
```

- **`B_BtnA` = "Wii Menu"** (back). `MESG_CMN_WII_MENU` = message ID **1**.
- **`B_BtnB` = "Start"**, or **"Update"** when the channel has a pending update.
  `MESG_CMN_START` = message ID **2**.

Only these two panes are hit-testable — everything else is switched off
(`setAllComponentTriggerTarget(false)` then two `setTriggerTarget(..., true)` calls,
`iplChannelTitle.cpp:316–319`). The enlarged banner is **not** clickable.

### 4.2 Button states — there are four, including a real disabled state

`iplChannelTitle.cpp:35–57`:

```cpp
const char* mscAnimGroups[] = {
    "G_FocusBtnA", "G_FocusBtnB",     // hover
    "G_SelectBtnA","G_SelectBtnB",    // press
    "G_OnOffBtnA", "G_OnOffBtnB",     // enabled / disabled
    "G_ChangeTextA","G_ChangeTextB",  // label swap when cycling channels
};
const char* mscAnimNames[] = {
    "my_ChTop_a_FocusBtnA_off.brlan",
    "my_ChTop_a_FocusBtn_on.brlan",
    "my_ChTop_a_SelectBtn_Ac.brlan",
    "my_ChTop_a_OffBtn.brlan",
    "my_ChTop_a_OnBtn.brlan",
    "my_ChTop_a_ChangeTextOut.brlan",
    "my_ChTop_a_ChangeTextIn.brlan",
    "my_ChTop_a_ChangeIn.brlan",
    "my_ChTop_a_ChangeRoop.brlan",
    "my_ChTop_a_ChangeOut.brlan",
};
```

| State | Animation | Trigger |
|---|---|---|
| hover in | `my_ChTop_a_FocusBtn_on.brlan` | `ON_POINT` (`:2743`) + `WIPL_SE_BT_TARGETTING` + rumble |
| hover out | `my_ChTop_a_FocusBtnA_off.brlan` | `ON_LEFT` (`:2759`), **no sound** |
| pressed | `my_ChTop_a_SelectBtn_Ac.brlan` | `ON_TRIG` |
| **enabled** | `my_ChTop_a_OnBtn.brlan` | `changeStartButton()` (`:2352–2369`) |
| **disabled** | `my_ChTop_a_OffBtn.brlan` | `changeStartButton()` |

**The "Start" button greys out and back** — `ChannelTitle::changeStartButton()` plays
`OffBtn`/`OnBtn` on `G_OnOffBtnB` whenever `isEnableToExecute()` flips (e.g. parental controls,
expired ticket, channel still loading). Pressing a greyed Start plays **`WIPL_SE_GRAY_BUTTON`**
and does nothing (`iplChannelTitle.cpp:2726–2727`).

Hover on a disabled Start is **also suppressed** — the guard is `if (i == 0 || unk_0x8C > 0)`
(`:2740`, `:2756`), so BtnA (Wii Menu) always hovers but BtnB only hovers while enabled.

**Hover is reference-counted, not boolean** — `mbHovered[i]++` / `mbHovered[i]--`, so two Wii
Remotes pointing at the same button don't cancel each other.

### 4.3 Press behaviour

`iplChannelTitle.cpp:2715–2735`:

| Pressed | Sound | Then |
|---|---|---|
| **Wii Menu** (`B_BtnA`) | **`WIPL_SE_BT_PUSH`** | select anim, `STATE_START_ZOOM_OUT`, `tryToGoBackward()` |
| **Start** (`B_BtnB`), enabled | **`WIPL_SE_DECIDE`** | select anim, `reserveNextScene()` (launches the title) |
| **Start**, disabled | **`WIPL_SE_GRAY_BUTTON`** | nothing |

### 4.4 The overlay is a channel *browser*, not a dead end — [notable, likely new to the corpus]

**[Decomp — direct code evidence]** `iplChannelTitle.cpp:1019–1029` and `:2770–2795`:

```cpp
if (con->down(controller::BTN_NEXT_LEFT))  { searchChannel(TRUE,  &page,&index);
                                             startChangeChannel(page,index);
                                             startSE("WSD_SELECT"); }
else if (con->down(controller::BTN_NEXT_RIGHT)) { searchChannel(FALSE, &page,&index); ... }
```

and the **blue scroll arrows remain live inside the preview overlay** (`BTN_ARROW_LEFT` /
`BTN_ARROW_RIGHT` handled by `CsChanTtlButtonEventHandler`), where they no longer page the grid
— they **step to the previous/next installed channel** without returning to the menu. The
banner swaps via the `Change` group (`ChangeIn` → `ChangeRoop` → `ChangeOut`) and the button
label crossfades via `ChangeTextIn`/`ChangeTextOut`.

`page-navigation.md` §4.6 says the arrows *disappear* when you open a channel — that is correct
for the disappear *animation* fired by `startChanTtlScene()`
(`IDANIM_ARROW_LEFT_DISAPPEAR` / `RIGHT_DISAPPEAR`, `iplChannelSelect.cpp:1511–1516`), but they
are **re-shown by `ChannelTitle` in some paths** (`iplChannelTitle.cpp:1002–1003`) and remain
event-bound. Worth a follow-up note in that doc: *the arrows are repurposed, not retired.*

### 4.5 Other overlay contents

- The channel's own banner layout, loaded from the title's `banner.brlyt`
  (`iplChannelTitle.cpp:976`), with animations `banner.brlan` / `banner_Start.brlan` /
  `banner_Loop.brlan` (`:60–64`) — i.e. banners have a one-shot intro then a loop.
- Disc channel gets a whole separate layout `my_DiskCh_a.brlyt` with 10 animations
  (`Start`, `DiskStart`, `DiskLoop`, `DiskEnd`, `DiskLost`, `DiskIn`, `DiskEject`,
  `Unknown`, `UnknownLoop`, `UnknwnEject` — `:74–84`).
- GameCube disc gets `my_GCTop_a.brlyt` with `my_GCTop_a_BackLoop.brlan`.
- Time-limited (rental) channels get `mpLimitRemainLyt` / `mpLimitDoneLyt` overlays.
- Widescreen swaps textures on 12 panes named `Fre_a` … `Fre_l` (`:100–115`).

---

## 5. Empty channel slots — Q4 (fully resolved)

### 5.1 An empty slot is a real, animated object with its own layout

**[Decomp — direct code evidence]** `src/scene/channelSelect/iplChannelObj.cpp`:

```cpp
f32 ChannelObj::createEmptyThumbnail() {
    mpThumbLayout = layout::Object::create(mpMainHeap, 0x8000, mpSysLayoutFile, "arc", "my_IplTop_b.brlyt");
    mpThumbAnim   = mpThumbLayout->bind("my_IplTop_b.brlan");
    return System::getRndm()->get_u16() % 2000;      // ← random start frame
}
```

- Layout **`my_IplTop_b.brlyt`**, animation **`my_IplTop_b.brlan`**, panes **`Ch0`** and
  **`Ch1`** (named in `createWrongThumbnail()` immediately below).
- **The returned value is the animation's starting frame, randomised in `[0, 2000)`.** The
  caller seeds `mpThumbAnim` with it. So the empty-slot animation is **at least 2000 frames
  ≈ 33.3 seconds long**, and **every empty slot is at a different random phase**.
- **[Inferred]** This is the familiar slow gloss/sheen sweep across empty slots. The decomp
  proves the loop is long and per-slot-desynchronised; it does not prove what the loop draws.
- A **corrupt/invalid** channel uses the *same* layout with `Ch0` hidden and `Ch1` tinted pure
  black (`createWrongThumbnail()`) — a black tile, no animation.

`ChannelSelect` keeps a *second* instance of this same layout (`unk_0x2C4`, created in
`createChanMoveLayout()`, `iplChannelSelect.cpp:1786–1792`) also seeded to a random frame —
used during drag (§6.4).

### 5.2 An empty slot is NOT hoverable and NOT clickable in normal mode

Every channel-tile event in `ChannelSelectEventHandler::onEvent` is gated on
`chanObj->isValid()` (`iplChannelSelect.cpp:2267, 2274, 2282`), and:

```cpp
BOOL ChannelObj::isValid() const {
    return System::getChannelManager()->hasLoadedBnr(mChanPage, mChanIndex);
}
```

**Consequence:** pointing at an empty slot produces **no highlight, no balloon, no
`WIPL_SE_CH_TARGETTING`, no rumble**, and clicking it does **nothing at all** (not even an
error sound). **[Decomp — direct code evidence]**

### 5.3 …but it IS a highlightable drop target during a drag

`iplChannelSelect.cpp:2075–2090`, in `onEventDrag()` (only reached in `STATE_NORMAL_GRAB` /
`STATE_NORMAL_DRAG`):

```cpp
case ::gui::EventHandler::ON_POINT: {
    if (isReleasableArea(mCurrentPage, id) || (mCurrentPage == mMoveOldPage && id == mMoveOldIndex)) {
        searchList(mCurrentPage, id)->onPoint(2);        // ← argument 2, not 0
        snd::getSystem()->startSE("WIPL_SE_CH_TARGETTING");
        con->rumble(1);
    }
}
```

And `isReleasableArea()` returns true precisely when the slot is **empty**
(`getChannel(page,index).loadedBnr == false`) or is the drag's origin.

The `onPoint(2)` argument matters — `iplChannelObj.cpp:553–558`:

```cpp
if (!(unk & 1)) setCursorAnim(1);     // bit 0 clear → DO show the cursor highlight
if (!(unk & 2)) setBalloonAnim(1);    // bit 1 SET  → do NOT show the name balloon
```

**So: during a drag, an empty slot gets the highlight ring and the targeting tick, but no name
balloon.** Exactly the affordance you'd want. This closes Q4 completely.

---

## 6. Drag-and-drop channel rearranging — Q5 (fully resolved, contradicts fan consensus)

### 6.1 It is A+B, held, and "pinch" is the internal name

**[Decomp — direct code evidence]** `src/system/iplController.cpp` `Revolution::read()`:

```cpp
if (down(REVO_BTN_A) && down(REVO_BTN_B)) unk_0x1D = 1;          // pinch = A AND B held
else if (!down(REVO_BTN_A) || !down(REVO_BTN_B)) unk_0x1D = 0;
```

Drag starts on `con->pinchTrg()` (the rising edge) — `iplChannelSelect.cpp:2258–2264`.

### 6.2 Three preconditions to start a drag — one is genuinely surprising

```cpp
if (mpInstance->mState == ChannelSelect::STATE_NORMAL && con != NULL && con->pinchTrg() &&
    System::getChannelManager()->isNormalChannel(mpInstance->mCurrentPage, index) &&
    mpInstance->mMaxPages * MAX_CHANNEL_INDEX != (u32)System::getSaveData()->getNumValidChannel()) {
    mpInstance->startDrag(con, mpInstance->mCurrentPage, index);
}
```

1. Menu must be idle (`STATE_NORMAL`).
2. **`isNormalChannel()`** — the **Disc Channel cannot be dragged**.
3. **`4 × 12 (=48) != numValidChannel`** — **if all 48 slots are occupied, dragging is disabled
   entirely.** Not "you can't drop it anywhere"; the grab never begins. **[Decomp]**

### 6.3 THE BIG ONE: it is drop-into-empty-slot only. No swap. No shuffle.

**[Decomp — direct code evidence]** `iplChannelSelect.cpp:2200–2212`:

```cpp
bool ChannelSelect::isReleasableArea(int page, int index) {
    if (page < 0 || page >= mMaxPages)               return false;
    if (index < 0 || index >= MAX_CHANNEL_INDEX)     return false;
    if (page == mMoveOldPage && index == mMoveOldIndex) return true;      // back where it came from
    return System::getChannelManager()->getChannel(page, index).loadedBnr == false;  // must be EMPTY
}
```

> ⚠️ **CONTRADICTION with the corpus.** Anywhere the project assumes channels **swap** places
> or that neighbours **shuffle up** to make room, that is wrong. The Wii Menu's rearrange is
> **move-to-an-empty-cell only**. Dropping onto an occupied cell is rejected — you get
> `WIPL_SE_CH_NOT_MOVE` and the tile snaps home. Check `context/channels.md` and
> `context/animations-interactions.md` for any swap/shuffle language and correct it.
>
> This is also *why* the manual instructs you to drag a channel onto the scroll arrow to reach
> another page: you're hunting for a free cell, not displacing anything.

The commit is done by `channel::Manager::moveChannelInfo(oldPage, oldIndex, newPage, newIndex)`
followed by an **async NAND save flush** (`System::getSaveData()->flushAsync(...)`,
`iplChannelSelect.cpp` `calcNormalMoveChanIn`), which the menu *waits on* before finishing the
animation (`calcNormalMoveChanSave`). Positions persist.

### 6.4 Visual feedback — four separate layouts, all named

`ChannelSelect::createChanMoveLayout()` (`iplChannelSelect.cpp:1786–1820`):

| Member | Layout | Animations | Role |
|---|---|---|---|
| `mpMoveLytMask` | **`my_TVMask_a.brlyt`** | `my_TVMask_a_Apear.brlan` / `_Lost.brlan` on pane `Picture_00` | **dims every other occupied tile** |
| `mpMoveLytObject` | **`my_TVShade_a.brlyt`** | `my_TVShade_a_Apear.brlan` / `_Lost.brlan` on pane `4x3` (`16x9` texture swapped in on widescreen) | **the floating dragged tile** |
| `mpMoveLytDrop` | **`my_TVApear_a.brlyt`** | `my_TVApear_a_Apear.brlan` / `_Lost.brlan` on `Picture_00` | **the landing burst at the target slot** |
| `unk_0x2C4` | **`my_IplTop_b.brlyt`** (the *empty-slot* layout) | `my_IplTop_b.brlan`, random start frame | **drawn over the ORIGIN slot while dragging** |

Draw logic, `iplChannelSelect.cpp:831–893` — this is the precise recipe:

```cpp
// every VALID tile that is NOT the one being dragged  →  draw the mask over it
if (chanObj->isValid()) { switch (mState) { case STATE_NORMAL_DRAG: ... 
    if (chanPage != mMoveOldPage || chanIndex != mMoveOldIndex) { ...mpMoveLytMask->draw(); } } }

// the ORIGIN slot  →  draw the empty-slot layout over it
if (chanPage == mMoveOldPage && chanIndex == mMoveOldIndex) { ...unk_0x2C4->draw(); }

// the TARGET slot, during the drop states  →  draw the landing effect
if (chanPage == mMoveNewPage && chanIndex == mMoveNewIndex) { mpMoveLytDrop->draw(); }
```

Note the mask is guarded by `isValid()` — **empty slots are never masked**. So during a drag:

- occupied tiles → **dimmed** by `my_TVMask_a`
- empty slots → **left bright** (they're the legal targets)
- origin slot → **rendered as an empty slot**
- dragged tile → floats above everything (`mpMoveLytObject->draw()` is the *last* draw call in
  `ChannelSelect::draw()`, line 564)

**[Decomp]** for all of the above. What `my_TVShade_a` draws (a tilted/shadowed copy of the
icon? a translucent ghost? "TVShade" suggests the Wii's TV-shaped tile frame with a shadow) is
**[Inferred]**.

Also: `System::getPointer()->changeType(chan, Pointer::TYPE_GRAB)` on grab and back to
`TYPE_POINT` on release (`iplChannelSelect.cpp:2142, 2182`) — **the hand cursor changes to a
closed/grabbing hand.** `Pointer::TYPE_POINT = 0, TYPE_GRAB = 1, TYPE_UNK2 = 2`.

And **the bottom-bar buttons are disabled for the duration** (`getButton()->disableBtn()` /
`enableBtn()`, `:2147, :2186`) — but the **arrows stay live** (`Button::enableBtn()` loops
`for (i = 0; i < BTN_ARROW_RIGHT; i++)`, i.e. it deliberately excludes the two arrow entries,
`iplButton.cpp:778`).

### 6.5 The drag sound is positional and speed-modulated — [notable]

`iplChannelSelect.cpp` `moveDrag()`:

```cpp
f32 val = (newX*newX) + (newY*newY);
if (val > 0.0f) speed = (val * nw4r::math::FrSqrt(val));
snd::getSystem()->holdSEwithPosDis("WIPL_SE_CH_DRAG", pos.x, speed);
```

A **continuous, held** sound whose **stereo pan follows the pointer's X** and whose intensity
follows the pointer's per-frame movement magnitude. Grab / drop / reject sounds are likewise
panned: `startSEwithPos("WIPL_SE_CH_HOLD", mDragPos.x)`,
`startSEwithPos("WIPL_SE_CH_SET", ...)`, `startSEwithPos("WIPL_SE_CH_NOT_MOVE", ...)`.

`context/audio.md` should note this: **the Wii Menu pans its drag SFX in stereo by pointer X
position.** Reproducible in the browser with a `StereoPannerNode`.

### 6.6 Full drag timeline

| Step | Code | Sound | Timing |
|---|---|---|---|
| A+B pressed on a tile | `startDrag()` `:2124` | **`WIPL_SE_CH_HOLD`** (panned) | — |
| Mask + shade appear | `mpMoveLytMask->getAnim(0)->play()`, `mpMoveLytObject->getAnim(0)->play()` | — | state `GRAB` until both finish |
| Dragging | `calcNormalDrag()` | **`WIPL_SE_CH_DRAG`** (held, panned, speed-scaled) | — |
| Hover the arrow while dragging | `unk_0x2AC/2B0 >= 15` | **`WSD_SELECT`** | **15 frames = 250 ms dwell**, then page turns and the counter resets |
| Release over an **empty** slot | `finishDrag()` `:2166` | **`WIPL_SE_CH_SET`** (panned) | drop anim, then NAND save |
| Release over an **occupied** slot / off-grid | `finishDrag()` else-branch | **`WIPL_SE_CH_NOT_MOVE`** (panned) | state `RELEASE_WAIT` |
| Rejected-drop settle delay | `calcNormalReleaseWait()`: `if (++unk_0x2B4 > 20)` | — | **20 frames = 333 ms** before the mask fades out |
| After a successful move | `calcNormalMoveChanOut()` | — | the shared idle anim is re-seeded to another random frame `rndm % 2000` |

The 250 ms arrow dwell confirms `page-navigation.md` §4.5 independently, from
`calcNormalDrag()` rather than the arrow code.

---

## 7. Message Board open / close — Q6 (timings confirmed; "flip" itself not confirmable)

### 7.1 Architectural finding: the Message Board is the PARENT scene

**[Decomp — direct code evidence]** `src/scene/board/iplBoard.cpp:575–596`:

```cpp
void Board::stt_wait_cdb_init() {
    ...
    // Scene order = Button > Channel Select > Arrow
    createChildScene(SCENE_BUTTON,         this, NULL);
    createChildScene(SCENE_CHANNEL_SELECT, this, NULL, (void*)ChannelSelect::START_NORMAL);
    createChildScene(SCENE_ARROW,          this, NULL);
    ...
}
```

**The Wii Menu you see is a child of the Message Board scene.** `Board` is created first, boots
the button bar / channel grid / arrow layer as its children, and stays alive and calculating
underneath the whole time. It draws its background (`my_IplTop_c.brlyt`) on `DRAW_LAYER_2`
every frame (`iplBoard.cpp:253–290`).

This is strong architectural corroboration for the "folder / board that the channel grid sits
on" mental model: **the board is literally always there, behind.**

### 7.2 Exact timings

**Channel grid → Message Board.** `ChannelSelect::tryToStartBoardScene()`
(`iplChannelSelect.cpp:1481–1502`):

```cpp
button->animation(Button::IDANIM_FROM_CH_SEL_TO_BOARD);       // button bar, 40 frames
if (mbLeftArrowVisible)  button->animation(IDANIM_ARROW_LEFT_DISAPPEAR);   // 10 frames
if (mbRightArrowVisible) button->animation(IDANIM_ARROW_RIGHT_DISAPPEAR);  // 10 frames
button->animation(Button::IDANIM_SD_BUTTON_BTN_OUT);          // SD icon out, 15 frames
mpLayout->setMinFrame(70.0f);
mpLayout->setMaxFrame(90.0f);                                 // grid layout, frames 70 → 90
mpLayout->setAnmType(ANIM_TYPE_FORWARD);
mpLayout->start();
```

**Message Board → channel grid.** `ChannelSelect::createBaseLayout()`
(`iplChannelSelect.cpp:679–684`), when `mStartType == START_FROM_BOARD`:

```cpp
mpLayout->setMinFrame(100.0f);
mpLayout->setMaxFrame(120.0f);        // frames 100 → 120
```

plus `Button::IDANIM_FROM_BOARD_TO_CH_SEL` = frames 6000 → 6040 (`iplButton.cpp:20`).

| Element | Frames | Duration |
|---|---|---|
| **Channel grid layer, opening the board** (`my_IplTop_a.brlan` 70→90) | 20 | **333 ms** |
| **Channel grid layer, closing the board** (`my_IplTop_a.brlan` 100→120) | 20 | **333 ms** |
| **Bottom bar, to board** (`my_IplTop_e.brlan` 1000→1040) | 40 | **667 ms** |
| **Bottom bar, from board** (`my_IplTop_e.brlan` 6000→6040) | 40 | **667 ms** |
| Arrows disappear/appear | 10 | 167 ms |
| SD icon out/in | 15 | 250 ms |
| Sound on opening | — | **`WIPL_SE_DECIDE`** (`iplChannelSelect.cpp:2320`) |

> **The grid layer moves for 333 ms; the bottom bar takes 667 ms — twice as long.** The two
> layers are deliberately desynchronised. If the recreation animates everything on one duration
> it will read wrong. **[Decomp]**

### 7.3 What the animation actually looks like — honest limits

**[Not found in decomp.]** Frames 70→90 of `my_IplTop_a.brlan` are 20 frames of *something*.
Whether it is an X-axis rotation ("flip up like a folder"), a slide, or a scale is baked into
the `.brlan`, which the repo cannot ship. The decomp gives no rotation call, no `SetRotate`, no
axis hint anywhere in this path.

What the decomp *does* support:
- **[Decomp]** The board background is already drawn beneath at all times (§7.1) — consistent
  with the grid moving *out of the way* rather than the board sliding *in*.
- **[Decomp]** Only the grid layout and the button layout animate; nothing else is touched.
- **[Inferred]** 333 ms with smoothstep easing (§3.2) is the right timing regardless of axis.

### 7.4 Bonus: the Message Board's own day-scroll

`iplBoard.cpp:29–31, 1691–1749`:

```cpp
static const struct { f32 start, end; } scAnmFrame[] =
    { {30.0f, 50.0f}, {0.0f, 20.0f}, {100.0f, 131.0f}, {60.0f, 91.0f} };
// cmn_start_scroll_r()/(r_hi) → index 0 ;  cmn_start_scroll_l()/(l_hi) → index 1
```

Scrolling one day left or right on the board = **20 frames = 333 ms** (indices 0 and 1).
Indices 2 and 3 (31 frames = 517 ms) are **not called from this file** — unused or reserved.

Board panes worth knowing: `TopBack_a` / `TopBack_b` / `TopBack_c` (three day columns, i.e. the
board is a 3-slot horizontal carousel just like the channel grid), `N_TopBack`, `T_Day_a`.
Focus overlay layout `my_BbsMask_a.brlyt` with `_MaskIn.brlan` / `_MaskOut.brlan`.

Board sounds (`iplBoard.cpp`): `WIPL_SE_BOARD_HOLD` / `WIPL_SE_BOARD_RELEASE` (panned by X,
`:393, :400`), `WIPL_SE_MSG_HOUSE` played at hard-panned ±300 when a message flies to the
left/right envelope slot (`:1095, :1116`), `WSD_SELECT` on day scroll, `WIPL_SE_DECIDE` on
select (`:1686`).

---

## 8. The Wii button, the SD Card icon, and the bottom bar — Q7 & Q9

### 8.1 Complete bottom-bar pane inventory

**[Decomp — direct code evidence]** `src/scene/button/iplButton.cpp:145–181`. Layout file is
**`my_IplTop_e.brlyt`** loaded from **`cmnBtn.ash`** (`:198, :204`).

```cpp
const char* Button::smButtonName[BTN_MAX] = {
    "B_Bbs",      // Message Board button
    "B_Ch",       // "Wii Menu" button (shown on the Board screen)
    "B_Set",      // ← THE WII BUTTON (Wii Settings)
    "B_Cal",      // Calendar (Board screen)
    "B_Add",      // Create Message (Board screen)
    "B_CalExit",  // Calendar exit
    "B_AddExit",  // Create exit
    "B_Add_R",    // Create, right variant
    "B_Dust",     // Trash / delete
    "B_ArwR",     // right scroll arrow hit target
    "B_ArwL"      // left scroll arrow hit target
};
const char* Button::mscGroupName[BTN_MAX] = {
    "G_Bbs","G_Ch","G_Set","G_Cal","G_Add","G_CalExit","G_AddExit","G_Cmn_R","G_Dust",
    "G_ArwR_Focus","G_ArwL_Focus"
};
const char* Button::mscArrowName[ARROW_BTN_MAX] = { "ArwR", "ArwL" };   // the arrow graphics
const char* Button::mscTextPaneName[TEXT_MAX]   = { "T_CalExit", "T_CalAdd_R" };
```

Additional animation groups bound in `create()` (`:212–242`): `G_SeenChange`, `G_ArwR_Ac`,
`G_ArwL_Ac`, `G_ArwR_HDAc`, `G_ArwL_HDAc`, `G_ArwR_End`, `G_ArwL_End`, `G_CalExit`, `G_Dust`,
`G_Cmn_R`, `G_TabaR`, `G_TabaL`, `G_BbsSignal`, `G_BbsSignal_new`, `G_ArwRoop`.

> **The Wii Menu's bottom bar is only ever THREE things: `B_Bbs` (Message Board), `B_Set` (Wii
> button), and the SD icon.** `B_Ch`, `B_Cal`, `B_Add`, `B_CalExit`, `B_AddExit`, `B_Add_R`,
> `B_Dust` all belong to the Message Board / Calendar / letter-writing screens, which share the
> same layout file. Do not render them on the main menu.

### 8.2 On the "half-pill platforms" under the Wii/mail buttons — Q9

**[Not found in decomp.]** The pane *inventory* above is complete and there is no separately
named platform/plate/pedestal pane for either button — but that is **weak evidence**, because
the code only names panes it needs to *find* (hit targets, text boxes, texture swaps). Purely
decorative geometry lives in the `.brlyt` and is never referenced by name from C++, so it would
be invisible to this method by construction.

What the decomp *does* establish:
- The Wii button and Message Board button are **`G_Bbs` and `G_Set` animation groups**, and a
  "group" in NW4R layout is a *named set of panes*. A group can and usually does contain
  several panes (icon + plate + glow + text). So a distinct platform pane is entirely
  consistent with what's here.
- Their hover animations are per-group, meaning **the whole assembly (whatever it contains)
  animates together** on hover, not just the glyph.

**Verdict: unresolved by the decomp; treat the half-pills as a screenshot question.** Don't
claim decomp support either way.

### 8.3 Bottom-bar hover — exact frame counts

`iplButton.cpp:63–119`, `scBtnFadeFrame[]`. Each button has an `in` and `out` frame range on
`my_IplTop_e.brlan`:

| Button | Pane | Hover-in frames | Hover-in ms | Hover-out frames | Hover-out ms |
|---|---|---|---|---|---|
| Message Board | `B_Bbs` | 900 → 906 (6) | **100 ms** | 930 → 938 (8) | **133 ms** |
| **Wii button** | `B_Set` | 6900 → 6906 (6) | **100 ms** | 6930 → 6938 (8) | **133 ms** |
| Wii Menu (board scr.) | `B_Ch` | 5900 → 5906 (6) | 100 ms | 5930 → 5938 (8) | 133 ms |
| Calendar | `B_Cal` | 1900 → 1906 (6) | 100 ms | 1930 → 1938 (8) | 133 ms |
| Create | `B_Add` | 3900 → 3906 (6) | 100 ms | 3930 → 3938 (8) | 133 ms |
| Calendar exit | `B_CalExit` | 2900 → 2906 (6) | 100 ms | 2930 → 2938 (8) | 133 ms |
| Create exit | `B_AddExit` | 4900 → 4906 (6) | 100 ms | 4930 → 4938 (8) | 133 ms |
| Create (right) | `B_Add_R` | 2900 → 2906 (6) | 100 ms | 2930 → 2938 (8) | 133 ms |
| Trash | `B_Dust` | 2900 → **2909** (9) | **150 ms** | 2930 → 2938 (8) | 133 ms |
| Right arrow | `B_ArwR` | 10600 → 10615 (15) | **250 ms** | 10800 → 10815 (15) | **250 ms** |
| Left arrow | `B_ArwL` | 10600 → 10615 (15) | 250 ms | 10800 → 10815 (15) | 250 ms |

> **Key finding: bottom-bar buttons hover in over 100 ms and out over 133 ms — the out is
> deliberately SLOWER than the in.** Almost every fan recreation uses one symmetric duration.
> The arrows, at 250 ms each way, are 2.5× slower than the buttons.

`startPointEvent()` (`iplButton.cpp:396–426`) fires: hover-in animation + **`WIPL_SE_BT_TARGETTING`**
+ `con->rumble()` + `show_balloon()`. `startLeftEvent()` (`:428–452`) fires the out animation
and force-fades the balloon — **no sound on un-hover**.

Hover is reference-counted and clamped at 4 (`if (mbHovered[btnNo] < 4) mbHovered[btnNo]++`),
so up to four Wii Remotes can point at the same button.

### 8.4 Bottom-bar press behaviour

`iplChannelSelect.cpp:2306–2341`:

| Pressed | Sound | Then |
|---|---|---|
| **Message Board** (`B_Bbs`), normal | **`WIPL_SE_DECIDE`** | `tryToStartBoardScene()` — the 333/667 ms transition (§7.2) |
| **Message Board**, safe mode | **`WIPL_SE_GRAY_BUTTON`** | dialog `MESG_CHAN_SEL_SAFE_MODE`, auto-dismiss after **180 frames = 3000 ms** |
| **Wii button** (`B_Set`) | **`WIPL_SE_DECIDE`** | full **fade to black** (`System::getFader()->fadeOut()`), scene → `SCENE_SETTING_BG` |
| **SD card icon** | **`WIPL_SE_DECIDE`** | `IDANIM_SD_BUTTON_SELECT`, fade to black, scene → `SCENE_SD_BUTTON` |

**The Wii button and SD icon do NOT zoom** — they hard-cut through a black fade, unlike
channels (zoom) and the Message Board (layout animation). **[Decomp]**

Note the press guard requires `System::getFader()->getStatus() == EGG::Fader::PREPARE_OUT` —
i.e. **input is dead while any fade is in progress**.

### 8.5 The SD Card icon — greys out, does NOT disappear. Definitive.

**[Decomp — direct code evidence]** `src/scene/sdButton/iplSDMenuButton.cpp`.

Layout **`mn_Sdcard_Btn.brlyt`**, hit-test pane **`"Ac"`**. Seven bound animations (`:30–36`):

```cpp
mpLayout->bindToGroup("mn_Sdcard_Btn_On_Roop.brlan",      "On_Roop",     false);  // idle loop
mpLayout->bindToGroup("mn_Sdcard_Btn_BtnL_In.brlan",      "Btn_L_InOut", false);  // appear
mpLayout->bindToGroup("mn_Sdcard_Btn_BtnL_Out.brlan",     "Btn_L_InOut", false);  // disappear
mpLayout->bindToGroup("mn_Sdcard_Btn_Insert.brlan",       "Insert",      false);  // card inserted
mpLayout->bindToGroup("mn_Sdcard_Btn_BtnL_On.brlan",      "Btn_L_On",    false);
mpLayout->bindToGroup("mn_Sdcard_Btn_BtnL_RollOver.brlan","Btn_L_Roll",  false);  // hover in
mpLayout->bindToGroup("mn_Sdcard_Btn_BtnL_RollOut.brlan", "Btn_L_Roll",  false);  // hover out
```

The card-presence mechanism (`:263–277`):

```cpp
void SDMenuButton::toggle_insert(BOOL bInserted) {
    if (bInserted) { mpLayout->setVisible("N_Btn_On",  true);  mpLayout->setVisible("N_Btn_Off", false); }
    else           { mpLayout->setVisible("N_Btn_On",  false); mpLayout->setVisible("N_Btn_Off", true);
                     if (mpLayout->isPlaying(ANIM_BTN_INSERT)) { stop(); initAnmFrame(); } }
}
```

and the initial state at `create()` (`:47–48`):

```cpp
mpLayout->hide("N_Btn_On");
mpLayout->show("N_Btn_Off");
```

> ✅ **ANSWERED: the SD icon does not disappear. It is two mutually-exclusive pane trees,
> `N_Btn_On` (card present) and `N_Btn_Off` (no card), swapped instantly with no crossfade.**
> Default is `N_Btn_Off`. **[Decomp — direct code evidence]**
>
> **And it stays fully interactive with no card.** `startPointEvent()` checks only `mbEnabled`,
> never insertion state; `CsChanSelSDMenuEventHandler::onEventDerived` launches the SD Card Menu
> unconditionally. **Hover highlight, `WIPL_SE_BT_TARGETTING`, rumble, balloon and click all
> work with an empty slot.**
>
> Whether `N_Btn_Off` is "greyed", "unlit", or a differently-coloured art variant is
> **[Not found in decomp]** — but it is definitely *present and clickable*, which is the part
> the corpus was unsure about.

**Exact position** (`iplSDMenuButton.cpp:50–60`) — the root pane translate:

```cpp
f32 posX = (SCGetAspectRatio() == SC_ASPECT_RATIO_16x9) ? -245.0f : -152.0f;
newPos.x = posX;  newPos.y = -172.0f;
```

Against §1's coordinate space:

| Aspect | x | as fraction of width | y | as fraction of height |
|---|---|---|---|---|
| 16:9 (832 wide) | −245 | **20.6% from left edge** | −172 | 172/228 = **75.4% of half-height from centre** |
| 4:3 (608 wide) | −152 | **25.0% from left edge** | −172 | same |

Note the 4:3 value is exactly **−W/4** — a quarter of the way in.

**SD animation timings** (`iplSDMenuButton.cpp:171–222`):

| Action | Animation | Frames | Duration |
|---|---|---|---|
| Button in (entering menu) | `ANIM_BTN_OUT` played **backward** | 0 → 15 | **250 ms** |
| Button out (leaving menu) | `ANIM_BTN_OUT` forward | 0 → 15 | **250 ms** |
| Card inserted | `mn_Sdcard_Btn_Insert.brlan` | whole file | not in decomp |
| Selected | `mn_Sdcard_Btn_BtnL_On.brlan` | whole file | not in decomp |
| Idle | `mn_Sdcard_Btn_On_Roop.brlan` | loops from `create()` | not in decomp |

Interruption handling is careful — `animation(2)` (button out) resumes from the *current* frame
if the out animation is already mid-play, rather than restarting.

**Insert / eject sounds** (`iplChannelSelect.cpp:374–381`):

```cpp
if (sdState == 1 && mPrevSDState) {
    if (!getButton()->playingSdAnim(40)) {              // 40 == IDANIM_SD_BUTTON_INSERT
        snd::getSystem()->startSE("WIPL_SE_SDCARD_IN");
        getButton()->animation(Button::IDANIM_SD_BUTTON_INSERT);
    }
} else if (mPrevSDState) {
    snd::getSystem()->startSE("WIPL_SE_SDCARD_OUT");    // ← no animation on removal
}
```

**Insertion plays a sound AND an animation; removal plays only a sound.** The visual change on
removal is the instant `N_Btn_On` → `N_Btn_Off` pane swap. **[Decomp]**

Also: the SD icon is **entirely absent in safe/maintenance mode** — every call site is wrapped
in `if (!System::isSafeMode())` (`iplButton.cpp:325, 345, 372`).

### 8.6 The Message Board button's new-mail indicator

`iplButton.cpp:121–135, 226–235, 730–773`:

| Animation | Group | Frames | Duration | Type |
|---|---|---|---|---|
| Mail-count display | `G_BbsSignal` | 1 → 400 | **6667 ms** | loop |
| **New mail arrived** | `G_BbsSignal_new` | 1 → 160 | **2667 ms** | one-shot, **repeats every 3000 ms** |

```cpp
void Button::startNewMailAnm_() {
    mpButtonAnim[ANIM_BOARD_BBS_NEW]->play();
    snd::getSystem()->startSE("WIPL_SE_NEW_ARRIVAL");   // the "you've got mail" jingle
    mTimer.set_msec(3000);                              // and again in 3 s
}
```

`stopMailNumAnm()` / `stopNewMailAnm()` park the animation at frame 0 with `speed = 0` rather
than stopping it — a neat trick worth mirroring (hold at frame 0, don't unmount).

---

## 9. The clock and date — Q8 (the contradiction is RESOLVED)

### 9.1 THE ANSWER: there is no date on the Wii Menu. Only time.

> **⚠️ SUPERSEDED (2026-07-24): this heading overshoots, and its "ship time only" action
> is wrong.** Everything this section proves about the **clock layout** is correct and
> re-verified: `my_Clock_a.brlyt` has no date pane, and `time_tex` carries only hours,
> minutes and `isPM`. But that proves the *clock* has no date — **not that the screen has
> none.** It does:
> - `reference_screen.png` shows `Fri 1/1` under `12:00 AM`; `wii_design_specs.pdf`
>   Figure 1-2 shows `Tue 8/7` under `3:00 PM`; the EU manual figure shows `Wed 01/04`
>   under `15:00`. Nintendo's manual carries a **`Current Date` callout** distinct from
>   `Current Time`, in three separate editions.
> - **The mechanism is in this very document.** §7.1 establishes that the **Message Board
>   is the parent scene** and draws `my_IplTop_c.brlyt` on `DRAW_LAYER_2` beneath the
>   channel grid **every frame**. That layout holds the text boxes `T_Day_a` / `T_Day_b` /
>   `T_Day_c`, filled by `Board::set_text_date()` (`iplBoard.cpp:1319–1321, :1721, :1732`),
>   and §9.8's `get_text_usaeng()` is the formatter — `Weekday M/D`, no zero padding.
>   Independently corroborated: `diddy81/Wii-Theme-Brlyt-Editor` ships a `date()` function
>   that patches `my_IplTop_c.brlyt` at three offsets.
>
> So §9.1's inference that the manual's `Current Date` callout "must point at the Message
> Board area" was half right — it points at something the **Board renders**, but that
> something is **visible on the main menu screen**, directly under the clock.
>
> **Corrected action: ship the date.** Build it as a component separate from the clock,
> sharing only a time source. `context/clock.md` §3 is right about the component and wrong
> about the screen; `context/components/date-display.md` is the definitive treatment;
> `context/tech-prior-art.md` §8 raised the contradiction independently.
> Evidence tier: official ×3 + pixel measurement + decomp (`iplBoard.cpp`).

**[Decomp — direct code evidence, from a `Matching` (byte-exact) file.]**
`src/scene/channelSelect/iplClock.cpp` + `include/scene/channelSelect/iplClock.h`.

The clock layout is **`my_Clock_a.brlyt`**. Its complete pane inventory, as bound and
manipulated by the code:

| Pane | Role |
|---|---|
| `Clock0` | minutes, **ones** digit |
| `Clock1` | minutes, **tens** digit |
| `Clock2` | hours, **ones** digit |
| `Clock3` | hours, **tens** digit |
| `AM_PM` | AM/PM indicator, **left-hand** position (JPN/KOR) |
| `AM_PM_R` | AM/PM indicator, **right-hand** position (USA) |
| `ClockTen` | target of `my_Clock_a_Min.brlan` (the colon — see §9.5) |
| `Num0` … `Num9` | source panes whose *materials* are copied onto `Clock0–3` |
| `AM` / `PM` | source panes whose materials are copied onto `AM_PM` / `AM_PM_R` |
| `T_WiiMenu` | a **text box** — see §9.2 |
| `N_WiiMenu` | positioning root for the whole assembly |
| `N_Clock` | animation target for the clock reveal |

**There is no date pane. No month, no day, no weekday, no year — nothing.** The clock's entire
`time_tex` struct is:

```cpp
typedef struct time_tex {
    s32 hourDigit2;  s32 hourDigit1;
    s32 minuteDigit2; s32 minuteDigit1;
    bool isPM;
} time_tex;
```

`is_same_hms()` compares `hour`, `min` and `mday` — `mday` only so that a midnight rollover
forces a refresh, never to *render* anything.

> ✅ **CONTRADICTION RESOLVED, in favour of `context/clock.md`.**
> `context/clock.md` §3 argued from a GBAtemp forum comment that only the time is shown. **It
> was right.** The Wii Operations Manual diagram labels both "Current Time" and "Current Date",
> but the callout for "Current Date" must point at the **Message Board button / board area**,
> not at the clock — the Board scene renders the date (§9.6), and the Board is the parent scene
> whose furniture is visible on the main menu.
>
> **Action:** `context/components/date-display.md` and any part of the corpus that plans a date
> chip next to the clock on the main menu should be corrected. Ship **time only**.

### 9.2 NEW FINDING: the clock area says "Wii Menu" for the first 3 seconds after boot

**[Decomp — direct code evidence]** This is not in the corpus anywhere and it's a lovely detail.

`iplClock.cpp:76–90` and `iplClock.h:84`:

```cpp
utility::layout::set_string(mpLayout->FindPaneByName("T_WiiMenu"),
                            System::getMessage(MESG_CLOCK_WII_MENU));   // message ID 16

if (m_already_shown_wii_menu) {
    // returning to the menu: snap straight to the clock
    mpLayout->getAnim(ANIM_WII_MENU_CHANGE)->setAnmType(ANIM_TYPE_BACKWARD); init();
    mpLayout->getAnim(ANIM_CLOCK_CHANGE)   ->setAnmType(ANIM_TYPE_BACKWARD); init();
    mState = STATE_NORMAL;
} else {
    m_already_shown_wii_menu = true;
    mWiiMenuTimer.set_msec(WII_MENU_APPEAR_FOR);     // static const int WII_MENU_APPEAR_FOR = 3000;
    mState = STATE_FADE_IN;
}
```

and `stt_fadein()`:

```cpp
if (mWiiMenuTimer()) {
    if (time.sec % 2) {                                  // wait for an ODD second
        mpLayout->getAnim(ANIM_WII_MENU_CHANGE)->play(); // my_Clock_a_Change.brlan on T_WiiMenu
        mpLayout->getAnim(ANIM_CLOCK_CHANGE)->play();    // my_Clock_a_Change.brlan on N_Clock
        mState = STATE_NORMAL;
    }
}
```

**Behaviour:** on the **first** entry into the menu after a cold boot, the clock position
instead displays the localised words **"Wii Menu"**. After **3000 ms** — and then only once the
system clock's seconds value is **odd** (so the colon lands in phase, §9.5) — a crossfade
animation `my_Clock_a_Change.brlan` runs on both `T_WiiMenu` and `N_Clock`, swapping the words
for the clock.

`m_already_shown_wii_menu` is a **static** — it survives scene destruction. So coming back from
a channel or the Message Board, the clock is there immediately (the same animations are
initialised in `ANIM_TYPE_BACKWARD` and snapped to their end). **You only see "Wii Menu" once
per power-on.** **[Decomp]**

### 9.3 12- vs 24-hour and AM/PM — settled per region

`iplClock.cpp:51–67` and `:233–254`:

```cpp
// AM/PM pane visibility
case SC_PRODUCT_AREA_KOR:
case SC_PRODUCT_AREA_JPN: FindPaneByName("AM_PM_R")->SetVisible(false); break;  // uses LEFT  AM_PM
case SC_PRODUCT_AREA_USA: FindPaneByName("AM_PM")  ->SetVisible(false); break;  // uses RIGHT AM_PM_R
default:                  both hidden;                                  break;  // EUR etc: none

// hour conversion
timeTex.isPM = (time.hour >= 12);
if (region != SC_PRODUCT_AREA_EUR && region != SC_PRODUCT_AREA_CHN) {
    time.hour %= 12;
    if ((region == SC_PRODUCT_AREA_USA || region == SC_PRODUCT_AREA_KOR) && time.hour == 0) time.hour = 12;
}
```

| Region | Format | AM/PM shown? | Where | Midnight renders as |
|---|---|---|---|---|
| **USA** | **12-hour** | **YES** | **to the RIGHT of the time** | **12:00 AM** |
| Korea | 12-hour | yes | to the LEFT | 12:00 AM |
| Japan | 12-hour | yes | to the LEFT | 0:00 (hour 0 kept) |
| **Europe** | **24-hour** | **no** | — | 0:00 |
| China | 24-hour | no | — | 0:00 |

> ✅ **Resolves `context/clock.md` Open Gap #2 outright.**
> The fan-wiki claim ("12-hour in the Americas, 24-hour in Europe") is **correct**, and
> `clock.md`'s cautious recommendation to **omit AM/PM** is **wrong for a US-region
> recreation**: the USA build shows **AM/PM, positioned to the right of the digits**.
> Update `clock.md` §2.

### 9.4 Leading-zero suppression

`iplClock.cpp:211`:

```cpp
mpLayout->FindPaneByName("Clock3")->SetVisible(mCurrentTex.hourDigit2 != 0);
```

The hours **tens** digit is hidden when it is 0. So the display is **`9:05`, never `09:05`** —
and in Europe **`0:05` at midnight**, not `00:05`. Minutes are always two digits. **[Decomp]**

### 9.5 The colon blink, and why it matters for phasing

`iplClock.cpp:150–164`:

```cpp
void clock::stt_normal() {
    ...
    if (!(time.sec % 2)) {                                       // on EVERY EVEN second
        mpLayout->getAnim(ANIM_CLOCK_COLON_BLINK)->play();
        mState = STATE_WAIT_ANIM;
    }
}
void clock::stt_wait_anm() {
    if (!mpLayout->isPlaying()) {
        if (time.sec % 2) { mState = STATE_NORMAL; }             // re-arm only on an ODD second
    }
}
```

Animation index 2 is bound from **`my_Clock_a_Min.brlan`** onto pane **`ClockTen`**
(`iplClock.cpp:35`). The name `ANIM_CLOCK_COLON_BLINK` is the *decompiler's* label, not a
symbol from the binary — treat the *identity* as [Inferred], the *timing* as [Decomp].

**Timing:** the animation is retriggered on every even second and the state machine cannot
re-arm until the following odd second → **a 2-second retrigger cycle**, producing the familiar
**1 Hz on/off colon blink** (one second visible, one second not, per cycle). Note the whole
clock's fade-in also waits for an odd second (§9.2) so the blink is phase-aligned from the
start. **[Decomp]**

### 9.6 The digits are TEXTURE SWAPS, not text — and they do NOT animate on change

**[Decomp — direct code evidence, from a byte-exact file. This corrects two claims in
`context/clock.md`.]**

```cpp
static const char* s_time_num[] = { "Num0","Num1",...,"Num9" };

void clock::change_tex() {
    const char* clockTexNames[] = { "Clock0","Clock1","Clock2","Clock3","AM_PM","AM_PM_R" };
    newTexNames[0] = s_time_num[mCurrentTex.minuteDigit1];
    ...
    for (int i = 0; i < CLOCK_TEXTURE_MAX; i++) {
        nw4r::lyt::Pane* destPane = mpLayout->FindPaneByName(clockTexNames[i]);
        nw4r::lyt::Pane* srcPane  = mpLayout->FindPaneByName(newTexNames[i]);
        utility::layout::set_texture(destPane->GetMaterial(), srcPane->GetMaterial());
    }
}
```

The layout contains **ten hidden source panes `Num0`–`Num9`**, each carrying one digit's
texture in its material. Displaying a digit means **copying that material's texture onto the
target pane**. There is no `SetString`, no font rendering, no glyph layout for the digits.

> ⚠️ **CONTRADICTION with `context/clock.md` §6.** That doc states, citing a GBAtemp homebrew
> developer, that "the Wii Menu clock specifically is rendered from a bundled `.ttf` font file
> (i.e., it is genuine vector text, not a sprite/bitmap font)." **The decomp says otherwise:
> the clock digits are ten pre-rendered textures.**
>
> Both can be reconciled — the *textures* were surely authored from Rodin NTLG, and the
> homebrew developer was recreating the look in a text-rendering engine. But for the
> recreation the practical implication is real: **the digits are fixed-metric sprites with
> baked-in shadow/gloss, not live text.** That is exactly why the GBAtemp author "found no font
> that matched and had to hand-tweak" (`clock.md` §6) — he was font-matching a bitmap. If you
> want pixel fidelity, sprite the digits; if you use web text, expect the same mismatch he hit.
>
> Note also `T_WiiMenu` **is** a real `TextBox` (`set_string`, §9.2) — so the clock layout
> mixes a text pane and texture panes. The distinction is per-element.

**And the change is instantaneous.** The layout binds six `my_Clock_a_NumApear.brlan` and six
`my_Clock_a_NumLost.brlan` animations (one per digit + both AM/PM panes,
`iplClock.cpp:36–47`), and `clock::appear()` exists to play them — but:

- `appear()` is called **only** from `stt_disappear()`;
- `stt_disappear()` runs **only** in `STATE_DISAPPEAR`;
- **`STATE_DISAPPEAR` is never assigned anywhere in the codebase** (verified by repo-wide grep:
  the only occurrences of the symbol are its `enum` declaration and its `switch` case).

Meanwhile `stt_normal()` on a time change calls `change_tex()` **directly** and jumps to
`STATE_WAIT_ANIM` with nothing playing.

> ✅ **`context/clock.md` §5's recommendation — "treat the digits as updating
> instantaneously… with no special transition effect" — is CONFIRMED, and now for a concrete
> reason:** retail Wii Menu 4.3 ships per-digit appear/disappear animations that its own state
> machine can never reach. They are dead code. Since `iplClock.cpp` is a **`Matching`**
> (byte-exact) translation unit, this is not a decompilation artefact — it is what the console
> does.
>
> (If you *want* the polish, `my_Clock_a_NumApear` / `NumLost` are Nintendo's own intended
> per-digit transitions — an "authentic but unshipped" embellishment. `appear()` even only
> plays the animation for digits that actually changed, `iplClock.cpp:214–231`.)

### 9.7 Where the clock lives, and it slides with the page — confirmed

`iplChannelSelect.cpp:132–136` and `:554–557`:

```cpp
const char* ChannelSelect::mscClockPaneNames[3] = { "N_Clock0", "N_Clock1", "N_Clock2" };
...
for (int i = 0; i < CLOCK_MAX; i++) {
    nw4r::lyt::Pane* pane = mpLayout->FindPaneByName(mscClockPaneNames[i]);
    mClock.draw(pane);
}
```

and `clock::draw()` (`iplClock.cpp:116–124`):

```cpp
nw4r::math::MTX34 mtx = pane->GetGlobalMtx();
nw4r::lyt::Pane* wiiMenuPane = mpLayout->FindPaneByName("N_WiiMenu");
wiiMenuPane->SetTranslate(nw4r::math::VEC2(mtx.m[0][3], mtx.m[1][3]));
wiiMenuPane->CalculateMtx(*mpLayout->getDrawInfo());
mpLayout->draw(wiiMenuPane);
```

> ✅ **Confirms `page-navigation.md` §6's "bonus finding".** There are exactly **three** clock
> anchor panes, one per full-page container (`BaseMask1`/`2`/`3`), the clock layout is a
> **single instance re-positioned and drawn three times per frame** at each anchor's *global*
> matrix translation, and because those anchors are children of the page containers, **the clock
> translates horizontally with the grid during a page turn.** The `ChMask` pane, drawn last
> (`iplChannelSelect.cpp:561–563`), clips the off-screen copies.
>
> Note the nuance: it is one clock *object* drawn three times, not three clocks. All three show
> the same time and blink in unison.

Ordering within the frame (`ChannelSelect::draw()`, `:530–574`):
page containers → channel thumbnails → `mpLayout->draw()` → disc in/out layer → **clock ×3** →
cursors → balloons → `ChMask` → dragged tile.

**So the clock renders above the grid chrome but below the hover cursor and name balloons.**

### 9.8 Date formatting elsewhere (for whoever builds a Calendar / Board screen)

`src/scene/board/iplBoard.cpp` has seven locale-specific formatters. Two worth recording:

```cpp
void Board::get_text_usaeng(const utility::Date& date, wchar_t* text, u32 textLen) {
    const wchar_t* week = msgMgr->getMessage(scWeekMsgId[utility::Calendar::getWeek(date)]);
    swprintf(text, textLen, L"%ls %d/%d", week, date.month, date.day);      // "Sun 7/24"
}
void Board::get_text_paleng(const utility::Date& date, wchar_t* text, u32 textLen) {
    const wchar_t* week = ...;
    swprintf(text, textLen, L"%ls %02d/%02d", week, date.day, date.month);  // "Sun 24/07"
}
```

**USA English: `Weekday M/D`, no zero padding. PAL English: `Weekday DD/MM`, zero padded.**
Also present: `get_text_jpn`, `get_text_kor`, `get_text_spa`, `get_text_ger`, `get_text_usafre`.
This is the only place the System Menu renders a date, and it is on the **Message Board**,
which is consistent with §9.1's reading of the manual diagram.

---

## 10. Startup / boot sequence — Q11

### 10.1 Boot routing

**[Decomp — direct code evidence]** `src/scene/sceneMisc/iplRootScene.cpp:42–90`:

| Boot type | Initial scene |
|---|---|
| `BS2_BOOT_TYPE_POWER_ON` (and any unrecognised) | **`SCENE_HEALTH`** |
| `BS2_BOOT_TYPE_RETURN_TO_MENU` (coming back from a channel/game) | **`SCENE_BACK_MENU`** |
| `BS2_BOOT_TYPE_RETURN_TO_DATA_MANAGER` | `SCENE_REBOOT` (Data Management) |
| `BS2_BOOT_TYPE_RETURN_ARGS` + `LAUNCH_CODE_SETTING` | `SCENE_REBOOT` (Settings) |
| last title's ticket expired | `SCENE_LIMIT_OVER` |

**There is no logo splash scene.** The scene ID enum (`include/scene/iplSceneCreator.h`) has 38
entries and contains nothing resembling a logo/splash/boot-animation scene. The pre-menu "Wii"
logo people remember is drawn by **BS2 / boot1-boot2** (`src/BS2/`), outside the IPL's scene
system. **[Decomp — direct evidence of absence within the menu]**

### 10.2 Health & Safety screen — exact timings

`src/scene/health/iplHealth.cpp` — a **`Matching`** (byte-exact) file.

Layout **`it_Has_a.brlyt`** from `health.ash`; three animations (`:214–216`):

```cpp
mpLayout->bindToGroup("it_Has_a_SeenIn.brlan",  "G_All");     // fade in,  FORWARD
mpLayout->bindToGroup("it_Has_a_Push.brlan",    "G_Push");    // "press A", LOOP
mpLayout->bindToGroup("it_Has_a_SeenOut.brlan", "G_All");     // fade out, FORWARD
```

Panes: **12 localised warning panes** `Has_JPN`, `Has_US_ENG`, `Has_US_FRA`, `Has_US_SPA`,
`Has_EU_ENG`, `Has_EU_FRA`, `Has_EU_GER`, `Has_EU_ITA`, `Has_EU_SPA`, `Has_EU_NED`, `Has_KOR`,
`Has_CHN`, and 12 matching **"press A to continue"** panes `Push_JPN` … `Push_CHN`
(`:69–98`). All are hidden, then exactly one pair is shown per region+language.

**Timeline** (`:42–50`, `:234–293`):

| Step | Constant / condition | Timing |
|---|---|---|
| `SeenIn` fade-in plays | — | duration in the `.brlan` |
| Wait after fade-in completes | `HAS_TIMER_FADE_IN` | **1000 ms** |
| …*and* system resources finished loading (`has_prepared()`) | — | variable |
| → show the `Push_*` pane, start `it_Has_a_Push.brlan` **looping** | — | — |
| Input ignored until | `HAS_TIMER_PRESS_A` | **2000 ms** after the Push pane appears |
| Auto-advance if the user does nothing | `HAS_TIMER_NOT_PRESS_A` | **60000 ms** |
| Accepted inputs | `BTN_INTERACT \| BTN_BACK` | **A or B**, on the master controller |
| Also advances | a **newly connected** Wii Remote (`mWpadMask != newWpadMask`) | — |
| Sound on advance | **`WIPL_SE_BT_PUSH`** | — |
| Then | `SeenOut` plays, then global `fadeOut()` | — |
| Safe/maintenance mode | hold **+ and −** for `HAS_TIMER_SAFE_MODE` | **3000 ms** |

The **pointer is hidden** during Health & Safety (`System::getPointer()->setVisible(false)`,
`:231`) and re-shown only after the fade-out (`:310`).

### 10.3 The transition into the menu

`skHealth::calcFadeout()` (`:295–322`) reserves `SCENE_BOARD`, which (§7.1) then creates
`SCENE_BUTTON`, `SCENE_CHANNEL_SELECT`, `SCENE_ARROW` in that order.

`ChannelSelect::calcCommon()` (`iplChannelSelect.cpp:296–299`):

```cpp
if (!msInitFlag) {
    snd::getSystem()->startSE("WIPL_SE_WII_START");
    msInitFlag = (BOOL)snd::getSystem()->startBGM("WIPL_BGM_MENU");
}
```

> **`WIPL_SE_WII_START` is the iconic Wii Menu chime, and it fires exactly once per session,
> alongside the start of the looping menu BGM `WIPL_BGM_MENU`.** `msInitFlag` is a static that
> gates it; returning from a channel replays only the BGM
> (`iplChannelSelect.cpp:1039`, `iplChannelTitle.cpp:750`). **[Decomp]**

**On a cold boot the grid does not animate in** — `createBaseLayout()` only starts an entry
animation for `START_FROM_BOARD` / `START_FROM_CHJUMP` (`iplChannelSelect.cpp:679–684`); for
`START_NORMAL` nothing is started, so `calcFadein()` returns immediately and the grid simply
appears behind the global fade. Likewise the arrows are **snapped** into place, not animated
(`initArrowAppearance()`, `:286–294`) — confirming `page-navigation.md` §5.

### 10.4 The global fade — exact

`libs/EGG/include/egg/core/eggColorFader.h` + `libs/EGG/src/core/eggColorFader.cpp`:

```cpp
static const u16 DEFAULT_FRAME = 20;
...
mColor.a = 255 - (frame * 255 / mFadeFrame);   // FADE_IN
mColor.a =        frame * 255 / mFadeFrame;    // FADE_OUT
```

`System` constructs it with the default and never calls `setFrame()` (repo-wide grep finds no
fader `setFrame` callers in `src/`). So:

> **Every scene transition that fades goes through a full-screen BLACK rectangle,
> 20 frames = 333 ms, LINEAR alpha ramp** (not eased — unlike layout animations).
> Colour is `nw4r::ut::Color(0)` = opaque black. **[Decomp]**

Used by: Wii button → Settings, SD icon → SD Card Menu, Health & Safety → menu, and any
scene destruction path.

### 10.5 "Returning to the Wii Menu"

`src/scene/backMenu/iplBackMenu.cpp` (**`Matching`**): layout **`my_BackToWiiMenu.brlyt`**,
animation **`my_BackToWiiMenu.brlan`**, played on loop. Uniquely, this layout is **linked into
the executable** (`extern u8 backToWiiMenu_arc[];`) rather than read from NAND — because when
you're returning from a game, NAND access isn't ready yet. The pointer is hidden; the scene
exits as soon as `has_prepared()` (common + font + sound resources loaded). Its duration is
therefore **load-bound, not fixed**.

---

## 11. Sound-effect catalog — Q10 (complete)

**[Decomp — direct code evidence]** `include/sound/IplSound.rsid` is a **complete dump of the
BRSAR's sound-ID table**, auto-generated from the archive. All 90 entries, verbatim:

| ID | Identifier | ID | Identifier |
|---:|---|---:|---|
| 0 | `HOMESE_HOME_BUTTON` | 45 | `WIPL_SE_PIC_ZOOM_IN` |
| 1 | `HOMESE_RETURN_APP` | 46 | `WIPL_SE_BT_PUSH` |
| 2 | `HOMESE_GOTO_MENU` | 47 | `WIPL_SE_CANCEL` |
| 3 | `HOMESE_RESET_APP` | 48 | `WIPL_SE_CHOICE_CHG` |
| 4 | `HOMESE_FOCUS` | 49 | `WIPL_SE_MSG_DISP` |
| 5 | `HOMESE_SELECT` | 50 | `WIPL_SE_MSG_HOUSE` |
| 6 | `HOMESE_CANCEL` | 51 | `WIPL_SE_FL_PAGE_INC` |
| 7 | `HOMESE_OPEN_CONTROLLER` | 52 | `WIPL_SE_FL_PAGE_DEC` |
| 8 | `HOMESE_CLOSE_CONTROLLER` | 53 | `WIPL_SE_ERROR` |
| 9 | `HOMESE_VOLUME_PLUS` | 54 | `WIPL_SE_BOARD_DUMP` |
| 10 | `HOMESE_VOLUME_MINUS` | 55 | `WIPL_SE_BOARD_HOLD` |
| 11 | `HOMESE_VOLUME_PLUS_LIMIT` | 56 | `WIPL_SE_BOARD_RELEASE` |
| 12 | `HOMESE_VOLUME_MINUS_LIMIT` | 57 | `WIPL_SE_GRAY_BUTTON` |
| 13 | `HOMESE_NOTHING_DONE` | 58 | **`WIPL_BGM_MENU`** |
| 14 | `HOMESE_VIBE_ON` | 59 | `WIPL_SE_OUTPUT_MODE_SELECT` |
| 15 | `HOMESE_VIBE_OFF` | 60 | `WIPL_SE_COPYING` |
| 16 | `HOMESE_START_CONNECT_WINDOW` | 61 | `WIPL_SE_INFO_WINDOW` |
| 17–20 | `HOMESE_CONNECTED` … `CONNECTED4` | 62 | **`WIPL_SE_CH_HOLD`** |
| 21 | `HOMESE_END_CONNECT_WINDOW` | 63 | **`WIPL_SE_CH_DRAG`** |
| 22 | **`WSD_SELECT`** | 64 | **`WIPL_SE_CH_SET`** |
| 23 | `WIPL_SE_CALENDAR_SCROLL` | 65 | **`WIPL_SE_CH_NOT_MOVE`** |
| 24 | `WIPL_SE_BOARD_SELECT` | 66 | `WIPL_SE_NEW_ARRIVAL` |
| 25 | `WIPL_ME_VIRTUAL_CONSOLE` | 67 | `WIPL_SE_B_SCROLL` |
| 26 | **`WIPL_SE_WII_START`** | 68 | **`WIPL_SE_SDCARD_IN`** |
| 27 | `WIPL_ME_NO_DISC_BANNER` | 69 | **`WIPL_SE_SDCARD_OUT`** |
| 28 | `WIPL_SE_COPY_FINISH` | 70 | `WIPL_SE_SK_PAGE_CHG` |
| 29 | `WIPL_ME_GC_BANNER` | 71 | `WIPL_SE_SK_OPEN` |
| 30 | `WIPL_ME_INVALID_DISC_BANNER` | 72 | `WIPL_SE_SK_CANCEL_CLOSE` |
| 31 | `WIPL_ME_SD_BANNER` | 73 | `WIPL_SE_SK_DECIDE_CLOSE` |
| 32 | **`WIPL_SE_CH_SELECT`** | 74 | `WIPL_SE_SK_SWITCHING_01` |
| 33 | **`WIPL_SE_CH_UNSELECT`** | 75 | `WIPL_SE_CHAR_FOCUS` |
| 34 | **`WIPL_SE_BT_TARGETTING`** | 76 | `WIPL_SE_CHAR_CURSOR` |
| 35 | **`WIPL_SE_CH_TARGETTING`** | 77 | `WIPL_SE_CHAR_CURSOR_FIX` |
| 36 | **`WIPL_SE_DECIDE`** | 78 | `WIPL_SE_CHAR_DELETE` |
| 37 | `WIPL_SE_DATE_FOCUS` | 79 | `WIPL_SE_CHAR_DELETE_ERROR` |
| 38 | `WIPL_SE_BOARD_FOCUS` | 80 | `WIPL_SE_CHAR_INPUT` |
| 39 | `WIPL_SE_MESSAGE_SCROLL` | 81 | `WIPL_SE_CHAR_DECIDE` |
| 40 | `WIPL_SE_BOARD_DRAG` | 82 | `WIPL_SE_LINE_SCROLL` |
| 41 | `WIPL_SE_DATE_SELECT` | 83 | `WIPL_SE_SK_PREDICT_ON` |
| 42 | **`WIPL_SE_BALLOON`** | 84 | `WIPL_SE_SK_PREDICT_OFF` |
| 43 | `WIPL_SE_BOARD_UNSELECT` | 85 | `WIPL_SE_SK_SWITCHING_02` |
| 44 | `WIPL_SE_PIC_ZOOM_OUT` | 86 | `WIPL_SE_SK_SWITCH_TO_KETAI` |
| | | 87 | `WIPL_SE_SYMBOL_PAGE_OPEN` |
| | | 88 | `WIPL_SE_CHAR_LARGER` |
| | | 89 | `WIPL_SE_CHAR_LOWER` |

**Bold = fires on the main Wii Menu screen.** `WIPL_SE_SK_*` and `WIPL_SE_CHAR_*` belong to the
software keyboard; `HOMESE_*` to the HOME menu; `WIPL_ME_*` are jingles ("ME" = music entry).

Banks and players are also enumerated in the same file:

```
BANK_HOMEBUTTON=0  BANK_SYSTEM_SE=1  BANK_BGM=2  BANK_SOFTWARE_KEYBOARD_SE=3

PLAYER_FOCUS=0  PLAYER_DEFAULT=1  PLAYER_FADE_SE=2  PLAYER_NORMAL=3  PLAYER_SYSTEM=4
PLAYER_SYSTEM_2=5  PLAYER_SYSTEM_DECIDE=6  PLAYER_SYSTEM_FOCUS=7  PLAYER_BGM=8
PLAYER_WII_START=9  PLAYER_MSG_DISP=10  PLAYER_SCROLL=11  PLAYER_SWITCH=12
PLAYER_SELECT=13  PLAYER_WINDOW=14  PLAYER_MAIL_CLOSE=15  PLAYER_SDCARD=16
```

Separate "players" = separate voice channels: e.g. the focus tick, the decide sound and the BGM
never cut each other off. Worth mirroring with independent `AudioBufferSourceNode`s.

> **Important footnote in the file itself:** *"So the Wii Menu never gets BRSAR stuff by its ID,
> but instead by its name as a string … except for `iplTVRCManager`."* Every call site in the
> code passes the **string literal**, which is why the identifiers above are quotable verbatim.

### Main-menu sound map (consolidated)

| Action | Sound |
|---|---|
| Menu first appears (once per power-on) | `WIPL_SE_WII_START` + `WIPL_BGM_MENU` |
| Point at a channel tile | `WIPL_SE_CH_TARGETTING` |
| Point at a button / arrow / SD icon | `WIPL_SE_BT_TARGETTING` |
| Un-hover anything | *(silence)* |
| Name balloon pops in (267/333 ms after hover) | `WIPL_SE_BALLOON` |
| Click a channel | `WIPL_SE_BT_PUSH`, then `WIPL_SE_CH_SELECT` when the zoom starts |
| Back out of the preview | `WIPL_SE_CH_UNSELECT` |
| Press "Start" | `WIPL_SE_DECIDE` |
| Press a **disabled** button | `WIPL_SE_GRAY_BUTTON` |
| Click Message Board / Wii button / SD icon | `WIPL_SE_DECIDE` |
| Page turn (arrow, +/−, or drag-hold) | `WSD_SELECT` |
| Grab a channel (A+B) | `WIPL_SE_CH_HOLD` *(panned by X)* |
| Moving a grabbed channel | `WIPL_SE_CH_DRAG` *(held; panned; speed-scaled)* |
| Drop into an empty slot | `WIPL_SE_CH_SET` *(panned)* |
| Drop rejected | `WIPL_SE_CH_NOT_MOVE` *(panned)* |
| SD card inserted / removed | `WIPL_SE_SDCARD_IN` / `WIPL_SE_SDCARD_OUT` |
| New mail arrives (repeats every 3 s) | `WIPL_SE_NEW_ARRIVAL` |
| Health & Safety dismissed | `WIPL_SE_BT_PUSH` |

`context/audio.md` could previously confirm two identifiers; the table above is the full
main-menu set with exact trigger points.

---

## 12. Master animation-frame table

Everything the decomp pins down, in one place. **ms = NTSC 60 Hz.**

### `my_IplTop_a.brlan` — the channel-grid layout

| Region | Frames | Duration | Meaning |
|---|---|---|---|
| 0 → 20 | 20 | **333 ms** | page scroll **left** |
| 40 → 60 | 20 | **333 ms** | page scroll **right** |
| 70 → 90 | 20 | **333 ms** | channel grid → **Message Board** |
| 100 → 120 | 20 | **333 ms** | Message Board → channel grid (also ChJump entry) |
| 200 → 228 | 28 | **467 ms** | **channel zoom-in**; played backward for zoom-out |

### `my_IplTop_e.brlan` — the button bar (`scAnmFrame[]`, `iplButton.cpp:16–61`)

| Animation | Frames | Duration | Notes |
|---|---|---|---|
| `FROM_CH_SEL_TO_BOARD` | 1000 → 1040 (40) | **667 ms** | |
| `FROM_CH_SEL_TO_SETTING` | 7000 → 7040 (40) | 667 ms | marked **unused** |
| `FROM_SETTING_TO_CH_SEL` | 8000 → 8040 (40) | 667 ms | marked **unused** |
| `FROM_BOARD_TO_CH_SEL` | 6000 → 6040 (40) | **667 ms** | |
| `FROM_BOARD_TO_CALENDAR` | 2000 → 2050 (50) | 833 ms | |
| `BACK_TO_BOARD` | 3000 → 3050 (50) | 833 ms | |
| `BACK_TO_BOARD_ALT` | 3500 → 3550 (50) | 833 ms | maybe unused |
| `FROM_BOARD_TO_MAIL_SEL` | 4000 → 4026 (26) | 433 ms | |
| `SELECT_LEFT_BUTTON` | 5000 → 5050 (50) | 833 ms | |
| `DISAPPEAR_BOARD_BUTTON` | 3100 → 3113 (13) | **217 ms** | |
| `APPEAR_BOARD_BUTTON` | 3426 → 3439 (13) | 217 ms | |
| `APPEAR_LEFT_BUTTON` | 3113 → 3126 (13) | 217 ms | |
| `DISAPPEAR_LEFT_BUTTON` | 3213 → 3226 (13) | 217 ms | |
| `APPEAR/DISAPPEAR_LEFT_AND_TRASH` | 3600 → 3613 / 3620 → 3633 (13) | 217 ms | |
| `APPEAR/DISAPPEAR_LEFT_AND_RIGHT` | 3313 → 3326 / 3413 → 3426 (13) | 217 ms | |
| `APPEAR/DISAPPEAR_ALL_BUTTONS` | 3640 → 3653 / 3660 → 3673 (13) | 217 ms | |
| `ARROW_*_SELECT` | 10700 → 10730 (30) | **500 ms** | |
| `ARROW_*_SELECT_ALT` (`HDAc`) | 10500 → 10580 (80) | 1333 ms | marked **unused**; repeat sub-range 10503 → 10580 |
| `ARROW_*_APPEAR` | 10150 → 10160 (10) | **167 ms** | |
| `ARROW_*_DISAPPEAR` | 10100 → 10110 (10) | **167 ms** | |
| `SELECT_CALENDAR_EXIT` | 3000 → 3020 (20) | 333 ms | |
| `SELECT_TRASH_BUTTON` | 2800 → 2820 (20) | 333 ms | |
| `SELECT_CREATE_R` | 3000 → 3020 (20) | 333 ms | |
| `*_ARROW_SHOW_LETTER` | 0 → 10 (10) | 167 ms | Message Board only |
| `*_ARROW_HIDE_LETTER` | 30 → 40 (10) | 167 ms | Message Board only |
| Arrow idle loop `G_ArwRoop` | 10000 → 10055 (55) | **917 ms** loop | |
| Mail count `G_BbsSignal` | 1 → 400 (400) | **6667 ms** loop | |
| New mail `G_BbsSignal_new` | 1 → 160 (160) | **2667 ms**, repeat every 3000 ms | |
| Hover in / out (all buttons) | see §8.3 | 100 / 133 ms | arrows 250 / 250 ms |

### Other exact timings

| Thing | Value | Source |
|---|---|---|
| **Global black fade (in or out)** | **20 frames = 333 ms, LINEAR** | `eggColorFader.cpp` |
| **Channel zoom (both directions)** | **28 frames = 467 ms, smoothstep** | `initChanZoomParam` |
| Preview screen crossfade alpha | 28 frames, 0 → 255 | `iplChannelTitle.cpp:352` |
| Banner sound fade-out on back-out | 28 frames | `iplChannelTitle.cpp:1439` |
| Disc-channel tile fade-in | 28 frames = 467 ms | `iplChannelSelect.cpp:719` |
| **Channel balloon hover delay** | **20 frames = 333 ms** | `iplChannelObj.cpp:1111` |
| **Button balloon hover delay** | **16 frames ≈ 267 ms** | `iplBalloon.h:16` |
| **Drag-hold page-turn dwell** | **15 frames = 250 ms** | `iplChannelSelect.cpp` `calcNormalDrag` |
| **Rejected-drop settle** | **20 frames = 333 ms** | `calcNormalReleaseWait` |
| **SD button in / out** | **15 frames = 250 ms** | `iplSDMenuButton.cpp:180, 194` |
| Channel launch A-hold | **5 frames ≈ 83 ms** | `iplController.cpp:122` |
| Rumble pulse | **7/120 s = 58.3 ms** | `iplController.cpp:47` |
| Empty-slot idle loop | **≥ 2000 frames ≈ 33.3 s**, random phase | `createEmptyThumbnail()` |
| **"Wii Menu" text before clock** | **3000 ms** (then next odd second) | `iplClock.h:84` |
| Colon blink retrigger | every even second (**2 s cycle**) | `iplClock.cpp:150` |
| H&S: wait after fade-in | **1000 ms** | `iplHealth.cpp:44` |
| H&S: input lockout | **2000 ms** | `iplHealth.cpp:45` |
| H&S: auto-advance | **60000 ms** | `iplHealth.cpp:46` |
| H&S: safe-mode hold | **3000 ms** | `iplHealth.cpp:48` |
| Safe-mode dialog auto-dismiss | **180 frames = 3000 ms** | `iplChannelSelect.cpp:2312` |
| New-mail jingle repeat | **3000 ms** | `iplButton.cpp:763` |
| Message Board day scroll | **20 frames = 333 ms** | `iplBoard.cpp:29` |

---

## 13. Complete asset-name index

Useful for naming components and for anyone who later dumps a real NAND.

| Layout (`.brlyt`) | Archive | What it is |
|---|---|---|
| `my_IplTop_a.brlyt` | `chanSel.ash` | **the channel grid** (5-slot carousel, clock anchors, mask) |
| `my_IplTop_b.brlyt` | `chanSel.ash` | **empty channel slot** (panes `Ch0`, `Ch1`) |
| `my_IplTop_c.brlyt` | `board.ash` | **Message Board background** |
| `my_IplTop_d.brlyt` | `chanSel.ash` | **channel hover cursor / highlight** (pane `Cursur_a`) |
| `my_IplTop_e.brlyt` | `cmnBtn.ash` | **the bottom button bar + the two arrows** |
| `my_IplTopBalloon_a.brlyt` | `balloon.ash` / `chanSel.ash` | **name balloon** (`N_Balloon`, `W_Base`, `W_Shade`, `T_Balloon`) |
| `my_Clock_a.brlyt` | `chanSel.ash` | **the clock** |
| `my_ChTop_a.brlyt` | — | **channel preview overlay** ("Start" / "Wii Menu") |
| `mn_Sdcard_Btn.brlyt` | `cmnBtn.ash` | **SD card icon** (`Ac`, `N_Btn_On`, `N_Btn_Off`) |
| `my_TVMask_a.brlyt` | `chanSel.ash` | drag: dim-mask over other tiles |
| `my_TVShade_a.brlyt` | `chanSel.ash` | drag: the floating dragged tile |
| `my_TVApear_a.brlyt` | `chanSel.ash` | drag: drop landing effect |
| `my_BbsMask_a.brlyt` | `board.ash` | Message Board focus mask |
| `my_DiskCh_a.brlyt` | — | Disc Channel preview |
| `my_DiskCh_b.brlyt` | `diskThum.ash` | **"no disc" tile** (looping) |
| `my_DiskCh_In.brlyt` | `diskThum.ash` | disc insert/eject effect (`DiskIn`, `16x9`) |
| `my_GCIcon_a.brlyt` | `diskThum.ash` | GameCube disc tile |
| `my_GCTop_a.brlyt` | — | GameCube disc preview |
| `it_Has_a.brlyt` | `health.ash` | Health & Safety screen |
| `my_BackToWiiMenu.brlyt` | *linked into the DOL* | "returning to the Wii Menu" |
| `icon.brlyt` | per-channel banner | a channel's tile art |
| `banner.brlyt` | per-channel banner | a channel's full-screen preview |

| Animation (`.brlan`) | Drives |
|---|---|
| `my_IplTop_a.brlan` | grid: page scroll, board transition, zoom (frame-range selected) |
| `my_IplTop_b.brlan` | empty-slot idle loop |
| `my_IplTop_c.brlan` | Message Board day scroll (frame-range selected) |
| `my_IplTop_d_FocusOn / _FocusOff / _Select.brlan` | channel hover cursor |
| `my_IplTop_e.brlan` | every bottom-bar + arrow animation (frame-range selected) |
| `my_IplTopBalloon_a_BalloonInOut.brlan` | balloon in (forward) / out (backward) |
| `my_Clock_a_Change.brlan` | "Wii Menu" → clock crossfade |
| `my_Clock_a_Min.brlan` | colon blink (on pane `ClockTen`) |
| `my_Clock_a_NumApear / _NumLost.brlan` | per-digit in/out — **bound but never played** |
| `my_ChTop_a_FocusBtn_on / _FocusBtnA_off.brlan` | preview button hover |
| `my_ChTop_a_SelectBtn_Ac.brlan` | preview button press |
| `my_ChTop_a_OnBtn / _OffBtn.brlan` | preview button enable / disable |
| `my_ChTop_a_ChangeIn / _ChangeRoop / _ChangeOut.brlan` | preview channel swap |
| `my_ChTop_a_ChangeTextIn / _ChangeTextOut.brlan` | preview button label swap |
| `mn_Sdcard_Btn_On_Roop.brlan` | SD icon idle loop |
| `mn_Sdcard_Btn_BtnL_In / _BtnL_Out.brlan` | SD icon appear / disappear |
| `mn_Sdcard_Btn_BtnL_RollOver / _RollOut.brlan` | SD icon hover |
| `mn_Sdcard_Btn_Insert.brlan` | SD card inserted |
| `mn_Sdcard_Btn_BtnL_On.brlan` | SD icon selected |
| `my_TVMask_a_Apear / _Lost.brlan` | drag mask |
| `my_TVShade_a_Apear / _Lost.brlan` | dragged tile |
| `my_TVApear_a_Apear / _Lost.brlan` | drop effect |
| `it_Has_a_SeenIn / _Push / _SeenOut.brlan` | Health & Safety |
| `icon_Start.brlan` / `icon.brlan` / `icon_Whole.brlan` | channel tile art |
| `banner_Start.brlan` / `banner_Loop.brlan` | channel preview banner |

---

## 14. Other notable findings (Q12)

1. **Channel tiles with no dynamic module get a random idle phase.**
   `ChannelObj::createWadThumbnail()`: if the channel has no RSO/CS banner module, its
   `icon.brlan` is seeded to `minFrame + rand() % (maxFrame - minFrame)`. **Channels whose art
   animates do NOT animate in sync with each other.** Channels *with* a module start at
   `minFrame`. **[Decomp]**

2. **Multi-language banners are baked into a single layout.** `ChannelObj::setLangPane()`
   walks the layout's *groups* looking for one named `JPN`/`ENG`/`GER`/`FRA`/`SPA`/`ITA`/`NED`/
   `CHN`/`KOR`, hides everything else, and shows only the matching group
   (`iplChannelObj.cpp:612–669`). A channel tile contains **every** language's text and shows
   one. **[Decomp]**

3. **Widescreen is a texture swap, not a re-layout.** `createBaseLayout()`
   (`iplChannelSelect.cpp:666–675`) grabs the texture from panes `ChangeTex16x9` and
   `Picture_16` and assigns them onto `Picture_00..04` and `Edge0..4`. The pane *geometry* is
   the same; only the artwork changes. Same trick in `my_TVShade_a` (`4x3` ← `16x9`),
   `my_DiskCh_In` (`DiskIn` ← `16x9`), and `my_ChTop_a` (12 `Fre_*` panes). **[Decomp]**

4. **The grid index layout is row-major, 4 per row.** `MAX_CHANNEL_COLUMN 3`,
   `MAX_CHANNEL_ROW 4` — the names are transposed relative to what you'd expect. Evidence: page
   look-ahead loops step `i += MAX_CHANNEL_ROW` from 0 to reach `{0,4,8}` (the **leftmost
   column**) and from 3 to reach `{3,7,11}` (the **rightmost column**)
   (`iplChannelSelect.cpp:1431, 1439`). So **index = row × 4 + col, 4 columns × 3 rows.**
   **[Decomp]**

5. **Neighbouring pages are pre-created and the menu blocks on them.** `create()` builds
   `mCurrentPage ± 1` up front (`:255–260`), and `isPageCreatedAllDone()` requires the current
   page fully built plus the adjacent pages' edge columns. Page turns *wait* on it
   (`calcNormalWaitScrl`). A no-op for a web build, but it explains the occasional stall on
   hardware. **[Decomp]**

6. **Everything on the grid is drawn with a per-tile scissor rectangle.**
   `setChannelScissor()` (`iplChannelSelect.cpp:1622+`) computes a GX scissor box from each
   tile's translate ± `mChanThumbOff`, and `GXSetScissor(0,0,0,0)` when fully off-screen.
   **Channel art is hard-clipped to its 128×96 / 170×96 cell** — a channel banner cannot bleed
   outside its tile. CSS equivalent: `overflow: hidden` on every tile. **[Decomp]**

7. **The arrows are drawn in a separate late pass** — confirmed independently of
   `page-navigation.md`. `src/scene/button/iplArrow.cpp` is a whole scene whose only job is:
   set the arrow panes visible, draw them, set them invisible again, then draw all the balloons.
   **Both the arrows AND every text balloon render above everything else, including the dragged
   tile.** `page-navigation.md` §3 covered the arrows; **the balloons share that top layer** and
   should get the same `z-index`. **[Decomp]**

8. **Input is dead during any fade.** Every press handler is gated on
   `System::getFader()->getStatus() == EGG::Fader::PREPARE_OUT`
   (`iplChannelSelect.cpp:2307, 2353`). **[Decomp]**

9. **Only the master (Player 1) controller drives menu-level input.**
   `System::getMasterController()` for +/− paging and for Health & Safety. Pointer-driven
   hovering, however, is genuinely multi-remote (hover counters, `mHoveredObjs[WPAD_MAX_CONTROLLERS]`
   in `Board`). **[Decomp]**

10. **The current page persists to NAND.** `ChannelSelect::destroy()`:
    `System::getSaveData()->setLastPrevPage(mCurrentPage);` — confirms `page-navigation.md` §6.
    So does channel *order* (§6.3). Use `localStorage` for both. **[Decomp]**

11. **Safe / maintenance mode strips the menu down.** No SD icon, Message Board button greyed
    (`WIPL_SE_GRAY_BUTTON` + a 3-second dialog), `sd_menu_btn` never given an event handler
    (`iplChannelSelect.cpp:278–279`). A fun optional easter-egg mode for the recreation.
    **[Decomp]**

12. **Two decompiler comments flag an oddity worth knowing:** in both
    `ChannelSelectEventHandler::onEvent` and `ChannelTitleEventHandler::onEvent`, the comment
    reads *"Drag and trig events are swapped, but still act as intended?"* — `ON_DRAG` carries
    the *launch* and `ON_TRIG` carries the *grab*. If you port the state machine literally,
    don't "fix" this; it's how the original behaves.

---

## 15. Corrections and confirmations for the existing corpus

### Contradictions — fix these

| Doc | Claim | Decomp says |
|---|---|---|
> **⚠️ SUPERSEDED (2026-07-24): one row of the table below is itself wrong.** The row
> reading *"The corpus's reading of the Operations Manual diagram ('Current Date' is on
> the main menu) — **Wrong**"* is **not** correct: the date **is** on the main menu, drawn
> by the Message Board layer (`my_IplTop_c.brlyt`, panes `T_Day_a/b/c`) rather than by the
> clock. See the marker at §9.1. Every other row in this table stands.

| `context/clock.md` §6 | "the clock is rendered from a bundled `.ttf` … genuine vector text, not a sprite/bitmap font" | **Wrong.** Digits are texture swaps from ten hidden `Num0`–`Num9` panes (`iplClock.cpp:176–212`, a byte-exact file). Only `T_WiiMenu` is real text. §9.6 |
| `context/clock.md` §2 + Open Gap #2 | recommends **no AM/PM** as the safer default | **Wrong for USA.** The USA build explicitly shows AM/PM, on the **right** of the digits (`iplClock.cpp:58–60`). JPN/KOR show it on the **left**. EUR/CHN show none and use 24-hour. §9.3 |
| `context/channels.md` / `animations-interactions.md` (wherever rearranging is described) | any implication that channels **swap** or that neighbours **shuffle** | **Wrong.** `isReleasableArea()` permits only an **empty** cell or the origin. Occupied cells reject the drop with `WIPL_SE_CH_NOT_MOVE`. §6.3 |
| The corpus's reading of the Operations Manual diagram ("Current Date" is on the main menu) | date shown next to the clock | **Wrong.** The clock layout has no date pane at all. The date is rendered by the **Message Board** (`Board::get_text_*`). §9.1 / §9.8 |
| `context/audio.md` (if it treats "the hover sound" as one sound) | single hover tick | **Two distinct sounds:** `WIPL_SE_CH_TARGETTING` (channels, ID 35) vs `WIPL_SE_BT_TARGETTING` (buttons/arrows/SD, ID 34). §2.3 |
| Any doc assuming symmetric hover in/out timing | — | Bottom-bar buttons are **100 ms in, 133 ms out**. §8.3 |

### Confirmations — these were right

- `context/clock.md` §3: **time only on the main menu, no date.** ✅ Vindicated.
- `context/clock.md` §5: **digits change instantly, no transition.** ✅ Vindicated — and now
  explained (the transition animations exist but are unreachable dead code).
- `context/clock.md` §4: the clock is **non-interactive**. ✅ No `gui::PaneManager`, no
  hit-testing, no event handler anywhere in `clock` — it is pure decoration.
- `context/clock.md` §1: the clock is **anchored to the grid**, not to the viewport. ✅ It is
  positioned from `N_Clock0/1/2` panes *inside* the page containers — which also means
  `clock.md` §1's *other* claim, that it "stays fixed on-screen as you page", is **wrong**: it
  slides with the grid. §9.7
- `page-navigation.md` §2: reference screenshot is 16:9 with a 170×96 tile canvas. ✅ Exactly
  `cfChanThumbOfss[1] = {85, 48}`. §1
- `page-navigation.md` §6: 20-frame / 333 ms horizontal page slide; three clock panes; page
  persistence. ✅ All re-confirmed from independent call sites.
- `page-navigation.md` §4.5: 15-frame drag-hold dwell on the arrow. ✅ Confirmed from
  `calcNormalDrag()`.
- `page-navigation.md` §9: 4 pages × 12 = 48, `mMaxPages` unconditionally 4. ✅
- `page-navigation.md` §11 item 2: page-transition easing "probably ease-in-out". ✅ **Upgraded
  to exact:** smoothstep, `3t² − 2t³` — see §3.2.

### Additions worth folding back into other docs

- `context/animations-interactions.md`: adopt **smoothstep** (`cubic-bezier(0.5,0,0.5,1)`) as
  the project's default easing token, and **333 ms** as the default transition duration — both
  are load-bearing constants in the original.
- `context/technical-specs.md`: add the **608×456 / 832×456 virtual coordinate space** (§1) as
  the layout basis.
- `context/audio.md`: replace with §11's full table, and add the **stereo panning by pointer X**
  behaviour for the drag sounds (§6.5).
- `context/components/date-display.md`: retitle/rescope — there is no date on the main menu.
  If a date component is wanted, the authentic place for it is a Message Board / Calendar
  screen, with `Weekday M/D` (US) or `Weekday DD/MM` (PAL) formatting (§9.8).
- New component doc worth writing: **`channel-tile.md`**, covering §2, §5 and §6 together —
  cursor layout, balloon, empty-slot layout, drag masks.

---

## 16. Honest coverage limits

**What the decomp settled outright:** the SD icon's greyed-vs-gone question; empty-slot
behaviour; drag-and-drop drop rules; the date question; AM/PM by region; the full sound
catalog; the boot timeline; the launch-zoom duration **and** its exact easing function; and
every frame count on the bottom bar.

**What it cannot settle, by construction:**

1. **Any animation's visual content.** Frames 70→90 of `my_IplTop_a.brlan` are exactly 333 ms
   of *something*; whether the Message Board "flips up like a folder" is unresolved (§7.3).
   Same for the channel hover cursor (§2.1), the empty-slot shimmer (§5.1), the dragged-tile
   ghost (§6.4), and the SD icon's on/off art (§8.5).
2. **Pane positions, sizes, colours.** Except the handful the code sets programmatically —
   the SD button root at (−245, −172) / (−152, −172), tile half-extents 85/64 × 48, balloon
   minimum width 160/219, balloon +50 Y offset, balloon edge clamps of 60/120/30, balloon text
   limit 391.5 px / 20 chars. Everything else lives in the `.brlyt`.
3. **Whether the bottom bar has "half-pill platforms."** Genuinely unresolvable this way —
   decorative panes are never named in code (§8.2). Screenshot question.
4. **Sub-animation frame counts for whole-file `.brlan`s.** Where the code plays a file
   end-to-end (channel hover cursor, SD icon hover, preview button focus) rather than selecting
   a frame range, the duration is in the asset. Where the code *does* select a range (the whole
   button bar, the grid layout, the board), we have it exactly.
5. **The channel name balloon's vertical direction** (above or below the tile) — the magnitude
   is exact, the sign is ambiguous between two camera conventions (§2.4).
6. **Regional/version drift.** This is **4.3** only. Anything about System Menu 1.0–4.2 (e.g.
   `context/clock.md` §7's note that the clock did not exist before 3.0) is untouched by this
   pass and remains sourced only from WiiBrew.

**On decompilation reliability itself:** `iplClock.cpp`, `iplHealth.cpp`, `iplArrow.cpp` and
`iplBackMenu.cpp` are **`Matching`** — byte-exact recompiles, i.e. proof-grade. The larger scene
files are **`Equivalent`** — the logic is right, only instruction scheduling differs. Neither
category is guesswork. There is **no stubbing** in the subsystems covered here.
