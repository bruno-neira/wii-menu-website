# Component Deep-Dive: The Disc Channel Tile (and its full-screen view)

Follow-up to `context/component-inventory.md` item 4. Goes past `context/channels.md` §1,
`context/visual-design.md` §2/§6 and `context/animations-interactions.md` §3, which between them
cover the Disc Channel at a "one paragraph, WiiBrew-sourced" level. This doc replaces that with
asset-level and state-machine-level detail.

---

## 0. Sourcing note — read this first, it changes the confidence level of everything below

Three sources found in this pass are substantially stronger than anything the existing corpus used:

1. **`reference_screen.png`** (repo root) — read directly, pixel-sampled and 8×-cropped. Shows the
   Disc Channel **grid tile** in its empty state.
2. **`wii_design_specs.pdf`** (repo root) — this is Nintendo's internal **"Icon and Banner
   Specifications," RVL-06-0166-001-L, v1.0.0, released 2008-02-26, marked CONFIDENTIAL**. It was
   already cited second-hand by `visual-design.md`; this pass reads it directly, including
   **Figure 3-1/3-2/3-3** which are Nintendo's own diagrams of the full-screen banner view with the
   **Wii Menu / Start buttons**, and Code 3-1, which gives exact pixel dimensions. Tagged
   **[Official]**.
3. **`wii-ipl`** — the community **decompilation of the retail Wii System Menu 4.3** (matching
   builds for 43U/43J/43E/43K), <https://github.com/koopthekoopa/wii-ipl>. A clone is sitting in
   this session's scratchpad. The Disc Channel is *hardcoded into the System Menu* (see §1), so its
   entire behaviour is readable as source: `src/scene/channelTitle/iplChannelTitle.cpp`,
   `src/scene/channelSelect/iplChannelSelect.cpp`, `src/scene/channelSelect/iplChannelObj.cpp`,
   `src/system/iplChannelManager.cpp`, `include/sound/IplSound.rsid`.
   I tag these facts **[Decomp]**. Formally this is fan work, but it is a *reconstruction of
   Nintendo's shipped binary*, not recollection — for behavioural/timing/asset-name questions it is
   the strongest evidence in the whole project, stronger than WiiBrew prose. Where WiiBrew and the
   decomp disagree, believe the decomp.

Other tags: **[Official]** = Nintendo-authored. **[Fan/community]** = wiki/forum/screenshot
analysis. **[Inferred]** = my reasoning, flagged as such.

**Caveat on the decomp:** it targets **System Menu 4.3** (the final retail version). Where a claim
is version-sensitive (§11) I say so. Also note WebSearch quota was exhausted during this pass, so
some avenues (video frame-by-frame captures, TCRF, Fandom — all 402/403 to direct fetch) went
unexplored; §12 lists what that leaves open.

---

## 1. Why it's special

**It is not a channel.** Every other tile is a NAND-installed title with its own `icon.bin`/
`banner.bin`. The Disc Channel has no Title ID and no installed banner — it is **compiled into the
System Menu itself**, and its "banner" is a System Menu layout (`my_DiskCh_a.brlyt`) rather than a
title's asset.

- **[Fan/community]** WiiBrew states it plainly: *"Unlike most channels, the Disc Channel is simply
  a channel hardcoded into the System Menu, and therefore the banner behavior is integrated into
  it. The System Menu checks what disc types are supported, and chooses them to be displayed on the
  banner."* ([WiiBrew — Disc Channel](https://wiibrew.org/wiki/Disc_Channel), raw wikitext)
- **[Decomp]** Corroborated: `iplChannelManager.cpp` treats the disc slot as
  `PRIMARY_TYPE_DISK`, gives it a synthetic meta-header (`mDiskChanMetaHdr`), and explicitly skips
  the normal NAND thumbnail load path for it (`loadThumbnailAsync()` returns `NULL` for
  `PRIMARY_TYPE_DISK`). Its display name is injected at runtime for **all** system languages:
  `setDiskChannelName()` copies `System::getMessage(MESG_DISK_CHANNEL_NAME)` into every language
  slot of the fake header.

**It cannot be moved.**

- **[Official]** Icon and Banner Specifications §1, Figure 1-1: *"The Channels can be freely
  arranged, except for the Disc Channel in the upper left."* (`wii_design_specs.pdf`)
- **[Decomp]** The mechanism: a drag can only *start* if
  `System::getChannelManager()->isNormalChannel(page, index)` is true — the Disc Channel is not a
  normal channel, so it can never be picked up in the first place (`iplChannelSelect.cpp`, the
  `ON_TRIG` handler at ~line 2259). There is no "you tried and failed" path for it; the A+B pinch
  simply does nothing.
  - Related and worth stealing for the clone: `WIPL_SE_CH_NOT_MOVE` **does** exist, but it fires
    when you *drop* a (movable) channel somewhere illegal, not when you try to grab the Disc
    Channel. `isReleasableArea()` allows a drop only onto the origin slot or a genuinely empty slot
    (`loadedBnr == false`) — **there is no swap-with-occupied-slot behaviour**, confirming the
    correction already made in `animations-interactions.md` §5.
- **[Decomp] — nuance worth knowing:** the top-left position is *conventional, not hardcoded*.
  `Manager::getDiskChannelLocation()` **scans all 48 slots** for `sceneID == SCENE_DISK_CHANNEL` and
  falls back to (page 0, index 0). That is exactly why Priiloader/StartPatch can relocate it
  (as WiiBrew notes) without the Menu breaking. For the clone: hardcode top-left, but know that the
  original treats it as "wherever the disc slot entry happens to be."

---

## 2. The single most important structural fact: **there are two different disc graphics**

The existing corpus conflates these. They are separate layouts with different art:

| | Grid tile ("thumbnail") | Full-screen view ("banner") |
|---|---|---|
| Archive | `diskThum.ash` | `diskBann.ash` |
| Layout | `my_DiskCh_b.brlyt` | `my_DiskCh_a.brlyt` |
| Artwork | **one plain silver/chrome disc**, no branding | **cyan "Wii" sample disc + navy GameCube disc**, side by side |
| Text | none on the tile | title bar + "Please insert a disc." |

Verified: the tile art in `reference_screen.png` is unmistakably a **neutral silver disc**, while
the full-screen art (photo below) is a **saturated cyan Wii disc**. **[Decomp]** confirms two
distinct archives/layouts. Do **not** reuse one asset for both.

---

## 3. Empty state — the grid tile

**Source: `reference_screen.png`, cropped from (20,8)–(120,60) of the 420×236 capture and
upscaled 8×; pixel values sampled directly. [Fan/community — screenshot analysis]**

- **Tile chrome:** the standard rounded-rect card (same frame as every other tile), but the fill is
  **near-white, not the mid-gray of an empty slot**. Sampled: `#E4E4E4` at the top edge → `#E8E8E8`
  upper area → `#F1F1F1` toward the lower third. i.e. a subtle **vertical gradient that gets
  *lighter* downward**, reading as a glossy/backlit card. (This refines `visual-design.md`'s
  `#ECECEC → #E3E3E3` note, which had the gradient direction backwards at the sample points I
  re-checked; treat both as "very light neutral, low-contrast gradient" and don't over-commit.)
- **The disc graphic:** a single circle, roughly centred horizontally and vertically in the tile,
  diameter ≈ 60% of the tile's height. Shading is a **specular/anisotropic sweep, not a flat fill**:
  sampled around the disc — top-left quadrant `#FFFFFF` (blown-out highlight), top edge `#FFFFFF`,
  left edge `#FFFFFF`, upper-middle `#EAEAEA`, hub `#C5C5C5`, right edge `#C4C4C4`, lower-middle
  `#BCBCBC`, bottom `#BFBFBF`. So: **bright highlight sweeping the upper-left, falling to ~`#BC`
  gray at lower-right**, with a slightly darker hub ring and a fine light ring at the very hub
  centre. There is also a faint soft shadow/reflection under the disc.
  - Practical CSS: a `conic-gradient` or a rotated `linear-gradient` white→`#BBB` for the platter,
    a small radial hub, a 1px `#D8D8D8` rim stroke, and a low-opacity elliptical shadow beneath.
- **No text.** The tile carries no "Disc Channel" label, no "?" glyph, no "insert disc" copy. (The
  "grey disc silhouette with a question mark" claim in `channels.md` §1 is **not supported** by the
  reference screenshot or by any asset name in the decomp — I'd treat it as **wrong** and drop it.)

**Does it animate when empty? Yes, continuously. [Decomp]**

`ChannelSelect::createDiskLayout()` binds `my_DiskCh_b.brlan`, calls
`setAnmType(ANIM_TYPE_LOOP)` and `start()` immediately and unconditionally — the empty tile runs a
**looping animation for as long as the Menu is on screen**, exactly as Nintendo's spec requires of
all icons (*"Use of still image icons for which animation has not been set is prohibited"*,
`wii_design_specs.pdf` §2.5). The `.brlan` contents aren't in the decomp, so the *motion* is
undocumented — but given the tile art is a single disc with a strong specular sweep, a **slow
rotation of the highlight (or of the platter) with a periodic glint** is the obvious reading.
**[Inferred]** Implement as a slow continuous rotation of the gradient (~6–10 s per turn), not a
literal spin of the whole graphic — a literally spinning disc is the *reading* state (§6), and the
Menu draws a deliberate distinction between the two.

---

## 4. Disc-inserted state — the grid tile

**[Official]** Nintendo Support, Disc Channel Overview: with a game disc inserted the channel
displays *"an icon for that game with the edge of a spinning disc to the left of the channel."* If
the disc carries a required system update it shows *"a spinning disc"* instead.
([Nintendo Support a_id/2543](https://en-americas-support.nintendo.com/app/answers/detail/a_id/2543/~/disc-channel-overview))

**[Decomp]** That "edge of a disc to the left" is a real, separate overlay layout:
`my_DiskCh_In.brlyt`, with panes named `DiskIn` and `16x9` (the 16:9 variant texture is swapped onto
the `DiskIn` pane's material in widescreen mode), animated by
`my_DiskCh_In_DiskIn.brlan` / `my_DiskCh_In_DiskOut.brlan`.

Sequence on insertion (`ChannelSelect::updateDiskState()` + `startDiskInEvent()`):

1. `mpDiskInAnim` (`..._DiskIn.brlan`) plays — the disc edge slides in at the tile's left.
2. Simultaneously `mpDiskFadeAnim` plays **forward**: a Hermite interpolation
   **255 → 0 alpha over 28 frames** (`HermiteIntp<f32>::init(255.0f, 0.0f, 28.0f, 0, 0, FORWARD)`),
   fading out the empty-disc layout to reveal what's underneath.
   **28 frames ≈ 467 ms at 60 fps NTSC.** This 28-frame constant recurs everywhere in the Menu
   (`stopBannerSound(28)`, `stopSE(..., 28)`, the zoom in §8) — treat **≈0.47 s** as the System
   Menu's house transition length.
3. What's underneath depends on the disc:
   - **Wii game** (`IPL_STATE_RVL_GAME`) → `getDiskThumbnail()` pulls `/meta/icon.bin` out of the
     disc's own `opening.bnr`, `mpDiskChanObj->createDiskLayout(thumb)` installs it, and its
     animation is set to `ANIM_TYPE_LOOP` and played. **The tile becomes the game's own animated
     icon**, indistinguishable from an installed channel's.
   - **Disc requires a system update** (`IPL_STATE_DISK_UPDATE`) → see §11.
   - **GameCube disc** (`IPL_STATE_GC_GAME`) → see §5.
4. `resetDiskTitleName()` sets the tile's **hover balloon text** to the disc's title
   (`getTitleName(...)`), or back to `System::getMessage(0)` = "Disc Channel" when empty. This is
   the on-screen mechanism behind Nintendo's own promise in the 3.2 update notice that *"the title
   of the Game Disc inserted will be displayed"* (§11).

Ejection runs the same thing in reverse: `startDiskOutEvent()` plays `..._DiskOut.brlan` and the
same 28-frame Hermite **backward** (`ANIM_TYPE_BACKWARD`), then `destroyDiskLayout()`.

**Is there a spin-up while reading? On the tile — no. In the full-screen view — yes.** The tile has
only in/out and a looping idle; all the spin/read choreography lives in the banner scene (§6).
**[Decomp]**

---

## 5. GameCube discs

- **[Fan/community]** WiiBrew: *"GameCube games only display the GameCube logo when inserted, as
  GameCube discs do not have these specific graphics encoded within."*
- **[Decomp]** The fallback is a dedicated System Menu layout, `my_GCIcon_a.brlyt` /
  `my_GCIcon_a.brlan`, held by `ChannelSelect` as `mpDiskLayout`/`mpDiskAnim` and handed to the tile
  object via `setDiskLayouts()`. It contains **two mutually exclusive panes**:
  `N_GCIcon` (the GameCube logo) and `N_DiscUpdateIcon` (the system-update graphic, §11). Exactly
  one is visible at a time.
- **[Decomp]** In the full-screen view, the GameCube case gets its **own banner layout**
  (`mpGCBannerLyt`, background animation `my_GCTop_a_BackLoop.brlan`, group `G_Back`) and its own
  audio, `WIPL_ME_GC_BANNER` — because a GameCube disc has no `opening.bnr` and therefore no banner
  sound of its own. So a GC disc gets: System-Menu-supplied art **and** System-Menu-supplied music.
- **[Official]** Only **RVL-001** consoles read GameCube discs
  ([Nintendo Support a_id/2543](https://en-americas-support.nintendo.com/app/answers/detail/a_id/2543/~/disc-channel-overview)),
  so on RVL-101/RVL-201 the GameCube disc never appears on the "please insert" screen.
  **Uncertainty flag:** WiiBrew says the GameCube disc graphic is shown *"if the Wii model has
  GameCube support"*, but the 4.3 decomp plays the `G_GC` animation group **unconditionally** in
  `ChannelTitle::updateDiskState()` — no model check is visible in the scene code. The gating is
  presumably done at a lower level (drive/BS2 capability query) or via the layout data itself. I
  could not confirm which. For the clone this is moot unless you want to model both hardware
  revisions.
- **[Fan/community] — nice detail for the art:** WiiBrew's "Banner discs" section documents that
  **three** discs exist in the banner asset — the sample Wii disc, the sample GameCube disc, and a
  **hidden, unused DVD icon** (title ID `211J`) — and that *"Each of these says 'for Japan only' on
  it,"* with the GameCube one having its "for Japan only" in the disc's centre. The decomp
  corroborates the hidden third one: `mscDiskGroups[]` carries the comment
  `// Not including the unused "G_DVD"`. The "for Japan only" text is too small to resolve in the
  capture I have — believe WiiBrew, but don't try to letter it at web scale.

---

## 6. The full-screen "Please insert a disc." view

**This is the screen the project owner has pinned ~10× (`pinterest-board.md`).** The reference I
used is a direct capture on WiiBrew: `https://wiibrew.org/w/images/0/0b/Disc_channel.jpg`
(640×480 photo of a CRT — colours are shifted warm/washed and the geometry is barrel-distorted;
proportions below are measured from it but should be treated as ±3%).

### 6.1 What it actually is

**[Official]** It is not a bespoke screen — it is the ordinary **channel banner view** that every
channel gets, with the Disc Channel's banner in it. `wii_design_specs.pdf` §3.4.1: *"The banner is
displayed with the prepared buttons and the black frame in the foreground (see Figure 3-1). Arrows
are displayed on the screen edges, so make sure that important information is not obscured by them.
The banner is displayed on the entire TV screen."* Figure 3-1 is Nintendo's own wireframe of the
empty chrome: black frame, left/right arrows, and two pills labelled **Wii Menu** and **Start**.
Figure 3-2 shows the same chrome around the Wii Sports banner.

Consequence for the build: **build the banner chrome once as a reusable shell**, and treat the Disc
Channel's "please insert a disc" content as one banner among many.

### 6.2 Official dimensions

**[Official]** `wii_design_specs.pdf` Code 3-1 and Figures 3-3/3-4:

| | 4:3 | 16:9 |
|---|---|---|
| Frame buffer | **608 × 456** | 832 × 456 |
| Banner *display area* (the content window above the buttons) | **590 × 332** | **810 × 332** |
| VI screen size | 670 × 456 | — |
| Mask template | `template\banner\BannerMask4x3.rlyt` | `BannerMask16x9.rlyt` |

So the banner content occupies **332/456 = 72.8% of frame height** and 590/608 = 97% of width; the
button bar plus frame take the remaining **~27% of height**. My measurement of the CRT photo put
the divider at ~75% of panel height — consistent within photo error. **Use 73% / 27%.**

Also official: **the same source art is used in both aspect ratios** — 16:9 shows *more* of the
canvas horizontally rather than stretching (§3.4.2/3.4.3), and pane-position adjustment is used to
keep things aligned. Good argument for building the web version as a wide canvas with a 4:3 crop.

### 6.3 Layout, measured

Panel occupies x 35–610, y 18–458 of the 640×480 photo (w 575, h 440); everything outside is the
black frame. Positions given as fractions of the *panel*:

| Element | Position | Notes |
|---|---|---|
| Black frame | full bleed around a rounded-rect panel | official ("the black frame in the foreground"); corners strongly rounded, edges slightly bowed |
| Blue title band | y 0.007 → 0.035 full width, then a **tab that only occupies the right side**, sweeping from x≈0.51 at y 0.04 down to the right edge, bottom at y≈0.12 | reads as a folder tab; the white panel's top-right corner is cut away by a curve |
| Title text **"Disc Channel"** | right-aligned inside the blue tab, ≈x 0.70–0.93, centred y≈0.09 | white, letter-spaced; pane `T_Bar` ← `MESG_DISK_CHANNEL_NAME` **[Decomp]** |
| Left arrow | centre ≈ (0.04, 0.38) | vertically centred **in the banner area**, not the panel |
| Right arrow | mirrored, centre ≈ (0.96, 0.38) | |
| **Wii sample disc** | centre ≈ (0.39, 0.32), diameter ≈ 0.36 of panel height | the big one |
| **GameCube sample disc** | centre ≈ (0.66, 0.38), diameter ≈ 0.25 of panel height | smaller, sits lower and right |
| Disc reflections | mirrored, faded, on a glossy "floor" directly below each disc | |
| **"Please insert a disc."** | horizontally centred (x≈0.50), baseline y≈0.64 | overlaps the reflections; pane `T_Comment0` ← `MESG_CHAN_SEL_NO_DISK` **[Decomp]** |
| Divider into button bar | y ≈ 0.75 (official: 0.73) | subtle 1px line + tone change, not a hard edge |
| **Wii Menu** button | x 0.087 → 0.478, y 0.79 → 0.93 | ≈39% of panel width |
| **Start** button | x 0.508 → 0.884, y 0.79 → 0.93 | ≈38% of panel width, ~3% gap |

Disc size ratio measured GC:Wii ≈ **0.70**, against the real-world 8 cm : 12 cm = 0.667 — Nintendo
drew them to scale. Keep that.

### 6.4 Exact text

- **Title bar:** `Disc Channel` **[Decomp: `T_Bar` ← `MESG_DISK_CHANNEL_NAME` (msg id 0)]**,
  confirmed visually.
- **Centre text:** `Please insert a disc.` — **with the trailing period**, sentence case, only the
  first word capitalised. Confirmed visually and structurally
  (**[Decomp]** `T_Comment0` ← `MESG_CHAN_SEL_NO_DISK`, msg id 4).
- **Buttons:** `Wii Menu` (left) and `Start` (right). **[Decomp]**
  `setMessage(mscButtonTextName[0], MESG_CMN_WII_MENU)` and
  `setMessage(mscButtonTextName[1], MESG_CMN_START)`; pane names `B_BtnA` (left/Wii Menu) and
  `B_BtnB` (right/Start). *(The header's inline comment on the `BTN_A`/`BTN_B` enum is
  swapped relative to actual usage — go by the pane→message assignment, and by the screenshot.)*
- **Second, hidden comment pane:** `T_Comment1` ← `MESG_CHAN_SEL_BAD_DISK` (msg id 6) — a
  *different* line that swaps in for the unreadable-disc case. **Its exact English wording is not
  recoverable from the decomp** (message strings live in a NAND-resident MESG blob, not in source).
  Flagged as a gap.

### 6.5 Colour (with a warning)

Sampled from the CRT photo, so these are **indicative, not authoritative**:

| Element | Sampled | Comment |
|---|---|---|
| Title band blue | `#45BBEC` | strikingly close to the `#35BEED` accent `visual-design.md` derived independently from the Menu's button rings — good cross-check; **use `#35BEED`–`#45BBEC`** |
| Panel white (upper) | `#F3F3F3` | |
| Panel mid | `#DBDBDB` | soft vertical falloff toward the divider |
| Button bar | `#C4C4C1` | slightly warmer/darker than the panel |
| Wii sample disc face | `#55B9EE` – `#6EC3E6` | flat-ish cyan with a subtle radial sheen |
| GC sample disc | `#32487D` navy upper ~⅔, near-black lower band | logo band across the bottom third |
| "Please insert a disc." | `#8B9A9C` | mid-gray, low contrast — matches the Menu's overall soft-text convention |
| Arrow cyan | `#A4E1F5` core, darker teal outline | glossy triangle with a soft outer glow |

**Do not colour-pick from this photo for production.** Take the hues, re-derive saturation/value
from `reference_screen.png`, which is a clean digital capture.

### 6.6 The pinboard's dark variant

`pinterest-board.md` notes a **dark/near-black themed variant** of this exact screen among the
pins, plus one teal-accented variant. Neither is an original System Menu state — the retail Disc
Channel banner has no dark mode. **[Inferred]** These are almost certainly (a) the black *frame*
dominating a badly-cropped capture, (b) a Dolphin/theme mod, or (c) fan art. Building a dark theme
is a legitimate creative choice, just log it as a deliberate departure rather than a recreation.
Because the black frame is *official chrome*, a dark theme is unusually easy to justify visually:
extend the frame's black inward and invert the panel, keeping the cyan tab and arrows unchanged.

---

## 7. The Start button

### 7.1 Appearance

From the capture (§6), both buttons are **capsules (fully rounded pills)** of equal size:

- **Enabled** (the "Wii Menu" button in the empty-state screenshot): light silver-white body with a
  bright specular highlight across the upper half, wrapped in a **~2px cyan/light-blue ring** with a
  soft outer glow. Label in **black**, medium-weight sans.
- **Disabled** (the "Start" button in the empty-state screenshot): identical capsule geometry, but
  **flat light gray fill (`#C4C4C4`), no cyan ring** (only a barely-there slightly-darker outline),
  and the label in a **mid-gray (`#BCBCBC`) that is only just readable against the fill**. It reads
  as clearly, unambiguously off.

So the disabled treatment is: **drop the ring, drop the highlight, desaturate the label** — not an
opacity reduction of the enabled state.

*(Note: `pinterest-board.md` describes this screen as "blue Wii Menu button center, navy 'Start'
pill right." That doesn't match this capture — here Wii Menu is white-with-cyan-ring and Start is
gray/disabled. The pin descriptions are probably conflating the empty state with a disc-inserted
state, or reading the cyan ring as fill. Trust the capture.)*

### 7.2 Enabled / disabled logic — exact

**[Decomp]** `ChannelTitle::isEnableToExecute(page, index)`:

```
if (isDiskChannelByDraw(page, index)) return false;
```

and `isDiskChannelByDraw()` is true when the current slot is `SCENE_DISK_CHANNEL` **and** the disc
state is **neither** `DISK_STATE_WII_DISK_IDLE` **nor** `DISK_STATE_GC_DISK_IDLE`.

Plain English: **Start is disabled for the whole time the Disc Channel's *own* banner is on screen —
empty, spinning/reading, or invalid-disc — and becomes enabled at exactly the moment the game's (or
GameCube's) banner has fully taken over.** It flips back to disabled the instant the disc is ejected
(`DISK_STATE_WII_DISK_IDLE` → `DISK_STATE_EJECT` calls `changeStartButton()`).

It is also disabled for non-disc reasons: parental-control lock
(`BS2_STT_DATA_DISK` / `BS2_STT_START_LOCKED_DISK`), play-time limit (`isLimitOutChannel()`), and
locked/unusable titles (`getUnlockChannelState() == UNLOCK_STATE_1`).

**The transition is animated, not instant. [Decomp]** `changeStartButton()` cross-plays two
dedicated `.brlan` clips bound to the group `G_OnOffBtnB`:
`my_ChTop_a_OnBtn.brlan` ↔ `my_ChTop_a_OffBtn.brlan`. So the ring/glow **animates in** when a disc
finishes loading. Worth reproducing — it's a satisfying moment.

**There is a deliberate one-tick arming delay. [Decomp]** An internal tri-state (`unk_0x8C`) goes
`0 = off → 1 = just enabled → 2 = clickable`, advanced one step per frame in `calcNormalNormal()`,
and the click handler requires `== 2`. You cannot click Start on the very frame it lights up.

### 7.3 Click behaviour

**[Decomp]** `ChannelTitleEventHandler::onEvent`, `ON_TRIG`:

- **Start, enabled** → `reserveNextScene()`, play `my_ChTop_a_SelectBtn_Ac.brlan` on group
  `G_SelectBtnB`, play sound `WIPL_SE_DECIDE`.
- **Start, disabled** → play sound **`WIPL_SE_GRAY_BUTTON`** and *nothing else*. There is a
  purpose-built "you clicked a dead button" sound in the system sound bank. Use it.
- **Wii Menu** → play select anim on `G_SelectBtnA`, sound `WIPL_SE_BT_PUSH`, set
  `STATE_START_ZOOM_OUT`, `tryToGoBackward()` (which plays `WIPL_SE_CH_UNSELECT` and fades the
  banner sound out over 28 frames).

### 7.4 Hover

**[Decomp]** `ON_POINT` → play `my_ChTop_a_FocusBtn_on.brlan` (focus-in), play
`WIPL_SE_BT_TARGETTING`, **and `con->rumble()`** — the Wii Remote buzzes. `ON_LEFT` →
`my_ChTop_a_FocusBtnA_off.brlan`.

**Critically, hover is gated on the same enable flag:** the loop body runs only `if (i == 0 ||
unk_0x8C > 0)` — index 0 is Wii Menu (always hoverable). So **hovering a disabled Start button
produces no focus animation, no sound, and no rumble at all.** It is completely inert. That's a
strong, cheap authenticity detail: `pointer-events` stays on (you still get the gray-button sound on
click) but no `:hover` styling and no hover SFX.

### 7.5 The "Start" → "Update" label swap

**[Decomp]** At scene creation:

```
if (checkNeedUpdate(page, index))
    setMessage(buttonTextPane[1], MESG_CHAN_TTL_BTN_UPDATE);   // "Update"
else
    setMessage(buttonTextPane[1], MESG_CMN_START);             // "Start"
```

and there are dedicated animations for swapping a button's label in place —
`my_ChTop_a_ChangeTextIn.brlan` / `..._ChangeTextOut.brlan` on groups `G_ChangeTextA`/`G_ChangeTextB`.
See §11.

---

## 8. Animation: the full disc state machine

**[Decomp]** `ChannelTitle::updateDiskState()` is the authoritative choreography. Assets, all in
`diskBann.ash` → `my_DiskCh_a.brlyt`:

**Animation groups:** `G_Comment0` (the "Please insert a disc." text block), `G_Wii` (the Wii disc),
`G_GC` (the GameCube disc), `G_DiskIn` (the slot the disc slides into), plus an implicit "all"
group. *(`G_DVD` exists in the layout but is unused.)*

**Animation clips:** `my_DiskCh_a_Start` / `_DiskStart` / `_DiskLoop` / `_DiskEnd` / `_DiskLost` /
`_DiskIn` / `_DiskEject` / `_Unknown` / `_UnknownLoop` / `_UnknwnEject` `.brlan`.

| State | Trigger | What plays | Next |
|---|---|---|---|
| `INIT` | zoom-in finishes | `Start` on all groups. `G_Comment0` panes made visible **only if** no disc. If no disc, start `WIPL_ME_NO_DISC_BANNER` | `TRANS_IN` |
| `TRANS_IN` | `Start` anims finish | force comment visible if still no disc | `IDLE` |
| **`IDLE`** | — | **resting empty state: discs sit still, "Please insert a disc." showing** | on disc detected → play `DiskStart` on `G_Comment0`+`G_Wii`+`G_GC` → `START_SPIN` |
| `START_SPIN` | `G_Wii/DiskStart` ends | play `DiskLoop` on `G_Wii` and `G_GC`; **stop** the comment's `DiskStart` (the text clears) | `SPINNING` |
| **`SPINNING`** | — | **both discs spinning in place while the drive is read** | branches ↓ |
| ↳ Wii game | `IPL_STATE_RVL_GAME` | stop GC loop, play `DiskLost` on `G_GC` — **the GameCube disc animates away** | `VALID_DISK` |
| ↳ GameCube game | `IPL_STATE_GC_GAME` | stop Wii loop, play `DiskLost` on `G_Wii`; begin async load of the GC banner | `VALID_DISK` |
| ↳ Unreadable | `IPL_STATE_BAD_DISK` | stop both loops, `DiskLost` on **both** | `VALID_DISK` |
| ↳ Yanked mid-read | back to `NO_DISK` | stop loops, play `DiskEnd` on both | `INTERRUPT_EJECT` |
| `VALID_DISK` (good disc) | loser disc's `DiskLost` ends | play **`DiskIn` on the winning disc's group AND on `G_DiskIn`** — *the disc slides into the on-screen slot*; async-load the disc's `opening.bnr`, build the channel layout | `GOT_WII_DISK` / `GOT_GC_DISK` |
| `VALID_DISK` (bad disc) | `DiskLost` ends | play `Unknown` on all + sound `WIPL_ME_INVALID_DISC_BANNER` | `GOT_INVALID` |
| `GOT_WII_DISK` / `GOT_GC_DISK` | `DiskIn` anims end | stop the spin loop, **hide the disc-banner layout root entirely**, `initChanAnmAndSound()` (game banner + its own sound start), `changeStartButton()` → **Start lights up** | `*_DISK_IDLE` |
| `*_DISK_IDLE` | disc removed | play `DiskEject` on all, re-show the disc-banner layout, `changeStartButton()` → **Start greys out** | `EJECT` |
| `EJECT` | `DiskEject` ends | fade banner sound, tear down the game layout, reload | back to `IDLE` |
| `INTERRUPT_EJECT` | `DiskEnd` ends | re-show comment, replay comment `Start` | `TRANS_IN` |
| `GOT_INVALID` → `INVALID_IDLE` → `INVALID_EJECT` | | `UnknownLoop` while it sits; `UnknwnEject` on removal, comment restored | `IDLE` |

**Reading this as motion design** (the `.brlan` payloads aren't in the decomp, so the *shapes* below
are **[Inferred]** from the clip names and the still frame):

- `DiskStart` = spin-up ramp; `DiskLoop` = constant-velocity spin; `DiskEnd` = spin-down. Three
  separate clips means the acceleration/deceleration were authored, not eased in code — reproduce
  with a ramp-up → linear loop → ramp-down rather than a single CSS `linear infinite`.
- `DiskLost` = the disc that *isn't* the one you inserted leaves the screen. So on inserting a Wii
  disc you see: both discs spinning → the GameCube disc departs → the Wii disc slides into a slot.
  This is the bit people remember and it is genuinely a two-beat animation.
- `DiskIn` fires on **two groups simultaneously** — the disc and the slot — so the slot graphic
  reacts (opens/lights) as the disc enters.
- The "Please insert a disc." text has its **own** `DiskStart` clip that is *stopped* rather than
  played to completion when the loop begins — i.e. it starts a fade/slide-out and gets cut. Cheap
  to fake: fade the caption out over the first ~0.2 s of spin-up.

**No glow/pulse.** Nothing in the layout groups, clip names, or the still frame suggests a
glow or breathing pulse on the disc or the tile. **[Inferred]** If you add one, that's stylistic.

---

## 9. The channel-launch zoom

**[Decomp]** `ChannelTitle` line 351: `mpZoomAnim = new math::HermiteIntp<float>()` initialised
`(0.0f → 255.0f, 28.0f frames, tangents 0, 0)`. Zero end-tangents on a Hermite = a **smoothstep**,
i.e. symmetric ease-in-out. Zoom-out re-inits the identical curve with `ANIM_TYPE_BACKWARD`.

**≈28 frames ≈ 467 ms, `cubic-bezier` equivalent ≈ `cubic-bezier(0.4, 0, 0.6, 1)`** (a true
smoothstep; `ease-in-out` is close enough). This **replaces** the 800 ms fan-clone figure that
`animations-interactions.md` §3 currently recommends — that was a community guess, this is the
shipped value. **Update the timing table in that doc.**

How it renders (`ChannelTitle::draw()`): during `STATE_ZOOMING_IN` / `STATE_ZOOM_OUT` the Menu draws
**a captured texture of the previous screen** (`mpCapture->getGXTex()`) into a rect derived from the
selected tile's position and half-extents (`mChanThumbOff_X/Y` from the ChannelSelect scene), with
alpha driven by the zoom curve — and fills **everything outside that rect with black** at the same
alpha (`drawPolygonAroundRect(..., {0,0,0, zoom})`). The banner is already fully rendered
underneath.

Practical translation: it's a **cross-fade between a scaled screenshot of the grid and the banner,
with black letterboxing growing in around the tile's rect** — not a CSS transform of live DOM. In
React the honest analogue is scaling/fading a snapshot (or the grid container) from the tile's
`getBoundingClientRect()` to full-bleed, over a black backdrop, in 470 ms smoothstep. This is
essentially what `Fraulk/Wii-Menu`'s `zoom.js` does, just at the right duration.

**Minimum dwell before actually launching. [Decomp]** `isEnableAppStart()` returns
`(100.0f / System::getAnimDelta()) < unk_0x88`, where `unk_0x88` increments once per frame in
`STATE_BOOT_SCENE`. That's **~100 frames ≈ 1.67 s of banner display guaranteed after pressing
Start, before the title is handed control** (and `animDelta` normalises it across NTSC/PAL50, so
it's ~1.67 s of wall-clock either way).

**[Official]** corroborates the *intent* — `wii_design_specs.pdf` §6: *"Regardless of how quickly
the banner Start button is clicked, the banner screen is displayed with a guaranteed wait of at
least one second. This is the time interval from the moment the display screen zoom effect
completes after an icon is selected (or the moment the transition effect from the adjacent banner
completes), to the moment before the fadeout begins to transition to the game title."* Nintendo
promised developers ≥1 s so their banner-embedded trademark/copyright notices would always be
visible; the shipped figure is ~1.67 s.

**Adjacent-banner navigation. [Decomp]** The left/right arrows are not decoration: clicking
`BTN_ARROW_LEFT`/`BTN_ARROW_RIGHT` (or pressing the ∓ buttons, `BTN_NEXT_LEFT/RIGHT`) calls
`searchChannel()` + `startChangeChannel()` with sound `WSD_SELECT`, sliding straight to the previous
/ next channel's banner **without returning to the grid**. Clips: `my_ChTop_a_ChangeIn` /
`_ChangeRoop` / `_ChangeOut` `.brlan` plus the text-swap pair. And they're hidden when they'd be
meaningless — `IDANIM_ARROW_LEFT_DISAPPEAR` / `RIGHT_DISAPPEAR` fire when the update dialog opens
(§11).

---

## 10. Audio

**[Decomp]** `include/sound/IplSound.rsid` is a recovered enumeration of the System Menu's BRSAR
(`sound/IplSound.brsar`) contents. This **massively upgrades `context/audio.md` §8**, which
currently lists only two confirmed `WIPL_SE_*` identifiers and calls a full list an open gap. There
are ~90.

**Disc-Channel-specific — all `ME_` (music/jingle), not `SE_`:**

| ID | Fires when |
|---|---|
| `WIPL_ME_NO_DISC_BANNER` | banner opens with **no disc** (`DISK_STATE_INIT`, only if `IPL_STATE_NO_DISK`) |
| `WIPL_ME_GC_BANNER` | the **GameCube** banner is shown (GC discs carry no banner sound of their own) |
| `WIPL_ME_INVALID_DISC_BANNER` | an **unreadable/invalid** disc is detected |
| `WIPL_ME_SD_BANNER` | (sibling) the SD Card Menu banner |
| `WIPL_ME_VIRTUAL_CONSOLE` | (sibling) VC titles' banner |

**This corrects the corpus.** `channels.md`/`animations-interactions.md` describe the no-disc case
as *"a tone is heard"* (from WiiBrew). It is not a tone — it is a **banner jingle occupying the same
slot a real game's banner music would**, started with `startSE()` and killed with a 28-frame fade
(`stopSE(mpDiskBnrSound, 28)`). Treat it as a short looping ambient cue, not a beep.

**Interaction sounds on this screen:**

| ID | Fires when |
|---|---|
| `WIPL_SE_CH_SELECT` | tile clicked in the grid → zoom in |
| `WIPL_SE_CH_UNSELECT` | leaving the banner → zoom out |
| `WIPL_SE_CH_TARGETTING` | pointer enters a **tile** |
| `WIPL_SE_BT_TARGETTING` | pointer enters a **button** (+ Remote rumble) |
| `WIPL_SE_BT_PUSH` | **Wii Menu** button pressed |
| `WIPL_SE_DECIDE` | **Start** pressed while enabled |
| **`WIPL_SE_GRAY_BUTTON`** | **Start pressed while disabled** |
| `WSD_SELECT` | left/right arrow → adjacent banner |
| `WIPL_SE_ERROR` | error dialogs |
| `WIPL_BGM_MENU` | the Menu's looping background music (restarted on returning from the banner) |

**No dedicated "disc inserted" or "disc read" SFX exists.** There is no `WIPL_SE_DISC_*` anywhere in
the bank. The physical drive noise did the work; on screen, insertion is communicated by the
`DiskIn` animation plus the swap from `WIPL_ME_NO_DISC_BANNER` to the game's own banner sound.
**[Inferred]** If you want an audible insert cue in the clone, that is an addition, not a
restoration.

**Positional audio, worth stealing:** grid sounds are panned by pointer X —
`startSEwithPos("WIPL_SE_CH_SET", mDragPos.x)`, and dragging uses
`holdSEwithPosDis("WIPL_SE_CH_DRAG", pos.x, speed)` — a **held** sound modulated by both pan and
pointer *speed*. Trivially reproducible with a `StereoPannerNode` + gain tied to pointer velocity.

**Banner sound is mandatory. [Official]** `wii_design_specs.pdf` §4: *"You must set a sound effect
(banner sound) to banners; this sound effect will be played when the banner is displayed
full-screen."* Every banner screen in the clone should make noise.

---

## 11. Version differences — System Menu 3.2 and the update overlay

**[Official — Nintendo's own update notice.]** WiiBrew reproduces the "Message from Nintendo"
delivered to the Wii Message Board for the 3.2 update verbatim
([WiiBrew — 3.2](https://wiibrew.org/wiki/3.2)):

> *"Once installed, if a Game Disc is inserted into the Wii console and an update is required, a
> notification message will be displayed across the Disc Channel alerting you to update your system.
> If no update is needed, the title of the Game Disc inserted will be displayed."*

**[Fan/community]** WiiBrew's 3.2 changelog (rev01, **February 25, 2008**):
> *"Disc Channel updated to display 'Wii System Update' if the game currently inserted into the Wii
> contains a Wii Menu/Channel update."*
> *"The Wii LED light will glow if information is received while playing a game."*

**[Decomp] — what the overlay actually is.** It is **not** a badge layered over the game's icon. It
is a **replacement graphic**, and it lives in the *GameCube-icon* layout:

- `my_GCIcon_a.brlyt` contains two sibling panes, `N_GCIcon` and `N_DiscUpdateIcon`.
- In `ChannelSelect::updateDiskState()`, when `IPL_STATE_DISK_UPDATE`:
  `N_GCIcon` → invisible, **`N_DiscUpdateIcon` → visible**, then `ChannelObj::setLangPane(layout)`
  is called (**the "Wii System Update" graphic is localised — a per-language texture/pane**), and
  the animation is set to `ANIM_TYPE_LOOP` and played (**it animates continuously**).
- The tile does **not** show the game's own icon in this state at all. Matches Nintendo Support's
  *"If a system update is available on the disc, it shows a spinning disc"* — i.e. the generic
  update graphic instead of the game art.

**In the full-screen view [Decomp]:** entering the banner with `IPL_STATE_DISK_UPDATE` triggers, in
`ChannelTitle::updateDiskState()`:
1. `System::getHomeButtonMenu()->disable()` — **the HOME menu is locked out.**
2. `IDANIM_ARROW_LEFT_DISAPPEAR` + `IDANIM_ARROW_RIGHT_DISAPPEAR` — **the adjacent-channel arrows
   animate away.** You are pinned to this banner.
3. A modal dialog: `MESG_CHAN_SEL_UPDATE_DIALOG` (or `MESG_CHAN_SEL_UPD_DIALOG_SEAT` if
   `updateHasSeatTitles()`) with a single **OK** button (`callBtn1(..., MESG_CMN_OK)`).
4. On acceptance: `SCSetUpdateType(SC_UPDATE_TYPE_DISC)` then a controlled reboot into the updater
   (`STATE_NORMAL_UPDATING` → `UPDATE_SUCCESS` / `UPDATE_FAIL` / `UPDATE_RESET` / `UPDATE_WAITING`).
5. Separately, the right button's label becomes **"Update"** instead of "Start"
   (`MESG_CHAN_TTL_BTN_UPDATE`) whenever `checkNeedUpdate()` is true, animated with the
   `ChangeText` clip pair.

**[Fan/community]** WiiBrew's Disc Channel article adds the architectural oddity: *"If a system
update is required, a pop up will be displayed, something that channel banners cannot normally
do."* Ordinary channel banners are sandboxed layout data and can't raise system modals — the Disc
Channel can, because it's part of the System Menu. Also: *"simply viewing the banner in full screen
triggers an update prompt"* — you don't have to press anything.

**Uncertainty flag:** everything under [Decomp] here is read from the **4.3** source, and confirms
the *mechanism*; it cannot by itself prove the feature *first appeared* in 3.2. The 3.2 attribution
rests on WiiBrew's changelog + Nintendo's own message text, which is strong and mutually
corroborating. `context/version-history.md` line 27 already says this and is correct.

**Other version notes:** WiiBrew places the Disc Channel in **System Menu 1.0** and suspects the
Prelaunch System Menu. No other Disc-Channel-specific UI change is documented across 1.0 → 4.3.
The 4.0 SD Card Menu is a *sibling* scene (`sdChannelSelect` / `sdChannelTitle` in the decomp,
sound `WIPL_ME_SD_BANNER`) built from the same chrome — relevant if the clone ever grows one.

---

## 12. The disc slot LED

**Answer: it is never reflected in the on-screen UI. [Decomp] + [Official]**

- **[Official]** Wii Operations Manual — Channels & Settings: *"The Wii's Disc Slot will blink
  bright blue when WiiConnect24 has received new data,"* with a dimmer option
  (<https://archive.org/details/wii-opmanual-chset>). Configurable Bright / Dim / Off via
  *Wii Settings → WiiConnect24 → Slot Illumination*
  ([Nintendo Support a_id/2705](https://en-americas-support.nintendo.com/app/answers/detail/a_id/2705/~/how-to-adjust-the-disc-slot-illumination)).
- **[Decomp]** The LED is a pure hardware/settings concern. The only reference in the entire System
  Menu source is `WB_ID_DISC_LED` inside `src/iplwww/www_wiisetting.cpp` — the Opera-based **Wii
  Settings** screen — which writes `idleInfo.led` into the WiiConnect24 idle-mode config and calls
  `NwcManager::enableLedNotification()`. There is **zero** LED-related code in
  `iplChannelSelect.cpp`, `iplChannelTitle.cpp` or `iplChannelObj.cpp`. **Nothing on the Wii Menu
  or the Disc Channel banner ever depicts, mirrors, or animates the slot glow.**
- The *software* analogue of "you have new stuff" is a different mechanism entirely: the
  **"Newly Arrived" pane group** on a channel's icon (`wii_design_specs.pdf` §2.9, group names
  `New` / `New_ENG` / `New_JPN` …) and the blinking Message Board button. Notably
  **[Decomp]** `ChannelObj::setupNew()` *does* handle the Disc Channel case — it queries
  `getDiskInfo()` for the disc's ID and asks
  `Nwc24Manager::isNewMessageThere(diskID)` — so **a disc-based game with a pending WiiConnect24
  message can get the "newly arrived" balloon treatment on the Disc Channel tile.** That's the
  closest the on-screen UI comes to the slot-LED concept, and it's a nice easter egg.
- **For the clone:** a blue glow near the Disc Channel tile is a **deliberate adaptation of hardware
  behaviour**, not a recreation — the same conclusion `visual-design.md` §6 reached, now confirmed
  at source level rather than inferred.

---

## 13. Implementation checklist for the React build

Ordered roughly by payoff.

1. **Two separate assets.** Silver disc for the tile; cyan Wii disc + navy GameCube disc for the
   full-screen view. (§2)
2. **Build the banner chrome as a reusable shell**, not a Disc-Channel one-off: black frame →
   rounded panel → cyan folder-tab title bar (right-aligned title) → 73%-height content area with
   edge arrows → 27%-height button bar with two ~39%-wide capsules. (§6.2, §6.3)
3. **Copy the text exactly:** `Disc Channel`, `Please insert a disc.` (trailing period),
   `Wii Menu`, `Start`. (§6.4)
4. **Disabled Start = no ring, no highlight, gray label** — and completely inert on hover (no
   style change, no sound, no cursor feedback), but clicking plays the gray-button sound. (§7.1,
   §7.4)
5. **28 frames ≈ 467 ms is the house transition.** Use it for the launch zoom (smoothstep,
   `cubic-bezier(0.4,0,0.6,1)`), the tile's disc fade, and audio fades. Supersede the 800 ms figure
   currently in `animations-interactions.md`. (§4, §9)
6. **~1.67 s minimum banner dwell after pressing Start** before the "game" appears. Don't cut it
   short; it's load-bearing for the feel. (§9)
7. **Spin-up → loop → spin-down as three phases**, not one linear rotation. (§8)
8. **Two-beat insert animation:** both discs spin → the *other* disc leaves → the matching disc
   slides into the slot → banner swap → Start lights up. (§8)
9. **The empty tile animates forever** — slow specular rotation, distinct from the spin. (§3)
10. **Sound is not optional.** At minimum: no-disc banner jingle, hover blip on buttons, decide,
    gray-button, channel select/unselect. Pan grid SFX by pointer X. (§10)
11. **Skip the LED.** Or label it explicitly as creative licence. (§12)

---

## 14. Open questions / what I could not confirm

- **The exact `.brlan` curves.** The decomp gives clip *names* and *sequencing*, not keyframes. Spin
  RPM, the disc's travel path during `DiskIn`, and the empty tile's idle motion are all
  **[Inferred]**. Only a frame-by-frame capture (or extracting `diskThum.ash`/`diskBann.ash` from a
  NAND dump and parsing the `.brlan`s) settles these. **That extraction is the single highest-value
  next step for this component** and is entirely feasible.
- **`MESG_CHAN_SEL_BAD_DISK` wording** (the unreadable-disc line on `T_Comment1`) — strings live in
  a NAND MESG blob, not in source. Unknown.
- **`MESG_CHAN_SEL_UPDATE_DIALOG` wording** — same. The Message Board notice quoted in §11 is
  Nintendo's description *of* the feature, not the on-screen dialog text.
- **Clean digital colour values for the full-screen view.** My only capture is a CRT photograph.
  A Dolphin screenshot would fix this in one shot.
- **Whether `G_GC` is genuinely suppressed on RVL-101/RVL-201.** WiiBrew says yes; the 4.3 scene
  code shows no such check. (§5)
- **Whether the empty tile ever showed *two* discs** on GameCube-capable hardware. The reference
  screenshot shows one; the decomp tile layout is a single layout with no per-model branching; but
  the reference capture's hardware revision is unknown.
- **Pre-3.2 behaviour of the tile with a disc inserted.** Nintendo's 3.2 notice implies the disc
  *title* display was noteworthy enough to advertise, which hints something changed there too, but
  no source describes the pre-3.2 tile. Low stakes for the clone (build 4.3 behaviour).
- WebSearch quota was exhausted mid-pass; TCRF, Fandom and Spriters Resource all refused direct
  fetch (403/402). A follow-up with browser access should re-try
  `tcrf.net/Wii_Menu`, `nintendo.fandom.com/wiki/Disc_Channel`, and
  `spriters-resource.com/wii/wiimenu/` for sprite sheets of the disc art and the buttons.

---

## Sources

**Official (Nintendo-authored)**
- *Icon and Banner Specifications*, RVL-06-0166-001-L v1.0.0, 2008-02-26 — `wii_design_specs.pdf`
  (repo root). §1 Fig 1-1 (Disc Channel fixed top-left), §2.5 (icon animation mandatory),
  §2.9 ("Newly Arrived" groups), §3.4 + Figs 3-1/3-2/3-3/3-4 + Code 3-1 (banner chrome, buttons,
  608×456 / 590×332), §3.6 (Start/Loop animation tags), §3.7 (PAL50 1.2×), §4 (mandatory banner
  sound), §6 (≥1 s guaranteed banner display).
- *Wii Operations Manual — Channels and Settings* (RVK, English) —
  <https://archive.org/details/wii-opmanual-chset> ("Disc Channel - Play Wii games."; "Select Start
  on the game's Channel Preview screen to begin the game."; disc slot blinks blue for WiiConnect24).
- Nintendo Support — Disc Channel Overview —
  <https://en-americas-support.nintendo.com/app/answers/detail/a_id/2543/~/disc-channel-overview>
- Nintendo Support — How to Adjust the Disc Slot Illumination —
  <https://en-americas-support.nintendo.com/app/answers/detail/a_id/2705/~/how-to-adjust-the-disc-slot-illumination>
- Nintendo's 3.2 Message Board notice, reproduced verbatim at <https://wiibrew.org/wiki/3.2>

**Decompilation of the retail System Menu 4.3 binary**
- <https://github.com/koopthekoopa/wii-ipl> — `src/scene/channelTitle/iplChannelTitle.cpp`,
  `include/scene/channelTitle/iplChannelTitle.h`, `src/scene/channelSelect/iplChannelSelect.cpp`,
  `src/scene/channelSelect/iplChannelObj.cpp`, `src/system/iplChannelManager.cpp`,
  `src/iplwww/www_wiisetting.cpp`, `include/sound/IplSound.rsid`,
  `include/system/MESGEntries.h`.

**Fan/community**
- WiiBrew — Disc Channel: <https://wiibrew.org/wiki/Disc_Channel> (raw wikitext read this pass;
  behaviour, "Banner discs" section, hardcoded-into-System-Menu note, homebrew history)
- WiiBrew — 3.2: <https://wiibrew.org/wiki/3.2> (changelog rev01–rev04)
- WiiBrew — System Menu: <https://wiibrew.org/wiki/System_Menu> (version table, BS2 state machine)
- Wikipedia — Wii Menu: <https://en.wikipedia.org/wiki/Wii_Menu>
- WiiBrew capture of the full-screen empty state:
  <https://wiibrew.org/w/images/0/0b/Disc_channel.jpg>

**In-repo**
- `reference_screen.png` (grid tile, empty state) — direct pixel analysis
- `context/channels.md`, `context/visual-design.md`, `context/animations-interactions.md`,
  `context/audio.md`, `context/version-history.md`, `context/pinterest-board.md`,
  `context/component-inventory.md`
