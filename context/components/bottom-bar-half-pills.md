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

## 0. Verdict, up front

**The half-pills are real.** They are visible in `reference_screen.png` as a closed, capsule-shaped
outline on both sides of the bar, and the shape's geometry is measurable to sub-pixel precision.
The project's `border-radius: 0 9999px 9999px 0` reading of the *shape* is correct.

**But the project's reading of the *fill* is wrong.** They are not lighter-coloured plates. The
interior of each half-pill is ~1.5 % **darker** than the surrounding bar at the same height, and
it continues the bar's own vertical gradient rather than being a flat fill. What makes the shape
visible is a soft dark **outline**, not a tonal fill difference. Replacing `background: #d3d4db`
with a flat lighter plate over-states the effect by roughly an order of magnitude.

---

## 1. Sources and how they are tiered

| Tag | Meaning | Sources used here |
|---|---|---|
| **[Direct observation]** | Sub-pixel measurement of this repo's `reference_screen.png` (420×236, System Menu 4.x — the SD Card icon is present). Method described in §9. | `/Users/brunoneira/orchids-projects/wiimenu-website/reference_screen.png` |
| **[Official]** | Nintendo-authored | Wii Operations Manual — Channels & Settings, scanned + OCR'd: https://archive.org/details/wii-opmanual-chset (text: https://archive.org/download/wii-opmanual-chset/WiiRVKChEng_djvu.txt) |
| **[Decomp]** | Fan decompilation of Nintendo's own System Menu binary — Nintendo's logic, symbol-for-symbol | `koopthekoopa/wii-ipl`: https://github.com/koopthekoopa/wii-ipl — specifically `src/scene/button/iplButton.cpp` and `include/scene/button/iplButton.h` |
| **[Fan/community]** | Wikis, fan documentation | https://wiibrew.org/wiki/System_Menu |
| **[Inferred]** | My reasoning on top of the above | — |

**Evidence quality warning.** This is a small, low-contrast detail. The *shape* is unambiguous;
the *lighting model* (raised plate vs. recessed slot) is inference from a 420 px-wide capture and
should be treated as a design decision, not a fact. **No textual source anywhere — official or
fan — names or describes this element.** The screenshot is essentially the only evidence.

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
- Drop the flat fill. Render the pill as a **soft inset outline** — e.g. an `inset` box-shadow /
  1–2 px border in a colour ~8 % darker than the local bar tone, plus a barely-there interior
  darkening (~1.5 %), plus a 1 px lighter hairline above the top edge.
- If you keep a fill for simplicity, derive it from the bar gradient rather than hard-coding a
  flat hex, and darken rather than lighten.
- Add the (+0.7 % x, +4.6 % of bar height y) offset on the outline if you want the exact look;
  offset in the same absolute direction on both sides, not mirrored.
- `pointer-events: none` on the plate.
