# `.brlyt` / `.brlan` extraction — closing the `[Not found in decomp]` gaps

**Date:** 2026-07-25  **Status:** the biggest open question in the corpus (README §4 #1) is now
**mostly closed.** Real System Menu layout and animation binaries were located, decompressed and
converted to JSON. This doc reports **measurements and derived numbers only** — no asset bytes.

> **Precedence note.** This is a new evidence tier, above the decompilation for *appearance*:
> **Tier 1a — extracted layout/animation data.** The decomp still wins for *which* animation
> plays *when*; this data wins for *what* the animation does. Everything below tagged
> `[Extracted — file:pane]` is read out of a real `.brlyt`/`.brlan`.

---

## 0. TL;DR — what changed

| Question | Result |
|---|---|
| 1. Message Board transition | **CLOSED.** Not a flip, not a fade. The grid is a **pure vertical slide up, +423 units, 17 frames, smoothstep**. The "flip" everyone remembers is the **bottom-bar corner buttons rotating 180° in Z** over 20 frames. |
| 2. Channel tile hover | **CLOSED.** The tile never moves. A separate highlight quad scales **0.95 → 1.00 in 3 frames (50 ms)** and its colour-register alpha goes **0 → 150**. Out is **30 frames (500 ms)**, scaling to 0.90. |
| 3. Empty-slot idle loop | **CLOSED, in full detail.** A **4-frame texture-pattern flicker** cycling 4 noise frames on a **15-step / 60-frame (1 s) repeating sequence**, plus **two linear vertical UV scrolls** (5 wraps and 1 wrap) over the 2000-frame (33.4 s) loop. Also answers README open question #8. |
| 4. Channel launch zoom | **CONFIRMED + extended.** 28 frames, smoothstep. The `.brlan` adds a **full-canvas black mask fading 0 → 255 alpha** over the same 28 frames. |
| 5. Page transition | **CLOSED.** `N_ChAll` translates **X by ±512 units over 20 frames, zero-tangent Hermite = exact smoothstep**. Page carousel confirmed as **5 containers at 512 pitch**. |
| 6. Disc Channel | **CLOSED.** Banner disc spins **360° / 15 frames = 240 RPM, linear, clockwise**. `DiskIn` is **not** a pane translate — it is a **UV sweep** plus a 50-frame alpha fade. |
| 7. Bottom-bar half-pills | **CLOSED.** They exist, named, as a **3-slice capsule** (`BtnR_a0_0/1/2`, `BtnL_a0_0/1/2`), with a **second offset copy tinted black at alpha 64** as a drop shadow. Full geometry below. |
| 8. Clock / date panes | **CLOSED.** Exact positions, sizes, font sizes, and the byte-level confirmation that clock ink is **`#9B9B9B`** and the "Wii Menu" word is **`#34C0ED`**. |
| 9. Bonus | Grid slot pitch/offsets exact; widescreen texture-swap mechanism confirmed at layout level; balloon animation recovered; drag ghost/mask/burst recovered; a **dead animation** in `my_IplTop_a.brlan` identified. |

Still open: the **balloon's vertical direction** (README #5) — the `.brlan` contains no translate,
so the sign really is set in code and is still unproven from assets.

---

## 1. Method, provenance, and the legal line

### 1.1 The tool
`Tikilou/Wii-System-Menu-Extractor-Normalizer` (GPL-3.0, Rust, single commit, ~5 kLOC) is
**real and functional**. It does what the README claims: ASH/LZ77/Yaz0 decompression, U8 archive
extraction, TPL/TEX0 → PNG, **BRLYT → JSON**, **BRLAN → JSON**, BRFNT → PNG+JSON, MDL0 → glTF.
It runs recursive passes until stable, so pointing it at a folder of `.ash` archives yields fully
unpacked layout trees with no manual steps.

- **It bundles no sample data.** Only `src/`, `scripts/`, `packages/` (a prebuilt Linux AppImage)
  and a logo. So it could not answer anything on its own.
- **It needs Rust.** None was installed; `rustup` (stable, minimal) was installed to build it.
  `cargo build --release` succeeds in ~32 s with warnings only.
- **Its parsers are correct but shallow.** `brlyt.rs` decodes the pane tree and texture list but
  **ignores `mat1` entirely** (no material colours, no texture bindings) and mis-nests children
  (it pushes every pane rather than only on `pas1`). `brlan.rs` decodes keyframes correctly,
  including the Hermite slope, but its target-ID table is partly wrong (it maps RLPA id 10 to
  "Alpha"; alpha is RLVC id 16) and it collapses all RLMC targets to "Color".
- **So a second, deeper parser was written** (`reference/nw4r_dump.py`) covering `mat1`
  (TEV register colours, konstant colours, texture maps, wrap modes, texture SRT), `pic1` vertex
  colours and tex-coords, `txt1` (correct field order — the tool/most docs put `textOffset` after
  the colours; it is actually **before** them), `wnd1`, `bnd1`, and exact BRLAN target IDs plus
  interpolation type. Both were run; findings below use the deep parser, cross-checked against the
  tool's output.

### 1.2 Where the input came from — and where it did **not**

**No NAND dump, no System Menu WAD, no NUS download was used or attempted.**

Ranked by defensibility, what was tried:

| Rank | Source | Outcome |
|---|---|---|
| 1 | Test fixtures in the extractor itself | **None exist.** |
| 2 | **ThemeMii** base templates | **Negative result — ThemeMii ships no templates.** All eight ThemeMii repos on GitHub (`IAmOrion/ThemeMii`, `GimpTV/thememii`, …) contain only C# source. ThemeMii *downloads* the base `.app` from Nintendo's update servers at runtime. That path was **not** taken. |
| 3 | `giantpune/wii-system-menu-player` | **Code only, no assets** (`HBC/`, `data/` = a homebrew banner + a patcher object, `source/`). It loads the console's own resources at runtime. Its `SystemMenu/SystemMenuResources.cpp` and `buttoncoords.cpp` are useful secondary corroboration but contain no layout data. |
| 4 | `diddy81/Wii-Theme-Brlyt-Editor` | **Ten Python files of byte offsets**, no assets. Useful: it documents exactly *which* byte offsets themers patch, which turned out to be the key to separating Nintendo's values from theme edits (§1.3). Its `cmnbtn.py` names `my_IplTop_e.brlyt` offsets `0x2535, 0x2595, 0x2655, 0x26B5, 0x2715, 0x2835, 0x2895, 0x29F9` as "main button border" — these matched the observed diffs exactly. |
| 5 | `Alan-bur/WM4K` | 3 725 PNGs, **zero layout files** — it is a Dolphin texture-dump pack. Confirms the corpus's Tier 2.5 description. |
| 6 | **Community `.mym` theme packages** | **This is what worked.** |

The working source is **`scooby7402976/wiithemer2`**, a public GitHub repo mirroring the WiiThemer
tool's theme library: **518 `.mym` files**. A `.mym` is a ZIP holding an INI plus only the files a
theme replaces. Most ship a `brlyt/` folder of layout files; a minority (11 of the 41 sampled) ship
the **complete set of System Menu layout archives** — `chanSel.ash`, `cmnbtn.ash`, `board.ash`,
`diskThum.ash`, `Diskbann.ash`, `Setupsel.ash`, and 14 more. Those archives are theme-modified
copies of Nintendo's, and they contain every `.brlyt` and `.brlan` the corpus has been asking for.
`emilydaemon/synthwiive_theme` (a theme published as a GitHub repo, MIT-licensed wrapper) provided
an independent second set.

**41 `.mym` archives were downloaded** (~135 MB), from which **12 independent copies of
`chanSel.ash`** and comparable counts of the other archives were obtained.

**Everything downloaded and everything extracted lives under `reference/`, which is git-ignored.**
Nothing Nintendo-authored is anywhere else. This document contains no asset data — only numbers.

### 1.3 Separating Nintendo's values from theme edits — and how confident each number is

This matters: a theme *is* a modified System Menu. So each file was checked against many copies.

**Animations (`.brlan`) are not touched by theme tools.** Verified:

| File | Independent copies | Distinct byte-versions |
|---|---|---|
| `my_IplTop_a.brlan` | 12 | **1 — byte-identical** |
| `my_IplTopBalloon_a_BalloonInOut.brlan` | 13 | **1** |
| `my_DiskCh_In_DiskIn.brlan`, `my_DiskCh_b.brlan` | 8 | **1** |
| `my_IplTop_e.brlan` | 10 | **1** (100 % of 16 976 bytes unanimous) |
| `my_IplTop_b.brlan` | 12 | 2 — **8 × 4 268 B** (used here) vs 4 × 1 192 B, a themer hack that deletes the noise track |
| `my_IplTop_d_FocusOn/Off.brlan` | 13 | 2 — **11 × 280 B** (used here) vs 2 × 320 B |

So **every animation number in this document is Nintendo's, verbatim.**

**Layouts (`.brlyt`) are touched — but only at colour bytes.** ThemeMii-family colour editors
write a fixed 15-byte pattern (`R 00 G 00 B 00 00 00 R 00 G 00 B 00 A`) at hard-coded offsets.
Byte-diffing two unrelated themes' copies of the same file shows **only isolated single-byte runs,
all inside `mat1` and `txt1` colour fields** — never in a pane rect, never in the section table.
Examples: `my_IplTop_d.brlyt` 7 differing bytes; `my_IplTop_c.brlyt` 18; `my_Clock_a.brlyt` 48;
`my_IplTop_e.brlyt` 56 of 33 928. File **sizes are always identical.**

Therefore:

- **Geometry (positions, sizes, scales, rotations, hierarchy, texture bindings, wrap modes,
  texture SRT) is pristine.** Confidence: very high.
- **Colours were recovered by plurality vote across 18–38 independent copies**, per material.
  Each colour below carries its vote count. A colour with ≥ 8/N agreement and no rival cluster is
  reliable; anything at 6–7/N is flagged.

Two consistency checks passed:

- `T_WiiMenu` material → `(52, 192, 237)` = **`#34C0ED`**, 15/31 copies — the Wii blue, matching
  the corpus's independently pixel-measured accent.
- Clock digit materials → `(155, 155, 155)` = **`#9B9B9B`**, 8–9/31 — **exactly** the value
  `components/date-display.md` §5d measured from pixels. Two completely independent methods
  agreeing on `#9B9B9B` is strong.

### 1.4 Units, and how to convert

- Layout canvas for the main menu files: **608 × 456**, `centered = true`, origin at screen
  centre, **+X right, +Y up**. (`my_DiskCh_*` and `my_IplTopBalloon_a` are authored on **640 × 480**
  — noted where relevant.)
- The corpus's 16:9 space is **832 × 456**: same layout units, wider frustum.
- **Layout → CSS percentage:**
  - 4:3 `left% = (x + 304) / 608`, `top% = (228 − y) / 456`
  - 16:9 `left% = (x + 416) / 832`, `top% = (228 − y) / 456`
- **Frames → ms.** NTSC Wii runs **59.94 Hz → 16.683 ms/frame**. The corpus quotes 60 Hz
  (16.667 ms). Both are given below; the difference is ≤ 0.1 % and never matters.
- **Easing.** NW4R keyframes are **Hermite**: `(frame, value, slope)`. When both slopes of a
  segment are **0**, Hermite reduces *exactly* to `3t² − 2t³` — **smoothstep**, i.e.
  `cubic-bezier(0.5, 0, 0.5, 1)`. This is not a guess: across all 638 extracted animation files,
  **29 184 Hermite keys** were parsed and **2 872 carry a non-zero slope**, so zero-slope is a
  deliberate authoring choice, not a parser artifact. **Every keyframe in `my_IplTop_a.brlan`,
  `my_IplTop_d_*.brlan` and the bar's board transition has slope exactly 0.** This is byte-level
  confirmation of `decomp-findings.md` §3.2.

---

## 2. Question 1 — the Message Board open/close transition

### 2.1 The grid layer: a pure vertical slide `[Extracted — my_IplTop_a.brlan : N_Ch]`

```
pane N_Ch   RLPA TranslateY (target id 1), Hermite
   frame  70   value −30    slope 0
   frame  87   value +393   slope 0
   frame 100   value +393   slope 0
   frame 117   value −30    slope 0
```

`N_Ch` is the root group of the whole channel-grid layer (`my_IplTop_a.brlyt`, base position
`(0, −30)`, containing every page container, every slot, the page backgrounds, the shade bands and
the clock anchors).

**What this settles:**

- **It is a translation on Y and nothing else.** `my_IplTop_a.brlan` has exactly **15 animation
  targets** in the whole file, and in the 70–120 window only `N_Ch`'s `TranslateY` has any keys.
  **No `RotateX`, no `RotateY`, no `RotateZ`, no scale, no alpha, no colour.** So the "flip up like
  a folder" reading of the grid layer is **wrong**, and `mail-button.md`'s finding that it is not a
  fade is **confirmed**.
- **Direction: up.** −30 → +393 with +Y up. The grid's content spans roughly y ∈ [−161, +223];
  after +423 it sits at [+262, +646], entirely above the +228 top edge. The grid **exits through
  the top of the screen**, revealing the Message Board layer (`my_IplTop_c.brlyt`) that was already
  drawn beneath it.
- **Distance: 423 layout units = 92.8 % of the canvas height.** As a CSS transform on a
  full-height stage: `translateY(−92.76%)` of 456, i.e. `translateY(−423/456 × 100%)`.
- **Duration: 17 frames = 283.6 ms** (59.94 Hz) / 283.3 ms (60 Hz) — *not* 20.
  The code plays frames **70 → 90** (`iplChannelSelect.cpp` `tryToStartBoardScene`, 20 frames =
  333.7 ms), but the motion is finished at frame 87. **There are 3 frames (50 ms) of dead hold at
  the end.** Same on the way back: code plays 100 → 120, motion runs 100 → 117, 3 frames of hold.
- **Easing: exact smoothstep** (both slopes 0).

**Web translation:**

```css
/* grid layer, opening the Message Board */
transform: translateY(-92.76%);              /* of a 456-unit-tall stage */
transition: transform 283ms cubic-bezier(0.5, 0, 0.5, 1);
/* then hold 50ms before the scene is considered swapped (total 334ms) */
```

### 2.2 The bottom bar: *this* is the flip `[Extracted — my_IplTop_e.brlan]`

`FROM_CH_SEL_TO_BOARD` = frames 1000 → 1040 (40 frames = 667.3 ms), matching the decomp. Inside
that window:

| Target | Track | Keys | Meaning |
|---|---|---|---|
| `N_BtnR_a0`, `N_BtnR_a1` | `RLPA RotateZ` | f1008 = 0° → f1028 = **−180°** | right corner button **rotates 180° clockwise** |
| `N_BtnL_a0`, `N_BtnL_a1` | `RLPA RotateZ` | f1008 = 180° → f1028 = **360°** | left corner button **rotates 180° counter-clockwise** |
| `BtnR_a1_Bbs`, `N_BtnR_a0_Bbs` | `RLPA ScaleX/Y` | 1000 : 1.1 → 1002 : 1.0 → 1005 : 1.1 → 1008 : 1.1 → 1020 : 1.0 | a press "pop" on the icon that was clicked |
| `BtnR_a0_Bbs_Ac` (material) | `RLMC TevColor1.A` | 1002 : 0 → 1005 : **235** → 1008 : 235 → 1020 : 0 | white highlight flash, peak 235/255 = 92 % |

All slopes 0 → smoothstep on every segment.

**Reverse** (`FROM_BOARD_TO_CH_SEL`, 6000 → 6040) is the exact mirror: `N_BtnR_*` −180° → 0°,
`N_BtnL_*` 360° → 180°, and the pop/flash move to the `_Ch` variants of the panes.

So the composite motion the user sees is:

1. `t = 0` — icon pops (scale 1.1 → 1.0 → 1.1, 8 frames) and flashes white.
2. `t = 133 ms` (frame 1008) — both corner buttons begin a **180° Z rotation**, taking
   **20 frames = 333.7 ms**, smoothstep. The button's face swaps from the Message-Board glyph to
   the Wii-Menu glyph as it turns (the two icon sets are separate child panes 180° apart).
3. Simultaneously the grid slides up (§2.1) on its own 333.7 ms clock.
4. `t = 467 ms` (frame 1028) — rotation ends; 12 frames of settle to frame 1040 = **667 ms** total.

The corner-button rotation is the "flip like a folder". It is **in-plane Z rotation**, not a 3D
X-axis flip — which is why it is reproducible in CSS with `rotate()` and needs no `perspective`.

**Web translation:**

```css
/* corner buttons */
@keyframes bar-to-board-right {
  0%,   20% { transform: rotate(0deg); }        /* frames 1000–1008 */
  70%       { transform: rotate(-180deg); }     /* frame 1028 */
 100%       { transform: rotate(-180deg); }     /* frame 1040 */
}
/* 667ms total; the 20%→70% leg uses cubic-bezier(0.5, 0, 0.5, 1) */
```

`[Decomp — code]` The 333 ms / 667 ms desynchronisation reported in `decomp-findings.md` §7.2 is
confirmed and now explained: they are two different animation files with two different jobs, and
the grid's actual travel is 283 ms inside its 333 ms slot.

---

## 3. Question 2 — channel tile hover

### 3.1 The highlight object `[Extracted — my_IplTop_d.brlyt]`

The entire layout is **one picture pane**:

```
RootPane                608 × 456
  pic1 Cursur_a         128 × 96 at (0, 0), scale 0.90, alpha 255, INITIALLY HIDDEN
                        texture  my_TV_f.tpl   (wrap clamp/clamp)
                        material Cursur_a:
                            TevColor0 = (52, 190, 237, 0)     ← #34BEED, alpha 0
                            TevColor1 = (52, 190, 237, 0)     ← #34BEED, alpha 0  (animated)
                            TevColor2 = (255, 255, 255, 255)
```

So the hover affordance is a **Wii-blue quad exactly the size of one grid slot (128 × 96 = the full
tile pitch, not the visible aperture)**, tinted `#34BEED`, whose opacity is driven entirely by the
material's `TevColor1` alpha.

### 3.2 The three animations `[Extracted — my_IplTop_d_*.brlan]`

| Animation | Length | Track | Keys |
|---|---|---|---|
| **`_FocusOn`** (hover in) | **3 frames = 50.0 ms** | `RLVI` visibility | f0 = 0 → f1 = **1** |
| | | `RLPA ScaleX/ScaleY` | f0 = **0.95** → f3 = **1.00** |
| | | `RLMC TevColor1.A` | f0 = **0** → f3 = **150** |
| **`_FocusOff`** (hover out) | **30 frames = 500.5 ms** | `RLPA ScaleX/ScaleY` | f0 = 1.00 → f30 = **0.90** |
| | | `RLMC TevColor1.A` | f0 = 150 → f30 = **0** |
| | | `RLVI` visibility | f29 = 1 → f30 = **0** |
| **`_Select`** (click) | **16 frames = 266.9 ms** | `RLMC TevColor1.A` | f0 = 0 → f3 = **150** → f10 = 150 → f16 = **0** |
| | | (pane tracks parked at f −50: scale 0.90, hidden) | |

All slopes 0 → smoothstep.

**Answers:**

- **What animates:** a uniform **scale** and a **colour-register alpha**. Nothing else. No rotation,
  no translation, no glow radius, no ring thickness change.
- **Peak opacity = 150/255 = 58.8 %.**
- **In 50 ms, out 500 ms** — a 1 : 10 asymmetry, far more extreme than the bar buttons'
  100 / 133 ms. Note the rest scale differs from the entry scale: it **enters from 0.95** but
  **leaves to 0.90**.
- **Confirms** `components/channel-tile.md` §6: "the tile art is never deformed". The tile pane
  itself has no animation bound to hover at all.

### 3.3 A negative result worth recording: dead animation data

`my_IplTop_a.brlan` **does** contain a per-slot scale pulse:

```
panes N_Ch_c01 … N_Ch_c12   (all twelve slots of the centre page)
   RLPA ScaleX and ScaleY, Hermite, slopes 0
   f150 = 1.0 → f153 = 1.1 → f160 = 1.1 → f168 = 1.0
```

3 frames up (50 ms), 7 frames hold (117 ms), 8 frames down (133 ms) — 18 frames, 300 ms, a 10 %
tile pop. **It is never played.** `iplChannelSelect.cpp` sets only the frame ranges 0–20, 40–60,
70–90, 100–120 and 200–228; grepping the whole decomp for `150.0f` / `168.0f` finds only the
unrelated arrow constant `10150.0f`. **System Menu 4.3 contains an unused "tile pops on hover"
animation that Nintendo cut.** If a designer wants it, the exact authored values are above — but it
is not what the console does.

---

## 4. Question 3 — the empty-slot idle loop (high priority)

This is the fullest result of the pass.

### 4.1 The layout `[Extracted — my_IplTop_b.brlyt]`

```
canvas 608 × 456, centered
textures:  my_TV_c_p0.tpl   my_TV_d.tpl   my_TVSpe_a.tpl

RootPane
  pan1 Thu     128 × 96  at (0, 0)              ← the 4:3 slot box
    pic1 Ch0   170 × 96  at (0, 0)  material 0  ← the 16:9-width noise plate
      pic1 Ch1 170 × 96  at (0, 0)  material 1  ← the gloss overlay
```

`Ch0` vertex colours: `TL = TR = (250, 255, 255, 255)`, `BL = BR = (255, 255, 255, 255)` — a
**2 % red-channel falloff at the top edge only**; effectively a whisper-thin cool tint at the top.

**Material 0 (`Ch0`) — three texture stages:**

| Stage | Texture | wrap S / T | base SRT (`tS, tT, rot, sS, sT`) |
|---|---|---|---|
| 0 | `my_TV_c_p0.tpl` | **repeat** / clamp | `0, 0, 0, 1, 1` — **this stage is what the pattern animation swaps** |
| 1 | `my_TV_d.tpl` | clamp / **repeat** | `0, 3.0, 0, 1, 1` |
| 2 | `my_TV_d.tpl` | clamp / **repeat** | `0, 0.6, 0, 1, 1` |

TEV colours: `konst0 = (8, 8, 8, 255)` — a near-black constant, i.e. the noise is composited at
very low amplitude. `TevColor0 = (0,0,0,255)`, `TevColor1 = (255,255,255,255)`.

**Material 1 (`Ch1`):** single stage `my_TVSpe_a.tpl` (clamp/clamp), `TevColor0 = (0,0,0,0)` —
the static gloss/sheen sheet, not animated.

`my_IplTop_b.brlyt` was **byte-identical between two unrelated themes**, so these values are almost
certainly untouched.

### 4.2 The animation `[Extracted — my_IplTop_b.brlan]`

`frameCount = 1999`, `loop = true`, **one target: the material `Ch0`**, three tracks. The brlan
carries its own 4-entry texture-reference table (the four noise frames).

**Track A — the flicker. `RLTP` (texture-pattern), stage 0, step interpolation, 501 keys.**

- Keys at **frame 0, 4, 8, … 2000** — exactly **one texture swap every 4 frames**.
- 4 frames = **66.73 ms** → **14.985 texture changes per second**.
- Values ∈ {0, 1, 2, 3} — the four noise frames.
- **The sequence has an exact period of 15 keys = 60 frames = 1.0010 s.** The repeating unit is:

  ```
  0, 1, 2, 3, 0, 2, 1, 0, 3, 1, 2, 0, 1, 2, 3
  ```

- Over the 501 keys the frames appear 134 / 133 / 134 / 100 times (frame 3 is deliberately rarer).
- Transition counts (out of 500): `1→2` 100, `0→1` 67, `2→3` 67, `3→0` 67, and 33 each for
  `0→2, 0→3, 1→0, 2→0, 2→1, 3→1`. There is **no `1→3`, no `3→2`, no self-repeat** — consecutive
  frames are always different, and two of the twelve possible transitions are forbidden.

**Track B — slow scroll, stage 1. `RLTS V_Translate`, Hermite, 2 keys.**

```
f0     value 0.0   slope 0.0025
f2000  value 5.0   slope 0.0025
```

Slope = 5.0 / 2000 at both ends ⇒ **perfectly linear**. **5 full V wraps over 2000 frames
(33.366 s)** = 0.14985 wraps/s = one wrap every **6.673 s**.

**Track C — slower scroll, stage 2. `RLTS V_Translate`, Hermite, 2 keys.**

```
f0     value 0.0   slope 0.0005
f2000  value 1.0   slope 0.0005
```

Also linear. **1 wrap over 33.366 s.** Exactly **1/5 the speed of track B.**

Note the animation **overrides** the base SRT V-offsets (3.0 and 0.6), so at runtime both stages
start at V = 0 regardless of the layout's authored values.

### 4.3 What this means, and how to build it

The empty slot is **three superimposed effects on one quad**:

1. **A 15 Hz white-noise flicker** — 4 pre-rendered noise tiles, swapped every 4 frames on a
   1-second, 15-step, non-repeating-looking shuffle. Composited at very low amplitude
   (`konst = (8,8,8)`), which is why it reads as faint grain, not TV snow.
2. **A fast vertical drift** — texture layer scrolling 5 screens-worth downward per 33 s.
3. **A slow vertical drift** — the same texture at 1/5 the speed, giving beat/interference.
4. A **static gloss sheet** on top (`Ch1`).

The **2000-frame loop length** exists purely because of the two scrolls; the visible grain repeats
every second, but the interference pattern of the two scrolls takes 33.4 s to come back around.
`decomp-findings.md` §5.1's "random per-slot start frame" therefore randomises *the scroll phase*
across slots, not the flicker (which is only 1 s long and would look identical anyway).

**Web translation:**

```css
/* Layer 1 — flicker: 4 noise frames, 15-step cycle, 1.001s, steps() timing */
@keyframes noise-flicker {           /* 15 steps × 66.73ms */
  /* drive a sprite-sheet background-position through 0,1,2,3,0,2,1,0,3,1,2,0,1,2,3 */
}
.empty-slot__noise { animation: noise-flicker 1001ms steps(1, end) infinite; }

/* Layer 2 — fast scroll: 5 wraps / 33.366s  → one wrap per 6.673s */
.empty-slot__drift-a { animation: scroll-y 6673ms linear infinite; }

/* Layer 3 — slow scroll: 1 wrap / 33.366s */
.empty-slot__drift-b { animation: scroll-y 33366ms linear infinite; }

/* per-slot randomisation: animation-delay: -{random × 33366}ms on BOTH drift layers */
```

Composite amplitude: the noise contributes at roughly `8/255 ≈ 3 %` — keep it subtle.

**This also closes README open question #8** ("what are the four frames in the *Empty Channel
Spaces* sheet for?"). They are the four `RLTP` pattern targets of stage 0, and they differ only in
tonal range because they are four samples of the same grain field.

**Caveat:** 4 of 12 theme copies ship a 1 192-byte `my_IplTop_b.brlan` with the `RLTP` track
removed — a themer hack to kill the static. The 4 268-byte version analysed here is the majority
(8/12) and the one that carries all three tracks.

---

## 5. Question 4 — the channel launch zoom

`[Decomp — code]` `tellStartingZoomAnm()` plays frames **200 → 228** = 28 frames = **467.1 ms**,
and `initChanZoomParam` drives the zoom itself in code with Hermite zero tangents. **Confirmed.**

`[Extracted — my_IplTop_a.brlan]` The `.brlan` contributes exactly **one** track in that window:

```
MATERIAL ChMask   RLMC TevColor1.A (target id 11), Hermite
   f200  value 0     slope 0
   f228  value 255   slope 0
```

`[Extracted — my_IplTop_a.brlyt : ChMask]` `ChMask` is a `pic1` covering the **entire canvas,
608 × 456 at (0, 0)**, drawn last (it is the final pane in the tree), material 0:

```
texture   my_Beta16x16_a.tpl      (a 16×16 flat fill)
TevColor0 = (0, 0, 0, 0)
TevColor1 = (0, 0, 0, 0)          ← BLACK, alpha 0 — this is what animates to 255
```

`ChMask`'s colour block was **unanimous across 35 of 38 copies**, so this is solid.

**So the launch zoom is:** the selected tile scales up under code control (smoothstep, 28 frames)
**while a full-screen black veil fades in from 0 % to 100 % over the same 28 frames, also
smoothstep.** By frame 228 the screen is fully black and the scene swaps. There is nothing else in
the file — no radial blur, no flash, no other pane moves.

This is a **different fade from the global 20-frame linear black fade** (`eggColorFader`,
`decomp-findings.md` §10.4). The launch has its own, longer, eased one baked into the layout.

**Web translation:**

```css
/* tile */  transform: scale(N); transition: transform 467ms cubic-bezier(0.5,0,0.5,1);
/* veil */  background:#000; opacity:0 → 1; transition: opacity 467ms cubic-bezier(0.5,0,0.5,1);
```

Played **backward** for the return, per the decomp.

---

## 6. Question 5 — the page transition

`[Extracted — my_IplTop_a.brlan : N_ChAll]`

```
pane N_ChAll   RLPA TranslateX (target id 0), Hermite, all slopes 0
   f0   value    0
   f20  value  +512      ← code plays 0→20 for "scroll left"
   f39  value  +512
   f40  value    0
   f60  value  −512      ← code plays 40→60 for "scroll right"
   f61  value    0
```

- **20 frames = 333.7 ms**, matching `decomp-findings.md` exactly.
- **Easing: exact smoothstep** — both endpoint slopes are 0. This is the first byte-level proof of
  the page-transition easing.
- **Travel: ±512 layout units** = 84.2 % of the 608-wide canvas (61.5 % of the 832-wide 16:9 space).
  Note this is **not** a full screen width — it is the page pitch (§9.1).
- The frames at 39/40 and 61 are instantaneous resets, not motion.

`[Extracted — my_IplTop_a.brlyt]` confirms the carousel: five sibling page containers
`N_Ch_a`, `N_Ch_b`, `N_Ch_c`, `N_Ch_d`, `N_Ch_e` at **x = −1024, −512, 0, +512, +1024**. The live
page is `N_Ch_c` at 0. (`N_Ch_a` and `N_Ch_e` are sparsely populated — only slots 01/05/09 and
04/08/12 — i.e. they exist just to feed the columns that peek in at the screen edges.)

`[Extracted — my_IplTop_a.brlyt]` also confirms `components/page-navigation.md` §6: **the arrows
are not in this layout at all** (they live in `my_IplTop_e.brlyt`), so they demonstrably do not
move during a page turn.

---

## 7. Question 6 — the Disc Channel

### 7.1 The spinning disc `[Extracted — my_DiskCh_a_DiskLoop.brlan]`

```
pane WiiDisk  RLPA RotateZ, Hermite
   f0   value −360.00058   slope −24.0
   f15  value −720.00061   slope −24.0
pane GCDisk   — identical values
frameCount = 15, loop = true
```

- Slope −24.0 °/frame at **both** ends and Δvalue / Δframe = −360/15 = −24.0 ⇒ **exactly linear**,
  no easing.
- **One full revolution every 15 frames = 250.3 ms = 4 rev/s = 240 RPM.**
- **Negative Z = clockwise** in NW4R.
- The layout also parks `ShadeWii`, `RefWii`, `W_Wii`, `N_Bar`, `T_Comment0` and ~30 other panes at
  out-of-range frames (−220, −200, 450, 1250, …) — a standard NW4R idiom for "hold at a fixed
  value", not motion.

**Web:** `animation: spin 250ms linear infinite;` with `transform: rotate(-360deg)`.

### 7.2 The disc *tile* (no-disc / idle) `[Extracted — my_DiskCh_b.brlyt + .brlan]`

Layout — note the canvas is **640 × 480**, not 608 × 456:

```
RootPane                    640 × 480
  pic1 Base                 180 × 96  at (0, 0)
  pic1 Base_00 / Base_01    zero-size gradient helpers, vertex colours
                            Base_00: top (250,250,250) → bottom (240,240,240)
                            Base_01: top (240,240,240) → bottom (255,255,255)
  pan1 N_Disk               at (0, 0)
    pic1 Disk_00            96 × 96 at (0, −69), scale (0.799, 0.800)   ← reflection
    pan1 Null_00            at (0, −37), scale (1.0, 0.15)
      pic1 Picture_00       50 × 32, alpha 0                            ← shadow ellipse
    pic1 Disk               96 × 96 at (0, +2),  scale (0.799, 0.800)   ← the disc
```

Animation, `frameCount = 360` (**6.006 s**), `loop = true`:

| Target | Track | Keys |
|---|---|---|
| `Disk`, `Disk_00` | `RLPA ScaleX` | f0 = 0.79948 (s 0) → f15 = 0.77513 (s −0.00352) → **f70 = 0.0** (s −0.01409) ▮ f70 = 0.0 (s +0.01367) → f123 = 0.72455 (s +0.00523) → f168 = 0.79948 (s 0) |
| `Picture_00` (shadow) | `RLPA ScaleY` | f0 = 1.0 → f70 = 0.15 → f140 = 1.0, slopes ±0.01214 |
| `Picture_00` | `RLPA RotateZ` | f0 = 0° → f140 = **180°**, slopes 0 |
| `Disk` material | `RLMC TevColor0.RGB` | f73 = 40 → f88 = 100 → f95 = 100 → f140 = 40 |
| `Disk` material | `RLMC TevColor1.RGB` | f18 = 255 → f73 = **170** → f89 = 255 |
| `Disk` material | `RLMC TevColor1.A` | f1 = 255 → f74 = **160** → f140 = 255 |

**Reading:** `ScaleX` going 0.8 → 0 → 0.8 with the discontinuity at frame 70 is a **half-turn about
the vertical axis faked with an X squash** — the disc goes edge-on at frame 70 and comes back
face-on at 168. The shadow squashes and rotates 180° in lockstep. The material darkens
(`TevColor1` 255 → 170) and drops alpha (255 → 160) as the disc turns edge-on, then recovers.

- **Half turn = 70 frames = 1.168 s**; recovery to full width by frame 168 = **2.803 s**.
- **The loop is 360 frames = 6.006 s**, so the disc **flips once, then rests ~3.2 s** before
  flipping again. It is *not* continuously spinning — that is only the banner disc (§7.1).
- These slopes are **non-zero and asymmetric** — a genuinely hand-tuned curve, not smoothstep.
  Approximate CSS: the 0 → 70 leg is close to `cubic-bezier(0.35, 0, 0.75, 0.55)`; better to drive
  it as `scaleX(0.8 · |cos θ|)` with θ animated linearly, which fits within ~2 %.

### 7.3 The `DiskIn` travel path `[Extracted — my_DiskCh_In.brlyt + my_DiskCh_In_DiskIn.brlan]`

Layout (canvas 640 × 480):

```
RootPane
  pan1 N_Disk     at (−55, 0)
    pic1 DiskIn   128 × 96 at (−43, 0), alpha 0, textures IplTopMask4x3 / my_DiskChIcon_b
  pic1 16x9       128 × 64 at (−153, +487)      ← off-screen 16:9 texture holder
```

Animation (`frameCount = 61`, non-looping):

```
pane     DiskIn  RLVC PaneAlpha   f0 = 0 → f50 = 255            slopes 0  → smoothstep
MATERIAL DiskIn  RLTS U_Translate (stage 1)
                 f0  = +1.00000   slope 0
                 f40 = −0.57377   slope −0.026759
                 f60 = −0.70000   slope 0
```

**So `DiskIn` does not travel across the screen.** The pane never moves. What travels is the
**texture's U coordinate**, sweeping **1.0 → −0.7 = 1.7 texture widths over 60 frames
(1.001 s)**, with an ease-out on the last 20 frames. Combined with the 50-frame (**834 ms**)
alpha fade-in, the visual is a **highlight/sheen wiping horizontally across the disc tile as it
materialises** — a UV wipe, not a motion path.

This corrects any implementation that tried to animate a disc sliding into the slot.

---

## 8. Question 7 — the bottom bar and the "half-pill" platforms

**They exist, they are named, and there are two of them per corner.** `[Extracted —
my_IplTop_e.brlyt]`

### 8.1 Structure

```
RootPane                              608 × 456
  pan1 N_TopBtn                       800 × 40  at (0, 0)        ← bar root
    pan1 N_BtnR                       256 × 256 at (+294, 0)     ← right cluster
      pan1 N_BtnR_a1                  at (+6, −162)              ← SHADOW plate
        pic1 BtnR_a1_0   64 × 128 at x = −78.00           tex my_TopBtn_base_a
        pic1 BtnR_a1_1   92 × 128 at x =   0.00           tex my_TopBtn_base_b
        pic1 BtnR_a1_2   64 × 128 at x = +78.00, rotZ 180 tex my_TopBtn_base_a
        pic1 BtnR_a1_Bbs 80 × 80  at x = −62
        pic1 BtnR_a1_Ch  80 × 80  at x = +62
      pan1 N_BtnR_a0                  at (0, −156)               ← MAIN plate
        pic1 BtnR_a0_0   64 × 128 at x = −78.00           tex my_TopBtn_base_a
        pic1 BtnR_a0_1   92 × 128 at x =   0.00           tex my_TopBtn_base_b
        pic1 BtnR_a0_2   64 × 128 at x = +78.33, rotZ 180 tex my_TopBtn_base_a
        bnd1 B_Bbs       80 × 80  at (−61, 0)             ← Message Board hit box
        bnd1 B_Ch        80 × 80  at (+62, 0), rotZ −180  ← Wii Menu hit box
        pan1 N_BtnR_a0_Bbs at (−61, 0)  → plate 84×84, icon 80×80, BbsMark0 48×32 (alpha 180),
                                          T_BbsMark1 (count text, scale 0.45, alpha 0),
                                          BtnR_a0_BbsSig1 80×80 scale 1.1 alpha 0 (new-mail pulse),
                                          BtnR_a0_Bbs_Ac 80×80 (highlight)
        pan1 N_BtnR_a0_Ch  at (+62, 0), rotZ 180 → same trio
    pan1 N_BtnL                       256 × 256 at (−293, 0)     ← left cluster
      pan1 N_BtnL_a1  at (+6, −163), rotZ 180                    ← SHADOW plate
        pic1 BtnL_a1_0   64 × 128 at x = −77.17, scaleY −1
        pic1 BtnL_a1_1  164 × 128 at x = +37.00
        pic1 BtnL_a1_2   64 × 128 at x = +151.33, scaleY −1, rotZ 180
      pan1 N_BtnL_a0  at (0, −156), rotZ 180                     ← MAIN plate
        …same 3 slices…
        bnd1 B_Set  80 × 80 at (−60, −1)     ← Wii button hit box
        bnd1 B_Cal  72 × 72 at (+61.33, +1)  ← (Message Board only)
        bnd1 B_Add  72 × 72 at (+134.33, +1) ← (Message Board only)
        pan1 N_BtnL_a0_Set → BtnL_a0_Set_00 84×84, BtnL_a0_Set 80×80 (tex my_TopBtn_c),
                             BtnL_a0_Set_Ac 80×80 alpha 0
```

### 8.2 The pill geometry, exactly

The pill is a classic **three-slice horizontal capsule**: two 64-wide cap textures
(`my_TopBtn_base_a.tpl`) flanking one stretched centre (`my_TopBtn_base_b.tpl`).

| | Right pill (`N_BtnR_a0`) | Left pill (`N_BtnL_a0`) |
|---|---|---|
| Cap width | 64 | 64 |
| Centre width | **92** | **164** |
| Local extent | x ∈ [−110.00, +110.33] → **220.33 wide** | x ∈ [−109.17, +183.33] → **292.50 wide** |
| Height | **128** | **128** |
| Cluster anchor | `N_BtnR` at x = **+294** | `N_BtnL` at x = **−293**, plate rotated **180°** |
| Vertical anchor | y = **−156** | y = **−156** |

- **The two pills are different widths.** The right one (Message Board + Wii Menu, two 80 × 80
  icons at ±61/62) is 220.33 wide. The left one (Wii button, plus Calendar/Add on the Message
  Board screen) is 292.50 wide. This has not been recorded anywhere in the corpus.
- **Vertical position:** centre y = −156, height 128 → spans y ∈ [−220, −92]. Screen bottom is
  −228, so the pill's bottom edge sits **8 units above the screen edge** and its top edge reaches
  **y = −92** — which is exactly the clock's anchor height (§9.2). In CSS terms the pill occupies
  **top 70.2 % → 98.2 %** of the 456-unit height, i.e. it **hangs high in the bar and pokes out of
  the top of it**, matching `components/bottom-bar-half-pills.md`.
- **The 3-slice caps are 64 wide with the pill 128 tall ⇒ cap radius = 64 = half the height** —
  a true capsule. Confirms the corpus's "cap radius = half height".

### 8.3 The drop shadow nobody had found

`N_BtnR_a1` / `N_BtnL_a1` are a **complete second copy of the pill**, offset by **(+6, −6)**
relative to the main plate (`(+6, −162)` vs `(0, −156)`), using the **same textures** but with
materials tinted:

```
BtnR_a1_0/1/2 and BtnL_a1_0/1/2:   TevColor0 = (0,0,0,0)   TevColor1 = (0, 0, 0, 64)
```

**Black at alpha 64 = 25.1 %.** `BtnL_a1_Set` (the shadow of the Wii glyph) is
`(0, 0, 0, 30)` = **11.8 %**.

So the pills are drawn as: **a 25 %-black silhouette offset 6 units right and 6 units down, then
the white plate on top.** In CSS this is
`filter: drop-shadow(6px 6px 0 rgba(0,0,0,0.251))` (in layout units), not a blurred shadow —
it is a hard offset copy.

### 8.4 Material colours — and how they square with the texture rip

| Material | Pane | Texture | `TevColor0` | `TevColor1` | Votes |
|---|---|---|---|---|---|
| `BtnR_a0_0/1/2` | main pill slices | `my_TopBtn_base_a/b` | `(0,0,0,0)` | `(255,255,255,255)` | high |
| `BtnR_a1_0/1/2` | shadow pill | same | `(0,0,0,0)` | `(0,0,0,64)` | high |
| `BtnR_a0_Ch` | Wii-Menu glyph | `my_TopBtn_b` | `(0,0,0,0)` | `(255,255,255,255)` | high |
| `BtnR_a0_Bbs` | Board glyph | `my_TopBtn_a` | `(0,0,0,0)` | `(255,255,255,255)` | high |
| `BtnR_a0_Bbs_00` | glyph backplate | `my_TopBtn_a` | `(0,0,0,0)` | `(0,0,0,255)` | high |
| `BbsMark0` | mail-count badge | `my_TopBtn_a0` | `(140,140,140,0)` | `(140,140,140,255)` | high |
| `BtnL_a0_Set` | Wii glyph | `my_TopBtn_c` | `(0,0,0,0)` | `(255,255,255,255)` | high |
| `BtnL_a0_Cal` | calendar glyph | `my_TopBtn_d` | — | `(255,255,255,255)` | high |
| `BtnL_a0_Add` | add glyph | `my_TopBtn_e` | — | `(255,255,255,255)` | high |
| `ArwR` | page arrow | `my_arw_a` | `(0,0,0,0)` | `(255,255,255,255)` | high |
| `ArwBtnR` / `_Ac` | arrow hit plate | `my_ComBtn_a` | `(0,0,0,0)` / `(255,255,255,0)` | `(255,255,255,0)` | high |

**The pill's material tint is plain white with no alpha reduction.** So *all* of the pill's
translucency — `bottom-bar-half-pills.md`'s "54 %-alpha rim around a 7 %-alpha interior" — comes
from the **texture's own alpha channel**, exactly as that doc concluded from the rip. The layout
**confirms** the rim-only reading: it does nothing to modulate it.

`BbsMark0` at `(140, 140, 140)` with pane alpha 180 is a new number: the mail-count badge plate is
**`#8C8C8C` at 70.6 % pane alpha**.

**Caveat on absolute screen X.** `N_BtnR` sits at x = +294 and the right pill's outer edge at
+404.33 — 11.7 units short of the 832-space half-width (416) and well outside the 608-space
half-width (304). The left pill's outer edge lands at −476.33. That means the bar's clusters are
**not** usable at these raw coordinates in 4:3 and the System Menu must re-anchor them at runtime
(consistent with the corpus's note that elements are re-anchored, not scaled, between aspect
modes). The **relative** geometry above (slice widths, cap radius, icon offsets ±61/62, shadow
offset, heights) is exact and aspect-independent; **treat the absolute X anchors as 16:9-authored
values pending a code-side confirmation.**

---

## 9. Question 8 — clock and date panes

### 9.1 Where the clock sits `[Extracted — my_IplTop_a.brlyt]`

The clock's *anchors* are in the grid layout, one per carousel page:

```
pan1 N_Clock0   30 × 40 at (−512, −92)   visible
pan1 N_Clock1   30 × 40 at (   0, −92)   visible
pan1 N_Clock2   30 × 40 at (+512, −92)   HIDDEN
```

Because they sit inside `N_ChAll` (page scroll, ±512) inside `N_Ch` (base y = −30):

- **Absolute clock origin = (0, −122)** on the live page.
- CSS: `left 50 %`, `top = (228 − (−122)) / 456 = ` **76.75 %**.
- The ±512 spacing is the page pitch ⇒ **the clock slides with the grid during a page turn**, and
  during the Message Board transition it slides up with everything else. Confirms
  `decomp-findings.md` §9.7 exactly.

### 9.2 The clock layout `[Extracted — my_Clock_a.brlyt]`

Canvas 608 × 456. Font `RevoIpl_RodinNTLGPro_DB_32_I4.brfnt`.
Textures: `my_Clock_a0` … `my_Clock_a9` (digits 0–9), `my_Clock_aa` (blank), `my_Clock_ab` (colon),
`my_Clock_b0` (AM), `my_Clock_b1` (PM).

```
RootPane
  ── hidden texture-source panes, parked off-screen at y = +570 / +513 ──
  pic1 Num0 … Num9   64 × 64  at x = −284, −217, −155, −90, −26, +39, +106, +178, +244, +311
  pic1 NumNull        8 × 8   at (+383, +570)
  pic1 AM            48 × 32  at (−289, +513)
  pic1 PM            48 × 32  at (−233, +513)

  pan1 N_WiiMenu     30 × 100 at (0, 0)
    txt1 T_WiiMenu  280 × 38  at (0, 0), alpha 0
                    font size 28.80 × 34.20, centred, material #34C0ED
    pan1 N_Clock     30 × 100 at (0, 0), scale 0.88 × 0.88
      pic1 Clock3    48 × 48 at (−54,   0)     ← hours tens
      pic1 Clock2    48 × 48 at (−24,   0)     ← hours units
      pic1 ClockTen  48 × 48 at (  0,   0)     ← the colon
      pic1 Clock1    48 × 48 at (+24,   0)     ← minutes tens
      pic1 Clock0    48 × 48 at (+54,   0)     ← minutes units
      pic1 AM_PM     48 × 32 at (−92, −10)     ← JPN/KOR position (left)
      pic1 AM_PM_R   48 × 32 at (+104.55, −11.36)  ← USA position (right)
```

**Derived, with the 0.88 group scale applied and the (0, −122) anchor added:**

| Pane | Local x | Effective x (×0.88) | Absolute (x, y) | Box after scale |
|---|---|---|---|---|
| `Clock3` | −54 | −47.52 | (−47.52, −122) | 42.24 × 42.24 |
| `Clock2` | −24 | −21.12 | (−21.12, −122) | 42.24 × 42.24 |
| `ClockTen` | 0 | 0 | (0, −122) | 42.24 × 42.24 |
| `Clock1` | +24 | +21.12 | (+21.12, −122) | 42.24 × 42.24 |
| `Clock0` | +54 | +47.52 | (+47.52, −122) | 42.24 × 42.24 |
| `AM_PM` | −92, −10 | −80.96, −8.8 | (−80.96, −130.8) | 42.24 × 28.16 |
| `AM_PM_R` | +104.55, −11.36 | +92.00, −10.00 | (**+92.00**, **−132.00**) | 42.24 × 28.16 |

- **Digit pitch is not uniform:** 30 units between `Clock3↔Clock2` and `Clock1↔Clock0`, but only
  24 between each of those and the colon. The colon is **tighter** than the digit gap by 6 units
  (20 %). That is a real typographic detail no prior doc has.
- **`AM_PM_R`'s authored position is `(104.55, −11.36)`** — deliberately off-grid, and it scales to
  exactly `(92.00, −10.00)`. Nintendo positioned it in the scaled space and back-solved.
- CSS for the USA layout (16:9, 832 × 456): colon at `left 50 %`, digits at
  `50 % ∓ 2.538 %` and `50 % ∓ 5.712 %`; `AM_PM_R` centre at `left 61.06 %`,
  `top = (228 + 132)/456 = 78.95 %`. Digit box = 42.24/456 = **9.26 % of stage height**.

**Colours** (plurality across 31 copies):

| Material | Colour | Votes |
|---|---|---|
| `Clock0`–`Clock3`, `ClockTen` | **`#9B9B9B`** `(155,155,155)` | 8/31 (next: black 3, white 3) |
| `AM_PM`, `AM_PM_R` | **`#9B9B9B`** | 9/31 |
| `Num0`–`Num9` (source panes) | white `(255,255,255)` | **26/31** |
| `T_WiiMenu` | **`#34C0ED`** `(52,192,237)` | 15/31 |

The hidden `Num*` source panes are white because they are pure texture carriers; the *visible*
`Clock*` panes carry the `#9B9B9B` tint. **This is byte-level confirmation of the pixel-measured
`#9B9B9B`**, and it independently kills the "non-removable drop shadow" claim: the layout has one
flat tint and no second shadow pane.

**No `88:88` ghost-segment layer exists** (README open question #7). `my_Clock_a.brlyt` has exactly
21 materials and the pane list above — there is no eighth-segment backing pane. **Refuted.**

### 9.3 The "Wii Menu" → clock crossfade `[Extracted — my_Clock_a_Change.brlan]`

```
frameCount = 26, non-looping
pane T_WiiMenu   RLVC PaneAlpha   f0  = 255 → f16 = 0        (16 f = 266.9 ms)
pane N_Clock     RLVC PaneAlpha   f9  = 0   → f25 = 255      (16 f = 266.9 ms)
```

- **A 267 ms cross-fade with a 9-frame (150 ms) stagger** — the word fades out over frames 0–16,
  the clock fades in over frames 9–25. They overlap for 7 frames (117 ms).
- Total 26 frames = **433.7 ms**.
- All slopes 0 → smoothstep.
- Other panes are parked at f350 (a hold key), i.e. they are not animated.

### 9.4 The colon blink `[Extracted — my_Clock_a_Min.brlan]`

```
frameCount = 66
pane ClockTen  RLVC PaneAlpha
   f0  = 255 → f5  = 0        ← 5 frames = 83.4 ms fade OUT
   f53 = 0   → f63 = 255      ← 10 frames = 166.9 ms fade IN
```

So the colon is **not** a hard on/off blink. It **fades out in 83 ms, stays off for 48 frames
(801 ms), fades back in over 167 ms**, on a 66-frame (1.101 s) animation the code retriggers every
even second (`decomp-findings.md` §9.5). Smoothstep on both legs.

**Web:**
```css
@keyframes colon { 0% {opacity:1} 7.6% {opacity:0} 80.3% {opacity:0} 95.5% {opacity:1} }
.clock__colon { animation: colon 2000ms cubic-bezier(0.5,0,0.5,1) infinite; }
```

### 9.5 The date `[Extracted — my_IplTop_c.brlyt]`

```
canvas 608 × 456
texture  my_BackPic_a.tpl
font     RevoIpl_RodinNTLGPro_DB_48_IA4.brfnt          ← 48 px, IA4, ≠ the clock's 32 px I4 font

RootPane
  pan1 N_TopBack        64 × 600 at (121.60, 0)        ← x is animated; 0 at rest
    pic1 TopBack_a      608 × 456 at (−608, 0)   material TopBack_a
      txt1 T_Day_a      384 × 64  at (+1, −177)
    pic1 TopBack_b      608 × 456 at (   0, 0)   material TopBack_b
      txt1 T_Day_b      384 × 64  at ( 0, −177)         ← the one on screen
    pic1 TopBack_c      608 × 456 at (+608, 0)   material TopBack_c
      txt1 T_Day_c      384 × 64  at ( 0, −177)
```

Text-pane properties (unanimous 14–16 of 18 copies):

| Property | Value |
|---|---|
| Box | **384 × 64** |
| Position | **(0, −177)** → CSS `left 50 %`, **`top 88.82 %`** |
| Font size | **29.76 × 31.62** |
| Char spacing / line spacing | 0 / 0 |
| Alignment | 4 = centred, line-align 0 |
| Vertex colours | top and bottom both `(255,255,255,255)` |
| Material `T_Day_a/b/c` | `(255,255,255)` — 7/18 (next: `(0,255,0)` 2, `(0,0,0)`→white 2) |

**Findings:**

- **Three day-panes in a horizontal carousel at 608 pitch** — this is the day scroller
  (§9.6), and it is why the corpus's `T_Day_a/b/c` triple exists.
- **The date sits at 88.82 % of stage height, the clock at 76.75 %.** Vertical gap =
  **55 layout units = 12.06 % of height**. This settles `components/date-display.md` §6's "opposite
  sides of the accent line" with exact numbers.
- **Size ratio.** Date glyph height 31.62 vs clock digit box 42.24 (after the 0.88 group scale) →
  **0.749**. `date-display.md` estimated **≈ 0.76×** from pixels. Excellent agreement.
- **Different typefaces confirmed at file level:** the date uses the **48 px IA4** Rodin font, the
  clock's `T_WiiMenu` uses the **32 px I4** Rodin font, and the clock digits use dedicated TPL
  images (not a font at all). Three different rendering paths, exactly as `decomp-findings.md`
  §9.6 deduced.
- **Colour caveat.** The layout tints the date **white**, not grey — yet it reads grey on screen.
  The likely mechanism: the font is **IA4** (intensity + alpha), so the glyph sheet itself carries a
  sub-maximal intensity and the white tint multiplies it down. Treat the date's *effective* ink as
  the pixel-measured grey, and the layout tint as **white** (`⚠️ 7/18 vote — low confidence`).

### 9.6 Bonus: the Message Board day scroll `[Extracted — my_IplTop_c.brlan]`

```
frameCount = 150, loop = true, single target: pane N_TopBack, RLPA TranslateX

 next day:  f0  = 0     slope 0
            f14 = 580    slope +14.338
            f20 = 608    slope 0            ← 20 frames = 333.7 ms, travel 608 = one full canvas
            f29 = 608 ; f30 = 0             ← reset

 prev day:  f30 = 0     slope 0
            f44 = −580   slope −13.232
            f50 = −608   slope 0
            f60 = −608 ; f60 = 0            ← reset

 fast repeat (held button): f60→f100, a chain of 608 / 121.60 / 131.87 jumps with
                            slopes up to ±486, i.e. an instant snap-and-catch cycle
```

- **20 frames = 333.7 ms**, matching `decomp-findings.md`'s "Message Board day scroll = 20 frames".
- **Travel = 608 units = a full canvas width** (unlike the channel grid's 512).
- **The easing is NOT smoothstep.** The slopes are non-zero: it covers 580 of 608 units in the
  first 14 frames and crawls the last 28 units over 6 frames. That is a pronounced **ease-out**.
  Best CSS fit, by brute-force search over a 21×21×21×21 control-point grid against the sampled
  Hermite curve: **`cubic-bezier(0.50, 0.25, 0.30, 1.00)`**, RMS error **1.34 %** of travel
  (compare: plain smoothstep `cubic-bezier(0.5, 0, 0.5, 1)` misfits this curve by ~6 %).
  **This is the first documented exception to the "everything is smoothstep" house rule.**

---

## 10. Question 9 — other things the layouts reveal

### 10.1 The channel grid, exactly `[Extracted — my_IplTop_a.brlyt]`

Every page container (`N_Ch_b`, `N_Ch_c`, `N_Ch_d`) holds twelve slot nodes at:

```
columns  x = −192, −64, +64, +192          ← pitch 128
rows     y = +175, +79, −17                ← pitch 96
slot box 128 × 96
```

- **Slot pitch equals the slot box exactly** — 0 gutter at the pane level. **Confirms**
  `components/channel-tile.md` §2.1: the gutter is baked into the tile texture, not the layout.
- Naming is `N_Ch_<page><NN>` with `NN` = 01…12 in **row-major order**, `01`–`04` on the top row.
  **Confirms** `decomp-findings.md` §14.4's `index = row × 4 + col`.
- **Grid vertical centre is y = +79, not 0** — the grid block sits 79 units above canvas centre.
  Block extent: x ∈ [−256, +256], y ∈ [−65, +223].
- CSS (4:3): columns at `left 18.42 %, 39.47 %, 60.53 %, 81.58 %`; rows at
  `top 11.62 %, 32.68 %, 53.73 %`; slot 21.05 % × 21.05 % of the 608 × 456 stage.
- Edge pages `N_Ch_a` (x = −1024) and `N_Ch_e` (x = +1024) carry **only 3 slots each** —
  `a04/a08/a12` and `e01/e05/e09` — i.e. exactly the one column that peeks in past the screen
  edge. **This is the layout-level cause of the "partial 5th column at the right edge"** that
  `channel-tile.md` §8.2 measured from pixels.

### 10.2 The grid layer's decorative furniture `[Extracted — my_IplTop_a.brlyt]`

Five of each, one per carousel page, all at 512 pitch:

| Pane set | Size | y | Origin | Texture | Notes |
|---|---|---|---|---|---|
| `Picture_00`–`04` | 512 × 288 | +79 | c/c | `IplTopMask4x3` + `my_TVSheet_b` | the page background plate |
| `BaseMask0`–`4` | 512 × 288 | +79 | c/c | `my_TVSheet_b` | backing plate |
| `Edge0`–`4` | 512 × 288 | +79 | c/c | `IplTopMaskEgde4x3` *(Nintendo's typo)* | edge vignette, `(130,130,130,0) → (180,180,180,255)`, 14/38 |
| `Picture_05`–`09` | 512 × 48 | +223 | c/**b** | `my_TVSheet_b` | top strip |
| `Shade0`–`4` | 512 × 96 | −65 | c/**t** | `my_TVSheet_g` | **bottom shade band** |
| `board0`–`4` | 522 × 64 | −64 | c/**t** | `my_TVSheet_b` + `my_TVSheet_e` | |
| `Line0`–`4` | 522 × 64 | −66 | c/**t** | `my_TVSheet_f` | |
| `ChMask` | 608 × 456 | 0 | c/c | `my_Beta16x16_a` | the launch-zoom black veil (§5) |

**`Shade0–4` is a strong new number: `TevColor0 = (40, 40, 50, 0)` → `TevColor1 = (60, 70, 80, 140)`,
unanimous in 36 of 38 copies.** That is `#3C4650` at **alpha 140 = 54.9 %**, a **cool blue-grey**
(blue 20 above red) — an independent, byte-level corroboration of
`components/bottom-bar-container.md` §2's pixel finding that the bar region is cool grey with blue
running well above red. It is a **96-unit-tall band hanging below y = −65**, i.e. `top 64.25 % →
85.31 %` — the shadow the grid casts onto the bar.

`Line0–4` is ambiguous: white `(255,255,255)` in 10/38 copies, **Wii blue `(52,190,237)` in 6/38**.
Given `Line*` sits 2 units below `board*` and is 522 wide (14 wider than the 508-ish page plate),
the blue reading is plausible for the accent line — but **the vote does not settle it. Leave as
disputed.**

### 10.3 Widescreen is a texture swap — confirmed at layout level

`my_IplTop_a.brlyt` parks two panes far off-screen purely as texture carriers:

```
pic1 Picture_16     128 × 64 at (0, +517.46)   material 23 → IplTopMaskEdge16x9.tpl
pic1 ChangeTex16x9  128 × 64 at (0, +759.00)   material 17 → IplTopMask16x9.tpl
```

The on-screen `Picture_*`/`Edge_*` panes bind the **4:3** variants. `my_DiskCh_In.brlyt` does the
same (`pic1 16x9` at `(−153, +487)`), and `my_TVShade_a.brlyt` carries both a `16x9` pane
(**168 × 96**) and a `4x3` pane (**128 × 96**).

**Confirms** `technical-specs.md`'s corrected claim that widescreen is a texture swap, and gives
the mechanism: Nintendo stores the alternate textures on dummy panes inside the same layout and the
code re-points the material's texture map. **Also note the 16:9 drag ghost is 168 × 96, while the
empty-slot plate is 170 × 96** — the two 16:9 tile widths in Nintendo's own files differ by 2 units.

### 10.4 The name balloon `[Extracted — my_IplTopBalloon_a.brlyt / _BalloonInOut.brlan]`

```
canvas 640 × 480 (not 608 × 456)
RootPane
  pan1 N_Balloon   at (0, 0)
    wnd1 W_Shade   488 × 48 at (+4, −4)   ← shadow copy, offset (+4, −4)
    wnd1 W_Base    488 × 48 at ( 0,  0)
    txt1 T_Balloon 480 × 31 at ( 0,  0), font size 26.20 × 31.00, centred
```

Animation, **6 frames = 100.1 ms**, non-looping, smoothstep:

```
pane N_Balloon  RLPA ScaleX / ScaleY   f0 = 0.90 → f6 = 1.00
pane N_Balloon  RLVC PaneAlpha         f0 = 0    → f6 = 255
pane W_Shade    RLVC PaneAlpha         f0 = 0    → f6 = 255
MATERIAL W_BaseC   TevColor0 RGB 200 → 0 ;  TevColor1 RGB 200 → 255
MATERIAL W_BaseLT  TevColor0 RGB 200 → 180 ; TevColor1 RGB 200 → 255
MATERIAL T_Balloon TevColor0 RGB f1 = 128 → f6 = 96
```

- **Balloon in = 100 ms**, scale 0.9 → 1.0 + fade, played backward for out.
- The balloon is a **9-slice window pane 488 × 48** with a **hard shadow offset (+4, −4)**, and its
  fill colour *animates from flat grey 200 to its final split* — the centre going to black-on-white
  and the corner going to 180.
- **README open question #5 (is the balloon above or below the tile?) remains OPEN.** The
  `.brlan` contains **no `TranslateX` or `TranslateY` at all** — the position really is set from
  code, so this extraction cannot settle the sign.

### 10.5 Drag and drop `[Extracted — my_TV*.brlyt / .brlan]`

| Layout | Pane | Animation | Values |
|---|---|---|---|
| `my_TVShade_a.brlyt` (the floating dragged tile) | `4x3` 128 × 96 scale 0.8 (and `16x9` 168 × 96 scale 0.8) | `_Apear` | **2 frames**: PaneAlpha 0 → **210** (82.4 %) at f1 |
| | | `_Lost` | mirror |
| `my_TVMask_a.brlyt` (dims the other tiles) | `Picture_00` | `_Apear` | 2 frames, alpha step |
| `my_TVApear_a.brlyt` (the drop burst) | `Picture_00` | `_Apear` | **16 frames = 266.9 ms**, `ScaleX` 0 → 0.15 at f3 (slope +0.0214) → … a fast expanding ring |

The dragged tile is drawn at **scale 0.8** and **82 % opacity** — it shrinks and goes translucent
when you pick it up. The drag ghost also carries a `4x3_dummy` child offset `(−7.5, +7.5)`, i.e. a
**7.5-unit shadow up-left**.

---

## 11. Confidence summary

| Claim class | Confidence | Why |
|---|---|---|
| All BRLAN keyframe values, frame counts, slopes | **Very high** | 8–13 independent copies, byte-identical (or clear 8:4 / 11:2 majority) |
| All BRLYT pane names, positions, sizes, scales, rotations, hierarchy, texture bindings, wrap modes, tex-SRT | **Very high** | Theme edits provably touch only colour bytes; file sizes always identical |
| Material colours with ≥ 26/31 or ≥ 35/38 votes (`ChMask`, `Shade2`, `Num*`) | **High** | Overwhelming plurality |
| Material colours with 8–15 votes (`Clock*` `#9B9B9B`, `T_WiiMenu` `#34C0ED`, `Edge*`, pill whites) | **Good** | Clear plurality, no rival cluster, and two of them match independent pixel measurements exactly |
| `T_Day_*` material white (7/18), `Line*` white-vs-blue (10 vs 6) | **Low — flagged** | Themers recolour these most; treat as unresolved |
| Absolute screen X of `N_BtnL` / `N_BtnR` | **Low — flagged** | Values imply out-of-frustum placement; code must re-anchor |

---

## 12. What is on disk in `reference/` (all git-ignored)

| Path | Size | What |
|---|---|---|
| `reference/wsmen/` | 255 MB | `Tikilou/Wii-System-Menu-Extractor-Normalizer` clone + its `target/release/` build. Binary: `wsmen/target/release/wii_system_menu_extractor` |
| `reference/nw4r_dump.py` | 12 KB | **New.** Deep BRLYT/BRLAN → JSON parser (materials, vertex colours, txt1, exact BRLAN target IDs + interpolation). Usage: `python3 nw4r_dump.py <files…>` → writes `<file>.deep.json` |
| `reference/show.py` | 4 KB | **New.** Pretty-printer for those `.deep.json` files |
| `reference/mym/` | 135 MB | **41 `.mym` community theme packages** downloaded from `scooby7402976/wiithemer2` |
| `reference/work2/` | 61 MB | The `amongusv1` theme fully extracted — **the complete System Menu layout archive set**, decompressed, with `.json` and `.deep.json` beside every `.brlyt`/`.brlan` |
| `reference/ashpool/` | 36 MB | 25 `chanSel/cmnbtn/diskThum` archives from 11 different themes, extracted — the corpus used for the copy-comparison in §1.3 |
| `reference/synthwiive/` | 7.2 MB | `emilydaemon/synthwiive_theme` clone (independent second layout set + `mym.ini` archive map) |
| `reference/consensus/` | 1.3 MB | **11 plurality-vote reconstructions** of the key `.brlyt`/`.brlan` files + their `.deep.json` |
| `reference/brlyt-editor/` | 1.4 MB | `diddy81/Wii-Theme-Brlyt-Editor` clone (the byte-offset maps) |
| `reference/wii-ipl/` | 28 MB | the decompilation (pre-existing) |
| **Total** | **~524 MB** | |

`git status` is clean; nothing left the `reference/` tree.

A Rust toolchain was installed at `~/.cargo` (stable, minimal profile, ~380 MB) to build the tool.
Remove with `rustup self uninstall` if unwanted.

---

## 13. What is still open, and what would close it

| Open | Why still open | What would close it |
|---|---|---|
| **Balloon vertical direction** (README #5) | `my_IplTopBalloon_a_BalloonInOut.brlan` has no translate track at all — the sign is set in code, from `iplChannelObj.cpp`'s offset constants | Re-read `iplChannelObj.cpp:953–965` and the balloon offset constants against the NW4R camera convention; or one screenshot with a balloon visible |
| **`T_Day_*` ink colour** | Only 7/18 copies agree; the IA4 font's own intensity probably supplies the grey | Decode `RevoIpl_RodinNTLGPro_DB_48_IA4.brfnt` to PNG (the tool already does this — the atlas is in `reference/work2/**/board.decompressed.ash_extracted/`) and read the glyph intensity |
| **`Line0–4` white vs Wii blue** | 10 vs 6 vote split | More theme copies, or a high-res capture of the strip 2 units under `board*` |
| **Absolute bar X anchors in 4:3** | Layout values place the pills outside both frustums | `iplButton.cpp` / `buttoncoords.cpp` in `giantpune/wii-system-menu-player`, which hard-codes System Menu button screen coordinates |
| **4:3 geometry generally** (README #3) | Every layout ships both 4:3 and 16:9 textures but only one set of pane rects | Find where the code re-anchors between modes; the texture-carrier panes (§10.3) are the entry point |
| **Pre-4.3 visual history** (README #6) | These themes are all 4.x bases | Older theme bases (some `.mym` in the 518-file library are dated 2009 and target 3.x) — a dated subset could be diffed |

---

## 14. Corrections this pass makes to the existing corpus

1. **`context/README.md` §4 open question #1** — no longer open. Replace with a pointer here.
2. **`context/README.md` §4 open question #7** ("88:88 ghost-segment layer") — **refuted.** No such
   pane exists in `my_Clock_a.brlyt`.
3. **`context/README.md` §4 open question #8** ("four frames in the Empty Channel Spaces sheet") —
   **answered.** They are the four `RLTP` texture-pattern targets (§4.2).
4. **`decomp-findings.md` §7.2** — the grid's Message Board move is **283 ms of motion inside a
   333 ms slot**, not 333 ms of motion. Add the 3-frame hold.
5. **`decomp-findings.md` §12** — the Message Board **day** scroll is the corpus's one
   **non-smoothstep** easing (§9.6). The "default easing = smoothstep" rule needs that exception.
6. **`components/channel-tile.md`** — hover in/out on the highlight is **50 ms / 500 ms**, not the
   bar's 100/133. Add the 0.95→1.00 / 1.00→0.90 asymmetry.
7. **`components/bottom-bar-half-pills.md`** — add: the pills are **two different widths**
   (220.33 right, 292.50 left) and each has a **hard black drop-shadow copy at 25 % alpha, offset
   (+6, −6)**.
8. **`components/date-display.md`** — the 0.76× size ratio is confirmed as **0.749**, and the
   clock/date vertical gap is **55 layout units = 12.06 % of height**.
9. **New**: the empty slot is a **15 Hz 4-frame texture flicker on a 1-second 15-step cycle plus
   two linear UV scrolls at a 5:1 ratio** — this supersedes every prior description of the
   empty-slot "shimmer" in `visual-design.md` and `channels.md`.
