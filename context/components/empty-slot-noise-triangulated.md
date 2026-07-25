# Empty-slot "static" — triangulated correction

**Date:** 2026-07-25 · **Status:** supersedes `components/empty-slot-noise.md` §B.1.3, §B.8 and
`brlan-extraction.md` §4.2–4.3 on every point where they disagree.

**Why this document exists.** The owner has twice said our empty-slot static does not look like
the Wii Menu. Two previous passes tuned *noise parameters*. This pass found that the noise
parameters were never the problem.

---

## 0. Verdict — lead with this

**Our empty slot looks wrong for four reasons, and only one of them is about noise.**

1. **We render the wrong texture on two of our three layers.** `ChannelStatic.css` scrolls the
   *noise atlas* on its two "drift" layers. Nintendo scrolls a **completely different texture** —
   `my_TV_d.tpl`, a **16 × 16 I4 horizontal line grating, one row on / three rows off**
   `[Extracted]`. Our drift layers translate grain coherently, which is the single most
   "un-snow-like" thing you can do to noise: real snow boils in place, it never slides. Our own
   `empty-slot-noise.md` §B.3.4 says this in as many words and the implementation does it anyway.
2. **The empty tile is not a flat field — it is dominated by horizontal band structure, and we
   have none of it.** Both console captures put the *row* σ above the per-pixel grain σ:
   **1.37 : 1** in `reference_screen.png` and **1.57 : 1** in booper's asset; after subtracting the
   confirmed capture artifacts the structural ratio is **≈ 0.95 : 1**. Our implementation
   deliberately inverted that to **0.25 : 1** because `empty-slot-noise.md` §B.1.3 diagnosed the
   banding as a capture artifact. **That diagnosis was wrong** — the bands are Nintendo's: two
   rolling `my_TV_d` gratings plus the static `my_TVSpe_a` gloss ramp. We are roughly **four times
   too grain-dominated.**
3. **`.channel-inner::before` — the tile gloss — washes the top half of every empty tile to
   ≈ `#F2`.** In the reference capture, populated tiles contain pixels as dark as **21/255 inside
   the top 52 %** of the tile `[Measured]`. A `rgba(255,255,255,0.65)` overlay cannot produce a
   pixel below 166. **There is no strong white gloss on a Wii channel tile.** This single CSS rule
   does more damage to the empty slot's appearance than every noise parameter combined, and it also
   *inverts* the tile's real vertical gradient.
4. **Our grain is 2 units wide.** `GRAIN_W = 2` in `channelNoise.js:44`. Nintendo's is
   **1 × 1, square, isotropic** — now provable from the pane's texture coordinates, not inferred.

**Our contrast (`SNOW_CONTRAST = 0.047`) is essentially correct** — three independent measurements
put it at 0.048–0.067. Stop turning that knob.

**Is it "make it much more subtle and nearly still"?** Not quite, and the nuance matters:

> The empty slot should be **quieter in its noise and much louder in its bands.** The only
> fast-moving component (15 Hz grain flicker) is also the *weakest* (σ ≈ 5.5/255). The components
> that actually carry the tile's appearance are **slow** — a fine line pattern crossing one period
> every **1.67 s** and a coarse bar every **8.34 s** — and a **static** vertical gloss ramp of
> ≈ 13/255 that is over twice the grain amplitude. So: nearly-still is right about the *speed*
> and wrong about the *amplitude*. There is real, structured, visible contrast in that tile; it
> just isn't the shimmering snow we built.

**Live console footage backs all of this.** `[Measured — video]` 240 frames of 1080p60 capture show
an empty slot changing **27 × more per frame than a static control** — it genuinely animates — with
texture swaps on a strict **4-frame grid (≈15/s)**, a grating of **~12 px period drifting ~7 px/s**
(= 5.07 layout units at 2.96 units/s, against the extracted 4.8 units at 2.877 — **within 6 % and
3 %**), slots falling into **distinct phase groups**, and a whole-tile amplitude of only
**~1–1.5 % RMS**. It also settles the one thing the binaries could not: the gratings roll
**downward**, the opposite of what the NW4R sign convention predicts. §3.5.

**And booper is right to ship a still image.** Its `emptyChannel.png` is a screenshot crop, and it
contains all four real components at close to the correct amplitudes and geometry. Losing the
motion costs less than we assumed, because the motion is slow and low-amplitude. We should keep the
motion (we can, cheaply, and it is authentic) — but we should copy booper's *balance*.

---

## 1. What is new in this pass, and where it came from

The decisive material was already on disk and unread: `reference/` contains **fully extracted
`arc/timg/` texture folders** from eleven independent theme archives, plus
`reference/consensus/my_IplTop_b.brlyt.deep.json`. Three things had never been looked at:

| New evidence | Why it settles things |
|---|---|
| **`my_TV_d.tpl` and `my_TVSpe_a.tpl` decoded** | These are the two textures nobody had opened. They are **byte-identical across all 11 theme copies**, so they are Nintendo's, unmodified. |
| **`Ch0`'s `tex_coords` block** | `brlan-extraction.md` §4.1 reported the material's texture *SRT* but not the pane's per-stage **texture coordinates**. The tex-coords are what set the real on-screen scale of all three stages. Without them every scale figure in §4.2–4.3 is wrong. |
| **Nintendo's original `my_TV_c_p0..p3`** identified by plurality + cross-check | 10 of 11 themes replace the noise texture. The `starfoxzero` copy reproduces the Spriters Resource rip's statistics exactly (25.5 % @ 0, 43.2 % @ 255, σ 109.9, means 149/163/146/121) — two unrelated provenances agreeing, so that copy is Nintendo's. |

Files (git-ignored, reference only, per `docs/asset-and-code-policy.md`):
`reference/ashpool/starfoxzero_ash_chanSel.decompressed.ash_extracted/arc/timg/` ·
`reference/consensus/my_IplTop_b.brlyt.deep.json`

> ### ⚠ `my_TV_d.tpl` is an ambiguous name — check the archive
>
> There are **two unrelated files called `my_TV_d.tpl`** in the System Menu:
>
> | Archive | Size | Format | What it is |
> |---|---|---|---|
> | `chanSel` (also `cmnbtn`, `chanTtl`, `SDChansel`) | **16 × 16** | I4, 192 B | **the empty-slot line grating** — this document's subject |
> | `GCbann` | **608 × 456** | RGB565, 554 kB | the GameCube disc-channel background |
>
> `[Measured — every copy on disk]` The one that matters is the 16 × 16, and the identification is
> not by filename: **`my_IplTop_b.brlyt`'s own texture table is
> `['my_TV_c_p0.tpl', 'my_TV_d.tpl', 'my_TVSpe_a.tpl']`**, that brlyt ships inside `chanSel`, and
> its material binds index 1 to stages 1 and 2. Anyone checking this against a theme's `mym.ini`
> will find `my_TV_d.tpl` listed under `gcbann_ash_out` at 608 × 456 and conclude it has nothing to
> do with the empty slot. **That is the wrong file.**
>
> Relatedly: **`my_TVSpe_a.tpl` appears in no theme's `mym.ini` and returns zero GitHub code-search
> hits.** That is not evidence it does not exist — `mym.ini` lists only the files a theme
> *replaces*, and neither `my_TVSpe_a` nor `chanSel`'s `my_TV_d` is ever replaced (both are
> byte-identical across all 11 copies here). Themers only ever swap `my_TV_c_p0..p3`, which
> `emilydaemon/synthwiive_theme`'s `mym.ini` names **`frame01`–`frame04`** — an independent
> confirmation that the four are animation frames. `[Prior art]`

---

## 2. The empty slot, corrected — four components

`[Extracted — my_IplTop_b.brlyt, consensus deep JSON]` The full pane record, including the
`tex_coords` that were previously missing:

```
pan1 Thu    128 × 96                              ← the 4:3 slot box
  pic1 Ch0  170 × 96   material 0                 ← the noise plate
      tex_coords stage0  u −0.16 → 1.16 , v 0 → 1
      tex_coords stage1  u  0    → 1    , v 0 → 5
      tex_coords stage2  u  0    → 1    , v 0 → 0.5
      vertex colours  TL/TR (250,255,255,255)  BL/BR (255,255,255,255)
    pic1 Ch1 170 × 96  material 1                 ← the gloss ramp
      tex_coords       u  0 → 1 , v 0 → 1

material Ch0   konst0 (8,8,8,255) · TevColor0 (0,0,0,255) · TevColor1 (255,255,255,255)
  stage 0  my_TV_c_p0.tpl   repeat/clamp   SRT (0, 0,   0, 1, 1)
  stage 1  my_TV_d.tpl      clamp/repeat   SRT (0, 3.0, 0, 1, 1)
  stage 2  my_TV_d.tpl      clamp/repeat   SRT (0, 0.6, 0, 1, 1)
material Ch1   TevColor0 (0,0,0,0) · TevColor1 (0,0,0,255) · TevColor2 (0,0,0,255)
  stage 0  my_TVSpe_a.tpl   clamp/clamp    SRT (0, 0,   0, 1, 1)
```

### 2.1 Component A — the noise (`my_TV_c_p0..p3`)

`[Measured — the real TPLs]` **128 × 96, RGB5A3, greyscale (R = G = B), alpha 255 throughout.**
Exactly **16 intensity levels**, and they are `round(2n · 255/31)` for n = 0…14 plus 255 — i.e. the
art was authored as **4-bit I4** and later stored in RGB5A3. This confirms the I4 claim in
`empty-slot-noise.md` §A.3.2 from the asset itself.

Spatial autocorrelation of F0: **dx1 = 0.021, dx2 = 0.035, dy1 = 0.034, dy2 = 0.045** — pure
1-texel white noise, isotropic, no directional bias. `[Measured]`

**Per-frame level distributions (wordmark texels excluded)** — this is new and it matters, because
the four frames are *not* interchangeable:

| Frame | floor | % at floor | ceiling | % at ceiling | mid levels | % each | mean | σ |
|---|---|---|---|---|---|---|---|---|
| **F0** | 0 | 23.9 | 255 | 44.2 | 14 (16…230) | 2.28 | **152.7** | 108.9 |
| **F1** | **49** | 25.5 | 255 | 42.0 | 11 (66…230) | 2.95 | **166.9** | 89.1 |
| **F2** | 0 | 25.4 | 255 | 42.4 | 14 (16…230) | 2.30 | **148.7** | 109.2 |
| **F3** | 0 | 25.5 | **214** | 41.1 | 12 (16…197) | 2.78 | **124.0** | 91.1 |

`[Measured — my_TV_c_p0..p3.tpl]`

So **F1's black floor is lifted to 49 and F3's white ceiling is dropped to 214**, giving a
**43/255 spread in frame means**. At the composite contrast (§3.3) that is a **± 1.3/255 tile-mean
flicker at 15 Hz** riding on the grain — the "luminance breath". Our current generator makes four
statistically identical frames and therefore has no breath at all.

**On-screen scale — settled by the tex-coords.** Stage 0's u runs **−0.16 → 1.16 = 1.32 texture
widths** across the 170-unit pane, with `wrap_s = repeat` to fill the overhang. So

```
horizontal:  128 texels × 1.32 = 169.0 texels across 170 units  →  1.006 units / texel
vertical:     96 texels × 1.00 =  96.0 texels across  96 units  →  1.000 units / texel
```

> **The noise is rendered at exactly 1 layout unit per texel, square and isotropic, and it is
> never stretched.** `[Extracted + Inferred]`

The ±0.16 overscan is not decorative. In **4:3** the aperture crops `Ch0` from 170 to 128 units,
which is u ∈ [0.003, 0.997] — **exactly one untiled texture width at 1 : 1**. Nintendo picked
±0.16 so the same texture lands at native density in *both* aspect modes. That fully answers the
"is it stretched in 16:9?" question: **no, and a 170-wide variant does not exist.**

### 2.2 Component B — the fine rolling scanlines (`my_TV_d`, stage 1) — **we have nothing like this**

`[Measured — my_TV_d.tpl]` **16 × 16, I4.** Every row is constant across all 16 columns
(per-row column σ = 0.000). The pattern is a **1-row-on / 3-rows-off grating**, values {0, 255},
repeating four times down the texture. It is a **horizontal line grating**, not noise.

With stage 1's tex-coords `v: 0 → 5` (five texture repeats across 96 units):

| Quantity | Value |
|---|---|
| Texel row height on screen | 96 / (16 × 5) = **1.2 layout units** |
| Grating period | 4 texel rows = **4.8 layout units** (20 lines down the tile) |
| Duty | **25 %** — 1.2 units bright, 3.6 units dark |
| Scroll: `RLTS V_Translate` f0 = 0 → f2000 = 5.0, linear | ΔV 5.0 over a v-span of 5.0 = **96 units of travel per 33.366 s = 2.877 units/s** |
| One period passes every | **1.668 s** |
| Amplitude (bright line vs gap) | **≈ 8.5/255** |

`[Extracted]` for geometry and rate; `[Prior art — measured]` for amplitude (§3.2).

**Independently confirmed on live console footage** (§3.5). Frame analysis of 1080p60 capture
measures the dominant grating at a **~12 screen-px period drifting ~7 px/s**. At 1080p one layout
unit is 1080/456 = 2.368 px, so that is **5.07 layout units at 2.96 units/s** — against the
extracted **4.8 units at 2.877 units/s**. **Agreement within 6 % on period and 3 % on rate**, from
a source that never touched the binaries. `[Measured — video]`

### 2.3 Component C — the coarse rolling bar (`my_TV_d`, stage 2) — **we have nothing like this**

Same texture, but stage 2's tex-coords are `v: 0 → 0.5` — **half a texture repeat** across 96
units, i.e. stretched **10 ×** relative to stage 1.

| Quantity | Value |
|---|---|
| Texel row height on screen | 96 / (16 × 0.5) = **12 layout units** |
| Grating period | **48 layout units** (2 bars down the tile) |
| Duty | 25 % — a **12-unit** bar, 36-unit gap |
| Scroll: `V_Translate` f0 = 0 → f2000 = 1.0, linear | ΔV 1.0 over a v-span of 0.5 = **192 units of travel per 33.366 s = 5.754 units/s** |
| One period passes every | **8.342 s** |
| Amplitude | **≈ 7.6/255** (sign uncertain, see §7) |

**The video is neutral on this layer, not confirming.** A 48-unit period is **114 px at 1080p** —
low enough in spatial frequency that YouTube's encoder flattens it into banding, and the frame
analysis resolved only the fine grating. So stage 2's geometry and rate are `[Extracted]` (solid),
its amplitude is `[Prior art]` (one fit, weakly conditioned), and it has **no video corroboration
either way**. If a layer has to be dropped for cost, drop this one first.

> ### Correction to `brlan-extraction.md` §4.2–4.3
> That section calls track C "**slower** … exactly 1/5 the speed of track B". That is true in
> *texture* space and **backwards on screen**. Because stage 2's texture is stretched 10 × further,
> stage 2 travels **5.754 units/s vs stage 1's 2.877 — it is 2 × faster on screen**, with features
> 10 × larger. The §4.3 "web translation" (`scroll-y 6673ms` / `33366ms` on noise layers) is wrong
> on texture, scale, rate *and* ratio. `[Extracted]`

**Direction: DOWNWARD.** `[Measured — video]` Row-luminance profiles of an empty slot shift
monotonically **+0, +2, +3, +4, +5, +7, +8 px over 70 frames**, while a static control region held
at 0 px with correlation 1.000 at every step. An earlier draft of this document inferred *upward*
from the NW4R sign convention (V-translate positive → sample further down the texture); **the
footage says the opposite and the footage wins.** All the CSS in §5.2 rolls downward.

**Filtering.** GX filters these bilinearly, and at 1.2 / 12 units per texel that is a large blur
kernel. The correct on-screen model is **not** a hard square wave but a **triangle**: intensity 1 at
the bright texel centre, falling linearly to 0 at the next texel centre, flat for two texels, rising
again. Both CSS gradients in §5 are written that way. `[Inferred, well-supported]`

### 2.4 Component D — `Ch1`, the gloss ramp (`my_TVSpe_a`) — **we have nothing like this**

`[Measured — my_TVSpe_a.tpl]` **8 × 96, I8.** Per-row variation across the 8 columns is ≤ 1/255,
so it is a **pure vertical gradient**. Mapped `u: 0 → 1, v: 0 → 1` over the 170 × 96 pane, so it is
**1 : 1 vertically** and stretched flat horizontally.

Profile (intensity, top → bottom of the 96-unit plate):

```
row  0  110   ← brightest, top edge
row  4  100
row  8   69
row 12   31
row 16   12
row 19   10   ← MINIMUM, at 20 % of tile height
row 24   13
row 32   19
row 40   26
row 48   35   ← from here it is very nearly linear
row 56   46
row 64   57
row 72   69
row 80   80
row 88   91
row 95   99   ← bottom edge
```

**This is a glass-reflection profile:** a bright specular edge at the very top, a dark trough at
20 % height, then a long clean ramp brightening to the bottom.

**Does it actually draw?** The layout gives `Ch1` `TevColor0 = (0,0,0,0)`, and
`ChannelObj::createWrongThumbnail` flips exactly that register to `(0,0,0,255)` to make a corrupted
tile (`reference/wii-ipl/src/scene/channelSelect/iplChannelObj.cpp:802-810`). Read naively, alpha 0
means `Ch1` is invisible in the normal case. **Three things say otherwise:**

- A layer that existed *only* to be flipped to black would not need a hand-authored 96-row
  gradient. A 1 × 1 texture would do. Nintendo bound a gloss ramp because a gloss ramp is what it
  draws. `[Inferred]`
- For an I8 texture GX expands `I → RGBA = (I,I,I,I)`, so the texture supplies both the colour and
  the blend factor; the three black registers are simply parked. `[Inferred]`
- **It is measurable on screen.** See §3.1: the ramp's shape correlates with the measured empty-tile
  vertical profile at **r = 0.756**, with the trough landing at the right height. `[Measured]`

> **Answer to "what is `Ch1` and does it wash out the noise?"** It is a **static vertical
> glass-reflection ramp**, amplitude **≈ 13/255 peak-to-peak** — roughly **2.4 × the grain
> amplitude**. It does not wash the noise out; it **out-weighs** it as the tile's dominant visual
> feature. We are missing it entirely, and that is why our tile reads as a flat noisy rectangle
> instead of a little grey screen.

---

## 3. The three sources, cross-checked

### 3.1 `reference_screen.png` (420 × 236) — six empty tiles

Row-3 tiles at `(y 122, x 37/125/214/302)` and row-2 tiles at `(y 71, x 214/302)`; interiors
80 × 41 px. `[Measured]`

| Quantity | Value |
|---|---|
| 6-tile mean | **211.85 → `#D4D4D4`** (confirms §A.4.1 exactly) |
| Row-mean σ | **5.44** |
| Column-mean σ | **0.55** |
| Row : column | **≈ 10 : 1** |
| Per-pixel grain σ after removing row means | **2.43** (remarkably stable: 2.35–2.59 across all six tiles) |
| Vertical profile | **216.7** at the top row → trough **201.7** at ~15 % → monotonic rise to **221.5** at the bottom |

Fitting `base + a · my_TVSpe_a(v)` to the 6-tile mean profile:

```
base = 204.75 ,  a = 0.1338  →  gloss swing 13.4/255
Pearson r = 0.756 ;  residual σ 3.56 vs profile σ 5.44
```

Removing the near-Nyquist capture scanlines first (low-pass the profile to periods > 6 px, which
strips σ 1.79 of confirmed capture artifact) raises the agreement to **r = 0.930**, with the
smoothed measured profile running **217.7 at the top → 204.0 trough at 15 % → 220.5 at the bottom**.

`[Measured]` The trough position, both endpoints and the long lower ramp all land correctly. **That
is the identification of the vertical structure.**

### 3.2 `booper1/Wii-UI` — what it actually does, and it is the most useful single data point

**How booper renders an empty slot** `[Prior art — read from source at `4301c7e`]`:

- `src/app/constants/channels.data.ts:172-179` defines `EMPTY_CHANNEL` with
  `preview: { type: PreviewType.Img, imgPath: 'assets/emptyChannel.png' }`.
- `channel.html` turns any `Img` preview into an SVG `<pattern>` containing one `<image>` at
  `preserveAspectRatio="xMidYMid slice"`, used as the `fill` of the tile silhouette `<use>`.
- The foreground SVG — which carries the dimmer — is skipped entirely for image previews
  (`@if (!isImgPreview(channel().preview))`).
- `src/index.html:11` preloads it.

> **So an empty slot in booper is: the tile path, filled with one static PNG. No animation, no
> second layer, no CSS beyond the silhouette. Nothing else.** `[Prior art]`

**And the asset is a genuine third measurement of the console.** `emptyChannel.png` is 366 × 192,
RGBA, alpha uniformly 255, **exactly greyscale** (max |R−G| = 0, max |G−B| = 0):

| Quantity | Value |
|---|---|
| Mean | **208.69** |
| Total σ | 8.80, range 180–234 |
| Row-mean σ | **7.42** |
| Column-mean σ | **0.57** |
| Row : column | **13 : 1** |
| Per-pixel residual σ after row-mean removal | **4.73** |
| Residual autocorrelation dx1 | **0.072** → 1-pixel white noise |

`[Prior art — measured]` **Do not copy this file** (`docs/asset-and-code-policy.md`; booper is
unlicensed and the asset is screenshot-derived Nintendo material). These are measurements only.

**It independently reproduces Nintendo's grating geometry.** FFT of its row profile:

| Harmonic | Period | Amplitude |
|---|---|---|
| k = 17 | 11.29 px | **4.45/255** |
| k = 34 | 5.65 px | **2.88/255** |
| k = 1–3 | 64–192 px | 8.32/255 combined |

Two independent confirmations fall out:

1. **Scale.** If k = 17 is Nintendo's **4.8-unit** fine grating, the image resolves to
   **2.353 px per layout unit**, i.e. a crop of **155.5 × 81.6 layout units** out of the 170 × 96
   plate — a uniform-scale inset of ~91 % × 85 %, exactly what you get cropping inside the tile's
   rounded aperture. The aspect check closes: 155.5/81.6 = 1.906 = 366/192. **The crop geometry is
   self-consistent only if the band period really is 4.8 layout units.** `[Prior art + Extracted]`
2. **Duty cycle.** For a square wave of duty *d* the harmonic amplitude ratio is
   `|sin(πd)/sin(2πd)| · 2`; at d = 0.25 that predicts **1.41**. Measured **4.45 / 2.88 = 1.54**.
   **Confirms the 1-on/3-off, 25 %-duty grating from a completely independent source.**
   `[Prior art + Extracted]`

Least-squares decomposition of booper's row profile against the three known Nintendo components,
solving only for amplitudes and the two grating phases:

```
base + a·my_TVSpe_a(v) + b·grating(4.8u, 25%) + c·grating(48u, 25%)

  base   = 203.71
  gloss  =   9.0 /255 swing          (reference_screen said 13.4)
  fine   =   8.46/255 step
  coarse =  -7.59/255 step
  residual σ 5.19 of profile σ 7.42  →  model explains 51 % of the row variance
```

`[Prior art + Extracted, jointly]` Three free amplitudes and two phases explaining half the variance
of an independent screenshot, using geometry derived entirely from the binaries, is a strong result.

**Does booper look better? Yes — and it is instructive why.** It has no animation, no procedural
noise and no research. It looks right because a screenshot necessarily contains **all four
components at the right relative amplitudes**. Our version has one component, at roughly the right
contrast, plus two fabricated ones. **Balance beats fidelity-of-a-single-component.**

### 3.3 Contrast, triangulated three ways

| Method | Source | k |
|---|---|---|
| Residual grain σ 4.73 ÷ texture field σ 99.6 | booper's screenshot `[Prior art]` | **0.048** |
| Grain σ 2.43 × √4.98 (downscale) ÷ 99.6 | `reference_screen.png` `[Measured]` | **0.055** |
| Wordmark ink −9.48/255 ÷ texture ink Δ −142.7 | `reference_screen.png` `[Measured]` | **0.067** |
| TEV `konst0 = (8,8,8)` → 8/255 | `my_IplTop_b.brlyt` `[Extracted]` | ≥ 0.031 |
| Texture σ ±3/255 in 1080p60 footage ÷ 99.6 | YouTube capture `[Measured — video]` | ≥ 0.030 — **lower bound only**, the encoder denoises exactly this signal |

**Recommended `SNOW_CONTRAST = 0.055.**` The konst is a floor, not the answer — a single GX TEV
output-scale doubling bridges 0.031 → 0.063, and we cannot read the stage ops from the parser. The
three pixel measurements bracket 0.048–0.067 and their mean is 0.057. **Our current 0.047 is inside
the bracket; this is not our bug.** `[Measured, governs] > [Extracted, consistent]`

### 3.4 The wordmark, re-measured from the real texture

`[Measured]` Isolating it from the 4-frame mean (5 × 5 box filter, threshold < 60) resolves a clean
"Wii":

| Quantity | Value | vs our implementation |
|---|---|---|
| Bounding box | **40 × 19 texels** | — |
| Width on screen | 40 × 1.006 = **40 units = 23.5 % of the 170-unit plate** | we use **36 %** — **53 % too wide** |
| Height | **19 units = 19.8 %** | — |
| Centroid | texel (60.5, 49.4) → **3.5 units LEFT of centre, 1.4 units BELOW centre** | we centre it exactly |
| Ink depth on screen | **−9.5/255** ⇒ black at **opacity 0.045** over `#D4D4D4` | we use **0.014** — **3 × too faint** |
| Visibility | −9.5 against per-tile grain σ 5.4 = **1.75 σ** — faintly but genuinely legible in a single tile | our note "should not be legible" is wrong |

Ink depth per frame (F0 −148.2, F1 −160.5, F2 −142.2, F3 −119.9) — the wordmark is baked into the
noise texture and therefore flickers with it.

---

### 3.5 Live console footage and community memory — source 3, direct

`[Measured — video]` 240 consecutive frames extracted from 1080p60 capture of a real Wii Menu with
six empty slots (<https://www.youtube.com/watch?v=ppCjOIulp-M>, vWii, YouTube-re-encoded ~2 Mb/s).

**It moves — but barely.**

| Region | spatial σ | temporal σ / px | mean abs frame-to-frame Δ |
|---|---|---|---|
| **empty slot interior** | 2.99 | **1.995** | **0.276** |
| UI background (control) | 18.40 | 0.438 | 0.010 |
| populated tile (control) | 40.38 | 1.411 | 0.094 |

The empty slot changes **~27 × more per frame than a genuinely static region** — it is
unambiguously animated. But the amplitude is tiny: base **206/255**, texture σ **±3/255**, peak
frame-to-frame Δ **1.8/255** — roughly **1–1.5 % RMS**. Treat these as a **lower bound**: YouTube's
encoder denoises high-frequency grain aggressively, which is exactly the signal being measured. The
direction is what matters, and it agrees with §3.3: a light-grey tile with a barely-perceptible live
quality, not visible snow.

**Three structural confirmations:**

| Finding | Video | This document |
|---|---|---|
| Texture swaps land on a strict **4-frame grid**, ≈ **15 swaps/s**, cycle ≈ 0.267 s | `[Measured — video]` | RLTP: one swap every 4 frames = **14.985 Hz** `[Extracted]` |
| Fine grating: **~12 px period drifting ~7 px/s** at 1080p = **5.07 units at 2.96 units/s** | `[Measured — video]` | **4.8 units at 2.877 units/s** `[Extracted]` — within 6 % / 3 % |
| Five empty slots swap on the same 4-frame grid but fall into **two distinct phase groups** (within-group r = +0.60…+0.77, between-group ≈ 0.00) | `[Measured — video]` | `getRndm()->get_u16() % 2000` per slot `[Decomp]` |

The contrast-boosted crop (`yt_empty_slot_contrast_x14.png`) shows **both** the horizontal scanline
banding **and** a broad vertical gradient — independent visual corroboration of §2.2 and §2.4 on the
real console rather than on a texture rip.

**Community memory falls on "static", not "plain grey".** Every first-hand reference found names it
static or animated; none describe the slots as flat grey:

- r/wii, *"is this a beta wii static channel, or is it not?"* — *"i found this on a sprite resource
  page and **it doesn't look like the static channel on my wii**"*. The posted image correlates
  **1.000** with the Spriters sheet's first tile. This is the most useful quote in the set: the
  community calls it "the static channel" **and** confirms that the raw texture looks far harsher
  than the console does — which is precisely the 5 % composite factor.
  <https://old.reddit.com/r/wii/comments/mydnfq/is_this_a_beta_wii_static_channel_or_is_it_not/>
- r/wii, asking for *"**a GIF of the 'static' no channel placeholder**"* — i.e. remembered as moving.
  <https://old.reddit.com/r/wii/comments/1693xnf/does_anyone_have_wii_menu_assets/>
- r/wiiu — *"**tv static (similar to that on loading channels on the wii menu)**"*.
  <https://old.reddit.com/r/wiiu/comments/303xfo/was_there_an_update_or_something_new_icon/>

**Caveat on the sample.** People who post about the empty slots are people who noticed them, so the
community sample is self-selecting. The frame measurements above are the better evidence for what a
casual viewer perceives, and they say: **near-flat grey, with real motion present at ~1 % contrast.**

**Two independent recreations corroborate the cadence.** `andrewplus/Wii.JS` cycles a 3-frame blank
channel spritesheet with `animation: play 0.3s steps(3) infinite` — within 12 % of the measured
0.267 s. `wiidev/usbloadergx` names its replica class **`StaticFrame`** and loads
`my_IplTop_b.brlyt` + `.brlan` with an explicit loop. `[Prior art]`

## 4. Direct answers to the five questions

**Q1 — perceptible motion, or essentially still?**
**Both, on different timescales, and the fast one is the weak one.** Live footage settles it: an
empty slot changes **27 × more per frame than a static region** — it genuinely animates — at a
whole-tile amplitude of only **~1–1.5 % RMS** (§3.5). The 15 Hz grain flicker is
σ ≈ 5.5/255 (≈ 2 % RMS) — at 480i on a CRT that registers as "the surface is alive", not as flicker.
The *perceptible* motion is slow: a fine line every **1.67 s**, a coarse bar every **8.34 s**. That
reconciles the "nobody remembers it moving" memory with "Nintendo authored four frames plus two
scrolls": they authored a **rolling analog TV artefact**, not snow, and the snow is the garnish.
Practically: **cut the apparent motion energy sharply, add slow rolling structure.**

**Q2 — what is `Ch1`, and does it wash out the noise?**
A static **vertical glass-reflection ramp** (`my_TVSpe_a`, 8 × 96 I8): bright at the top edge,
trough at 20 % height, linear rise to the bottom. **≈ 13/255 peak-to-peak, ~2.4 × the grain
amplitude.** It does not wash the noise out — it dominates the tile's read. Confirmed against the
capture at r = 0.756. **§2.4, §3.1.**

**Q3 — is our grain the right size?**
**The frame size is right; the grain within it is not.** Nintendo renders at **1.006 units per texel
horizontally, 1.000 vertically — square and isotropic — in both 4:3 and 16:9**, proved by the
`tex_coords` (u −0.16 → 1.16 over 170 units). Nothing is stretched and no 170-wide variant exists.
Our `FRAME_W = 170, FRAME_H = 96` is correct. Our **`GRAIN_W = 2` is wrong** — it makes the grain
2 units wide and anisotropic where Nintendo's is 1 × 1. Set it to 1. **§2.1.**

**Q4 — is our contrast right?**
**Yes, near enough.** Measured 0.048 / 0.055 / 0.067 from three independent routes. The konst
(8,8,8) is a floor at 0.031, not the governing number, because we cannot read the TEV stage ops.
Move 0.047 → **0.055** and stop. **§3.3.**

**Q5 — what does booper do, and does it look better?**
One static screenshot-derived PNG as an SVG pattern fill. **No animation whatsoever.** And yes, it
looks better than ours — because it carries all four components in the right proportion. **The
lesson is not "go static"; it is "get the balance right", and the balance is band-dominated.**
**§3.2.**

---

## 5. Corrected spec

All lengths in layout units (1 unit = 1 CSS px inside the 832 × 456 stage). The noise plate is
170 × 96 centred in the cell; the visible aperture is 160 × 88, so the plate is cropped 5 units each
side and 4 units top and bottom.

| # | Layer (bottom → top) | Spec | Source |
|---|---|---|---|
| 0+4 | **Base + `Ch1` gloss ramp** | vertical ramp, **not** a flat fill: `#DA` (218) at the top edge → `#CF` (207) trough at ~20 % of the plate → smooth rise to `#DA` (218) at the bottom, mean exactly **`#D4D4D4`**. Shape is `my_TVSpe_a` verbatim (16 samples, piecewise-linear, max error 0.93/255); swing **13/255**. **Baked into the noise atlas per row**, not a CSS gradient — see §5.2. | `[Measured]` §3.1, §2.4 |
| 1 | **Noise flicker** | 4 frames at **160 × 88** (the visible aperture, 1 texel = 1 layout unit), **1 × 1 square grain**, 16-level I4 grid, per-frame clip table (§2.1), contrast **0.055**, R = G = B. Order **`0,1,2,3,0,2,1,0,3,1,2,0,1,2,3`**, one swap every **66.73 ms**, loop **1001 ms**. | `[Extracted]` + `[Measured]` |
| 2 | **Fine scanline roll** | horizontal grating, period **4.8 units**, triangular (bilinear) profile peaking over 1.2 units, step **8.5/255**, scrolling **downward**, one period per **1668 ms**, linear. | `[Extracted]` §2.2 + `[Prior art]` amplitude |
| 3 | **Coarse bar roll** | horizontal grating, period **48 units**, triangular profile peaking over 12 units, step **7.5/255**, scrolling **downward**, one period per **8342 ms**, linear. | `[Extracted]` §2.3 + `[Prior art]` amplitude |
| 5 | **Wordmark** | "Wii", **40 × 19 layout units** = 23.5 % × 19.8 % of the 170 × 96 plate, i.e. **25 % × 21.6 % of the 160 × 88 aperture element**. Centre offset **−3.5 units X, +1.4 units Y**. Black at **opacity 0.045**. | `[Measured]` §3.4 |
| — | **Per-slot phase** | negative `animation-delay` on layers 2 and 3, seeded, spread over the **33366 ms** master loop. Mirrors `getRndm()->get_u16() % 2000` (`iplChannelObj.cpp:817`). | `[Decomp]` + `[Extracted]` |
| — | **DELETE** | the two noise-atlas "drift" layers; `ROW_DC`; `GRAIN_W = 2`; `.channel-inner::before` at 0.65 alpha. | this document |

(The plate is 170 × 96 but the aperture shows 160 × 88 of it. Generating the atlas at aperture size keeps 1 texel = 1 layout unit; generating at plate size and letting CSS fit it to the element — which the current build does — squashes the grain 6 % horizontally and 9 % vertically.)

### 5.1 `src/components/channelNoise.js` — replacement

```js
/**
 * Shared TV-snow atlas for empty channel slots.
 *
 * Every constant here is measured from Nintendo's own my_TV_c_p0..p3.tpl
 * (128x96 RGB5A3, 16-level I4 art) or read out of my_IplTop_b.brlyt.
 * See context/components/empty-slot-noise-triangulated.md.
 */

/**
 * 170x96 is the widescreen noise plate. Stage 0's tex-coords run u -0.16 -> 1.16
 * across it, so 128 texels x 1.32 = 169.0 texels land across 170 units: the
 * texture renders at 1.006 units per texel horizontally and 1.000 vertically.
 * Square, isotropic, never stretched -- in 4:3 the aperture crops to exactly one
 * untiled texture width. That is why the grain is 1x1 and not 2x1.
 */
const FRAME_W = 160       // the VISIBLE aperture, not the 170-wide plate
const FRAME_H = 88        // ditto: plate rows 4..92 of 96
const PLATE_H = 96        // the full Ch0/Ch1 plate, for sampling the ramp
const APERTURE_TOP = 4    // where the aperture starts within the plate
const FRAMES = 4
const COLS = 2            // atlas 2 apertures wide -> per-tile crop offsets
/**
 * 212 = #D4D4D4, the measured mean of six empty tiles in reference_screen.png.
 * Minus 4, because the two grating overlays each contribute 0.25 x their peak on
 * average (a triangular profile of half-width period/4). Without this the
 * composite lands at 216 and the whole tile reads too bright.
 */
const BASE = 208          // = 212 - 0.25 * (8.5 + 7.5); see SCAN_*_STEP below
const SEED = 0x57ee7

/**
 * The Ch1 gloss ramp (my_TVSpe_a, 8x96 I8), 16 samples of its 96-row intensity
 * profile, normalised over its measured 10..110 range. Bright specular edge at
 * the top, trough at 20% of the plate, near-linear rise to the bottom.
 * Baked into the atlas rather than layered under it, because a translucent
 * overlay's contribution depends on what is beneath it and this must not.
 */
const CH1_RAMP = [
  1.000, 0.744, 0.173, 0.000, 0.040, 0.091, 0.149, 0.215,
  0.290, 0.372, 0.466, 0.560, 0.657, 0.739, 0.821, 0.895,
]
const CH1_SWING = 13       // /255, least-squares fit vs reference_screen.png
const CH1_MEAN = 0.3821    // mean of the ramp over plate rows 4..92

/**
 * Sample the ramp at plate row r, returning a signed offset in /255 about the
 * tile mean. Piecewise-linear over the 16 samples; max reconstruction error vs
 * the real 96-row texture is 0.93/255, well under the grain floor.
 */
function ch1(r) {
  const t = (r / (PLATE_H - 1)) * (CH1_RAMP.length - 1)
  const i = Math.min(CH1_RAMP.length - 2, t | 0)
  const v = CH1_RAMP[i] + (CH1_RAMP[i + 1] - CH1_RAMP[i]) * (t - i)
  return CH1_SWING * (v - CH1_MEAN)
}

/**
 * Composite contrast. Triangulated three ways:
 *   0.048  booper's screenshot-derived texture, residual grain sigma / texture sigma
 *   0.055  reference_screen.png grain sigma, corrected for 4.98x downscale
 *   0.067  reference_screen.png wordmark ink depth / texture ink depth
 * The layout's TEV konst0 = (8,8,8) implies >= 0.031; it is a floor, not the
 * answer, because the TEV stage ops are not recoverable from the brlyt parser.
 */
export const SNOW_CONTRAST = 0.055

/**
 * The 16-level I4 grid, verbatim: round(2n * 255 / 31) for n = 0..14, then 255.
 * (The art is 4-bit; RGB5A3 storage is what the shipped TPL happens to use.)
 */
const LEVELS = [0, 16, 33, 49, 66, 82, 99, 115, 132, 148, 165, 181, 197, 214, 230, 255]

/**
 * Per-frame clipped-Gaussian parameters, measured from the four real textures
 * with the wordmark texels excluded. The four frames are NOT interchangeable:
 * F1's black floor is lifted to level 3 (49) and F3's white ceiling is dropped
 * to level 13 (214), which is what produces the 43/255 spread in frame means
 * (152.7 / 166.9 / 148.7 / 124.0) and hence the ~1.3/255 luminance breath.
 *
 *   [floorIndex, ceilIndex, pFloor, pCeil]
 */
const FRAME_SPEC = [
  [0, 15, 0.239, 0.442], // F0  mean 152.7  sigma 108.9
  [3, 15, 0.255, 0.420], // F1  mean 166.9  sigma  89.1   floor lifted to 49
  [0, 15, 0.254, 0.424], // F2  mean 148.7  sigma 109.2
  [0, 13, 0.255, 0.411], // F3  mean 124.0  sigma  91.1   ceiling dropped to 214
]

/**
 * Nintendo's RLTP order, verbatim. 15 keys, one swap every 4 console frames
 * (66.73ms), so the grain repeats every 1.001s. Consecutive frames are never
 * equal, frame 3 is rarer, and the transitions 1->3 and 3->2 never occur.
 */
export const FLICKER_SEQUENCE = [0, 1, 2, 3, 0, 2, 1, 0, 3, 1, 2, 0, 1, 2, 3]
export const FLICKER_DURATION_MS = 1001

/**
 * The two my_TV_d gratings. NOT noise scrolls -- my_TV_d is a 16x16 I4
 * horizontal line grating, one row on / three off, and each stage maps it at a
 * different scale via the pane's tex-coords (v 0->5 and v 0->0.5).
 *
 *   stage 1: period  4.8 units, travels  96 units / 33.366s -> 1668ms per period
 *   stage 2: period 48   units, travels 192 units / 33.366s -> 8342ms per period
 *
 * Note stage 2 is TWICE as fast on screen as stage 1, not 1/5 the speed --
 * brlan-extraction.md 4.3 read the rates in texture space without the tex-coords.
 */
export const SCAN_FINE_PERIOD_U = 4.8
export const SCAN_FINE_ROLL_MS = 1668
export const SCAN_FINE_STEP = 8.5        // /255, fitted to booper's screenshot
export const SCAN_COARSE_PERIOD_U = 48
export const SCAN_COARSE_ROLL_MS = 8342
export const SCAN_COARSE_STEP = 7.5      // /255
export const MASTER_LOOP_MS = 33366

function mulberry32(a) {
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

let atlasUrl = null

export function getNoiseAtlas() {
  if (atlasUrl) return atlasUrl

  const W = FRAME_W * COLS
  const H = FRAME_H * FRAMES
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  const img = ctx.createImageData(W, H)
  const px = new Uint32Array(img.data.buffer)
  const rnd = mulberry32(SEED)

  for (let f = 0; f < FRAMES; f++) {
    const [lo, hi, pLo, pHi] = FRAME_SPEC[f]
    const nMid = hi - lo - 1
    // Mean of this frame's field, so the noise is composited about its own mean
    // and the frame-to-frame mean shift survives as the luminance breath.
    const mean =
      pLo * LEVELS[lo] +
      pHi * LEVELS[hi] +
      ((1 - pLo - pHi) / nMid) * LEVELS.slice(lo + 1, hi).reduce((a, b) => a + b, 0)

    for (let y = 0; y < FRAME_H; y++) {
      const row = (f * FRAME_H + y) * W
      // The static Ch1 gloss ramp, baked in per row. It is 2.4x the grain
      // amplitude and it is the tile's dominant visual feature.
      const rowBase = BASE + ch1(y + APERTURE_TOP)

      for (let x = 0; x < W; x++) {
        const u = rnd()
        let n
        if (u < pLo) n = LEVELS[lo]
        else if (u >= 1 - pHi) n = LEVELS[hi]
        else n = LEVELS[lo + 1 + ((rnd() * nMid) | 0)]

        // GRAIN IS 1x1. No GRAIN_W, no ROW_DC. The texture's own autocorrelation
        // is dx1 = 0.021 / dy1 = 0.034 -- isotropic 1-texel white noise. Every
        // bit of horizontal structure on screen comes from the Ch1 ramp (baked
        // in above) and the two my_TV_d gratings (separate layers), never from
        // the noise itself.
        let v = rowBase + SNOW_CONTRAST * (n - mean)
        v = v < 0 ? 0 : v > 255 ? 255 : v | 0
        px[row + x] = 0xff000000 | (v << 16) | (v << 8) | v   // opaque, R=G=B
      }
    }
  }
  ctx.putImageData(img, 0, 0)

  atlasUrl = canvas.toDataURL('image/png')
  return atlasUrl
}

/**
 * Frames are the 160x88 VISIBLE aperture at exactly 1 texel per layout unit, so
 * the CSS never rescales the grain. An earlier revision used 170x96 frames on a
 * 160x88 element, which squashed the grain 6% horizontally and 9% vertically.
 */
export const NOISE_GEOMETRY = { FRAME_W, FRAME_H, FRAMES, COLS }

/**
 * Per-slot decorrelation. The console seeds each empty slot with
 * `System::getRndm()->get_u16() % 2000` (iplChannelObj.cpp:817) -- a random
 * frame into the 2000-frame master loop. Since the flicker is only 1s long and
 * looks identical at any phase, what that actually randomises is the two
 * GRATING phases, so that is where the delay goes.
 */
export function tileSeedVars(index) {
  const rnd = mulberry32(SEED ^ ((index + 1) * 0x9e3779b9))
  const phase = rnd()
  return {
    '--scan-fine-delay': `${(-phase * SCAN_FINE_ROLL_MS).toFixed(0)}ms`,
    '--scan-coarse-delay': `${(-rnd() * SCAN_COARSE_ROLL_MS).toFixed(0)}ms`,
    '--snow-x': `${(rnd() * 100).toFixed(2)}%`,
  }
}
```

### 5.2 `src/components/ChannelStatic.css` — replacement

```css
/**
 * Empty-slot appearance.
 *
 * Four superimposed components, all extracted or measured -- see
 * context/components/empty-slot-noise-triangulated.md:
 *
 *   0  base + Ch1 gloss ramp   my_TVSpe_a, 8x96 I8, static, 13/255 swing
 *   1  noise flicker           my_TV_c_p0..p3, 4 frames, 15Hz, 1x1 grain
 *   2  fine scanline roll      my_TV_d @ 4.8u period, 1668ms/period
 *   3  coarse bar roll         my_TV_d @ 48u  period, 8342ms/period
 *
 * The band structure (layers 0, 2, 3) roughly MATCHES the per-pixel grain in
 * sigma (~0.95:1 structural; 1.4-1.6:1 in raw screenshots, which also carry
 * capture scanlines). An earlier revision drove that ratio down to 0.25:1 on the
 * theory that all the banding was a capture artifact. It is not -- it is
 * my_TV_d and my_TVSpe_a.
 */

.channel-static {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;

  /* Layer 0 (the base + Ch1 gloss ramp) is BAKED INTO THE ATLAS, per row, in
     channelNoise.js. It is not a CSS gradient here, because a translucent
     gradient's contribution depends on what is under it and the ramp must not.
     Baking also means the flicker layer stays opaque and needs no blend mode. */
}

/* Layer 1 -- the flicker. Four noise frames on Nintendo's exact RLTP order.
   The atlas is 2 apertures wide x 4 frames tall, each frame 160x88 = exactly the
   visible aperture, so background-size: 200% 400% resolves to 1 atlas texel per
   layout unit and the grain is never rescaled. background-position-x gives each
   tile a fixed crop, so a frozen screenshot still shows a decorrelated grid. */
.channel-static__flicker {
  position: absolute;
  inset: 0;
  background-size: 200% 400%;
  background-repeat: repeat;
  background-position-x: var(--snow-x, 0%);
  image-rendering: pixelated;
  animation: snow-flicker 1001ms steps(1, end) infinite;
}

/* Layers 2 and 3 -- the my_TV_d gratings.
   Bilinear filtering at 1.2 and 12 units per texel turns the 1-on/3-off square
   wave into a TRIANGLE: peak at the bright texel centre, linear fall to zero at
   the next texel centre, flat for two texels, rise again. Hence the four stops.
   Both are extended one period beyond the box and translated, so the roll is a
   compositor transform rather than a repaint. */
.channel-static__scan-fine,
.channel-static__scan-coarse {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;                 /* height overhangs BELOW; the roll goes downward */
  pointer-events: none;
  will-change: transform;
}

.channel-static__scan-fine {
  height: calc(100% + 4.8px);          /* one 4.8-unit period of overhang */
  background: repeating-linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.19) 0px,     /* 8.5/255 step: 8.5 / (255 - 210) */
    rgba(255, 255, 255, 0) 1.2px,
    rgba(255, 255, 255, 0) 3.6px,
    rgba(255, 255, 255, 0.19) 4.8px
  );
  animation: scan-roll-fine 1668ms linear infinite;
  animation-delay: var(--scan-fine-delay, 0ms);
}

.channel-static__scan-coarse {
  height: calc(100% + 48px);           /* one 48-unit period of overhang */
  background: repeating-linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.17) 0px,     /* 7.5/255 step */
    rgba(255, 255, 255, 0) 12px,
    rgba(255, 255, 255, 0) 36px,
    rgba(255, 255, 255, 0.17) 48px
  );
  animation: scan-roll-coarse 8342ms linear infinite;
  animation-delay: var(--scan-coarse-delay, 0ms);
}

/* Both gratings roll DOWNWARD -- measured off 1080p60 console footage, where an
   empty slot's row profile shifts +0,+2,+3,+4,+5,+7,+8 px over 70 frames while a
   static control holds at 0 px with correlation 1.000. (An earlier draft rolled
   these upward, inferred from the NW4R V-translate sign convention. The footage
   says otherwise.) The layers extend one period BELOW the box, so translating
   down never exposes a gap; .channel-static clips the overhang. */
@keyframes scan-roll-fine {
  from { transform: translateY(-4.8px); }
  to   { transform: translateY(0); }
}
@keyframes scan-roll-coarse {
  from { transform: translateY(-48px); }
  to   { transform: translateY(0); }
}

/* Nintendo's verbatim RLTP order: 0,1,2,3,0,2,1,0,3,1,2,0,1,2,3.
   Deliberately not a round-robin -- consecutive frames are never equal, frame 3
   is rarer, and the transitions 1->3 and 3->2 never occur. */
@keyframes snow-flicker {
    0.0000% { background-position-y: 0%; }
    6.6667% { background-position-y: 33.3333%; }
   13.3333% { background-position-y: 66.6667%; }
   20.0000% { background-position-y: 100%; }
   26.6667% { background-position-y: 0%; }
   33.3333% { background-position-y: 66.6667%; }
   40.0000% { background-position-y: 33.3333%; }
   46.6667% { background-position-y: 0%; }
   53.3333% { background-position-y: 100%; }
   60.0000% { background-position-y: 33.3333%; }
   66.6667% { background-position-y: 66.6667%; }
   73.3333% { background-position-y: 0%; }
   80.0000% { background-position-y: 33.3333%; }
   86.6667% { background-position-y: 66.6667%; }
   93.3333% { background-position-y: 100%; }
  100%      { background-position-y: 0%; }
}

/* Freeze everything. WCAG 2.2.2 / 2.3.1. We do NOT dim: this build already
   renders at the console's measured contrast. */
@media (prefers-reduced-motion: reduce) {
  .channel-static__flicker,
  .channel-static__scan-fine,
  .channel-static__scan-coarse {
    animation: none;
  }
}

/* The "Wii" wordmark, baked into Nintendo's noise texture and reproduced here as
   a separate layer. Measured from the 4-frame mean: 40 x 19 texels = 23.5% x
   19.8% of the 170x96 plate -- which is 25% x 21.6% of the 160x88 APERTURE this
   element measures. Centroid 3.5 units left of and 1.4 units below the plate
   centre; ink depth -9.5/255 over #D4D4D4 => opacity 0.045. That is 1.75x
   the per-tile grain sigma, so it IS faintly legible in a single tile -- the
   previous 0.014 was three times too faint and 36% width was 53% too wide. */
.wii-wordmark {
  position: absolute;
  left: calc(50% - 3.5px);
  top: calc(50% + 1.4px);
  width: 25%;          /* 40 of the aperture's 160 units */
  height: auto;
  transform: translate(-50%, -50%);
  color: #000;
  opacity: 0.045;
  pointer-events: none;
  z-index: 1;
}
```

**Why the ramp is baked in rather than layered.** A translucent CSS gradient contributes
`alpha × (overlayColour − base)`, so its on-screen amplitude depends on what is underneath it.
Baking the ramp into the atlas per row makes the flicker layer opaque and exact, removes any
`mix-blend-mode` dependency, and costs nothing (the atlas is built once at module init). The two
gratings *are* translucent overlays, but at ±8/255 over a base that only varies 207–218 their
amplitude error is under 3 %, which is below the grain floor.

### 5.3 `src/components/ChannelStatic.jsx` — layer list

Replace the three `flicker / drift-fast / drift-slow` divs with:

```jsx
<div className="channel-static" aria-hidden="true">
  <div className="channel-static__flicker"     style={{ ...base, ...frozen }} />
  <div className="channel-static__scan-fine"   style={vars} />
  <div className="channel-static__scan-coarse" style={vars} />
</div>
```

The gratings take no `backgroundImage` — they are pure CSS gradients. Only the flicker needs the
atlas. Under `frame != null` the gratings should also get `animation: 'none'`.

### 5.4 `src/components/WiiWordmark.jsx`

The SVG paths are fine (they are our own drawing, per policy). Only the CSS box changes, in §5.2.
The `viewBox="0 0 46 24"` gives 1.917 : 1; the measured wordmark is 40 : 19 = **2.105 : 1**, so
widen the viewBox to `0 0 46 21.9` (or re-proportion the glyphs) so the aspect matches.

### 5.5 `src/components/Channel.css` — the biggest single fix

```css
/* WAS -- unsupportable:
     .channel-inner::before { height: 52%;
       background: linear-gradient(180deg, rgba(255,255,255,0.65), rgba(255,255,255,0.1)); } */
```

In `reference_screen.png`, populated tiles contain pixels as dark as **21/255 and 22/255 inside the
top 52 %** of the tile, and **91.5 % / 92.4 %** of the pixels in that region are below 166.
A 0.65-alpha white overlay makes 166 the *floor*. **`[Measured]` — the layer as written cannot
exist on a Wii tile.**

The Wii Menu's system layout adds **no gloss to a channel tile**; each channel's own banner art
(`icon.brlyt` in its archive) draws its own highlight, which is why populated tiles look glossy and
empty ones do not. **Remove `.channel-inner::before` from empty slots entirely** — the `Ch1` ramp in
§5.2 layer 0 *is* the empty slot's gloss, and it is a fifth of the strength and the opposite shape.
If a gloss is wanted on populated tiles, it belongs on the tile *content*, not on `.channel-inner`.

Also: `.channel-inner { background: #d8dadc }` is 216/218/220 and slightly blue. Measured empty-tile
mean is **`#D4D4D4`**, neutral (every empty-tile pixel in the capture is exactly R = G = B). The
`#D4D4D4` gradient in §5.2 supersedes it for empty slots.

---

## 6. Change list, ranked by visual impact

| # | Change | From | To | Source |
|---|---|---|---|---|
| 1 | **Remove the 0.65 white gloss over empty tiles** | `::before`, top 52 %, α 0.65 → 0.1 | none; `Ch1` ramp instead | `[Measured]` §5.5 |
| 2 | **Replace both "drift" layers** | noise atlas scrolled at 0.30 / 0.18 opacity | two `my_TV_d` gratings: 4.8 u @ 1668 ms and 48 u @ 8342 ms | `[Extracted]` §2.2–2.3 |
| 3 | **Add the `Ch1` gloss ramp** | absent | vertical ramp, 13/255 swing, trough at 15 % | `[Measured]` §2.4 |
| 4 | **Grain 2 × 1 → 1 × 1**, and atlas frames sized to the aperture | `GRAIN_W = 2`; 170 × 96 frames fitted to a 160 × 88 box | `GRAIN_W` deleted; frames **160 × 88**, 1 texel = 1 unit | `[Extracted]` §2.1 |
| 5 | **Delete `ROW_DC`** | ±6 random per row — *larger* than the real grain (±5) | 0 | `[Measured]` §2.1 |
| 6 | **Per-frame clip table** | 4 identical distributions | F1 floor 49, F3 ceiling 214 → 43/255 mean spread | `[Measured]` §2.1 |
| 7 | **Wordmark size and opacity** | 36 % wide, opacity 0.014, centred | **25 %** of the aperture (40 units), opacity **0.045**, offset (−3.5, +1.4) | `[Measured]` §3.4 |
| 8 | **Contrast** | 0.047 | 0.055 | `[Measured]` §3.3 |
| 9 | **Tile base** | flat `#d8dadc` (blue-tinted) | `#D4D4D4` neutral, as a ramp | `[Measured]` §3.1 |

Items 1–3 are the ones the owner will actually see. Items 4–9 are correctness.

### Regression assertions worth adding

Given how easily this drifted, assert the *statistics*, not just pixels:

```
empty-tile mean            = 212 ± 2       # measured 211.9
every pixel                : R === G === B # measured: exact, all six tiles
per-pixel grain sigma      = 5.5 ± 1       # measured 5.4 ; simulated spec 4.9-6.0 across frames
row-mean sigma             = 5.1 ± 1       # structural part of the console's 7.4
column-mean sigma          < 1             # measured 0.55 ; simulated 0.59
row : pixel sigma ratio    = 0.8 - 1.1     # current build is ~0.25 -- 4x off
row-profile FFT            : peaks at periods 4.8 and 48 layout units
6-tile mean vertical swing = 16 ± 3        # measured 17.8 ; simulated 15.5
6-tile vertical minimum    : in the top 35% of the tile, never the bottom half
```

**On the row : pixel ratio.** Raw screenshots give **1.37 (reference_screen) to 1.57 (booper)**.
Removing the confirmed capture artifacts — near-Nyquist scanlines σ 1.79 in `reference_screen.png`,
and booper's unmodelled residual σ 5.19 — brings the *structural* ratio to **≈ 0.95 : 1**. Assert
against the structural figure, since we do not reproduce capture artifacts. Either way the current
build's 0.25 : 1 is roughly **four times too grain-dominated**.

**The whole spec was simulated end-to-end** against these assertions before being written down:
one 160 × 88 aperture reproduces mean 212.2, grain σ 5.96, row σ 4.89, column σ 0.59, and row-profile
FFT peaks at 4.9 and 44 units; a six-tile average with independent grating phases reproduces a
vertical profile of 218.5 top → 204.5 trough → 217.4 bottom, against the console's
217.7 → 204.0 → 220.5.

The last assertion is the cheap canary for regression #1: a re-added top-half white gloss
moves the vertical minimum into the bottom half of the tile and nothing else does.

---

## 7. Where the sources disagree

| Point | Positions | Resolution |
|---|---|---|
| **Row-vs-pixel balance** | `empty-slot-noise.md` §B.1.3: banding is a capture artifact, invert to 0.25 : 1. Both screenshots: row : pixel ≈ 1.5 : 1. Binaries: two grating stages + a ramp. | **§B.1.3 is wrong.** Two of the three components are row-only *by construction*. Withdraw §B.1.3. |
| **Stage 1 vs 2 relative speed** | `brlan-extraction.md` §4.3: stage 2 is 1/5 the speed. Tex-coords: stage 2 is **2 × faster** on screen. | §4.3 read texture space without tex-coords. **Correct §4.3.** |
| **Contrast** | konst (8,8,8) → 0.031. Pixels → 0.048 / 0.055 / 0.067. | Pixels govern; the konst is a floor. Use **0.055**. |
| **`Ch1` visibility** | Layout: `TevColor0` α = 0 → invisible. Pixels: r = 0.756 correlation with a 13/255 swing. | It draws. The I8 texture supplies its own colour and alpha; the black registers are parked for `createWrongThumbnail`. `[Inferred]` — see §8. |
| **Gloss ramp amplitude** | reference_screen 13.4/255 · booper 9.0/255 | Different crops, different capture chains, and booper's crop clips the ramp's brightest 8 %. The reference-screen fit is the better-conditioned one (full plate height, six tiles). Use **13/255**. |
| **Coarse grating sign** | booper's fit returns **−7.6** (dark bars); the fine grating returns **+8.5** (bright lines). | Only ~1.7 cycles fit in booper's crop, and a 25 %-duty negative band is nearly degenerate with a 75 %-duty positive one. **Amplitude ≈ 7.5/255 is solid; the sign is not.** Ship bright (matching stage 1, same texture, same TEV path) and flag it. |
| **Is `my_TV_d` even part of the empty slot?** | A theme's `mym.ini` maps `my_TV_d.tpl` to a 608 × 456 GameCube-banner background. The brlyt binds `my_TV_d.tpl` to `Ch0` stages 1 and 2. | **Name collision, not a contradiction.** Two different files, two different archives. The `chanSel` copy is 16 × 16 I4; the `GCbann` copy is 608 × 456 RGB565. §1. |
| **Scroll direction** | NW4R V-translate sign convention → upward. 1080p60 footage → **downward**, +8 px over 70 frames against a control that held at 0. | **Footage wins.** Downward. §2.2, §3.5. |
| **Wordmark legibility** | `ChannelStatic.css:117` "below the noise floor, should not be legible". Measured: −9.5 vs σ 5.4 = 1.75 σ. | Faintly legible. Raise to 0.045. |

---

## 8. Open questions

1. **The TEV stage ops for `Ch0` and `Ch1`.** `reference/nw4r_dump.py` decodes `mat1` registers,
   texture maps and SRTs but stops before the **TEV stage block** (flags `0xb8c1333` / `0x800111`
   are parsed for counts only). Decoding it would (a) turn `SNOW_CONTRAST` from a measured value
   into an extracted one, (b) settle whether `Ch1` composites additively, and (c) give the exact
   relative weights of the three `Ch0` stages instead of the fitted 8.5 / 7.5. **This is the single
   highest-value remaining extraction and it is a bounded change to one Python file.**
2. **~~Scroll direction~~ — CLOSED.** Resolved **downward** from 1080p60 console footage (§3.5,
   §2.2). Note the direction is the *opposite* of what the NW4R V-translate sign convention
   predicts, so do not re-derive it from the brlan.
3. **Stage 2's amplitude and sign.** The 48-unit coarse bar is the least-supported layer here:
   geometry and rate are extracted and solid, but its amplitude rests on a single weakly-conditioned
   fit (~1.7 cycles inside booper's crop), its sign came out negative where stage 1's came out
   positive, and the video cannot see it at all (114 px at 1080p, flattened by the encoder). Ship it
   bright at 7.5/255 and treat it as the first thing to cut or retune.

4. **Whether the 4.8-unit fine grating survives our stage scale.** At a typical scale of ~1.8 a
   4.8-unit period is 8.6 device px — fine. At scale 1 it is 4.8 px with a 1.2 px bright line, which
   will alias. Consider snapping the period to whole device pixels below scale 1.5, or accepting
   the shimmer.
5. **`image-rendering: pixelated` vs bilinear** for the grain. At 1 unit per texel and a stage
   scale of ~1.8 each texel becomes a hard 1.8 px block; the console filters bilinearly and then a
   CRT smooths further. `pixelated` is the crisper, more legible choice and is probably right for a
   web recreation, but it is a knowing divergence.

---

## 9. Corrections to make elsewhere in the corpus

1. **`components/empty-slot-noise.md` §B.1.3** — withdraw "the single most important correction to
   the current implementation" (invert the row : pixel ratio). The row structure is Nintendo's.
   Point to §2.2–2.4 here.
2. **`components/empty-slot-noise.md` §A.4.3** — the "9 : 1 row : column, therefore capture
   scanlines" reading is only partly right. Decomposing the 6-tile mean row profile gives
   **low-frequency σ 5.21 vs near-Nyquist σ 1.79**: the near-Nyquist part is capture scanlines, the
   dominant part is `my_TVSpe_a` + `my_TV_d`. The *conclusion* ("not diagonal") stands; the
   *attribution* does not.
3. **`components/empty-slot-noise.md` §B.8.1** — the parameter table's `GRAIN_W = 2`
   ("NTSC 1.5 : 1 anisotropy") and `ROW_DC = ±6` are both fabrications. Nintendo's grain is
   isotropic 1 × 1 and has no row DC term. The NTSC-bandwidth argument is sound physics about real
   CRT snow and simply is not what Nintendo drew.
4. **`components/empty-slot-noise.md` §B.10 #1** — "frame ordering and advance rate … only
   recoverable from a NAND dump" is **closed**: the theme archives had it, and this pass adds the
   textures too.
5. **`brlan-extraction.md` §4.1** — add the pane `tex_coords` (they are in
   `reference/consensus/my_IplTop_b.brlyt.deep.json` and were simply not reported). Every on-screen
   scale in §4.2–4.3 depends on them.
6. **`brlan-extraction.md` §4.2/§4.3** — correct the stage-1/stage-2 speed relationship (§2.3 here),
   and replace "two vertical UV scrolls" with "two rolling **scanline gratings**" — `my_TV_d` is not
   a noise texture.
7. **`brlan-extraction.md` §4.3** — the CSS sketch (`.empty-slot__drift-a/b` scrolling the noise) is
   what the implementation copied. Replace it with §5.2 here.
8. **`components/channel-tile.md` / `Channel.css`** — record that the system layout adds **no**
   tile gloss, with the 21/255-pixel measurement (§5.5) as the evidence.
9. **`tech-prior-art.md`** — booper's empty slot is a static PNG *rendered as an SVG `<pattern>`
   fill on the tile path, with the foreground/dimmer layer skipped entirely* — worth recording
   precisely, and worth recording that its asset independently corroborates the grating geometry.

---

## 10. Sources

**Extracted (Nintendo binaries, git-ignored under `reference/`):**

- `reference/consensus/my_IplTop_b.brlyt.deep.json` — pane tree, materials, **tex_coords**
- `reference/ashpool/starfoxzero_ash_chanSel.decompressed.ash_extracted/arc/timg/my_TV_c_p0..p3.tpl`
  — 128 × 96 RGB5A3 noise, identified as Nintendo's by cross-check against the Spriters rip
- `…/arc/timg/my_TV_d.tpl` — 16 × 16 I4 line grating, **byte-identical across all 11 theme copies**
- `…/arc/timg/my_TVSpe_a.tpl` — 8 × 96 I8 gloss ramp, **byte-identical across all 11 theme copies**
- `reference/wii-ipl/src/scene/channelSelect/iplChannelObj.cpp:802-810, 813-818` — `Ch0`/`Ch1`,
  `rand_u16() % 2000`

**Measured:** `reference_screen.png` (420 × 236, six empty tiles) · the four noise TPLs · the two
grating/gloss TPLs.

**Prior art:** `booper1/Wii-UI` @ `4301c7e` — `src/app/constants/channels.data.ts:172`,
`src/app/components/slide-deck/slide/channel/channel.html`, `src/index.html:11`, and statistical
measurement of `src/app/assets/emptyChannel.png` (366 × 192). <https://github.com/booper1/Wii-UI> ·
<https://skour.is/Wii-UI/>. **Unlicensed — technique and measurements only, per
`docs/asset-and-code-policy.md`. Nothing copied.**

**Video and community (source 3):** 1080p60 Wii Menu capture,
<https://www.youtube.com/watch?v=ppCjOIulp-M> — 240-frame extraction, cadence/scroll/phase analysis
(§3.5) · r/wii <https://old.reddit.com/r/wii/comments/mydnfq/is_this_a_beta_wii_static_channel_or_is_it_not/>
· r/wii <https://old.reddit.com/r/wii/comments/1693xnf/does_anyone_have_wii_menu_assets/>
· r/wiiu <https://old.reddit.com/r/wiiu/comments/303xfo/was_there_an_update_or_something_new_icon/>
· `emilydaemon/synthwiive_theme` `textures/mym.ini` (names `my_TV_c_p0..p3` as `frame01`–`frame04`)
· `andrewplus/Wii.JS` (3-frame blank-channel cycle at 0.3 s)
· `wiidev/usbloadergx` `source/SystemMenu/StaticFrame.cpp`.

**Cross-reference:** Spriters Resource "Empty Channel Spaces"
<https://www.spriters-resource.com/wii/wiimenu/asset/68562/> — used only to confirm that the
`starfoxzero` archive's `my_TV_c_p*` copies are Nintendo's originals.
