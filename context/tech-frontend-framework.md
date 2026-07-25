# Platform & framework evaluation

**Research date:** 2026-07-25
**Scope:** platform/architecture, not domain research. Decides the JS framework, language, styling
approach and build tooling for this project.
**Question posed:** the repo is React 18 + Vite 4 + plain CSS. Starting from scratch is explicitly
on the table. What is the right platform?

---

## 0. Decision

**Stay on React, but upgrade it and stop routing the interesting parts through it.**

Concretely:

| Layer | Now | Recommended | Priority |
|---|---|---|---|
| Framework | React 18.2 | **React 19.2.8** | Low value, near-zero cost — do it |
| Build | Vite 4.4 | **Vite 8.1.5** + `@vitejs/plugin-react` 6.0.4 | Do it — you are 4 majors behind |
| Language | plain JS | **TypeScript** (`tsc --noEmit` in the loop) | **High value** — the best change on this list |
| Styling | plain CSS, colocated | **plain CSS + one `tokens.css`** | Do it. Skip Tailwind, skip vanilla-extract |
| Coordinate system | percentages of a MacBook-shaped box | **fixed 832×456 stage + `transform: scale()`** | **Highest value change in this document** |
| Animation | ad-hoc `transition: 0.1s ease` | **frame-derived duration tokens + a WAAPI `AnimGroup`** | **Second-highest** |

**And the honest headline: the framework choice barely matters here, and it is not where the
effort belongs.** Roughly 95% of the remaining work — the virtual coordinate space, the
frame-exact easing, 90 positionally-panned sound effects, per-frame cursor tracking, the
A+B-hold drag with its 15-frame dwell timer, the non-interruptible hover state machine — is
written against the *platform* (CSS custom properties, Web Animations API, Web Audio, pointer
events, `requestAnimationFrame`) and is byte-for-byte identical in React, Svelte, Solid, Vue or
no framework at all. §4 shows three of the four "ecosystem fit" criteria in the brief collapsing
to exactly that conclusion.

Solid would have been the marginally better greenfield pick (§5.4). It is not worth a migration.
The one thing that would justify moving is if the ~44 KB of React runtime starts to bother you as
a portfolio statement — §5 quantifies that so you can decide with a number rather than a feeling.

---

## 1. What this application actually is

This section is load-bearing; every judgement below follows from it.

### 1.1 It is a fixed-aspect scaled canvas, not a responsive document

From `context/decomp-findings.md` §1 (`src/system/iplSystem.cpp:1187–1199`), the entire menu is
laid out in a **virtual pixel space with the origin at screen centre**:

- 4:3 → **608 × 456**, x ∈ [−304, 304], y ∈ [−228, 228]
- 16:9 → **832 × 456**, same vertical extent

Channel tiles are **128 × 96** (4:3) / **170 × 96** (16:9). Widescreen is handled by *texture
swaps on 12 named panes*, not by re-layout (`decomp-findings.md` §7: "Widescreen is a texture
swap, not a re-layout"). There is no reflow, no breakpoint, no fluid grid, and no mobile layout —
because the target hardware had exactly two output modes and stretched pixels to fill the rest.

**Consequence:** every layout tool a modern framework ecosystem is optimised for — responsive
grids, container queries, breakpoint utilities, `clamp()` sizing — is *the wrong tool*. There is
one correct implementation and it is trivial CSS (§2). The current code does the opposite: it
positions things as percentages of a `1512:982` MacBook-shaped box with `clamp(3px, 0.73vw, 11px)`
gaps (`src/components/WiiMenu.css`), which is a fluid-responsive idiom fighting a fixed-coordinate
design. That is a real defect, and it is a **CSS** defect — no framework change fixes or causes it.

### 1.2 It is an animation state machine, not a render function

The decomp's model is: build a layout tree once, then drive it by playing **named animation groups
over explicit frame ranges** on persistent panes. Nothing unmounts. The page transition is a
5-slot horizontal carousel (`BaseMask0…4`) that slides 20 frames and then re-binds its contents —
explicitly a *recycling* structure (`context/components/page-navigation.md` §6).

And the hover animation is **not interruptible**:

> `calcCursorAnim()` will **not** start the out animation until the in animation has finished
> (`case 1: if (!mpCursorAnims[ANIM_CURSOR_FOCUS_ON]->isPlaying())`), and it stores the pending
> intent so a flick-over-and-off still plays in→out in full. Worth replicating — naive CSS
> `:hover` transitions will interrupt mid-way and look wrong.
> — `decomp-findings.md` §2.2

That is a queued-intent state machine, not a declarative `:hover` rule. Note that
`src/components/Channel.css` currently uses exactly the naive `:hover { transform: scale(1.03) }`
that this passage warns against.

**Consequence:** the correct abstraction is a tiny controller that mirrors NW4R's `brlan` playback
API — `setMinFrame` / `setMaxFrame` / `start()` / `isPlaying()`. The Web Animations API is an
almost exact analogue (§3.3). None of this benefits from a framework's declarative rendering.

### 1.3 Its declarative surface is tiny

The genuinely data-driven state of this app is:

```
currentPage: int          // persisted; decomp reads it back from save data
channels: Channel[]       // 12–48 static config entries
focusedSlot: SlotId | null
dragState: { … } | null
cursor: { x, y, rotation } // updated per animation frame — must NOT be framework state
now: Date                 // one tick per second
```

That is what a framework buys you. It is not much. The current codebase is **742 lines total**
(`src/**` including CSS), of which ~250 are JSX.

---

## 2. The fixed virtual coordinate space — solve this first, framework-independently

Three candidate techniques, evaluated against *this* design:

### 2.1 `transform: scale()` on a fixed-size root — **recommended**

```css
:root {
  --vw: 832;              /* virtual width  (608 in 4:3 mode) */
  --vh: 456;              /* virtual height */
}

.viewport {                     /* fills the browser window, letterboxes */
  position: fixed; inset: 0;
  background: #000;
  display: grid; place-items: center;
  overflow: hidden;
}

.stage {                        /* the console's framebuffer */
  width: calc(var(--vw) * 1px);
  height: calc(var(--vh) * 1px);
  transform: scale(var(--scale));
  transform-origin: center;
  will-change: transform;
}
```

with `--scale` set by ~6 lines of `ResizeObserver`:

```js
const scale = Math.min(innerWidth / 832, innerHeight / 456);
root.style.setProperty('--scale', scale);
```

**Why this one wins here:**

- It is *literally what the console does*: render at the virtual resolution, then stretch to the
  output. Fidelity by construction.
- Every number in every stylesheet becomes a **literal decomp value** — `width: 170px`,
  `height: 96px`, `top: 50px`. The CSS becomes directly auditable against
  `decomp-findings.md`. Compare the current `top: 8.24%; bottom: 30.12%; padding: 0 8.2%`, which
  is unverifiable against any source.
- **One rounding regime.** Layout is computed once at 832×456; the scale is a single composited
  transform. There is no per-element sub-pixel rounding, so you never get the 1px seams that
  percentage/`clamp()` layouts produce at awkward viewport sizes. This matters directly for
  screenshot diffing (`docs/methodology/visual-regression-tooling.md`): pin the test viewport so
  `--scale` is a clean number (e.g. 832×456 → scale 1, or 1664×912 → scale 2) and the diff is
  deterministic by construction rather than by threshold tuning.
- 4:3 vs 16:9 becomes a one-line switch on `--vw` plus the texture swaps the decomp describes.

**The two caveats, both one-liners:**

1. `getBoundingClientRect()` and `PointerEvent.clientX/Y` return *screen* coordinates. Every
   pointer→virtual conversion must divide by the scale. Write one `toVirtual(e)` helper and use it
   everywhere. This is the same in every framework.
2. Hit-testing itself is fine — browsers transform hit-test coordinates correctly through
   `transform`.

### 2.2 A `--u` unit custom property (pure CSS, no JS)

```css
.stage { --u: min(calc(100vw / 832), calc(100vh / 456)); }
.tile  { width: calc(var(--u) * 170); height: calc(var(--u) * 96); }
```

Zero JS, and values stay auditable. But layout is computed at the *final* resolution, so each
element rounds independently → seams. And every declaration gains a `calc()` wrapper, which is
noise across a few hundred rules. A variant of this — `font-size: min(...)` on the stage and `em`
everywhere — is more concise but breaks the moment any descendant sets `font-size`, which this
design does constantly (clock, balloons, channel names). **Good fallback, not the default.**

### 2.3 CSS `zoom`

`zoom` reached Baseline 2024 (May 2024) and, unlike `transform`, *affects layout* — descendants'
`getBoundingClientRect()` returns already-zoomed values, which removes caveat (1) above.
([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/zoom)) Tempting, but it re-runs layout on
every resize instead of being a pure composited transform, its interaction with fractional values
and text rendering is less predictable across engines, and it is the less-trodden path. **Not
recommended, but worth knowing about** if the coordinate-conversion helper becomes a nuisance.

### 2.4 `clamp()`-based sizing — reject

This is what the code does today. It is designed for *fluid* layouts where the relationship
between elements is allowed to change. Here the relationship must never change, so `clamp()` only
introduces places where it can. Delete it.

> **Framework relevance: zero.** All three techniques are CSS plus (at most) a `ResizeObserver`.
> This is the single highest-value change available and it is identical in React, Svelte, Solid,
> Vue and vanilla.

---

## 3. Frame-exact animation

### 3.1 Duration tokens should be written as frame counts

Every timing in the corpus is `frames / 60 × 1000`. Encode that literally so the CSS is auditable
against the decomp and PAL becomes a one-variable change:

```css
:root {
  --frame: 16.6667ms;                        /* NTSC 60 Hz; 20ms for PAL */
  --ease-wii: cubic-bezier(0.5, 0, 0.5, 1);  /* smoothstep, max error <0.5% */

  --dur-page-scroll:  calc(20 * var(--frame));  /* 333 ms — startPageScroll()      */
  --dur-channel-zoom: calc(28 * var(--frame));  /* 467 ms — my_IplTop_a.brlan 200→228 */
  --dur-btn-hover-in: calc( 6 * var(--frame));  /* 100 ms — B_Set 6900→6906        */
  --dur-btn-hover-out:calc( 8 * var(--frame));  /* 133 ms — B_Set 6930→6938        */
  --dur-arrow-focus:  calc(15 * var(--frame));  /* 250 ms — G_ArwR_Focus 10600→10615 */
  --dur-arrow-select: calc(30 * var(--frame));  /* 500 ms — G_ArwR_Ac 10700→10730  */
  --dur-arrow-appear: calc(10 * var(--frame));  /* 167 ms — G_ArwR_End 10150→10160 */
  --dwell-arrow-drag: calc(15 * var(--frame));  /* 250 ms dwell before page turn    */
  --delay-balloon:    calc(20 * var(--frame));  /* 333 ms before the name balloon   */
}
```

`--ease-wii` is not a guess: `HermiteIntp` with zero end-tangents resolves to `3t² − 2t³`, classic
smoothstep, and `cubic-bezier(0.5, 0, 0.5, 1)` approximates it to <0.5% (`decomp-findings.md`
§3.2). Adopt it as the project's *default* easing, not just the zoom's — explicitly **not**
`ease-in-out` (`cubic-bezier(0.42, 0, 0.58, 1)`).

### 3.2 Use CSS / WAAPI, not a JS animation library — and the reason is testing

`docs/methodology/visual-regression-tooling.md` builds the whole verification story on Playwright's
`animations: 'disabled'` screenshot option, which "stops CSS animations, CSS transitions and Web
Animations. Finite animations are fast-forwarded to completion; infinite ones are reset to the
start."

That flag has no idea what a `requestAnimationFrame` loop is. So:

- **CSS transitions / CSS animations / WAAPI → deterministic screenshots for free.**
- **Motion (12.42.2, ~45 KB gzip), GSAP, react-spring → nondeterministic screenshots**, because
  they tick on rAF for anything WAAPI can't express, and Playwright will happily capture them
  mid-flight.

This is a hard constraint, and it applies to any framework's JS-driven transition system too —
including Svelte transitions that supply a `tick` function rather than a `css` function.
**Verdict: no animation library. Ever, on this project.** The one legitimate rAF loop is the
cursor (which you will freeze in tests anyway), plus the animated channel-tile content.

### 3.3 Build an `AnimGroup` that mirrors `brlan` playback

WAAPI is a remarkably close analogue of the console's model:

| NW4R (`ipl::Layout`) | Web Animations API |
|---|---|
| `setMinFrame(a) / setMaxFrame(b)` | `KeyframeEffect` with `duration = (b−a)/60 s` |
| `start()` | `animation.play()` |
| `isPlaying(0)` | `animation.playState === 'running'` |
| `ANIM_TYPE_LOOP` | `iterations: Infinity` |
| reverse (`_Lost.brlan`) | `animation.reverse()` / `playbackRate = -1` |
| "wait for it to finish" | `await animation.finished` |
| random start frame (`rndm % 2000`) | `animation.currentTime = seed` |

That last row is not hypothetical: empty-slot tiles are seeded to a random start frame in
`[0, 2000)` and the shared idle animation is re-seeded after every successful drag
(`decomp-findings.md` §5.1, §6.5). `animation.currentTime = …` does exactly this. Similarly the
non-interruptible hover (§1.2) is `await inAnim.finished` before starting `outAnim`, with a
single pending-intent variable — about 30 lines, framework-neutral, and directly checkable
against `calcCursorAnim()`.

**Recommendation:** write `src/anim/AnimGroup.ts` as a thin typed wrapper over WAAPI whose method
names match the decomp's. It will make the C++ and the TS read as the same program, which is
exactly what an AI-agent-assisted fidelity project wants.

---

## 4. Three of the four "ecosystem fit" criteria collapse

The brief asks about ecosystem fit for audio-with-panning, drag-and-drop, and per-frame cursor
tracking. Examined against the actual requirements, **none of them are framework questions.**

### 4.1 Audio — Web Audio directly, ~80 lines, no library

`include/sound/IplSound.rsid` is a complete 90-entry sound-ID table (`decomp-findings.md` §11).
Several effects are **panned by pointer X**: `startSEwithPos("WIPL_SE_CH_HOLD", mDragPos.x)`, and
`WIPL_SE_CH_DRAG` is a held sound whose pan follows the pointer and whose intensity follows
per-frame movement magnitude (§6.5).

The correct implementation is one `AudioContext`, a decoded `AudioBuffer` pool, and per-voice
`AudioBufferSourceNode → GainNode → StereoPannerNode → destination`. `StereoPannerNode` is
Baseline Widely Available since April 2021, `pan ∈ [−1, 1]`, and uses a cheap equal-power
algorithm — exactly the right primitive
([MDN](https://developer.mozilla.org/en-US/docs/Web/API/StereoPannerNode)). Mapping is direct:
`pan = clamp(virtualX / 416, -1, 1)` in 16:9.

Howler 2.2.4 (9.7 KB gzip) is the usual reach, but its spatial support is built on the heavier
`PannerNode`/HTML5-audio fallback path and it adds an abstraction between you and the parameter
you need to modulate per-frame. **Skip it.** No framework has an opinion here.

### 4.2 Drag-and-drop — no library can model this

The Wii's rearrange is: **A+B held** on a tile → a floating `my_TVShade_a.brlyt` ghost tracks the
pointer → `my_TVMask_a.brlyt` dims every *other* occupied tile → a held, pointer-panned,
speed-modulated `WIPL_SE_CH_DRAG` plays → dwelling on an arrow for **15 frames** turns the page
and resets the counter → dropping on an occupied slot plays `WIPL_SE_CH_NOT_MOVE` and enters a
**20-frame** settle before the mask fades → a successful drop re-seeds the idle animation
(`decomp-findings.md` §6, `page-navigation.md` §4.5).

`@dnd-kit/core` (6.3.1, React-only, 14 KB gzip), `svelte-dnd-action` (0.9.74) and
`@thisbeyond/solid-dnd` all model "reorder a list with a sortable strategy." None of them model
a dwell timer, a panned continuous sound, a two-button gesture, or a rejection settle. You are
writing this against `pointerdown`/`pointermove`/`setPointerCapture` and a rAF loop regardless.

**So "which framework has the best DnD library" is a non-criterion.** Delete it from the
decision. (Svelte's `animate:flip` and Vue's `<TransitionGroup>` move-class remain mildly nice for
the *settle* animation after a drop — but that settle is a single element translating to a known
slot, i.e. one WAAPI animation.)

### 4.3 Per-frame cursor — must bypass framework state in *all* frameworks

The correct implementation is one global rAF loop writing two custom properties on one element:

```js
function tick() {
  stage.style.setProperty('--cursor-x', px);
  stage.style.setProperty('--cursor-y', py);
  requestAnimationFrame(tick);
}
```

Putting cursor position into `useState` / a Svelte rune / a Solid signal is wrong in every
framework — not because reactivity is slow, but because rAF is the correct clock and the
framework's scheduler is not. React's cost is highest (a full reconciliation pass per frame if you
do it naively), Solid's and Svelte's are lowest (a single binding update), but the *right* answer
is identical everywhere: don't route it through the framework.

The decomp also gives you cursor rotation driven from remote roll (`pRotatePane->SetRotate(...)`,
`context/components/cursor.md` §5) and a separate offset shadow pane — two more custom properties
on the same element. Same conclusion.

### 4.4 What *is* a real framework criterion, then

Only four things survive:

1. **Runtime weight** (§5 has measured numbers).
2. **Effect/lifecycle semantics** under ~48 concurrently-running rAF loops, one `AudioContext`
   and a global pointer loop.
3. **Migration cost** from 742 lines.
4. **How legible the codebase is to an AI coding agent** — which, given
   `docs/methodology/agentic-visual-development.md` and how this project is actually being built,
   is not a soft factor.

---

## 5. Framework-by-framework

### 5.0 Measured bundle sizes

Not quoted from a blog — scaffolded from `npm create vite@latest` (Vite 8.1.1) on 2026-07-25,
`npm run build`, gzipped:

| Template | Raw JS | **Gzip JS** | vs. vanilla |
|---|---:|---:|---:|
| `vanilla-ts` | 4,524 B | **2.0 KB** | 1× |
| `solid-ts` (solid-js 1.9.13) | 15,016 B | **5.7 KB** | 2.8× |
| `svelte-ts` (svelte 5.56.4) | 30,828 B | **12.2 KB** | 6.1× |
| `vue-ts` (vue 3.5.39) | 63,315 B | **24.6 KB** | 12.3× |
| `react-ts` (react 19.2.7) | 193,355 B | **60.0 KB** | 30× |

And this repo's actual current build (React 18, 742 lines of app): **148,244 B raw / 47.7 KB gzip
JS + 1.5 KB gzip CSS**. So roughly **44 KB of the 47.7 KB is React**, and ~4 KB is your app.

**How much this matters, honestly:** 45 KB gzip is ~1 HTTP round trip and single-digit
milliseconds of parse on any device made this decade. It will be dwarfed by 90 audio assets, the
channel-banner artwork, and two webfonts. It is *not* going to be what makes the app feel snappy —
compositor-driven transforms and self-hosted fonts will be. But "43 KB of framework to render
twelve rectangles" is a fair aesthetic objection for a portfolio piece, and you should make that
call knowingly rather than by default.

### 5.1 Staying on React + Vite

**Current state:** react 18.2 / react-dom 18.2 / vite 4.4 / `@vitejs/plugin-react` 4.0. Latest is
**react 19.2.8** (2026-07-21), **vite 8.1.5** (2026-07-16), **`@vitejs/plugin-react` 6.0.4**.

**What is working.** `src/` is clean and small. `Clock.jsx`'s seven-segment SVG and
`ChannelStatic.jsx`'s canvas noise are both well-factored and would port unchanged to any
framework — `ChannelStatic` in particular already does the right thing (a rAF loop in a ref,
cleaned up on unmount, DOM written imperatively). The component boundaries (`WiiMenu` /
`Channel` / `BottomBar` / `Clock`) match the decomp's own scene decomposition reasonably well.

**What is not working — and note that none of it is React's fault.** The percentage/`clamp()`
coordinate system (§2.4), the interruptible `:hover` transitions (§1.2), `transition: 0.1s ease`
instead of frame-derived durations with `--ease-wii` (§3.1), and Google-Fonts-over-the-network in
`index.html` (a determinism hazard flagged in the VRT doc). Every one of these is a CSS or
architecture problem that survives any migration.

**Does React's model fight a fixed-coordinate animated UI?** Two real frictions, both manageable:

1. **Per-frame state is a trap** (§4.3) — but the correct pattern (refs + direct DOM writes) is
   the same everywhere, and React 19 actually *improves* it: ref callbacks can now return a
   cleanup function, which is exactly the ergonomics you want for attaching a rAF loop or a WAAPI
   animation to a node.
2. **StrictMode double-invokes effects in dev.** With 48 tiles each owning a rAF loop, plus an
   `AudioContext`, plus a global pointer loop, this will bite. It is also *doing its job* —
   double-invocation is precisely how you find the effect that leaks a rAF handle or opens a
   second `AudioContext`. Keep StrictMode; write idempotent effects. `ChannelStatic.jsx` already
   passes this test.

React's concurrent scheduler can in principle defer a commit past a frame boundary, but that only
matters for state you were never supposed to put in state.

**Upgrade cost, React 18 → 19: effectively zero for this codebase.** The 19 breaking changes are
removal of `ReactDOM.render` (you use `createRoot` ✓), removal of `propTypes` (unused ✓), removal
of string refs (unused ✓), removal of legacy context (unused ✓), `react-test-renderer`
deprecation (unused ✓). It is a version bump and a re-install. **React Compiler shipped 1.0**
(`babel-plugin-react-compiler@1.0.0`), with its lint rules in `eslint-plugin-react-hooks@7.1.1`,
which removes memoization busywork if you ever need it — though at this app size you won't.

**Testing fit:** perfect, and unaffected by framework. Playwright drives the DOM.

**Migration cost:** zero, by definition. This is the option's entire case, plus §4.4 criterion 4.

### 5.2 Svelte / SvelteKit

**svelte 5.56.8** (published 2026-07-24 — extremely active), `@sveltejs/kit` 2.70.1,
`@sveltejs/vite-plugin-svelte` 7.2.0. 88k stars. Health: excellent.

**Fixed coordinates:** identical to React — it's CSS. Svelte's per-component scoped `<style>`
blocks are a genuinely nice home for measured CSS (no naming discipline needed, no CSS Modules
indirection), which is a small but real ergonomic win for a project where nearly every component
has a page of pixel-exact styling.

**Animation ergonomics:** the headline feature applies less than it looks. `transition:` / `in:` /
`out:` are *element-lifecycle* primitives — they fire on mount and unmount. But this UI barely
mounts or unmounts anything: the carousel recycles slots, the hover overlay is a persistent pane,
the arrows play an APPEAR animation rather than being inserted. So the Wii's animations are
*state transitions on persistent elements*, which is CSS-transition/WAAPI territory in every
framework. What *does* transfer: `svelte/easing` accepts a custom `(t: number) => number`, so
smoothstep is `t => t * t * (3 - 2 * t)` — though you'd be using the CSS bezier anyway (§3.2).
`animate:flip` is the one real win, for the post-drop settle. Caution: a Svelte transition
implemented with `tick` rather than `css` is rAF-driven and therefore invisible to Playwright's
`animations: 'disabled'`.

**Bundle:** 12.2 KB gzip. Saves ~35 KB vs React.

**Migration cost:** rewrite ~250 lines of JSX as `.svelte` files. All 400 lines of CSS port
verbatim (into `<style>` blocks). Realistically half a day with agent help; the risk is not the
work, it's that JSX→template translation is exactly the kind of change where a subtle
class-name or conditional gets dropped and you don't notice until a screenshot diff. Mitigated by
having the screenshot diffing in place *first*.

**Verdict:** a good framework whose specific advantages mostly don't apply to this app.

### 5.3 Vue

**vue 3.5.40** (2026-07-16); 3.6.0-rc.2 is in RC (Vapor mode). 54k stars, extremely active.

**Prior art — `Fraulk/Wii-Menu`.** Worth being clear-eyed about it: 0 stars, last pushed
2021-04-21, ~22 KB of `.vue` source, Vue 3 + `vue-cli-service` 4.5 (Webpack, itself long
superseded), and — importantly — **no LICENSE file, meaning all rights reserved.** It is not a
technical argument for Vue and you should not copy code from it. It *is* useful as a visual
reference: its `App.vue` `:root` block is a clean palette of one fan's colour reads
(`--wii-blue: #3cb9e6`, `--wii-background: #d0d2d9`, `--empty-channel: #cacaca`), which is a
cheap cross-check against your own measured values. Look, compare, don't copy.

**Fixed coordinates:** identical — CSS. Vue SFCs give scoped styles, same mild win as Svelte.

**Animation:** `<Transition>` is again mount/unmount-oriented; `<TransitionGroup>`'s FLIP
move-class is the analogue of `animate:flip`. Same conclusion as Svelte.

**Bundle:** 24.6 KB gzip — half of React, double Svelte. Vapor mode (3.6) promises to cut this
further by dropping the virtual DOM, but it is RC and not a reason to bet today.

**Migration cost:** same shape as Svelte, plus you'd be adopting the framework with the weakest
argument on the list — it is neither the smallest nor the most React-like nor the one with prior
art worth using.

**Verdict:** no reason to pick it here.

### 5.4 Solid

**solid-js 1.9.14** (2026-07-01); **2.0.0-beta.25** shipped 2026-07-23, so 2.0 is actively baking.
36k stars, pushed daily.

This is the strongest technical fit, and worth stating clearly even though the recommendation
lands elsewhere.

- **5.7 KB gzip** — an order of magnitude under React, and only 2.8× vanilla. For a portfolio
  piece whose whole thesis is precision, that number is on-message.
- **JSX**, so the migration from the current React code is close to mechanical. The four gotchas:
  props are not destructurable (it breaks reactivity), signals are function calls (`count()` not
  `count`), `<For>`/`<Show>` instead of `.map()`/`&&` for anything keyed, and `onMount`/
  `createEffect` instead of `useEffect`. An agent does this translation reliably.
- **No reconciler, no StrictMode double-mount, effects run exactly once.** With 48 rAF loops and
  an `AudioContext`, that is a real reduction in footguns, not a theoretical one.
- Fine-grained updates mean that even if you *did* sloppily put cursor position in a signal, only
  the two bindings that read it re-run. It fails gracefully where React fails loudly.

**Against it:** the ecosystem is thinner — but per §4, this project consumes almost no ecosystem.
The real cost is **Solid 2.0**: adopting 1.9 now means either a major migration later or sitting
on a maintenance-only branch. For a hobby project that is annoying rather than fatal, but it's the
kind of thing that turns a fun evening into a chore eighteen months from now.

**The decisive factor against it** is §4.4 criterion 4: this project is being built with heavy AI
agent involvement, and React has an enormously larger corpus of agent-legible patterns. Solid's
reactivity gotchas (especially prop destructuring silently killing reactivity) are precisely the
class of error agents make and don't notice, and they fail *silently* rather than at the type
level. Trading a compounding correctness advantage across the rest of the project for 40 KB is a
bad trade.

**Verdict:** the right answer for a greenfield build with a human writing every line. Not worth
migrating to.

### 5.5 Vanilla TS + Vite — argued seriously

This deserves more than a dismissal, because §1 keeps pointing at it.

**The case for.** The decomp's architecture *is* vanilla: build a layout tree once, then drive
persistent nodes with named animations. Nothing unmounts. The list rendering you'd give up is
"12 tiles from a config array, built once, then mutated" — which you want to build once anyway,
because unmounting a tile destroys its running animation. A framework's core value proposition —
"describe the UI as a function of state and I'll figure out the DOM mutations" — is a value
proposition for apps whose DOM *shape* changes. This app's DOM shape is fixed at startup; only
attributes, classes and custom properties change. **2.0 KB gzip.** Every animation, sound and
input handler in §3–§4 is written exactly the same way it would be in any framework.

**The case against.**

- **No component boundary means no enforced discipline.** A framework gives you and your agents a
  structural convention for free. In vanilla you invent one and then have to enforce it — and
  agents drift from hand-rolled conventions faster than from framework idioms.
- **HMR degrades to full reload** for plain modules, so you lose scroll/animation/audio state on
  every save. In a project whose inner loop is "tweak a number, look at the pixels," that is a
  real tax.
- **You will rebuild ~200 lines of framework.** A `createComponent` convention, an event-delegation
  helper, a keyed-list updater for the channel array, a state-change→DOM-sync mechanism. That code
  is unremarkable but it is code you now own.
- Agent legibility is the worst of any option.

**If you were to do it,** the shape is: one `Stage` module owning the 832×456 root; a
`ChannelGrid` that builds 5 × 12 slot elements once and only re-binds their contents on page
settle (mirroring `refreshChannelList()`); a `SceneState` discriminated union mirroring the
decomp's `STATE_*` enum; `AnimGroup` from §3.3; `SoundBank` from §4.1. `lit` (Web Components +
efficient templating, ~5 KB) is the sensible middle ground if you want templates without a
framework.

**Verdict: a genuinely defensible choice, and the one that best matches the architecture the
decomp implies.** It loses to "stay on React" only on inner-loop ergonomics and agent legibility —
but those two are the project's actual bottleneck, so it loses.

### 5.6 Astro — wrong shape

**astro 7.1.3**, healthy (61k stars, pushed daily). Astro's entire value is shipping *zero* JS for
static content and hydrating islands selectively, with content collections, MDX and file-based
routing. This app is **one route, 100% interactive, with no content and no server**. You would get
Vite plus an island-hydration layer you actively work around, and every interactive piece would
need `client:load` anyway. Same for Next/Nuxt/SvelteKit-as-a-meta-framework: SSR, routing and data
loading are all solutions to problems this project doesn't have. **Skip. Stay on plain Vite SPA.**

---

## 6. TypeScript

**Adopt it.** This is the highest-value item on the list after the coordinate system.

**For:**

- **The project's entire value proposition is numbers being correct.** TS lets you make the units
  unrepresentable-when-wrong in exactly the places it matters. Branded types are ~4 lines and pay
  for themselves immediately:

  ```ts
  type VirtualPx = number & { __brand: 'vpx' };   // decomp coordinate space
  type ScreenPx  = number & { __brand: 'spx' };   // post-transform, from PointerEvent
  type Frames    = number & { __brand: 'f'  };
  const toMs = (f: Frames): number => (f / 60) * 1000;
  ```

  Mixing virtual and screen pixels is *the* bug this architecture invites (§2.1 caveat 1), and it
  is a bug that produces subtly-wrong pixels rather than a crash — the worst kind here.
- **The decomp's state machines are discriminated unions.** `STATE_NORMAL |
  STATE_PREP_LEFT_PAGE_SCROLL | STATE_LEFT_PAGE_SCROLL | STATE_RELEASE_WAIT | …` typed as a union
  gives you exhaustiveness checking on every `switch` — i.e. the compiler tells you when you've
  forgotten to handle a state the decomp defines. That is a fidelity check, not just a type check.
- **The 90-entry sound table becomes a union type**, so `play('WIPL_SE_CH_HOLDD')` fails at build
  time instead of silently doing nothing.
- **Agent correctness signal.** `tsc --noEmit` runs in seconds and catches precisely the errors
  agents make — renamed prop not updated at a call site, wrong shape after a refactor, a typo'd
  string constant. Paired with the Playwright screenshot diff, it gives you two cheap,
  machine-checkable gates, which is the philosophy the VRT doc already argues for ("a claim of
  success is either backed by a file on disk or is trivially falsifiable").

**Against:** it's a 742-line solo hobby project; `// @ts-check` with JSDoc in `jsconfig.json` gets
maybe 70% of the benefit with zero build change and no `.tsx` rename; and TS adds a compile step
to an inner loop you want instant.

**Resolution:** the "against" is real but the branded-units and exhaustive-state arguments are
specific to *this* project rather than generic type-safety advocacy, and Vite strips types with
Oxc at effectively zero cost. **Adopt TS.** Do it as part of the Vite 8 upgrade, in one pass:
rename `.jsx` → `.tsx`, add `tsconfig.json`, add `"typecheck": "tsc --noEmit"`, start with
`strict: true` (the codebase is too small for it to hurt).

**Version wrinkle, worth knowing.** npm `latest` for `typescript` is **7.0.2** (2026-07-08) — the
7.x line is the native Go port developed in
[microsoft/typescript-go](https://github.com/microsoft/typescript-go) (26k stars, pushed daily).
But GitHub release tags on microsoft/TypeScript stop at **6.0.3** (2026-04-16), and Vite 8's own
scaffolds still pin `typescript: ~6.0.2`. **Pin `~6.0.3` initially**; move to 7 once your
toolchain (`vue-tsc`/`svelte-check` equivalents, editor) has caught up. Low stakes either way.

Note also that Vite 8's React scaffold now ships **`oxlint` 1.71** rather than ESLint — worth
adopting for consistency and speed if you want a linter at all.

---

## 7. Styling

The defining property here: **the design tokens are measurements from a decompiled binary and a
reference screenshot.** There is exactly one theme, no dark mode, no responsive variants, no
component library, and no second consumer. Optimise for *auditability against a source document*,
not for reuse.

### 7.1 Plain CSS + a single `tokens.css` — **recommended**

```
src/styles/
  tokens.css     ← the virtual unit, frame durations, easings, measured colours
  reset.css
src/components/Channel.css   ← colocated, as today
```

`tokens.css` is the whole design system: `--frame`, `--ease-wii`, the duration set from §3.1,
`--vw`/`--vh`, and the colour reads. Every one of those gets a comment citing its decomp line or
screenshot measurement. That file becomes the bridge between `context/` and `src/`, and it is
reviewable as a document. No tool does this better than a plain CSS file with comments.

### 7.2 CSS Modules — free, adopt if collisions appear

Built into Vite, zero runtime, just rename to `.module.css`. Buys scope safety; costs one level of
indirection (`styles.channelTile` vs `.channel-tile`) that agents occasionally fumble, and makes
DevTools class names less readable when you're eyeballing against a reference — which you will be
doing constantly. **Not now. Adopt the day you have an actual collision.**

### 7.3 vanilla-extract (1.21.1) — attractive, but not enough payoff

The genuine appeal: styles authored in TypeScript means the §6 branded types reach into the
stylesheet, and `createThemeContract` gives you typed, autocompleted, compile-time-checked design
tokens with zero runtime. For a token-heavy project that is a real fit.

But: one theme, one consumer, no cross-package sharing. `createThemeContract` solves a problem
(keeping multiple themes structurally identical) you don't have. What you'd actually get over
`:root { --tile-w: 170px; }` is autocomplete — at the cost of a build plugin, `.css.ts` files, and
CSS that no longer looks like the CSS in every reference and MDN page you'll be reading. **Skip,
but it's the one alternative worth revisiting** if `tokens.css` grows past ~150 entries.

### 7.4 Tailwind (4.3.3) — reject

Tailwind's model is "compose from a constrained scale." This project's values are *unconstrained
one-off measurements*: 128, 170, 96, 391.5, +50, 60, 20 frames, `cubic-bezier(0.5,0,0.5,1)`.
Essentially 100% of declarations would be arbitrary-value syntax (`w-[170px]
duration-[calc(28*var(--frame))]`), which is Tailwind at its least useful — all of the syntax tax,
none of the constraint benefit. Add the gloss overlays (`::before` gradients), the SVG fills, the
multi-stop radial background and the WAAPI keyframes, and most of the real styling lives outside
utility classes anyway.

Tailwind v4's `@theme` directive *does* emit plain CSS custom properties on `:root`
([docs](https://tailwindcss.com/docs/theme)), so you could use it purely as a token pipeline — but
then you've adopted a build dependency to do what a `:root` block does natively. **Skip.**

### 7.5 Two immediate styling fixes, independent of all of the above

1. **Self-host the fonts.** `index.html` loads RocknRoll One from Google Fonts. The VRT doc calls
   this "the single highest-value determinism change available" — it removes the network from the
   render path, kills a whole class of flaky screenshot diffs, and makes the app faster.
2. **Delete the `clamp()` sizing and the `1512:982` MacBook frame** in favour of §2.1. The frame
   ratio is an artifact of the reference screenshot's capture, not of the Wii.

---

## 8. Build tooling

**Vite 4.4 → Vite 8.1.5.** Upgrade regardless of every other decision here.

Vite 8 (2026) unifies dev and build on **Rolldown** (Rust), replacing the old esbuild-dev /
Rollup-prod split, and uses **Oxc** instead of Babel for transforms in the React plugin. It claims
10–30× faster builds, ships integrated devtools, native `tsconfig` paths support, and browser
console forwarding to the dev terminal. Requires **Node 20.19+ / 22.12+**
([Vite 8 announcement](https://vite.dev/blog/announcing-vite8)).

**Does the speed matter?** No — this app builds in under a second either way. **Does the upgrade
matter?** Yes, for three unglamorous reasons: (a) you are four majors behind and every plugin you
might add now targets Vite 7/8; (b) `@vitejs/plugin-react` 4 → **6.0.4** is where the Babel→Oxc
switch happens, and staying behind means staying on Babel; (c) Playwright's `webServer` config —
which the VRT doc recommends for booting the dev server during tests — is a place you don't want
version surprises.

The upgrade for this repo is:

```bash
npm i -D vite@8 @vitejs/plugin-react@6
npm i react@19 react-dom@19
```

`vite.config.js` is three lines and needs no changes. Verify Node ≥ 20.19.

Other current versions, for the record: `@playwright/test` **1.62.0** (pin exactly, per the VRT
doc — a floating minor shifts Chromium's antialiasing and invalidates baselines),
`@sveltejs/vite-plugin-svelte` 7.2.0, `vite-plugin-solid` 2.11.13.

---

## 9. Recommendation and path

### 9.1 The call

**Stay on React + Vite.** Migrate the *stack*, not the framework, and put the saved effort into
the architecture that actually determines fidelity.

The reasoning, tied to the constraints:

1. **The framework is doing ~5% of the work.** §4 shows the audio, drag, and cursor requirements
   all resolving to hand-written platform code that is identical everywhere. §2 shows the
   coordinate system resolving to CSS + a `ResizeObserver`. §3 shows the animation system
   resolving to CSS custom properties + WAAPI, with a hard testing-driven prohibition on JS
   animation libraries. What's left for a framework is twelve tiles, a page index and a clock.
2. **Migration buys ~35–42 KB gzip and slightly cleaner effect semantics.** Real, but small, and
   paid for with a day of translation risk on CSS you have already tuned against a reference
   image.
3. **Agent legibility compounds.** This project is being built agentically. React's pattern corpus
   is the largest by a wide margin, and Solid's silent-failure modes (prop destructuring killing
   reactivity) are exactly the errors agents produce without noticing.
4. **React 18 → 19 is free** for this codebase (§5.1), which removes "you're on a stale major" as
   an argument for leaving.

**Where this would be wrong:** if the 44 KB genuinely bothers you as a portfolio statement — it's
a defensible thing to care about on a project whose entire point is precision — then **Solid** is
the migration to make, it costs roughly half a day with agent help, and §5.4 has the four gotchas
to watch. Do it *before* building the animation and audio layers, not after, and only once the
screenshot-diff harness is in place to catch translation errors. **Do not migrate to Vue or
Astro.** Vanilla TS is respectable and architecturally the most honest, but loses on inner-loop
ergonomics.

### 9.2 Ordered path

**Phase 0 — one afternoon, do this before anything else**

1. `npm i -D vite@8 @vitejs/plugin-react@6 typescript@~6.0.3` / `npm i react@19 react-dom@19`.
   Verify Node ≥ 20.19.
2. Rename `src/**/*.jsx` → `.tsx`, add `tsconfig.json` with `strict: true`, add
   `"typecheck": "tsc --noEmit"`.
3. Self-host RocknRoll One into `public/fonts/`; drop the Google Fonts `<link>`s.
4. Stand up the Playwright harness from `docs/methodology/visual-regression-tooling.md` and
   commit baselines. **Everything after this point should be verified by it.**

**Phase 1 — the architectural changes that actually matter**

5. Replace `.wii-screen` / `.tv-frame` / `.wii-menu` with the §2.1 stage: a fixed 832×456 root,
   `transform: scale(var(--scale))`, one `ResizeObserver`. Rewrite every position and dimension in
   the CSS as a literal virtual pixel from `decomp-findings.md`. Delete every `clamp()` and every
   percentage.
6. Add `src/styles/tokens.css` with `--frame`, `--ease-wii` and the frame-derived duration set
   from §3.1, each line commented with its decomp citation.
7. Add `src/anim/AnimGroup.ts` (§3.3) — a typed WAAPI wrapper whose API mirrors
   `setMinFrame`/`setMaxFrame`/`start`/`isPlaying`. Port the channel hover to it *with* the
   non-interruptible queued-intent semantics from `decomp-findings.md` §2.2, replacing the current
   `:hover { transform: scale(1.03) }`.
8. Add `src/audio/SoundBank.ts` (§4.1) — `AudioContext`, buffer pool, per-voice
   `StereoPannerNode`, `play(id, { panX })`. Type the 90 sound IDs as a union.
9. Add `src/input/pointer.ts` — one rAF loop, `toVirtual(e)`, cursor position and rotation written
   as custom properties on the stage.

**Phase 2 — features, on a foundation that no longer fights you**

10. The 5-slot carousel and the 20-frame page slide; `localStorage` for `currentPage`
    (`page-navigation.md` §6).
11. The A+B drag with its 15-frame arrow dwell, 20-frame rejection settle, and panned
    speed-modulated drag sound.
12. Animated channel tiles seeded to random start frames via `animation.currentTime`.

### 9.3 When to revisit

Revisit the framework decision if — and only if — one of these becomes true:

- The React runtime shows up as a measurable problem in a Lighthouse/profiler trace (it won't at
  this size, but measure rather than assume).
- You find yourself fighting React's scheduler on something that genuinely belongs in state.
- Solid 2.0 ships stable *and* you're at a natural rewrite point anyway.

Otherwise: this is a settled, low-stakes decision. The interesting problems are in §2, §3 and §4.

---

## 10. Sources

Versions and sizes verified 2026-07-25 against the npm registry (`registry.npmjs.org` dist-tags
and publish times) and by scaffolding + building each template locally with
`npm create vite@latest` (Vite 8.1.1). Repository health checked via the GitHub API.

**Current versions as of 2026-07-25**

| Package | Latest | Published | Notes |
|---|---|---|---|
| `vite` | **8.1.5** | 2026-07-16 | previous line 7.3.6 |
| `react` / `react-dom` | **19.2.8** | 2026-07-21 | repo is on 18.2 |
| `@vitejs/plugin-react` | **6.0.4** | — | Oxc-based; repo is on 4.x |
| `typescript` | **7.0.2** | 2026-07-08 | GitHub tags stop at 6.0.3 (2026-04-16); Vite scaffolds pin `~6.0.2` |
| `svelte` | **5.56.8** | 2026-07-24 | `@sveltejs/kit` 2.70.1 |
| `vue` | **3.5.40** | 2026-07-16 | 3.6.0-rc.2 (Vapor) in RC |
| `solid-js` | **1.9.14** | 2026-07-01 | 2.0.0-beta.25 as of 2026-07-23 |
| `astro` | **7.1.3** | — | healthy, wrong shape |
| `tailwindcss` | **4.3.3** | — | rejected |
| `@vanilla-extract/css` | **1.21.1** | — | rejected, revisit-able |
| `@playwright/test` | **1.62.0** | 2026-07-24 | pin exactly |
| `babel-plugin-react-compiler` | **1.0.0** | — | stable; lint rules in `eslint-plugin-react-hooks` 7.1.1 |

**Docs**

- Vite 8 announcement — <https://vite.dev/blog/announcing-vite8>
- Svelte transitions — <https://svelte.dev/docs/svelte/svelte-transition>
- Tailwind v4 `@theme` — <https://tailwindcss.com/docs/theme>
- MDN `StereoPannerNode` — <https://developer.mozilla.org/en-US/docs/Web/API/StereoPannerNode>
- MDN CSS `zoom` — <https://developer.mozilla.org/en-US/docs/Web/CSS/zoom>
- Playwright screenshots / `animations` option — <https://playwright.dev/docs/test-snapshots>
- microsoft/typescript-go — <https://github.com/microsoft/typescript-go>
- `Fraulk/Wii-Menu` (Vue prior art; **no license — do not copy code**) —
  <https://github.com/Fraulk/Wii-Menu>

**Internal**

- `context/decomp-findings.md` — §1 coordinate space, §2.2 hover state machine, §3.2 smoothstep,
  §5.1 random start frames, §6 drag, §8.3 hover frame counts, §11 sound table
- `context/components/page-navigation.md` — §4.5 drag dwell, §6 page transition
- `context/components/cursor.md` — cursor rotation and shadow panes
- `context/audio.md` — sound design overview
- `docs/methodology/visual-regression-tooling.md` — Playwright stack, determinism hazards
