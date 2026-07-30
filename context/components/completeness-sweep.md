# Wii Menu — Completeness Sweep (Blind-Spot Audit)

**Type:** audit, not a component deep-dive. The question this doc answers is *"what are we
still missing?"* — specifically the small/obscure elements nobody thinks of when they picture
the Wii Menu, of the same character as the half-pill platforms under the bottom-bar buttons
that the project owner spotted unaided.

**Date of sweep:** 2026-07-24.

**Coverage baseline established from:** `context/component-inventory.md` (14 items + exclusions),
plus a skim of `visual-design.md`, `clock.md`, `system-ui.md`, `animations-interactions.md`,
`channels.md`, `audio.md`, `technical-specs.md`, `version-history.md`. `context/components/`
was empty at the time of the sweep — the ten per-component docs listed as in-flight (date
display, page-nav arrows, Wii button, mail button, channel tile frame, bottom bar container,
Disc Channel, empty slot + SD card icon, bottom-bar half-pills, transient states/overlays)
had not yet landed, so **everything below is deduplicated against the inventory's descriptions
of those components, not against the docs themselves.** Where a finding clearly belongs to an
in-flight doc, it is filed under §4 "Hand-offs" instead of being claimed as a new component.

**Method:** (1) read `reference_screen.png` region-by-region at 5–6× zoom; (2) read all 26 pages
of `wii_design_specs.pdf`; (3) located and mined a **decompilation of the Wii Menu 4.3 binary**;
(4) two parallel web-research streams — homebrew/theme-hacking asset lists and pixel-accurate fan
recreations, and conditional/non-default on-screen states. Streams (3) and (4a) independently
converged on the same decompilation, which is useful cross-validation.

---

## 1. The headline: this project has been researching a screen whose source code is public

### 1.0 The Wii Menu 4.3 decompilation is the ground truth for everything here

**What it is:** a public, work-in-progress **decompilation of the Wii Menu (IPL) 4.3** — the actual
C++ source of the screen this project is recreating — covering all four regional builds
(43U / 43E / 43J / 43K).
Source: https://github.com/koopthekoopa/wii-ipl (README: *"This repository does **not** contain any
assets or assembly of the executable whatsoever"* — code only; assets must come from your own WAD).

A second, complementary repo renders the **real** System Menu `.arc` assets and carries
human-written comments explaining what each pane does:
https://github.com/giantpune/wii-system-menu-player — and a third labels byte offsets *inside* each
`.brlyt`, which is how you find panes that have no other public name:
https://github.com/diddy81/Wii-Theme-Brlyt-Editor

**Why this dominates every source used so far:** every doc in `context/` is currently built on
screenshots, wikis, forum consensus, Nintendo consumer manuals, and one developer PDF. The decomp
instead names, in the Menu's own code, *every layout file, every pane, every animation, every
state, every sound ID and every timing constant* on the channel-select screen. Nearly all of §2
came from `src/scene/channelSelect/` and `src/scene/button/` — an area no existing doc cites once.
By contrast, `wiibrew.org/wiki/System_Menu`, `/wiki/Wii_Menu_Themes` and `/wiki/ThemeMii` contain
**zero** asset or layout filenames; WiiBrew is a dead end for this class of question.

**The asset archive map.** The System Menu (`00000002.app`) stores its UI in ASH-compressed U8
archives, read by name:

`chanSel.ash`, `cmnBtn.ash`, `balloon.ash`, `cursor.ash`, `board.ash`, `calendar.ash`,
`chanEdit.ash`, `chanTtl.ash`, `diskBann.ash`, `diskThum.ash`, `dlgWdw.ash`, `faceSel.ash`,
`GCBann.ash`, `health.ash`, `limitOver.ash`, `mlAdSel.ash`, `prntDlg.ash`, `sdButton.ash`,
`setupBg.ash`, `setupBtn.ash`, `setupSel.ash`, `wiiMem.ash`, **`corrupt_icon.ash`**,
**`tmptitle_icon.ash`**

Home-screen layouts inside them:

| Layout | Role |
|---|---|
| `my_IplTop_a` | the channel grid (masks, edges, per-page backgrounds) |
| `my_IplTop_b` | the static tile frame — used for **empty** *and* **corrupt** tiles |
| `my_IplTop_c` | **grey background + date** (a layer no existing doc knows about) |
| `my_IplTop_d` | the per-tile focus cursor (`FocusOn`/`FocusOff`/`Select`) |
| `my_IplTop_e` | the shared bottom-bar button set (all buttons + page arrows) |
| `my_IplTop_f`, `_g` | calendar |
| `my_IplTopBalloon_a` | the hover title balloon (2.1) |
| `my_Clock_a` | clock + the transient "Wii Menu" text (2.2) |
| `my_TVMask_a`, `my_TVShade_a`, `my_TVApear_a` | the channel drag-and-drop overlay trio (2.5) |
| `my_DiskCh_a`, `_b`, `_In` | Disc Channel tile, banner, insert/eject |
| `my_GCIcon_a` | GameCube disc icon |
| `my_BScroll_a` | the **B-button stretchy scroll arrow** (2.4) |
| `my_BtnStop_a` | the "Stop"/opt-out button |
| `P1–P4_Def`, `P1–P4_Cat` | **four player cursors × two states** (2.3) |

**Recommendation (High):** add all three repos to `context/context-gathering-methods.md` as the
project's primary sources of record, and re-audit the existing docs against them. Many standing
"unconfirmed / fan-consensus / no primary source" flags across `visual-design.md`,
`animations-interactions.md`, `clock.md` and especially `audio.md` are answerable in an afternoon.
*(A clone exists in this session's scratchpad, but scratchpads are ephemeral — re-clone somewhere
durable.)*

---

## 2. Newly-identified elements and gaps (prioritized)

### 2.1 Channel title "text balloon" — the hover tooltip — **HIGH, warrants its own doc**

**What it is:** when the pointer rests on a channel tile, a **speech-balloon tooltip containing the
channel's name** fades in beside it. It is a first-class, separately-loaded UI object with its own
layout file, its own heap and its own in/out animation.

**Evidence — official, and already sitting in this repo.** `wii_design_specs.pdf` §5.2.3 (p.24),
which no existing doc quotes:

> "The title specified here will **pop-up when the cursor is moved over the unselected icon in the
> Wii Menu**. However, only the first line will be displayed; if the text does not fit the display
> area, the end of the line will be truncated by a maximum of four characters."

Same section: titles are max **20 characters per line, two lines max (40 chars)**, per-language.

**Evidence — implementation** (`include/scene/textBalloon/iplBalloon.h`,
`src/scene/channelSelect/iplChannelObj.cpp`):

- `class TextBalloon` with `fadein()`/`fadeout()`/`fadeoutForce()`, `MAX_STRING_LENGTH = 32`, and
  **`WAIT_UNTIL_FADE_IN = 15`** — a 15-frame (≈250 ms at 60 Hz) hover dwell before it appears.

> **⚠️ SUPERSEDED (2026-07-24): there are two different dwells, and neither is 250 ms.**
> - `WAIT_UNTIL_FADE_IN = 15` gates a **`>` comparison on a post-incremented counter
>   starting at 0** (`if (mWaitUntilFadeIn++ > WAIT_UNTIL_FADE_IN)`), so it fires on frame
>   **16 ≈ 267 ms** — and this constant governs the **bottom-bar button** balloons only.
> - **Channel tiles use a different code path with a different number:** `iplChannelObj.cpp`
>   counts to **20 frames = 333 ms** before showing the balloon.
> Button balloons are also offset **+50 virtual px in Y** and edge-clamped to 120 px
> (16:9) / 30 px (4:3); exactly five bottom-bar items get one (Message Board, Wii Menu,
> Settings, Calendar, Create) **plus** the SD icon, which owns its own. **The arrows get
> none.** See `context/decomp-findings.md` §2.4–2.5. Evidence tier: decomp.
- Every `ChannelObj` owns one: `initBalloon()`, `mpBalloonHeap`, `drawBalloon()`, built from
  `my_IplTopBalloon_a.brlyt` + `my_IplTopBalloon_a_BalloonInOut.brlan`, text pane `T_Balloon`.
- Two stacked body panes — `W_Base` and **`W_Shade` (a drop shadow)** — resized together at runtime:
  `newSize.width = textRect.width + 40.0f`, floored at `mLocationAdjust * 160.0f`.
- **Edge avoidance:** the balloon is pushed inward so it never comes within 60 px of the screen
  edge — `if (val3 < 60.0f) { val2 = 60.0f - val3; } else if (val1 < 60.0f) { val2 = val1 - 60.0f; }`
- **Truncation:** the string is shortened character-by-character until the drawn rect is ≤ **391.5**
  units, then ellipsised — `...` in Western locales, a single `…` glyph in Japan.
- `initBalloon()` early-returns with `mpBalloonLayout = NULL` when `!isValid()` — **empty slots get
  no balloon.**
- It has its own sound: **`WIPL_SE_BALLOON`**.

**Existing coverage:** **none.** Grepping all of `context/` for "pop-up", "popup", "tooltip",
"balloon" returns nothing. Item 2 of the inventory discusses hover *highlight* but never a hover
*label*.

**Importance: High** — it is the primary way channel names are surfaced, it fires constantly during
normal use, and it is cheap to build once known. **Dedicated doc: yes** (fold in the bottom-bar
button balloons, 2.10).

---

### 2.2 The transient **"Wii Menu" title text** in the clock area — **HIGH, warrants its own doc**

**What it is:** for the **first ~3 seconds after the Wii Menu first appears**, the words "Wii Menu"
occupy the clock's position; they then animate away and are replaced by the clock. Shown **only
once per console session** — returning from a channel or the Message Board shows the clock
immediately.

**Evidence** (`src/scene/channelSelect/iplClock.cpp`, `iplClock.h`):

- Text pane `T_WiiMenu` inside container `N_WiiMenu`, filled from localized string
  `MESG_CLOCK_WII_MENU`.
- `static const int WII_MENU_APPEAR_FOR = 3000; /* in ms (3 seconds) */`
- `static bool m_already_shown_wii_menu;` — if already true, `init()` fast-forwards both
  `ANIM_WII_MENU_CHANGE` and `ANIM_CLOCK_CHANGE` to `ANIM_TYPE_BACKWARD` and jumps to
  `STATE_NORMAL`; otherwise it sets the flag, arms the 3000 ms timer and starts in `STATE_FADE_IN`.
- The swap does **not** fire the instant the timer expires — `stt_fadein()` also waits for
  `time.sec % 2` (an odd second), so it lands in phase with the colon blink. The text therefore
  lingers 3–4 s, not exactly 3 s.
- Independently corroborated by giantpune's comment on the same asset: *"changes the clock from the
  initial 'Wii Menu' text to a clock."*

**Corroborating visual — from a file already in this repo.** This explains an anomaly in
`wii_design_specs.pdf`: Figure 1-1 (p.6) shows small grey **"Wii Menu"** text above the date and
**no clock**, while Figure 1-2 on the same page shows **"3:00 PM"** above "Tue 8/7". Two official
screenshots of the same screen, one with the clock and one without — because Figure 1-1 was
captured inside the first three seconds. Nobody has previously explained this.

**Existing coverage: none.** `clock.md` documents the clock thoroughly but has no notion of a title
state preceding it.

**Importance: High** — the very first thing a user sees, and a once-per-session state, which is
exactly the kind of thing a recreation gets wrong permanently. **Dedicated doc: yes**, or a major
new section in the date/clock agent's doc.

---

### 2.3 There are **four player cursors**, each with a separate "grab" variant — **HIGH**

**What it is:** the Wii Menu supports up to four simultaneous Wii Remote pointers, each a distinct
numbered hand, and each hand has **two full layouts** — pointing and grabbing.

**Evidence** (`src/system/iplPointer.cpp`):

```c
// Point
#define LYT_POINT_ID 0
"P1_Def.brlyt", "P2_Def.brlyt", "P3_Def.brlyt", "P4_Def.brlyt",
// Grab
#define LYT_GRAB_ID  4
"P1_Cat.brlyt", "P2_Cat.brlyt", "P3_Cat.brlyt", "P4_Cat.brlyt",
```

All eight live in `cursor.ash`. `_Def` = the default pointing hand; `_Cat` (キャッチ, "catch") = the
closed/grabbing hand used while dragging a channel.

**Existing coverage:** `animations-interactions.md` §2 is described by the inventory as the
second-best-covered component in the corpus, but it treats the cursor as **one** hand with fan-sourced
"idle/busy" states. The reality — four numbered cursors, and a *separate authored grab layout* rather
than a finger-curl animation on the same asset — is not recorded anywhere.

**Importance: High** for the grab variant (it is visible during the signature drag interaction);
**Medium** for multiplayer cursors (a web recreation has one mouse, but P1's cursor being
specifically *P1's* affects which asset to use). **Dedicated doc:** no — this is a correction to
`animations-interactions.md` §2, which should be reopened rather than "promoted" as the inventory
currently recommends.

---

### 2.4 `my_BScroll_a` — the stretchy B-button scroll arrow — **MEDIUM-HIGH, most obscure find**

**What it is:** a third cursor-family layout, invisible until you **hold B and drag**, which draws
an origin dot at the grab point and a **stretching arrow** back to the cursor — a rubber-band scroll
affordance. It flips vertically to point up or down.

**Evidence:** `my_BScroll_a.brlyt`, panes `BArwBase` (origin dot), `W_BArw` (the stretching length
segment), `N_BArw` (the arrowhead), with
`#define MIN_LENGTH 32.f` / `#define MAX_LENGTH 128.f` and the comment
`// Y Scale: 1.0 = Down / Y Scale: -1.0 = Up`.

**Existing coverage: none anywhere.** No wiki, no fan doc, and nothing in `context/`.

**Importance: Medium-High.** This is the archetype of what this audit was asked to find: a real,
authored, on-screen element that is invisible in every screenshot and absent from every fan
description. **Caveat (suspected):** the B-drag scroll gesture is most associated with the Message
Board's list and the Internet Channel; I did **not** confirm from code that it is reachable on the
channel grid specifically. Verify before building. **Dedicated doc:** worth a short one, jointly
with 2.3.

---

### 2.5 Channel drag-and-drop overlay trio (`TVMask` / `TVShade` / `TVApear`) — **MEDIUM-HIGH**

**What it is:** rearranging channels does not merely move the tile. The Menu creates **three
additional full layouts** dedicated to the move.

**Evidence:** `ChannelSelect::createChanMoveLayout()`, `src/scene/channelSelect/iplChannelSelect.cpp`
(~L1794–1818):

```cpp
mpMoveLytMask   = new layout::Object(..., "my_TVMask_a.brlyt");   // Apear/Lost on "Picture_00"
mpMoveLytObject = new layout::Object(..., "my_TVShade_a.brlyt");  // Apear/Lost on "4x3"
mpMoveLytDrop   = new layout::Object(..., "my_TVApear_a.brlyt");  // Apear/Lost on "Picture_00"
```

Reading of the three: `TVShade` = the lifted tile that follows the cursor; `TVMask` = the
dimming/hole mask over the rest of the grid; `TVApear` = the drop "pop" at the destination. Each has
paired `_Apear` / `_Lost` animations.

`my_TVShade_a.brlyt` is **aspect-ratio aware at runtime**: it holds panes `4x3`, `16x9` and
`4x3_dummy`, and when `SCGetAspectRatio() == SC_ASPECT_RATIO_16x9` the code copies the `16x9` pane's
texture onto the other two. Two distinct art assets depending on screen mode.

The scene carries a full drag state machine — `STATE_NORMAL_GRAB`, `_DRAG`, `_RELEASE_WAIT`,
`_RELEASE`, `_MOVE_CHAN_IN`, `_MOVE_CHAN_SAVE`, `_MOVE_CHAN_OUT`, `STATE_DRAG_SCROLL_LEFT/RIGHT` —
plus `isReleasableArea()`, i.e. **invalid drop targets are a modelled concept** (the Disc Channel
slot cannot be released into).

**Sound design here is unusually sophisticated and is documented nowhere:** three of the drag sounds
are **positionally panned by the cursor's X coordinate**, and the drag loop's parameters are driven
by **drag velocity**:

```cpp
snd::getSystem()->startSEwithPos("WIPL_SE_CH_HOLD", mDragPos.x);
snd::getSystem()->startSEwithPos("WIPL_SE_CH_NOT_MOVE", mDragPos.x);
snd::getSystem()->holdSEwithPosDis("WIPL_SE_CH_DRAG", pos.x, speed);
```

**Existing coverage:** `animations-interactions.md` §4 knows drag-to-arrow turns the page (from
Nintendo Support). Nothing describes what the screen looks or sounds like during a drag. Nintendo's
own support pages and the Nintendo World Report walkthrough describe the *gesture* (hold A+B, drag,
release; Disc Channel immovable) but never the visual.

**Importance: Medium-High.** Only visible during an intentional interaction, but it is one of the
Menu's signature behaviors with zero visual guidance today. **Dedicated doc: yes.**

---

### 2.6 The grid is **five pages wide**, not one — and only 42 tile slots exist — **MEDIUM-HIGH**

**What it is:** the channel grid layout instantiates **five** page-slots side by side — the visible
page plus two off-screen "peek" pages on each side — so a page transition is a real horizontal
slide of a wider strip, not a crossfade or a cut.

**Evidence** (`src/scene/channelSelect/iplChannelSelect.cpp`):

```cpp
mscBasePaneNames[5] = { "BaseMask0" … "BaseMask4" };   // per-page masks
mscUnk0PaneNames[5] = { "Picture_00" … "Picture_04" }; // per-page backgrounds
mscUnk1PaneNames[5] = { "Edge0" … "Edge4" };           // per-page edge graphics
mscMaskPaneName     = "ChMask";                        // top-most mask, drawn LAST
```

Draw order is explicit: the mask pane is hidden, the layout is drawn, then the mask is made visible
and drawn on its own on top.

**The outermost two pages are deliberately incomplete.** In Nintendo's own pane table, most of rows
`a` and `e` are **commented out in the shipping code** — only the single column that pokes onto
screen exists:

```cpp
"" /*"N_Ch_a01"*/, "" /*"N_Ch_a02"*/, "" /*"N_Ch_a03"*/, "N_Ch_a04",
```

i.e. `a04, a08, a12` and `e01, e05, e09` only. giantpune's independent implementation, written
without the decomp, agrees: `if( iconPanes.size() != 42 ) // there are 42 places for icons in the grid`
— **42 slots, not 60.**

**Existing coverage:** `animations-interactions.md` §4 explicitly flags the page-transition motion
(cut / slide / crossfade) as an **unresolved gap**, and leans on inferred "page indicator dots" to
argue for a slide. This resolves it: **it is a slide**, structurally, and the geometry is now known.

**Importance: Medium-High.** Closes a named open gap and directly informs implementation.
**Hand-off to the page-nav-arrows doc**, or a short dedicated "page transition" note.

---

### 2.7 Channel icons and empty slots animate on **randomized start frames** — **MEDIUM-HIGH**

**What it is:** every animated tile starts its loop at a **random frame**, so the grid never looks
synchronized. This applies to channel icons *and* to empty slots.

**Evidence** (`src/scene/channelSelect/iplChannelObj.cpp`):

```cpp
f32 ChannelObj::createEmptyThumbnail() {
    mpThumbLayout = layout::Object::create(..., "my_IplTop_b.brlyt");
    mpThumbAnim = mpThumbLayout->bind("my_IplTop_b.brlan");
    return System::getRndm()->get_u16() % 2000;      // random start frame
}
```

and for ordinary channels:
`frame = mpThumbAnim->getMinFrame() + (System::getRndm()->get_u16() % (u16)(maxFrame - minFrame));`
The value is applied via `setCurrentFrame(frame)` in `createThumbnail()`. Channels **with** an icon
module (`rsoIdx != 0 || csIdx != 0`) are the exception — they start deterministically at frame 0.

**Two findings.** (a) Randomized phase is a system-wide look-and-feel rule. (b) **Empty slots are
animated at all** — `visual-design.md` §2 and `channels.md` describe them as a *static* flat gray
rounded-rect with grain and a ghosted "Wii" watermark. That is incomplete; over a ~2000-frame
(~33 s) loop the tiles shimmer, out of phase with one another.

**Importance: High for (a)** — a grid animating in lockstep is an instantly-recognizable "fan
recreation" tell. **Medium-High for (b).** **Dedicated doc:** no — (a) → channel-tile-frame doc,
(b) → **hand-off to the empty-slot doc** (§4).

---

### 2.8 Live-data channel tiles: the News ticker and Forecast weather icon — **MEDIUM-HIGH**

**What it is:** the Forecast and News Channel tiles are **not static icons**. Since the 2007-08-06
update, the Forecast tile shows the *current weather* and the News tile runs a *live news ticker*,
on the Wii Menu itself.

> "After the August 6, 2007 update, the *Forecast Channel* showed the icon for the current weather
> on the Wii Menu." … "Starting with the August 6, 2007 update, the *News Channel* showed a **news
> ticker** in the Wii Menu, and when selecting the channel."
> — https://en.wikipedia.org/wiki/Wii_system_software

**The no-data state is documented too** (a recreation would never guess this):

> "not visiting the channel for a period of time resulted in the ticker not appearing, instead
> displaying 'You must use the *News Channel* regularly for news to be displayed on this screen' or
> 'Unable to obtain the news' on the preview screen until the channel was used." — *ibid*

**The mechanism, from the decomp:** `ChannelObj` distinguishes three icon classes via
`getIconRSOIdx()` / `getIconCSIdx()` — a plain animated icon (`icon.brlan` / `icon_Whole.brlan`), an
**RSO icon module** (a relocatable shared object with a dedicated heap and worker thread —
`system/iplChannelRsoThread.h`, `mpModuleHeaps[49]`, `MAX_MODULE_COUNT = 36000`, bound via
`icon_Start.brlan`), and a **ChannelScript bytecode VM** (`include/channelScript/`, `CHANSVm`).
Certain channels' icons are *programs*, not animations. This is also why they start at frame 0
rather than a random frame (2.7).

**A third live tile, unrequested but in the same family:**

> "It allows users to customize the *Photo Channel* icon on the Wii Menu with photos from an SD card
> or the Wii Message Board." — *ibid*

**Existing coverage:** `channels.md` describes these channels' *content*; nothing describes the tiles
as live, scripted or user-skinnable. **Importance: Medium-High** — a recreation with a live weather
tile is being *more* faithful, not less. **Forecast's pre-download placeholder art remains
unconfirmed.**

---

### 2.9 The complete home-screen sound ID list — **MEDIUM-HIGH, closes `audio.md`'s biggest gap**

`audio.md` states that no complete, verified list of `WIPL_SE_*` identifiers could be found, that
extraction tooling for `IplSound.brsar` is unreliable, and estimates "on the order of ~8–15" UI
stingers using the Wii Shop Channel as a proxy. The actual list, from the Menu's own code:

`WIPL_BGM_MENU`, `WIPL_SE_WII_START`, `WIPL_SE_CH_TARGETTING`, `WIPL_SE_CH_SELECT`,
`WIPL_SE_CH_UNSELECT`, `WIPL_SE_CH_HOLD`, `WIPL_SE_CH_DRAG`, `WIPL_SE_CH_SET`,
`WIPL_SE_CH_NOT_MOVE`, `WIPL_SE_BALLOON`, `WIPL_SE_BT_PUSH`, `WIPL_SE_BT_TARGETTING`,
`WIPL_SE_GRAY_BUTTON`, `WIPL_SE_DECIDE`, `WIPL_SE_CANCEL`, `WIPL_SE_SDCARD_IN`,
`WIPL_SE_SDCARD_OUT`, `WIPL_SE_DATE_FOCUS`, `WIPL_SE_DATE_SELECT`, `WIPL_SE_NEW_ARRIVAL`,
`WIPL_ME_NO_DISC_BANNER`, `WIPL_ME_GC_BANNER`, `WIPL_ME_INVALID_DISC_BANNER`

**23 IDs.** The estimate of 8–15 was low. Several imply UI facts on their own:

> **⚠️ SUPERSEDED (2026-07-24): the real number is 90, and the list is complete.**
> `include/sound/IplSound.rsid` is an auto-generated dump of the BRSAR's entire sound-ID
> table — all 90 entries, with bank and player enumerations. The 23 above are the subset
> this pass happened to grep out of call sites. Use the full table in
> `context/decomp-findings.md` §11, which also maps every main-menu trigger point.
> **One inference in the bullets below is also wrong:** `WIPL_SE_DATE_FOCUS` /
> `WIPL_SE_DATE_SELECT` do **not** make the on-menu date clickable. Those fire on the
> **Calendar** screen; the clock/date have no hit-testing, no event handler and no
> `gui::PaneManager` anywhere in `iplClock.cpp`, and the manual gives `Current Time` and
> `Current Date` bare callouts with no described action while every interactive element
> gets one. The `B_Cal` pane in the same shared layout belongs to the Message Board /
> Calendar screens, not the main menu. Treat the clock/date as decorative.
> See `context/decomp-findings.md` §8.1, §11 and `context/components/date-display.md` §7.
> Evidence tier: decomp + official.

- **`WIPL_SE_GRAY_BUTTON`** — a distinct "you clicked a disabled thing" sound (e.g. the grayed SD
  icon with no card in).
- **`WIPL_SE_BALLOON`** — the hover tooltip (2.1) has its own sound.
- **`WIPL_SE_CH_TARGETTING` vs `WIPL_SE_CH_SELECT` vs `WIPL_SE_CH_UNSELECT`** — hover, select and
  *un*-select are three separate cues, confirming `audio.md`'s hover-vs-select hypothesis and adding
  a third it did not predict.
- **`WIPL_SE_DATE_FOCUS` / `WIPL_SE_DATE_SELECT`** — **the date readout is focusable and clickable**
  (it opens the Calendar; note `my_IplTop_f`/`_g` are calendar layouts and `G_CalExit` is a bottom-bar
  animation group). No existing doc treats the date as interactive.
- **`WIPL_SE_SDCARD_IN` / `_OUT`** — SD insertion/removal is announced audibly while on the Menu.
- `WIPL_ME_*` are "music/jingle" cues for the no-disc, GameCube and invalid-disc banners.

`WIPL_SE_WII_START` and `WIPL_BGM_MENU` are fired together in `ChannelSelect::calcCommon()`, gated by
`msInitFlag` so they play only on first entry.

**Importance: Medium-High** — directly actionable, and it retires an explicitly-flagged gap.
**Hand-off: rewrite `audio.md` §5 against this list.**

---

### 2.10 Bottom-bar animation groups reveal several undocumented sub-elements — **MEDIUM-HIGH**

Nintendo's group and button tables for `my_IplTop_e.brlyt` (`src/scene/button/iplButton.cpp`,
`iplButton.h`):

```
Buttons: B_Bbs, B_Ch, B_Set, B_Cal, B_Add, B_CalExit, B_AddExit, B_Add_R, B_Dust, B_ArwR, B_ArwL
Groups:  G_SeenChange, G_ArwRoop, G_ArwR_Ac, G_ArwL_Ac, G_ArwR_HDAc, G_ArwL_HDAc,
         G_ArwR_End, G_ArwL_End, G_BbsSignal, G_BbsSignal_new, G_Dust, G_TabaR, G_TabaL,
         G_CalExit, G_Cmn_R
```

New home-screen facts falling out of this:

- **The page arrows run a permanent idle loop.** Not on hover — always:
  `arrowLoop = bindToGroup("my_IplTop_e.brlan", "G_ArwRoop", false); arrowLoop->setAnmType(ANIM_TYPE_LOOP); arrowLoop->play();`
  giantpune's frame ranges: idle `10011–10053` (looping), mouse-over `10600–10620`, mouse-out
  `10800–10812`, click `10700–10720`.
- Each arrow is **two panes** — `N_ArwL_Roop` (the looping body) and `N_ArwL_End` (an end cap) — with
  separate glyph materials and a clicked variant: `ArwBtnL` / `ArwBtnL_Ac`, `ArwBtnR` / `ArwBtnR_Ac`.
- `G_ArwR_End` / `G_ArwL_End` = a distinct **end-of-range** animation; `G_ArwR_HDAc` = a third state
  beyond plain active, *suspected* to be the drag-hover ("hold") highlight.
- **Two separate mail indicators**, with Nintendo's own comments distinguishing them:
  `G_BbsSignal` — *"Bind 'new messages' animation"*; `G_BbsSignal_new` — *"Bind 'got a new message'
  animation."* Plus `startMailNumAnm()`/`stopMailNumAnm()` and `IDANIM_BOARD_BBS_NUM_LOOP`: there is a
  **message-count number** on the button, distinct from the blink. giantpune identifies the panes:
  *"these 2 panes show up on the 'mail' button when it wants to tell you you have some messages"* —
  `T_BbsMark1` and `Picture_00`.
- **`B_Dust` / `G_Dust` — a trash-can button.** *Suspected, unconfirmed* whether it ever appears on
  the channel-select screen (plausible as a drag drop-target) or only in Data Management /
  save-data-edit. `ChannelSelect` does not reference `BTN_TRASH_DELETE` in the paths I read.
- **`my_BtnStop_a.brlyt` (pane `B_Stop`, group `G_Stop`) in `cmnBtn.ash`** — an entire extra
  bottom-bar button with In/Out/Focus/Select animations that most recreations don't know exists.
  Purpose unconfirmed.

---

### 2.11 The HOME Menu over the Wii Menu is a **one-button** variant — **MEDIUM-HIGH**

**What it is:** HOME works on the Wii Menu, but renders a special reduced layout. This is the single
most likely thing a recreation gets wrong, because everyone copies the in-game two- or three-button
version.

> "The [System Menu] does not have a Reset button." — https://wiibrew.org/wiki/HOME_Menu

WiiBrew's own gallery labels the three variants: `HOMEMenu1Btn.png|HOME Menu for System Menu`,
`HOMEMenu2Btn.png|Standard HOME Menu`, `HOMEMenu3Btn.png|HOME Menu with digital manual attached`.
Verified against the capture at https://wiibrew.org/w/images/1/1e/HOMEMenu1Btn.png

Layout on the Wii Menu: black bar across the top with "HOME Menu" flush left and a white pill
`🏠 Close` button flush right; body black with **fine horizontal scanlines**; **one** centered
pale-blue glossy pill reading "Wii Menu"; the P1–P4 battery strip and "Wii Remote Settings" pinned at
the bottom. No Reset, no Operations Guide.

**Two subtle behaviors worth copying:**

> "The [Wiimote] pointer does not blink when closing the HOME Menu on the System Menu. It still
> blinks when opening the HOME Menu, and it blinks in all other titles." — WiiBrew, HOME Menu

> "[Photo Channel 1.1], [Forecast Channel], and [News Channel] … have an opaque HOME Menu." — *ibid*

**Sub-elements:** the **P1–P4 battery strip** (a rounded pill split into four cells, each with a
4-segment horizontal battery glyph; empty outline = not connected), the **Wii Remote Settings panel**
(`Volume` with a ~12-bar ascending blue staircase slider between grey `−`/`+` keys; `Rumble` as
On/Off pills, cyan when active; `Connection` as a wide grey `Reconnect` button — verified at
https://wiibrew.org/w/images/1/10/HOMEMenuWiimote.png), and the **Reconnect screen** ("Simultaneously
press ① and ② on each Wii Remote in the desired player order").

> "Display the battery life for any remotes currently connected to the console." — Wii Operations
> Manual, Channels & Settings, p.64,
> https://archive.org/download/wii-opmanual-chset/WiiRVKChEng_djvu.txt

**Important negative:** there is **no controller or battery indicator on the Wii Menu home screen
itself** — it exists only inside the HOME overlay.

**Existing coverage:** none; the inventory does not list the HOME overlay at all. **Importance:
Medium-High** — arguably the most-used "adjacent screen" of the whole Menu experience.
**Dedicated doc: yes.**

---

### 2.12 "Wrong" (corrupt) channel tile — a **solid black**, un-animated tile — **MEDIUM**

A distinct third tile state alongside "populated" and "empty", for a channel whose banner data fails
its integrity check. `ChannelObj::createThumbnail()` branches three ways — `!isValid()` →
`createEmptyThumbnail()`; `checkData() != RESULT_SUCCESS` → `createWrongThumbnail()`; otherwise
`createWadThumbnail()`.

```cpp
f32 ChannelObj::createWrongThumbnail() {
    mpThumbLayout = layout::Object::create(..., "my_IplTop_b.brlyt");
    mpThumbLayout->FindPaneByName("Ch0")->SetVisible(false);
    mpThumbLayout->FindPaneByName("Ch1")->GetMaterial()->SetTevColor(0, (GXColorS10){0,0,0,255});
    mpThumbAnim = NULL;      // explicitly NOT animated
    return 0.0f;
}
```

Same frame asset as an empty tile, pane `Ch0` hidden, pane `Ch1` tinted opaque black, no animation —
**the one genuinely static tile on the grid.** There is also a dedicated `corrupt_icon.ash` archive
(and a `tmptitle_icon.ash`, purpose unconfirmed — *suspected*: a placeholder for a channel that is
mid-download or awaiting its real banner). This incidentally reveals the tile frame's internal
structure: `my_IplTop_b.brlyt` has panes `Ch0` and `Ch1`, one hideable, one tintable.

**Importance: Medium** — a nice demo state, cheap to add, not required for a faithful default screen.

---

### 2.13 Widescreen is a **texture swap**, not a stretch — **MEDIUM**

In 16:9 the Menu does not simply scale. It copies textures off two **hidden donor panes** onto the
live panes:

```cpp
if (SCGetAspectRatio() == SC_ASPECT_RATIO_16x9) {
    mpLayout->FindPaneByName("ChangeTex16x9")->GetMaterial()->GetTexture(&texObj[1], GX_TEXMAP0);
    mpLayout->FindPaneByName("Picture_16")->GetMaterial()->GetTexture(&texObj[0], GX_TEXMAP0);
```

giantpune's equivalent: `SetMaterialIndex( channelFrame, "Edge%i", 0, 2 )` in widescreen. The
drag-overlay does the same thing (2.5). And from the pixel-accurate theme community, at least one
element is *resized*, not just re-textured:

> "Made the SD card icon a bit smaller (only for the widescreen variant) to match the stock menu
> better" — https://gbatemp.net/threads/accurate-wii-menu-usbloadergx-theme.665889/page-2

**Importance: Medium** — matters if the recreation is responsive across aspect ratios; `technical-
specs.md` should record that 4:3 and 16:9 are separate art, not a CSS transform.

---

### 2.14 Panes with no public name: tile glow layers, divider lines, corner ornaments — **MEDIUM**

diddy81's theme editor labels byte offsets inside `my_IplTop_a.brlyt`, exposing panes that have no
other documentation (https://github.com/diddy81/Wii-Theme-Brlyt-Editor/blob/master/chansel.py):

- `def behind_channel_outer(...)` — 20 offsets
- `def behind_channel_inner(...)` — 20 offsets
- `def line(r,g,b,a): offset = [0xDE5, 0xFB1, 0x111D, 0x1289, 0x13F5]` — **five divider lines**
- `def channelborder(...)` — 5 offsets (one per page — the `Edge` panes)

i.e. **each tile sits on a two-layer glow (outer + inner)**, and the grid has five recolorable
divider lines. Separately, `it_ObjCubeEdit_a.brlyt` and `it_ObjChannelEdit_a.brlyt` carry a themable
**"free blocks" counter** (offsets `0x515` / `0x52D`) — an element that appears only in the
channel-move / Data Management overlay.

Independent corroboration from the best HTML/CSS recreation's asset list
(https://github.com/andrewplus/Wii.JS/tree/master/assets/images) — four separate **corner ornament**
files, which nobody in `context/` has ever mentioned:

`border-topleft.png`, `border-topright.png`, `border-bottomleft.png`, `border-bottomright.png`,
plus `bg-pattern.png` (a **tiled background texture**, not a flat colour — relevant to inventory
item 12, which flags background texture as uncovered), `btn-texture.png` (bottom-bar button gloss),
`channel-border.png`, `channel-hover.png`, `mini-bottom-bg.png`, `splash-bar.png`, `bottom-title.png`.

**Importance: Medium.** Corner ornaments in particular are exactly the "everyone overlooks this"
category the audit was asked for. *Confidence caveat:* the Wii.JS asset names are one recreator's
decomposition, not Nintendo's — treat as a checklist to verify against the screenshot, not as proof.

---

### 2.15 Icon panes are **GX-scissored** to their own tile — **MEDIUM**

`chPane->SetGxScissorsForchildLayouts( true );` — channel banner animations that overshoot the tile
are **hard-clipped at the hardware level**, not merely overflowed by a parent. In CSS terms this is
`overflow: hidden` on each tile with no exceptions, which matters because authored channel icons do
animate beyond their frame. Also `ChannelSelect::setChannelScissor(const ChannelObj*)` exists as a
first-class method.

---

### 2.16 Safe Mode is a distinct Wii Menu state — **LOW-MEDIUM**

`ChannelSelect` checks `System::isSafeMode()` in five places. When true, the **SD Card Menu button is
never given an event handler** and its insert/remove animations are suppressed entirely; selecting
any channel raises a dialog instead of launching —
`System::getDialog()->callBtn0(MESG_CHAN_SEL_SAFE_MODE, 180);` — and the scene enters
`STATE_NORMAL_SAFE_MODE_DIALOG`.

Out of scope for a default recreation, but it documents a **generic one-button system dialog widget**
(`System::getDialog()`, `callBtn0`, and the `dlgWdw.ash` archive) drawn over the Menu — which the
transient-states/overlays doc will want. Nintendo's manual supplies the error *strings* for this
widget (see §5), but **the dialog chrome — colors, borders, button styling — remains unconfirmed.**

---

### 2.17 Play-time-limit timer and `LimitOver` scene — **LOW, suspected/unconfirmed purpose**

`src/scene/channelTitle/iplChannelTitle.cpp` creates two timer layouts on the banner/preview screen —
`my_Timer_a.brlyt` (`mpLimitRemainLyt`, text pane `T_Timer`) and `my_Timer_b.brlyt`
(`mpLimitDoneLyt`, text pane `T_TimerMes`, string `MESG_CHAN_SEL_LIMIT_DONE`) — and there is a whole
separate `scene/limitOver/` with a region/language-dependent `getCountryIndex_()` and its own
`limitOver.ash`.

**Honest status: I could not determine what the limit is.** Candidates: a demo/trial play-time
restriction, a kiosk/retail-demo mode, or a region-mandated play-time limit. The region-indexed
lookup leans toward the latter two. **Listed as suspected, unconfirmed.** Low importance either way.

---

### 2.18 The channel-preview ("banner") screen has a **black frame and side arrows** — **MEDIUM**

Inventory item 14a treats the preview as "enlarged tile + Start / Wii Menu buttons".
`wii_design_specs.pdf` §3.4.1 (p.16) adds two elements it omits:

> "The banner is displayed with the prepared buttons and **the black frame** in the foreground (see
> Figure 3-1). **Arrows are displayed on the screen edges**, so make sure that important information
> is not obscured by them."

Figure 3-1 (p.17) shows a rounded-corner black vignette around the banner with a blue arrow at each
screen edge. §6 (p.25) confirms the arrows *cycle between channels without returning to the grid*
("…or the moment the transition effect from the **adjacent banner** completes") and gives a hard
timing rule:

> "Regardless of how quickly the banner Start button is clicked, the banner screen is displayed with
> a **guaranteed wait of at least one second**."

§4.2 (p.20) gives the audio rules: banner sound starts when the zoom-in completes, **fades out when
"Wii Menu" is selected, and is cut after two seconds when "Start" is selected** (with a noted
North-American hardware quirk where it stops abruptly instead of fading).

The decomp corroborates and extends: `my_ChTop_a.brlyt` with `ChangeIn`/`ChangeOut`/`ChangeRoop`/
`ChangeTextIn`/`ChangeTextOut` (the adjacent-banner transition), `FocusBtn_on`/`FocusBtnA_off`/
`OnBtn`/`OffBtn`/`SelectBtn_Ac` (button states), and `my_ChTopMes_a.brlyt` — a **"locked dialog"**
(`mpLockedDialogLyt`, Appear/Lost anims) shown when parental controls block the channel, at which
point `scene/parentalDialog` takes over.

**Hand-off to the transient-states/overlays doc.**

---

### 2.19 Parental controls do **not** mark the tile on the grid — **negative finding, MEDIUM value**

Worth stating explicitly because it is the intuitive-but-wrong assumption, and because two
independent methods agree.

*From code:* all parental handling lives in `scene/channelTitle` (`calcNormalParentalDialog()`,
`mParentalState`, `PARENTAL_STATE_NONE/SUCCESS/FAILED`, `ParentalDialog::RESULT_SUCCESS /
RESULT_OVER_ATTEMPTS / RESULT_CANCELLED`) and `scene/parentalDialog` / `prntDlg.ash`.
**`src/scene/channelSelect/` contains no reference to parental controls at all.**

*From the manual:*
> "If Parental Controls are applied and a user attempts to play or download content that exceeds the
> Parental Controls setting, the user will be prompted to enter the Parental Controls PIN…"
> — Wii Operations Manual – Channels & Settings, p.48–49,
> https://archive.org/download/wii-opmanual-chset/WiiRVKChEng_djvu.txt

Nintendo's own [Parental Controls Overview (Wii)](https://en-americas-support.nintendo.com/app/answers/detail/a_id/2491/)
likewise lists *what* is restricted, never a tile-level visual.

**Implication: do not add padlock badges or grayed tiles to the grid.** Model it as a modal PIN
prompt on launch.

---

## 3. Region, hardware and conditional variants (lower priority, for completeness)

| Variant | Status | Source |
|---|---|---|
| **Clock format** — 12h + AM/PM in the Americas, **24h in Europe** | **Confirmed, in code.** `iplClock.cpp` shows/hides panes by region: JPN/KOR hide `AM_PM_R` (indicator left of the time), USA hides `AM_PM` (indicator right), and the **`default` case hides both** → PAL runs 24-hour with no indicator at all. giantpune hit this blind: *"theres an AM/PM thing on the right and the left. remove the left one."* | decomp; corroborated by Nintendo UK |
| **System Update notice on the Disc Channel** | Confirmed. "an icon on the *Disc Channel* that says 'Wii System Update' appears." Decomp: pane `N_DiscUpdateIcon` swaps in for `N_GCIcon`; disc state `DISK_STATE_DISK_UPDATE` | https://en.wikipedia.org/wiki/Wii_system_software |
| **GameCube disc** → different tile art | Confirmed. `my_GCIcon_a.brlyt`, `GCBann.ash`, `my_GCTop_a.brlyt` (`BackLoop`), `DISK_STATE_GC_GAME_WAIT`/`_GC_GAME`, jingle `WIPL_ME_GC_BANNER` | decomp |
| **Unrecognized disc** | Confirmed. Banner anims `Unknown` / `UnknownLoop` / `UnknwnEject`; jingle `WIPL_ME_INVALID_DISC_BANNER` | decomp |
| **SD icon grayed with no card** | Confirmed twice. "The icon will appear gray if there is no SD Card inserted." (p.4); "If the icon is gray, there is no SD Card inserted" (p.66). Live-polled every frame via `getBoard()->getSDState()`; plays `IDANIM_BTN_INSERT` + `WIPL_SE_SDCARD_IN` on insertion | Ops Manual; decomp |
| **Message Board blink on new mail** | Confirmed. "Wii Message Board … Blinks when you have received a message." | Ops Manual p.4, p.30 |
| **Disc-slot LED** | Hardware only, **not on-screen**, and a *three-state* setting (bright blue / dim blue / off), not a boolean | Ops Manual p.62 |
| **Korea** | Forecast and News Channels unavailable; a "Region Select Channel" exists | https://wiibrew.org/wiki/System_Menu |
| **Japan** | Nintendo Channel is "Everybody's Nintendo Channel"; *Wii no Ma* (2009-05-01 – 2012-04-30) | Wikipedia |
| **Europe** | Country-change option added in the European System Menu | WiiBrew |
| **Wii Mini** | No SD slot, no Wi-Fi → no SD Card Menu icon, no Shop/Photo/WiiConnect24 channels. *Hardware removals confirmed; exact resulting channel roster is* **suspected-unconfirmed** | https://en.wikipedia.org/wiki/Wii_Mini |
| **Wii Family Edition** | Only GameCube support removed; no Wii Menu difference found | Wikipedia |
| **50/60 Hz indicator on the home screen** | **Believed not to exist.** No evidence found — recommend not implementing | — |
| **"Downloading channel" tile animation** | **Unconfirmed.** One secondary source describes "Assistant Channels" (pre-installed stub tiles with a download button, replaced once downloaded); wii.fandom.com was Cloudflare-blocked throughout. Do not build without better sourcing | — |

---

## 4. Hand-offs — facts the in-flight docs probably don't have

| To the doc on… | Fact to incorporate |
|---|---|
| **Empty slot + SD card icon** | Empty tiles are **animated** (`my_IplTop_b.brlan`, random start frame 0–1999), not static, and get **no hover balloon** (`initBalloon()` early-returns when `!isValid()`). The SD glyph in `reference_screen.png` is a literal small SD-card shape with a notched top-right corner, drawn **flat on the bar with no button circle or cyan ring** — unlike the Wii and mail buttons. Its own layout is `mn_Sdcard_Btn.brlyt` (panes `N_Btn_On` / `N_Btn_Off`) with a **permanent glow loop** `mn_Sdcard_Btn_On_Roop.brlan` when a card is in, an `_Insert` animation that fires live on insertion, and `_BtnL_In/Out/On/RollOver/RollOut`. **It is drawn smaller in 16:9 than in 4:3.** Sounds `WIPL_SE_SDCARD_IN` / `_OUT`; disabled clicks play `WIPL_SE_GRAY_BUTTON`. |
| **Page-navigation arrows** | `G_ArwRoop` = **permanent** idle loop (frames 10011–10053), not hover-triggered; mouse-over 10600–10620, mouse-out 10800–10812, click 10700–10720. Each arrow is two panes (`N_Arw*_Roop` + `N_Arw*_End`) with glyph materials `ArwBtnL`/`ArwBtnL_Ac`. `G_Arw*_End` = end-of-range state; `G_Arw*_HDAc` = a third state (suspected drag-hover). Visibility conditional on `mCurrentPage`/`mMaxPages`, and **`mMaxPages` is dynamic, not fixed at 4**. **No page-count indicator exists in the channel-select layouts — inventory item 14b resolves negative.** The grid is a **five-page strip** (2.6), so the transition is a slide. In `reference_screen.png` the arrow is a **glossy beveled triangle** with dark blue outline and interior highlight, sitting *inside* the rightmost grid cell (row 2). |
| **Mail / Message Board button** | Two distinct indicator groups with Nintendo's own comments — `G_BbsSignal` ("new messages") and `G_BbsSignal_new` ("got a new message") — plus `startMailNumAnm()` / `IDANIM_BOARD_BBS_NUM_LOOP`: a **message-count number**, panes `T_BbsMark1` and `Picture_00`, hidden by default. Also has a hover balloon (`BALLOON_BBS_BOARD`). |
| **Wii button** | Has a hover balloon (`BALLOON_SETTING` / `BALLOON_CH_SEL`); button panes `B_Ch` / `B_Set`; sounds `WIPL_SE_BT_TARGETTING` (hover) and `WIPL_SE_BT_PUSH` (press). |
| **Date display** | **Settled from files already in this repo.** `wii_design_specs.pdf` Figure 1-2 (p.6) shows time **and** date together ("3:00 PM" over "Tue 8/7"); `reference_screen.png` agrees ("12:00 AM" / "Fri 1/1"). **The date is also interactive** — `WIPL_SE_DATE_FOCUS` and `WIPL_SE_DATE_SELECT` exist, and `my_IplTop_f`/`_g` are calendar layouts with a `G_CalExit` bottom-bar animation. Note `my_IplTop_c` is described as "grey background + date", i.e. the date may live on a different layer than the clock. |
| **Clock** (`clock.md`) | `ANIM_CLOCK_COLON_BLINK` — **the colon blinks**, on pane `ClockTen`, played `if (!(time.sec % 2))`. Each digit has its own `_APPEAR` and `_LOST` animation (`Clock0`–`Clock3`, `AM_PM`, `AM_PM_R`) — **digits animate individually as they change**, not as a block. Digits are texture swaps from hidden panes `Num0`–`Num9`. **Leading-zero suppression:** `FindPaneByName("Clock3")->SetVisible(mCurrentTex.hourDigit2 != 0)`. Region logic resolves the 12h/24h ambiguity outright (§3). The stock clock renders a dim **"88:88" ghost-segment layer** behind the live digits — a pixel-accurate theme author calls this out as the hardest thing to match, along with the glyph shapes of `0`, `4` and `7`, and notes the stock clock font is "much thinner" than most recreations make it. |

> **⚠️ SUPERSEDED (2026-07-24) — two corrections to the Clock row above:**
> 1. **"Digits animate individually as they change" is WRONG.** The
>    `my_Clock_a_NumApear` / `NumLost` animations are *bound* but **never played**:
>    `clock::appear()` is called only from `stt_disappear()`, which runs only in
>    `STATE_DISAPPEAR`, and **`STATE_DISAPPEAR` is never assigned anywhere in the
>    codebase** (repo-wide grep finds only its enum declaration and its switch case).
>    Meanwhile `stt_normal()` calls `change_tex()` **directly** on a time change. Since
>    `iplClock.cpp` is a **`Matching`** (byte-exact) translation unit, this is not a
>    decompilation artefact — the shipped console renders digit changes **instantly**.
>    These are Nintendo's own intended-but-unshipped transitions; using them is an
>    "authentic but unshipped" embellishment, not a recreation.
> 2. The **"88:88" ghost-segment layer** is **disputed**. Direct pixel measurement of
>    `reference_screen.png` finds flat `#9B9B9B` ink and **no drop shadow**, and the same
>    GBAtemp thread is the origin of the drop-shadow claim that already caused a bad
>    implementation in this project. Ghost segments and a drop shadow are *different*
>    claims, and the ghost layer has been neither confirmed nor refuted by measurement —
>    but note the source is a **USBLoaderGX theming** thread, not the System Menu. Do not
>    implement it as settled.
> Everything else in this row (colon blink, texture swaps, leading-zero suppression,
> region logic) is confirmed.
> See `context/decomp-findings.md` §9.6 and `context/components/date-display.md` §5d.
> Evidence tier: decomp (byte-exact) + pixel measurement.
| **Channel tile frame** | Frame is `my_IplTop_b.brlyt`, panes `Ch0` / `Ch1`. Focus highlight is a **separate layout per tile**, `my_IplTop_d.brlyt`, pane **`Cursur_a`** (misspelled in the shipping binary), with exactly three animations — `FocusOff`, `FocusOn`, `Select` — so hover and click are distinct states, resolving `visual-design.md`'s "hover/select treatment unconfirmed" flag structurally. Each tile sits on a **two-layer glow** (`behind_channel_outer` + `behind_channel_inner`). Icon panes are **GX-scissored** (2.15). Icon canvas half-extents in code are `{64.0, 48.0}` (4:3) and `{85.0, 48.0}` (16:9) = 128×96 / 170×96, matching the spec PDF exactly. |
| **Bottom bar container** | The cyan divider is a **shallow valley curve**, high at both ends and dipping across the centre; in `reference_screen.png` the **time sits above the curve and the date below it**. The bar, the tiles and the background all carry a fine **horizontal scanline/striping texture** (cf. `bg-pattern.png` in Wii.JS — a tiled texture, not a flat colour). The grid has **five recolorable divider lines**. The bar hosts one more button than anyone documents: `my_BtnStop_a.brlyt` / `B_Stop`. |
| **Transient states / overlays** | The preview screen's black frame, edge arrows, adjacent-banner browsing, 1-second minimum, banner-audio start/fade/cut rules, and the parental "locked" dialog `my_ChTopMes_a.brlyt` (2.18). The generic one-button system dialog `System::getDialog()->callBtn0(msg, 180)` / `dlgWdw.ash` used for the Safe Mode notice (2.16). The **HOME Menu one-button variant** (2.11) if it is considered in scope. |
| **Disc Channel** | `my_GCIcon_a.brlyt` = separate GameCube tile art; `N_DiscUpdateIcon` pane swaps in for `N_GCIcon` when the disc carries a system update. The no-disc tile is its **own layout** (`mpNoDiskLayout`/`mpNoDiskAnim`), swapped in by `calcNormal()`. Insert/eject is `my_DiskCh_In.brlyt` (`DiskIn`/`DiskOut` anims, with its own `16x9` pane). Banner-side anims: `DiskStart`, `DiskIn`, `DiskLoop`, `DiskEnd`, `DiskEject`, `DiskLost`, `Unknown`, `UnknownLoop`, `UnknwnEject`. Jingles `WIPL_ME_NO_DISC_BANNER`, `WIPL_ME_GC_BANNER`, `WIPL_ME_INVALID_DISC_BANNER`. |
| **`audio.md`** | Replace the estimated 8–15 SFX with the **23 confirmed IDs** in 2.9, and add positional/velocity-driven playback (`startSEwithPos`, `holdSEwithPosDis`). |
| **`technical-specs.md`** | Widescreen is a **texture swap via hidden donor panes**, not a scale (2.13). Banner rendering targets from the spec PDF §3.4.1: frame buffer **608×456**, screen **670×456**; banner display area 590×332 (4:3) / 810×332 (16:9). The Menu font is **Rodin in two weights** — one recreation ships `FOT-RodinProN-B.otf` *and* `FOT-RodinProN-DB.otf` (https://github.com/aica7/Liink) — so `technical-specs.md`'s single-substitute-font recommendation should become a two-weight pairing. |

---

## 5. What I checked and found already adequately covered

Verifiable negative results — actively examined this pass, produced nothing new.

- **`wii_design_specs.pdf`, all 26 pages, read in full.** Everything bearing on the home screen was
  already in the inventory (12-channel grid, Disc Channel fixed upper-left, 128×96 / 170×96 icon
  canvas, mandatory icon animation, "Newly Arrived" groups, `New_<LANG>` naming, PAL50 1.2× playback).
  The genuinely new material was §5.2.3 (→ 2.1), §3.4.1 + §4.2 + §6 (→ 2.18), and the Figure 1-1/1-2
  clock anomaly (→ 2.2). The document contains **nothing** about the bottom bar, background, cursor,
  page arrows or the half-pill platforms — it is an icon/banner *authoring* spec, not a Menu UI spec.
  Its remaining chapters (2.8 layout tooling, 5 `WiiMakeBanner.exe` packing, 4.1/4.3/4.4 sound formats
  and sync math) have no recreation value.
- **`reference_screen.png` enumerated region by region** at 5–6× nearest-neighbour zoom (top-left /
  left edge / right edge / full bottom bar). Every element I could resolve maps to an existing
  inventory item. **Nothing unexplained remained — the screenshot has been mined out.** What it
  yielded were refinements (arrow is beveled not flat; SD glyph has no button chrome; time above /
  date below the curve; global scanline texture; grid inset ~8% from the left), all handed off in §4.
  Note the file is only 420×236 — it cannot settle fine questions and should be replaced with a
  higher-resolution capture.
- **WiiBrew as a source for asset/layout names: exhausted and negative.** `wiki/System_Menu`,
  `wiki/Wii_Menu_Themes` and `wiki/ThemeMii` were all fetched and contain **zero** filenames. Stop
  looking there for this class of question; use the three repos in §1.0.
- **Inventory item 14b (page-count indicator).** Resolved **negative** — no dot or numeric indicator
  exists in `scene/channelSelect`. The only numeric page readout in the codebase belongs to the SD
  Card Menu, exactly as the Ops Manual implied.
- **Inventory item 11 (date display contradiction).** Resolved **affirmative** — date is shown. Two
  independent confirmations, both from files already in this repo. No further research needed.
- **Inventory item 14c ("Newly Arrived" badge).** Confirmed and implemented, plus timing: the group
  lookup chain is `New` → `New_<language>` → `New_<region-preferred-language>` → give up
  (`bindNewAnm()`, with Nintendo's own comment describing exactly that), it binds `icon_New.brlan`,
  and `updateNew()` re-triggers every **4200 frames (≈70 s at 60 Hz)**. Sound: `WIPL_SE_NEW_ARRIVAL`.
  The *visual* is channel-authored, not system-authored, so there is no single system asset to
  document — the behavioral gap is now closed.
- **Wii Remote pointer.** Partially superseded rather than confirmed — see 2.3. `animations-
  interactions.md` §2's hardware math and smoothing algorithm remain good; its single-cursor model
  does not. *(Caution when reading the decomp: `ChannelObj`'s "cursor" is the per-tile focus ring
  `my_IplTop_d.brlyt`, **not** the hand pointer. Do not conflate.)*
- **Parental controls on the grid.** Actively investigated by two independent methods; both say **no
  tile decoration** (2.19). A useful negative.
- **Controller/battery indicator on the home screen.** Actively investigated; **does not exist**
  outside the HOME overlay (2.11).
- **Health & Safety screen, Wii Points, Wii Speak.** The inventory's exclusions hold. `scene/health`
  and `health.ash` / `it_Has_a.brlyt` confirm H&S is a real scene with per-language panes
  (`Has_US_ENG`, `Has_EU_GER`, `Has_JPN`, `Push_CHN`, …), but it is pre-Menu and correctly out of scope.
- **Background/backdrop.** No separate background layout or animation in `scene/channelSelect` — the
  backdrop lives in `my_IplTop_a.brlyt` as per-page `Picture_00`–`Picture_04` panes. This weakly
  supports `visual-design.md`'s "flat light neutral" reading, though the Wii.JS `bg-pattern.png`
  evidence (2.14) argues it is *textured*, not flat. Not fully resolved.
- **Error dialog strings** are available verbatim from the Ops Manual troubleshooting table
  (https://archive.org/download/wii-opmanual-chset/WiiRVKChEng_djvu.txt) — e.g. *"Error Occurred.
  Press the Eject button and remove the disc…"*, *"Could not read the disc…"*, *"Wii console save
  memory is corrupted…"*, *"Wii Remote error…"*, plus two insufficient-space messages. **The strings
  are confirmed; the dialog chrome is not.**

---

## 6. Limits of this sweep — read before trusting the above

- **The decomp findings are read from source code, not from running software or art assets.** The
  repo ships no assets. I can tell you `my_TVShade_a.brlyt` exists, is bound to Apear/Lost animations
  and has 4:3 and 16:9 variants — I **cannot** tell you what it looks like. Every §2 finding needs a
  visual pass (video capture, or a WAD asset dump via ThemeMii/Wii Theme Brlyt Editor) before it can
  be implemented pixel-accurately. Treat §2 as *"these elements exist and here is their behavior"*,
  not *"here is how to draw them."* **This is the single biggest remaining gap and the obvious next
  work item.**
- **It is a work-in-progress decompilation.** The README notes the code is "not 100% shiftable" and
  some components are imperfectly reconstructed. Names and constants are reliable (they come from the
  binary); my *interpretations* of ambiguous names are inferences and are labelled as such.
  Nintendo's own `unk_*` / `mscUnk0PaneNames` placeholders mean a few pane roles are read from
  context, not from a label.
- **It targets 4.3 only** (43U/E/J/K). `version-history.md` remains the source for earlier versions.
- **I did not read every file.** Read: all of `scene/channelSelect/`, `scene/button/iplButton.h` and
  parts of `iplButton.cpp`, `scene/textBalloon/`, `scene/limitOver/iplLimitOver.h`; grepped
  `scene/channelTitle/`, `scene/sdButton/`, `system/iplPointer.cpp`. **Unexamined and plausibly
  productive:** `scene/backMenu`, `scene/misc`, `scene/board`, `src/layout/`, `src/system/`,
  `src/sound/`, and especially the **`config/43*/` symbol maps**, which would give a *complete* list
  of every layout asset the Menu references. That map sweep is the obvious next systematic pass.
- **Search-quota degradation.** Both web-research streams exhausted their WebSearch budget early and
  fell back to direct fetches and alternate backends, several of which CAPTCHA-blocked mid-run.
  **wii.fandom.com was Cloudflare-blocked throughout** — the likeliest source for the still-open drag
  and download-animation visuals. **GBAtemp thread page 1 returned HTTP 403** (page 2 fetched fine).
  The GBAtemp/theme-community angle is under-mined, not exhausted.
- **Explicitly marked suspected / unconfirmed:** the trash-can button's presence on the home screen
  (2.10); the purpose of the play-time limit system (2.17); the semantic reading of `HDAc` (2.10);
  what the empty-slot animation actually animates (2.7); whether `my_BScroll_a` is reachable on the
  channel grid vs. only in list scenes (2.4); the purpose of `tmptitle_icon.ash` (2.12); the
  Wii Mini's exact channel roster; Forecast's pre-download placeholder art; the "downloading channel"
  tile animation; error-dialog chrome; and the Wii.JS asset decomposition in 2.14 (one recreator's
  reading, not Nintendo's).

---

## 7. Recommended additions to the deep-dive queue

Slotting into the inventory's existing prioritized list of seven:

| New rank | Doc | Rationale |
|---|---|---|
| **1 (new)** | **Re-audit the whole corpus against `wii-ipl` + the two companion repos** (§1.0), and run the `config/43*/` symbol-map sweep | Not a component doc — a process fix, and the highest-leverage single action available. Several standing "unconfirmed" flags die immediately; `audio.md` §5 can be rewritten from fact. |
| **2 (new)** | **Channel hover title balloon** (2.1) + bottom-bar button balloons (2.10) | Officially mandated, constantly visible, currently 100% absent from the corpus, cheap to build. |
| **3 (new)** | **The "Wii Menu" boot text + clock handoff** (2.2) | First thing the user sees; once-per-session; explains an anomaly in the project's own reference PDF. |
| **4 (new)** | **Cursor system rewrite** — four player cursors, the `_Cat` grab variant, and `my_BScroll_a` (2.3, 2.4) | Corrects a doc the inventory currently rates as near-complete and slates for mere "promotion". It is not complete. |
| **5 (new)** | **Channel drag-and-drop visual + audio states** (2.5, plus the 5-page slide geometry in 2.6) | Signature interaction, zero visual documentation, and it closes the page-transition gap. |
| **6 (new)** | **HOME Menu overlay (one-button variant)** (2.11) | The most-used adjacent screen; entirely absent from the inventory. |
| **7 (new)** | **A higher-resolution reference capture** | 420×236 is too small to settle the fine questions the other docs keep deferring to it. |
| — | *(inventory's #1 Date display)* | **Downgrade / close** — resolved in §4 from sources already in the repo. Re-scope toward the date's *interactivity* (calendar) instead. |
| — | *(inventory's #2 Page-nav + indicator)* | Keep, but 14b is now resolved negative and the arrow's states/frame ranges are enumerated in §4. |

---

*Primary sources this pass:
[wii-ipl — Wii Menu 4.3 decompilation](https://github.com/koopthekoopa/wii-ipl);
[wii-system-menu-player](https://github.com/giantpune/wii-system-menu-player);
[Wii-Theme-Brlyt-Editor](https://github.com/diddy81/Wii-Theme-Brlyt-Editor);
`wii_design_specs.pdf` (RVL-06-0166-001-L, "Icon and Banner Specifications" v1.0.0, Nintendo,
2008-02-26), in-repo at the project root — §3.4.1, §4.2, §5.2.3, §6, Figures 1-1/1-2;
`reference_screen.png`, in-repo, 420×236;
[Wii Operations Manual — Channels & Settings (Internet Archive OCR)](https://archive.org/download/wii-opmanual-chset/WiiRVKChEng_djvu.txt);
[WiiBrew: HOME Menu](https://wiibrew.org/wiki/HOME_Menu);
[Wikipedia: Wii system software](https://en.wikipedia.org/wiki/Wii_system_software);
[GBAtemp: Accurate Wii Menu USBLoaderGX Theme](https://gbatemp.net/threads/accurate-wii-menu-usbloadergx-theme.665889/page-2);
[Wii.JS](https://github.com/andrewplus/Wii.JS); [Liink](https://github.com/aica7/Liink).*
