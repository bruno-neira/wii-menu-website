# Technical architecture — rendering substrate, animation, audio

**Research date:** 2026-07-25
**Scope:** what this UI should be *built on*. Rendering substrate (DOM/CSS vs SVG vs Canvas vs
WebGL), animation approach (CSS vs WAAPI vs a library), the scaling strategy for the fixed
virtual coordinate space, determinism for screenshot testing, the audio layer, and accessibility.
**Not** in scope: visual measurements (those live in `context/components/*`), the decompilation
itself (`context/decomp-findings.md`), or the test harness design (`docs/methodology/visual-regression-tooling.md`).

Every version, browser-support figure and maintenance status below was verified on 2026-07-25
against the npm registry API, the GitHub API, and MDN `browser-compat-data` / `web-features`
(the data behind Baseline and caniuse). Nothing is quoted from memory.

---

## 0. The recommendation, in one screen

> **Build it on DOM + CSS, scaled by a single `transform: scale()` on a fixed-size root, with
> inline SVG for exactly two things (the tile aperture clip and the bottom-bar contour) and
> Canvas 2D for exactly one (generating noise texture, once, not per frame). Animate with plain
> CSS for everything declarative and looping, and the Web Animations API for everything stateful,
> reversible, or orchestrated. Ship no animation library. Use raw Web Audio for sound.**

| Layer | Choice | Why, in one line |
|---|---|---|
| **Substrate** | **DOM + CSS**, ~200 elements | 48 tiles is a small number; you need hit-testing, focus, and text for all of them |
| **Exact curves** | **Inline SVG** — one `<clipPath>` for the tile superellipse, one `<svg>` for the bottom bar | `border-radius` cannot express a convex superellipse; nothing in CSS can anchor a gradient to a curved edge |
| **Noise/static** | **Canvas 2D, pre-generating N frames once**, then cycled by a CSS `steps()` animation | Kills the only nondeterministic rAF loop in the app |
| **WebGL / Pixi / Three** | **No** | The always-animating grid is 48 compositor-thread transforms, which is free. WebGL would cost a11y, text, and freezability for zero gain |
| **Declarative animation** | **CSS `@keyframes` / transitions**, one easing token `cubic-bezier(0.5, 0, 0.5, 1)` | Every duration is a known constant; there is exactly one curve |
| **Stateful animation** | **WAAPI (`Element.animate`)** | `playbackRate = -1` is a literal 1:1 match for the engine's `ANIM_TYPE_BACKWARD`; `finished` promises implement the hover state machine |
| **Animation library** | **None** | Motion/GSAP/anime all solve problems this project does not have (springs, layout projection, morphing). Motion One is archived; Popmotion is abandoned |
| **Scaling** | **`transform: scale(s)` on a fixed 832×456 root** | Lets you author in literal decomp units, makes `clip-path: path()` usable, and makes the render pixel-deterministic at integer scales |
| **Audio** | **Raw Web Audio API** — `AudioBufferSourceNode → GainNode → StereoPannerNode` | ~80 lines. Howler.js has had no release since 2023-09-19 and its fallbacks are obsolete |
| **Framework** | **Keep React + Vite**, but keep React out of the frame loop | React renders once per logical state change; CSS/WAAPI own the frames |

**If you read nothing else:** the shape problems (superellipse, curved-edge gradient) are the only
genuinely hard rendering problems here, they are both solved by a total of ~30 lines of inline SVG,
and everything else is plain CSS. Do not let the shape problems talk you into a canvas or WebGL
substrate — they are two small, static, non-interactive pieces of chrome.

---

## 1. The constraints that actually decide this

Restating them in the form that makes the decision, because several of them point the opposite way
from the naive reading.

1. **Fixed virtual coordinate space, 608×456 / 832×456**
   (`decomp-findings.md` §1, `getProjectionRect4x3/16x9`). This is *not* a responsive layout. It
   is a console framebuffer scaled to fit. That single fact eliminates the hardest CSS problems in
   the project before they start (see §5), and it is why `clip-path: path()` — normally unusable
   because it takes no percentages — is the right tool here.

2. **"48 simultaneous animations" is really "12 + a fraction".**
   The grid is one continuous 16-column strip (`channel-tile.md` §8.2), so all 48 tiles exist, but
   only **12 tiles plus ~37% of a 13th column** are on screen at a time. The other 36 are
   off-viewport and should be *paused*, not merely clipped. The perf question is therefore "can the
   browser composite ~13 slowly-animating tiles at 60fps" — and the answer is trivially yes.

3. **The loops are slow.** Nintendo's own reference icon loop is 2400 frames ≈ **40 s**
   (`channel-tile.md` §5.3); empty slots run ≥2000 frames ≈ 33 s at a random phase
   (`decomp-findings.md` §5.1). These are ambient drifts, not 60fps particle systems. A 40-second
   keyframe interpolation costs the compositor essentially nothing per frame.

4. **Random per-slot phase is a perf *asset*, not a liability.** It desynchronises keyframe
   boundaries so style recalculation and compositor commits are spread across frames instead of
   spiking on one. And it is free: `animation-delay: calc(var(--phase) * -1ms)` with a negative
   value starts a CSS animation mid-cycle with zero JavaScript.

5. **The engine's animation model is "play frame range N→M, forward or backward."**
   `setMinFrame(200); setMaxFrame(228); setAnmType(ANIM_TYPE_FORWARD|BACKWARD); start()`
   (`decomp-findings.md` §3.1, §3.3). WAAPI's `Animation` object — `currentTime`, `playbackRate`,
   `reverse()`, `finished`, `updatePlaybackRate()` — is a near-exact mapping. This is the single
   strongest technical argument in this document for choosing WAAPI over a library.

6. **One easing curve.** `HermiteIntp` with zero tangents collapses to `3t² − 2t³` = smoothstep
   (`decomp-findings.md` §3.2), and it is the engine's *standard* interpolator, not a one-off.
   `cubic-bezier(0.5, 0, 0.5, 1)` approximates it to <0.5%. Define it once as
   `--ease-wii: cubic-bezier(0.5, 0, 0.5, 1)` and never write another easing function.

7. **The hover state machine is not a CSS `:hover` transition.** `calcCursorAnim()` refuses to
   start the focus-out animation until focus-in has finished, and queues a pending intent so a
   flick-over-and-off still plays in→out in full (`decomp-findings.md` §2.2). CSS transitions
   interrupt mid-flight and reverse — the opposite behaviour. This needs ~25 lines of JS around
   WAAPI `finished` promises.

---

## 2. Rendering substrate

### 2.1 The convex superellipse — can DOM + CSS express it?

The tile aperture is a superellipse `|x/a|ⁿ + |y/b|ⁿ = 1` with **n ≈ 7.16** (4:3) / **n ≈ 8.41**
(16:9), bowing outward ~1.5% of width (`channel-tile.md` §1.3). Four candidate mechanisms:

#### (a) `border-radius` — ❌ cannot express it

`border-radius` produces elliptical corner arcs joined by **perfectly straight edges**. The
superellipse's defining feature here is that the *edges are not straight*. `border-radius` is a
faithful approximation (error ≤1.5% of width, invisible below ~800px render width) but it is
categorically the wrong shape, and it will never converge in a pixel diff against a reference
rendered from the real mask.

Keep it as the **fallback**: `border-radius: calc(0.165 * var(--tile-h))` per `channel-tile.md` §1.5.

#### (b) `corner-shape: superellipse()` — ⚠️ Chrome/Edge only, not Baseline, do not depend on it

This is the native expression of exactly this shape, and it is *not shippable as a primary*.

| Browser | `corner-shape` / `superellipse()` |
|---|---|
| Chrome / Chrome Android | **139** (released 2025-08-05) |
| Edge | 139 |
| **Firefox** | **not supported** |
| **Safari / iOS Safari** | **not supported** |
| Baseline | **`false`** — not Baseline, still flagged `experimental` in BCD |

Source: [MDN BCD `css/properties/corner-shape.json`](https://github.com/mdn/browser-compat-data/blob/main/css/properties/corner-shape.json),
[web-features `corner-shape`](https://github.com/web-platform-dx/web-features), verified 2026-07-25.
All values (`round`, `bevel`, `notch`, `scoop`, `square`, `squircle`, `superellipse`) and the
`css.types.superellipse` type carry the same Chrome-139-only support. Chrome is at 150 as of
2026-06-30, so this has sat single-engine for roughly eleven months with no signal from the other
two — treat it as a progressive enhancement indefinitely, not as something arriving soon.

Also note the correct incantation, which is easy to get wrong: `corner-shape` reshapes the corners
*defined by `border-radius`*. To get the full superellipse including edge bow you need
`border-radius: 50%` (so the "corners" span the whole edge), **not** a small pixel radius:

```css
.tile {
  border-radius: 50%;
  corner-shape: superellipse(7.2);   /* Chrome/Edge 139+ only */
}
```

With `border-radius: 16px; corner-shape: superellipse(7.2)` you get superellipse-shaped *corners*
joined by straight edges — which is not the target shape. *[Inferred from the CSS Borders spec's
corner-shape semantics; not verified against a live Chrome build — verify before shipping.]*

#### (c) SVG `<clipPath clipPathUnits="objectBoundingBox">` — ✅ universally supported

Baseline **high** since 2015-07-29 (`svg.elements.clipPath.clipPathUnits`). One `<clipPath>`
defined once in a hidden `<svg>`, referenced by all 48 tiles via `clip-path: url(#wii-tile)`. Scales
with the element automatically. `channel-tile.md` §1.5 already has the authored path.

#### (d) `clip-path: path()` in absolute units — ✅ and, given the fixed coordinate space, the best

| | Baseline | Chrome | Firefox | Safari |
|---|---|---|---|---|
| `clip-path: path()` | **high**, since 2023-07-21 | 88 | 71 | 13.1 |
| `clip-path: shape()` | **low**, since 2026-02-24 | 135 | 148 | 18.4 |

Source: [MDN BCD `css/properties/clip-path.json`](https://github.com/mdn/browser-compat-data/blob/main/css/properties/clip-path.json),
[web-features `shape-function`](https://github.com/web-platform-dx/web-features).

The standard objection to `path()` is that it accepts **only absolute user units — no percentages,
no `calc()`** — which makes it useless in a responsive layout. **That objection does not apply
here.** Because the root is a fixed 832×456 box scaled by a transform (§5), every tile is
*literally* `width: 170px; height: 96px` in CSS pixels, always. A `path()` authored in those units
is exact, stable, and needs no normalisation:

```css
.tile__aperture {
  width: 160px; height: 88px;             /* the aperture, per channel-tile.md §1.1 */
  clip-path: path("M 20.8 1.1 Q 80 -1.1 139.2 1.1 A 18.4 14.3 0 0 1 157.6 15.4 …");
}
```

`shape()` is the tool you would need if you had chosen a fluid layout — it takes percentages and
`calc()`. Its Baseline-low date of 2026-02-24 is only five months old, so a meaningful slice of
Safari 18.0–18.3 and Firefox <148 users would miss it. **That `path()` is sufficient here, and
`shape()` would have been required otherwise, is itself an argument for the fixed-scale strategy in
§5.**

#### Verdict on the tile shape

**Use the SVG `objectBoundingBox` clipPath (c) as the default.** It has the widest support of the
exact options, it is defined once and shared by 48 elements, and it survives any later change to
tile sizing. Layer `path()` (d) in if you ever need per-aspect-ratio precision, and add
`corner-shape: superellipse(7.16 | 8.41)` inside an `@supports (corner-shape: superellipse(7))`
block purely as a progressive enhancement for Chrome.

**And consider not clipping at all.** Nintendo's pipeline *bakes* the clip: *"Image is clipped in
the shape of the white area as shown; protruding portions are not displayed"* (Icon & Banner Spec
p.8). If a given tile's 40-second loop is exported as a pre-rendered sprite sheet or video rather
than composed live from DOM layers, **bake the aperture into the asset's alpha channel and use no
`clip-path` at all** — faster, more faithful, and one less thing to get wrong. Reserve the live
clip for tiles whose loop is genuinely composed from moving DOM layers.

⚠️ **Whatever you choose: never animate the `clip-path` itself.** A changing clip forces a mask
re-raster every frame. Animate `transform`/`opacity` on children *inside* the clipped box.

### 2.2 The edge-anchored gradient — the one thing CSS genuinely cannot do

`bottom-bar-container.md` §2.2 proves by measurement that the bar's dark band **follows the curved
top contour**, not a horizontal screen-space line: at equal *absolute y* the wing and trough columns
differ by 38 levels; at equal *depth below the contour* they match within 4. The doc correctly
concludes that a `linear-gradient(to bottom, …)` cannot reproduce it.

It is, however, about fifteen lines of SVG, and the technique is worth stating precisely because it
generalises: **an inner shadow that hugs an arbitrary contour is that contour, stroked wide, blurred,
and clipped to the shape.** Half the stroke width falls inside the shape; the blur turns it into a
gradient; and because it *is* the contour, it is anchored to it by construction.

```html
<!-- inside the scaled root; user units == the 832x456 virtual space, 1:1 -->
<svg class="bottom-bar" width="832" height="456" viewBox="0 0 832 456" aria-hidden="true"
     focusable="false" style="pointer-events:none">
  <defs>
    <!-- the full silhouette, closed to the bottom of the screen -->
    <path id="bar-fill" d="M0,330 L147,330 C242,359 222,371 293,379 L539,379
                           C610,371 590,359 685,330 L832,330 L832,456 L0,456 Z"/>
    <!-- just the top contour, open -->
    <path id="bar-edge" d="M0,330 L147,330 C242,359 222,371 293,379 L539,379
                           C610,371 590,359 685,330 L832,330"/>
    <clipPath id="bar-clip"><use href="#bar-fill"/></clipPath>
    <filter id="bar-soften" x="-10%" y="-10%" width="120%" height="140%">
      <feGaussianBlur stdDeviation="7"/>
    </filter>
  </defs>

  <g clip-path="url(#bar-clip)">
    <use href="#bar-fill" fill="#D0D2D9"/>                     <!-- flat cool base, §2.1 -->
    <use href="#bar-edge" fill="none" stroke="#8B93A2"         <!-- inner shadow ON the curve -->
         stroke-width="40" filter="url(#bar-soften)" opacity="0.9"/>
  </g>

  <use href="#bar-edge" fill="none" stroke="#3BBDEA" stroke-width="1"/>  <!-- accent hairline -->
</svg>
```

Path coordinates are `bottom-bar-container.md` §1.5's percentages resolved into the 832×456 space
(72.46% H → 330.4; 83.05% H → 378.7; 17.62% W → 146.6; controls at 241.7/359.4 and 221.9/371.0;
35.24% W → 293.2; right side mirrored about x = 416). Only the 16:9 contour is measured — §1.5 of
that doc flags 4:3 as an open gap, so keep the `d` string in a constants module with a slot for a
4:3 variant.

Three notes:
- **The accent stroke is drawn outside the clip**, so it sits *on* the contour rather than being
  half-eaten by it. This matches the measurement: exactly one antialiased pixel above the core and
  **zero** below (§3.1) — the fill's dark band starts on the very next row.
- **Do not use `filter: drop-shadow` or `box-shadow`** for the accent line. §3.1 proves it is a
  solid 1px stroke with no bloom; a shadow smears symmetrically.
- **Hairline crispness:** at scale 2 the 1-unit stroke is 2 device px and crisp. At a fractional
  scale it lands on a fractional pixel and antialiases. That is *faithful* (the real thing at 1080p
  would be ~2.4px), and §5's integer-scale test viewport makes the baseline deterministic. If it
  reads mushy in the browser, `vector-effect="non-scaling-stroke"` pins it to 1 CSS px at any scale —
  crisper, slightly less faithful. Pick one and document it.

The bar is `pointer-events: none` and `aria-hidden` — `bottom-bar-container.md` §0.2 establishes it
is pure backdrop with no hit region, and all interactivity belongs to DOM buttons layered above it.

### 2.3 The TV static — Canvas 2D, but not the way it is currently done

`src/components/ChannelStatic.jsx` runs a `requestAnimationFrame` loop that calls
`ctx.createImageData()` + `putImageData()` every 3000 ms, filling 64×36 pixels from `Math.random()`.

Two problems, one performance and one correctness:

- **Perf:** it allocates a fresh 9 KB `ImageData` on every draw and keeps a rAF callback alive
  permanently just to check a timestamp. One instance is negligible; if the empty-slot treatment
  ever uses this per slot, it is 36 permanent rAF callbacks.
- **Correctness / testability:** this is the **only** thing in the app that Playwright's
  `animations: 'disabled'` cannot stop. `animations: 'disabled'` covers CSS animations, CSS
  transitions and Web Animations — not rAF. `visual-regression-tooling.md` §6.2 works around this
  with a `window.__VISUAL_TEST__` flag plus a seeded `Math.random`, i.e. test-awareness leaking into
  production code.

**Replace the live loop with pre-generation.** At mount, generate **N frames (8 is plenty) into one
offscreen canvas laid out as a vertical sprite sheet**, export once, and cycle it with a CSS
`steps()` animation on `background-position`:

```js
// once, at module load — no rAF, no per-frame allocation
const FRAMES = 8, W = 64, H = 36;
const sheet = document.createElement('canvas');
sheet.width = W; sheet.height = H * FRAMES;
const ctx = sheet.getContext('2d');
const img = ctx.createImageData(W, H * FRAMES);
// ...fill from a SEEDED prng (mulberry32), not Math.random...
ctx.putImageData(img, 0, 0);
const url = sheet.toDataURL();
```

```css
.static {
  background-image: var(--static-sheet);
  background-size: 100% 800%;
  image-rendering: pixelated;
  animation: static-cycle 1.5s steps(8) infinite;
  animation-delay: calc(var(--phase) * -1ms);   /* per-slot desync, free */
}
@keyframes static-cycle { to { background-position-y: 100%; } }
```

This: eliminates all per-frame JS; makes the effect deterministic by construction (seeded once);
makes it freeze automatically under `animations: 'disabled'`; removes the need for
`window.__VISUAL_TEST__` entirely; and gives you per-slot random phase for free. `image-rendering`
is Baseline high since 2021-10-05.

`background-position` is a paint-thread property, so this is not compositor-only — but at 64×36
with 8 discrete steps and a 1.5 s cycle, it repaints a 9 KB texture ~5 times per second. Irrelevant.
If it ever isn't, stack 8 absolutely-positioned `<div>`s and animate `opacity` with `steps()`, which
is compositor-only.

**This is the single highest-value change in the current source.**

### 2.4 Canvas 2D as the substrate — what it would cost

Full control over geometry, and it makes the superellipse and the bar contour trivial
(`ctx.ellipse` / `ctx.bezierCurveTo`). It is still the wrong choice, and the cost is concrete rather
than philosophical:

- **48 hit targets vanish.** You reimplement hit-testing against a superellipse, hover/leave
  dispatch, and the drag-and-drop grid.
- **The accessible name of half the tiles vanishes.** `channel-tile.md` §6.3: Disc and Mii tiles are
  *wordless* — the hover title pop-up is their only label. On canvas you must build a parallel
  offscreen DOM for screen readers anyway, at which point you are maintaining two trees.
- **Keyboard navigation vanishes.** Roving tabindex, focus rings, `:focus-visible` — all hand-rolled.
- **Text rendering regresses.** The clock, the date, and the balloon labels are text. Canvas text
  has no font fallback control, no subpixel positioning parity with DOM, and is not selectable.
- **The freeze seam vanishes.** Every determinism mechanism in
  `visual-regression-tooling.md` §6 (`animations: 'disabled'`, the injected `screenshot.css`,
  `Element.getAnimations()`) operates on CSS/WAAPI. A canvas scene needs a bespoke "render at time
  T" entry point, which is buildable but is a whole extra contract to keep honest.

**Verdict: canvas for the noise texture only.** Its one genuine advantage — per-pixel stochastic
fill — is exactly what the noise needs and nothing else here needs.

### 2.5 Inline SVG as the substrate

SVG is excellent at what §2.1 and §2.2 need and mediocre as a whole-app substrate.

- **Animation:** SMIL (`<animate>`) is a dead end — deprecated-then-unde­precated, inconsistently
  optimised, and it does not compose with CSS. **Do not use SMIL.** CSS `transform` on SVG elements
  works and is compositable in all current engines. JS-driven attribute mutation is main-thread and
  slow.
- **Performance at scale:** SVG elements are DOM nodes with additional layout semantics; a few
  hundred is fine, a few thousand is not. 48 tiles' worth of *chrome* is fine; 48 tiles' worth of
  *content* would be worse than plain divs because SVG groups do not get promoted to compositor
  layers as readily.
- **Accessibility:** workable (`role="img"`, `<title>`), but strictly worse ergonomics than a
  `<button>`.

**Verdict: SVG for shapes, not for structure.** Two SVGs total in the app — one hidden `<svg>`
holding the shared `<clipPath>`, one visible `<svg>` for the bottom bar. Both `aria-hidden`.

### 2.6 WebGL / PixiJS / Three.js — and why the always-animating grid does not change the calculus

All three are healthy: [PixiJS](https://github.com/pixijs/pixijs) (47.9k ★, pushed 2026-07-19),
[Three.js](https://github.com/mrdoob/three.js) (114k ★, pushed 2026-07-25). Neither is right here.

The instinct is "48 things animating at once ⇒ I need the GPU." **The DOM already uses the GPU for
this.** A CSS animation on `transform` or `opacity` runs entirely on the **compositor thread**:
the browser rasterises the element once into a texture and the compositor interpolates the matrix.
That is *the same GPU work Pixi would do*, with none of the cost of shipping a scene graph. The
main thread does nothing per frame.

Concretely, what WebGL would buy and cost:

| | WebGL/Pixi | DOM+CSS |
|---|---|---|
| 13 visible tiles, slow transform loops | free | **free** (compositor) |
| Superellipse clip | shader / mask texture | one shared `<clipPath>` |
| Curved-edge gradient | shader | 15 lines of SVG |
| Text (clock, date, balloons) | bitmap fonts or SDF, hand-laid-out | `<span>` |
| Hit-testing 48 tiles | hand-rolled | free |
| Keyboard nav / focus / screen readers | **not possible without a parallel DOM** | free |
| Freezing for screenshots | bespoke `renderAtTime(t)` | `animations: 'disabled'` |
| Bundle | +250–450 KB | 0 |
| Faithfulness to the source | a 2D scene graph is arguably closer to `nw4r::lyt` | — |

The last row is the only honest argument in WebGL's favour, and it is aesthetic rather than
technical. WebGL becomes correct when you need **per-pixel effects across the whole scene** (a real
CRT shader, chromatic aberration, a warped screen) or **thousands of elements**. This project has
neither: 48 elements, and its one per-pixel effect is a 64×36 noise patch.

**Verdict: no. Revisit only if the project later wants a full-screen CRT/scanline post-process, and
even then reach for a single fragment-shader pass over a screenshot before reaching for a scene graph.**

### 2.7 The hybrid boundary, drawn explicitly

```
┌─ #root ────────────────────────────────────────────────────────────────────┐
│  DOM (unscaled, screen space)                                              │
│   • the cursor layer  ── see §5 note; lives OUTSIDE the transform          │
│   • the letterbox / background fill                                        │
│                                                                            │
│  ┌─ .stage  ── 832 x 456 px, transform: scale(s) translate(...) ─────────┐ │
│  │  DOM (virtual space; every length is a literal decomp number)         │ │
│  │   • page background                                                   │ │
│  │   • .grid-strip  — 16 columns x 3 rows, translateX for paging         │ │
│  │       • 48 x <button.tile>                                            │ │
│  │           - .tile__frame     DOM  (1px #BEBEBE keyline, halo, shadow) │ │
│  │           - .tile__aperture  DOM  clip-path: url(#wii-tile)  ← SVG    │ │
│  │               • icon loop layers  DOM  (transform/opacity only)       │ │
│  │               • [empty slots] .static  CANVAS-GENERATED sprite sheet  │ │
│  │       • balloons (DOM, text)                                          │ │
│  │   • page arrows (DOM buttons)                                         │ │
│  │   • clock  (DOM text — ABOVE the trough line, on the page bg)         │ │
│  │   • <svg class="bottom-bar">  ← SVG: contour + inner shadow + accent  │ │
│  │       (aria-hidden, pointer-events:none)                              │ │
│  │   • Wii / SD / Mail buttons (DOM buttons, layered ON TOP of the SVG)  │ │
│  │   • date  (DOM text — BELOW the trough line, on the bar)              │ │
│  │   • preview overlay / black fade (DOM)                                │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  <svg width=0 height=0 aria-hidden>  ← the shared <clipPath> definitions   │
└────────────────────────────────────────────────────────────────────────────┘
```

**The rule:** SVG owns *shapes that CSS cannot describe*. Canvas owns *pixels that must be
generated*. DOM owns *everything that is clickable, focusable, or readable* — which is everything
else.

Note the clock/date split is load-bearing, per `bottom-bar-container.md` §6.1: the clock sits
*above* the accent line on the page background, the date sits *below* it on the bar. They must not
be nested in one "bottom bar" container.

---

## 3. Animation approach

### 3.1 Plain CSS — sufficient for the majority

Given known constants and a single easing curve, CSS covers, with no JS at all:

- **48 idle icon loops.** `animation: icon-loop 40s linear infinite;` plus
  `animation-delay: calc(var(--phase) * -1ms)` where `--phase` is set once as an inline style. A
  **negative** delay starts the animation already in progress — this is the exact mechanism for the
  decomp's `rndm % 2000` seed, in one declaration.
- **Hover / focus visuals** (100 ms in, 133 ms out — asymmetric, so two separate declarations, not
  one `transition`).
- **The bottom bar's per-button hover.**
- **The arrow idle loop** (`G_ArwRoop`, 55 frames = 917 ms).
- **The mail-button signal loops** (400 frames = 6667 ms; new-mail 160 frames = 2667 ms repeating
  every 3000 ms).
- **The colon blink** (2 s cycle).
- **The noise sprite cycle** (§2.3).

All of it compositor-only if you restrict yourself to `transform` and `opacity`.

### 3.2 WAAPI — required for four specific things

`Element.animate()` is Baseline **high** since 2023-03-16 (Chrome 84, Firefox 75, Safari 14).
Source: [web-features `web-animations`](https://github.com/web-platform-dx/web-features).

Use it where CSS structurally cannot:

1. **The asymmetric, queued hover state machine** (`decomp-findings.md` §2.2). CSS transitions
   reverse mid-flight; the Wii refuses to. WAAPI gives you the seam:
   ```js
   async function focusOut(el) {
     const inAnim = el.__focusIn;
     if (inAnim && inAnim.playState === 'running') await inAnim.finished;  // never interrupt
     if (el.__intent !== 'out') return;                                    // intent may have flipped back
     el.animate(FOCUS_OUT_KEYFRAMES, { duration: 133, easing: EASE_WII, fill: 'forwards' });
   }
   ```
2. **Reverse playback of the same animation.** The engine's zoom-out is literally the zoom-in with
   `ANIM_TYPE_BACKWARD`; the balloon's out is its in played backward (`decomp-findings.md` §2.4,
   §3.3). In WAAPI that is `anim.playbackRate = -1; anim.play()` — the identical keyframes,
   guaranteed to mirror exactly. In CSS you would author two keyframe sets and hope they stay in
   sync.
3. **Orchestrating the 467 ms launch zoom.** Four things run on one timeline: the stage scale about
   the tile's centre, the destination screen's alpha 0→255, the black surround's alpha, and a sound
   trigger at t=0. Sharing one `startTime` across several `Animation` objects keeps them locked;
   `Promise.all([...].map(a => a.finished))` gives you a single completion hook.
4. **Frame-exact scrubbing for tests.** `document.getAnimations().forEach(a => { a.pause();
   a.currentTime = 233; })` lets you screenshot **frame 14 of 28** of the zoom and assert that it is
   at smoothstep(0.5) = 0.5. That is strictly more capability than `animations: 'disabled'`, and it
   is the natural way to make the frame-exact timings in `decomp-findings.md` §12 actually testable
   rather than merely documented.

Point 4 alone justifies WAAPI: this project's whole premise is frame-exact fidelity, and WAAPI is
the only option that lets a test assert about a specific frame.

### 3.3 Library audit — verified 2026-07-25

| Library | Latest | Published | License | Repo status | Verdict |
|---|---|---|---|---|---|
| **Motion** (`motion`) | **12.42.2** | 2026-06-30 | MIT | [motiondivision/motion](https://github.com/motiondivision/motion) 32.9k ★, pushed 2026-07-01 | ✅ healthy — ❌ **not needed** |
| **Framer Motion** (`framer-motion`) | 12.42.2 | 2026-06-30 | MIT | same repo | Same package, old name. `motion` literally `depends on` `framer-motion` at the identical version; both are published in lockstep. **"Motion" is the current name.** |
| **GSAP** | **3.15.0** | 2026-04-13 | **Standard "No Charge" License** | [greensock/GSAP](https://github.com/greensock/GSAP) 27k ★, pushed 2026-04-13 | ✅ healthy, ✅ **now free** — ❌ not warranted |
| **Anime.js** | **4.5.0** | 2026-06-22 | MIT | [juliangarnier/anime](https://github.com/juliangarnier/anime) 71.5k ★, pushed 2026-06-22 | ✅ healthy — ❌ not needed |
| **Motion One** (`@motionone/dom`) | 10.18.0 | **2024-06-02** | MIT | [motiondivision/motionone](https://github.com/motiondivision/motionone) — **ARCHIVED 2024-11-12** | ☠️ **Do not adopt.** Folded into Motion. |
| **Popmotion** | 11.0.5 | **2022-08-15** | MIT | [Popmotion/popmotion](https://github.com/Popmotion/popmotion) — last push **2024-03-12**, not archived | ☠️ **Abandoned.** ~4 years since last release. Superseded by Motion. |

**GSAP's licensing did change, and in the project's favour.** As of the
[Standard "No Charge" License](https://gsap.com/standard-license/), **effective 2025-04-30**
(last modified 2025-05-30), GSAP is free for everyone including commercial use, and the formerly
paid Club GreenSock plugins (SplitText, MorphSVG, etc.) are included at no charge — Webflow funds it.
The only restriction is against building a competing visual animation tool. So "GSAP costs money"
is **out of date**; do not repeat it. Two caveats remain: the npm `license` field is a URL, not an
OSI identifier, and the GitHub repo reports **no license** — it is free-of-charge proprietary, not
open source. And at ~70 KB for the core it is not free of *weight*.

**Recommendation: ship no animation library.** Reasoning against each, specifically:

- **Motion** is the strongest general-purpose option and the wrong tool here. Its headline features
  are **spring physics** (this project has zero springs — every duration is a fixed frame count),
  **layout animation / FLIP projection** (irrelevant in a fixed coordinate space where nothing
  reflows), **gesture-driven values**, and **`AnimatePresence`** (a real convenience, replaceable
  with ~20 lines). Underneath, its "hybrid engine" is WAAPI plus a JS fallback for properties WAAPI
  cannot handle — and every property this project animates (`transform`, `opacity`) is one WAAPI
  handles natively. You would ship 35–50 KB to get a nicer syntax over an API you are already using
  directly. On the React-coupling question in the brief: it is moot, because **React should not be
  in the frame loop at all** (§4), and a React-coupled animation library's entire value proposition
  is putting it there.
- **GSAP** earns its weight on long, multi-element, seek-able timelines and on morphing. The
  decomp's timelines are 2–4 elements over 467 ms. Keep it in your back pocket if the Message Board
  or Calendar scenes turn out to need genuinely complex sequencing.
- **Anime.js v4** is small, MIT and genuinely well-made, but it solves the same problem as three
  lines of WAAPI.

**What you actually need is ~120 lines** implementing the engine's own vocabulary, which no library
offers because no library models a Nintendo layout runtime:

```js
export const EASE_WII = 'cubic-bezier(0.5, 0, 0.5, 1)';   // = 3t² − 2t³, decomp §3.2
export const frames = n => (n / 60) * 1000;               // NTSC 60Hz → ms

// "play frame range N→M forward or backward", i.e. setMinFrame/setMaxFrame/setAnmType/start
export function playRange(el, keyframes, frameCount, { backward = false } = {}) {
  const a = el.animate(keyframes, {
    duration: frames(frameCount), easing: EASE_WII, fill: 'both',
  });
  if (backward) { a.currentTime = a.effect.getTiming().duration; a.playbackRate = -1; }
  return a;
}
```

Every timing in `decomp-findings.md` §12 then reads as `playRange(stage, ZOOM, 28)` /
`playRange(grid, PAGE_SLIDE, 20)`, and the source is auditable against the decomp line by line.
That legibility is worth more on this project than any library's ergonomics.

---

## 4. The 48-simultaneous-animations problem

Reframed per §1.2: **13 animating on screen, 35 paused off screen.** The discipline:

**Compositor-friendly properties only.** Animate `transform` and `opacity`. Nothing else.
Specifically avoid, despite their appeal for icon loops:
- `background-position` — this is the natural CSS analogue of the engine's *texture matrix
  translation* (`channel-tile.md` §5.5) and it is a **paint-thread** property. For a scrolling/
  parallax icon loop, use a wider-than-aperture child `<div>` with a background image and animate
  its `transform: translateX()` instead. Identical result, compositor-only.
- `filter`, `box-shadow`, `width/height/top/left`, and anything that triggers layout.
- `clip-path` (see §2.1).

**`will-change` discipline.** Do **not** put `will-change: transform` on 48 tiles. Each promoted
layer costs GPU memory: at the recommended ≥4× authoring resolution (`channel-tile.md` §4.2) a
170×96 tile is 680×384 ≈ **1 MB RGBA**, and with 2–4 internal layers per tile, 48 tiles is
50–200 MB of texture. Apply `will-change` via a class only to elements currently in a transition,
and **remove it when the transition ends**. The grid strip itself (one element) can carry it
permanently — paging is frequent and it is one layer.

**Containment.** Each tile is a fixed-size box that cannot affect its siblings' geometry:
```css
.tile { contain: layout paint style; }   /* Baseline high since 2022-03-14 */
```
This stops any style invalidation inside a tile from walking the whole grid — worth having with 48
of them.

**Pause off-page tiles.** Only the current page (plus the peeking column) should be running:
```css
.page[data-active="false"] .tile { animation-play-state: paused; }
```
CSS preserves each animation's elapsed time across pause/resume, so the random phase survives — you
do not have to re-seed. Resume the incoming page at the *start* of the 333 ms slide so nothing pops.

Prefer this to `content-visibility: auto`. `content-visibility` is Baseline only since **2025-09-15**
(Chrome 108, Firefox 130, **Safari 26**) and it skips rendering entirely, which causes a raster
hitch on the frame the content becomes visible — exactly the wrong moment during a page slide.

**Randomised phase: helps.** Beyond fidelity, it spreads keyframe-boundary work across frames.
Derive it deterministically (§6) rather than from `Math.random()`.

**One rAF for the whole app, or none.** The only thing that genuinely needs per-frame JS is the
cursor's dragging-circle smoothing (`cursor.md` §6.2). Give it *the* rAF loop; everything else goes
through CSS/WAAPI. Never `setState` from a `mousemove` — read into a ref in a `{ passive: true }`
listener, apply once per rAF:
```js
el.style.translate = `${x}px ${y}px`;     // individual transform properties,
el.style.rotate    = `${deg}deg`;         // Baseline high since 2022-08-05
```
`translate`/`rotate`/`scale` as separate properties avoid string-concatenating a `transform` and let
the cursor's position and tilt animate independently — which matters because the decomp drives them
from separate panes (`N_Trans` and `N_Rot`, `cursor.md` §5).

**Budget check.** 13 tiles × ~3 layers = ~40 composited layers, each interpolating a matrix over
33–40 s. Plus the strip, the cursor, the bar. This is a ~50-layer scene at 60 fps with an idle main
thread. It is not close to a problem on any machine that can run a 2026 browser.

---

## 5. Scaling strategy for the fixed coordinate space

Three candidates:

| | Approach | Verdict |
|---|---|---|
| **(a)** | `transform: scale(s)` on a fixed 832×456 root | ✅ **Recommended** |
| **(b)** | A `--u` unit custom property, everything in `calc(N * var(--u))` | ❌ |
| **(c)** | `clamp()` / `vw` / `%` per property | ❌ |

```css
.stage {
  position: absolute; top: 50%; left: 50%;
  width: 832px; height: 456px;            /* 16:9 virtual space, decomp §1 */
  transform: translate(-50%, -50%) scale(var(--scale));
  transform-origin: center;
}
```
```js
const setScale = () =>
  document.documentElement.style.setProperty('--scale',
    Math.min(innerWidth / 832, innerHeight / 456));
```

**Why (a) wins, on grounds specific to this project:**

1. **The source becomes readable against the decomp.** A tile is `width: 170px; height: 96px`. The
   grid pitch is `170px`. The bar's wing edge is at `y: 330px`. Every number in the CSS is a number
   you can grep for in `decomp-findings.md`. With (b) it is `calc(170 * var(--u))` everywhere; with
   (c) it is `20.43%` and you have lost the provenance.
2. **It makes `clip-path: path()` usable** (§2.1) — Baseline high since 2023 — because element sizes
   are literally fixed in CSS px. Under (b)/(c) you are forced onto `shape()` (Baseline only since
   2026-02-24) or `objectBoundingBox` clip paths.
3. **The launch zoom becomes a one-liner.** The decomp's zoom interpolates the four viewport corners
   onto the four tile corners and derives a translate+scale for the whole scene
   (`decomp-findings.md` §3.1). That is *exactly* `transform: scale()` with a `transform-origin` at
   the tile's centre — on the element you already have. Under (b)/(c) there is no single element
   representing the scene's coordinate frame.
4. **Sub-pixel cleanliness for screenshot comparison — the decisive one.** With (a) there is exactly
   **one** rounding operation, at the root. Pin the test viewport to an integer multiple of the
   virtual space — **832×456 (scale 1) or 1664×912 (scale 2)** — and every element lands on an exact
   device-pixel boundary. Combined with `deviceScaleFactor: 1` and `scale: 'css'` from
   `visual-regression-tooling.md` §6.5, the render becomes **byte-stable**, which is the precondition
   for the double-capture assertion in that doc's §8.5.
   Under (b) or (c) every element rounds independently from a fractional base, no viewport makes the
   whole layout integral, and hairlines (the 1px `#BEBEBE` tile keyline, the 1px accent stroke) shift
   antialiasing with the viewport. **There is no viewport size at which (b) or (c) produces a
   pixel-exact render.** That alone settles it for a project whose verification story is
   screenshot diffing.

**Caveats to handle:**

- **`position: fixed` descendants are trapped.** A transformed ancestor becomes the containing
  block for `fixed` children. This is why **the cursor layer lives outside `.stage`** in §2.7's
  diagram… except that the cursor should be *sized in virtual units* (44×62 per `cursor.md` §4) and
  smoothed with a radius in virtual units. Simplest resolution: **put the cursor inside `.stage`
  and convert pointer coordinates into virtual space** by dividing by `--scale` and subtracting the
  stage's offset. One division per frame; keeps the cursor's size, smoothing radius and rotation
  pivot all in decomp units.
- **Text rasterisation during an animating scale.** Chrome re-rasterises text at the composited
  scale when the scale is static, so text is sharp at rest. During the 467 ms zoom it will use a
  cached raster and go momentarily soft. That is acceptable — and arguably *faithful*, since the Wii's
  zoom is an orthographic-projection scale of an already-rendered framebuffer.
- **Two aspect ratios.** 4:3 is `608×456`, 16:9 is `832×456`, and the vertical extent is identical
  (`decomp-findings.md` §1). Switching modes changes one number: `width`. Keep it as a data attribute
  on `.stage` and a pair of constants; the tile size (128 vs 170) and the bar contour follow from it.
- **Non-integer scales in production are fine** — this constraint is about the *test* viewport, not
  the user's.

---

## 6. Determinism for testing

How each choice behaves when animations must be frozen:

| Mechanism | Frozen by `animations: 'disabled'`? | Scrub to an exact frame? |
|---|---|---|
| CSS `@keyframes` | ✅ (infinite → reset to frame 0) | ⚠️ only via `animation-delay` hacks |
| CSS transitions | ✅ | ❌ |
| **WAAPI** | ✅ | ✅ **`a.pause(); a.currentTime = ms`** |
| SVG CSS animation | ✅ (it is a CSS animation) | ✅ via WAAPI |
| **SMIL `<animate>`** | ⚠️ unreliable | ❌ | (another reason not to use SMIL) |
| **Canvas rAF loop** | ❌ **not covered** | ❌ |

Three concrete actions, in priority order:

1. **Eliminate the rAF loop from `ChannelStatic.jsx`** per §2.3. This is the only unfreezable thing
   in the app. Pre-generating a seeded sprite sheet and cycling it with `steps()` closes the hole
   *and* deletes the need for the `window.__VISUAL_TEST__` flag proposed in
   `visual-regression-tooling.md` §8.4. Production code stops being test-aware.

2. **Remove `Math.random()` from the render path entirely.** The per-slot phase from
   `decomp-findings.md` §5.1 (`rndm % 2000`) does not need to be *random* — it needs to be
   *decorrelated*. Derive it from the slot's identity with a cheap integer hash:
   ```js
   const phaseFor = (page, index) => {
     let h = (page * 31 + index) * 2654435761 >>> 0;   // Knuth multiplicative
     h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13;
     return (h >>> 0) % 2000;                          // frames, per the decomp
   };
   ```
   Stable across runs and machines, no seeding ceremony, no `addInitScript` PRNG shim, and it still
   satisfies the decomp's intent that "the grid never ticks in lockstep." Same trick for the noise
   sprite seed. **This makes the app deterministic by construction rather than by test fixture** —
   strictly better than seeding `Math.random` from the outside, which only works when the test
   harness remembers to do it.

3. **Add a frame-scrub hook for WAAPI.** Because §3.2 puts every timing-critical animation on WAAPI,
   a test can do:
   ```js
   await page.evaluate((ms) => {
     document.getAnimations().forEach(a => { a.pause(); a.currentTime = ms; });
   }, 233);   // frame 14 of the 28-frame zoom
   ```
   This turns `decomp-findings.md` §12's master frame table from documentation into assertions.
   It is the reason to prefer WAAPI over CSS for anything you intend to verify.

With those three, the remaining determinism hazards from `visual-regression-tooling.md` §6 are the
live clock (already solved by `page.clock.setFixedTime`) and remote fonts (solved by self-hosting).

---

## 7. Audio

**The requirement.** `decomp-findings.md` §11 catalogues all **90 BRSAR entries**, of which ~20 fire
on the main menu. Two non-negotiable behaviours:

- **Positional panning by pointer X.** `startSEwithPos("WIPL_SE_CH_HOLD", mDragPos.x)`,
  `startSEwithPos("WIPL_SE_CH_SET", …)`, `WIPL_SE_MSG_HOUSE` hard-panned at ±300
  (`iplBoard.cpp:1095`).
- **A held, continuously-modulated sound.** `holdSEwithPosDis("WIPL_SE_CH_DRAG", pos.x, speed)` — a
  looping source whose pan follows the pointer and whose intensity follows per-frame movement
  magnitude, updated every frame for the duration of a drag.
- Plus **independent voice channels**: the file enumerates 17 named `PLAYER_*` slots so the focus
  tick, the decide sound and the BGM never cut each other off.

**Options:**

| | Verdict |
|---|---|
| **Plain `<audio>`** | ❌ No panning at all. No sample-accurate scheduling. First-play latency. Cannot do the held drag sound. Non-starter. |
| **Howler.js 2.2.4** | ⚠️ **Dormant.** Last npm release **2023-09-19**; the only repo commits since are a 2024 `BACKERS.md` edit and a 2025 README edit. 415 open issues. Its historical value was the HTML5-Audio fallback and cross-browser papering — both obsolete now that Web Audio has been Baseline **high since 2021-04-26**. It has `stereo()` and `pos()`, but you would be adopting a ~30 KB unmaintained dependency to wrap ~15 lines of API. **Do not adopt.** |
| **Tone.js 15.1.22** (2025-04-27, active) | ❌ A music-synthesis framework. ~200 KB to get a stereo pan. Wrong tool. |
| **Raw Web Audio API** | ✅ **Recommended.** |

```js
const ctx = new AudioContext();
const buffers = new Map();                       // name → AudioBuffer, decoded once at boot

// mirror the engine's PLAYER_* voice slots as named buses so they never cut each other off
const bus = name => (buses[name] ??= Object.assign(ctx.createGain(), {}).connect(ctx.destination));

// pan is a direct translation: the decomp passes virtual-space X in [-416, 416]
const panFor = vx => Math.max(-1, Math.min(1, vx / 416));

export function playSE(name, { x = 0, gain = 1, player = 'NORMAL' } = {}) {
  const src = ctx.createBufferSource();  src.buffer = buffers.get(name);
  const g   = ctx.createGain();          g.gain.value = gain;
  const p   = ctx.createStereoPanner();  p.pan.value = panFor(x);
  src.connect(g).connect(p).connect(bus(player));
  src.start();
  return { src, g, p };                  // caller can keep p.pan / g.gain live for held sounds
}
```

`StereoPannerNode` support: Chrome 41, Firefox 37, **Safari 14.1**, Edge 12
([MDN BCD `api/StereoPannerNode.json`](https://github.com/mdn/browser-compat-data/blob/main/api/StereoPannerNode.json)).
Use `StereoPannerNode`, not `PannerNode` — you want equal-power stereo panning on a 1-D axis, not
3-D HRTF spatialisation, and `StereoPannerNode` is much cheaper.

For the held drag sound: one looping `AudioBufferSourceNode`, and per frame
`p.pan.setTargetAtTime(panFor(x), ctx.currentTime, 0.02)` and the same for gain from the speed
term — `setTargetAtTime` gives you a smooth exponential approach instead of zipper noise, which is a
thing Howler cannot express at all.

**One gotcha to plan for.** `AudioContext` starts `suspended` under browser autoplay policy and
needs a user gesture to `resume()`. The Wii's BGM starts at boot, so you need a first-interaction
gate — and the project already has the thematically perfect one: **the Health & Safety screen**,
which the decomp establishes is genuinely the first screen and genuinely requires a button press
(`iplHealth.cpp`, 2000 ms input lockout, then A). Boot into it, resume the context on the button
press, and the autoplay constraint becomes a fidelity feature.

---

## 8. Accessibility and `prefers-reduced-motion`

**What each substrate costs:**

| | Keyboard nav | Focus | Screen readers |
|---|---|---|---|
| **DOM** | free (`<button>`, roving tabindex) | free (`:focus-visible`) | free (`aria-label`) |
| **SVG** | needs `tabindex` + `role`; workable but clumsy | usable | `<title>` / `role="img"`; fine for decorative chrome |
| **Canvas** | ❌ none | ❌ none | ❌ none without a parallel DOM |
| **WebGL** | ❌ none | ❌ none | ❌ none without a parallel DOM |

Concretely, for the recommended architecture:

- **Tiles are `<button>`s.** `aria-label` = the channel title. This is not optional decoration:
  `channel-tile.md` §6.3 establishes that Disc and Mii tiles are **wordless** and the hover pop-up
  is their only name. Nintendo's own spec (§5.2.3) describes it as the title that "pops up when the
  cursor is moved over the unselected icon."
- **Hover and keyboard focus drive the same visual state.** The decomp's model already separates the
  highlight (a distinct overlaid layout, `my_IplTop_d.brlyt`) from the tile art — one state, two
  triggers, no extra design work.
- **Roving tabindex across the 4×3 grid**, arrow keys move focus, and moving past a column edge pages
  the strip. This mirrors the real console's +/− page buttons rather than inventing an interaction.
- **The SVG bar and clip defs are `aria-hidden="true" focusable="false" pointer-events="none"`.**
  The three bar buttons are real DOM buttons layered above it.
- **The noise canvas / sprite is `aria-hidden="true"`.**
- **The custom cursor:** `cursor: none` plus a drawn hand is fine for pointer users, but it must be
  restored the moment the user tabs. Track input modality and drop back to the native cursor on
  keyboard interaction — a custom cursor with no visible native fallback is a genuine trap.

**`prefers-reduced-motion` — and the tension to state plainly.**

Nintendo's spec *prohibits* static icons (`channel-tile.md` §5.1: *"Use of still image icons for
which animation has not been set is prohibited"*). The web platform requires honouring a user's
request for less motion. **The user wins.** Say so in the code, with a comment, so nobody
"corrects" it back later for fidelity.

A concrete mapping rather than a blanket `animation: none`:

| Effect | Normal | `prefers-reduced-motion: reduce` |
|---|---|---|
| Icon idle loops (40 s) | run | **pause** (they are the identity of the product, but they are also 48 things moving) |
| Noise / static cycle | run | freeze on one frame |
| Page slide (333 ms translate) | slide | instant swap + 100 ms crossfade |
| Launch zoom (467 ms scale) | zoom | 150 ms crossfade, no scale |
| Cursor smoothing + rotation | on | **off** — 1:1 direct follow, no tilt (lag and rotation are the most vestibularly provocative parts) |
| Hover in/out (100/133 ms) | keep | **keep** — sub-150 ms opacity/scale changes are not what the query is about |
| Black fade transitions (333 ms linear) | keep | keep |

Do this with a CSS custom property gate rather than 40 media-query blocks:
```css
:root { --motion: 1; }
@media (prefers-reduced-motion: reduce) { :root { --motion: 0; } }
/* durations become calc(var(--motion) * 467ms), so 0 collapses them */
```
And read `matchMedia('(prefers-reduced-motion: reduce)').matches` in the WAAPI helper so JS-driven
animations collapse the same way. `prefers-reduced-motion` is Baseline high since 2020-01-15.

---

## 9. What to change in the current source

Ordered by value.

1. **Rewrite `src/components/ChannelStatic.jsx`** to pre-generate a seeded 8-frame sprite sheet once
   and cycle it with a CSS `steps()` animation (§2.3). Removes the only rAF loop, the only
   `Math.random()` in the render path, and the only thing Playwright cannot freeze — and makes the
   `window.__VISUAL_TEST__` flag proposed in `visual-regression-tooling.md` §8.4 unnecessary.
2. **Introduce `.stage`** — a fixed `832×456` root with `transform: scale(var(--scale))` (§5), and
   re-express existing component CSS in literal virtual units. Do this before the component count
   grows; it is a mechanical change now and a rewrite later.
3. **Define the two tokens** and use nothing else:
   `--ease-wii: cubic-bezier(0.5, 0, 0.5, 1)` and a `frames(n)` helper.
4. **Add the shared `<clipPath>`** (one hidden `<svg>` in `index.html` or a root component) and
   `clip-path: url(#wii-tile)` on the tile aperture, with the `border-radius` fallback behind
   `@supports not (clip-path: path("M0 0"))`.
5. **Replace the bottom bar's CSS chrome** with the inline SVG of §2.2 — the contour, the
   contour-anchored inner shadow, and the 1px accent stroke.
6. **Add the WAAPI helper module** (`playRange`, `EASE_WII`, `frames`) and route the hover state
   machine, page slide, and launch zoom through it.
7. **Add the Web Audio module** (§7) with the ~20 main-menu SFX from `decomp-findings.md` §11.
8. **Self-host the two Google Fonts** — already flagged in `visual-regression-tooling.md` §6.3, and
   it is a prerequisite for byte-stable captures.
9. **Add `contain: layout paint style` to `.tile`** and the off-page `animation-play-state: paused`
   rule (§4).

**No new runtime dependencies.** The recommended architecture adds zero packages to `package.json`.
(React 19 is current and the project is on 18; that is orthogonal to everything here and can wait.)

---

## 10. Open questions

| # | Question | Why it matters | How to close it |
|---|---|---|---|
| 1 | Does `border-radius: 50%; corner-shape: superellipse(7.2)` actually produce the measured contour in Chrome 139+? | Determines whether the progressive enhancement in §2.1 is worth writing at all | Render it and diff against the extracted 128×96 mask bitmap. 20 minutes with the existing `compare.mjs` harness |
| 2 | The 4:3 bottom-bar contour is unmeasured (`bottom-bar-container.md` §1.5, gap #3) | The SVG `d` string in §2.2 is 16:9-only | Extract `my_IplTop_a.brlyt` from a System Menu dump, or capture 4:3 in an emulator |
| 3 | Does an animating root `scale()` visibly soften text during the 467 ms zoom on the target hardware? | If yes, consider `will-change: transform` on `.stage` during the zoom, or accept it as faithful | Record the zoom at 60 fps and inspect frames 10–20 |
| 4 | How many DOM layers does a faithful channel icon loop actually need? | Drives the §4 texture-memory budget; 2 layers is fine, 6 is not | Build one channel's loop end-to-end before building twelve |
| 5 | Whether the icon loops should be composed DOM layers or pre-rendered sprite sheets | Sprite sheets let you bake the aperture alpha and drop `clip-path` entirely (§2.1) | Prototype both for one channel and compare frame cost and asset size |

---

## Sources

**Browser support / standards** (all verified 2026-07-25)
- [MDN browser-compat-data — `css/properties/corner-shape.json`](https://github.com/mdn/browser-compat-data/blob/main/css/properties/corner-shape.json) — Chrome 139 only; Firefox/Safari unsupported; `experimental: true`
- [MDN browser-compat-data — `css/properties/clip-path.json`](https://github.com/mdn/browser-compat-data/blob/main/css/properties/clip-path.json) — `path()`: Chrome 88 / Firefox 71 / Safari 13.1
- [MDN browser-compat-data — `css/types/basic-shape.json`](https://github.com/mdn/browser-compat-data/blob/main/css/types/basic-shape.json) — `shape()`: Chrome 135 / Firefox 148 / Safari 18.4
- [MDN browser-compat-data — `api/StereoPannerNode.json`](https://github.com/mdn/browser-compat-data/blob/main/api/StereoPannerNode.json)
- [web-features](https://github.com/web-platform-dx/web-features) (the Baseline dataset) — `corner-shape` baseline `false`; `shape-function` baseline low 2026-02-24; `web-animations` baseline high 2023-03-16; `clip-path` baseline high 2023-07-21; `web-audio` baseline high 2021-04-26; `contain` baseline high 2022-03-14; `content-visibility` baseline low 2025-09-15; `individual-transforms` baseline high 2022-08-05; `prefers-reduced-motion` baseline high 2020-01-15
- [CSS Borders and Box Decorations Level 4 — `corner-shape`](https://drafts.csswg.org/css-borders/#propdef-corner-shape)
- [MDN — `corner-shape`](https://developer.mozilla.org/docs/Web/CSS/Reference/Properties/corner-shape)

**Libraries** (npm registry API + GitHub API, 2026-07-25)
- [motiondivision/motion](https://github.com/motiondivision/motion) — `motion` / `framer-motion` 12.42.2, 2026-06-30, MIT, 32.9k ★
- [motiondivision/motionone](https://github.com/motiondivision/motionone) — **ARCHIVED 2024-11-12**; `@motionone/dom` 10.18.0 last published 2024-06-02
- [Popmotion/popmotion](https://github.com/Popmotion/popmotion) — 11.0.5 last published **2022-08-15**; last repo push 2024-03-12
- [greensock/GSAP](https://github.com/greensock/GSAP) — 3.15.0, 2026-04-13; npm `license` field points at the Standard License URL; GitHub reports no OSI license
- [GSAP Standard "No Charge" License](https://gsap.com/standard-license/) — effective **2025-04-30**, last modified 2025-05-30; free for commercial use, all former Club GreenSock plugins included
- [juliangarnier/anime](https://github.com/juliangarnier/anime) — 4.5.0, 2026-06-22, MIT, 71.5k ★
- [goldfire/howler.js](https://github.com/goldfire/howler.js) — 2.2.4, npm publish **2023-09-19**; only non-code commits since; 415 open issues
- [Tonejs/Tone.js](https://github.com/Tonejs/Tone.js) — 15.1.22, 2025-04-27, MIT, active
- [pixijs/pixijs](https://github.com/pixijs/pixijs) — active, 47.9k ★ · [mrdoob/three.js](https://github.com/mrdoob/three.js) — active, 114k ★

**Project corpus**
- `context/decomp-findings.md` — §1 coordinate space, §2.2 hover state machine, §3.1–3.2 zoom + smoothstep, §5.1 random phase, §6.5 panned SFX, §11 the 90-entry sound table, §12 the master frame table
- `context/components/channel-tile.md` — §1 superellipse fit, §1.5 clip-path recipe, §5 the animation mandate and 40 s loop length, §6.3 the balloon as accessible name, §8.2 the continuous strip
- `context/components/bottom-bar-container.md` — §1.5 the fitted contour, §2.2 the curve-anchored shadow, §3.1 the 1px stroke, §6.1 the clock/date split
- `context/components/cursor.md` — §4 cursor geometry, §5 `N_Trans`/`N_Rot` panes, §6.2 dragging-circle smoothing
- `docs/methodology/visual-regression-tooling.md` — §6 determinism hazards, §6.5 viewport/DPR, §8 the recommended harness
