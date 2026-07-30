# Component deep-dive: the bottom-bar "half-pill" platforms

Scope: the capsule-shaped plate that sits beneath the round **Wii button** (bottom-left) and
the round **Message Board / envelope button** (bottom-right) in the Wii Menu's bottom bar —
flat/squared-off at the screen edge, rounded on the side facing screen centre. The project's
current code models these as `.bar-left` / `.bar-right` in
`/Users/brunoneira/orchids-projects/wiimenu-website/src/components/BottomBar.css`.

No other doc in `context/` describes this element. `context/system-ui.md` inventories *what* is
in the bottom bar (Wii button, Message Board, SD Card Menu) but says nothing about the chrome
behind them.

---

> ⚠️ **Read the 2026-07-30 ADDENDUM (§A) first.** It supersedes §0's "the interior is darker"
> framing, §4a's tint speculation, §11's geometry table, and the rim alpha quoted below. The short
> version: the darkening is the layout's **drop-shadow copy**, not a tint — there is no tint — and
> the shipped geometry is a **92 × 120.4 stage px** capsule. §2, §5, §6 and §8 are unaffected.

## 0. Verdict, up front

**The half-pills are real.** They are visible in `reference_screen.png` as a closed, capsule-shaped
outline on both sides of the bar, and the shape's geometry is measurable to sub-pixel precision.
The project's `border-radius: 0 9999px 9999px 0` reading of the *shape* is correct.

**But the project's reading of the *fill* is wrong.** They are not lighter-coloured plates. The
interior of each half-pill is ~1.5 % **darker** than the surrounding bar at the same height, and
it continues the bar's own vertical gradient rather than being a flat fill. What makes the shape
visible is a soft dark **outline**, not a tonal fill difference. Replacing `background: #d3d4db`
with a flat lighter plate over-states the effect by roughly an order of magnitude.

**Nintendo's own texture for this element has been located** and confirms it outright: the asset
is an **alpha mask with a 54 %-opacity rim and a 7 %-opacity interior** — an outline, with
essentially nothing inside. See §4a.

---

## 1. Sources and how they are tiered

| Tag | Meaning | Sources used here |
|---|---|---|
| **[Direct observation]** | Sub-pixel measurement of this repo's `reference_screen.png` (420×236, System Menu 4.x — the SD Card icon is present). Method described in §10. | `/Users/brunoneira/orchids-projects/wiimenu-website/reference_screen.png` |
| **[Direct observation — hi-res]** | Same analysis re-run on a **1096×600** Dolphin capture (2.6× the reference), which independently reproduces every number below | og:image of https://www.deviantart.com/da-namcocraftxp/art/DANCXP-s-Japan-Wii-Menu-Screenshot-Normal-1129708426 (signed/expiring direct URL; re-derive from the page) |
| **[Texture rip]** | **Nintendo's actual texture asset**, dumped from the console via Dolphin. The strongest evidence in this doc — it is the source art, not a reconstruction. | `Alan-bur/WM4K` ("Official Wii Menu 4K Texture Pack"): https://github.com/Alan-bur/WM4K — file `0000000100000002/USA/Wii Menu/tex1_64x128_dc71b0c57d1424ff_2.png` (LFS; raw base `https://media.githubusercontent.com/media/Alan-bur/WM4K/main/...`, branch must be `main`) |
| **[Official]** | Nintendo-authored | Wii Operations Manual — Channels & Settings, scanned + OCR'd: https://archive.org/details/wii-opmanual-chset (text: https://archive.org/download/wii-opmanual-chset/WiiRVKChEng_djvu.txt) |
| **[Decomp]** | Fan decompilation of Nintendo's own System Menu binary — Nintendo's logic, symbol-for-symbol | `koopthekoopa/wii-ipl`: https://github.com/koopthekoopa/wii-ipl — specifically `src/scene/button/iplButton.cpp` and `include/scene/button/iplButton.h` |
| **[Fan/community]** | Wikis, fan documentation | https://wiibrew.org/wiki/System_Menu |
| **[Inferred]** | My reasoning on top of the above | — |

**Evidence quality.** Originally I rated this thin — a single 420 px capture. It is no longer
thin: the geometry is confirmed at 2.6× resolution on an independent screenshot, and **the actual
Nintendo texture for this element has been located** (§4a). What remains genuinely unverified is
only the pre-4.0 history (§9). **No textual source anywhere — official or fan — names or
describes this element**; it is drawn in the Operations Manual's Wii Menu diagram but never
labelled.

---

## 2. Do they exist? (Yes — here's the proof)

**[Direct observation]** Subtracting a "bare bar" reference column from the bottom-left and
bottom-right regions of `reference_screen.png` reveals a closed outline on each side:

- A **flat horizontal dark line at y = 224–225**, running from the screen edge inward,
  approximately −17/255 green relative to the bar at the same row. It stops abruptly:
  present for x = 0…49 on the left, x = 378…419 on the right, and is *exactly 0* everywhere
  in between. A shading gradient cannot do that; only a bounded shape can.
- A **matching flat dark line at y ≈ 179–180**, ~−11/255, over the same horizontal spans.
- A **semicircular arc** joining the two lines, bulging toward screen centre. Traced point by
  point it fits a circle of radius ≈ 22.7 px to within ~1 px over 40+ rows — i.e. exactly half
  the distance between the two flat lines. It is therefore a **true capsule cap** (`r = h/2`),
  not an arbitrary rounded corner.
- The stroke darkness of the arc (−17/−18) matches the flat lines exactly, and is clearly
  distinct from the button's own ring/shadow (−24…−28). They are one continuous stroke.

**[Direct observation]** This is *not* a misreading of the button's drop shadow: the flat portions
run all the way to the screen edge, ~40 px past the button, at constant darkness.

So: `.bar-left` / `.bar-right` are a **correct discovery**, not an invention. The shape language
(`0 9999px 9999px 0`) is right.

---

## 3. Exact geometry

All figures in the 420 × 236 reference frame. In that frame the bar's cyan groove line sits at
**y = 171** at the screen edges, so **bar height = 65 px = 27.5 % of screen height** (matching the
`27.59%` already in `BottomBar.css`).

### 3a. Raw measurement (the visible outline)

| | Left | Right |
|---|---|---|
| Horizontal span | x 0 → 64.5 | x 361.5 → 420 |
| Width | 64.5 px (**15.4 %** of screen width) | 58.5 px (**13.9 %** of screen width) |
| Top edge | y ≈ 179 | y ≈ 178.5 |
| Bottom edge | y ≈ 224.5 | y ≈ 224.5 |
| Height | 45.0 px | 45.5 px |
| Cap radius | ≈ 22.5 px | ≈ 22.75 px |

### 3b. Resolving the apparent asymmetry — the outline is a shadow

**[Direct observation]** The raw left pill is ~6 px wider than the right, which is suspicious
because *everything else in the frame is mirror-symmetric to within 0.06 px* — a sub-pixel
centroid trace of the bar's cyan contour across all 420 columns mirrors about x = 209.5 with a
maximum deviation of 0.06 px, and the two buttons' centres sit 38.0 px and 38.5 px from their
respective screen edges.

The asymmetry resolves cleanly: on **both** sides the capsule cap's centre sits **+3 px in x**
relative to its button's centre (left: cap 41.3 vs button 38.0; right: cap 384.5 vs button 381.5),
and the outline's vertical centre sits **+3.4 px in y** relative to the buttons' centre (y 202 vs
y 198.5). A uniform (+3, +3) offset in the same absolute screen direction on both sides is the
signature of a **drop shadow / offset outline**, not a geometry difference. Undo the offset and
both sides give the same underlying shape:

- left: 64.5 − 3 = 61.5 px half-width
- right: 58.5 + 3 = 61.5 px half-width

### 3c. Recommended canonical geometry (offset removed)

**[Inferred, from direct observation]**

| Property | Value | As a fraction |
|---|---|---|
| Width (from screen edge inward) | 61.5 px | **14.6 % of screen width** |
| Height | 45.5 px | **70 % of bar height** (19.3 % of screen height) |
| Corner radius | 22.75 px | **exactly half the height** → full capsule cap |
| Top edge | y ≈ 176 | **7.7 % of bar height** below the bar's top contour |
| Bottom edge | y ≈ 221.5 | leaves a **22.3 % of bar height** gap to the screen bottom |
| Vertical centre | y ≈ 198.75 | 42.7 % down the bar — **concentric with the button** |
| Drop-shadow offset | (+3, +3) px | ≈ +0.7 % of screen width, +4.6 % of bar height |

**Important:** the pill is **not** vertically centred in the bar. It hangs high — 7.7 % gap above,
22.3 % gap below. This is the single most commonly-mis-set value.

### 3d. Where the button sits inside it

**[Direct observation]** The buttons' outer cyan rings measure:

- Wii button: x 19–57, y 179–218 → Ø ≈ 39 px, centre (38.0, 198.5)
- Mail button: x 362–401, y 178–219 → Ø ≈ 40 px, centre (381.5, 198.5)

Relative to the canonical pill:

- The button is **exactly concentric with the capsule cap** (button centre x 38.0 vs cap centre
  x 38.75 — within measurement error).
- Button diameter = **~86 % of the pill's height**. Only a ~3.3 px ring of pill (≈ 7 % of pill
  height) shows around the button's outer edge on the cap side.
- The button is **vertically centred** in the pill: 3.0 px clearance above, 3.5 px below.
- Along the flat axis the button is pushed **away from the screen edge**: 19 px of bare pill
  between the screen edge and the button (≈ 31 % of pill width), vs ~3.5 px on the cap side.

This is mirrored exactly left/right.

---

### 3e. Independently confirmed at 2.6× resolution

**[Direct observation — hi-res]** The whole analysis was re-run on a 1096×600 capture. Every
figure reproduces:

| Quantity | 420×236 reference | 1096×600 capture | Agreement |
|---|---|---|---|
| Bar height | 65 px = 27.5 % of screen | 165 px = 27.5 % | exact |
| Outline bottom edge | 82.3 % of bar height | y 571.5 → 83.3 % | ±1 pp |
| Outline top edge | 13.1 % | y 456 → 13.3 % | ±0.2 pp |
| Outline height | 45 px | 115.5 px | — |
| **Pill height** | **70.0 % of bar height** | **115.5 / 165 = 70.0 %** | **exact** |
| **Pill width** | **14.6 % of screen width** | **157.75 / 1096 = 14.4 %** | ±0.2 pp |
| Cap radius = half height | yes | 57.75 = 115.5/2 | exact |
| Shadow offset | (+3, +3.4) px | (+11.3, +8.8) px = (+2.9, +3.4) at 420-scale | matches |
| Button Ø ÷ pill height | 86 % | 100 / 115.5 = 86.6 % | ±0.6 pp |
| Faint second band above top edge | y 175.5 → 6.9 % | y 448 → 8.5 % | ✓ (this is the shape's own edge; §3b) |

The hi-res capture also **independently validates the shadow-offset model of §3b**: subtracting the
measured (+11, +9) px offset from the outline puts the shape's top edge at y ≈ 447 — and there is
a real, weaker dark band measured at y = 448. The shape and its shadow are both visible at this
resolution.

---

## 4. Colour and fill — the part the current code gets wrong

**[Direct observation]** Sampling the pill interior against the bar at the *same y* and the *same
bar-top contour height* (left pill columns x 0–18 vs bar column x 66–72, both of which sit under
the flat y = 171 section of the groove):

| y | Pill interior | Bar at same y | Delta |
|---|---|---|---|
| 185 | `#cdcdd2` (205,205,210) | `#cecfd3` (206,206,211) | −1 |
| 200 | `#d7d7db` (215,215,219) | `#dbdbe0` (219,219,224) | −4 |
| 213 | `#d2d3d9` (210,211,217) | `#d5d6dd` (213,214,221) | −3 |
| 219 | `#d0d1d7` (208,209,215) | `#d3d4db` (211,212,219) | −3 |

Cross-checked against a **second, independent** bare-bar reference column on the opposite side of
the frame (x = 344–350, also under the flat y = 171 contour, outside the right pill): the two
models agree, and the deltas reproduce (−1.8, −2.4, −3.4, −4.0, −4.0, −3.0, −3.0 at y = 185, 195,
200, 205, 210, 215, 219). Note also that the left and right pill interiors are **pixel-identical**
at every sampled row (203 / 214 / 215 / 213 / 212 / 211 / 209), which is further confirmation that
the two plates are the same shape mirrored. [Direct observation]

**Re-measured on the 1096×600 capture** with two independent bare-bar reference columns (x 178–192
and x 912–928, both under the flat top contour, both outside the pills) — same answer, and the
left and right pill interiors are again pixel-identical:

| y | Pill (x=10) | Pill (x=1086) | Bare bar (x=185) | Bare bar (x=920) |
|---|---|---|---|---|
| 470 | 202 | 202 | 204 | 205 |
| 490 | 212 | 212 | 215 | 216 |
| 510 | 215 | 215 | 218 | 219 |
| 530 | 212 | 212 | 216 | 216 |
| 550 | 211 | 211 | 214 | 214 |

> **⚠ Contested finding — resolved.** A parallel research pass on the same 1096×600 image reported
> the opposite: interior **+19 lighter** at y = 460, +15 at 480, +7 at 500, ~0 by 540. That reading
> is an artifact of **comparing against a column at the same row but a different bar-top contour**.
> The bar's shading is anchored to its top edge, which sits at y ≈ 434 at the screen edges but
> y ≈ 499 at screen centre — a 65 px difference. Sampling a mid-screen column at y = 460 lands
> *above the bar entirely* or in its dark sub-groove band, manufacturing a large spurious positive
> delta. The tell-tale is the reported profile itself: +19 → +15 → +7 → 0 **decaying with depth**
> is exactly how a contour-misalignment confound washes out, whereas a real fill difference would
> hold roughly constant. Controlling for the contour (as above) gives a flat −2 to −4 at every
> depth, on both sides, in both captures. **The texture rip in §4a settles it independently: the
> interior has 7 % alpha and cannot be a bright plate.**

So:

- **The interior is ~1.5 % DARKER than the bar, not lighter.** [Direct observation]
- **The interior is not flat.** It tracks the bar's own vertical gradient step for step — the pill
  interior brightens and dims in lockstep with the surrounding bar, offset by a near-constant
  −3/255. Modelling it as a flat `background: #d3d4db` is wrong; if you fill it at all, fill it
  with the same gradient the bar uses, nudged ~1.5 % darker. [Direct observation]
- **The shape is carried entirely by its outline.** Darkest outline pixel: `#c0c1c8` (192,193,200)
  vs `#d1d2da` (209,210,218) for the bar at that row — about **8 % darker**, ~2 px thick, soft
  (antialiased over ~2 more px). [Direct observation]
- There is a faint **highlight band immediately above the top edge** (≈ +6/255, e.g. `#b9bbbf`
  where the bar reads `#b3b4b9`), 1–2 px tall, running the pill's full width. [Direct observation]
- Directly **below** the bottom outline the tone returns to *exactly* the bar's value (delta = 0
  for every column, y ≥ 226). There is no outer glow on the bottom side. [Direct observation]
- **No cyan.** Unlike the bar's top contour and the buttons' rims, the pill outline carries no
  blue accent — it is a pure neutral grey darkening. [Direct observation]

### 4a. The actual Nintendo texture — decisive

**[Texture rip]** `tex1_64x128_dc71b0c57d1424ff_2.png` in the WM4K dump is this element. The
filename encodes the **native size: 64 × 128 texels**; the shipped file is a 512×1024 8× upscale.
Decoded:

- **Silhouette**: a capsule — semicircular cap on one side, **flat exactly at the texture's own
  edge** on the other. Native opaque extent ≈ **63 px wide × 92 px tall**. The flat edge sitting
  precisely on the texture boundary is the giveaway that it is authored for **edge clamping** —
  i.e. designed to be stretched to a screen edge.
- **The cap is a true circle in texture space**, radius ≈ 46 = half the height. Verified: at 6 px
  down from the top the silhouette starts at x ≈ 24.6, and a circle of r = 46 centred at (47, 64)
  predicts x = 24.3.
- **RGB is flat ≈ 222 across the entire texture.** All shape information lives in the **alpha
  channel** — this is a white/grey alpha mask that the layout tints, the standard nw4r authoring
  pattern.
- **Alpha profile — this is the key finding:**
  - **rim: 137/255 (54 %)**, ~2 native px thick, running the cap *and* both straight edges
  - **interior: 18/255 (7 %)** — a whisper
  - max alpha anywhere in the file: 137. There is no solid fill at all.

**This is asset-level proof of §4's conclusion**: the half-pill is a **rim-defined shape with an
essentially transparent interior**. Nintendo drew an outline, not a plate. Any implementation that
fills it with a solid colour is reproducing something that does not exist in the source art.

**Scale check, which ties the texture to the screen** [Texture rip + Direct observation — hi-res]:
at uniform scale s, native height 92 × s = on-screen 115.5 → **s = 1.255**. The texture's cap
radius 46 × 1.255 = **57.7**, versus the **57.75** measured on screen. Exact. The pane is drawn at
uniform scale with the flat end clamped/stretched out to the screen edge — which is why the cap
stays perfectly circular on screen even though the pill is much wider than the texture.

**One honest tension** [Inferred]: the texture's RGB is 222 (light), yet on screen the interior
reads ~3 levels *darker* than the bar and the rim reads ~17 darker. A 7 %-alpha 222 grey over a
215 bar would change it by well under 1 level, and a 54 %-alpha 222 grey over a 210 bar would
*brighten* it by ~6. So the layout pane must apply a **darker vertex-colour tint** to this mask
(routine for nw4r layouts — the texture supplies the shape, the layout supplies the colour). The
tint value is not recoverable from the texture; it lives in `my_IplTop_e.brlyt` on NAND. The
empirical on-screen result is what §4 measures, and that is what to implement.

### Reading of the lighting

**[Inferred]** Combining the (+3, +3) offset, the highlight above the top edge, the heaviest
stroke along the bottom and outer cap, and the marginally darker interior: this reads as a
**shallow recessed capsule slot cut into the bar** — the same "trough" language as the bar's own
cyan-lipped top contour — with the round button seated in it. It does **not** read as a raised
lighter plate sitting on top of the bar. It is genuinely subtle: at 1× on a CRT it is barely
perceptible, which is presumably why no source ever documented it.

Note a related correction that affects how the pill reads: the current SVG bar gradient in
`BottomBar.jsx` runs `#d3d4db` (top) → `#acafb7` (bottom), i.e. light-to-dark. The real bar runs
**dark → light → slightly dark**: ~`#b3b5b9` just under the cyan groove, peaking ~`#dbdbe0` about
a third of the way down, easing to ~`#cdcfd7` at the very bottom edge. [Direct observation] With
the current inverted gradient, a flat `#d3d4db` pill will read as a *bright* plate against a dark
lower bar — the opposite of the reference.

---

## 5. Purpose / semantics — decorative, not a hit target

**[Decomp]** `Button::create()` in
[`src/scene/button/iplButton.cpp`](https://github.com/koopthekoopa/wii-ipl/blob/main/src/scene/button/iplButton.cpp)
calls `mpGui->setAllComponentTriggerTarget(false)` and then explicitly re-enables trigger targets
for exactly eleven named panes:

```
"B_Bbs", "B_Ch", "B_Set", "B_Cal", "B_Add", "B_CalExit",
"B_AddExit", "B_Add_R", "B_Dust", "B_ArwR", "B_ArwL"
```

plus `"B_Stop"` (the Opt-Out button) and the separate `SDMenuButton` object. `B_Set` is the Wii
button (Wii Settings / Data Management) and `B_Bbs` is the Message Board button. **The half-pill
has no name in the code at all**, which means it is a plain picture pane in the layout file
(`my_IplTop_e.brlyt`, packed in `cmnBtn.ash`) and never becomes a pointer target.

**Conclusion:** the half-pills are **purely decorative framing**. They are not an enlarged hit
area, not a "tray" with behaviour, and they carry no hover/select animation of their own — the
per-button animation groups (`G_Set`, `G_Bbs`, …) are bound to the buttons, not to the plate.
[Decomp, strong]

**Implication for `BottomBar.css`:** `.bar-left` / `.bar-right` currently set
`pointer-events: all`, which makes the entire plate clickable. That is wrong — only the round
button should be. Set the plate to `pointer-events: none` and let the `<button>` own its hit area.

---

## 6. Do they reach the screen edge?

**Yes, flush to the edge, with no margin.** [Direct observation] At x = 0 (and x = 419) the
pill's top line, bottom line and interior tone are all present at full strength — the outline
values at x = 0 are pixel-identical to those at x = 20. There is no vertical stroke closing the
shape at the screen edge and no gap. The shape is a capsule that has been clipped by the frame,
exactly as `border-radius: 0 9999px 9999px 0` with `left: 0` produces.

**Caveat [Inferred]:** the Wii rendered into a TV overscan area, so "flush to the frame" in this
capture may mean "runs off the edge of the safe area" on real hardware. Either way, for a browser
recreation, flush to `left: 0` / `right: 0` is the correct behaviour.

---

## 7. Are they symmetric?

**Yes — the underlying shapes are mirror-symmetric.** [Direct observation] See §3b. The raw
outlines differ by ~6 px, but that difference is fully explained by a uniform (+3, +3) px
shadow offset applied in absolute screen coordinates on both sides, which lengthens the left
pill's visible outline and shortens the right's. Removing it gives 61.5 px on both sides.

Corroborating symmetry evidence in the same frame: the bar's cyan contour mirrors about
x = 209.5 to within 0.06 px across all 420 columns, and the two buttons sit 38.0 px / 38.5 px
from their respective screen edges. [Direct observation]

**Implementation note:** if you reproduce the shadow, offset it in absolute screen direction
(down-and-right) on *both* pills — do not mirror the shadow. If you skip the shadow, make the
two pills exact mirrors.

---

## 8. The SD Card Menu icon does NOT share the left half-pill

This is unambiguous. [Direct observation]

- SD Card icon bounding box: **x 79–94, y 196–219** (16 × 24 px), centre (86.5, 207.5).
- The left half-pill's outermost point is **x = 64.5**. The gap between them is **~15 px**
  (3.5 % of screen width) of bare bar.
- There is **no outline of any kind around the SD icon**. Rows y = 220 → 232 across x = 66 → 108
  measure delta = **exactly 0** against the bar reference for every column — no bottom line, no
  cap, no plate. It sits bare on the bar.
- It is also positioned differently from the Wii button: **9 px lower** (centre y 207.5 vs 198.5)
  and far smaller (24 px tall vs the button's 39 px). It is not aligned to the pill's vertical
  centre either.

**Corroboration [Official]:** the Wii Operations Manual's annotated Wii Menu diagram gives
*"SD Card Menu"* its own callout, separate from *"Wii Settings and Data Management"* (the Wii
button). Nintendo treated them as two independent elements, not one grouped control.
(https://archive.org/download/wii-opmanual-chset/WiiRVKChEng_djvu.txt)

**Corroboration [Decomp]:** the SD button is a distinct `SDMenuButton` class with its own layout
object, its own balloon, and its own animation set (`IDANIM_SD_BUTTON_BTN_IN`,
`IDANIM_SD_BUTTON_INSERT`, …), created separately via `mSdMenuBtn.create(...)` — and it is skipped
entirely in safe mode (`if (!System::isSafeMode()) mSdMenuBtn.calc();`). It is a bolt-on, not part
of the left cluster's chrome. (https://github.com/koopthekoopa/wii-ipl)

**So compose the left side as:** half-pill → Wii button inside it → SD Card icon *outside and to
the right of* it, sitting directly on the bar, lower and smaller.

---

## 9. Version differences — honest gap

**[Gap / unresolved]** I could not verify when the half-pills first appeared.

What is known:

- `reference_screen.png` is a **System Menu 4.x** capture (the SD Card Menu icon is present, which
  arrived in 4.0 / 2009 — [WiiBrew System Menu](https://wiibrew.org/wiki/System_Menu)). Everything
  measured above describes 4.x. [Direct observation + Fan/community]
- **[Inferred, moderate confidence]** The pill almost certainly predates 4.0. It lives in the base
  bottom-bar layout `my_IplTop_e.brlyt` (packed in `cmnBtn.ash`) alongside `B_Set` and `B_Bbs`,
  whereas the 4.0-era SD button was added as a *separate* layout object. Nothing about the pill is
  tied to SD-card functionality, and it frames both the launch-era buttons.
- **[Gap]** The WM4K texture dump (§4a) is also from a 4.x console, so it does not settle the
  history either — it only proves the element is a real, first-party asset.
- **[Gap]** I was unable to confirm this against a pre-4.0 screenshot. A launch-era (2006, System
  Menu 1.0) capture, or a 2.x/3.x capture, would settle it in one glance — look for the flat dark
  line running from the screen edge to just past the Wii button, at roughly 70 % of the bar's
  height. If it's there, nothing changed.
- **[Gap]** Whether the pill differs between 4:3 and 16:9 output. `reference_screen.png` is a 16:9
  (420 × 236) frame. The Wii Menu rescales horizontally between modes, so a 4:3 capture would very
  likely give a different *percentage* width. Treat the 14.6 %-of-width figure as **16:9-specific**.

**Also unresolved [Gap]:** whether the pill animates. The decomp shows no animation group bound to
it, and it isn't a trigger target (§5), so it is almost certainly static — but the animation
*contents* live in `my_IplTop_e.brlan` on NAND, which the decomp does not (and legally cannot)
ship, so this cannot be proven from source.

**Also unresolved [Gap]:** no textual source names this element. The Wii Operations Manual's Wii
Menu diagram labels only *Current Time*, *Wii Settings and Data Management*, *SD Card Menu*,
*Wii Channels*, *Current Date*, *Wii Message Board* — nothing structural about the bar or any
panel behind the buttons. [Official, verified] Fan wikis (WiiBrew, Wikipedia) describe the bar's
*contents*, never its chrome. It has no name. Calling it a "half-pill" in this codebase is our
own coinage.

---

## 10. Measurement method (so this is reproducible / falsifiable)

**[Direct observation]** All numbers above come from `reference_screen.png` (420 × 236, RGB, PNG,
no visible compression artifacts) analysed as follows:

1. **Background model.** For the bottom-left/right regions, the bar's shading is anchored to its
   top contour, which is flat at y = 171 for x < ~72 and x > ~348. Column x = 68–72 sits under
   that flat section and *outside* the left pill, so it is a valid "bare bar" reference for the
   whole flat-top region. Difference image `d(x,y) = G(x,y) − G_model(y)` isolates the pill.
2. **Edge tracing.** For each row, the arc position was taken as the local minimum of `d` outside
   the button's cyan ring, then least-squares checked against a circle. Fit residual < 1 px over
   40 rows.
3. **Symmetry check.** Sub-pixel centroid of the cyan contour (`B − R` channel weighted) per
   column, mirrored about x = 209.5. Max deviation 0.06 px — the frame is not skewed or cropped
   asymmetrically, so the measured left/right pill difference is a real feature of the render,
   which §3b then explains as a shadow offset.
4. **Button bounds.** Cyan ring detected via `(B − R) > 40 AND B > 200`, per-row min/max x.
5. Only the **green channel** was used for tonal comparisons; the bar is near-neutral (R≈G, B
   ≈ G+5) so this loses nothing.

Anyone can re-run this with PIL/NumPy against the same file.

**The single most important methodological point**, and the one that produced a contradictory
result on the first parallel attempt (§4): **the bar's vertical shading is anchored to its curved
top contour, not to the frame.** The contour sits ~65 px higher at the screen edges than at screen
centre (in the 1096-wide capture). Any tonal comparison must use a reference column whose top
contour is at the *same* height as the pill's — i.e. a column in the flat-topped region near the
screen edge but horizontally clear of the pill. Comparing "same row, mid-screen column" produces
a large spurious *positive* delta that decays with depth.

### Sources that turned out NOT to help

- **The Wii Operations Manual's Wii Menu diagram** renders the screen at only ~530 px wide inside
  a 4961 px page scan — the platform is visibly *drawn* but far too small to measure, and it is
  never labelled. Useful as a naming source only. [Official]
- **textures-resource.com / spriters-resource.com** have no Wii System Menu section at all
  (404/403). [Fan/community]
- **`andrewplus/Wii.JS`**, the best-known CSS/JS Wii Menu recreation, **omits the platform
  entirely** — its `assets/images/wii-button.png` / `mail-button.png` are bare orbs and
  `bottom-bg.png` is a plain 9×219 gradient strip. Do not use it as a fidelity reference for this
  detail. [Fan/community]

---

## 11. Concrete corrections to `BottomBar.css`

Current `.bar-left` / `.bar-right`, measured against §3c:

| Property | Current | Measured | Verdict |
|---|---|---|---|
| `width` | `15.64%` | 14.6 % | slightly wide (~1 pp) |
| `top` (within bar) | `8.55%` | 7.7 % | close enough |
| `height` (of bar) | `76.07%` | 70 % | **~6 pp too tall** — bottom edge sits too low |
| `border-radius` | `0 9999px 9999px 0` | `r = h/2` exactly | **correct** |
| flush to edge | `left: 0` / `right: 0` | flush | **correct** |
| `background` | flat `#d3d4db` (lighter) | bar gradient, ~1.5 % **darker**, carried by a soft outline | **wrong direction** |
| `pointer-events` | `all` | decorative only | **wrong** — should be `none` |
| button size | `height: 77.75%` of pill | ~86 % of pill height | too small |
| button position | offset within pill | concentric with the cap, vertically centred | mostly right |

Suggested shape of the fix (not applied — this is a research doc):

- Keep the capsule geometry; set `height: 70%`, `width: 14.6%`.
- **Drop the fill entirely** and render the pill as an outline. This is not a stylistic
  preference — Nintendo's texture is a 54 %-alpha rim around a 7 %-alpha interior (§4a). The
  faithful CSS is roughly:
  - a **1–2 px border** (scaled: the rim is ~2 native texels of a 92-texel-tall shape, so
    ≈ 1.7 % of the pill's height) in a colour ~8 % darker than the local bar tone;
  - a **barely-there interior darkening** of ~1.5 % — or `transparent`, which is within a level
    or two of correct and simpler;
  - a **1 px lighter hairline just above** the top edge.
- If you keep a fill for simplicity, derive it from the bar gradient rather than hard-coding a
  flat hex, and darken rather than lighten.
- Add the (+0.7 % x, +4.6 % of bar height y) offset on the outline if you want the exact look;
  offset in the same absolute direction on both sides, not mirrored.
- `pointer-events: none` on the plate.

---

## ADDENDUM — 2026-07-30: the composite is solved, and §4a's "honest tension" was a false alarm

Written during the `bruno/buttons-half-pill` branch, prompted by the observation that the pills
read wrong in our build and are missing a visible **railing**. Measured on the 1096×600 capture
(re-downloaded; §1's og:image link still resolves) plus `reference_screen.png`.

**This addendum supersedes §4's "the interior is darker" framing, §4a's tint speculation, and
§11's geometry table.** Nothing in §2, §5, §6 or §8 changes.

### A.1 The one thing that was actually wrong

§4a flagged a contradiction it could not resolve: the texture is a *light* (RGB ≈ 222) alpha mask
tinted pure white by the layout (§8.4), yet the shape reads *darker* than the bar on screen. It
guessed at an unrecoverable "darker vertex-colour tint".

**There is no tint.** The darkening is the **drop-shadow copy** that §8.3 found in the layout
bytes — `N_Btn{L,R}_a1`, the same capsule textures at `TevColor1 = (0,0,0,64)`, offset down-right.
Because the plate is near-white and the shadow is black, **one alpha mask produces wildly
asymmetric results over a ~210 bar**: the plate rim can only brighten by `α·(222−210) = 12α`,
while the shadow darkens by `α·0.251·210 = 53α`. Same mask, ~4.4× the leverage. That is the whole
effect, and it is why every previous pass read the pill as "a dark outline".

### A.2 The prediction that settles it

The shadow is offset in **absolute screen direction on both pills** (§7), so:

- **Left pill** — cap faces screen-centre, shadow pushes further screen-right ⇒ the shadow juts
  *past* the cap and paints a dark crescent outside the bright rim.
- **Right pill** — cap faces screen-centre, shadow pushes *away* from the cap ⇒ the shadow hides
  entirely behind the plate and **there is no dark crescent at all**.

Measured at the caps' widest row, delta vs a contour-matched bare-bar column:

| | bright plate rim | dark shadow crescent outside it |
|---|---|---|
| Left cap | **+3.3** at 120.1 stage px from the edge | **−17.2** at 126.0 |
| Right cap | **+4.6** at 119.9–123.7 | **none** (\|Δ\| < 1.0 everywhere outside) |

The rims agree to 0.2 stage px, so the plates are mirror-symmetric; only the shadow is not. This
also retires §3b's "the outline is a shadow" as a *hypothesis* — it is now a measured consequence
with a confirmed one-sided signature.

### A.3 Single-alpha fit

Solving both observations with one rim alpha, RGB 222, material alpha 0.251:

| rim α | plate rim (meas +3.3) | shadow rim (meas −17.2) |
|---|---|---|
| 0.25 | +3.0 | −13.2 |
| **0.32** | **+3.8** | **−16.9** |
| 0.537 (WM4K) | +6.4 | −28.3 |

**α ≈ 0.32, not WM4K's 0.537.** WM4K is a *hand redraw* (established during the button work — it
is structure-tier evidence, not pixel-tier), so where it disagrees with a capture, the capture
wins. The interior alpha 0.071 is corroborated: predicted composite `0.071·(222−210) − 0.071·0.251·210
= −2.8`, measured **−2.5**.

### A.4 Geometry, re-measured at 2.6× — and one very clean number

The plate's edges are the *bright* rim (top y=444, bottom y=565 in the 1096×600 frame):

| Quantity | Stage px | Note |
|---|---|---|
| **Pill height** | **92.0** | see below |
| Cap radius | **46.0** | exactly h/2 — true capsule, circular in stage px |
| Outer edge from screen edge | **120.4** | left 120.1, right 119.9 — symmetric |
| Top edge | **337.4** from stage top | 6.8 below the cyan contour; it does **not** poke above the bar |
| Vertical centre | **383.4** | concentric with the button (measured 383.6) |
| Shadow offset | **(+6, +6)** | measured +5.7 x, +6.1 y |
| Rim thickness | **≈2** | 2 native texels; wider-looking horizontally is capture blur |

**The height is 92.0 stage px and the texture's opaque extent is 92 of its 128 texels (§4a).**
So this element is drawn at **exactly 1 texel = 1 stage px vertically**, and the 128-tall pane is
92 of capsule plus transparent padding. That resolves the §8.2 vs §3 conflict — the layout's
"128 tall" is the *pane*, not the shape — and it is a strong independent check on the whole
stage-coordinate model.

**Correction to §11:** its "height 70% of bar height / width 14.6%" table was derived from the
*shadow-inclusive* outline and is ~4 % tall and ~8 % wide. Use the table above.

### A.5 The left pill is NOT wider on this screen

§8.2 found the left pill's centre slice is 164 units vs the right's 92. On screen they measure
**symmetric to 0.2 stage px** (A.2). The extra width serves `B_Cal` / `B_Add`, which exist only on
the **Message Board** screen; `my_IplTop_e.brlyt` is shared chrome. Build them symmetric for the
Wii Menu. (Consistent with §8.4's warning that the raw X anchors are not usable as authored.)

### A.6 Implementation — as shipped

Build Nintendo's construction directly and let alpha compositing do the rest — do **not**
hand-compute the resulting greys, because the correct sign flips against the bar's own gradient
(brightening over the dark upper bar, near-neutral over the light lower bar) and a baked hex
cannot.

```
plate  : capsule 120.4 x 92, border 2px rgba(252,252,255,0.09)
                             background-color  rgba(252,252,255,0.05)
                             box-shadow  inset 0 0 0 3px rgba(0,0,0,0.028)   /* the recess */
shadow : the SAME capsule, offset (+6,+6),
                             border 2px        rgba(0,0,0,0.082)
                             background-color  rgba(0,0,0,0.018)
```

Both pills get the shadow offset **down-and-right**; do not mirror it.

Three things that only surfaced against a live render, all of which produced visible defects:

1. **`background-clip: padding-box` is required.** Otherwise the background also paints under the
   border and the rim composites *both* alphas — the shadow rim measured **−21.9** against the
   console's −17.0. The rim and the interior are two separate alphas in the texture and have to
   stay separate here. Set the background with **`background-color`, not the `background`
   shorthand**, which silently resets `background-clip` back to `border-box`.
2. **The edge-side border must be clipped, not drawn.** §6 established there is no vertical stroke
   closing the shape at the screen edge; drawing one turns the pill into an obvious **rectangle**.
   Give the element a **12px overhang past the screen edge** and let the stage's `overflow: hidden`
   clip it. 12 rather than 4 because the shadow copy is translated +6px, which pushes *its* edge
   border back onto the screen as a stray vertical line.
3. **Recompute the button offsets whenever the pill moves.** The buttons are positioned relative to
   the pill, and this pass moved it up 3.5px, in 9.7px, and out 12px. Their measured centres —
   (75.2, 383.5) and (76.3 from the right edge, 383.5) — were already correct and must be preserved.

**Rim values are fitted, not derived.** A single alpha mask at WM4K's 0.537/222 reproduces the
shadow but makes the bright lip ~2× too strong where the bar is dark (brightening scales with
`rim − bar`, and the bar runs ~185 at the pill's top vs ~210 at its cap). Solving both measured
points gives a lighter, thinner rim: `0.09 × (252 − 185) = +6.0` vs console +5.7, and
`0.09 × (252 − 210) = +3.8` vs console +3.3…+4.6. More evidence that WM4K is structure-tier only.

**Verification.** Ratchet `bottomBar` **0.7032 → 0.7134** (+0.010, twice the 0.005 noise floor);
all 10 tests pass. Note that the **gate did not fail on this change and cannot**: its per-pixel
`threshold` defaults to 0.2 (≈51 levels) while this work moves 3–17 levels, so tonal changes of
this size are invisible to it by construction. That is the ratchet's job, and the split is
working as intended — but do not read a green gate as evidence that a tonal change landed.

### A.7 The recess, and one open question

**Implemented:** just inside the rim the console runs ~5.5 levels darker than the pill's own
interior, and by the *same* amount on the top edge (−7.9 at stage y 340) and the bottom edge
(−9.0 at y 428). Equal on both edges rules out directional shading — it is an inner vignette,
α ≈ 0.028, and it is what makes the pill read as a shallow **slot cut into the bar** with the
bright rim as its lip. This is the "railing".

**Open:** the vignette does not fully account for the top band; the measured profile shows bright
(y 337–338) → dark (339–341) → neutral (342) → dark again (345–348), and the second dark band is
the shadow's own top rim, correctly placed (−13.7 measured vs −14.9 predicted). The neutral gap
between the two is not explained. Candidates: the rim is a 1-texel-bright/1-texel-dark bevel, or
residual contour misalignment in the only 8 columns that are simultaneously past the shadow and
still under the flat part of the contour. Not resolvable at 1096×600 — the capture's own scanlines
swing adjacent rows by ±3. Sweeping the vignette alpha across 0.020–0.045 moves the whole-profile
RMS by under 0.06 levels, so this residual is not worth further fitting without a better capture.

### A.8 The local theme rips are useless for THIS texture — do not vote on them

`reference/ashpool/` holds 7 independent theme rips of `cmnBtn`, and an md5 vote on
`my_TopBtn_base_a.tpl` / `_base_b.tpl` splits 4–3. **Neither group is Nintendo's.**

- The **4-vote** group (amongus, castlevania, sonicmovie, starfoxzero) is byte-identical because
  all four **blanked the pill**: the TPL texel data is *all zeros*, a fully transparent 64×128.
  Byte-identity across independent lineages normally implies stock bytes — here it implies a
  shared *deletion*, most likely one theme-maker tool's default.
- The **3-vote** group (the dark-Wii trio) is the known shared-lineage cluster, and it also
  **re-encoded the format** — stock is `RGB5A3` (GX format 5), the trio is `IA4` (format 2) with
  RGB flat 255 and alphas 187–255. A reskin, not a rip.

So the md5-vote heuristic that worked elsewhere in this corpus inverts here, in both directions at
once. For this element the evidence order is: **capture measurement → layout bytes → WM4K
(structure only)**. Two further traps met on the way:

- The bundled TPL extractor's **RGB5A3 path silently decodes to all-zero**, so a "blank" result
  proves nothing until confirmed against the raw file. A hand decoder must honour GX **4×4 tile
  order**; reading linearly gives a shuffled image with a correct histogram, which passes a naive
  sanity check.
- `my_TopBtn_base_b` is **16×128**, not the 92/164 of §8.2 — it is a narrow strip stretched to the
  centre-slice width. Confirmed from the TPL header (4160 bytes = 16·128·2 + 64).
