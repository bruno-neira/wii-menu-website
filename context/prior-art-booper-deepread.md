# Deep technique study — `booper1/Wii-UI`

**Subject:** <https://github.com/booper1/Wii-UI> · Angular 20 + GSAP 3.13 + inline SVG ·
live at <https://skour.is/Wii-UI/> (canonical: `booper1.github.io/Wii-UI/`).
**Read at:** commit `4301c7e` ("added WIP notices / placeholder handling"), pushed
**2026-02-15**. 30 commits, created 2025-08-07. 2 stars, 0 forks, 0 issues, 0 PRs.
**Size:** 3,721 lines of authored TS/HTML/SCSS across 18 components/services.

**Method.** Full clone and read of every source file; font `name` tables extracted with
`strings`; assets identified with `file(1)` and visual inspection; repo metadata, issues
and PRs via `gh`. **Not verified in a browser** — no Chromium available in this
environment, so every claim below is derived from source, not from observed behaviour.
Where that matters (perceived zoom feel, actual sub-pixel rendering) it is flagged.

**Framing.** This is a clean-room-adjacent study. Everything below is *technique*, not
code to lift. See §14 for the explicit do-not-copy list. Read §13 first if you only have
five minutes.

---

## 0. What it is, and the honest one-paragraph verdict

A personal bookmark launcher dressed as the Wii Menu — tiles open GitHub, Spotify,
Netflix, Wordle. Started in React, migrated to Angular. It is **not** trying to be an
accurate recreation; it is trying to be a *usable*, *responsive* homepage that evokes the
Wii. Almost every divergence from ground truth in §11 traces back to that goal.

That distinction is the single most useful thing to hold in mind while reading it. Its
architecture is shaped by "must reflow to 3 columns on a phone", and our architecture is
shaped by "must reproduce a 832×456 console framebuffer byte-for-byte". Those two goals
pull in opposite directions at exactly one place — the scaling strategy — and that is
where its design is least applicable to us and most instructive to study.

**What is genuinely worth taking:** the one-path/three-uses SVG tile idiom (§2), the
tiled-and-recentred background SVG (§4), the portal-shared template for the zoom overlay
and the microtask attribute restore (§3), the culling predicate (§7), the pointer-state
hygiene (§8), and the design-space *discipline* — every geometric constant named and
centralised — independent of the mechanism it uses to express it.

**What must not be taken:** all of the code (no licence, all rights reserved) and roughly
17 MB of assets, of which ~8.8 MB is retail Fontworks/Morisawa/Brøderbund type served
publicly, plus a Nintendo cursor bitmap and a screenshot-derived empty-channel texture.

---

## 1. Technique: the scaling strategy — `calc()`-per-value vs. a single root transform

### 1.1 What booper actually does (it is not quite what the survey says)

The survey describes it as "a fixed virtual design space scaled via
`calc(n / var(--designHeight) * 100dvh)`". That is the *unit convention*, and it is
accurate as far as it goes. But the mechanism underneath is more interesting and more
compromised than that summary implies.

There are **three parallel expressions of the same design space**, which must be kept in
sync by hand:

1. `src/styles.scss` — `--designHeight: 1152` plus a SCSS function
   `@function relativePx($n) { @return calc(#{$n} / var(--designHeight) * 100dvh); }`.
2. `src/app/services/display.service.ts` — a TypeScript twin,
   `public relativePx(n: number): string`, emitting the identical string.
3. The same file's `DESIGN_*` constants (`DESIGN_SLIDE_WIDTH = 1728`,
   `DESIGN_NOTCH_DEPTH = 120`, `DESIGN_ARC_R = 300`, …), which are **not** emitted as
   `calc()` at all — they are multiplied by a JS-computed scalar and written out as
   literal device pixels into SVG `d` attributes and inline `[style.top.px]` bindings.

So the project is really **two coexisting systems**: CSS-side lengths use the `calc()`
convention; SVG-side and layout-critical geometry is computed imperatively in TS and
re-serialised on every resize. That split is not incidental — §1.3 explains why it is
forced.

Critically, **the scale is anisotropic and the layout reflows**:

```ts
private get scaleY() { return this.currentVH() / this.DESIGN_SLIDE_HEIGHT; }  // height always fills
private get scaleX() { return this.isViewportSkinnier ? vw / STAGE_WIDTH : this.scaleY; }
```

and a third derived scalar, `notchScale`, blends the two at weight 0.5 for the bottom-bar
notch specifically. `computeChannelGrid()` then recomputes column and row counts from the
available box (`cols` can drop to 1–3; `rows` is `Math.floor(...)`), and
`SlideService.buildSlides()` re-pages the entire deck against the new capacity.

**So this is not a fixed virtual coordinate space at all.** It is a *design-unit naming
convention* layered over a genuinely responsive, reflowing, anisotropically-scaled layout.
The number `1152` is a denominator, not a coordinate frame. There is no element in the DOM
whose box is 1728×1152.

That is the crux of the comparison, and it is worth stating plainly because the survey's
framing ("arrived at exactly our conclusion independently") is too generous: it arrived at
our *authoring convention*, not our *architecture*.

### 1.2 Direct comparison

| Axis | booper: `calc(n / 1152 * 100dvh)` per value | ours: `transform: scale(s)` on a fixed 832×456 root |
|---|---|---|
| Is there a coordinate frame? | **No.** Numbers are a naming convention. | **Yes.** `.stage` *is* the frame; its box is literally 832×456 px. |
| Rounding operations | One per length, per element, independently | **Exactly one**, at the root |
| Pixel-exact render possible? | **Never** — see §1.4 | Yes, at any integer scale (832×456, 1664×912) |
| `clip-path: path()` usable? | No — element sizes are fractional and unknown at author time; booper is forced to build path `d` strings in JS | Yes — sizes are fixed CSS px, `path()` takes literal units |
| SVG authored in design units? | No — every `d` is rebuilt in device px on resize | Yes — authored once, never touched |
| Zoom = one transform on the scene? | No — must synthesise a frame and counter-transform (§3) | Yes — decomp §3.1 *is* a transform on the frame |
| Cost of a resize | Full recompute + re-serialise ~6 multi-kB path strings, ×3 (§1.5) | Set one custom property |
| Responsive reflow | **Yes, real** — 4→3→2→1 columns | **No, by design** |
| Number of places design constants live | 3 (SCSS, TS `relativePx`, TS `DESIGN_*`) | 1 |

### 1.3 Why booper is *forced* into the TS-computed half

This is the load-bearing insight. `clip-path: path()` and SVG `d` attributes take
**absolute user units only** — no percentages, no `calc()`, no custom properties. If your
elements do not have known fixed pixel sizes, you cannot author a path once. You must
recompute it in script whenever the viewport changes.

booper hits this and pays for it in full: `DisplayService.computeDisplay()` rebuilds
`aboveLineClipPath`, `belowLineClipPath`, `blueBorderLinePath`, `borderShadowPath`,
`lowerShadowPath` and `bottomDeckClipPath` from scratch on every resize, each assembled
from five calls to `buildBorderSegment()`. Fraulk/Wii-Menu hits the same wall and solves it
the same way (the survey's §3.3 notes its `clip-path: path()` rebuilt in JS on resize).

**Two independent projects hit the identical rock, and it is the rock that a fixed root
transform removes entirely.** That is the strongest empirical argument for our choice that
this study produced, and it is an argument the existing `tech-rendering-animation.md` §5
makes theoretically but had no field evidence for. It now has two data points.

Note the tile shape is the exception that proves it: `channel.ts` authors the tile
silhouette against a *fixed internal* `viewBox="0 0 1000 550"` — i.e. booper reinvents a
fixed virtual coordinate space *inside each tile* precisely because it needed a stable one
to author a path against. It works beautifully there (§2). It just never generalised the
idea up to the whole stage.

### 1.4 Sub-pixel geometry and screenshot diffing

booper's approach cannot produce a byte-stable render at any viewport, for a structural
reason: each length independently resolves `n / 1152 * vh` and each is independently
rounded/snapped by layout. At 1280×720 the scalar is 0.625, so the 12-unit channel gap is
7.5 px, the 4-unit blue rim stroke is 2.5 px, the 120-unit notch is 75 px — a mixture of
integral and half-pixel values with no viewport that makes them all integral, because the
design numbers (1728, 1152, 120, 180, 360, 300, 12, 4, 136, 28) share no useful common
factor with any plausible viewport height. Add three separate scalars (`scaleX`, `scaleY`,
`notchScale`) diverging on non-16:9 viewports and the render is viewport-dependent in a way
no threshold-based diff will tame.

Our approach has exactly one rounding, at the root, so at scale 1 or 2 every child lands on
a device-pixel boundary. **Verdict on this axis is not close.**

One thing booper does get right and we should copy verbatim: **`dvh`, not `vh`.** On mobile
Safari/Chrome `vh` is the *large* viewport height and does not shrink when browser chrome is
shown, so a `vh`-sized stage is clipped. `dvh` tracks. Our root-scale computation should use
`visualViewport.height` (which is what `display.service.ts` actually reads in JS —
`window.visualViewport?.height ?? window.innerHeight`) rather than `innerHeight`, for the
same reason.

### 1.5 A concrete performance bug in booper's resize path, and the lesson

`wii-ui.ts`'s `@HostListener('window:resize')` calls `renderSlideDeck()`, which calls:

- `displayService.updateViewport()` → `computeDisplay()` **(1)**
- `slideService.updateForResize()` → … → `displayService.configureSlideDeck()` → `computeDisplay()` **(2)**
- `displayService.configureSlideDeck()` again → `computeDisplay()` **(3)**

So the full geometry recompute and path re-serialisation runs **three times per resize
event**, unthrottled — no rAF coalescing, no debounce. Separately, *every* `ChannelComponent`
registers its own `@HostListener('window:resize')` (15–60 more listeners). On a phone
rotating, or a desktop drag-resize, this is a lot of main-thread work in the worst possible
place.

**Lesson, framework-neutral:** any design where geometry must be *recomputed* on resize
will accumulate this class of bug. A design where resize sets one number does not have the
bug to accumulate. If we ever do add a resize handler, coalesce it in a single rAF and put
it in exactly one place.

### 1.6 Verdict

> **Adopt: the discipline** (name every geometric constant; keep them in one module;
> use `dvh` / `visualViewport`). **Avoid: the mechanism.**
>
> `transform: scale()` on a fixed 832×456 root is more robust (one coordinate frame,
> one rounding op, no script-generated geometry), produces strictly cleaner sub-pixel
> geometry for screenshot diffing (byte-stable at integer scales; booper is stable at
> none), and is substantially easier to maintain (one source of truth vs. three, and
> no resize recompute path to keep correct). booper's approach wins on exactly one
> axis — genuine responsive reflow — which this project has explicitly decided it does
> not want, because the artefact being reproduced is a fixed-resolution framebuffer.
>
> The existing recommendation in `tech-rendering-animation.md` §5 stands, and this
> study strengthens it: booper is a live demonstration of the specific costs §5
> predicts, in a codebase that otherwise makes good decisions.

**Caveat where booper is ahead of us:** it has a real answer for portrait phones and we
have none. Our root-transform stage on a 390×844 phone will letterbox to a ~390×214 strip
with ~78% of the screen black. That is arguably correct (it is what a Wii on a portrait
display would do), but it is a product decision we have not consciously made. booper's
`skinniness` blend — a 0→1 ramp that progressively re-weights layout toward the narrow
axis rather than switching at a breakpoint — is a nice pattern if we ever want a graceful
degradation mode. Keep it in the back pocket; do not build it now.

---

## 2. Technique: SVG-generated geometry

booper generates *two* different shapes two different ways, and the distinction matters for
us because we have exactly the two hard shapes it has.

### 2.1 The tile silhouette — one path, three `<use>`s, fixed internal viewBox

**Problem.** The tile is a convex superellipse ("squircle") with a keyline that follows the
silhouette. `border-radius` cannot express it; `border` cannot follow a `clip-path`.

**How booper solves it.** In `channel.ts` the silhouette is a **single closed path string**,
authored by hand against a fixed `viewBox="0 0 1000 550"` (aspect 20/11), and put in
`<defs>` as `<path id="channelPath-{id}">`. Then, in `channel.html`:

- `<use href="#channelPath-…" fill="…">` — the fill (or a `<pattern>` for image previews)
- `<use href="#channelPath-…" class="channelBorder">` with `stroke: var(--borderColor); fill: none; stroke-width: 12` — the keyline
- `<clipPath><use href="#channelPath-…"/></clipPath>` — the aperture clip for content

**One geometry definition, three roles.** This is the cleanest solution to
"border that follows a clip-path" in the whole survey — strictly better than Fraulk's four
stacked `drop-shadow` filters (`tech-prior-art.md` §3.2), which cost four filter passes and
produce a shadow-shaped approximation of a stroke rather than a stroke.

**Adopt this idiom directly.** It maps 1:1 onto our plan: author the aperture path once in
the 832×456 space, reference it from a `<clipPath>` for the aperture, and from a stroked
`<use>` for the `#BEBEBE` keyline. It also means the keyline animates for free (booper
transitions `stroke` in 200 ms on hover — one property, GPU-cheap, no relayout).

**Two caveats to fix when we adapt it.**

1. **Stroke is centred, not inset.** SVG strokes straddle the path, so booper's 12-unit
   keyline puts 6 units *outside* the silhouette. `channel-tile.md` describes a 1px keyline
   sitting *inside* the tile bounds. Use `stroke-width: 2` on a path offset inward by 1, or
   clip the stroked `<use>` to the silhouette (`clip-path` the stroke layer with the same
   path) so only the inner half survives. The latter is one extra attribute and is exact.
2. **Its inset trick does not generalise.** For the content dimmer, `channel.scss` insets the
   same path by *scaling* it:
   ```css
   .dimmerClip { --inset: 5px;
     scale: calc(((1000px/2) - var(--inset)) / (1000px/2)) calc(((550px/2) - var(--inset)) / (550px/2)); }
   ```
   Clever and zero-cost, but a uniform scale is **not** a true path offset — on a
   non-circular shape the corners inset by a different amount than the edges, and here the
   x and y scale factors differ (0.990 vs 0.982) so the shape is also subtly distorted.
   Fine for a 2%-opacity dimmer; **wrong for a 1px keyline**, where the error is the whole
   feature. If we need a true inset silhouette, author a second path.

**On the path itself — describe the technique, do not copy the numbers.** The silhouette is
built as: a straight top edge and a straight bottom edge across the middle ~44% of the
width, joined at each end by **one cubic Bézier per quarter** that sweeps through the
corner, up the short side, and through the next corner. The characteristic move is that the
control points are placed **outside the bounding box** (x values of −14 and 1014 on a
0–1000 box; a y of 564 on a 0–550 box) — pushing control points past the edge is what
produces the tight-corner / slightly-bowed-side look of a superellipse from a plain cubic.

That is the *technique*; the specific eight control points are hand-tuned by eye and carry
no authority. **We should not copy them.** We have measured geometry in
`components/channel-tile.md` §1.1 and can derive our path from it — either analytically
from a superellipse |x/a|ⁿ + |y/b|ⁿ = 1 sampled to Béziers, or by fitting to the measured
outline. booper's numbers would import someone else's eyeball as ground truth on top of our
own measurements, which is strictly worse than what we have. Take the *shape of the
solution* (few cubics, control points allowed outside the box, fixed authoring viewBox),
not the digits.

### 2.2 The bottom bar contour — parameterised segments, tiled and mirrored

**Problem.** The bottom bar's top edge is a wide flat shelf that dips through a curved notch,
and it must (a) be the boundary between two different fills, (b) carry a 1-unit accent
stroke exactly on the contour, and (c) cast a soft inner shadow below it.

**How booper solves it.** `display.service.ts` `buildBorderSegment(startX, isShadow, isHalf,
isLeftHalf)` emits the path commands for **one slide's worth** of contour, parameterised by
five named design constants (`DESIGN_NOTCH_DEPTH`, `DESIGN_EDGE_TO_NOTCH`,
`DESIGN_NOTCH_CURVE_W`, `DESIGN_ARC_R`, and the shelf's start Y). The notch is two mirrored
elliptical arcs meeting at the midpoint of the dip:

```
L <straightEnd> yTop   A r r 0 0 1 <mid> yMid   A r r 0 0 0 <end> yBottom   L …
```

— sweep flag `1` for the concave-down entry, `0` for the convex-up exit, which is exactly the
right way to build an S-curve out of two arcs and avoids Bézier control-point guessing
entirely. The full deck contour is then five calls (half, three whole, half) concatenated.

Then, and this is the good part, **the same generator emits four related paths** by varying
its inputs and wrapping the result:

| Output | How it is derived |
|---|---|
| `blueBorderLinePath` | the raw contour, stroked, `fill: none` |
| `aboveLineClipPath` | contour + `M 0 0` … `L W 0 Z` → a closed region *above* the line |
| `belowLineClipPath` | contour + `M 0 H` … `L W H Z` → a closed region *below* the line |
| `borderShadowPath` | contour re-run with `isShadow: true` (shifts yTop down by `borderShadowInsideExcess`), wrapped in a large outer rectangle, blurred with `feGaussianBlur` and clipped to `belowLineClipPath` |

**This is the strongest structural idea in the project.** One contour generator; the fills,
the accent, and the shadow are all *derived* from it, so they cannot drift out of alignment.
Compare the alternatives in the survey: Wii.JS ships four corner PNGs (drift guaranteed at
non-native scales), Fraulk fakes the rim with `drop-shadow(0 5px 0 var(--wii-blue))` (a
shadow, not a stroke — it smears and it cannot follow a curve's normal).

The inner-shadow construction deserves its own note, because it solves a problem we will
hit. To get a shadow that hugs the *inside* of a curved contour, booper builds a path that
is a big rectangle **minus** an inward-offset copy of the contour, blurs the whole thing
heavily (`stdDeviation="27"`), and clips it to the region below the line. The blur's hard
edge is pushed far outside the visible area by `shadowOutsideExcess = slideWidth / 5`, so
only the soft inner falloff is visible. It also sets an explicit `filterUnits="userSpaceOnUse"`
region — necessary, because the default `-10%/120%` filter region would clip a 27-unit blur.

**Adopt this whole approach, adapted.** Concretely, for our bottom bar:

- Keep the contour in **one** constants module as a parameterised builder, exactly as booper
  does, so the 4:3 variant (`bottom-bar-container.md` §1.5 flags it as an open gap) is a
  different argument, not a different file.
- Prefer **arcs over cubics** for the notch. booper's `A 300 300 0 0 1 … A 300 300 0 0 0 …`
  pattern is genuinely easier to reason about and to re-derive from measured tangent points
  than the cubic in `tech-rendering-animation.md` §2.2's sketch. Worth re-deriving our
  measured contour as arcs and comparing.
- Take the derived-clip pattern (`aboveLineClipPath` / `belowLineClipPath` from the same
  contour) — this is how the accent line ends up with "one antialiased pixel above and zero
  below" per `bottom-bar-container.md` §3.1, because the fill boundary and the stroke are
  the same geometry by construction.
- **Do not** take the shadow-by-huge-blur approach uncritically: `feGaussianBlur
  stdDeviation="27"` over a full-width region, plus a second at `stdDeviation="72"` in
  `bottom-shelf.html`, is a large filter surface. It is static, so it should rasterise once
  — but confirm in a profile rather than assume, and consider baking it if it costs.

**What booper does *not* solve, and we still must:** the **edge-anchored gradient**. Its bar
is a flat `background-color: #dddfe3` with a separate blurred shadow band. There is nothing
here about anchoring a gradient to the curved contour's normal. That remains an unsolved
problem in the entire surveyed corpus, and `tech-rendering-animation.md` §2.2's approach
(clip a `linearGradient`-filled rect to the contour) is still the only candidate. No help
from booper on our hardest shape problem.

---

## 3. Technique: the counter-transformed zoom overlay

### 3.1 The mechanism, explained

**Problem.** Launching a channel must look like the tile's content detaches and grows to fill
the screen, while the rest of the menu is swallowed — without re-rendering the destination
at a different size, and without the tile's neighbours and chrome scaling along with it.

**booper's construction** (`zoom.service.ts`, `zoom-overlay.*`) has four parts:

1. **A portal that shares one template.** `channel.html` wraps the tile's entire markup in an
   `<ng-template #channelContent>` and renders it **twice** — once inline via
   `*ngTemplateOutlet`, once wrapped in a `cdkPortal`. `ChannelComponent.ngAfterViewInit`
   registers `{ portal, wrapperElement }` with `ZoomService`. On zoom, the overlay component
   attaches that portal into a fixed, full-viewport `#zoom-overlay` positioned to coincide
   exactly with the stage. **There is exactly one definition of a tile's markup**, and the
   zoomed presentation is the same DOM subtree, not a parallel implementation.

2. **The forward transform on the scene.** From the clicked tile's `getBoundingClientRect()`
   and the stage's rect, it computes `scale = min(stageW/rectW, stageH/rectH)` and the
   translation that carries the tile's centre to the stage's centre. It then animates
   `#stage` to that transform. The whole menu flies at the camera.

3. **The inverse transform on the overlay content.** The overlay's two content groups
   (`g.channelContent.bg` and `.fg`) are *pre-set* to the **inverse** — `1/scale`, `−x`,
   `−y` — so at t = 0 they land exactly on the tile's on-screen footprint. They then animate
   to identity, ending at full viewport size. Net effect: the content appears pinned to the
   tile at the start and screen-filling at the end, while the menu behind it expands past
   the frame.

4. **A black backdrop between them.** `#zoom-overlay-backdrop` fades 0→1 (CSS transition,
   not GSAP) over `0.666 ×` the zoom duration, covering the seam where the expanding menu
   stops being coherent. On zoom-out the same fraction is used but the *delay* is moved to
   the other end (`delay = duration × (1 − 0.666)`), so the black lifts late going in and
   early coming out.

The composite reads as: *the channel's screen materialises inside the tile's footprint and
grows to fill the viewport while the rest of the menu is blacked out* — which is verbatim
`decomp-findings.md` §3.4's "definitive description of the launch transition". **So the
mechanism reaches the right perceptual result.**

### 3.2 The genuinely excellent sub-technique: microtask attribute restore

When you step from one zoomed channel to the next (`canZoomChannelLeft/Right`, the
"overlay is a channel browser" behaviour in decomp §4.4), the portal is detached and a
different tile's portal attached. Naively, the new content mounts at identity transform and
you get a one-frame flash of the wrong size.

booper caches the *raw DOM attributes* of the outgoing content groups
(`cacheAttributes()` — a plain loop over `el.attributes`), and restores them in the portal's
`attached` callback — **inside a microtask (`Promise.resolve().then`), not `requestAnimationFrame`**.
The source comment explains exactly why, and it is right: `rAF` runs before the *next*
frame's paint, i.e. one frame too late; a microtask runs after Angular has flushed its
render but **before the browser paints at all**. Zero flicker.

**Adopt this.** It generalises perfectly to React: `useLayoutEffect` (or a ref callback) is
the equivalent "after commit, before paint" slot. The trap it dodges — reaching for
`requestAnimationFrame` when you actually mean "before this paint" — is a very common bug
and it is worth writing down in `animations-interactions.md`.

### 3.3 Where the mechanism is right and where it is contorted

**Right:**
- Portal + shared template → single source of truth for tile markup. **Adopt.**
- Two opposed transforms on the same timeline is the correct decomposition for
  "content pinned to a moving frame". **Adopt the idea.**
- Backdrop as a CSS transition on a separate element with its own fraction of the duration.
  **Adapt** — the fraction is invented; the decomp gives us the real overlay behaviour.
- `will-change: transform; contain: paint layout style; backface-visibility: hidden` on
  `#stage`, the deck, and the content groups — correct compositor hints, correctly placed
  (on the few elements that actually transform, not sprayed everywhere). **Adopt.**

**Contorted, and instructively so:**

The overlay is `position: fixed` and therefore lives in a *different coordinate frame* from
the tile inside the stage. booper has to bridge them by hand, and the bridge is the ugliest
code in the repo:

```ts
private getInvertedTransformValue(baseValue: number, type: …): number {
  case 'scale': return 1 / baseValue;
  case 'x': case 'y': case 'position':
    return (-baseValue * 1000) / Math.min(window.innerWidth, (window.innerHeight * 16) / 9);
}
```

The `* 1000` is not a magic number — it is the tile's internal `viewBox` width, because the
transform is being applied to an SVG `<g>` whose user units are 1/1000 of the tile. So this
function is silently converting **CSS pixels into tile-viewBox units**, and it is hard-wired
to the tile aspect being 20/11 and the viewBox being 1000 wide. Change either and it breaks
with no error.

**This entire function exists because there is no shared coordinate frame.** With our fixed
832×456 stage there is one: the tile, the overlay, and the camera all live in the same
units, `1 unit == 1 CSS px inside .stage`, and the inverse of `scale(s) translate(x,y)` is
just `scale(1/s) translate(-x,-y)` in the same units. **This is the third independent place
in this study where the root-transform choice deletes a category of code.**

Two more issues:
- `scale = Math.min(scaleX, scaleY)` **letterboxes**. The decomp (§3.1) maps the four
  viewport corners onto the four tile corners, i.e. it **fills**. Ours should be `Math.max`,
  or better, derived from the tile-to-viewport corner mapping directly. Note the tile aspect
  (1.771) and viewport aspect (1.778) differ by 0.4%, so the visible error is small — but on
  a non-16:9 window it is not.
- `scaleY: isSkinny ? (20/11)/(vw/vh) : 1` applied to the bg group is a **non-uniform
  stretch** of the channel content on portrait viewports. A deliberate distortion to fill the
  screen. Avoid; we letterbox instead.

### 3.4 Timing — the mechanism is right, the numbers are all wrong

| Parameter | booper | ground truth | note |
|---|---|---|---|
| Duration | `ZOOM_TRANSITION_DURATION: 350` ms | **467 ms** | 25% too fast |
| Easing in | `power1.in` | smoothstep `3t²−2t³` ≈ `cubic-bezier(0.5,0,0.5,1)` | wrong shape — accelerate-only |
| Easing out | `power1.out` | same smoothstep, **exact mirror** | wrong shape *and* asymmetric |
| Pre-delay | `delay: ARROW_SLIDE_IN_DURATION * 2` = 200 ms | none | perceived latency 550 ms |
| Backdrop | `0.666 ×` duration, asymmetric delay | linear 333 ms global fader (§ decomp) | invented |

`power1.in` is the most consequential: an accelerate-only curve makes the launch read as a
*fall*, not a camera move. The symmetric ease-in-out is a large part of why the real
transition feels expensive. Note also that `power1` is GSAP's *quadratic* — so even the
polynomial order is wrong (t² vs the smoothstep's cubic).

The 200 ms pre-delay is worth understanding rather than dismissing: it exists so the paging
arrows can slide out of frame before the camera moves. That is a real sequencing concern we
will also have (`transient-states-and-overlays.md`), and booper's answer — bake the arrow
exit into the zoom timeline's `delay` — is reasonable, it is just undocumented and it
silently inflates the perceived transition to 550 ms. **If we sequence an arrow exit, budget
it explicitly and do not let it hide inside the zoom's number.**

> **Recommendation: adapt.** Take the portal + shared template, the microtask attribute
> restore, the two-opposed-transforms decomposition, and the compositor hints. Replace
> the coordinate bridge with a single-frame version. Replace every timing constant with
> the decomp's. Change `min` to a corner-mapped fill.

---

## 4. Technique: the tiled, recentred background SVG ("treadmill")

This one the survey does not mention at all and it is a genuinely good idea.

**Problem.** The scan-line background and the bar contour must be continuous across a deck of
N pages, but the deck can be 3–17 pages wide. A single SVG spanning the whole deck would be
enormous, and its `d` strings would grow with N.

**booper's solution** (`slide-deck.html`, `slide-deck.ts`, `SlideService`): the background
SVG is built **exactly 4 slides wide, always** (`slideDeckSvgWidth = slideWidth * 4`) and
lives in its own wrapper (`#slideDeckSvgWrapper`) that is a **sibling** of the content deck
(`#slideDeck`). On a page change, both wrappers translate by the same visual amount using
independent index signals. Then, on the deck's `transitionend`:

```ts
this.slideService.currentSlideDeckSvgIndex.set((this.slideService.slideDeck().length - 1) / 2);
```

— the SVG wrapper snaps back to centre, with the transition class removed. Because the SVG's
content is *periodic* (the contour is 5 tiled segments; the scan lines are a `<pattern>`),
snapping back by one period is invisible. It is a treadmill: the background scrolls, then
teleports home.

**Why it is right:** the background's cost is **O(1) in page count**. With 4 pages we do not
strictly need it, but the pattern also cleanly handles the "background must be continuous
across a page transition" problem that a naive per-page background cannot.

**Second technique in the same file, also good:** the scan-line background is
`<pattern id="scanLines" width="9" height="9">` — a 9-unit tile of one 3-unit light band over
one 6-unit darker band — overlaid with a **second** pattern whose tile is one slide wide and
contains a horizontal `linearGradient` (transparent → white at 45–55% → transparent). That
second pattern is offset by half a slide via `patternTransform="translate(w/2, 0)"`, so each
page gets a soft vertical light bloom down its centre. Two `<pattern>` elements, no images,
no per-pixel work, resolution independent, and it composites once.

Compare our current plan, which is a Canvas-generated noise sprite sheet
(`tech-rendering-animation.md` §2.3). That is the right call for the *empty-slot static*
(which must animate with per-slot random phase). But for the **static page background**,
booper shows a two-`<pattern>` SVG is enough, costs nothing, and is trivially freezable. Worth
checking whether `visual-design.md`'s page background is a stripe pattern of this kind — if
so, **adopt** the two-pattern construction and keep Canvas strictly for the animated static.

**Adopt (background patterns) / Adapt (treadmill — only if we ever exceed 4 pages).**

---

## 5. Technique: clock, date, and the "Wii Menu" pre-roll

### 5.1 It *does* render a date — the prior-art survey is wrong on this point

`tech-prior-art.md` line 67 records booper's clock as "time-only" and §2.1 states
"**Time only, no date** — matches `iplClock.cpp`". That is true of its *clock component* and
false of its *screen*.

`bottom-shelf.html` renders:

```html
<div class="date" [textContent]="timeService.currentDate()" …>
```

fed by `TimeService.currentDate`, an `Intl.DateTimeFormat(locale, { weekday:'short',
day:'numeric', month:'numeric' })` with the weekday's first letter upper-cased — e.g.
"Sat 25/7". It is positioned **centred on the grey bottom shelf, below the notch**
(`dateTopPx = notchDepth + bottomShelfHeight * 0.08`), in neutral grey `#7a7a7a` on a
`#dddfe3` bar.

**That is structurally exactly what `components/date-display.md` establishes**: the date is
*not* a clock pane; it is drawn by a different layer, centred on the grey bottom bar, below
the clock, in neutral grey. booper split the clock and the date into two components at two
layers — the same split the decomp forces — apparently by eye.

> **Action for the corpus:** correct `tech-prior-art.md` §2.1's "Time only, no date" and
> the table's clock column. This is **corroboration, not contradiction**, of
> `decomp-findings.md` §9.1/§9.8 and `components/date-display.md`: an independent
> recreator, working from memory, put the date on the grey bar and not next to the clock.
> That is a useful third-party check on a finding the corpus flagged as correcting an
> earlier misreading.

Accuracy of the details is mixed: the date box is `72 / 136 = 53%` of the clock font size,
where `date-display.md` §measured says **~76%**. Format is locale-derived rather than the
Wii's fixed pattern. Bar colour `#dddfe3` vs measured `#C5C6CD`.

### 5.2 The pre-roll — how it is actually implemented

Both the clock and the title render **simultaneously and unconditionally**, stacked at the
same `top`. There is no state machine at all. Each has a one-shot CSS animation with a
computed `animation-delay`:

- `.titleWrapper` — starts at `opacity: 1`, runs `fadeTitleOut` (200 ms, `ease-out`,
  `forwards`) with `animation-delay = introTotalTime + 1500`.
- `.timeWrapper` — starts at `opacity: 0`, runs `fadeClockIn` (200 ms, `ease-in`,
  `forwards`) with `animation-delay = introTotalTime + 1500 + 100`.

i.e. **the crossfade is expressed entirely as two delayed CSS animations with a half-duration
stagger**, no JS timers, no conditional rendering. The 50% offset means the title is at ~50%
opacity when the clock starts rising, so they cross rather than gap.

**This is the right shape of solution and we should adopt it.** It is declarative, it is
frozen by Playwright's `animations: 'disabled'`, it is scrubbable via WAAPI
(`getAnimations()[0].currentTime = t`), and it needs no state. Contrast the obvious
alternative (a `setTimeout` that flips a `phase` state variable), which is untestable and
races with React's render.

Note the delay is **anchored to `introTotalTime`** — a single number computed once from the
intro's own timing constants (§6) — so the pre-roll is expressed relative to the end of boot
rather than absolutely. Good pattern; our pre-roll likewise starts when the boot sequence ends.

**Numbers wrong, as the survey says:** hold is 1500 ms vs the decomp's **3000 ms**, and there
is no phase alignment to an odd second. The title reads "Wii UI Menu" (deliberate — it is not
claiming to be the Wii Menu).

### 5.3 Clock details worth noting

- **AM/PM as a separately positioned element**, `position: absolute; bottom: 0` with
  `[style.right.ch]="-4 * clockScaleFactor"` — i.e. offset in **`ch` units** so it tracks the
  font metrics rather than a pixel guess. Matches the USA build's `AM_PM_R` pane. Nice unit
  choice; **adopt the `ch` idea** for anything positioned relative to a digit's advance width.
- **Fixed-width digit boxes:** `.hour, .minute { width: 2ch; text-align: end; }` so 9:05 and
  12:45 do not shift the colon. Correct and cheap.
- **The colon blinks twice over**, and this is a bug worth learning from. `clock.scss` runs a
  2 s `fadeColon` keyframe animation **and** `time.service.ts` runs a `setInterval(…, 1000)`
  that toggles a `hideColon` signal bound as a class. Two independent blink mechanisms on the
  same element, at the same nominal period, with no phase relationship — they will drift and
  beat against each other. The CSS one is almost certainly the intended survivor.
  **Lesson: one animation per property, and if you migrate a JS timer to CSS, delete the timer.**
- **The clock only re-reads `new Date()` when the minute changes** (`previousMinute` guard) —
  so `currentDate()` is also only recomputed on the minute. Correct: a date that changes at
  midnight does not need per-second work. But it means the seconds-based colon phase and the
  time value come from two different clocks.
- 12/24-hour detection via `Intl.DateTimeFormat(locale, {hour:'numeric'}).formatToParts()`
  and testing for a `dayPeriod` part. **Adopt** — this is the correct, locale-driven way to
  ask "does this locale use AM/PM", far better than a region allowlist. `time.service.ts` also
  keeps `testLocale` / `testDate` fields (documented as "`undefined` except when testing") to
  pin the clock deterministically. We need exactly this for screenshot tests; ours should be
  injected rather than edited-in-place, but the idea is right.

---

## 6. Technique: the boot ripple (something our corpus should look at)

Not mentioned in the survey. `wii-ui.html` renders, above everything at `z-index: 10000`, a
black `.intro` layer containing a full grid of *empty* tiles. Each tile gets:

- `animation-delay = (row + col) × 100 ms + 500 ms` — a **diagonal wavefront**, computed in
  `SlideComponent.introDelays` from the grid's own column count
- a single `fadeInOut` keyframe animation, `500 + 333 + 833 = 1666 ms` long, with the
  keyframe percentages **hand-computed to match** those three sub-durations (0% → 30% fade in,
  30–50% hold, 50–100% fade out), peaking at `opacity: 0.5`
- a `drop-shadow(0 0 12u black)` on the fill so the tiles read as glowing outlines on black

The overlay's own fade-out delay is `startDelay + maxDiagonal × step + rippleDuration +
endDelay`, and `introTotalTime` (that plus the fade) is published on `DisplayService` for
the clock to anchor to (§5.2).

Three things to take from this:

1. **The diagonal-wavefront stagger** `(row + col) × step` is the right primitive for
   "channels appear in a wave", and it is one line. Our `animations-interactions.md` should
   have this pattern named.
2. **The derived-total pattern.** The boot sequence's total duration is *computed* from its
   parts and published, so downstream animations anchor to it instead of hardcoding an
   absolute delay. **Adopt.**
3. **The failure mode it warns about.** `channel.scss` carries this comment:
   > `// CAREFUL — If you change the timing of any of the intro animations, make sure to update this keyframe`

   because the keyframe *percentages* encode the ratio of three durations that live in a
   different file as milliseconds. Change one and the animation silently desynchronises. This
   is the concrete cost of expressing sub-phases as keyframe percentages. **Avoid**: either
   split into three chained animations with real durations, or generate the keyframe
   percentages from the constants (a CSS-in-JS or build-time step), or use a WAAPI
   `KeyframeEffect` with an explicit `offset` array computed from the same numbers. Our
   `animations-interactions.md` has many multi-phase sequences and will hit this exact rock.

Also good, in `app.ts`:

```ts
document.addEventListener('visibilitychange', () =>
  document.documentElement.classList.toggle('paused-animations', document.hidden));
```
with `.paused-animations * { animation-play-state: paused !important; transition: none !important; }`.

So a backgrounded tab does not burn the boot sequence. **Adopt.** With ~48 always-animating
tiles this matters more for us than for booper. (Caveat: `* { … !important }` on every
element is a heavy selector — scope it to the animating subtree.)

---

## 7. Technique: culling off-screen tiles during paging

`slide.ts`'s `shouldRenderChannel` is a computed predicate deciding, per slot, whether to
render an `<app-channel>` or an inert `.channelPlaceholder` div. The rule: render slots on
the current page, **plus the last column of the page to the left and the first column of the
page to the right**, and during an animation also the outgoing page and the incoming page's
edge column.

This is exactly the concern `tech-rendering-animation.md` §1.2 raises — "12 tiles plus ~37%
of a 13th column are on screen; the other 36 should be *paused*, not merely clipped" — solved
independently, and solved *at the mount level* rather than the animation level.

Two notes on adapting it:

- **We should pause, not unmount.** booper's tiles are near-static (an SVG logo on a colour),
  so unmounting is free. Ours have multi-layer looping icon animations with a *phase* that
  must persist — unmounting and remounting would reset the phase and the tile would visibly
  jump when it scrolls back into view. Our version should keep the DOM and toggle
  `animation-play-state` (or `content-visibility: auto`), which also keeps the layout stable.
- **The predicate's complexity is a warning.** booper's version needs six OR'd clauses and
  three signals (`currentSlideIndex`, `tempSlideIndex`, `isAnimating`) because the deck's
  page boundaries and the visible window are not the same thing during a transition. Our
  16-column continuous strip (`channel-tile.md` §8.2) makes this simpler: visibility is a
  pure function of `scrollOffset` and column index, with no animation state. **Prefer the
  continuous-strip formulation** — it makes the culling predicate a one-liner instead of six
  clauses, which is a real architectural argument for the strip we had not articulated.

---

## 8. Technique: pointer-state hygiene

Small, unglamorous, and correct. Every pressable element (`corner-action-button.ts`,
`channel.ts`) binds **four** pointer events, not two:

```
(pointerdown) → pressed = true
(pointerup) (pointercancel) (pointerleave) → pressed = false
```

with the source comment "Pointer helpers so pressed state never gets stuck". `pointercancel`
fires when the browser takes over the gesture (scroll, back-swipe); `pointerleave` catches
press-and-drag-away. Omit either and you get a button stuck in its pressed state — the
classic touch bug.

Paired with:
- `touch-action: manipulation` globally (kills the 300 ms tap delay and double-tap zoom)
- `-webkit-tap-highlight-color: transparent` and `-webkit-touch-callout: none`, scoped to
  `@media (hover: none) and (pointer: coarse)`
- all hover affordances scoped to `@media (hover: hover) and (pointer: fine)`, so touch
  devices never get a sticky hover state
- `-webkit-user-drag: none` on the arrow `<img>`s and a global `user-select: none`

**Adopt the whole set.** This is ~15 lines that prevent a category of bug we will otherwise
find late, and `components/cursor.md`'s pointer handling should incorporate the four-event
pattern.

---

## 9. GSAP: what it is actually used for, and whether it would break our test story

**Answer: GSAP is doing almost nothing, and none of it would survive contact with our
constraints — but it also would not be *hard* to remove.**

Every `gsap` call site in the repo (23 total):

| Use | Count | Assessment |
|---|---|---|
| `gsap.set(document.documentElement, { '--someVar': '350ms' })` | **15** | Setting a CSS custom property. `el.style.setProperty()` does this. GSAP adds ~70 kB to do it. |
| `gsap.set(el, {…})` on the stage / content groups | 6 | Static transform application. `el.style.transform = …` does this. |
| `gsap.timeline()` | **2** | The zoom-in and zoom-out timelines. **The only load-bearing use.** |

Everything else in the project is already **pure CSS**:

- page slide: `transition: transform var(--slideTransitionDurationMs) ease-in-out` on
  `#slideDeck`, with a `transitionend` handler for completion
- arrows: `@keyframes arrowLeft/arrowRight` infinite, plus `left`/`right` transitions with a
  delay chained off `--slideTransitionDurationMs`
- zoom backdrop, tile border colour, the zoom overlay's button opacities: CSS transitions
- clock crossfade, colon blink, boot ripple, settings-cog spin: `@keyframes`
- button press/hover: `transform` transitions

And the two GSAP timelines are trivial: each is three simultaneous tweens (`position 0`) of
`scale`/`x`/`y` on three elements, with one duration and one ease, plus an `onComplete`. That
is `Element.animate()` with a shared `options` object and `Promise.all(anims.map(a => a.finished))`.
**Nothing here requires GSAP.** No stagger, no ScrollTrigger, no morphSVG, no physics, no
timeline scrubbing, no plugin.

**Under our constraint (`animations: 'disabled'` must freeze everything):**

- The 15 `gsap.set` calls are instantaneous — harmless, they would not be running at capture
  time.
- The 2 timelines **would** be a problem: GSAP drives them from its own `gsap.ticker`
  (a rAF loop). Playwright's `animations: 'disabled'` reaches CSS animations, CSS transitions
  and WAAPI animations — it does **not** reach a JS rAF loop writing to `style.transform`. A
  screenshot taken mid-zoom would capture an arbitrary frame. That is the exact hole
  `tech-rendering-animation.md` §6 identifies for the Canvas rAF loop, and GSAP is the same
  hole with a nicer API.

> **Verdict: our CSS/WAAPI-only decision is correct and costs nothing.** booper's usage is
> ~95% gratuitous and the remaining 5% is a three-property tween that WAAPI does natively
> and *better* for us, because a WAAPI animation is both freezable and **scrubbable**
> (`anim.pause(); anim.currentTime = 233.5`) — which is precisely how we want to capture
> the mid-zoom frame deterministically.
>
> The one thing GSAP buys booper that we should consciously replace: **a timeline
> primitive**. Two of our sequences (zoom, boot) need "run these together, then that, then
> call back". A ~40-line helper over `Element.animate()` returning a combined `finished`
> promise covers it. Worth writing once, early, in `lib/timeline.ts`.

**One pattern here is genuinely good and framework-neutral:** booper keeps **all** timing
constants in a single 16-line `timing-variables.ts`, then mirrors them into CSS custom
properties at app start, so the *same* number drives both the JS timeline and the CSS
transitions. `tech-prior-art.md` already flags this file as the model; having read it, that
recommendation is right, with one improvement — do the mirroring in a build step or a plain
`setProperty` loop rather than 11 separate `gsap.set` calls, and make the direction one-way
(TS is the source, CSS is generated) rather than the current mess where `display.service.ts`
reads durations *back out* of CSS via `getComputedStyle` (`parseCssDuration`, and
`cssVar('--introRippleFadeInMs')` in `wii-ui.ts` / `slide.ts`). That round-trip through
`getComputedStyle` is both a forced style recalc and a way to get a `NaN` if the property is
unset.

---

## 10. Scope: what it implements, what it skipped

| Feature | booper | Notes |
|---|---|---|
| 4×3 grid | ✅ | reflows to 3/2/1 columns |
| Multi-page deck + arrows | ✅ | only project in the survey with real paging |
| Page count | derived from content, `MIN_SLIDES = 3`, plus a blank pad slide at each end | ground truth: fixed 4 |
| Bottom bar contour + rim + shadow | ✅ generated SVG | §2.2 |
| Corner buttons | ✅ two — "About Mii" (L), settings cog (R) | real Wii: Wii button (L), Mail (R) |
| Date | ✅ on the bottom shelf | §5.1 |
| Clock + AM/PM + blink + pre-roll | ✅ | §5 |
| Channel zoom overlay + Wii Menu/Start buttons | ✅ | §3 |
| Step between channels while zoomed | ✅ | decomp §4.4, independently found |
| Boot sequence | ✅ diagonal ripple | §6 |
| Keyboard nav (←/→/Esc) | ✅ | |
| **Message Board** | ❌ | corner buttons open a "Work In Progress" modal |
| **Mail button / envelope** | ❌ | replaced by "About Mii" |
| **Audio** | ❌ **none at all** | no audio files, no `Audio`/Web Audio references anywhere |
| **Custom cursor** | ⚠️ CSS only | §10.1 |
| **Empty-slot animation** | ❌ | a static 366×192 PNG (§14) |
| **Name balloons on hover** | ❌ | uses `<title>` for the a11y tooltip instead |
| **Drag to reorder** | ❌ | no `pointermove`/drag handling anywhere |
| **Disc channel** | ❌ | |
| **SD-card icon** | ❌ | |
| `prefers-reduced-motion` | ❌ | not referenced anywhere |

**Why it skipped what it skipped** is legible from the commit history and the code: this is a
launcher, so anything not on the path from "see grid" to "open bookmark" is out. Audio would
be intrusive on a homepage. The Message Board has no bookmark-launcher analogue. The
empty-slot animation is invisible to a user whose slots are all full. Drag-to-reorder needs
persistence it does not have. **None of these are technical defeats**, so their absence tells
us nothing about difficulty — with one exception: the empty-slot static is the one place
booper *did* need the feature and shipped a screenshot instead, which is weak evidence that
recreating it procedurally is non-obvious. (Our `components/empty-slot-noise.md` is 66 kB of
analysis, so we already knew.)

### 10.1 The cursor

Not a custom cursor in our sense. `styles.scss` sets:

```css
cursor: url(./app/assets/wii_pointer.cur) 11 3, auto;
&:active { cursor: url(./app/assets/wii_click.cur) 11 3, auto; }
```

— a native CSS cursor with an explicit hotspot, swapped on `:active`. That is the *cheapest*
approach and it gets the hotspot right, but it structurally cannot do any of what
`components/cursor.md` specifies: no rotation/tilt (the decomp drives `N_Trans` and `N_Rot`
from separate panes), no position smoothing, no scale-with-stage, and it is capped at 32×32
device px (the file is 32×32, so it is soft on HiDPI). It also cannot be screenshotted —
Playwright does not capture the native cursor.

**Confirms our plan.** A DOM/SVG cursor layer is required, not merely preferred. Two things
to borrow anyway: (a) the explicit hotspot offset — `11 3` is a real measured value someone
had to determine, and our DOM cursor needs the same offset from the pointer position to the
fingertip; (b) `cursor: none` must be set globally once we draw our own, which booper does
not need to do but we will.

**Both `.cur` files are Nintendo's Player-1 hand cursor** (I rendered `wii_pointer.cur` — it
is the white glove with the blue "1"). Note `wii_pointer.cur` is actually a **PNG renamed
`.cur`** (`file` reports "PNG image data, 32 x 32"); Chrome accepts it, but it is not a valid
`.cur` and older/other browsers will fall back to `auto`. `wii_click.cur` is a genuine MS
cursor with hotspot 11,10 — note the file's internal hotspot (11,10) **disagrees** with the
CSS hotspot (11,3), so the click cursor jumps 7 px vertically against the pointer cursor.
Small bug, easy to make.

### 10.2 Responsive / mobile

Beyond the reflow already covered: `@media (max-aspect-ratio: …)` breakpoints at 85/100,
73/100, 50/100 and 40/100 progressively shrink the pre-roll title, hide the AM/PM element,
fade out the corner-button "slot" chrome, and move the corner buttons from inboard to
outboard. `visualViewport` is preferred over `innerWidth/Height` throughout. `touch-action:
manipulation` and `overflow: hidden` on `html, body`. This is a real, thought-through mobile
story — the best in the survey — and it is the part of the project least relevant to us.

### 10.3 Performance work visible

- `will-change: transform`, `contain: layout paint style`, `backface-visibility: hidden` on
  the four elements that actually transform (`#stage`, `#slideDeck`, `#slideDeckSvgWrapper`,
  `.channelContent`). Correctly scoped — not sprayed. **Adopt the placement discipline.**
- `will-change: stroke` / `will-change: opacity` on the two properties that transition.
  (`will-change: stroke` is of dubious value — it is not a compositable property — but harmless.)
- Mount-level culling (§7).
- `<link rel="preload" as="image">` for all 16 channel logos in `index.html` — reasonable for
  a fixed asset set; ours are procedural so this does not apply.
- Tab-hidden animation pause (§6).
- Bundle: 394 kB main JS (Angular + GSAP) + 2 kB CSS + **~11 MB of fonts** shipped twice
  (once under `assets/fonts/`, once as hashed `media/`). The font payload is ~28× the code.

**Nothing here addresses the 12-always-animating-tiles problem** because booper's tiles do
not animate — they are static logos. So it offers no evidence on our actual perf question.
Its `contain` and `will-change` placement is still the right starting point.

---

## 11. Accuracy grading against our ground truth

| Dimension | booper | ground truth | Divergence type |
|---|---|---|---|
| Virtual space | 1728×1152 (16:9), anisotropic | 832×456, uniform | **Simplification** — wanted reflow |
| Grid | 4×3 = 12, reflows to 3/2/1 | fixed 4×3 = 12 | **Simplification** |
| Pages | derived, min 3, + 2 pad slides | **fixed 4** (`mMaxPages` unconditionally 4; 48 slots) | **Error** — right structure, wrong constant |
| Tile aspect | 20/11 = **1.818** | 170/96 = **1.771** | **Error**, 2.7% too wide |
| Tile height | ~19.6% of stage height (`(1728/4)/(20/11)/1152`) | **21.05%** of viewport height | **Error** |
| Tile shape | one cubic per quarter, hand-tuned, in a 1000×550 viewBox | measured superellipse | **Right technique**, unverified numbers |
| Tile keyline | 12 units, centred stroke, `#b4b4b4` | 1 px, inset, `#BEBEBE` | **Error** (too thick, wrong side) |
| Page slide | **400 ms** `ease-in-out` | **333 ms** NTSC (400 ms is the **PAL** value) | **Error** — plausible-but-wrong |
| Zoom duration | **350 ms** | **467 ms** | **Error**, 25% fast |
| Zoom easing | `power1.in` / `power1.out`, asymmetric | smoothstep `3t²−2t³`, symmetric mirror | **Error**, wrong shape *and* wrong symmetry |
| Zoom fit | `Math.min` → letterbox | corners→corners → **fill** | **Error** |
| Pre-roll hold | 1500 ms, no phase alignment | **3000 ms**, waits for an odd second | **Error** |
| Clock format | time only, AM/PM right, blinking colon | ✅ matches `iplClock.cpp` / `AM_PM_R` | **Correct** |
| Date | present, centred on the grey bar below the clock | ✅ Message Board layer, grey bar | **Correct in placement**, wrong size ratio (53% vs 76%) |
| Empty slots | static PNG | ≥2000-frame (~33.3 s) loop, **random per-slot phase** | **Not attempted** |
| Balloon on hover | none (`<title>` tooltip) | 333 ms delay, drawn balloon | **Not attempted** |
| Zoomed channel stepping | ✅ implemented, transform cached | ✅ decomp §4.4 | **Correct**, independently found |
| Boot ripple | diagonal wave, 100 ms step | not yet cross-checked against decomp | **Unverified** — worth checking |

**Reading the pattern:** every *structural* decision that diverges is a deliberate
simplification driven by the launcher/responsive goal. Every *numeric* divergence is an
error — and specifically, the errors are all "plausible round numbers a person would guess"
(350, 400, 1500, 20/11). That is the signature of values chosen by feel. **The lesson is not
"booper was careless"** — it is that these particular values are *not recoverable by eye*,
which is exactly why the decomp work matters and why every one of our numbers should carry a
citation.

The 400 ms page slide is the sharpest illustration: it is coincidentally the **PAL** frame
timing (20 frames at 50 Hz), so it is not even wrong in a random direction — it is a value
that *is* correct for a console nobody in this project is targeting. Two independent
plausible values 20% apart, both defensible-sounding, only one right. Cite the source.

---

## 12. Bugs, limitations and open issues

**The issue tracker is empty** (0 issues, 0 PRs, 0 forks, 2 stars, no discussions). All
evidence below is from in-source markers and reading.

In-source markers — there are only four in 3,721 lines, and three are load-bearing:

1. `channel.scss:47` — `// FIXME: Causes jitter when uncommented, find fix` on
   `transition: filter 200ms ease` (the tile's hover glow).
2. `channel.scss:119` — the same feature again, commented out:
   `// filter: drop-shadow(0 0 relativePx(3) var(--wiiBlue));` on hover.
3. `channel.scss:73` — `// CAREFUL — If you change the timing of any of the intro
   animations, make sure to update this keyframe` (§6).
4. `corner-action-button.html:96` — `<!-- wonky bubble boi 2.0 -->` on a 22-point hand-traced
   Bézier for the glossy highlight, scaled by `(0.29, 0.27)` and heavily blurred. Not a bug,
   but a marker of "traced by hand, twice, and still not happy".

**#1 and #2 are the important one, and they are the same rock we will hit.** The intended
effect is the Wii's blue selection glow around the tile. booper tried `filter: drop-shadow()`
on an SVG element and found it jitters — both when animated and, apparently, even statically.
This is real and well-known: animating or even applying `filter` forces the element out of
its cached raster, and on an SVG with a `clip-path` and a `<use>` chain, Chrome re-rasterises
at slightly different sub-pixel offsets frame to frame. **It gave up and shipped a
`stroke`-colour transition instead** (`transition: stroke 200ms ease`) — the border turns blue
but does not glow.

`components/channel-tile.md` specifies a hover halo. **Do not implement it as an animated
`filter`.** Candidate approaches, in order of preference:
- a second, pre-blurred `<use>` of the same path underneath, sized slightly larger, with only
  its **`opacity`** transitioned (opacity is compositable; filter is not)
- an SVG `<filter>` applied statically to a layer whose *opacity* animates
- a radial-gradient-filled `<use>` sized to the halo extent
All three keep the animated property to `opacity`, which is the general rule the FIXME is
teaching.

**Other limitations found by reading:**

| | Issue | Severity |
|---|---|---|
| a | `computeDisplay()` runs 3× per resize event, unthrottled, rebuilding ~6 path strings (§1.5) | real perf bug |
| b | Every `ChannelComponent` adds its own `window:resize` listener | scaling bug |
| c | Colon blinks from **two** independent mechanisms (CSS keyframe + `setInterval`) that will beat (§5.3) | visible bug |
| d | Click cursor's internal hotspot (11,10) ≠ CSS hotspot (11,3) → 7 px jump on press | visible bug |
| e | `wii_pointer.cur` is a PNG with a `.cur` extension — silently falls back to `auto` outside Chromium | compat |
| f | `getInvertedTransformValue` hard-wires `1000` (tile viewBox width) and `16/9` | fragility |
| g | `zoom.service.ts` uses `document.querySelector('#zoom-overlay g.channelContent.bg')` — global DOM queries, string selectors, from a service, in an Angular app | maintainability |
| h | `onZoomResize` retries up to 5× through nested `requestAnimationFrame`s waiting for a non-zero rect | a race it could not close cleanly |
| i | `gsap.set(documentElement, {'--zoomTransitionDurationMs': 'unset'})` — sets a CSS duration to the literal string `unset`, then relies on the fallback | fragile |
| j | Design constants duplicated across SCSS / TS `relativePx` / TS `DESIGN_*`, plus `computeDesignClockOffsetPx()` which re-derives the whole design-space grid layout by hand to compute one offset | maintainability |
| k | No `prefers-reduced-motion` handling at all | a11y |
| l | `.paused-animations * { … !important }` — universal selector | perf |
| m | 11 MB of fonts shipped twice; site is ~18 MB | payload |

**(h) is worth dwelling on.** `onZoomResize` reads a rect, and if it is zero-valued, schedules
a double-`rAF` retry, up to five times. That is a project that could not determine *when* its
layout was settled. Our root-transform design mostly removes the question (the stage's box is
constant), but the general lesson stands: **if you find yourself polling for a valid rect,
the layout dependency is wrong, not slow.**

**(g) + (j) together** are the real story: the architecture is service-centric with global
DOM lookups and hand-maintained duplicate constants. It works at 3,700 lines. It would not at
20,000.

---

## 13. Things booper does that our corpus has not considered

Ranked by value to us:

1. **The tiled-and-recentred background SVG** (§4). A constant-size, periodic background that
   scrolls with the deck and snaps home on `transitionend`. Not in our corpus at all.
2. **Two-`<pattern>` scan-line background** (§4) — a 9-unit stripe pattern plus a slide-wide
   gradient pattern offset by half a period. Zero assets, zero JS, trivially freezable. Our
   corpus reaches for Canvas; for the *static* background, SVG patterns suffice.
3. **Microtask (not rAF) restore across a portal swap** (§3.2). The correct slot for
   "after commit, before paint". Should be written into `animations-interactions.md`.
4. **`(row + col) × step` diagonal wavefront** as the boot stagger primitive (§6).
5. **Publishing a derived total duration** (`introTotalTime`) so downstream animations anchor
   to the end of a sequence rather than to an absolute time (§6).
6. **`Intl.DateTimeFormat(...).formatToParts()` + `dayPeriod` probe** for 12/24-hour
   detection (§5.3), and `ch` units for positioning AM/PM against digit metrics.
7. **`visibilitychange` → pause all animations** (§6). More valuable for us (48 loops) than
   for booper (0 loops).
8. **The four-event pressed-state pattern** and the `(hover: hover) and (pointer: fine)` /
   `(hover: none) and (pointer: coarse)` media-query split (§8).
9. **`testLocale` / `testDate` injection points on the clock service** (§5.3) — deterministic
   time for screenshots, designed in rather than bolted on.
10. **The `skinniness` ramp** — a continuous 0→1 blend between two layout regimes instead of a
    breakpoint switch (§1.6 caveat). Only relevant if we ever want graceful portrait
    degradation.

---

## 14. Licence and assets — the do-not-copy list

### 14.1 Licence

**`gh repo view` returns `"licenseInfo": null`. There is no `LICENSE` file, no licence header
in any source file, and no licence statement in the README.** Under Berne, that means **all
rights reserved**: no permission to copy, modify, or redistribute any of it. Public
visibility on GitHub grants only the rights in the GitHub ToS (viewing, and forking *within*
GitHub) — not reuse.

> **Therefore: not one line of `booper1/Wii-UI` may be copied into this project.** Every
> recommendation above is "adopt the technique", which is not copyrightable; the expression
> is. Re-derive, re-type, re-name. Do not paste. This includes the SVG `d` strings and the
> `channelPath` tile silhouette, which are authored creative expression.

The only reusable thing is `docs/Wii-UI/3rdpartylicenses.txt` — the standard Angular/rxjs/
tslib MIT/Apache notices, which are about *those* packages, not about booper's code.

### 14.2 Font redistribution — confirmed, and worse than the survey states

I extracted the `name` tables directly. All confirmed:

| File | Size | `name` table evidence |
|---|---|---|
| `RodinBokutohBold.otf` | 2,746,108 B | `RodinBokutohPro-B` · **"Copyright 2003 Fontworks Japan, Inc. All Rights Reserved."** · `AdobeJapan1` — the full retail CJK font, ~20k glyphs |
| `RodinBokutohDemiBold.otf` | 2,696,696 B | same foundry, DemiBold weight |
| `ShinGoBold.otf` | 3,321,632 B | `A-OTF Shin Go Pro B` · **"Copyright 2002 Morisawa and Company Limited. All rights reserved."** · **"Shin Go Bold is a trademark of Morisawa and Company Limited."** |
| `ContinuumBold.otf` | 40,680 B | **"Copyright (c) 1996, 1997 Brøderbund Software. All rights reserved."** · Macromedia Fontographer 4.1 |
| `DigitalDisplay.otf` | 11,344 B | no copyright string recoverable; provenance **undetermined** |

**Rodin Bokutoh (Fontworks) is the actual Wii system typeface family; Shin Go (Morisawa) is
the 3DS/Switch face.** Both are current commercial retail products from Japanese foundries
with active licensing programmes, and both retail EULAs prohibit web redistribution of the
raw OTF. Continuum is Brøderbund's, proprietary, and abandonware is not public domain.

**Aggravating factors the survey did not capture:**

1. The fonts are **served twice** from the live site — once at
   `docs/Wii-UI/assets/fonts/<Family>/<File>.otf` (verbatim path, trivially discoverable)
   and again as build-hashed `docs/Wii-UI/media/<File>-<HASH>.otf`. Roughly **8.8 MB of
   retail type is publicly downloadable at a stable, guessable URL.**
2. They are the **complete, unsubsetted** retail files with intact `name` tables — i.e.
   directly installable. This is redistribution of the product itself, not a web-optimised
   derivative.
3. `styles.scss` uses `src: local("RodinBokutohBold"), url(...)` — the `local()` first, which
   is the idiom used specifically to prefer a locally *installed* copy. That does not mitigate
   anything, but it is a marker of how the files were obtained.
4. The repo has no licence, so there is not even a claimed basis for the redistribution.

> **Do not bundle, do not link, do not fetch at runtime, do not commit for local dev.** Our
> answer is already recorded elsewhere in the corpus (metric-compatible substitution +
> per-glyph fallback). This confirms the risk model concretely: the exposure is not "used a
> font", it is "operated a public download server for two foundries' commercial products".
> The Continuum/`DigitalDisplay` files are smaller but the analysis is identical.

### 14.3 Other encumbered assets

| Asset | What it is | Verdict |
|---|---|---|
| `wii_pointer.cur` (1,823 B) | **Nintendo's Player-1 hand cursor** — white glove with the blue "1". Rendered and visually confirmed. Actually a 32×32 PNG with a `.cur` extension. | **Do not copy.** Draw ours. |
| `wii_click.cur` (4,286 B) | The same cursor's closed/click state. A genuine MS cursor, hotspot 11,10. | **Do not copy.** |
| `wii.ico` (560,526 B) | 19-image icon bundle up to 256×256. Almost certainly the Wii logo/wordmark → **Nintendo trade mark**. | **Do not copy.** |
| `emptyChannel.png` (63,193 B, 366×192) | The empty-channel texture. **Screenshot-derived**: horizontal scan-line noise with a faint ghosted **"Wii" wordmark** visible in the centre. Visually confirmed. | **Do not copy.** Also *technically* useless to us — it is static, and `empty-slot-noise.md` establishes a ~33.3 s loop at random per-slot phase. |
| `cLogo.svg`, `settingsCog.svg`, `arrow.svg` | In-house SVG (gradient defs, hand-authored). `arrow.svg` is a plain chevron with a clip mask. | booper's own work → still **all rights reserved**. Re-author. |
| 16 brand logos (`netflixLogo.svg`, `spotifyLogo.svg`, …) | Third-party trade marks, unlicensed. | Irrelevant to us (we have no bookmarks), but note the pattern. |

**Nothing audio.** No `.mp3`/`.wav`/`.ogg` in the repo and no `Audio`/`AudioContext`/`howler`
reference in any source file. So there is **zero prior art here for the audio problem** —
`context/audio.md` gets no help from this project, and no ripped audio to be tempted by.

---

## 15. Prioritised takeaways for the next implementation pass

**Tier 1 — change or confirm a decision now**

1. **Keep the fixed-root `transform: scale()` and treat §1.3 as the closing argument.**
   booper and Fraulk independently hit the same wall (`path()`/`d` cannot take relative
   units → geometry must be rebuilt in JS on resize), and booper additionally has to
   hand-write a px↔viewBox unit converter for the zoom because it has no shared frame.
   Root-transform deletes both problems. Update `tech-rendering-animation.md` §5 with this as
   field evidence, and update `tech-prior-art.md` §2.1 — booper did **not** independently
   arrive at our architecture, it arrived at our *naming convention* over a reflowing layout.

2. **Adopt the one-path/three-`<use>`s tile idiom** (§2.1): `<path id>` in `<defs>`, referenced
   by a filled `<use>`, a stroked `<use>` (clipped to itself so the keyline is inset, not
   centred), and a `<clipPath><use/></clipPath>`. This is the cleanest "border that follows a
   clip-path" answer found anywhere in the survey and it directly implements
   `channel-tile.md`'s aperture + keyline.

3. **Adopt the parameterised contour builder for the bottom bar** (§2.2), preferring **arcs
   over cubics** for the notch, and derive the above/below clip regions and the inner-shadow
   path from the *same* generator so they cannot drift. Keep a 4:3 argument slot.

4. **Correct `tech-prior-art.md`: booper renders a date**, on the grey bottom bar, centred,
   below the clock, in neutral grey — independent corroboration of
   `decomp-findings.md` §9.1/§9.8 and `components/date-display.md` §259/§293. Currently
   recorded as "time-only, no date", which is wrong.

5. **Confirm CSS/WAAPI-only.** GSAP earns its 70 kB in exactly two `gsap.timeline()` calls of
   three tweens each (§9); the other 21 call sites are `style.setProperty` in a trench coat.
   Write the ~40-line WAAPI timeline helper early — that is the only capability we give up.

**Tier 2 — techniques to build in**

6. **Microtask, not rAF, for "after commit, before paint"** (§3.2) — `useLayoutEffect` in our
   stack. Write it into `animations-interactions.md` as a named rule.
7. **Do not animate `filter`** (§12 #1/#2). booper tried the hover glow twice and abandoned it
   to jitter. Animate `opacity` on a pre-blurred layer instead.
8. **Two-`<pattern>` SVG for the static page background** (§4); keep Canvas strictly for the
   animated empty-slot static.
9. **`visibilitychange` → pause animations** (§6), scoped to the animating subtree rather than
   `*`. More important for us than for booper.
10. **The four-event pressed-state pattern** and the hover/pointer media-query split (§8) —
    ~15 lines into `components/cursor.md` and the button components.
11. **Design deterministic-time hooks into the clock from the start** (§5.3): injectable
    `now` and `locale`, not module-level `new Date()`.
12. **Derive-and-publish sequence totals** (§6) so the pre-roll anchors to the end of boot
    rather than an absolute delay.
13. **Cull by pausing, not unmounting** (§7) — our tiles have persistent animation phase, so
    booper's unmount would cause a visible jump. And prefer the continuous-strip formulation,
    which turns booper's six-clause visibility predicate into a one-liner.

**Tier 3 — pitfalls to pre-empt**

14. **Never let a keyframe's *percentages* encode a duration ratio held elsewhere as ms**
    (§6, the `// CAREFUL` comment). Generate the offsets from the constants or chain real
    animations.
15. **One animation per property.** booper's colon blinks from a CSS keyframe *and* a
    `setInterval` (§5.3, §12c).
16. **Never poll for a valid rect** (§12h). If you need a retry loop, the layout dependency is
    wrong.
17. **Timing constants flow one way: TS → CSS custom properties.** booper mirrors them out and
    then reads durations *back* via `getComputedStyle` (`parseCssDuration`), which is a forced
    style recalc and a `NaN` waiting to happen.
18. **The "plausible round number" trap.** booper's 400 ms page slide is the **PAL** value —
    correct for a console we are not targeting, 20% off for the one we are. 350/1500/20-over-11
    are the same failure. **Every timing and geometry constant in our code should carry a
    `decomp-findings.md` §-citation in a comment.**

## 16. Explicit "do not copy" list

**Code — all of it.** No `LICENSE`, no licence header, `licenseInfo: null` → all rights
reserved. Techniques are free; expression is not. Re-derive and re-type everything, including:
- the `channelPath` tile silhouette `d` string (hand-tuned by eye; we have measurements)
- every SVG path in `display.service.ts`, `corner-action-slot.html`, `corner-action-button.html`
  (including the 22-point "wonky bubble boi" gloss highlight)
- `arrow.svg`, `cLogo.svg`, `settingsCog.svg` — booper's own authored art

**Fonts — confirmed proprietary, redistributed publicly, twice:**
- `RodinBokutohBold.otf`, `RodinBokutohDemiBold.otf` — **Fontworks Japan, © 2003**
- `ShinGoBold.otf` — **Morisawa & Co., © 2002**, "Shin Go" is a Morisawa trade mark
- `ContinuumBold.otf` — **Brøderbund Software, © 1996/1997**
- `DigitalDisplay.otf` — provenance undetermined; treat as encumbered until proven otherwise

**Nintendo assets:**
- `wii_pointer.cur`, `wii_click.cur` — the Player-1 hand cursor (visually confirmed)
- `wii.ico` — 560 kB icon bundle, Wii logo/trade mark
- `emptyChannel.png` — screenshot-derived empty-channel texture with a ghosted "Wii" wordmark
  (visually confirmed); also technically wrong for us, being static

**Third-party trade marks:** the 16 brand logo SVGs. Not applicable to us, but noted.

**Not encumbered because it does not exist:** there is **no audio** in this project and no
ripped sound of any kind.

---

## Appendix — file map for anyone re-reading the source

| Concern | File |
|---|---|
| Design constants, all geometry, all SVG path generation | `src/app/services/display.service.ts` (396 lines — the densest file) |
| Zoom camera + counter-transform + attribute caching | `src/app/services/zoom.service.ts` (337 lines) |
| Paging, deck construction, zoomed-channel stepping | `src/app/services/slide.service.ts` |
| Timing constants (all of them, one file) | `src/app/constants/timing-variables.ts` (16 lines) |
| Stage size, aspect, shelf height | `src/app/constants/shared-design.data.ts` (8 lines) |
| Tile silhouette + zoomed Wii Menu/Start buttons | `src/app/components/slide-deck/slide/channel/channel.{ts,html,scss}` |
| Background patterns + treadmill | `src/app/components/slide-deck/slide-deck.{ts,html,scss}` |
| Culling predicate + boot stagger | `src/app/components/slide-deck/slide/slide.ts` |
| Clock + pre-roll crossfade | `src/app/components/slide-deck/slide/clock/clock.{ts,html,scss}` |
| Date, corner buttons, lower shadow | `src/app/components/bottom-shelf/**` |
| Portal swap + microtask restore | `src/app/components/zoom-overlay/zoom-overlay.ts` |
| Boot overlay, arrows, keyboard nav, `#stage` | `src/app/components/wii-ui/wii-ui.{ts,html,scss}` |
| `relativePx()`, `@font-face`, cursor, pause class | `src/styles.scss` (95 lines) |
| Timing → CSS-var mirroring, `visibilitychange` | `src/app/app.ts` |
