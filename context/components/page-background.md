# Page background — the striped "TV sheet"

**Question:** the main-menu backdrop looks striped — subtle alternating white/grey horizontal
lines. Is that authored art, a display-chain artifact, or a fan-recreation invention?

**Answer: authored.** Nintendo bakes the stripes into the alpha channel of the page-background
plate texture. This corrects `visual-design.md`'s claim that the striping in the reference
capture is "the capture's own horizontal scanline pattern" — an ADDENDUM marker has been added
there.

Evidence tier: **texture bytes** (highest), corroborated by capture measurement and prior art.

---

## 1. The texture: `my_TVSheet_b.tpl`

`[Measured — my_TVSheet_b.tpl]` **608 × 8, I8** (intensity → R=G=B=A). Bound as the second
texture map of the `Picture_00–04` page-plate material in `my_IplTop_a.brlyt` (512 × 288 panes
at y +79, 512 pitch — one per carousel page), and also on `BaseMask0–4`, the `Picture_05–09`
top strips and `board0–4`. Wrap: clamp-S, **repeat-T** — the 8-row pattern tiles vertically
down the plate.

**Provenance:** md5 `c911a4a6eb8a10aa206ee270eca6f81c`, byte-identical across 5 independently
sourced theme packages (amongus/work2, jaybob, castlevania, broly, monkeys). Nintendo's stock
texture, unmodified.

### 1.1 The vertical stripe (rows)

RGB is a constant 255. The pattern is entirely in **alpha**, period 4:

| Texture row | Mean alpha | Role |
|---|---|---|
| 0 | 138.8 | dim |
| **1** | **232.8** | **bright line** |
| 2, 3 | 138.8 | dim |
| 4–7 | repeats: dim, **bright**, dim, dim | |

One bright scanline in four — the same 1-in-4 family as `my_TV_d` (empty-slot gratings),
`it_BgSetUp_a` (Settings/HOME background), `diskThum/Back_a`, and `my_DialogWindow_b`. This is
the Wii Menu's house pattern, and the page backdrop carries it too.

**1 texture row = 1 layout unit = 1 EFB scanline** (the 288-tall plate shows 288÷8 = 36
repeats; see `aspect-ratio-and-overscan.md` — vertical is always 1:1). So the stripe period is
**exactly 4 stage px** in our 832×456 stage.

### 1.2 The horizontal bloom (columns)

Alpha also varies along x — a symmetric bloom centred on each page plate:

| | edge (col 0) | centre (col ~304) | shape |
|---|---|---|---|
| dim rows | 64 | 192 | smooth rise, no plateau |
| bright row | 157 | 255 | **saturates at 255 across the middle ~55%** |

This is the "soft vertical light bloom down each page's centre" that booper reconstructed by
eye with a second SVG `<pattern>` (`prior-art-booper-deepread.md` §4) — confirmed here as
genuine, and authored *in the same texture*, per page (it will travel with pages when
navigation exists).

## 2. Calibration against the reference capture

The TEV combiner that maps these alphas to final colour is not decoded (material flags
`0xb881222`; TevRegs black/black/white). Final tones are therefore calibrated against
`reference_screen.png`, our established tone ground truth.

The capture is 236 rows ≈ half of 456, so the period-4 native stripe reads as period-2:
capture-bright = (B+D)/2, capture-dim = D. Measured on the clean band above the grid
(y 4–16), de-interleaved by row parity, 20px bins:

| | capture bright / dim | native bright B / dim D |
|---|---|---|
| screen edge (x≈0) | 234.0 / 226.5 | **241.5 / 226.5** |
| screen centre (x≈200) | 243.8 / 239.0 | **248.6 / 239.0** |

- Dim rows carry most of the bloom (Δ12.5); the bright line carries less (Δ7) — consistent
  with its alpha plateauing at 255.
- Bloom profile across x is smooth and symmetric (measured bins at x=0..380 follow a
  cosine-like curve; see §4 for the encoded stops).
- Note the period-2-capture reading itself rules out interlace as the cause: 480i artifacts
  are period-2 *native*, which would alias to flat at half resolution, not to period 2.

## 3. The stripes show through the empty tiles

Cross-correlating detrended row profiles (rows 118–162 of the capture):

- empty tile vs empty tile, same rows: **peak at lag 0, r = 0.76** — in phase;
- background vs tiles: same period-2 sign pattern, weaker amplitude.

Per-slot rolling gratings are seeded to random start frames in [0, 2000) (`decomp` +
`empty-slot-noise-triangulated.md`), so two slots can never be phase-locked by their own
animation. The frame-anchored component visible *inside* tiles is the page plate's stripe
showing through — the empty-slot quad does not fully occlude the plate. This matches the
user-observed "the lines in the background line up with the lines in the channels."

**Follow-up (not this task):** our tile noise atlas is opaque, so our tiles currently carry no
frame-anchored stripe. Candidate Phase-2/4 refinement; touching it means recalibrating
`gate.spec.js`'s texture statistics, so do it deliberately.

## 4. Implementation spec (CSS, stage units)

Replace the hand-authored radial gradient on `.wii-bg` (pre-corpus taste choice) with:

```css
background-image:
  /* bloom: edge darkening, transparent centre; stops follow the measured
     cosine-ish profile. Approximation: darkens bright + dim rows equally,
     max error ~5/255 on the 1-in-4 bright line at screen edge. */
  linear-gradient(90deg,
    rgba(0,0,0,0.049) 0%,   rgba(0,0,0,0.045) 10%, rgba(0,0,0,0.038) 19%,
    rgba(0,0,0,0.022) 29%,  rgba(0,0,0,0.011) 38%, rgba(0,0,0,0.000) 48%,
    rgba(0,0,0,0.000) 52%,  rgba(0,0,0,0.011) 62%, rgba(0,0,0,0.022) 71%,
    rgba(0,0,0,0.038) 81%,  rgba(0,0,0,0.045) 90%, rgba(0,0,0,0.049) 100%),
  /* stripes: 1px bright line + 3px dim, period 4px, centre tones. */
  repeating-linear-gradient(180deg,
    #f9f9f9 0px, #f9f9f9 1px,
    #efefef 1px, #efefef 4px);
```

- Centre tones: dim `#EFEFEF` (239), bright `#F9F9F9` (249) — from §2.
- **Phase is an assumption:** the texture puts the bright line at row ≡ 1 (mod 4) of the
  *plate*, whose top edge is not the stage top; the capture cannot resolve absolute phase.
  Bright-line-first at stage top is the chosen convention. One-line change if evidence lands.
- Bloom is per-*page* on the console (each 512-pitch plate carries its own). With one static
  page it is equivalently stage-centred; when page navigation lands, move the bloom layer onto
  the page element so it slides (booper's treadmill insight, now byte-confirmed).
- Static, deterministic, no assets shipped — the texture is measured, not copied; the CSS is
  built from the numbers in this document.
