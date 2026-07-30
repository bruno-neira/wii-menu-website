# Design Fidelity Measurement

**How to rigorously measure "does my implementation match this reference?" when the reference is a
420×236 raster capture of a completely different rendering system.**

Scope: measurement *method*. Not a tool catalog, not agent prompting. Every number tagged
**[measured]** was produced by running the technique against this repo's actual
`reference_screen.png` (420×236, 8-bit RGB, sRGB IEC61966-2.1, no alpha); scripts are reproducible
from the snippets in this doc. Claims tagged **[synthesis]** are reasoned argument, not sourced fact.

---

## 0. The three facts that determine everything else

Before choosing any metric, three properties of this specific reference constrain what is even
possible to measure.

### 0.1 The reference is a resampled capture, not a design artifact

**[measured]** Sampling a vertical strip (`x = 5..15`) of the reference shows a 1-pixel-period
luminance alternation across the whole upper region:

```
row means y=0..19:  232.0 228.0 234.0 228.0 236.0 228.0 237.6 228.0 235.6 228.0
                    237.6 228.0 235.6 228.0 233.8 228.0 231.8 228.0 230.6 228.0
```

Every odd row is pinned at 228.0; every even row varies 230–238. But the phase **inverts** roughly
every 20 rows:

```
y   0- 19  even 234.5  odd 228.0  delta +6.5
y  20- 39  even 228.4  odd 232.7  delta -4.3
y  40- 59  even 229.1  odd 230.8  delta -1.7
y  60- 79  even 233.9  odd 228.0  delta +5.9
y  80- 99  even 228.4  odd 233.6  delta -5.2
y 100-119  even 229.4  odd 230.0  delta -0.6
y 120-139  even 234.1  odd 228.0  delta +6.1
```

A drifting-phase, near-Nyquist stripe is the signature of a periodic source pattern sampled at a
non-integer ratio — i.e. a beat/moiré. The Wii outputs 480 lines; 480/236 ≈ 2.03, so a 1-line
feature in the source lands on alternating destination rows with a slow phase drift, which is
exactly what this is. **[synthesis]**

**Consequence:** the highest-frequency content in this reference is an *artifact of the capture
pipeline*, not a design decision. Any measurement technique that treats individual pixels as ground
truth will chase a beat pattern. Practical rule: **never read a single pixel; read the median or
mean of a ≥5×5 patch, and never try to reproduce structure whose period is ≤2 reference pixels.**

### 0.2 Any comparison has a non-zero noise floor

**[measured]** Take the reference, upscale 4× with Lanczos to 1680×944 (a stand-in for a
*byte-perfect* implementation), then downscale it back to 420×236 and score it against the original.
A perfect implementation does **not** score 1.0:

| variant | RMSE | diff% (>8/255) | SSIM | hist corr |
|---|---|---|---|---|
| **identical (round-trip only)** | **2.96** | **3.51** | **0.9874** | **0.9917** |

So on this reference, at 4× scale, with Lanczos both ways, **SSIM 0.987 is the ceiling, not 1.0.**
Reporting "SSIM 0.96, needs work" is meaningless until you know the floor. Calibrate first.

### 0.3 The resampling filter moves the score more than real design errors do

**[measured]** Same identical image, only the downscale filter changes:

| filter | RMSE | diff% | SSIM | hist corr |
|---|---|---|---|---|
| BOX      | 2.76 | 3.62 | 0.9905 | 0.9939 |
| NEAREST  | 2.89 | 4.86 | 0.9930 | 0.9993 |
| LANCZOS  | 2.96 | 3.51 | 0.9874 | 0.9917 |
| HAMMING  | 3.27 | 4.83 | 0.9865 | 0.9928 |
| BICUBIC  | 3.42 | 4.57 | 0.9839 | 0.9904 |
| BILINEAR | 4.90 | 8.74 | 0.9686 | 0.9871 |

SSIM spans 0.9686 → 0.9930 and diff% spans 3.51 → 8.74 with **zero** change to the design. For
comparison, a genuinely visible +6/255 global brightness error scores SSIM 0.9862 — *better* than
the identical image resampled with bilinear. **Pin the filter in config and never change it**; a
filter change silently invalidates every historical score.

Pillow's own guidance ranks LANCZOS highest for downscaling
([Pillow concepts](https://pillow.readthedocs.io/en/stable/handbook/concepts.html#filters)); BOX and
NEAREST score "better" above only because the test image was itself produced by upscaling, so
they partially undo it. Use **LANCZOS or BOX with an integer scale factor** — see §2.

---

## 1. Extracting ground truth from a reference raster

### 1.1 Color sampling

**The pitfalls, in order of how much they will bite you here:**

1. **Dither / capture beat (severe here).** See §0.1. A single-pixel read of the background returns
   228 or 238 depending on row parity. The design intent is ~233.
2. **Anti-aliasing (severe at this size).** At 420px wide, a 1px-wide stroke is *always* partially
   AA'd. **[measured]** The blue accent curve at `x=240` reads:
   `y=195 (217,232,237)` → `y=196 (71,188,229)` → `y=197 (172,175,183)`. Only *one* row is the true
   stroke color; the neighbours are blends. Sampling one row off gives you a color that exists
   nowhere in the design.
3. **Gamma (moderate, systematic).** Averaging sRGB-encoded values is wrong; light mixes linearly,
   sRGB values are ~2.2-gamma encoded. **[measured]** Naive box-downscale in gamma space vs.
   averaging in linear light and re-encoding: mean abs diff 0.36 levels overall, but **2.80 levels
   mean and 25.5 levels max on high-contrast edge pixels**, with 3.08% of pixels differing >3 levels.
   That is the same order as the entire noise floor, and it is a *bias*, not noise (gamma-naive
   downscaling systematically darkens light-on-dark edges).
4. **Color profile.** This file carries an explicit `sRGB IEC61966-2.1` profile, and the browser
   will render untagged CSS colors as sRGB. So here they agree and you can ignore it — but *verify*,
   don't assume. A Display-P3 screenshot of the app compared against an sRGB reference will show a
   uniform chroma offset you'll waste hours chasing.
5. **JPEG artifacts.** Not applicable — this reference is PNG (**[measured]** `PNG image data,
   420 x 236, 8-bit/color RGB, non-interlaced`). If it were JPEG, 8×8 block ringing around the
   channel-tile edges would make any edge-adjacent color sample untrustworthy, and you'd need to
   sample only from block interiors ≥4px from any edge.

**Reliable sampling recipe:**

```python
import numpy as np
from PIL import Image

REF = np.asarray(Image.open("reference_screen.png").convert("RGB")).astype(np.float64)

def srgb_to_linear(v):
    v = v / 255.0
    return np.where(v <= 0.04045, v / 12.92, ((v + 0.055) / 1.055) ** 2.4)

def linear_to_srgb(y):
    return np.clip(np.where(y <= 0.0031308, y * 12.92,
                            1.055 * y ** (1 / 2.4) - 0.055), 0, 1) * 255

def sample_fill(x, y, r=3, mode="median"):
    """Robust flat-fill color at (x, y). Median rejects the dither beat AND
    stray AA pixels; mean-in-linear-light is correct for genuine blends."""
    patch = REF[y-r:y+r+1, x-r:x+r+1]
    if mode == "median":
        return np.median(patch.reshape(-1, 3), axis=0)          # use for FLAT fills
    return linear_to_srgb(srgb_to_linear(patch).reshape(-1, 3).mean(axis=0))  # use for BLENDS
```

- **Flat fill → median.** Rejects the ±5-level beat and any AA contamination outright.
- **Blend / gradient midpoint → mean in linear light.** Median is wrong here because you *want* the
  average.
- **Stroke / 1px line → the single extremum pixel, not a patch.** Take
  `argmax(saturation)` or `argmin(luminance)` along a perpendicular scanline. Averaging destroys it.
  **[measured]** The Wii accent curve's true color found this way is `#3BBDEA (59,189,234)` on the
  flat left/right runs and `(71,188,229)` on the sagging middle run — the ~12-level difference is
  itself AA, because the middle run is at a slight slope. **The flat runs are the ground truth.**

### 1.2 Distances and proportions

Measure in reference pixels, then **immediately** convert to a dimensionless ratio and throw the
pixel number away. Two reasons: (a) the app renders at arbitrary size, (b) a ±0.5px reading error
on 420px is ±0.12% — tolerable — whereas the same error carried into a hardcoded `px` value at
1680px wide becomes a 2px error.

```python
W, H = 420, 236
def rel(px, axis="w"):  return px / (W if axis == "w" else H)
```

Express everything as: `% of container width`, `% of container height`, or (best for anything that
must stay square) `% of container height` with `aspect-ratio` in CSS.

**Edge localisation to sub-pixel accuracy.** Don't eyeball edges — find the centroid of the
gradient. A true edge in an AA'd raster spans 2–3 pixels; its sub-pixel position is the
intensity-weighted centroid:

```python
def subpixel_edge(profile, i0, i1):
    """Sub-pixel edge location within profile[i0:i1] (a 1-D luminance scanline)."""
    g = np.abs(np.diff(profile[i0:i1].astype(float)))
    if g.sum() == 0: return None
    return i0 + 0.5 + (g * np.arange(len(g))).sum() / g.sum()
```

This routinely gets you ±0.2px on a 420px image — good enough that the *proportion* is accurate to
~0.05%, far better than you can author CSS to anyway.

### 1.3 What is and is not recoverable at 420×236

| Property | Recoverable? | Why |
|---|---|---|
| Flat fill colors | **Yes**, ±2/255 | Median over a patch beats the dither |
| Layout proportions (positions, sizes, gaps) | **Yes**, ±0.3% | Sub-pixel edge centroid |
| Large-radius corners (≥6px ref) | **Marginal** | Fit a circle to the AA'd arc; ±1px |
| Small-radius corners (≤4px ref) | **No** | Indistinguishable from AA on a square corner |
| Stroke weight ≥2 ref px | **Yes**, ±0.5px | Count rows above half-max |
| Stroke weight 1 ref px | **No** — you get "≤1px" | **[measured]** the accent curve occupies exactly one saturated row; its true width could be anything from 0.5 to 1.4 device px in the original |
| Linear gradient endpoints & direction | **Yes** | Regress luminance along the axis; slope is robust even under dither |
| Gradient *easing* (linear vs. eased) | **Marginal** | Needs ≥40px of run and low noise; the ±5 dither eats subtle curvature |
| Drop shadows / blurs | **Blur radius no, presence yes** | 2–3px of falloff is not enough to fit a Gaussian |
| Font family | **No** (see §7) | ~12px glyph height, plus a proprietary face |
| Font size / line height / tracking | **Yes**, ±0.5px | Measure the ink bounding box, not the glyphs |

**Concrete example — stroke weight.** Use half-max width, not a threshold count:

```python
def stroke_width(profile, bg, fg):
    """Full-width-at-half-maximum of a stroke crossing `profile` (1-D)."""
    half = (bg + fg) / 2.0
    inside = (profile < half) if fg < bg else (profile > half)
    return inside.sum()   # in reference pixels; sub-pixel: interpolate at the crossings
```

**Concrete example — corner radius.** Threshold the corner region at the fill/background midpoint,
extract the boundary points of the rounded quadrant, and least-squares fit a circle. If the fit
residual exceeds ~0.8px, the corner is too small to measure and you should treat radius as a free
design parameter rather than a recovered fact. **[synthesis]**

### 1.4 What this reference actually gives you

**[measured]** Grid geometry and text metrics read off the reference:

- Frame: 420×236, aspect **1.7797** (16:9 is 1.7778 — a 0.11% mismatch, see §2.4).
- Accent curve: 1px, `#3BBDEA` on flat runs, apex at `y≈171` (72.5% of height) at the left/right
  edges, sagging to `y≈196` (83.1%) across the centre — i.e. a **25px / 10.6%-of-height sag**.
- Clock ink box: rows 178–189 → **12px glyph height** (5.1% of frame height), 78px wide.
- Date ink box: rows 202–214 → **13px** including descender, 48px wide.
- Channel label ink ("Photo Channel"): rows 20–31 → **12px**, 64px wide.
- 14,680 unique RGB triples in 99,120 pixels — heavy gradient/dither content, low flat-area count.

---

## 2. Normalizing for scale and resolution mismatch

### 2.1 Compare proportionally, never in absolute pixels

The only invariant shared by a 420×236 reference and a 1680×944 render is *proportion*. Every
assertion should be of the form "the accent curve apex sits at 72.5% ± 0.5% of container height",
never "the accent curve is at y=171". This also makes your assertions survive a container resize,
which absolute-pixel assertions do not. **[synthesis]**

### 2.2 Downscale the render, or upscale the reference?

**Downscale the render.** Reasons, in order:

1. **Upscaling the reference invents information.** A 4× Lanczos upsample of a 420px image has no
   real high-frequency content — every edge is a smooth 8px ramp. A *correct* implementation renders
   crisp 1-device-pixel edges. Comparing crisp-correct against smooth-invented **penalises the
   correct implementation** for being sharp. You would be optimising toward a blurry app.
   **[synthesis]** — my experiment could not demonstrate this directly, because the "render" was
   itself derived from the reference; it is an argument from how resampling works, and it is the
   single strongest reason to prefer downscaling.
2. **Cost.** 16× the pixels for SSIM/LPIPS, for zero added information.
3. **Downscaling is information-*destroying*, which is what you want** — it discards exactly the
   sub-reference-pixel detail that the reference never captured and that you therefore cannot be
   held to.

**[measured]** Both paths rank errors in the same order, so the choice is not about ranking power:

| variant | A: downscale render → 420×236 | | | B: upscale ref → 1680×944 | | |
|---|---|---|---|---|---|---|
| | RMSE | diff% | SSIM | RMSE | diff% | SSIM |
| identical | 2.96 | 3.51 | 0.9874 | 0.00 | 0.00 | 1.0000 |
| shift 1 ref-px | 14.99 | 14.52 | 0.8433 | 14.64 | 13.91 | 0.8704 |
| shift 2 ref-px | 20.99 | 18.98 | 0.7316 | 20.74 | 18.24 | 0.8245 |
| shift 4 ref-px | 26.15 | 24.18 | 0.6936 | 25.95 | 23.30 | 0.8188 |
| bright +2/255 | 3.55 | 4.35 | 0.9872 | 1.96 | 0.00 | 0.9998 |
| bright +6/255 | 6.57 | 12.04 | 0.9862 | 5.86 | 0.00 | 0.9989 |
| blur σ=2 | 6.70 | 12.79 | 0.9404 | 5.07 | 9.71 | 0.9581 |
| blur σ=6 | 14.32 | 26.76 | 0.7541 | 13.57 | 25.93 | 0.8319 |
| blue accent hue shift | 6.36 | 7.04 | 0.9837 | 5.54 | 5.75 | 0.9968 |

Path A's cost is the 2.96/3.51%/0.9874 floor. Path A's benefit is that it does not fabricate detail.
**Use Path A and subtract the floor.** Keep Path B in your pocket for one job only: *color* checks,
where it is measurably more sensitive (bright +2 shows as RMSE 1.96 against a 0.00 floor, vs. 3.55
against a 2.96 floor).

### 2.3 Pick an integer scale factor

**[synthesis, strongly recommended]** Render the app at an exact integer multiple of 420×236 —
**1680×944 (4×)** is ideal for a modern display. Then:

- `BOX` downscaling becomes an exact 4×4 box average — no filter kernel ambiguity, no ringing, no
  filter-choice score drift (§0.3).
- Gamma-correct downscaling becomes trivial and exact (see the code below).
- Sub-reference-pixel positions map cleanly: 1 ref px = 4 device px, so you can express a ±1
  device-px tolerance as exactly ±0.25 ref px.

```python
def downscale_to_ref(render_rgb_uint8, k=4):
    """Gamma-correct integer box downscale. render must be (236k, 420k, 3)."""
    lin = srgb_to_linear(render_rgb_uint8.astype(np.float64))
    h, w = lin.shape[0] // k, lin.shape[1] // k
    lin = lin.reshape(h, k, w, k, 3).mean(axis=(1, 3))
    return linear_to_srgb(lin)
```

Set the browser viewport to 1680×944 with `deviceScaleFactor: 1` and screenshot with
`scale: "device"` so you get real device pixels rather than CSS pixels
([Playwright screenshot options](https://playwright.dev/docs/api/class-pageassertions#page-assertions-to-have-screenshot-1)).

### 2.4 Aspect-ratio mismatch

**[measured]** 420/236 = 1.77966; 16:9 = 1.77778. The reference is **0.106% wider than 16:9** — 236
rows should be 419.56px at true 16:9, so the capture was rounded up by 0.44px, or one row was
cropped.

Three options, in preference order:

1. **Render to the reference's exact aspect (1680×944), not to 16:9.** The 0.1% is below your
   measurement noise and this eliminates the problem entirely. Do this.
2. If the app is locked to 16:9, **letterbox the reference** to match (pad, don't stretch) and mask
   the pad.
3. **Never stretch non-uniformly to force a match** — it introduces a 0.1% horizontal shear that
   accumulates to a 1.7px displacement at the right edge of a 1680px render, which is enough to
   register as a real layout error in a pixel diff.

Rule of thumb **[synthesis]**: if the aspect mismatch is under ~0.5%, absorb it by rendering to the
reference's aspect. Above that, letterbox and mask.

---

## 3. Similarity metrics: what each one actually tells you

The single most useful result from the sensitivity study is that **the metrics are not redundant —
they are near-orthogonal.** Read the table by column, not by row:

**[measured]** (Path B, clean 0-floor, so the numbers are readable):

| perturbation | RMSE | SSIM | hist corr | edge-IoU (2px tol) |
|---|---|---|---|---|
| identical | 0.00 | 1.0000 | 1.0000 | 1.0000 |
| shift 1 ref-px | 14.64 | 0.8704 | **1.0000** | 0.6318 |
| shift 2 ref-px | 20.74 | 0.8245 | **1.0000** | 0.6401 |
| bright +6/255 | 5.86 | **0.9989** | 0.8080 | 0.9996 |
| blue accent hue shift | 5.54 | **0.9968** | **0.9998** | 0.9978 |
| blur σ=6 | 13.57 | 0.8319 | 0.9760 | 0.9129 |

- **SSIM collapses on a 1-pixel shift (0.87) but is blind to a very visible +6/255 brightness error
  (0.9989).**
- **Histogram correlation is exactly the inverse: perfectly blind to any shift (1.0000) and the most
  sensitive thing on the table to brightness (0.8080).**
- **Neither notices the accent-color error.** Both ≥0.996.

That is the whole argument for a composite score. Any single number lies.

### 3.1 Raw pixel diff %

Count of pixels whose difference exceeds a threshold, over total pixels.

- **Good at:** hard, localised regressions — a missing element, a wrong-colored block. Cheap.
  Trivially explainable ("1,400 pixels moved").
- **Blind to:** nothing in principle, everything in practice — it has no notion of *how wrong*. A
  1px sub-pixel shift of a high-contrast edge flags thousands of pixels while being invisible.
- **Threshold semantics matter enormously.** Playwright's `threshold` is *"an acceptable perceived
  color difference in the YIQ color space between the same pixel in compared images, between zero
  (strict) and one (lax) … Defaults to 0.2"*, and `maxDiffPixelRatio` is *"an acceptable ratio of
  pixels that are different to the total amount of pixels, between 0 and 1"*
  ([Playwright docs](https://playwright.dev/docs/api/class-pageassertions#page-assertions-to-have-screenshot-1)).
  Modern pixelmatch has moved to **OKLab with the HyAB metric**, with *"smaller values make the
  comparison more sensitive. 0.1 by default"*, plus an `includeAA` anti-aliasing detector
  ([pixelmatch](https://github.com/mapbox/pixelmatch)). Turn AA detection **on** for this project —
  at 420px effectively every edge is AA.
- **Practical thresholds here:** with the §0.2 floor at 3.51% for an identical image, a
  `maxDiffPixelRatio` gate must sit *above* the floor. Recommend gate at **floor + 2%** (≈6% with the
  Appendix harness's measured 3.86% floor), and treat anything above 8% as a real regression.
  Recalibrate whenever the filter or scale changes.

### 3.2 RMSE / MSE / PSNR

`RMSE = sqrt(mean((A-B)²))` over all pixels and channels, in 0–255 units.
scikit-image provides `mean_squared_error`, `normalized_root_mse`, `peak_signal_noise_ratio`
([skimage.metrics](https://scikit-image.org/docs/stable/api/skimage.metrics.html)).

- **Good at:** magnitude of error. Monotone, cheap, differentiable, comparable across runs. The best
  *single* summary of "how far off, on average."
- **Blind to:** structure and location. A uniform +5 tint across the whole frame and a badly broken
  layout in one corner can produce the same RMSE.
- **Thresholds here [measured]:** floor 2.96. **RMSE < 4 = excellent, 4–8 = a real but localised
  or subtle error, 8–15 = a visible layout or color problem, > 15 = something is structurally
  wrong** (a 1-ref-px global shift already scores 14.99).
- PSNR is just a log restatement of MSE; it adds nothing for UI work and its familiar "40 dB is
  good" folklore comes from compression, not from layout. Skip it. **[synthesis]**

### 3.3 SSIM

`SSIM(x,y) = [(2μₓμᵧ + c₁)(2σₓᵧ + c₂)] / [(μₓ² + μᵧ² + c₁)(σₓ² + σᵧ² + c₂)]` with
`c₁ = (k₁L)²`, `c₂ = (k₂L)²`, `k₁ = 0.01`, `k₂ = 0.03`, computed over a sliding **11×11 Gaussian
window with σ=1.5**; the reported figure is the mean over all windows
([SSIM overview](https://en.wikipedia.org/wiki/Structural_similarity_index_measure)).
To reproduce Wang et al. exactly, scikit-image requires
`gaussian_weights=True, sigma=1.5, use_sample_covariance=False`, and an explicit `data_range`
([skimage docs](https://scikit-image.org/docs/stable/api/skimage.metrics.html)).

- **Good at:** structural/geometric agreement — layout drift, missing or displaced elements, blur,
  loss of local contrast. This is your primary *layout* metric.
- **Blind to:** global luminance and chroma offsets — by construction. The luminance term is
  normalised by `μₓ² + μᵧ²`, so a uniform shift barely moves it. **[measured]** +6/255 → 0.9989.
  Also blind to color entirely if you run it on grayscale (the common default).
- **Over-sensitive to:** translation, scaling, rotation — a documented limitation, and the reason
  CW-SSIM exists
  ([limitations](https://en.wikipedia.org/wiki/Structural_similarity_index_measure)).
  **[measured]** a 0.24%-of-width shift costs 0.13 SSIM.
- **Thresholds here [measured]:** floor 0.9874. **≥0.985 = at the floor, indistinguishable;
  0.97–0.985 = minor drift; 0.93–0.97 = a real geometric error (roughly a sub-pixel to 1px
  displacement, or noticeable softness); <0.90 = a genuine layout mismatch.**
- **Run it per-channel or on L\*, not on the RGB mean.** Grayscale SSIM cannot see a hue error at
  constant luminance at all.
- **Use MS-SSIM if you can.** Multi-scale SSIM sub-samples across scales and generally matches human
  judgement better than single-scale
  ([MS-SSIM](https://en.wikipedia.org/wiki/Structural_similarity_index_measure)). For a UI with
  structure at both the whole-grid and single-glyph scale, that matters. **[synthesis]**
- `DSSIM = (1 − SSIM)/2`. Kornel Lesiński's `dssim` reports `1/SSIM − 1` instead, works in **L\*a\*b\***
  ("measures brightness and color much better than metrics from average of RGB channels"), compares
  at **multiple weighted resolutions with scaling done in linear-light RGB**, and warns that values
  are not comparable across tools or versions ([dssim](https://github.com/kornelski/dssim)). That
  linear-light multi-scale L\*a\*b\* design addresses three of this project's specific problems at
  once and makes it a strong candidate.

### 3.4 Perceptual metrics

- **LPIPS** — deep-feature distance from *"The Unreasonable Effectiveness of Deep Features as a
  Perceptual Metric"* (CVPR 2018). The paper's finding is that PSNR and SSIM are *"simple, shallow
  functions"* that *"fail to account for many nuances of human perception,"* and that deep features
  *"outperform all previous metrics by large margins"*
  ([project page](https://richzhang.github.io/PerceptualSimilarity/),
  [arXiv:1801.03924](http://arxiv.org/abs/1801.03924)). API: `pip install lpips`;
  `lpips.LPIPS(net='alex')`; input `Nx3xHxW` normalised to **[-1,1]**; **higher = more different**
  ([PyPI](https://pypi.org/project/lpips/)).
  - **Good at:** "would a person say these look the same." Tolerant of imperceptible sub-pixel and
    texture differences that wreck SSIM.
  - **Bad at:** *this* job, partly. It was trained on photographic distortions, not on flat vector
    UI. It gives no localisation, no explanation, and no actionable direction. **[synthesis]** Use
    it as a tiebreaker between two candidate implementations, never as the optimisation target.
- **Butteraugli** — psychovisual, models low blue-cone density in the fovea; outputs a scalar plus a
  spatial difference map, with the scalar dividing into *"great" / "acceptable" / "not acceptable"*
  classes. The authors explicitly caution it works best *"within a small range of quality, roughly
  corresponding to jpeg qualities 90 to 95"* and that *"performance with major deformations remains
  unknown"* ([google/butteraugli](https://github.com/google/butteraugli), archived Nov 2023). A
  design-vs-implementation gap is a "major deformation." **Not appropriate here.**
- **SSIMULACRA2** — the practical successor. Operates in **XYB** color space, combines an SSIM map
  with blockiness/ringing and smoothing/blur maps across **six scales per color component**, and
  reports on a scale where **90 = visually lossless, 70 = artifacts barely noticeable side-by-side,
  50 = slightly annoying artifacts, 100 = mathematically identical**. It beats MS-SSIM (0.8787 vs.
  0.7601 Pearson on CID22) and Butteraugli (0.745)
  ([ssimulacra2](https://github.com/cloudinary/ssimulacra2)). Of the perceptual family this is the
  one worth wiring up: it is multi-scale, color-aware, and has a *published, interpretable scale* —
  which is exactly what "how close is close enough" needs.
- **pixelmatch's perceptual mode** is not really perceptual in this sense; it is a per-pixel OKLab
  HyAB color distance with an AA detector ([pixelmatch](https://github.com/mapbox/pixelmatch)).
  Excellent and cheap, but it has no spatial model — so it is a *color* metric, filed under §3.1.

### 3.5 Histogram comparison

Compare the distributions of pixel values, discarding all spatial information. OpenCV's
`compareHist` offers correlation (1.0 = perfect), chi-square (0.0 = perfect), intersection (higher
better), and Bhattacharyya (0.0 = perfect)
([OpenCV tutorial](https://docs.opencv.org/4.x/d8/dc8/tutorial_histogram_comparison.html)).

- **Good at:** exactly one thing, and it is very good at it — **is my palette right?** Because it is
  translation-invariant by construction, it separates "wrong colors" from "wrong positions" cleanly.
  **[measured]** identical 0.9917 → bright+6 0.8135, while every shift stays at 0.9917.
- **Blind to:** all layout, all structure, all composition. Two completely different arrangements of
  the same colors score 1.0.
- **Use it as the color half of a composite score,** paired with SSIM as the geometry half. Prefer a
  3-D histogram in **CIELAB** with ~16 bins/axis over separate RGB histograms, so that
  perceptually-close colors land in adjacent bins. **[synthesis]**

### 3.6 Which metric best matches "a human would say these look the same"?

**[synthesis, informed by §3's measurements]** No single one. Ranked for *this* project:

1. **SSIMULACRA2** — best single number if you'll install it; published perceptual scale.
2. **A composite of MS-SSIM (geometry) + CIELAB histogram correlation (palette) + max regional
   ΔE2000 (accent colors)** — nearly as good as (1) at matching human judgement, and vastly more
   *actionable*, because each term points at a different fix.
3. **LPIPS** — good agreement with humans, zero diagnostic value.
4. **RMSE** — surprisingly decent as a coarse triage number; useless for diagnosis.
5. **Raw pixel diff %** — worst human agreement of the lot at this resolution, because sub-pixel AA
   differences dominate the count.

For **color specifically**, the right unit is **ΔE2000**, the CIE's current recommendation over
CIE76 and CIE94; `ΔE*ab ≈ 2.3` corresponds to a just-noticeable difference
([color difference](https://en.wikipedia.org/wiki/Color_difference)). Working thresholds
**[synthesis, standard industry practice]**: **ΔE2000 < 1 imperceptible; 1–2 perceptible only on
close side-by-side inspection; 2–5 clearly perceptible; > 5 obviously a different color.** Target
**ΔE2000 ≤ 2.0** for every named color token, which is both achievable and defensible.

---

## 4. Region-of-interest comparison

### 4.1 Whole-page scores are actively misleading

**[measured]** The same accent-hue error, scored over different regions:

| region | share of frame | RMSE | SSIM |
|---|---|---|---|
| whole frame | 100.0% | 5.54 | 0.9968 |
| channel grid | 55.1% | 6.69 | 0.9978 |
| bottom bar | 28.8% | 4.29 | 0.9928 |
| clock block | 4.4% | 4.47 | 0.9933 |
| left "Wii" button | 2.6% | 5.61 | **0.9857** |

Three things to take from this:

1. The **whole-frame SSIM of 0.9968 is *below* the noise floor of 0.9874** — i.e. a globally-visible
   accent color error is *completely invisible* to a whole-page SSIM gate. It would pass.
2. **Only the smallest ROI (2.6%) shows the error clearly** (0.9857). Dilution is proportional to
   area: an error confined to *p* of the frame moves a mean-over-windows score by roughly *p* times
   its local magnitude. **A 1% element can never fail a global gate, no matter how wrong it is.**
3. **A large ROI can score *worse* than the whole frame** (channel grid RMSE 6.69 > 5.54) and still
   be the wrong place to look. Magnitude without localisation is noise.

### 4.2 Decomposition

Define ROIs in **reference coordinates** as fractions, and scale them into whatever space you are
comparing in. Keep them in one file so they're a shared artifact between you, the tests, and any
agent.

```python
# fractions of (W, H) — resolution independent by construction
ROIS = {
    "channel_grid":  (0.067, 0.059, 0.867, 0.636),
    "accent_curve":  (0.000, 0.700, 1.000, 0.140),
    "clock_block":   (0.381, 0.754, 0.262, 0.169),   # DYNAMIC — see §6
    "wii_button":    (0.014, 0.763, 0.124, 0.212),
    "mail_button":   (0.857, 0.763, 0.124, 0.212),
    "tile_0_0":      (0.079, 0.059, 0.205, 0.267),
}

def crop(img, roi, W, H):
    x, y, w, h = roi
    return img.crop((round(x*W), round(y*H), round((x+w)*W), round((y+h)*H)))
```

**Granularity rule [synthesis]:** an ROI should be small enough that *any* error inside it changes
its score by more than the noise floor. Empirically that means **no ROI larger than ~15% of the
frame**, and separate ROIs for every element you have an opinion about. For a 4×3 channel grid,
score at least one representative tile individually as well as the grid as a whole — the grid ROI
catches spacing errors, the tile ROI catches tile-internal errors, and neither catches the other's.

### 4.3 Weighting

Score each ROI independently, then combine with **explicit weights that encode design intent**, not
pixel area:

```
Fidelity = Σ wᵢ · scoreᵢ  ,  Σ wᵢ = 1
```

Two guardrails on top of the weighted mean **[synthesis]**:

1. **Report `min(scoreᵢ)` alongside the mean.** The mean hides the one broken region; the min is
   what a person will actually notice first.
2. **Make critical ROIs veto-capable.** If the accent curve is wrong, the whole thing reads wrong
   regardless of a 0.99 average — so gate on `score["accent_curve"] ≥ threshold` as a hard condition,
   not as a weighted contribution.

Suggested starting weights for this UI, reflecting what carries the Wii Menu's identity rather than
what occupies area:

| ROI | weight | rationale |
|---|---|---|
| accent_curve | 0.20 | the single most identity-defining element; only ~2% of pixels |
| channel_grid (spacing/alignment) | 0.20 | the layout signature |
| tile chrome (radius, border, fill) | 0.15 | repeated 12×, so errors compound visually |
| bottom bar geometry | 0.15 | |
| Wii / mail buttons | 0.10 | |
| background gradient | 0.10 | large area, low information |
| typography block | 0.10 | see §7 — deliberately capped, because it is the least recoverable |

---

## 5. Overlay techniques for human and agent review

Metrics tell you *that* something is wrong. Overlays tell you *what*. Different overlays are
sensitive to different error classes — pick by the class you're hunting.

| Overlay | Best at revealing | Blind to | Notes |
|---|---|---|---|
| **Difference blend** (`abs(A−B)`, or CSS `mix-blend-mode: difference`) | Everything, unranked | Nothing — but it drowns you in AA noise at this resolution | Amplify: `clip(abs(A−B) * 8)`. Black = match. |
| **Onion-skin / opacity slider** | **Layout drift** — the eye is superb at spotting sliding edges as you sweep opacity | Color shifts (they just look like a fade) | The single best interactive tool for a human |
| **Flicker / blink comparison** (alternate A and B at ~2 Hz) | **Small displacements** — motion is pre-attentive; beats onion-skin for sub-pixel shifts | Static color error | SSIMULACRA2's "90 = visually lossless" is explicitly defined against a flicker test ([ssimulacra2](https://github.com/cloudinary/ssimulacra2)) |
| **Edge-detection overlay** (Canny of A in red, B in cyan) | **Geometry only** — decouples layout from color completely | All color and fill errors | The right overlay for "is my layout right, ignoring that my colors are off" |
| **Split / wipe** (left half A, right half B, draggable seam) | **Color and gradient shifts** — direct edge-adjacency comparison across the seam | Layout drift away from the seam | Move the seam through each ROI |
| **Checkerboard interleave** (alternating NxN blocks from A and B) | **Color, gradient, and texture** across the whole frame at once | Fine layout drift | Use ~24px blocks; a wrong tint makes the whole frame visibly plaid |
| **Side-by-side, synchronised zoom** | **Typography and small detail** | Anything requiring superimposition | Necessary at ≥8× for 12px glyphs |
| **Per-ROI heatmap** (SSIM map or ΔE map, false-colored) | **Where to look next** | — | The best single artifact to hand an agent; it's a spatial argmax over error |

**Diagnostic decision procedure [synthesis]:**

- Difference blend shows **thin bright outlines around every edge, nothing in the interiors** →
  sub-pixel layout drift or an AA/scale difference. Confirm with flicker; if invisible at 100%,
  ignore it.
- Difference blend shows **uniform dim glow everywhere including flat interiors** → global color or
  gamma error. Confirm with histogram correlation and split-view.
- Difference blend shows **one bright solid region** → a genuine element error. Go straight to that
  ROI.
- **Edge overlay matches but difference blend is bright** → geometry is correct, colors are wrong.
  This is the good failure mode; it's a token fix.
- **Edge overlay is misaligned but histogram correlation is ~1.0** → colors are correct, geometry is
  wrong. Fix layout; do not touch color.

That last pair is the whole point of running both an edge/geometry metric and a histogram/color
metric: **they partition your error into two independently fixable halves.**

**Geometry-only scoring, quantified.** Canny edge maps compared by IoU, with a dilation tolerance
band to absorb AA and sub-pixel jitter:

```python
from skimage.feature import canny
from scipy.ndimage import binary_dilation

def edge_iou(a_gray, b_gray, sigma=2.0, tol=2):
    ea = canny(a_gray / 255.0, sigma=sigma)
    eb = canny(b_gray / 255.0, sigma=sigma)
    precision = (ea & binary_dilation(eb, iterations=tol)).sum() / max(ea.sum(), 1)
    recall    = (eb & binary_dilation(ea, iterations=tol)).sum() / max(eb.sum(), 1)
    return 2 * precision * recall / max(precision + recall, 1e-9)   # F1
```

**[measured]**, with `tol=2`:

| variant | raw IoU | tol-2px |
|---|---|---|
| identical | 1.0000 | 1.0000 |
| shift 1 ref-px | 0.2124 | 0.6318 |
| shift 2 ref-px | 0.1980 | 0.6401 |
| bright +6/255 | 0.9719 | **0.9996** |
| blue hue shift | 0.9064 | **0.9978** |
| blur σ=6 | 0.0378 | 0.9129 |

Note the two lessons. **Raw edge IoU is unusable** — a 1-pixel shift drops it to 0.21, because
binary edge maps have no tolerance. **With a 2px dilation band it becomes an excellent pure-geometry
metric**: ≥0.997 for both pure-color errors, 0.63 for a 1-pixel layout shift. Use the *symmetric F1*
form above, not one-sided precision, or blur will score deceptively well (one-sided precision gave
blur σ=6 a 0.91).

---

## 6. Handling legitimately-different content

The reference shows `12:00 AM`, `Fri 1/1`, a specific disc icon, Mii faces, and a specific set of
channels. The live app reproduces none of this. Four techniques, in increasing order of rigour:

### 6.1 Masking (cheapest, use by default)

Exclude dynamic regions from scoring. Playwright supports this natively: masked elements are
*"overlaid with a pink box #FF00FF (customized by `maskColor`)"*
([docs](https://playwright.dev/docs/api/class-pageassertions#page-assertions-to-have-screenshot-1)).
For offline scoring, apply the same mask to *both* images and exclude those pixels from the
denominator:

```python
def masked_score(A, B, mask):        # mask: True where COMPARABLE
    d = np.abs(A - B).max(axis=2)
    return d[mask].mean(), 100 * (d[mask] > 8).mean()
```

**Critical detail:** masking with a solid color and then running SSIM over the whole frame is
*wrong* — the mask edges create synthetic high-contrast structure that SSIM's 11×11 window sees as
signal, and the mask interior is a perfect match that inflates your mean. **Always exclude masked
pixels from the aggregation, and shrink the mask's influence by dilating it 6px (half the SSIM
window) before excluding.** **[synthesis]**

### 6.2 Forcing a matched state (best fidelity, moderate cost)

Drive the app into the exact reference state and compare everything:

```jsx
// accept an injectable clock so tests can freeze it
const now = props.fixedTime ?? new Date();
```

```js
// or freeze at the browser level
await page.clock.setFixedTime(new Date('2024-01-01T00:00:00'));
```

Also: replace channel icons with the reference's own cropped icons, force the same channel set,
disable all animation (`animations: "disabled"` is Playwright's default), and apply a
determinism stylesheet via `stylePath` ([docs](https://playwright.dev/docs/docs/test-snapshots)).

**This is worth doing for the clock specifically**, because the clock is the one dynamic element
whose *typography* you most want to measure (it is the largest text in the frame at 12px ink
height), and you cannot measure typography through a mask. For channel icons — bitmap content you
were never going to recreate — masking is correct and forcing is wasted effort. **[synthesis]**

### 6.3 Structure-not-content comparison

Where content genuinely differs, compare *properties of the content* rather than the content:

- **Ink bounding box** — does your clock text occupy the same box as the reference's? Reference
  **[measured]**: rows 178–189, cols 184–261 → 78×12px, centred at x=222.5 (52.98% of width).
  Assert your rendered clock's ink box centre within ±0.5% and its height within ±1px. This works
  even though the strings differ.
- **Ink density** — fraction of dark pixels within the box. A weight/size proxy that is
  string-independent to first order.
- **Baseline position and cap height** — geometry, not glyphs.
- **Edge-IoU on the container, with the content region excluded** — validates the frame around the
  dynamic content.

### 6.4 Geometry-only comparison

When content is irreconcilable (Mii faces, photo thumbnails), drop to §5's edge-IoU on the tile
*chrome* with the tile *interior* masked. You are then asserting "the tile is the right size, in the
right place, with the right corners and border" and explicitly *not* asserting anything about its
contents. That is the correct scope of claim — say so in the test name.

---

## 7. Typography matching

The hardest category, and the one where measurement discipline pays off most, because it is where
"vibes" are most tempting and most wrong.

### 7.1 What you are up against

**[measured]** Glyph ink heights in the reference: clock 12px, date 13px (with descender), channel
labels 12px, button text 14px — all in a 236px-tall frame, so **glyph height is ~5% of frame
height**. The original used a proprietary face you cannot obtain.

### 7.2 The decomposition that makes this tractable

Separate typography into three independently measurable properties, ordered by how well you can
measure them **[synthesis, supported by the measurements below]**:

1. **Metrics** — size, line-height, tracking, and the resulting ink bounding box. **Fully
   recoverable**, ±0.5px, and it accounts for most of the perceived match. Measure the ink box, then
   binary-search your CSS `font-size` and `letter-spacing` until your box matches. Do this **first**
   — a correct face at the wrong size looks worse than a wrong face at the right size.
2. **Weight / color** — the optical density of the text block. **Recoverable** via ink density.
3. **Letterform identity** — the actual skeleton. **Partially recoverable**, and the thing you
   should give up on last and cap the weight of.

### 7.3 Choosing a substitute empirically

Render each candidate face at the reference's measured size, crop to the same ROI, and score against
the reference crop. Two confounds must be removed first, or you will measure the wrong thing:

- **Advance-width confound.** Different faces set the same string at different widths, so a
  whole-string comparison mostly measures tracking, not letterforms. **Normalise per-glyph:** crop
  each glyph to its ink box and resample to a fixed box.
- **Baseline/position confound.** Sub-pixel baseline differences crater SSIM (§3.3). Align on the
  ink-box centroid before scoring.

```python
def glyph_signature(font_path, ch, px, box=32):
    """Ink-normalized glyph raster: removes advance-width and position confounds."""
    S = max(px * 4, 32)
    im = Image.new("L", (S, S), 255)
    ImageDraw.Draw(im).text((S//2, S//2), ch,
                            font=ImageFont.truetype(font_path, px), fill=0, anchor="mm")
    a = 255 - np.asarray(im)
    ys, xs = np.where(a > 20)
    crop = Image.fromarray(np.asarray(im)[ys.min():ys.max()+1, xs.min():xs.max()+1])
    return np.asarray(crop.resize((box, box), Image.LANCZOS)).astype(float)
```

**[measured]** Pairwise SSIM between ink-normalised glyphs across 7 system faces (Trebuchet MS,
Arial, Tahoma, Verdana, Helvetica Neue, Optima, Helvetica):

| px | glyph | mean SSIM | min | max |
|---|---|---|---|---|
| 6 | a | 0.677 | 0.486 | 0.952 |
| 6 | g | 0.472 | −0.109 | 0.983 |
| **8** | **a** | **0.187** | −0.249 | 0.659 |
| 8 | e | 0.349 | −0.206 | 0.700 |
| 10 | a | 0.565 | 0.070 | 0.832 |
| 14 | a | 0.650 | 0.281 | 0.963 |
| 20 | a | 0.686 | 0.485 | 0.929 |
| 40 | a | 0.625 | 0.317 | 0.965 |

Three findings:

1. **Font discrimination is genuinely possible at this scale.** Between-font SSIM (0.19–0.69 mean)
   sits *far* below the ~0.987 measurement noise floor. Letterform choice is measurable, not a
   matter of taste.
2. **Discrimination is not monotone in size.** It peaks around 8–10px and *falls* at 6px (everything
   blurs toward the same gray blob) and at 40px (shared skeletons dominate). Since the reference's
   text is ~12px, you are near the usable band — but **render candidates at 8–10px for the
   *comparison*** even if you ship at a different size, because that's where the signal is.
   **[synthesis, from the measured curve]**
3. **The `max` column identifies metric-compatible clones.** Pairs scoring >0.95 (e.g. Helvetica vs.
   Arial) are genuinely interchangeable at this size — which means if your best candidate is within
   0.95 of another, stop optimising, you're at the resolution limit.

Choose the substitute by **lowest mean glyph distance across a representative character set**
(`a e g s R 2 0` — include a digit, since the clock is digits, and include `g` and `R` because their
skeletons vary most between faces).

**[measured]** Ink density as a stroke-weight proxy at 40px, glyph `a`:

```
Optima            0.387     ← humanist, low density
Helvetica         0.449
Trebuchet MS      0.486
Helvetica Neue    0.505
Arial             0.511
Tahoma            0.515
Verdana           0.526     ← wide, high density
```

This spans 0.387–0.526 and is **stable across sizes**, making it a robust weight-matching criterion
that survives the low resolution far better than letterform SSIM does. Match ink density to the
reference's measured density **first**, then break ties on glyph SSIM.

**[measured]** Reference ink densities to match against: clock block 288 ink px in a 78×12 box =
**0.308**; date 206 in 48×13 = **0.330**; "Photo Channel" label 247 in 64×12 = **0.321**. (These
are string-dependent, so compare like-for-like by rendering the *same string*.)

### 7.4 Reporting honesty

State the residual explicitly: *"Best available substitute is X; mean glyph SSIM against the
reference is 0.62; ink density matches within 0.01; metrics match within 0.4px. The remaining
letterform difference is at the resolution limit of a 12px reference."* That is a defensible
statement. "Looks close enough" is not. **[synthesis]**

---

## 8. Knowing when to stop

### 8.1 Define "close enough" numerically, before you start

Write the acceptance table first, then implement toward it. Proposed for this project, all
**[synthesis]** but anchored to the measured floors in §0.2 and §3:

| Property | Target | Rationale |
|---|---|---|
| Layout: ROI SSIM | ≥ 0.985 (harness floor 0.9907) | within noise of a perfect match |
| Layout: edge-IoU F1 (2px tol) | ≥ 0.95 | a 1-ref-px shift scores 0.63, so this is strict |
| Position of any measured element | within ±0.3% of frame dimension | ≈ ±1.3 ref px, ≈ your measurement accuracy |
| Color: ΔE2000 per token | ≤ 2.0 | ~1 JND; ΔE ≈ 2.3 is the JND ([color difference](https://en.wikipedia.org/wiki/Color_difference)) |
| Color: CIELAB histogram correlation | ≥ 0.99 (harness floor 0.9923) | at the floor |
| Whole-frame RMSE | ≤ 5.0 (harness floor 3.06) | floor + a small margin |
| Whole-frame diff% @ thr 0.1 | ≤ 6.0% (harness floor 3.86%) | floor + ~2% |
| SSIMULACRA2, if wired up | ≥ 70 | *"artifacts barely noticeable side-by-side"* ([ssimulacra2](https://github.com/cloudinary/ssimulacra2)) |
| Typography metrics (size, tracking, ink box) | within ±0.5px at reference scale | fully recoverable |
| Typography letterforms | **explicitly out of scope** — report the residual | not recoverable |

Note that **≥90 on SSIMULACRA2 ("visually lossless, undetectable in flicker tests") is the wrong
target** for a cross-renderer recreation and will burn unbounded effort. 70 is the honest bar.

### 8.2 Diminishing returns

Effort scales roughly with `1/(1−fidelity)` while perceived improvement scales with nothing much
past a point. **[synthesis]** Concrete stopping signals, in order of authority:

1. **You have hit the noise floor.** If your ROI's score is within the §0.2 floor of a perfect
   match, further work is measuring your resampler, not your CSS. **This is the hard stop.**
2. **The flicker test is clean.** Alternate render and reference at 2 Hz at reference scale; if you
   cannot see the element move or change, it is done. This is the criterion SSIMULACRA2's 90 is
   calibrated against, and it is free.
3. **The remaining error is smaller than the reference's own artifacts.** You cannot be more
   accurate than a ±5-level dither beat (§0.1). Any color work chasing <5 levels on a gradient is
   fitting noise.
4. **Two candidate fixes score within the metric's own variance** — pick either and move on.

### 8.3 Measurable vs. perceived fidelity

These diverge in both directions, and knowing which direction you're in tells you what to do:

- **High measured, low perceived.** The metric is averaging away a small, identity-critical error.
  **[measured]** the accent-hue error at whole-frame SSIM 0.9968 — literally better than the noise
  floor while being obviously wrong to a person. *Fix: more ROIs, smaller ROIs, veto conditions
  (§4).* If a human says it looks wrong and your numbers say it's fine, **your instrumentation is
  wrong, not the human.**
- **Low measured, high perceived.** Sub-pixel AA differences and resampling artifacts wrecking the
  score on something a person cannot see. **[measured]** an identical image scoring 3.51% pixel diff
  and 0.9686 SSIM under bilinear. *Fix: subtract the floor, enable AA detection, raise thresholds to
  calibrated values.* Chasing this is the single largest waste of effort available in this project.

The purpose of all the above is to make the two agree. A measurement system that a person disagrees
with is worse than no measurement system, because it is confidently wrong and it will direct effort
at the wrong things.

---

## Appendix: minimal reproducible harness

```python
"""Score a render against reference_screen.png. Requires: numpy pillow scikit-image scipy"""
import numpy as np
from PIL import Image
from skimage.metrics import structural_similarity as ssim

REF_PATH, K = "reference_screen.png", 4          # render at 1680x944
REF = Image.open(REF_PATH).convert("RGB")
RW, RH = REF.size

def srgb_to_linear(v):
    v = v / 255.0
    return np.where(v <= 0.04045, v / 12.92, ((v + 0.055) / 1.055) ** 2.4)

def linear_to_srgb(y):
    return np.clip(np.where(y <= 0.0031308, y * 12.92,
                            1.055 * y ** (1/2.4) - 0.055), 0, 1) * 255

def normalize(render_img):
    """Gamma-correct exact integer box downscale to reference size."""
    a = np.asarray(render_img.convert("RGB")).astype(np.float64)
    assert a.shape[:2] == (RH*K, RW*K), f"render must be {RW*K}x{RH*K}"
    lin = srgb_to_linear(a).reshape(RH, K, RW, K, 3).mean(axis=(1, 3))
    return linear_to_srgb(lin)

def score(render_img, roi=None):
    A, B = normalize(render_img), np.asarray(REF).astype(np.float64)
    if roi:
        x, y, w, h = roi
        sl = (slice(round(y*RH), round((y+h)*RH)), slice(round(x*RW), round((x+w)*RW)))
        A, B = A[sl], B[sl]
    ga, gb = A.mean(2), B.mean(2)
    ha = np.histogram(ga, 64, (0, 255))[0].astype(float); ha /= ha.sum()
    hb = np.histogram(gb, 64, (0, 255))[0].astype(float); hb /= hb.sum()
    return {
        "rmse":     float(np.sqrt(((A - B) ** 2).mean())),
        "diff_pct": float(100 * np.mean(np.abs(A - B).max(2) > 8)),
        "ssim":     float(ssim(ga, gb, data_range=255, gaussian_weights=True,
                               sigma=1.5, use_sample_covariance=False)),
        "hist_corr": float(np.corrcoef(ha, hb)[0, 1]),
    }

def calibrate():
    """MANDATORY first run: establishes the noise floor for your exact pipeline."""
    return score(REF.resize((RW*K, RH*K), Image.LANCZOS))
```

**[measured]** Verified output of this exact harness on this repo's reference at `K=4`:

```
calibrate() -> {'rmse': 3.061, 'diff_pct': 3.864, 'ssim': 0.99075, 'hist_corr': 0.99226}
ROI accent_curve -> {'rmse': 2.424, 'diff_pct': 4.163, 'ssim': 0.99507, 'hist_corr': 0.99261}
```

Note this floor differs from §0.2's table (`rmse 2.96, ssim 0.9874`) — the table used a
gamma-*naive* Lanczos downscale, the harness uses the gamma-*correct* box downscale from §2.3. The
gamma-correct path yields a **higher SSIM floor (0.9907 vs 0.9874)** and therefore more headroom to
detect real errors. That is §1.1's gamma pitfall showing up as a measurable improvement in the
metric itself, and it is a further reason to use integer-scale gamma-correct downscaling. Where the
two differ, **the harness numbers above are the ones to calibrate against**, since they come from
the pipeline you will actually run.

**Run `calibrate()` first, and re-run it whenever `K`, the filter, or the reference changes.**
Every threshold in this document is relative to its output.

---

## Sources

- [scikit-image metrics API](https://scikit-image.org/docs/stable/api/skimage.metrics.html) — SSIM/MSE/NRMSE/PSNR signatures, Wang et al. reproduction settings
- [Structural similarity index measure](https://en.wikipedia.org/wiki/Structural_similarity_index_measure) — SSIM formula, constants, MS-SSIM, DSSIM, documented limitations
- [pixelmatch](https://github.com/mapbox/pixelmatch) — OKLab HyAB color metric, threshold semantics, anti-aliasing detection
- [Playwright screenshot assertions](https://playwright.dev/docs/api/class-pageassertions#page-assertions-to-have-screenshot-1) — threshold (YIQ, default 0.2), maxDiffPixelRatio, mask/maskColor, animations, scale, clip
- [Playwright visual comparisons guide](https://playwright.dev/docs/test-snapshots) — stylePath determinism
- [LPIPS project page](https://richzhang.github.io/PerceptualSimilarity/) and [arXiv:1801.03924](http://arxiv.org/abs/1801.03924) — deep features vs. PSNR/SSIM
- [lpips on PyPI](https://pypi.org/project/lpips/) — API, [-1,1] input range, higher = more different
- [google/butteraugli](https://github.com/google/butteraugli) — psychovisual model, quality-range caveat
- [cloudinary/ssimulacra2](https://github.com/cloudinary/ssimulacra2) — XYB, six scales, 100/90/70/50 scale, correlation vs. MS-SSIM and Butteraugli
- [kornelski/dssim](https://github.com/kornelski/dssim) — L\*a\*b\*, multi-scale, linear-light scaling
- [OpenCV histogram comparison](https://docs.opencv.org/4.x/d8/dc8/tutorial_histogram_comparison.html) — correlation/chi-square/intersection/Bhattacharyya formulas and perfect-match values
- [Color difference](https://en.wikipedia.org/wiki/Color_difference) — CIE76/CIE94/CIEDE2000, ΔE ≈ 2.3 JND
- [Pillow filters](https://pillow.readthedocs.io/en/stable/handbook/concepts.html#filters) — NEAREST/BOX/BILINEAR/HAMMING/BICUBIC/LANCZOS, downscale/upscale rankings
