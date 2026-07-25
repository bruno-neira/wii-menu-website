# Component Deep-Dive: The Wii Button (bottom-left of the Wii Menu bottom bar)

Scope: the round "Wii" button in the bottom-left corner of the Wii Menu (Channel grid) screen —
the one that opens Wii Settings / Data Management. Covers exact visual design, proportions and
placement, states, animation, click behavior and the transition into the Wii Options screen,
audio, version history, and the wordmark itself.

**Sourcing tags**
- **[Official]** — Nintendo-authored (printed Operations Manual, Nintendo support page, Nintendo
  developer spec).
- **[Decomp]** — derived from `koopthekoopa/wii-ipl`, a **source-level decompilation of the real
  Wii System Menu binary** (targets System Menu **4.3** — configs `43U`/`43E`/`43J`/`43K`). This is
  fan-maintained, but it is *literal Nintendo code recovered from the shipped executable*, so for
  behavior (state machines, sound IDs, animation frame ranges, pane names) it is the strongest
  non-Nintendo evidence available and materially stronger than wiki/forum consensus. Treated as its
  own tier throughout.
- **[Asset]** — measured from ripped/redrawn Wii Menu texture assets (Dolphin texture dumps),
  which preserve the *original* texture dimensions in their filenames.
- **[Screenshot]** — pixel-measured by me from `reference_screen.png` in this repo (420×236, 16:9).
- **[Fan/community]** — wikis, forums, fan analysis.
- **[Inferred]** — my reasoning, explicitly flagged.

**Two new primary sources found in this pass** (neither is cited anywhere else in `context/`):

1. **`koopthekoopa/wii-ipl` — Wii System Menu decompilation.**
   <https://github.com/koopthekoopa/wii-ipl>. Relevant files:
   `include/scene/button/iplButton.h`, `src/scene/button/iplButton.cpp`,
   `src/scene/channelSelect/iplChannelSelect.cpp`,
   `src/scene/settingSelect/iplSettingBg.cpp`, `include/scene/settingSelect/iplSettingSelect.h`,
   `libs/EGG/src/core/eggColorFader.cpp`.
   This settles the hover animation timing, the exact sound-effect IDs, the absence of a click
   animation, and the transition-into-Options question **definitively**.
2. **`Alan-bur/WM4K` — Wii Menu 4K Texture Pack.**
   <https://github.com/Alan-bur/WM4K>. Dolphin custom-texture packs name files
   `tex1_<origWidth>x<origHeight>_<hash>_<format>.png`, so the filenames record the **original Wii
   texture dimensions**. The Wii button's face is `USA/Wii Menu/tex1_80x80_32802973ae1739b5_3.png`
   → an **80×80** texture. (The pixels are a hand-redraw at 8×, so use it for *structure and
   proportion*, not for exact color — for color, trust `reference_screen.png`.)

---

## 0. What it is called

| Name | Source | Tag |
|---|---|---|
| **"Wii icon"** | Official Wii Operations Manual — Channels and Settings: *"To reach Wii Settings and Data Management, select the **Wii icon** on the bottom left of the Wii Menu screen."* The manual also uses **"Wii Icon"** as a literal section heading. <https://archive.org/stream/wii-ch-eng/WiiChEng_djvu.txt> | [Official] |
| **"Wii Settings and Data Management"** | The callout label on the manual's annotated Wii Menu diagram: *"Wii Settings and Data Management — Change console settings or organize the contents of an SD Card or Nintendo GameCube Memory Card."* Same source; also in the RVK/Wii Remote Plus edition, <https://archive.org/details/wii-opmanual-chset> | [Official] |
| **"Wii button"** | Nintendo UK support: *"Locate the 'Wii' button positioned in the bottom-left corner of the screen."* <https://www.nintendo.com/en-gb/Support/Legacy-system/Accessing-the-Wii-Menu-and-System-Settings-242881.html> | [Official] |
| **`B_Set`** (pane) / **`G_Set`** (animation group) / **`BTN_SETTING`** (enum) | Internal names in the shipped binary. Layout archive `cmnBtn.ash` → `my_IplTop_e.brlyt` + `my_IplTop_e.brlan`. `iplButton.cpp` | [Decomp] |

So "Wii button" *is* Nintendo terminology (UK support), not just fan slang — the earlier note in
`component-inventory.md` §7 that it is "fan/colloquial" is **too cautious**; both names are official.

---

## 1. Exact visual design

### 1.1 Construction (three separate layers, not one image)

The button is **not** a single baked graphic. From the asset dump [Asset]:

| Layer | Asset | Original size | Notes |
|---|---|---|---|
| Button face (silver ball + gray "Wii") | `tex1_80x80_32802973ae1739b5_3.png` | **80×80** | Wordmark is baked into the face texture. **No cyan ring in this texture.** |
| Cyan ring | almost certainly `tex1_32x32_53e809d6d9e4be6e_0.png` — a **white quarter-circle arc**, mirrored into 4 quadrants and **tinted** by the layout's material color | 32×32 | **[Inferred]** — this is the only ring-shaped primitive in the Wii Menu texture set, and it is authored white (i.e. designed to be tinted). Not directly confirmed against the `.brlyt`. |
| Shared blank ball | `tex1_80x80_f9e8c70464c02577_3.png` (identical glossy ball, no wordmark) | 80×80 | Used as the base for the Message Board button (envelope glyph `tex1_48x32_...` layered on top). **[Inferred]** |

**Why this matters for the clone:** the ring is a *separately tintable/animatable element*. If you
want the hover state to brighten or thicken the ring independently of the face, that is faithful to
how Nintendo built it, not a liberty.

### 1.2 Appearance [Screenshot — measured from `reference_screen.png`]

- **Shape:** a true circle. Not a rounded square, not an ellipse — 38 px wide × 38 px tall in the
  420×236 reference, i.e. perfectly circular even in the 16:9 render.
- **Fill:** a **light silver-white**, essentially *flat* across the top ~70% and shading darker only
  near the bottom rim. Sampled down a column just left of the wordmark:

  | position | color |
  |---|---|
  | top 5–10% | `#DDDDDE` → `#E5E5E5` (rim rolls in) |
  | 15%–70% (the body) | `#E5E5E5`–`#E7E7E7` (near-constant) |
  | 78% | `#CECECE` |
  | 88% | `#C3C3C3` |
  | 95% (bottom rim) | `#BFBFBF` → `#BDBDBD` |

  So: **not** a strong top-to-bottom gradient. It reads as a matte-white sphere lit from above-left,
  with the shading compressed into a **crescent occupying roughly the bottom 20%** of the disc.
- **Gloss highlight:** a soft, broad, slightly warm-white bloom in the **upper-left quadrant**,
  centered around **10–11 o'clock at ~0.35–0.5 R** from center, peaking near `#E7E7E7` against the
  `#E5E5E5` body. It is *very* subtle at native resolution (2 levels of gray) but is unmistakable in
  the 80×80 texture, where it is a soft teardrop/comma blob sweeping from upper-left down toward the
  center. The **right side is measurably duller** (`#D3D3D3`–`#D5D5D5` at 0.6–0.9 R) than the left.
  Do not render a hard specular ellipse — it is a large, low-contrast, blurred bloom.
- **Blue ring/outline:** a thin, bright **cyan-azure ring** hugging the disc's outer edge.
  - Peak sampled ring pixels: `#3ABEEB`, `#3FBEE9`, `#41BEE9`, `#43BEE9`. Because every ring pixel is
    antialiased against gray at this resolution, the *true* color is at least this saturated.
    **Recommended value: `#35BEEB` / `rgb(53, 190, 235)`.**
  - Thickness ≈ **1.5 px on a 38 px disc ≈ 4% of the diameter**. On a 640-px-wide render that is
    ~2.3 px. It is a hairline, not a heavy stroke.
  - The ring is the **outermost** element: outer ring diameter 38 px, inner silver face ≈ 35 px.
  - The same cyan is used for the Message Board button's ring and the bar's curved divider line —
    it is a shared system accent, not button-specific.
- **Drop shadow / socket:** the button sits in what reads as a **shallow circular emboss in the bar
  surface**. A radial luminance sweep around the button center shows a faint *bright* band peaking at
  **r ≈ 1.15–1.3× the button radius** and a faint *darker* band at **r ≈ 1.4–1.5× R**, offset very
  slightly down-and-right. Net effect: a soft outer glow immediately around the ring, then a soft
  shadow ring beyond it. The contrast is only ~5–8 luminance levels — this is a whisper, not a
  drop-shadow in the CSS sense. **[Screenshot]**

### 1.3 The "Wii" wordmark inside it

- Rendered in **mid-gray** on the silver face — darkest sampled pixels `#A4A4A4`/`#A7A7A7` in the
  screenshot, ~`#999999` in the texture. **Recommended: `#A2A2A2`.** No outline, no emboss, no
  shadow — a flat gray fill.
- **Size relative to the disc** [Asset, measured on the 80×80 texture where the ball spans 70.9 units]:
  - wordmark width **35.9 units = 50.6% of the ball diameter**
  - wordmark height (dot-top to baseline) **17.2 units = 24.2% of the ball diameter**
  - horizontally **dead-centered**; vertically its optical center sits **~2% of the diameter above**
    the geometric center (a normal optical-centering nudge).
  - The reference screenshot agrees: wordmark ≈ 17 px wide inside a ≈ 35 px face ≈ 49%.
- Letterform detail: see **§8** below.

---

## 2. Proportions and placement

All figures measured from `reference_screen.png` (420×236, 16:9) [Screenshot]. Because the Wii Menu
renders true 16:9 (the button stays circular), **anchor sizes to screen *height*** — that stays
correct in both 4:3 and 16:9.

### 2.1 The button

| Quantity | Value (420×236) | As a fraction |
|---|---|---|
| Outer diameter (incl. ring) | 38 px | **16.1% of screen height** (9.05% of width at 16:9) |
| Center | (37.5, 198.5) | **8.9% from left, 84.1% from top** |
| Left edge of button | x = 19 | **4.5% of screen width** clear of the left edge |
| Bottom edge of button | y = 217 | 19 px above the frame bottom |
| Ring thickness | ~1.5 px | ~4% of the diameter |
| Silver face diameter | ~35 px | ~92% of the outer diameter |

### 2.2 Its relationship to the bar's curved top contour

The bottom bar's top edge is **not** a straight line — it is a shallow symmetric **trough**, traced
here from the cyan divider [Screenshot]:

```
x =   0 →  85   : y = 171   (flat, high — the "shoulders")
x =  85 → 150   : S-curve down
x = 150 → 275   : y = 196   (flat, low — the middle, where the clock/date sit)
x = 275 → 345   : S-curve up
x = 345 → 420   : y = 171   (flat, high)
```

So the bar is **tall at the two ends and short in the middle**. The Wii button lives in the tall
left shoulder, where there is 65 px of bar below the divider vs only 40 px in the middle.

Key relationships:

- The bar's **top contour is flat** at the Wii button's x-position — the button does **not** sit on
  a curve, it sits under the flat left shoulder. The S-curve begins at x ≈ 85, well to the right of
  the button (which ends at x = 56) and roughly where the SD Card Menu icon sits (center x ≈ 87).
- Clearance from the divider to the top of the button: **9 px** ≈ 24% of the button's diameter.
- The bar has a faint horizontal edge/base line at **y ≈ 224**. If you treat the bar proper as
  y = 171 → 224 (height 53 px = **22.5% of screen height**), the button's center (198.5) lands within
  1 px of that band's vertical center (197.5) — i.e. **the button is vertically centered in the bar
  band**, with a thin base strip below it. **[Inferred, but the fit is near-exact.]**

### 2.3 Symmetry with the Message Board button

| | Wii button | Message Board button |
|---|---|---|
| Center | (37.5, 198.5) | (381.5, 198.5) |
| Outer diameter | 38 px | 40 px |
| Margin from screen edge | 19 px | 18 px |

They share an identical center-Y and near-identical edge margins — **treat them as a mirrored pair**.
The 2 px diameter difference is within antialiasing/threshold error at this capture size; I'd
implement them the **same size** and flag any deliberate difference as unverified. **[Screenshot]**

---

## 3. States

### 3.1 Idle / default
As described in §1. Present and interactive whenever the Channel Select scene is in `STATE_NORMAL`.

### 3.2 Hover ("point-at" / focus)
Triggered by `Button::startPointEvent()` when the Wii Remote pointer enters the `B_Set` pane
[Decomp, `iplButton.cpp`]. Three things fire simultaneously:

1. The **hover-in animation** plays (§4).
2. **`WIPL_SE_BT_TARGETTING`** sound effect plays (§6).
3. **`con->rumble()`** — the Wii Remote **rumbles**. This is a real, sourced detail: pointing at the
   Wii button vibrates the controller. (`animations-interactions.md` already suspected "rumble + a
   soft blip" on hover; this confirms it at the code level for the bottom-bar buttons specifically.)
4. A **text balloon (tooltip)** fades in next to the button — `show_balloon(BALLOON_SETTING, "B_Set")`,
   using layout `balloon.ash` → `my_IplTopBalloon_a.brlyt`, positioned with an offset of
   `(120.0, 30.0)` and carrying the localized string `MESG_BUTTON_SETTING`.
   **The Wii button has a tooltip.** This is not documented anywhere else in `context/`.
   The English string is almost certainly **"Wii Options"** — **[Inferred]**; the message text lives
   in NAND, not in the decomp, so I could not read the literal string.

**What the hover animation looks like visually is NOT recoverable from the decomp** — the frame
range is exact but the animated properties live in the binary `.brlan` file. There is no separate
"hovered" texture in the asset dump, so the effect must be pane transform and/or color animation on
the existing panes. Most plausible: a small scale-up plus a brightening of the cyan ring / a glow
pane fading in. **[Inferred — flag this as an open item, see §10.]**

### 3.3 Pressed / clicked
**There is no press animation.** [Decomp — this is a notable, confident negative.]

In `iplChannelSelect.cpp`, the click handler for `BTN_SETTING` does *not* call
`button->animation(...)` at all. Compare the SD Card Menu button immediately below it, which
**does** call `button->animation(Button::IDANIM_SD_BUTTON_SELECT)` before transitioning. The Wii
button just plays a sound and starts the screen fade:

```cpp
} else if (Button::cmpButtonName(paneName, Button::BTN_SETTING) == 0) {
    button->setEventHandler(NULL);
    button->get_sd_menu_btn()->setEventHandler(NULL);
    mpInstance->reserveAllSceneDestruction(SCENE_SETTING_BG, NULL);
    getBoard()->requestExit();
    System::getFader()->fadeOut();
    TVRCManager::getHandle()->setEnable(FALSE);
    mpInstance->mState = ChannelSelect::STATE_START_SETTING_SCENE;
    snd::getSystem()->startSE("WIPL_SE_DECIDE");
}
```

Note also there **is** an unused animation slot `IDANIM_FROM_CH_SEL_TO_SETTING` (frames 7000→7040)
and its inverse `IDANIM_FROM_SETTING_TO_CH_SEL` (8000→8040), both explicitly commented
`/*??? (unused)*/` in the decomp. Nintendo authored a bottom-bar morph animation for the
menu↔settings transition and **shipped the plain fade instead**. Nice trivia; also a hint that a
morph transition is an *aesthetically defensible* liberty if you want one.

### 3.4 Disabled
- The Wii button has **no visual disabled state**. `Button::disableBtn()` only sets `mbEnabled = false`
  (and force-fades the balloons) — it does not swap a texture or gray anything out. When disabled the
  button simply stops responding: `startPointEvent`/`startLeftEvent`/`onEventDerived` all short-circuit.
  It is disabled during drags, scene transitions, and dialogs. [Decomp]
- **Contrast with the two neighbours**, which *do* have disabled visuals:
  - **SD Card Menu icon**: a real grayed-out texture. The asset dump contains both variants —
    `tex1_38x48_4c49e8df50ca3343_5.png` (blue "SD" card) and `tex1_38x48_891a9fc81547c1b9_5.png`
    (gray "SD" card). This confirms the Operations Manual's *"The icon will appear gray if there is
    no SD Card inserted."* at the asset level. [Asset + Official]
  - **Message Board**: in **safe mode** it is gated and plays a distinct rejection sound,
    `WIPL_SE_GRAY_BUTTON`, plus a dialog — the Wii button has no such branch. [Decomp]
- **Implication for the clone:** do not invent a grayed-out Wii button. If you need a
  "not-right-now" state, make it non-interactive silently.

---

## 4. Animation

### 4.1 Hover in / out — exact frame ranges [Decomp]

From `scBtnFadeFrame[BTN_SETTING]` in `iplButton.cpp`:

| Transition | Frame range | Duration @ 60 fps |
|---|---|---|
| **Hover in** (`in`) | 6900 → 6906 | **6 frames = 100 ms** |
| **Hover out** (`out`) | 6930 → 6938 | **8 frames ≈ 133 ms** |

Both play `ANIM_TYPE_FORWARD` (one-shot, no loop, no ping-pong).

Two things worth internalizing:

1. **These are extremely fast.** 100 ms in, 133 ms out. `animations-interactions.md` §"Timing" currently
   recommends 150–200 ms for tile hover lift and marks it "Recommended (unsourced)". For the
   bottom-bar buttons specifically, **the real number is 100 ms in / 133 ms out** — noticeably
   snappier than that placeholder. Use these.
2. **Out is slower than in** (8 vs 6 frames). That is the *opposite* of the "ease-out on appear,
   ease-in on disappear, equal or faster out" heuristic in `animations-interactions.md`. The Wii Menu
   deliberately lets the highlight *linger* slightly on exit.

Every bottom-bar button follows the same 6-in / 8-out shape at different frame offsets
(Message Board 900/930, Channel Select 5900/5930, Calendar 1900/1930, …) — so it is a **house rule**
for this bar, not a one-off.

### 4.2 Click animation
**None.** See §3.3.

### 4.3 Idle animation
**None on the Wii button.** [Decomp] The bar's *other* elements do have idle loops —
`G_ArwRoop` (page arrows, looping frames 10000→10055), `G_BbsSignal` (Message Board new-mail number
loop, 1→400) and `G_BbsSignal_new` (new-mail arrival, 1→160), plus the SD button's
`ANIM_ON_LOOP`. The Wii button is bound only to `G_Set` and has no loop animation registered.
**Do not add a breathing/pulsing idle to it** — that would be an invention.

### 4.4 Suggested easing
The decomp exposes frame counts, not curves (curves live in the `.brlan`). NW4R layout animations
are keyframed with Hermite interpolation, so **`cubic-bezier` ease-in-out is the right family**;
`ease-out` on hover-in reads correctly. **[Inferred]**

---

## 5. What it does when clicked

### 5.1 Destination

Opens the **Wii Options** screen. [Official]

> *"To reach Wii Settings and Data Management, select the Wii icon on the bottom left of the Wii Menu
> screen. (If more than one remote is connected, use Player 1.)"*
> — Wii Operations Manual — Channels and Settings

### 5.2 The transition — **it is a fade through black. Not a slide, not a flip.** [Decomp — definitive]

The sequence, traced through the code:

1. Click → `System::getFader()->fadeOut()`.
2. The system fader is `EGG::ColorFader(0, 0, fbWidth, efbHeight)`, constructed in `iplSystem.cpp`
   with the **default color `nw4r::ut::Color(0)` → RGB (0,0,0) = black**. It draws a full-screen
   quad whose **alpha ramps 0 → 255 linearly**.
3. `ColorFader::DEFAULT_FRAME = 20`, and **nothing in the codebase ever calls `setFrame()` or
   `setColor()`** on it (I grep-searched the whole repo) — so the duration is always
   **20 frames ≈ 333 ms** and the color is always black.
4. The Wii Menu scenes are torn down (`reserveAllSceneDestruction(SCENE_SETTING_BG, NULL)`;
   the Message Board layer gets `requestExit()`), and `SCENE_SETTING_BG` is created.
5. `SettingBg::create()` ends with `System::getFader()->fadeIn()` → **another 20 frames ≈ 333 ms**
   ramping alpha 255 → 0.

**Total ≈ 0.67 s of linear black crossfade, with a hard scene swap at the midpoint.** The fade is
**linear** (`mColor.a = frame * 255 / mFadeFrame`), not eased.

**This resolves the open question in `system-ui.md` §1.** That doc flagged *"Selecting the Wii button
or the SD Card Menu icon changes the background from white to black"* as **[Fan consensus, page
itself unverified]**. It is **correct, and now verified** — but the mechanism is worth stating
precisely:

- The transition itself is a **black fade**, and
- the destination screen is **genuinely black-backgrounded**. Confirmed at the asset level: every
  Wii Settings screen texture in the dump is a 608×456 full-screen image with a **pure-black
  background and fine horizontal scanline striping**, white/silver rounded-pill buttons with cyan
  outlines, and an orange focus bracket (e.g.
  `USA/Setup/tex1_608x456_008949ac2d8281f6_4.png`, the "Sensor Bar Position" screen). [Asset]

The **same** fade path is used by the SD Card Menu button (`STATE_START_SD_MENU_SCENE`), so the
white→black behavior is shared, exactly as `system-ui.md` guessed.

**Contrast — the Message Board does NOT fade.** Clicking the Message Board runs
`button->animation(Button::IDANIM_FROM_CH_SEL_TO_BOARD)`, a **40-frame (≈667 ms) layout morph** on
the bottom bar (`my_IplTop_e.brlan`, frames 1000→1040), with no fader involved. That is the
"flips up like a folder" transition `system-ui.md` §3 describes — animation-driven, not a fade.
**So the two bottom-bar buttons transition in fundamentally different ways**, and the clone should
reflect that.

### 5.3 Top-level structure of the Wii Options screen [Decomp + Official]

- Scene tree: `SCENE_SETTING_BG` (background, `setupBg.ash` → `it_BgSetUp_a.brlyt`) parents
  `SCENE_SETTING_BUTTON` and `SCENE_SETTING_SELECT`.
- `SettingSelect` (`setupSel.ash` → `it_ObjSetUp_a.brlyt`) defines **six buttons across three
  tiers**, with pane names:

  | Tier | Buttons (pane names) |
  |---|---|
  | 1st | `B_DataManage_00` (**Data Management**), `B_Setting_00` (**Wii Settings**) |
  | 2nd | `B_SaveData_00` (**Save Data**), `B_Channel_00` (**Channels**) |
  | 3rd | `B_Wii_00` (**Wii**), `B_Cube_00` (**Nintendo GameCube**) |

  The state machine (`STATE_1ST_*` → `STATE_2ND_*` → `STATE_3RD_*`, plus `STATE_2ND_WAIT_BACK` /
  `STATE_3RD_WAIT_BACK`) confirms this is a **drill-down within one screen**, with the pair of
  buttons animating out and the next pair animating in — *not* separate screens.
  Each button has its own IN / FOCUS_IN / FOCUS_OUT / FLASH / FLASH_2 / OUT / BACK animation set.

  This matches the manual exactly: *"Select Data Management from the Wii Options screen to see a
  choice of two kinds of data you can manage: Save Data and Channels."* and *"Save Data lets you
  organize and delete the save data in Wii System Memory, SD Card…"* [Official]

- `SettingButton` (`setupBtn.ash` → `it_Button_a.brlyt`) is the Options screen's own **bottom bar**:
  a single button `B_Button_00` labelled `MESG_CMN_BACK_ALT` (the **"Wii Menu"** back button),
  plus an animation group **`G_Wii`** with `it_Button_a_WiiAppear.brlan` /
  `it_Button_a_WiiLost.brlan` — i.e. **a Wii logo element that animates in and out on the Options
  screen's bar**. The Wii wordmark carries over into the destination screen. [Decomp]
- Page navigation: *"To scroll to a different options page, use the Wii Remote Plus to point at a
  left/right arrow."* [Official]
- Under **Wii Settings** the manual lists the familiar categories (Console Nickname, Calendar,
  Screen, Sound, Parental Controls, Sensor Bar, Internet, WiiConnect24, Language, Country,
  Wii System Update, Format Wii System Memory) — already documented in `system-ui.md` §5; not
  re-derived here.

---

## 6. Audio

Exact sound-effect IDs from the shipped binary [Decomp]. These are `IplSound.brsar` labels — the
same archive `audio.md` §"Sound archive" describes as resistant to extraction. **The IDs below are
new information for this project.**

| Event | Sound ID | Where |
|---|---|---|
| **Pointer enters the Wii button** | **`WIPL_SE_BT_TARGETTING`** | `Button::startPointEvent()`, `iplButton.cpp` |
| **Click / select the Wii button** | **`WIPL_SE_DECIDE`** | `CsChanSelButtonEventHandler::onEventDerived()`, `iplChannelSelect.cpp` |
| Pointer leaves the button | *(none)* | `startLeftEvent()` plays no sound — only the hover-out animation and balloon fade-out |

### 6.1 Cross-reference with `context/audio.md`

`audio.md` §3–4 correctly concluded, from fan sound-design analysis and the Wii Shop Channel's
documented SFX set, that **hover and select are two distinct effects**. That is confirmed, and now
with real IDs. Two refinements:

1. **The bar buttons and the channel tiles use *different* sounds.** The decomp shows a clean
   `BT_` (button) vs `CH_` (channel) naming split:

   | | Hover | Select |
   |---|---|---|
   | Bottom-bar buttons (Wii, Message Board, arrows) | `WIPL_SE_BT_TARGETTING` | `WIPL_SE_DECIDE` |
   | Channel tiles in the grid | `WIPL_SE_CH_TARGETTING` | `WIPL_SE_CH_SELECT` |

   `audio.md` §3 treats "the hover blip" as one system-wide sound. It is really **two parallel
   families**. For a faithful clone: use a lighter/tighter blip on the bar buttons than on the
   channel tiles.
2. Other confirmed IDs seen in the same files, useful for `audio.md`'s incomplete
   `WIPL_SE_*` list: `WIPL_SE_WII_START`, `WIPL_SE_CANCEL` (back button on the Options screen),
   `WIPL_SE_GRAY_BUTTON` (rejected/gated button), `WIPL_SE_CH_HOLD`, `WIPL_SE_CH_DRAG`,
   `WIPL_SE_CH_SET`, `WIPL_SE_CH_NOT_MOVE`, `WIPL_SE_SDCARD_IN`, `WIPL_SE_SDCARD_OUT`,
   `WIPL_SE_NEW_ARRIVAL`, `WIPL_SE_BT_PUSH`, `WSD_SELECT`.

### 6.2 Haptics
Hover also fires **`con->rumble()`** (§3.2). If the clone runs on a device with the Vibration API,
a ~10–20 ms tick on hover is *sourced*, not decorative. **[Decomp]**

---

## 7. Version differences

**Short answer: present from System Menu 1.0, and no documented change to its appearance or behavior
across any version.**

- **Present at launch.** The Wii button/Wii Options was the *only* route to Wii Settings and Data
  Management from day one — there is no alternative entry point in any version, and the WiiBrew
  System Menu changelog records the addition of settings *features* (Country Settings and parental
  controls in 2.0, etc.) without ever introducing the entry point itself.
  <https://wiibrew.org/wiki/System_Menu> **[Fan/community + Inferred]** — this is an argument from
  the absence of any "added" entry plus the necessity of the feature, **not** a positive citation.
  I could not locate an accessible scan of the original **2006** Operations Manual (the two Internet
  Archive scans available — `wii-ch-eng` and `wii-opmanual-chset` — are both later printings; the
  latter references the Wii Remote Plus, so ~2011). **Flagged as the weakest claim in this document.**
- **No appearance change found across versions.** The WiiBrew changelog for 1.0 → 4.3 lists no
  visual change to the Wii button in any release. The documented bottom-bar changes are all to its
  *neighbours*:
  - **3.0** — the Message Board button gains its blink-on-new-message behavior.
  - **4.0** — the **SD Card Menu icon** appears next to the Wii button. This is the only version
    change that alters what the bottom-left *cluster* looks like: pre-4.0 the Wii button sits alone
    in the bottom-left; from 4.0 it has a neighbour ~50 px (≈12% of screen width) to its right.
    **The Wii button itself does not move** — its center is measured at 8.9% from the left in the
    4.x reference screenshot, and no source describes it shifting. **[Inferred]** — worth verifying
    against a pre-4.0 capture if you want to offer a version toggle.
- **Caveat on the decomp's version coverage.** `wii-ipl` targets **4.3** only (configs 43U/43E/43J/43K).
  Every frame count, sound ID and state-machine detail above is therefore **confirmed for 4.3**, and
  only *presumed* for earlier versions. Given Nintendo's pattern of leaving the core menu layout
  untouched, that presumption is reasonable but unverified. **[Inferred]**
- **Regional:** the Korean build (`43K`) has a special case that widens the *balloon* font metrics
  in 16:9 (`#ifdef KOREAN_BUILD`), and the Korean build carries an extra virtual in the `BackMenu`
  scene. Neither changes the button's own art. [Decomp]

---

## 8. The wordmark itself

### 8.1 Is it the official Wii logotype?
**Yes.** The glyph inside the button is the official **Wii logotype**, not system text set in a UI
font. Evidence:
- The Wii Menu texture set contains a **standalone white "Wii" wordmark texture**,
  `tex1_32x16_198fb3c489fd4580_0.png` (**32×16** original), which renders with a **™ mark** in the
  lower right. A trademark symbol is definitive: this is the brand logotype as an art asset. [Asset]
- The same letterforms are baked into the button-face texture, and appear again as the ghosted
  watermark on empty channel slots (`tex1_128x96_*_2.png`, matching `visual-design.md` §2's
  screenshot observation).

### 8.2 Letterform description [Asset — measured/traced from the wordmark textures]

- **W (capital):**
  - Two **straight, tapered diagonal outer strokes**, cut **flat and square at the top** (no serifs,
    no rounding at the cap line).
  - The two bottom vertices are **smoothly rounded bowls** — soft U-curves, not sharp points. This is
    the signature move of the mark.
  - The center rises to a **single rounded crest at full cap height** — a smooth curved arch, not an
    apex.
  - The two interior counters come to **sharp downward points at roughly 45–55% of cap height**.
  - Net read: two conjoined V-forms with rounded bottoms and a rounded top crest — geometric and
    humanist at once, quite unlike a standard grotesque W.
- **The two lowercase i's:**
  - **Plain rectangular stems** — uniform width, flat top, flat bottom, no serifs, no taper.
  - Each topped by a **perfectly circular dot (tittle)**, noticeably **wider than the stem**
    (≈1.3–1.5× the stem width).
  - The dot is separated from the stem by a **clear gap roughly equal to the dot's own diameter** —
    much larger than a normal tittle gap. This is deliberate: the detached round head over a
    rectangular body reads as a **figure/person**.
  - Dot tops align with the W's cap height; stem baselines align with the W's baseline.
- **Setting:** tight, even spacing; the two i's sit close together as a pair. No letter-spacing tricks.

### 8.3 The two i's — official meaning
> *"The stylized spelling — with two lowercase 'i's — was designed to represent both two people
> standing side by side and the pairing of the Wii Remote and Nunchuk."*
> — <https://en.wikipedia.org/wiki/Wii>

Nintendo's own framing: *"Wii sounds like 'we', which emphasizes that the console is for everyone."*
[Official, quoted]

So the round dots are **heads** and the rectangular stems are **bodies** — which is why the gap and
the circle-over-rectangle proportions matter. If you substitute a normal font, this reads as
generic text and the whole point of the mark is lost.

### 8.4 Typeface
- The Wii logotype is **custom lettering**, not a licensed retail typeface. Nintendo has never
  published a font name for it, and none of the letterform quirks above (rounded W bowls, oversized
  detached circular tittles) belong to a standard face.
- The most-cited "close" commercial font is **Continuum** (Brøderbund Software), per fontmeme:
  *"A font named Continuum designed by Brøderbund Software is very similar to the Wii logo."*
  <https://fontmeme.com/wii-font/> **[Fan/community]** — this is a font-download site, not an
  authority; treat it as "a reasonable starting point for a lookalike," not as fact.
- **Recommendation for the clone:** do **not** try to set "Wii" in a webfont. At the size this
  renders (wordmark ≈ 8% of screen height), an **inline SVG path** of the three glyphs is smaller,
  sharper, and exactly right. Trace it once from `tex1_32x16_198fb3c489fd4580_0.png`
  (or the 4K redraw for a cleaner outline) and reuse the same SVG for the button, the empty-slot
  watermark, and the Options-screen bar logo.
- Trademark note: this is a fan/hobby project, but the wordmark is a registered Nintendo trademark
  (the asset literally carries ™). Fine for personal/non-commercial use; worth knowing.

---

## 9. Implementation recipe

Values below are the measured ones, expressed against a container of height `H`.

```css
/* ---- The Wii button ---------------------------------------------------- */
.wii-button {
  position: absolute;
  /* center at 8.9% from left, 84.1% from top of the SCREEN */
  left: 8.9%;
  top: 84.1%;
  transform: translate(-50%, -50%);

  width:  16.1cqh;          /* 16.1% of screen height — circular in 4:3 AND 16:9 */
  aspect-ratio: 1;
  border-radius: 50%;

  /* the cyan ring: hairline, ~4% of the diameter */
  border: 0.65cqh solid #35BEEB;
  box-sizing: border-box;

  /* silver face: near-flat body, shading compressed into the bottom ~20% */
  background:
    /* upper-left gloss bloom, large + soft + low contrast */
    radial-gradient(circle at 33% 30%,
                    #F0F0F0 0%, rgba(240,240,240,0) 55%),
    /* body + bottom shading crescent */
    linear-gradient(to bottom,
                    #E3E3E4  0%,
                    #E6E6E6 14%,
                    #E6E6E6 70%,
                    #D2D2D2 82%,
                    #C2C2C2 93%,
                    #BDBDBD 100%);

  /* the shallow "socket": faint outer glow, then a faint shadow ring,
     offset very slightly down-and-right */
  box-shadow:
    0 0 0.5cqh rgba(255,255,255,0.55),
    0.15cqh 0.2cqh 1.1cqh rgba(120,130,145,0.28);

  display: grid;
  place-items: center;
  cursor: pointer;

  /* 6 frames in @60fps = 100ms */
  transition: transform 100ms cubic-bezier(0.22, 0.61, 0.36, 1),
              box-shadow 100ms cubic-bezier(0.22, 0.61, 0.36, 1),
              border-color 100ms cubic-bezier(0.22, 0.61, 0.36, 1);
}

/* 8 frames out @60fps = 133ms — deliberately SLOWER than the in-transition */
.wii-button:not(:hover) {
  transition-duration: 133ms;
}

.wii-button:hover {
  /* UNCONFIRMED visual — timing is exact, the effect is inferred. Keep it subtle. */
  transform: translate(-50%, -50%) scale(1.04);
  border-color: #5FD2F5;
  box-shadow:
    0 0 1.2cqh rgba(53, 190, 235, 0.55),
    0.15cqh 0.2cqh 1.1cqh rgba(120,130,145,0.28);
}

/* NO :active rule — the real button has no press animation. */

.wii-button > svg {          /* the traced Wii logotype */
  width:  50.6%;             /* of the FACE diameter */
  height: auto;              /* wordmark height lands at ~24.2% of the face */
  fill: #A2A2A2;
  transform: translateY(-2%);/* optical centering nudge, measured */
}
```

Behavior to wire up:

```js
onPointerEnter: () => { play('bt_targetting'); navigator.vibrate?.(15); showTooltip('Wii Options'); }
onPointerLeave: () => { /* no sound */ hideTooltip(); }
onClick:        () => { play('decide'); fadeToBlack(333).then(swapToOptions).then(fadeFromBlack(333)); }
```

The fade should be **linear** on a solid `#000` overlay (`alpha = frame/20`), 20 frames each way,
with the scene swap at the midpoint.

---

## 10. Open questions / gaps

Ranked by how much they'd change an implementation.

1. **What the hover animation actually *does* visually.** Timing is nailed (6 in / 8 out) but the
   animated properties live in binary `.brlan` data inside `cmnBtn.ash`. Resolving this needs either
   a `.brlan` parse (e.g. via BrawlBox/Wexos toolchain on a dumped `cmnBtn.ash`) or careful
   frame-stepping of a Dolphin capture. **Highest-value remaining gap** — it's the one thing a user
   sees constantly that is currently guessed.
2. **The English tooltip string** for `MESG_BUTTON_SETTING`. "Wii Options" is a confident inference
   but the message data lives in NAND, not the decomp. A single screen-capture of a hovered Wii
   button settles it.
3. **Whether the cyan ring is really the mirrored quarter-arc texture** (`tex1_32x32_53e809d6d9e4be6e_0`)
   or something else. Doesn't change the rendered result, but does affect whether treating the ring
   as an independently animatable element is faithful.
4. **Pre-4.0 appearance.** Everything here is confirmed for System Menu **4.3**. A capture of 1.0 or
   2.0 would confirm (a) the button existed at launch with the same art, and (b) that it did not
   shift position when the SD Card Menu icon arrived in 4.0. The Internet Archive has a
   `wiimenu1.0U` WAD (<https://archive.org/details/wiimenu1.0U>) that could be booted in Dolphin.
5. **Whether the Message Board button is genuinely 2 px larger** than the Wii button, or whether
   that's antialiasing noise in a 420-px-wide capture. A higher-resolution screenshot resolves it in
   seconds.
6. **The bar's own base strip below y ≈ 224** (5% of screen height) — is it part of the bar, a
   separate element, or overscan? Belongs to the bottom-bar-container deep-dive
   (`component-inventory.md` item 6), not here, but it determines whether the button is *exactly*
   vertically centered in the bar.

---

## Corrections and additions to existing `context/` docs

| Doc | Current statement | This doc's finding |
|---|---|---|
| `component-inventory.md` §7 | *"'Wii button' … is fan/colloquial terminology"* | **Both** names are official — Nintendo UK support says *"the 'Wii' button"*; the manual says *"Wii icon"*. |
| `component-inventory.md` §7 | Icon's visual design "comparatively thin, no dedicated close-up treatment" | Now fully specified — §1, §2, §8. |
| `system-ui.md` §1 | White→black background switch flagged **[Fan consensus, page itself unverified]** | **Verified** [Decomp + Asset]: a 20-frame linear fade to `#000` and back, into a genuinely black-backgrounded Options screen. |
| `system-ui.md` §3 | Message Board "flips up like a folder" — **[Fan consensus]**, no primary source | Confirmed as *animation-driven, not a fade*: `IDANIM_FROM_CH_SEL_TO_BOARD`, a 40-frame (≈667 ms) bar morph, explicitly distinct from the Wii button's fader path. The exact motion is still unread (same `.brlan` problem as gap #1). |
| `audio.md` §3 | Treats hover-blip as one system-wide sound | It's **two families**: `WIPL_SE_BT_TARGETTING`/`WIPL_SE_DECIDE` for bar buttons vs `WIPL_SE_CH_TARGETTING`/`WIPL_SE_CH_SELECT` for channel tiles. Also adds ~12 new confirmed `WIPL_SE_*` IDs to that doc's incomplete list. |
| `animations-interactions.md` §"Timing" | Hover lift 150–200 ms, "Recommended (unsourced)" | For bottom-bar buttons the real values are **100 ms in / 133 ms out**, and **out is slower than in** — inverting that doc's ease-in/ease-out heuristic. |
| `animations-interactions.md` §2 | Hover = "rumble + a soft blip sound", no source | **Confirmed** at code level for bar buttons: `con->rumble()` fires on `startPointEvent`. |
| `visual-design.md` §235 | *"a circular button with a cyan ring-outline and light-gray fill"* | Correct; now quantified (ring `#35BEEB` @ 4% of diameter; face `#E6E6E6` body → `#BDBDBD` bottom rim; wordmark `#A2A2A2` @ 50.6% of face width). |

---

## Sources

**Official (Nintendo)**
- Wii Operations Manual — Channels and Settings (full OCR): <https://archive.org/stream/wii-ch-eng/WiiChEng_djvu.txt> · item <https://archive.org/details/wii-ch-eng>
- Wii Operations Manual — Channels and Settings, RVK/Wii Remote Plus edition: <https://archive.org/details/wii-opmanual-chset>
- Nintendo UK — Accessing the Wii Menu and System Settings: <https://www.nintendo.com/en-gb/Support/Legacy-system/Accessing-the-Wii-Menu-and-System-Settings-242881.html>
- Nintendo UK — Data Management: <https://www.nintendo.com/en-gb/Support/Wii/Usage/Wii-Menus/Data-Management/Data-Management-242887.html>

**Decompilation (Nintendo code, fan-recovered)**
- `koopthekoopa/wii-ipl` — Wii System Menu decompilation: <https://github.com/koopthekoopa/wii-ipl>
  - `include/scene/button/iplButton.h`, `src/scene/button/iplButton.cpp` — pane names, hover frames, hover SFX, rumble, balloons
  - `src/scene/channelSelect/iplChannelSelect.cpp` — the `BTN_SETTING` click handler, fader call, `WIPL_SE_DECIDE`
  - `src/scene/settingSelect/iplSettingBg.cpp`, `include/scene/settingSelect/iplSettingSelect.h`, `src/scene/settingSelect/iplSettingButton.cpp` — Wii Options structure
  - `libs/EGG/src/core/eggColorFader.cpp`, `libs/EGG/include/egg/core/eggColorFader.h`, `src/system/iplSystem.cpp` — black fade, 20-frame duration

**Assets**
- `Alan-bur/WM4K` — Wii Menu 4K Texture Pack: <https://github.com/Alan-bur/WM4K>
  - `0000000100000002/USA/Wii Menu/tex1_80x80_32802973ae1739b5_3.png` — the Wii button face (80×80 original)
  - `.../tex1_80x80_f9e8c70464c02577_3.png` — shared blank glossy ball
  - `.../tex1_32x16_198fb3c489fd4580_0.png` — standalone Wii logotype with ™ (32×16 original)
  - `.../tex1_32x32_53e809d6d9e4be6e_0.png` — white quarter-circle arc (probable ring primitive)
  - `.../tex1_38x48_4c49e8df50ca3343_5.png` / `.../tex1_38x48_891a9fc81547c1b9_5.png` — SD icon, enabled vs grayed
  - `0000000100000002/USA/Setup/tex1_608x456_008949ac2d8281f6_4.png` — a Wii Settings screen (black background)
- The Spriters Resource — Wii Menu (asset index incl. "Buttons & Miscellaneous", "Wii Options Background"): <https://www.spriters-resource.com/wii/wiimenu/>

**Community / reference**
- WiiBrew — System Menu (version changelog): <https://wiibrew.org/wiki/System_Menu>
- Wikipedia — Wii (name and logo, two lowercase i's): <https://en.wikipedia.org/wiki/Wii>
- fontmeme — Wii Font (Continuum lookalike claim): <https://fontmeme.com/wii-font/>
- Internet Archive — Wii Menu 1.0 (NTSC-U) WAD, for pre-4.0 verification: <https://archive.org/details/wiimenu1.0U>
- This repo's `reference_screen.png` — all pixel measurements in §1–2
