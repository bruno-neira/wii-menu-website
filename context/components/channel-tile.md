# Component deep-dive: the generic channel tile (reusable frame)

**Scope.** The reusable tile "frame" that every channel's content sits inside — geometry,
layering, chrome, canvas/asset contract, animation contract, and states. **Not** in scope:
any specific channel's artwork (see `context/channels.md`), the empty/blank slot
(separate component), the Disc Channel's special behaviors (`context/channels.md` §1,
`context/animations-interactions.md` §3), or the page-nav arrows.

Follow-up to `context/component-inventory.md` item **2** (with item **14a** covered in §7 and
item **14c** in §9).

## Sourcing note — what changed in this pass

Two things made this pass much stronger than earlier ones:

1. **The local `wii_design_specs.pdf` was read in full** (all 26 pages). It is
   Nintendo's *Icon and Banner Specifications*, **RVL-06-0166-001-L, v1.0.0, released
   2008-02-26, © 2005-2008 Nintendo** — a first-party developer spec. Prior docs cited it
   second-hand for two facts; it actually contains far more, including **§5.2.3, which is the
   only official statement anywhere in this corpus about the tile's *hover* state**.
2. **The 128×96 and 170×96 icon masks were extracted from the PDF at native resolution**
   (`pdfimages -f 9`, objects 255/257 — these are Nintendo's own sample-icon bitmaps, not
   re-rendered figures) and measured with sub-pixel edge detection. This **settles the
   "pillow/CRT shape" question with primary-source pixel data** rather than inference from a
   420-px-wide screenshot.

Tags used: **[Official]** = Nintendo-authored. **[Fan/community]** = wiki, forum, fan clone,
or screenshot analysis. **[Inferred]** = derived by this doc from measurement or reasoning.

A note on `reference_screen.png`: it is **420×236**, and its measured grid pitch is a
near-exact match for the **810×456 visible area of the Wii's 16:9 layout space** (scale
1.929 horizontal / 1.932 vertical — square pixels, matching to 0.15%). So it is a **16:9**
capture, and all "native px" figures derived from it below are in that 832×456 / 810×456
space. [Inferred]

---

## 1. Exact geometry — and the "pillow / concave CRT" question, settled

### 1.1 The authored mask is a real, measurable primary source

Figures 2-1 and 2-2 of the spec show the icon canvas with a black surround and a white
aperture, captioned:

> "Image is clipped in the shape of the white area as shown; protruding portions are not
> displayed." — [Official], Icon & Banner Spec p.8, Fig. 2-1 / 2-2

So **the white aperture *is* the on-screen tile shape**, and the black ring is the part of the
authoring canvas that gets clipped away. The spec labels them:

| Screen mode | Authoring canvas | Visible aperture | Ring (clipped) |
|---|---|---|---|
| 4:3  | **128 × 96** px | **120 × 88** px | 4 px per side (h), 4 px (v) |
| 16:9 | **170 × 96** px | **160 × 88** px | 5 px per side (h), 4 px (v) |

[Official] — p.7 §2.3 and Figs. 2-1/2-2.

### 1.2 Sub-pixel measurement of the mask

The sample bitmaps are anti-aliased, so edges were located by interpolating the 50%
luminance crossing. Results (4:3, `128×96` asset):

```
LEFT EDGE x-position by row y      TOP EDGE y-position by column x
 y= 6 → 8.70                        x=  8 → 6.68
 y=10 → 6.33                        x= 14 → 3.71
 y=14 → 5.71                        x= 20 → 3.53
 y=18 → 5.46   ← corner knee        x= 26 → 3.38
 y=22 → 4.75                        x= 32 → 3.01
 y=26 → 4.58                        x= 38 → 2.68
 y=46 → 3.85   ← extreme            x= 50…80 → 2.53  ← extreme
 y=66 → 4.59                        x= 92 → 3.01
 y=78 → 5.58                        x=104 → 3.50
 y=86 → 6.53                        x=116 → 4.62
```

### 1.3 Verdict on the "pillow/CRT" shape

- **The sides are NOT straight.** The left edge travels from x≈5.7 near the corner knee out to
  x≈3.85 at mid-height and back — a **continuous outward curve of ≈1.75 px** across the whole
  edge. The top edge bows **≈1.1 px**. So there is a real, measurable bow.
- **But the bow is tiny, and it is CONVEX, not concave.** 1.75 px on a 120-px-wide aperture is
  **≈1.5% of tile width**; 1.1 px on 88 px is **≈1.2% of tile height**. And it bulges *outward*
  (barrel), which is the opposite of the "concave pillow" the fan description implies.
  Over the **middle 50%** of each edge the deviation from straight is **under 0.7 px (<0.7%)**.
- **The 16:9 mask is even flatter**: left-edge bow ≈1.1 px on a ~157-px aperture (**0.7% of
  width**), top-edge bow ≈1.2 px on 88.9 px (**1.3% of height**).
- **Best single-shape model**: a **superellipse** `|x/a|ⁿ + |y/b|ⁿ = 1`, fitted by least squares
  over 140–155 sub-pixel edge points:
  - 4:3 mask: **n ≈ 7.16**, a = 59.65, b = 44.97 (SSE 0.67 over 140 pts — excellent fit)
  - 16:9 mask: **n ≈ 8.41**, a = 78.0, b = 43.95 (SSE 0.81 over 155 pts)
  For reference, n = 2 is an ellipse, n ≈ 4–5 is an Apple-style squircle, n = ∞ is a sharp
  rectangle. **n ≈ 7–8.5 is "a rounded rectangle with the corners softened and the straight
  edges very slightly relaxed."**
- **Equivalent plain-rounded-rect corner radius** (circle least-squares fit to the corner arcs
  only): **r = 15.65 px** (4:3, RMS 0.84 px) and **r = 13.90 px** (16:9, RMS 0.69 px). Both are
  ≈**16–17% of the 88-px aperture height**, i.e. the corner radius is roughly **constant in
  absolute pixels (≈14–16 px in Nintendo's authored space)**, *not* a constant fraction of
  width.

All of §1.2–1.3 is [Inferred] from measurement of [Official] source bitmaps.

**So: `context/visual-design.md`'s call was ~80% right, and the project's switch to plain
rounded rectangles was the right practical call — but the reasoning needs one correction.**
It concluded pixel inspection "does not obviously support a strong barrel/pillow distortion."
Correct, and the low-res screenshot could never have shown it: at the 420-px reference scale a
1.5%-of-width bow is **0.6 px**, i.e. invisible. But the authored mask proves the bow is
*real*, just very small, and *convex*. Recommended wording change: not "pillow CRT is a myth"
but **"the tile is a mild convex superellipse; a rounded rectangle is a faithful approximation
to within ~1.5% of width."**

### 1.4 Aspect ratio

Note that **the visible tile is not 4:3 even in 4:3 mode** — the canvas is 128:96 = 1.333 but
the *aperture* is 120:88.

| Screen mode | Aperture aspect | Cell (canvas) aspect |
|---|---|---|
| 4:3  | **1.364 : 1** (120:88 ≈ 15:11) | 1.333 : 1 |
| 16:9 | **1.818 : 1** (160:88 ≈ 20:11) | 1.771 : 1 |

Pixels are square within each layout space (608×456 = 4:3; the 810×456 visible sub-area of the
832×456 16:9 space = 1.776 ≈ 16:9), so these are true displayed aspect ratios. [Inferred from
Official Code 3-1 / Figs. 3-3, 3-4.]

Cross-check: `visual-design.md` measured "84 × 45 px, ~1.87:1" from `reference_screen.png`.
Re-measured here at keyline-to-keyline: **85 × 46 px → 1.85:1**, and 46 px × 1.932 = **88.9
native px** — an essentially exact match for the spec's 88-px aperture height. The ~1.85 vs
theoretical 1.818 gap is the 1-px keyline on each side (§2.3). ✔ The two sources agree.

### 1.5 CSS recipes

**Good enough (recommended default):**

```css
.tile {
  aspect-ratio: 160 / 88;                 /* or 120/88 for a 4:3-mode look */
  border-radius: calc(0.165 * var(--tile-h));  /* ≈16.5% of HEIGHT, keeps corners circular */
  overflow: hidden;                        /* clips the channel art, per spec */
}
```
For a 16:9 tile that lands at ≈9% of width; for a 4:3 tile ≈12% of width. Avoid a single
`border-radius: N%` — percentages resolve against width *and* height separately and will
give you elliptical corners of the wrong proportion.

**Faithful (adds the ~1.5% bow).** Use an SVG clip path with `clipPathUnits="objectBoundingBox"`
so it scales with the element (values below are the measured mask normalised to a 0–1 box):

```html
<svg width="0" height="0" aria-hidden="true">
  <clipPath id="wii-tile" clipPathUnits="objectBoundingBox">
    <path d="M .130 .012
             Q .500 -.012 .870 .012
             A .115 .163 0 0 1 .985 .175
             Q 1.015 .500 .985 .825
             A .115 .163 0 0 1 .870 .988
             Q .500 1.012 .130 .988
             A .115 .163 0 0 1 .015 .825
             Q -.015 .500 .015 .175
             A .115 .163 0 0 1 .130 .012 Z"/>
  </clipPath>
</svg>
```
```css
.tile { clip-path: url(#wii-tile); }
```
The `Q` control points sit just outside the box on purpose; the resulting curve's extremes land
exactly on 0 and 1. Corner knees at 13% / 17.5%, edge bow 1.5% / 1.2%. [Inferred]

**Progressive enhancement:** CSS `corner-shape: superellipse(7)` expresses this natively and
matches the fitted exponent almost exactly — but **verify browser support before relying on
it**, and always ship the `border-radius` above as the fallback. [Inferred]

**Independent corroboration [Fan/community]:** the Vue clone `Fraulk/Wii-Menu` does *not* use
`border-radius` for its tiles — it uses a hand-authored four-cubic-Bézier `clip-path`:
`path("M 10 9 C 10 0 378 0 378 9 C 388 9 388 180 378 180 C 378 189 10 189 10 180 C 0 180 0 9 10 9")`
([`src/components/Channels.vue`](https://github.com/Fraulk/Wii-Menu/blob/main/src/components/Channels.vue)).
Decoding it: the vertical edges bow outward by 7.5 units on a ~383-wide box = **2.0% of width**
— strikingly close to Nintendo's measured 1.5%. Its vertical bow (6.75 on 184.5 = **3.7% of
height**) over-states Nintendo's 1.2% by roughly 3×. So an independent fan reconstruction
arrived at the same *convex barrel* reading, with the horizontal component about right.
That is a second, independent vote against "the tile is a plain rounded rect."

---

## 2. Layered structure

From outside in. Colors are sampled from `reference_screen.png` at native resolution
[Fan/community — screenshot-derived]; dimensions are [Official] where marked.

| # | Layer | Geometry | Treatment |
|---|---|---|---|
| 0 | **Grid cell / layout slot** | 128×96 (4:3) or **170×96** (16:9) [Official] | Invisible. This is the grid pitch (§8) and the icon authoring canvas. |
| 1 | **Outer halo** | ~2–3 px beyond the keyline | Sampled **231–240** vs a page background of **227–229** — the gutter immediately around each tile is *lighter* than the field. Reads as a faint rim light, not a shadow. |
| 2 | **Drop shadow** | ~1–2 px below the bottom edge only | Very subtle: 235 → 227 two rows below (≈4% darkening). Not the pronounced card shadow it's often drawn as. |
| 3 | **Keyline / bezel stroke** | 1 px, all four sides | Uniform **RGB(189–194) ≈ `#BEBEBE`–`#C2C2C2`**. Measured on the Disc tile top (194), Disc bottom (189), News left (190). Darker than *both* the tile interior and the gutter, so it is a genuine drawn stroke, not an anti-aliasing artifact. |
| 4 | **Content aperture** | **120×88** (4:3) / **160×88** (16:9) [Official] | The superellipse of §1. Holds the channel's animated icon layout, hard-clipped ("protruding portions are not displayed"). |
| 5 | **"Newly arrived" panes** | inside layer 4 | Not a separate menu-drawn badge — panes inside the channel's *own* icon layout. See §9. |

### 2.1 Correction to `visual-design.md` §1

`visual-design.md` reports a *"grid 'recess' — the area directly behind the tile grid (the
gutters between tiles) reads as a slightly darker gray (~#BEBEBE–#C0C0C0) than the page
background (~#E4E4E4–#EFEFEF) — i.e. the whole grid sits on a subtly recessed panel."*

**Direct re-sampling of the gutters contradicts this.** Measured at native resolution:

```
gutter col1↔col2 @ y=45   → 240      gutter row1↔row2 @ x=80  → 231
gutter col1↔col2 @ y=140  → 235      gutter row2↔row3 @ x=80  → 231
gutter col2↔col3 @ y=90   → 239      page bg, x=8, y=40/90/140 → 228/228/229
```

The gutter is **231–240, i.e. equal to or *lighter* than the surrounding background (227–229)**.
`#BEBEBE` (190) is not the gutter — **it is the tile keyline** (layer 3), which is exactly
189–194. The sample almost certainly landed on the stroke. **There is no darker recessed
backplate behind the grid**; if anything each tile carries a faint light halo. Recommend
correcting `visual-design.md` §1 and its color table row "Grid gutter/recess background".

### 2.2 What the bezel is *not*

The 4–5 px ring between the cell edge and the aperture is **clipped/transparent**, not a
drawn frame. Nothing of the icon survives there. Practically, that ring *is* half the gutter
(§8), so a web implementation does not need a bezel element at all — a single clipped box
with a 1 px `#BEBEBE` inset ring reproduces it.

Contrast with the **full-screen banner**, where Nintendo *does* composite chrome: *"The banner
is displayed with the prepared buttons and the black frame in the foreground"* [Official, p.16
§3.4.1]. Tiles get a light keyline; the preview gets a heavy black frame (§7).

---

## 3. Gloss / specular treatment — the surprising answer

**There is no menu-drawn gloss overlay on channel tiles.** [Inferred, high confidence]

Two independent lines of evidence:

1. **The spec's mask figures show a plain aperture.** Figures 2-1/2-2 and the rendered samples
   2-4 through 2-7 depict the icon area as a flat white field with the artwork on it. Nothing in
   the icon pipeline composites a highlight. Where Nintendo *does* overlay chrome (the banner),
   the spec says so explicitly (§3.4.1). It does not say so for icons. [Official, by omission]
2. **Different channels darken top→bottom by wildly different amounts**, which a uniform
   multiply/overlay could not produce. Measured vertical profiles down a clean left strip of
   each tile in `reference_screen.png`:

   | Tile | Top of tile | Bottom of tile | Change |
   |---|---|---|---|
   | Forecast Channel (blue) | `rgb(0,156,233)` | `rgb(0,85,198)` | green −46%, blue −15% |
   | News Channel (green) | `rgb(34,130,32)` | `rgb(40,110,16)` | green −15% |
   | Disc Channel (white) | 255 | 250 | −2% |

**What people are remembering is a house style in Nintendo's own channel artwork**, not tile
chrome. The Disc Channel tile — closest thing to a "blank" glossy tile — has this profile
(luminance sampled down x=37–60, tile interior y=21–64, normalised to tile height):

```
  2% → 248      peak plateau: 5% – 36% of tile height @ 255
 36% → 255      then a smooth fall …
 50% → 248
 61% → 243
 68% → 240   ← minimum, ≈6% below peak
 80% → 245      … then a bounce-light rise
 93% → 250
```

So the canonical Wii glass look is: **full-strength highlight across the top ~35–38%,
a gentle ~6% falloff to a minimum around 68% down, and a slight recovery (~4%) toward the
bottom edge.** That is a classic three-stop glass gradient, and it is *subtle* — a 6% swing,
not the 40–60% swing usually drawn in fan recreations. [Fan/community — screenshot-derived]

**Useful contrast: empty slots are shaded the opposite way.** The empty tile at col 3 / row 3
profiles as a bright 1–2 px line at the very top (213 → 222), then a dip to ~201–208 in the
upper third, then a steady rise to ~220 at the bottom. Dark-at-top / light-at-bottom is the
signature of an *inset well*. So **populated tiles read as raised glass; empty slots read as
recessed holes** — that opposition is the grid's core depth cue and is worth preserving even
if you flatten everything else. (Empty slot is its own component; noted here only because it
calibrates the populated tile's shading.)

**Implementation guidance.** Because the gloss belongs to the art, a recreation has two honest
options: (a) bake it into each channel's asset, or (b) apply one shared overlay to all tiles as
a simplification. If (b), match the measured profile rather than a generic 50%-white sweep:

```css
.tile::after {                 /* ~6% swing, matching the Disc-tile profile */
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(
    to bottom,
    rgba(255,255,255,.10)   0%,
    rgba(255,255,255,.10)  36%,
    rgba(0,0,0,.05)        68%,
    rgba(255,255,255,.03) 100%);
}
```
[Inferred]

---

## 4. Canvas / asset dimensions and the on-screen mapping

All [Official] unless noted, from Icon & Banner Spec §2.1–2.3, §2.7, §5.

### 4.1 The authored asset

- **Basic icon image size: 128 × 96 px**, "centered at the point of the layout origin" (p.7).
- **16:9: 170 × 96 px must be prepared in advance** if the pane has *Target for position
  adjustment* checked; otherwise the 4:3 image is **stretched** to fill the aperture (Figs.
  2-4 → 2-7 show both, side by side).
- **Hard ceiling:** *"If you do not specify the icon size correctly, the Wii Menu may not be
  displayed correctly. All applications must use an icon image of size 170 x 96 or smaller."*
  (p.7, Note)
- In 4:3 mode the extra left/right pixels of a 170-wide image are simply **not displayed**.
- Source images are authored as **TGA** (§2.8.1).
- Data size: **≤100 KB** archived, **≤50 KB** once compressed by the banner tool (§2.1).
- Resource names: `Icon.brlyt` (layout) + `icon.brlan` (animation); *"To display icons
  correctly on the Wii Menu, both layout and animation data are required"* (§2.2). Built with
  `nw4r_lytcvtr.exe --banner`, packed by `WiiMakeBanner.exe` into `opening.bnr` (disc) or an
  arbitrary filename (channels) (§5.1).
- **Text inside a tile must use the bundled bitmap fonts** `data\fonts\wbf1.brfna` /
  `wbf2.brfna`; *"any other font is prohibited"* (§2.7).

### 4.2 Mapping to on-screen size

| | 4:3 (608×456 space) | 16:9 (832×456 space, 810 visible) |
|---|---|---|
| Grid cell (= canvas) | 128 × 96 | 170 × 96 |
| Visible tile (aperture) | 120 × 88 | 160 × 88 |
| Tile as % of screen **width** | 19.7% | 19.8% |
| Tile as % of screen **height** | 19.3% | 19.3% |
| Cell as % of screen width | 21.1% | 21.0% |
| Cell as % of screen height | 21.1% | 21.1% |

**The cell is exactly 1/4.75 of screen width and ~1/4.75 of screen height in both modes** — the
tile occupies the same proportional footprint regardless of screen mode; only its *aspect*
changes. [Inferred from Official figures, cross-checked against `reference_screen.png`.]

**Practical note for the rebuild:** these are 2008 console pixels. Author your web tile art at
≥4× (e.g. 640×352 for a 16:9 tile) — the shipped Wii assets were 170×96 and will look soft on
a modern display if used at 1:1. [Inferred]

---

## 5. Animation requirements

This is the strongest, most actionable part of the spec for a recreation. All [Official],
§2.5, §2.6, §4.4.1.

### 5.1 The mandate

> "Animation must be set for icons.
> **Note: Use of still image icons for which animation has not been set is prohibited.**"
> — p.11 §2.5

Reinforced structurally at §2.2: both `.brlyt` and `.brlan` are *required* for an icon,
whereas §3.2 says the opposite for banners (*"Unlike icons, banners without animation data can
be displayed correctly"*). **Animation is not a stylistic suggestion; it is a hard gate on
whether the tile renders at all.**

### 5.2 Loop model

- *"Icon animation plays loops of specified frames. Set the start and end frames and the
  playback start and end frames. The frame segment between the playback start and end frames
  is played."* (§2.5)
- **A single, continuous, seamless loop — no segments.** *"Unlike banners, icons cannot play
  back a combination of multiple animation segments."* (§2.5) Banners *can* chain
  `Start` → `Loop` tags (§3.6, Fig. 3-5); icons cannot. The **only** exception is the "Newly
  Arrived" feature (§9): *"Animation segment tags are valid only if you use the new message
  display feature."*
- **No enter/exit animation.** The tile has one state at rest: looping.
- **Reference loop length: 2400 frames** — Fig. 2-10 shows Nintendo's `Icon_1` sample looping
  frames 0 → 2400.

### 5.3 Frame rate

> "as dictated by the NTSC standard's frequency of 59.94Hz, animation is played back at
> **60 frames per 1.001001 second**" — p.21 §4.4.1

So **frames are 1/59.94 s ≈ 16.68 ms**. Converting the spec's own examples:

| Spec value | Duration @ 59.94 fps |
|---|---|
| `Icon_1` loop, 0 → 2400 (Fig. 2-10) | **≈ 40.0 s** |
| `Whole` tag, 0 → 2200 (Fig. 2-11) | ≈ 36.7 s |
| `New` tag, 3000 → 4000 (Fig. 2-11) | ≈ 16.7 s |

**A canonical channel-icon loop is on the order of half a minute** — a slow ambient drift, not
a snappy 1–2 s cycle. This is a genuinely useful and previously undocumented number for the
rebuild: it explains why the Menu feels alive but never busy.

### 5.4 PAL50

*"In PAL50 mode, the Wii console plays back the animation at **1.2 times the NTSC speed**;
however, due to the frame rate relationship, roughly the same contents as in NTSC mode are
shown. Because of the faster playback, animation no larger than 1.2 frames may not appear
during playback"* (§2.6). Irrelevant to a web build except as a warning: **anything shorter
than ~2 frames (~33 ms) is below Nintendo's own reliability floor** — don't build the tile's
identity around a sub-two-frame flash.

### 5.5 What can be animated

Per-pane, from §2.5:

- **Pane basic:** position, size, scale, rotation, transparency, visibility
- **Texture:** vertex color (upper-left / upper-right / lower-left / lower-right independently),
  black-or-white color interpolation, texture matrix (parallel translation / scale / rotation),
  texture pattern (frame-swap), texture color mixture ratio
- **Material:** color register
- **TEV:** color register, constant color register
- **Indirect texture:** indirect texture matrix (translate / scale / rotate)

CSS/web analogues that stay faithful: `transform` (translate/scale/rotate), `opacity`,
`background-position` (≈ texture matrix translation — this is how scrolling/parallax icon
loops were built), sprite-sheet `background-position` steps (≈ texture pattern), and per-corner
gradient tinting (≈ vertex color). **Not** available in the original: filters, blurs, blend
modes beyond the TEV stages. [Inferred]

### 5.6 Recommendation

Every populated tile in the recreation should carry a **single seamless loop, ~20–40 s long,
running at rest, never restarting on hover or focus** — matching Nintendo's contract exactly.
This corroborates and now *officially sources* `visual-design.md`'s existing "no channel tile
should ever be a fully static image" guidance, and adds the missing duration and frame-rate
numbers. [Inferred from Official]

---

## 6. Hover / focus state — corroborated, and one correction

### 6.1 The official statement (new this pass)

Buried in §5.2.3 (Banner Data Header → Titles), p.24:

> "The title specified here will **pop-up when the cursor is moved over the unselected icon in
> the Wii Menu**. However, only the first line will be displayed; if the text does not fit the
> display area, the end of the line will be truncated by a maximum of four characters."
> — [Official]

This is the **only** first-party description of the hover state found anywhere in this corpus.
Supporting constraints from the same section:

- Titles are per-language (JP, EN, GE, FR, SP, IT, DU, KR, SC), **max 20 characters per line,
  max 2 lines / 40 characters total**.
- **Only line 1 appears on hover.** Both lines appear only in the Message Board under "Today's
  Accomplishments."
- Overflow behaviour is **truncation of at most 4 characters**, not ellipsis, not scrolling.
- The phrase *"the **unselected** icon"* confirms hover and selected are distinct states.

### 6.2 Verdict on `animations-interactions.md`

- **"The pop is on CLICK, not hover" — CONFIRMED, and now officially sourced.** §6 of the spec
  refers to *"the moment the display screen zoom effect completes **after an icon is
  selected**"* — the zoom is bound to selection. Nothing in the spec attaches any scale, glow,
  or wobble to hover. Keep that conclusion.
- **"Hovering has almost no visual affordance at all" — needs correcting.** That was based on a
  Medium UX critique noting only rumble + a blip. There *is* a documented visual affordance: the
  **title pop-up**. Recommend updating `animations-interactions.md` §1 to add it.
- The "wobble" memory remains unsourced; §1's diagnosis (conflation of the click-zoom and the
  drag-to-reorder spring) still stands.

### 6.3 Why the title pop-up matters more than it sounds

In `reference_screen.png`, Photo / Wii Shop / Forecast / News all have their names **baked into
the artwork**, but **Disc and Mii do not** — they are wordless. Those channels depend entirely
on the hover pop-up for identification. So the pop-up is not decoration; it is the tile's
accessible name, and a recreation that omits it leaves wordless tiles unlabelled. Map it to a
`title`/tooltip **and** an `aria-label` on the tile. [Inferred]

### 6.4 Recommended hover implementation

Faithful: cursor swaps to the open hand, the title label pops up, a soft blip plays. **No
scale, no glow, no wobble, no restarting the loop.** If a modern web affordance is wanted
anyway, keep it under the threshold where it competes with the selected state — a ≤1.02 scale
or a 1-px keyline lightening, 150 ms ease-out. **Gap:** the spec does not say *where* the
pop-up renders (above the tile? centered? in a fixed strip?) or how it is styled. Unresolved.

---

## 7. Selected state / Channel Preview — it is not an enlarged tile

`component-inventory.md` item 14a describes this as "the tile enlarges into a preview." The
spec shows something materially different, and this correction matters for implementation.

### 7.1 Official name and flow

The Wii Operations Manual — Channels & Settings calls it the **"Channel Preview screen"**
[Official]. The spec's Figure 1-2 ("Icon Selection and Banner Display") shows a tile
red-outlined in the grid with arrows to a **full-screen** banner:

> "When the user clicks a Channel icon, the banner associated with that icon (and application)
> is displayed **across the entire screen**." — p.6 §1
>
> "The banner is displayed on the entire TV screen." — p.16 §3.4.1

**It is not the grid with one tile scaled up. The grid is replaced by a full-screen banner
that is a completely different asset** (`banner.brlyt` + `banner.brlan`, ≤512 KB, vs the icon's
≤50 KB).

### 7.2 Geometry of the preview overlay

From Code 3-1 and Figures 3-1 → 3-4 [Official]:

```
# Frame buffer size            # Screen size
/system/video/fb_width  = 608  /system/video/vi_width  = 670
/system/video/fb_height = 456  /system/video/vi_height = 456
```

| | 4:3 | 16:9 |
|---|---|---|
| Full layout space | 608 × 456 | 832 × 456 |
| Banner content aperture | **590 × 332** | **810 × 332** |
| Below the aperture | button strip (~124 px tall) | same |

Layers, outside in:
1. **Black frame in the foreground** — same rounded/bowed corner language as the tile,
   scaled up (Fig. 3-1). It is drawn *over* the banner, so the banner must not put content in
   the corners.
2. **Banner content**, 590×332 or 810×332, animated.
3. **Blue triangular arrows at the left and right screen edges** — *"Arrows are displayed on the
   screen edges, so make sure that important information is not obscured by them."* (§3.4.1)
   These move to the **adjacent channel's banner without returning to the grid** — confirmed by
   §6's *"or the moment the transition effect from the adjacent banner completes."*
4. **Button strip** along the bottom with two labelled buttons: **"Wii Menu"** (left) and
   **"Start"** (right) (Figs. 3-1, 3-2).

**The zoom is not a uniform scale.** Tile aperture → preview aperture:

| | width | height | aspect before → after |
|---|---|---|---|
| 4:3  | 120 → 590 (**4.92×**) | 88 → 332 (**3.77×**) | 1.364 → 1.777 |
| 16:9 | 160 → 810 (**5.06×**) | 88 → 332 (**3.77×**) | 1.818 → 2.440 |

The preview is proportionally **wider and flatter** than the tile. A recreation that simply
`scale()`s the tile will land on the wrong aspect; the honest approach is a cross-fade from the
icon asset to a differently-proportioned banner asset during the zoom. [Inferred]

### 7.3 Timing and audio contract

- **Guaranteed minimum dwell:** *"Regardless of how quickly the banner Start button is clicked,
  the banner screen is displayed with a **guaranteed wait of at least one second**. This is the
  time interval from the moment the display screen zoom effect completes after an icon is
  selected (or the moment the transition effect from the adjacent banner completes), to the
  moment before the fadeout begins to transition to the game title."* (p.25 §6) [Official]
- **Banner sound is mandatory:** *"You must set a sound effect (banner sound) to banners…
  Use of a silent banner for which no banner sound has been set is prohibited."* (§4)
- **Sound envelope** (§4.2): starts **when the zoom-in completes** (not when it begins); **fades
  out** when "Wii Menu" is selected; **cut after 2 seconds** when "Start" is selected.
- **Banners may chain animation segments** via `Start` → `Loop` tags — e.g. a trademark plays
  once, then the title loops (§3.6, Fig. 3-5). Icons cannot (§5.2).

This gives `animations-interactions.md` §3 a real number to anchor on: **the post-zoom hold is
≥1000 ms**, which is why the fan clone's 800 ms zoom "feels" roughly right but slightly hurried.

### 7.4 Not covered anywhere

Zoom duration and easing, whether the grid dims/blurs behind, and whether the zoom originates
from the tile's bounding box. Still a genuine gap.

---

## 8. Grid metrics

### 8.1 The clean model

Measured pitch in `reference_screen.png`, converted to native units (scale 1.929 h / 1.932 v):

- **Column pitch: 88.4 px → 170.5 native ≈ 170** = the 16:9 canvas width. ✔
- **Row pitch: 49.5 px → 95.6 native ≈ 96** = the canvas height. ✔

**The grid pitch is exactly the icon authoring canvas.** Everything falls out of that
[Inferred, from Official canvas sizes + screenshot measurement]:

| | 4:3 (608 × 456) | 16:9 (810 × 456 visible) |
|---|---|---|
| Cell pitch | 128 × 96 | 170 × 96 |
| Visible tile | 120 × 88 | 160 × 88 |
| **Horizontal gutter** | **8 px** (= 6.7% of tile width) | **10 px** (= 6.3% of tile width) |
| **Vertical gutter** | **8 px** (= 9.1% of tile height) | **8 px** (= 9.1% of tile height) |
| Full 4×3 grid | 512 × 288 | 680 × 288 |

**The gutter is the clipped ring** of §1.1: each tile contributes 4–5 px of clipped canvas on
each side, and two adjacent tiles' rings sum to the gutter. Gutters are near-square in absolute
pixels (8–10 px), which is why they read as *proportionally tighter horizontally* (6%) than
vertically (9%).

This **supersedes `visual-design.md` §2's** "10–12 px horizontal gutter and a tighter ~4–5 px
vertical gutter … gutters are asymmetric, tighter vertically than horizontally." Re-measured
here, the horizontal gutter is ~3.4–4 px and the vertical ~3.5 px **at the 420-px screenshot
scale** — i.e. essentially equal, and both scale to 7–10 native px. The "asymmetric, tighter
vertically" reading is the opposite of what the numbers show.

### 8.2 Margins — and the partial 5th column

Grid box in `reference_screen.png`: columns at x = 35–119, 123–207, 212–296, 300–384; rows at
y = 20–65, 69–115, 119–165.

- **Left margin ≈ 8.3% of screen width** (35 / 420). Independently confirmed at **8.3%** in the
  spec's own Figure 1-1 screenshot (p.6) — two different captures, different screen modes, same
  value. [Inferred from Official + Fan/community]
- **Top margin ≈ 7.7% of screen height** (cell top ≈ 35 native px of 456).
- **A fifth column is partially visible at the right edge in BOTH screenshots**, with the blue
  page arrow floating over it. In the 16:9 reference capture ≈37% of a tile is visible; in the
  official 4:3 figure ≈36–40%.

The arithmetic closes exactly: `8.3% + 4 × 21.0% = 92.3%`, so column 5 begins at 92.3% and only
`100 − 92.3 = 7.7%` of a 21% cell shows — **36.7% of a tile**. ✔

**This is strong evidence that the grid is a single continuous horizontal strip of 16 columns
(4 pages × 4), not four discrete swapped screens**, and that paging slides it by exactly 4
columns = 84% of viewport width — after which column 5 lands at 8.3–29.3%, i.e. becomes the new
first column with the identical left margin. [Inferred, strongly supported]

This **corroborates the slide-paradigm recommendation in `animations-interactions.md` §4**,
which flagged the page-transition motion as an open gap and leaned on weaker evidence
(page-indicator dots). The peeking 5th column is a much better argument, and it is visible in
Nintendo's own published figure. It also predicts a symmetric peeking column on the **left** on
pages 2–4, which neither screenshot can confirm (both are page 1). [Inferred, unconfirmed]

### 8.3 CSS

```css
.grid {
  --cell-w: 21.0%;         /* of viewport width  */
  --cell-h: 21.1%;         /* of viewport height */
  display: grid;
  grid-template-columns: repeat(4, var(--cell-w));
  grid-auto-rows: var(--cell-h);
  column-gap: 1.23%;       /* 10 / 810  */
  row-gap: 1.75%;          /* 8 / 456   */
  padding: 7.7% 0 0 8.3%;
  /* strip overflows right on purpose — do NOT center or clip the 5th column */
}
```

---

## 9. The "newly arrived" badge — mechanism only, no visual spec

`component-inventory.md` item 14c hoped the spec described a badge. It describes a
**mechanism**, and deliberately leaves the visuals to the developer. Worth documenting so
nobody re-searches for a spec that does not exist.

### 9.1 What it is

> "Wii Menu contains a feature that indicates the arrival of a new message; when a WiiConnect24
> message is delivered to a Channel application, the feature **displays images and animations on
> top of an installed Channel's icon**." — p.14 §2.9 [Official]

**Not a system-drawn badge.** It is a pair of conventions inside the channel's *own* icon
layout resource, which the Wii Menu activates:

1. **A pane group named `New`** (§2.9.1). *"Panes that belong to the 'New' group are always
   displayed when an appropriate application receives a new WiiConnect24 message."* Localised
   variants follow Table 2-3: `New_JPN`, `New_ENG`, `New_GER`, `New_FRA`, `New_SPA`, `New_ITA`,
   `New_NED`, `New_KOR`, `New_CHN`. If an unlocalised `New` group exists it wins; otherwise the
   language-suffixed group matching the console's language is used, falling back per the
   regional preference order in Table 2-2.
2. **Two animation section tags** (§2.9.2, Fig. 2-11). *"When you use 'Newly Arrived'
   animations (and the New animation tag is set), you have to specify the `Whole` tag for
   displayed frames of the entire icon's animation, which will always be played back regardless
   of WiiConnect24 messages."* Nintendo's example:

   | Tag | Start | End | Duration @ 59.94 fps |
   |---|---|---|---|
   | `Whole` | 0 | 2200 | ≈ 36.7 s |
   | `New` | 3000 | 4000 | ≈ 16.7 s |

   Note the **800-frame gap** between 2200 and 3000 — the two ranges are disjoint regions of one
   timeline, not nested. [Official; the gap's purpose is not explained — Inferred that it is
   simply authoring headroom.]

This is also the sole exception to the "icons cannot combine animation segments" rule:
*"Animation segment tags are valid only if you use the new message display feature"* (§2.5).

### 9.2 Restrictions

> "This feature is **not supported in Wii Menu versions 2.1 and earlier**. In addition, it
> **cannot be used by disc applications** even with Wii Menu versions 3.0 and later." — §2.9
> [Official]

So the **Disc Channel can never show it**, and it postdates System Menu 2.1. Cross-check for
`version-history.md`: this dates the feature to **System Menu 3.0**, the same release WiiBrew
credits with adding the Message Board button flash — consistent with a single 3.0
"new-message-notification" workstream. [Inferred]

### 9.3 The gap that will not close

**Nintendo specifies no appearance whatsoever** — no color, shape, corner placement, size, or
duration. Every channel's "new" indicator was bespoke art authored by that channel's team.
`visual-design.md` flags this as "single citation only, no visual detail"; that is not a
research shortfall, **it is the actual state of the specification**. Recommend closing the item
rather than researching further, and treating any recreation's badge as a free design choice —
though the spec's own framing ("images and animations on top of an installed Channel's icon")
means it should be **an overlay inside the tile aperture that animates**, not a static dot
bolted outside the frame. [Inferred]

Separately: `visual-design.md`'s "loading strip for newly downloaded channels" is a **different
thing** and remains unsourced. The `New` group is about WiiConnect24 message arrival, not
download progress. Do not conflate them.

---

## 10. Summary of corrections to existing docs

| Doc | Claim | Status |
|---|---|---|
| `visual-design.md` §2 | "Pillow CRT" is fan-overstated; tile is a plain rounded rect | **Mostly right, refine.** Bow is real (~1.5% of width) but **convex**, not concave, and invisible at screenshot scale. Rounded rect is a fine approximation. |
| `visual-design.md` §1 | Grid gutters are a darker recess (`#BEBEBE`–`#C0C0C0`) | **Wrong.** Gutters measure 231–240, *lighter* than the 227–229 background. `#BEBEBE` is the 1-px tile keyline. |
| `visual-design.md` §2 | Gutters asymmetric: 10–12 px horizontal, 4–5 px vertical | **Wrong direction.** Both ≈3.5–4 px at screenshot scale (8–10 native); horizontal is proportionally *tighter*, not looser. |
| `visual-design.md` §2 | Tile ≈84×45 px, 1.87:1 | **Confirmed.** Re-measured 85×46 = 1.85:1; 46 px → 88.9 native = the spec's 88-px aperture height exactly. |
| `visual-design.md` §2 | Hover/select treatment is a genuine gap | **Partly closed.** Hover = official title pop-up (§6). Select = full-screen banner, geometry now fully specified (§7). Zoom duration/easing still open. |
| `animations-interactions.md` §1 | The pop is on CLICK, not hover | **Confirmed and officially sourced** (spec §6: zoom happens "after an icon is selected"). |
| `animations-interactions.md` §1 | Hover has "almost no visual affordance at all" | **Correct this.** Official: the channel title pops up on hover over an unselected icon. |
| `animations-interactions.md` §4 | Paging is probably a slide | **Strongly corroborated** by the partial 5th column in both Nintendo's Fig. 1-1 and the reference screenshot (§8.2). |
| `component-inventory.md` 14a | Preview = "the tile enlarges" | **Correct this.** It is a full-screen replacement using a separate banner asset with a different aspect ratio. |
| `component-inventory.md` 14c | Newly-arrived badge needs visual research | **Close it.** The spec defines the mechanism only; appearance is per-channel art by design. |

## 11. Open gaps

1. **Where the hover title pop-up renders**, and its styling. Unspecified.
2. **Zoom duration/easing** for tile → Channel Preview; whether the grid dims behind it.
3. **Whether a peeking column also appears on the left** on pages 2–4 (both available captures
   are page 1).
4. **Whether the Wii Menu applies any per-tile tint/shading at all**, or is a pure blit. §3
   argues "pure blit" from the differing per-channel gradients, but a frame capture of two
   channels with known source art would settle it definitively.
5. **The Fig. 2-11 frame gap (2200 → 3000)** between the `Whole` and `New` ranges is
   unexplained.

## Sources

- **`wii_design_specs.pdf`** (repo root) — Nintendo, *Icon and Banner Specifications*,
  RVL-06-0166-001-L, v1.0.0, released 2008-02-26. Read in full, pp. 1–26. Primary source for
  §§1, 4, 5, 6, 7, 9. Native-resolution mask bitmaps extracted from p.9 (image objects
  255/257) for the measurements in §1.2.
- **`reference_screen.png`** (repo root) — 420×236 16:9 capture. Pixel-sampled with PIL for
  §§2, 3, 8.
- [Fraulk/Wii-Menu — `src/components/Channels.vue`](https://github.com/Fraulk/Wii-Menu/blob/main/src/components/Channels.vue)
  — fan Vue recreation; independent `clip-path` reconstruction of the tile outline (§1.5).
- [Wii Operations Manual — Channels and Settings (Internet Archive, OCR)](https://archive.org/details/wii-opmanual-chset)
  — official term "Channel Preview screen"; 48-slot / blue-scroll-arrow wording (§7).
- [WiiBrew — Opening.bnr](https://wiibrew.org/wiki/Opening.bnr) — `icon.bin` / `banner.bin` as
  LZ77-compressed U8 archives of TPL + brlyt + brlan; IMET header carries the 10-language
  titles referenced in §6.1.
- [Wikipedia — Wii Menu](https://en.wikipedia.org/wiki/Wii_Menu) — 4 pages × 4×3 grid, 48
  customizable slots.
