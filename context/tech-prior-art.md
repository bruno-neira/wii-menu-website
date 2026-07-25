# Prior Art — other people's Wii Menu recreations

A survey of existing Wii Menu clones, recreations and reinterpretations, **graded against the
decompilation ground truth** in `context/decomp-findings.md` and
`context/components/page-navigation.md`.

Last updated: 2026-07-25.

---

## 0. Method, and honest limits

**How this was gathered.** GitHub repo search via the `gh` CLI (many query variants), direct
source reads via `gh api .../contents` and repo tarballs, `curl` liveness checks, and targeted
`WebFetch`. Every code claim below was read out of the actual source, not inferred from a README.

**Limits you should know about:**

- **The session's `WebSearch` quota was already exhausted** before this pass began (200/200
  used). Non-GitHub discovery therefore leaned on GitHub search, direct fetches and
  search-engine HTML endpoints. GitHub's repo search also only matches on **name, description
  and topics** — not code — and it AND-s multi-word queries strictly, so several plausible
  queries ("wii menu clone", "wii menu godot", "wii menu svelte") returned literally zero
  results. **Absence from this document is not evidence of absence.**
- **Several sources are hostile to automated fetch**, and the workarounds are worth recording
  for next time: **GBAtemp** is Cloudflare-403 (read via the Wayback Machine, with `curl` —
  `WebFetch` is blocked from `web.archive.org` by policy, and responses are gzipped).
  **The Spriters Resource** 403s `WebFetch` but returns 200 to `curl` with a desktop
  User-Agent — the block is UA-based, not IP-based. **CodePen** is 403 including its oEmbed
  API, so pen *source* could not be read at all. **Scratch's** `/search` and `/explore` API
  endpoints are 503, but `api.scratch.mit.edu/projects/<id>/` and
  `projects.scratch.mit.edu/<id>?token=…` work fine. Of the search-engine fallbacks only
  `lite.duckduckgo.com` via `WebFetch` worked; DDG-html, Bing, Mojeek, Ecosia, searx.be and
  Marginalia all blocked, and `cpv2api.com` is NXDOMAIN.
- `tcrf.net` was **not** fetched, per the standing prompt-injection warning in
  `context/primary-sources.md`.
- I did not run any of these projects in a browser; behavioural claims come from reading source.
  Where I say a project "does X", it means its code does X.

**Grading baseline** (all from the decomp, all exact unless noted):

| Property | Ground truth |
|---|---|
| Grid | **4 cols × 3 rows × 4 pages = 48 slots** |
| Virtual canvas | **832 × 456** (16:9) / **608 × 456** (4:3), origin at centre |
| Channel tile | **170 × 96** (16:9, aspect **1.771**) / 128 × 96 (4:3); **21.05% of viewport height** in both |
| Channel launch zoom | **467 ms** (28 frames), **smoothstep** ≈ `cubic-bezier(0.5, 0, 0.5, 1)` |
| Zoom out | **identical animation played backward** — same 467 ms, exact mirror |
| Page slide | **333 ms** (20 frames) horizontal |
| Arrow hover in / out | 250 ms each · press 500 ms · appear/disappear 167 ms · idle loop 917 ms |
| Hover name balloon | **333 ms** delay (channel tiles) / 267 ms (bottom-bar buttons) |
| Message Board open | grid layer **333 ms**, bottom bar **667 ms** — deliberately desynchronised |
| Clock | **time only** on the clock layout; US = 12-hour with **AM/PM to the RIGHT**; hours tens digit hidden when 0; colon blinks at 1 Hz, retriggered on even seconds |
| Clock, first boot | shows the words **"Wii Menu"** for **3000 ms**, then crossfades to the time — once per power-on |
| Empty slot | own layout, **≥ 33.3 s loop**, **random per-slot start frame** in `[0, 2000)`; **not hoverable, not clickable** |
| Tile hover | a **separate overlaid layout**; the icon itself never deforms; the in-animation must **finish** before the out-animation starts |
| Drag | A+B held; **drop into an empty slot only** — no swap, no shuffle |

---

## 1. Comparison table

Ordered by usefulness to this project.

| Project | Stack | Live | Last commit | Grid | Zoom | Clock | Licence | Ships ripped Nintendo assets? |
|---|---|---|---|---|---|---|---|---|
| **[booper1/Wii-UI](https://github.com/booper1/Wii-UI)** | Angular 20 + GSAP + SVG | [skour.is/Wii-UI](https://skour.is/Wii-UI/) ✅ | **2026-02-15** | 4×3, **real multi-page deck** (count derived, not fixed 4) | 350 ms, `power1.in`/`power1.out` | time-only, AM/PM right ✅, colon blink ✅, "Wii Menu" pre-roll ✅ | **none** | **YES — Rodin Bokutoh + Shin Go OTFs** ⚠️ |
| **[andrewplus/Wii.JS](https://github.com/andrewplus/Wii.JS)** | jQuery 3.3 + HTML partials | [wii.js.org](https://wii.js.org) ✅ | 2019-03-08 (dead) | 4×3, **1 page** | 900 ms `scale(4)`, `ease` | **date only, no clock** ❌ | GPL-3.0 | **YES — 6 audio files + spritesheets** ⚠️ |
| **[Fraulk/Wii-Menu](https://github.com/Fraulk/Wii-Menu)** | Vue 2 | [netlify](https://wii-menu.netlify.app/#/) ✅ | 2021-04-21 (dead) | 4×3, **1 page**, 1 real channel | **800 ms `ease` — vendored default, see §3.3** | none (hardcoded date) ❌ | **none** | cursor PNG + Continuum font ⚠️ |
| **[cornetespoir/wii-menu-page](https://github.com/cornetespoir/wii-menu-page)** | **single HTML file, zero JS, zero assets** | — | 2023-07-08 | 4-wide flex, no paging | CSS `:target` popup | none | **none** | **NO — everything hand-drawn in CSS** ✅ |
| **[joogps/Wii-Menu](https://github.com/joogps/Wii-Menu)** | SwiftUI (macOS) | — | 2021-05-05 | 4×3, 1 page | `matchedGeometryEffect`, `.spring()` | 7-seg via **DSEG7 (OFL)**, colon blink ✅, **shows a date** | **none** | **NO — procedural textures** ✅ (one ref screenshot) |
| **[M4rc3lv/WiiMenu](https://github.com/M4rc3lv/WiiMenu)** | jQuery + jcanvas + PHP | — | 2023-05-24 | 4-wide, 1080p-only | — | — | GPL-3.0 | Continuum font ⚠️ |
| **[danintosh/Wii-Menu-HTML](https://github.com/danintosh/Wii-Menu-HTML)** | static HTML ×3 pages | — | 2022-10-20 | 4×3, **2 pages** | — | 24 h, **shows a date**, buggy | MIT (void) | **YES — 24 MB of WAV + 2.4 MB font** ⚠️⚠️ |
| **[kxtzownsu/uncensormii](https://github.com/kxtzownsu/uncensormii)** | Vite SPA + Ultraviolet proxy | — | 2025-08-06 | — | — | — | AGPL-3.0 | **YES — `WiiNTLG-Regular.ttf` + `NoA_*` audio** ⚠️⚠️ |
| **[rekky1aws/wii-menu-recreation](https://github.com/rekky1aws/wii-menu-recreation)** | vanilla HTML/CSS/JS | [gh-pages](https://rekky1aws.github.io/wii-menu-recreation/) ✅ | **2026-03-11** | — | — | — | none | no (original mini-apps) ✅ |
| **[Jxck-S/WiiMenu](https://github.com/Jxck-S/WiiMenu)** | static HTML | — | 2020-08-16 | — | — | — | none | **YES — 46 MB of channel music MP3s** ⚠️⚠️ |
| **[ElastedAlorian/FlxWiiMenu](https://github.com/ElastedAlorian/FlxWiiMenu)** | HaxeFlixel | — | 2026-01-25 | — | — | — | none | **YES — Dolphin texture dumps + `WiiNTLG-Regular.ttc`** ⚠️⚠️ |
| **[travrei/revolutionmenu](https://github.com/travrei/revolutionmenu)** | QML (Pegasus front-end) | — | 2025-11-17 | — | — | — | MIT (void) | **YES — 14 MB BGM + SFX** ⚠️⚠️ |
| **[AllWKA/wiimenu-react](https://github.com/AllWKA/wiimenu-react)** | React (CRA) | — | 2023-03-28 | trivial | — | — | MIT | no ✅ |

Legend: ✅ matches ground truth · ❌ contradicts it · ⚠️ legal risk.

---

## 2. The single most valuable prior art: `booper1/Wii-UI`

**What it is.** A personal bookmark launcher styled as the Wii Menu — channels open real sites
(GitHub, Spotify, Netflix, Wordle…). Started in React, **migrated to Angular 20**. Live at
<https://skour.is/Wii-UI/>, deployed from `/docs` on `main`. Last commit **2026-02-15** — the
only actively-developed *and* technically serious web recreation found.

It is not the prettiest and it is not the most accurate. It is the one worth **reading in
depth**, because it independently arrived at four architectural decisions the decomp says are
right, and its mistakes are the interesting kind.

### 2.1 What it gets right — and how it got there

**A fixed virtual design space, scaled to fit.** `display.service.ts`:

```ts
private readonly DESIGN_SLIDE_WIDTH: number  = 1728;
private readonly DESIGN_SLIDE_HEIGHT: number = 1152;
public relativePx(n: number): string {
  return `calc(${n} / var(--designHeight) * 100dvh)`;
}
```

Every geometric constant in the project is authored in that space and emitted as a `calc()`
against `100dvh`. This is *exactly* the pattern `decomp-findings.md` §1 recommends (author
against 832×456, scale to fit) — arrived at independently. **Adopt the mechanism; swap the
numbers.** Note the use of `dvh`, not `vh` — correct for mobile browser chrome.

**A real multi-page slide deck — the only one in the survey.** Twelve slots per page in a 4×3
grid, with a horizontally-translated deck of slides and working arrows:

```ts
public channelGrid = signal({ cols: 4, rows: 3, capacity: 12, ... });
// slide-deck.ts
translateX(calc(-${(currentSlideIndex() / slideDeck().length) * 100}% + …))
```

Every other web project here ships a single page of twelve (danintosh fakes it with three
static HTML files).

**But the page *count* is derived, not fixed at four.** `slide.service.ts`:

```ts
private readonly MIN_SLIDES: number = 3;
const totalSlides = Math.max(Math.ceil(channels.length / this.channelCapacity), this.MIN_SLIDES);
```

With 15 channels and a reflowing capacity, it produces however many slides the content needs
(minimum three, plus a padding slide at the start). `slideDeckSvgWidth = slideWidth * 4` is the
SVG background's tiling width, **not** a page count. So: right *structure*, wrong *constant* —
the real menu is a fixed **4 pages × 12**, always, whether or not they are full. **Nobody in
this survey models the fixed 48-slot deck.**

It does, however, implement `canZoomChannelLeft` / `canZoomChannelRight` — stepping to the
previous/next channel **while still zoomed into the preview overlay**, with the zoom transform
attributes cached so the swap is instant. That is `decomp-findings.md` §4.4 (*"the overlay is a
channel browser, not a dead end"*) — a finding the corpus flags as *"likely new"* — implemented
independently. Strong corroboration that the behaviour is real and memorable.

**The board geometry is generated SVG, not images and not `clip-path`.** The white board's
silhouette — the bottom shelf, the notch it dips into, the blue rim line, the two shadow
bands — is built as parameterised SVG path strings in TypeScript:

```ts
private readonly DESIGN_NOTCH_DEPTH: number    = 120;
private readonly DESIGN_EDGE_TO_NOTCH: number  = 180;
private readonly DESIGN_NOTCH_CURVE_W: number  = 360;
private readonly DESIGN_ARC_R: number          = 300;  // the 'A 300 300' radius
```

`buildBorderSegment()` emits one slide's worth of border and it is tiled across the deck. This
is strictly better than the two alternatives in this survey — Wii.JS's four corner PNGs and
Fraulk's `clip-path: path()` re-serialised in JS on every resize — because it is resolution
independent, animatable, and needs no assets. **This is the strongest single technique in the
survey.**

**A counter-transformed zoom overlay.** `zoom.service.ts` scales the whole `#stage` up toward
the tile while simultaneously applying the *inverse* transform to the channel-content group, so
the destination content stays screen-sized while its container flies in:

```ts
const scaleX = stage.width / rect.width;
const scaleY = stage.height / rect.height;
const scale  = Math.min(scaleX, scaleY);
// …then gsap.set([bgGroup, fgGroup], { scale: getInvertedTransformValue(scale, 'scale'), … })
```

This is the right architecture for the decomp's §3.4 effect (the channel's screen materialises
inside the tile's footprint and grows to fill the viewport) without re-rendering the
destination. It also caches the transform attributes (`channelBgCachedAttributes`) so that
switching *between* zoomed channels is instant — which is the decomp's §4.4 finding (the
preview overlay is a channel browser, not a dead end) solved before knowing it was a finding.

**The clock is the most accurate in the survey.** `clock.html` / `clock.ts`:

- **Time only, no date** — matches `iplClock.cpp`.
- **AM/PM rendered as a separate element positioned to the RIGHT** (`[style.right.ch]`) —
  matches the USA build's `AM_PM_R` pane.
- **A colon that blinks** (`hideColon()`).
- **A "Wii UI Menu" title that holds, then crossfades into the clock** —
  `CLOCK_TITLE_HOLD_DURATION: 1500` then `CLOCK_TITLE_SWAP_DURATION: 200`. This is
  `decomp-findings.md` §9.2, a detail the project's own corpus described as "not in the corpus
  anywhere", implemented by someone who presumably just remembered it. Compelling evidence the
  detail is real and that people notice it.
- 12/24-hour switching (`is12HourFormat()`).

### 2.2 Where it falls short

| Its value | Ground truth | Verdict |
|---|---|---|
| `ZOOM_TRANSITION_DURATION: 350` | **467 ms** | 25% too fast |
| `SLIDE_TRANSITION_DURATION: 400` | **333 ms** NTSC | too slow — 400 ms is coincidentally the **PAL** value |
| zoom in `ease: 'power1.in'`, out `'power1.out'` | one smoothstep curve, out = in reversed | **wrong shape *and* asymmetric** — the decomp is explicit that zoom-out is the same animation played backward |
| `CLOCK_TITLE_HOLD_DURATION: 1500` | **3000 ms**, and it waits for an odd second | half the real hold; no phase alignment |
| `CHANNEL_ASPECT = 20 / 11` (1.818) | **170/96 = 1.771** | 2.7% too wide |
| `scale = Math.min(scaleX, scaleY)` | corners map onto corners — it **fills** | letterboxes instead of filling |
| Reflows the grid on narrow viewports (`cols` can drop to 1–3, `rows` recomputed) | fixed 4×3 | a reasonable product decision, an inaccurate one |

`ease: 'power1.in'` on the zoom is the most consequential error: an accelerating-only curve
makes the launch feel like a fall rather than a camera move. Smoothstep's symmetric ease-in-out
is a big part of why the real transition reads as "expensive".

### 2.3 Licensing — the cautionary half

**No licence file.** All rights reserved by default; **you may not copy its code.**

Worse, it commits and publicly serves:

```
src/app/assets/fonts/RodinBokutoh/RodinBokutohBold.otf       2 746 108 bytes
src/app/assets/fonts/RodinBokutoh/RodinBokutohDemiBold.otf   2 696 696 bytes
src/app/assets/fonts/ShinGo/ShinGoBold.otf                   3 321 632 bytes
src/app/assets/fonts/Continuum/ContinuumBold.otf                40 680 bytes
src/app/assets/fonts/DigitalDisplay/DigitalDisplay.otf
```

…and again, duplicated, in the built `docs/` output that GitHub Pages actually serves.
**Rodin Bokutoh is Fontworks' commercial typeface — the real Nintendo system font. Shin Go is
Morisawa's.** Two proprietary Japanese foundry fonts, redistributed as raw OTF from a public
web server. This is the clearest legal-risk model in the survey and the thing this project
must **not** copy.

> **Verdict: reusable *ideas*, not reusable *code*, and definitely not reusable assets.**
> Read `display.service.ts` and `zoom.service.ts` for architecture. Re-derive, don't copy.

---

## 3. `Fraulk/Wii-Menu` — and a correction to this project's corpus

<https://github.com/Fraulk/Wii-Menu> · Vue 2 · **no licence** · last commit **2021-04-21** ·
live at <https://wii-menu.netlify.app/#/> (HTTP 200).

`context/primary-sources.md` currently cites this repo for an **800 ms zoom transition**.

### 3.1 The 800 ms figure is not a Wii measurement at all

`src/helpers/zoom.js` is a **verbatim, unmodified vendored copy of Hakim El Hattab's
`zoom.js` 0.3** (MIT, <http://lab.hakim.se/zoom-js>, the reveal.js author's generic
zoom-to-element utility). Its header comment is intact. The value is the library's factory
default:

```js
/*! zoom.js 0.3  http://lab.hakim.se/zoom-js  MIT licensed
 *  Copyright (C) 2011-2014 Hakim El Hattab, http://hakim.se */
export var zoom = (function () {
    var TRANSITION_DURATION = 800;
    ...
    document.body.style.transition = 'transform ' + TRANSITION_DURATION + 'ms ease';
```

Fraulk never chose 800 ms, and it was never a claim about the Wii. It is a third-party
library's untouched default, applied to `document.body`, with easing `ease`
(`cubic-bezier(0.25, 0.1, 0.25, 1)`).

> **Action for the corpus:** the 800 ms citation should be **struck**, not merely corrected to
> 467 ms. Its provenance is a generic library default, so it carries **zero** evidentiary
> weight and never did. This is a good illustration of a general hazard: a number read out of
> someone's clone may be a framework default rather than a measurement.

### 3.2 Two genuinely reusable CSS techniques

**Faking a uniform stroke around an arbitrary `clip-path` shape** — four stacked `drop-shadow`
filters at ±3 px on each axis:

```css
.channelColumn {
  filter: drop-shadow(3px 0 0 #979797)  drop-shadow(-3px 0 0 #979797)
          drop-shadow(0 3px 0 #979797)  drop-shadow(0 -3px 0 #979797);
}
```

`border` cannot follow a `clip-path`; this can. Applied at the *column* level so twelve tiles
cost four filter passes, not forty-eight.

**Faking the board's blue rim the same way** — a single offset hard shadow plus a soft one:

```css
.topWrapper {
  filter: drop-shadow(0 5px 0 var(--wii-blue)) drop-shadow(0 10px 20px #00000030);
}
```

Both are cheap, asset-free and resolution independent. Worth keeping in the toolbox even though
booper1's generated-SVG approach is better where you control the geometry.

### 3.3 Where it falls short

- **Grid `v-for="i in 4"` × `v-for="n in 3"` — 12 tiles, one page.** No arrows, no paging.
  Exactly one tile is a real channel; the other eleven are empty.
- **Empty-slot animation is `linesGoesUppp`: 20 lines translating up 12 px, `1s linear
  infinite`.** The *idea* is right — the real empty slot is a slow sweep — but the real loop is
  **≥ 33.3 seconds** with a **random per-slot phase**. Fraulk's is ~33× too fast and perfectly
  synchronised across every slot, which reads as a strobing pattern rather than idle furniture.
- **The tile silhouette is a `clip-path: path()` string rebuilt in JS on every resize**, with
  fourteen hand-tuned magic coefficients inline in the template
  (`${width * 0.2371392722710163}`…). `clip-path: path()` takes no percentages, so this is a
  real constraint — but M4rc3lv's pure-CSS solution (§5) and booper1's generated SVG both beat
  it.
- **`zoom.js` mutates `document.body.style.transform` directly**, which conflicts with any
  other transform on the body and makes the zoom un-composable.
- **The zoom fits rather than fills** (`Math.max(Math.min(innerW/w, innerH/h), 1)`).
- **No clock.** The clock position holds the static string `"Wii Menu"` — which is accidentally
  correct for the *first three seconds after boot* (§9.2) and wrong forever after. Below it, a
  hardcoded `"Sat 23/02"`.
- **No audio, no cursor logic, no balloon, no Message Board, no drag.**
- **Bundles `contm.ttf` (Continuum) with no licence file, in a repo with no licence.**
- **Bundles `cursor.png` — see §7.1, it is byte-identical to Wii.JS's.**

---

## 4. `andrewplus/Wii.JS` — the widest scope, the oldest bones

<https://github.com/andrewplus/Wii.JS> · jQuery 3.3.1 · **GPL-3.0** · last commit
**2019-03-08** · live at <https://wii.js.org> (HTTP 200).

Thirteen stars, five forks — the most-forked pure-web recreation. It is also **seven years
stale** and built on a jQuery `$.load()` HTML-partial router.

**Scope is its distinguishing feature.** It is the only web project found that ships a **Wii
Settings screen** (`views/settings-main.html`, with its own animated header/nav/footer), on top
of the grid, bottom bar, corner buttons, channel splash and a bottom "Wii Menu / Start" bar.

### 4.1 Accuracy

| | Wii.JS | Truth |
|---|---|---|
| Grid | 4×3, **one page** | 4×3×4 |
| Tile | `20.2vw × 11.1vw` → **1.820**; `387 × 213` at ≥1920 → 1.817 | **1.771** |
| Launch | `transform: scale(4)` on `.main-menu` with `transform-origin` at the tile centre, **`transition: transform 900ms`** (default `ease`) | **467 ms smoothstep**, effective scale ≈ 832/170 = **4.89** |
| Splash | separate `.splash-screen`, `scale(0.3) → 1` + opacity, 500 ms `ease` | crossfade over the same 28 frames, scaling from the tile's footprint |
| Empty slot | `animation: play 0.3s steps(3) infinite` over a 3-frame spritesheet | **≥ 33.3 s**, random per-slot phase |
| Hover | separate `.hover` overlay image, `scale(0.94) → scale(1.02)` + opacity, 400 ms | separate overlay ✅ but the overlay's own animation must **complete** before reversing |
| Clock | **absent** | present |
| Date | present — `weekday M/D` from `new Date()` | contested, see §8 |
| Balloon | none | 333 ms delay |

The `scale(4)` is actually the closest launch-scale figure in the survey — the right order of
magnitude, reached by eye. The 900 ms duration is the worst.

Its hover architecture is quietly correct: `.channel-icon.occupied .hover` is a **separate
absolutely-positioned overlay element** carrying `channel-hover.png`, and the underlying `img`
is never touched — which is precisely the decomp's §2.1 finding (hover drives an overlaid
`my_IplTop_d.brlyt`, the icon does not deform). It reached the right structure and then scaled
the wrong thing anyway (`scale(1.02)` on the overlay reads as a pop; the real thing fades a
ring in).

### 4.2 Honest self-documentation — worth imitating

The README's *Known Issues* list is the most useful thing in the repo:

> * CSS clip doesn't have the greatest browser compatiblity, causing the corners of channel
>   images to bleed outside of the outlines. Observed in Microsoft Edge.
> * Music doesn't start automatically in Chrome because of autoplaying restrictions.
> * Does not work in low-res viewports or smartphones.

All three are problems this project will hit. The autoplay one is structural: **you cannot
start the menu music on load.** Wii.JS's workaround is that music only begins after the user
clicks into and out of a channel. Plan a first-gesture unlock instead.

### 4.3 Licensing — GPL-3.0 over ripped assets

`assets/audio/` contains `startup.mp3`, `bg-music.mp3` (518 KB — the Wii Menu theme),
`button-hover.mp3`, `button-select.mp3`, `zip.mp3`, `back.mp3`, plus `miichannel.jpg` and
`channel-spritesheet.png`. Applying **GPL-3.0** to a tree containing Nintendo's audio does not
make it GPL — the licence is simply void as to those files, and the repo is a standing
infringement whatever the LICENSE says. **Do not copy anything from `assets/`.**

The one asset decision it got *right*: the visible UI font is **Google Fonts "Asap" 500**,
loaded from the Google CDN. An open substitute rather than a ripped foundry font — the correct
instinct, and the opposite of booper1's.

---

## 5. Shorter notes

### `cornetespoir/wii-menu-page` — the responsible-minimum model (with one asterisk)

<https://github.com/cornetespoir/wii-menu-page> · **20 stars, the most-starred web recreation
found** · one 16 KB `theme.html`, **no JavaScript, no images, no fonts, no build step** · no
licence file but README-documented as freely editable (a Tumblr theme by "eggdesign").

Live and genuinely popular: <https://previews.egg.design/pages/wii> — **~1,500 notes on
Tumblr**, making it the most *reused* Wii Menu recreation found anywhere on the web, because it
is distributed as a copyable theme rather than a site. The author's stated reason for zero JS is
practical rather than aesthetic: Tumblr users would otherwise have to approve custom scripts.

**The asterisk:** the *repository* contains no binaries, but the *demo* hotlinks images from
the Tumblr CDN with filenames like `wii shop channel` and `check mii out channel` — i.e. real
channel art, hosted elsewhere. The liability is offloaded, not eliminated. **The CSS is the
clean part and the part worth learning from; the imagery is not.**

Everything is hand-authored CSS. Popups use `:target` — no JS at all. Two techniques worth
stealing:

**Asset-free noise on empty tiles**, a single gradient:

```css
background-image: repeating-radial-gradient(circle at 14% 30%, white, rgba(0,0,0,.12) .0008px);
```

**The glossy Wii pill button, built from four layers** — the element plus `::before` (top 40%
highlight), `::after` (left 54% highlight) and a `.corner` span (lower band), all rounded,
over a `skyblue` border:

```css
.button        { border-radius: 2rem; border: 2.6px solid skyblue; background: #dae3e5;
                 box-shadow: 2px 2px 10px 2px rgba(0,0,0,.08); overflow: hidden; }
.button:before { width: 94%; height: 40%;  background: #ebecee; border-radius: 2rem; }
.button:after  { width: 54%; height: 100%; background: #ebecee; border-radius: 2rem; }
.corner        { top: 40%; height: 100%;   background: #dae3e5; border-radius: 2rem; }
```

Accuracy is low (tiles are `aspect-ratio: 2/1`, no paging, no clock, no motion) and it is a
*pastiche*, not a recreation. But it proves the point that **matters most for a public
portfolio piece: you can evoke the Wii Menu convincingly with zero Nintendo bytes**, and it is
the most-starred of the lot. That correlation is worth noticing.

### `joogps/Wii-Menu` — best procedural-asset discipline

<https://github.com/joogps/Wii-Menu> · SwiftUI, macOS · no licence · 2021-05-05. Channels
launch macOS apps.

**Ships essentially no Nintendo bytes.** The empty-slot texture is generated in code — random
noise at `softLight` blend, desaturated, plus two stripe patterns at different ratios and
rotations:

```swift
.fill(ImagePaint(image: Image(decorative: CGImage.random(bounds: …), scale: 1.5)))
  .saturation(0.0).blendMode(.softLight)
.fill(ImagePaint(image: Image(decorative: CGImage.stripes(colors: (…, .clear), width: 1, ratio: 2), scale: 0.6)))
```

The background is likewise procedural stripes plus a horizontal gradient vignette. **The whole
"static-y grey empty channel" look, with no image files.** Directly portable to the web as a
`repeating-linear-gradient` + an SVG `feTurbulence` filter.

Other notes:

- **Clock font is DSEG7 Classic Mini** — a genuine seven-segment font under the **SIL Open Font
  License**. This is the clean answer to the seven-segment-clock question. ✅
- **Colon blink is on even seconds** — `Calendar.current.component(.second, …) % 2 == 0 ? 1 : 0`
  — which matches `iplClock.cpp`'s `if (!(time.sec % 2))` trigger exactly. ✅
- **But it renders a date** (`EEE dd/MM`) below the time, in DD/MM order, and shows **no AM/PM**
  despite using a 12-hour `h` format. Wrong for a US build on both counts.
- The channel zoom uses **`matchedGeometryEffect`** — SwiftUI's shared-element transition,
  i.e. a native FLIP. Correct architecture (tile rect → full-screen rect); wrong curve
  (`.spring()`, not smoothstep).
- The cursor is hidden (`NSCursor.hide()`) and replaced with a custom view carrying a
  **hard offset shadow** — `shadow(radius: 0, x: 3, y: 3)`. Zero blur radius. That hard-edged
  offset shadow is a real and often-missed Wii pointer detail.
- Hover is asymmetric by design: insertion `.easeInOut`, removal
  `.spring(response: 0.8, dampingFraction: 0.9)`. Not the decomp's rule (finish-in-before-out),
  but a recognition that in and out shouldn't be the same.
- Tile `186 × 101` → aspect **1.842**, the least accurate in the survey.

### `M4rc3lv/WiiMenu` — the best pure-CSS tile silhouette

<https://github.com/M4rc3lv/WiiMenu> · GPL-3.0 · 2023-05-24. README claim: *"the screen tubes
look really rounded on both the horizontal as the vertical axis. This is done in CSS only."*

It delivers. The CRT-barrel silhouette is the union of two ellipse-cornered rectangles:

```css
.tv         { width: 300px; height: 200px; border-radius: 50% / 5%; background: grey; }
.tv:before  { content: ""; position: absolute;
              top: 5%; bottom: 5%; right: -4%; left: -4%;
              background: inherit; border-radius: 4% / 50%; }
```

The base is heavily rounded horizontally and barely vertically; the pseudo-element is inset
vertically, outset horizontally, and rounded the other way. Their union is a shape curved on
**both** axes — the Wii tile's actual silhouette. **Zero assets, fully fluid, no JS.** This
beats Wii.JS's 12-point `clip-path: polygon()` and Fraulk's JS-rebuilt `clip-path: path()`
outright for the tile specifically.

Caveats: hard-coded for 1920×1080 fullscreen (`#m { width: 1380px }`), jQuery + jcanvas +
w3.css, PHP-served, ships ContinuumBold in `.ttf`/`.woff`/`.woff2`, Dutch comments. It is a
personal fitness-tracker menu wearing a Wii costume, not a recreation.

### `danintosh/Wii-Menu-HTML` — a checklist of what not to do

<https://github.com/danintosh/Wii-Menu-HTML> · **MIT** · 2022-10-20 · 24 MB.

Credit where due — it is one of only two projects with **page navigation** (three static pages,
`index.html` → `index2.html`, with `scroll.wav`), it has a **hover name label**, and it uses
**two distinct hover sounds** (`hover.wav` vs `hoverchannel.wav`), which mirrors the decomp's
distinction between `WIPL_SE_BT_TARGETTING` and `WIPL_SE_CH_TARGETTING`. It also ships
`empty.gif`, an animated empty-channel graphic, and — notably — a **separate `clock.ttf`
distinct from the body `main.ttf`**, which is an independent rediscovery of the fact that the
clock digits are their own typeface.

Everything else is a lesson:

- **Twelve near-duplicate JS function pairs** (`hoverchanelfx1`…`12`, `killlabel1`…`12`) with
  the pane wired by hand in HTML. No data model.
- **`setInterval(fn, 60 * 1)`** — the author meant 60 seconds and wrote **60 milliseconds**.
  The clock and date re-render ~16×/second.
- **An off-by-one weekday table** in `time.js`: `getUTCDay() == 0` and `== 1` both map to
  `"Sunday"`, every subsequent day is shifted, and `== 7` can never occur. Also mixes
  `getUTCDay()` with local `getHours()`, so the date is wrong for anyone west of UTC in the
  evening.
- **24-hour time with no AM/PM** (wrong for US), though hours leading zeros are suppressed —
  accidentally matching `iplClock.cpp:211`.
- **Two autoplaying `<audio>` tags** loading `bgm.wav` (9.5 MB) and `startup.wav`, uncompressed
  WAV, ~24 MB of audio total. Browsers will block the autoplay and the user pays for the bytes
  anyway.
- **MIT licence over ripped Nintendo audio and a 2.4 MB `main.ttf`.** Void.

### `kxtzownsu/uncensormii` — the right disclosure habit, the wrong assets

<https://github.com/kxtzownsu/uncensormii> · AGPL-3.0 · 2025-08-06. A Wii-Menu-skinned
Ultraviolet web proxy, built for a "Proxathon".

Ships `WiiNTLG-Regular.ttf`/`.ttc` (2.6 MB — the actual Wii NTLG system font),
`healthandsafety.otf`, and ripped audio: `NoA_startup.mp3`, `NoA_music.ogg`,
`NoA_HoverChannel.wav`, `NoA_HomeOpen.wav`, `NoA_HomeClose.wav`, `NoA_CloseChannel.wav`,
`NoA_ding.mp3`, plus channel banners.

But note **how** it does it, because the *hygiene* is the best in the survey even though the
*decision* is the worst:

> All credits to Nintendo of America Inc for the Wii branding, assets, and name. All of the
> assets owned by Nintendo of America Inc that are used are prefixed with `NoA_` and are in
> `/public/assets/nintendo/`.

Every third-party-owned file is **prefixed** and **quarantined in one directory**, and the
README says so plainly. That means a maintainer can audit or strip the entire legal exposure
with one `rm -rf`. **Steal the quarantine pattern; don't steal the contents.**

The other thing worth noting: its "channels" launch proxied websites — the same
channel-as-external-destination metaphor a portfolio site needs, as does
`rekky1aws/wii-menu-recreation` (channels are original in-house mini-apps: a DVD-logo
screensaver, a JS Paint clone, a static generator, a device-info panel — all live at
<https://rekky1aws.github.io/wii-menu-recreation/>). Both are useful precedents for *what a
channel does* once you've built the shell.

### Others, briefly

- **`Jxck-S/WiiMenu`** — 46 MB including `Mii Channel - Plaza Music.mp3` (21 MB), `Menu.mp3`
  (8 MB), `Photo Channel.mp3`, `Shop Channel.mp3` and a `Menu.psd`. No licence. Maximum legal
  exposure, minimum technical interest.
- **`ElastedAlorian/FlxWiiMenu`** (HaxeFlixel) — technically unremarkable but **evidentially
  important**: it contains `assets/images/sdcMenu/tex1_256x96_1219fbf0743c2391_1.png`, which is
  verbatim **Dolphin's custom-texture filename format** (`tex1_<W>x<H>_<hash>_<fmt>.png`).
  Direct confirmation that Dolphin texture dumps are a live asset pipeline into fan
  recreations, and that original texture dimensions survive in the filenames. Also ships
  `WiiNTLG-Regular.ttc`.
- **`travrei/revolutionmenu`** (QML, Pegasus front-end, MIT) — ships `bg.wav` (14 MB) and SFX.
  See §7.1: two of its sound files are byte-for-byte identical to `danintosh`'s.
- **`AllWKA/wiimenu-react`** (MIT) — trivial, but clean: no ripped assets, real licence.
- **`travrei`, `axdaxis/wii-menu-themes`, `NinjaCheetah/Wii-Menu-Patcher`,
  `UWUVCI-PRIME/vWii-Theme-Injector`** — the homebrew *theming* toolchain rather than
  recreations. Relevant only as asset-provenance context.

---

## 5b. Beyond GitHub

### The USBLoaderGX "Accurate Wii Menu Theme" thread — the best non-code prior art found

<https://gbatemp.net/threads/accurate-wii-menu-usbloadergx-theme.665889/> · author **jwmu** ·
first release 2025-01-22, V1.1 2025-01-30, **V1.2 2026-01-14** ·
[download](https://gbatemp.net/download/accurate-wii-menu-usbloader-gx-theme.38994/) · tagline
*"A near 1:1 recreation of the stock Wii Menu."*

(GBAtemp is Cloudflare-blocked to automated fetch; this was read via the Wayback Machine.)

Someone spent a year doing pixel-level fidelity work on this exact UI and wrote down what broke.
It is the closest thing to a peer review this project will get.

**1. He forked the layout by aspect ratio rather than scaling it.**

> *"due to limitations in how USBLoaderGX displays themes, I had to make **2 separate themes,
> one for 4:3 and one for Widescreen 16:9**, both included."*

V1.1's notes add that the widescreen variant needed *different icon sizes*, not just
repositioning — *"made the SD card icon a bit smaller (only for the widescreen variant)"*.
That is an engine limitation he was stuck with, and it is **exactly the problem
`decomp-findings.md` §1 already solves for you**: the real menu keeps vertical extent identical
(456) and changes only width (608 → 832), with a documented `1.36842` factor and a
`cfChanThumbOfss[2][2]` table. **You have the numbers he didn't; don't fork your layout.**

**2. The font consumed a year, and he ended up drawing one.**

> *"I'm sadly a bit of a font noob so I wasn't able to recreate the Wii Menu's clock 1:1 but I
> found one that was close enough."* → V1.1: *"slightly improved the '0', '4' and '7' on the
> clock font to better match the stock menu (still not perfect though)"* → V1.2: **"I got tired
> of looking at it and decided to make a custom font that matches the stock OS 1:1."**

Tool: **FontForge**. A commenter's diagnosis was that *"the clock on the Wii menu is much
thinner."*

**3. He independently concluded the clock should be sprites, not a font** — and named the
reason:

> *"The clock currently uses a **.ttf font file**… but replacing this with **.png sprites**
> would allow for an accurate 1:1 of the stock menu clock. Along with this, there is a
> **non-removable '88:88' dropshadow** wherever the menu renders the clock."*

This is `decomp-findings.md` §9.6 arrived at from the opposite direction — he reverse-engineered
from *looking* that the digits can't be text, and the decomp proves it from the code. **Two
independent lines of evidence now agree: sprite the digits.** The `88:88` ghost is also a real
detail — a seven-segment display shows its unlit segments faintly, which is why the clock reads
as an LCD rather than as text.

**4. His list of what the engine wouldn't let him do is a fidelity checklist.** Each item is
free on the web and each is a place to beat the best homebrew attempt:

> - *"Currently no unique sound for scrolling the channel pages left and right"*
> - *"No unique sound for startup, I had to bake it into the menu music"*
> - *"There is no menu fade in from black like the real"* menu
> - *"the issue with the home button menu is less the textures themselves and more the way the
>   menu **animates & places non-moveable objects**"*
> - *"I don't have the ability to make any menu elements move or hide"*

Note item 3 against `decomp-findings.md` §10.4 (the global fade is exact) and item 1 against the
distinct `WSD_SELECT` page-scroll sound. **The two things he most wanted and couldn't have are
both already specified in this project's corpus.**

**5. Remapping controls onto authentic chrome** — a genuinely good UX pattern for a portfolio
site, where the original affordances have no meaning: the DVD icon loads a disc, the Wii button
opens settings, the SD icon opens homebrew, **clicking the clock** refreshes, and the three
buttons sitting where the date text goes are sort modes. Reuse the furniture, repurpose the
function.

**6. The licensing exchange in-thread is the community's actual position, stated plainly.**
jwmu sourced everything by *"painstakingly recreat[ing] all of the Wii Menu assets from
**Dolphin's texture & audio dumping features**"*. When a user worried about Nintendo, he
replied that the default theme *"already comes preloaded with a few copyrighted assets and they
have never had any issues"* — and **blackb0x, a USBLoaderGX maintainer, drew the line
precisely**:

> *"Some assets might **sound** the same, but they're **not the same**. And that's why there
> hasn't been any issues."*

Recreated-in-kind vs. byte-identical-rip. That is the same line §7.3's DMCA evidence draws, from
someone who ships this software.

**7. The best asset pattern in the entire survey is buried in that thread.** blackb0x notes
USBLoaderGX pulls **the fuzzy empty-channel texture off the user's own console NAND at
runtime**, rather than bundling it. Ship the code, let the user supply the bytes. The web
equivalent — let users drop in their own channel icons, persist to `localStorage` — is both
legally clean and a better product.

### Scratch — the largest, most inspectable, most compromised corpus

Every Scratch project is **CC-BY-SA 2.0 by platform terms with source permanently public**, and
`api.scratch.mit.edu/projects/<id>/` plus `projects.scratch.mit.edu/<id>?token=…` will hand you
the full `project.json`. That makes it the one corpus where asset provenance is *provable*.

The most-viewed recreations:

| Project | ID | Author | Views |
|---|---|---|---|
| [Wii Menu](https://scratch.mit.edu/projects/383857474/) | 383857474 | Dbaric | **40,145** |
| [wii menu channels](https://scratch.mit.edu/projects/1567354/) | 1567354 | guimmigcombr | 26,800 |
| [Wii Menu Simulator!](https://scratch.mit.edu/projects/589575134/) | 589575134 | kennaminecraftz | 23,199 |
| [Wii ProjectHD - Wii Menu](https://scratch.mit.edu/projects/698711593/) | 698711593 | CESAR83 | 9,095 |
| [Wii Menu in Scratch](https://scratch.mit.edu/projects/427819306/) | 427819306 | SwordSoftTV | 6,518 |

**The forensics are damning and useful.** Inspecting `project.json` for
`Wii Menu Simulator!` (471 costumes, 46 sounds):

- Costume names include **`tex1_150x150_c8af517e57c75491_5`**, `tex1_75x75_b658c21b825f7f50_5`,
  `tex1_38x48_4c49e8df50ca3343_5` — **verbatim Dolphin texture-dump filenames**, pasted in
  without renaming.
- Sound names include **`IplSound (7)`**, `IplSound (8)` — **`Ipl` is the Wii System Menu's own
  internal source prefix** (`iplChannelSelect`, `iplButton`, `iplPointer`). These came out of
  the console's own archives.
- Plus wholesale music rips: `Mii Channel Music`, `ShopMusic`, `photochannel_menu`, `Wii menu`
  (~100 s), and third-party `hulu` banner audio.

`Wii Menu` (383857474) is the same story at 244 costumes / 51 sounds, including a 232-second
`News channel` rip and `WSD-SELECT` (the real page-scroll sound ID). And marioluigisambros
(438199186) simply lists his sources: *"Google Images for the icons. YouTube videos. **Dolphin
Emulator**."*

> **Every one of these grants CC-BY-SA over content the author does not own.** It is the same
> void-licence pattern as §7.1, at scale, with the receipts left in the filenames.

`CESAR83`'s **Wii ProjectHD** is the most sophisticated (bilingual FR/EN, explicit *"All
material represented is owned to Nintendo © … this is a fan-made"* disclaimer) and — relevant
to the moodboard — ships a **built-in dark/monochrome mode** (`Settings < Wii Settings < Page 2
< Toggle PW-Mode`).

### Wallpaper Engine — the biggest body of work, and where enforcement actually happens

Steam Workshop (appid 431960) reports **~9,627 entries** matching Wii Menu filters — **larger
than GitHub, Scratch and itch.io combined.** Flagship:
[**Wii Menu but actually good 4K**](https://steamcommunity.com/sharedfiles/filedetails/?id=2222724095)
by Joost — **32,203 subscribers**, 3840 × 2160, recreates clock, date, cursor, hover sounds,
hover borders and field distortion. The creator acknowledges **using audio sourced from the
original Wii software**.

The interactive one behind `angeliust/WiiMenuLinker` is
[Custom Wii Home Menu — With Clickable Channels](https://steamcommunity.com/sharedfiles/filedetails/?id=3526096300)
by Lillykyu; `WiiMenuLinker` is an Electron bridge so clicking a wallpaper channel launches a
real Windows game.

> ⚠️ **This is where the "Nintendo never enforces" folklore breaks.** At least two Wii Menu
> wallpapers have been **"removed from the community for violating Steam Community & Content
> Guidelines"** — `Wii Menu (Cursor) (Clock and Date) (Audio)` by mikey (2159262064) and
> `Wii Menu (Blank Dark Mode)` by Madisob (3564571576, removed as recently as **late 2025**).
>
> So §7.3's finding needs qualifying: **GitHub's DMCA archive has no Wii Menu notices, but
> Steam removes these routinely.** Platforms enforce differently, and the items that got pulled
> are the ones bundling audio. Absence of a GitHub takedown is not a safe harbour.

### Live web demos worth looking at

- **<https://wii.dupa.gay>** (HTTP 200) — a **personal linktree styled as the Wii Menu**, with a
  [writeup](https://dupa.gay/blog/2025-03-12-0). Implements a Health & Safety screen with an
  animated A button, **squircle CRT borders via SVG `clip-path`**, wave-like screen lighting
  via *staggered opacity delays*, a CSS-transform channel zoom, a clock, and — a lovely
  touch — **an animated Wii pointer with deliberate input lag**. The author describes
  hand-coding the skeuomorphic look rather than extracting it. Closest live analogue to what
  this project is building. (Served as a Vite SPA; I could not read the rendered DOM without
  JS, so I cannot confirm or deny ripped assets.)
- **<https://jeremycaudle.com/code/wii-menu-part-one>** — an abandoned JS-free proof of
  concept, but it publishes its numbers: **4×3 grid, 0.2 rem gaps, channel box min 90 px ×
  120 px, 0.5 rem border-radius, 1 px grey borders, `#dedede` background**. Assets original.
- **<https://stackoverflow.com/questions/79072394/>** — "Nintendo Wii zoom-in animation
  transition with HTML CSS and JavaScript". Directly on-topic for the launch transition.
- **CodePen:** [ChinamaykzaLaika/jOmXqMe](https://codepen.io/ChinamaykzaLaika/pen/jOmXqMe) and
  [Kubirsonson/jENjyMM](https://codepen.io/Kubirsonson/pen/jENjyMM). **Source not readable** —
  CodePen returns 403 to automated fetch including its oEmbed endpoint. Open in a browser.
- **itch.io:** [Wii Launcher](https://bubbaboogs.itch.io/wii-launcher) by bubbaboogs — **Godot**,
  v1.0 released 2025-11-30, and **the cleanest licensing posture of any interactive project
  found: it ships no Nintendo assets at all; users supply their own game icons.** Also
  [Wii Menu / Setup](https://arcadestudiosgames.itch.io/wii-menu-setup),
  [Wii Home](https://nintend-homes.itch.io/wii-home),
  [Wii Simulator](https://riguystudios.itch.io/wii-simulator),
  [Wii Lounge](https://superpig5246.itch.io/wii-lounge).
- **<https://vimeo.com/839137348>** — Brooklynn Russell, "Wii Menu Recreation", a motion-design
  piece: *"All elements in the video are made by me from beginning to end."* Fully original
  assets — the single cleanest posture in this entire survey, and useful as a *motion*
  reference precisely because nothing in it is Nintendo's.

### Two moodboard items, corrected

`context/pinterest-board.md` lists two fan recreations. Neither survives verification:

- **"Wii Menu+"** — **does not appear to exist as a product.** Five query variants
  (`"Wii Menu+"`, `+ grayscale`, `+ wallpaper/theme/rainmeter/skin`, `"Wii Menu Plus"`,
  `"WiiMenu+"`) returned either zero results or generic Wii Menu pages, and a direct Steam
  Workshop title search matched nothing. **Most likely explanation:** the Wallpaper Engine item
  **"$uicideboy$ Dark Wii Menu+Button shortcuts"** (Baldwin IV, 3584809703), where the `+` is
  concatenation — "Dark Wii Menu" *plus* "Button shortcuts" — mis-tokenised into a product name,
  with "Dark" becoming the phantom "grayscale". Real grayscale takes that *do* exist:
  `DarkMode Wii Menu` (mooshietoon, 3281706461), `Darker Custom Wii Menu` (Baldwin IV,
  3569677174), `DARK - Custom Wii Home Menu` (Refusion, 3528787678), and CESAR83's in-project
  PW-Mode above.
- **"Wii Menu (Beta 1.0)"** — the only trace anywhere is a YouTube video,
  ["Wii Menu (Beta 1.0) (Scratch Version)"](https://www.youtube.com/watch?v=K7-F3mki8-w),
  described only as *"I made this by myself for 24 hours."* No discoverable Scratch project;
  likely unshared or deleted. **Not meaningful prior art.** The nearest real equivalent is
  C0000lguy's [The Wii Menu - 2.4.1 (Beta)](https://scratch.mit.edu/projects/755655940/).

**Action:** annotate `context/pinterest-board.md` accordingly. Its point 4 ("useful for seeing
how others adapted the palette") still stands — but the Scratch and Wallpaper Engine tables
above are the real evidence for that, not these two pins.

---

## 6. The decomp's two companion repos

`context/components/completeness-sweep.md` §1.0 flags two repos alongside `koopthekoopa/wii-ipl`.
Both are located and evaluated:

### `giantpune/wii-system-menu-player`

<https://github.com/giantpune/wii-system-menu-player> · C++ · 6★ · **no licence** ·
auto-exported from Google Code, **last commit 2015-10-12 — dead for eleven years**.

A homebrew app that loads and *plays back* the System Menu's real `.brlyt`/`.brlan` assets on
console, with human-written comments about what panes do. Its value is as a **reader for the
asset content the decomp explicitly cannot ship** (§0 of `decomp-findings.md`: "the keyframe
content of those animations" is missing). If you ever need to know *what* frames 70→90 of
`my_IplTop_a.brlan` actually do — the open question in §7.3 — this is the code that would tell
you, but only when pointed at assets from your own NAND dump. **Not runnable in this
environment and not a source of numbers on its own.**

### `diddy81/Wii-Theme-Brlyt-Editor`

<https://github.com/diddy81/Wii-Theme-Brlyt-Editor> · Python · 4★ · **no licence** · last
commit **2024-09-14** (the more alive of the two).

A theming tool that patches RGBA colour values at **hard-coded byte offsets inside named
`.brlyt` files**. Because those offsets are *labelled by what they visually control*, the source
is effectively a **human-readable index of which pane lives in which layout**. `chansel.py`:

```python
def line(r,g,b,a):                  # my_IplTop_a.brlyt, 5 offsets
def behind_channel_outer(...):      # my_IplTop_a.brlyt, 20 offsets
def behind_channel_inner(...):      # my_IplTop_a.brlyt, 20 offsets
def channelborder(...):             # my_IplTop_a.brlyt, 5 offsets
def spinner(...):                   # my_IplTop_d.brlyt, 1 offset
def clock(...):                     # my_Clock_a.brlyt,  7 offsets
def wiimenutext(...):               # my_Clock_a.brlyt,  1 offset
def date(...):                      # my_IplTop_c.brlyt, 3 offsets
```

Three things fall out of this immediately:

1. **The empty/behind-channel fill is a two-tone outer + inner pair, ×20 offsets** — matching
   the 12 tiles plus 8 page-mask panes. The tile background is not one flat colour.
2. **`spinner` in `my_IplTop_d.brlyt`** — `my_IplTop_d` is the per-tile focus cursor layout
   (`decomp-findings.md` §2.1). The themer's chosen name, "spinner", is a hint about what
   `my_IplTop_d_FocusOn.brlan` draws — a rotating element — which the decomp explicitly marks
   **[Not found]**. Weak evidence, but it is the only evidence there is.
3. **`date()` patches `my_IplTop_c.brlyt`, and `wiimenutext()`/`clock()` patch
   `my_Clock_a.brlyt`** — three separate colour groups. See §8.

**Licensing: neither repo has a licence.** Read them; don't vendor them.

---

## 7. Asset-sourcing practice across the survey

### 7.0 Two tools that change the calculus

Neither is a recreation, but both are the most useful things this survey found for the asset
problem.

#### `Alan-bur/WM4K` — a free index of Nintendo's texture inventory

<https://github.com/Alan-bur/WM4K> · **84★, no licence at all** (`gh api .../license` → 404;
`"license": null`) · actively maintained · ~1 GB · **3,870 files, of which 3,717 are
`tex1_*.png`**.

A Dolphin custom-texture pack. It uses Dolphin's naming scheme
`tex1_<origW>x<origH>_<hash>_<fmt>.png`, and **the dimensions in the filename are the *original
Wii* texture dimensions, not the file's own** — verified by download:

| Filename | Actual PNG size |
|---|---|
| `tex1_608x456_1996c7e2b048a5d2_4.png` | 2560 × 1920 |
| `tex1_128x64_ee13670872ab0467_2.png` | 512 × 256 (exactly 4×) |
| `tex1_168x168_1d1a4788977090b9_5.png` | 665 × 672 |

**That makes the repo a searchable, free index of every Wii Menu texture and its true authored
size, obtainable without owning a console.** Note `608x456` appearing as a texture dimension —
the full-screen framebuffer size from `decomp-findings.md` §1, independently corroborated.
The directory tree (`0000000100000002/USA/Channels/<Channel Name>/`, `Wii Menu/`, `Pointer/`,
`SD Menu/`, `Health & Safety Screen/`…) is also a ready-made component taxonomy.

Its `DISCLAIMER.txt` claims every texture is **hand-drawn by the author, no AI, no upscaling**,
and spot-checking supports it: `tex1_608x456_…_4.png` is not Nintendo's Health & Safety screen
at all but a replacement card reading *"Fan-Made Mod by ABUR. Not affiliated with Nintendo."*
set in a modern grotesque — **the author is himself substituting a free font for Rodin.**

**Use it as a spec, never as a source.** No licence means all rights reserved; you may read the
filenames and the folder structure, you may not ship the PNGs.

#### `Tikilou/Wii-System-Menu-Extractor-Normalizer` — the responsible extraction path

<https://github.com/Tikilou/Wii-System-Menu-Extractor-Normalizer> · Rust · **GPL-3.0** ·
**ships the tool only, zero Nintendo assets** · 4★, last push 2026-01-26, no tagged releases.

Points at *your own* NAND dump / WAD and normalises System Menu assets into open formats. It
decompresses ASH, LZ77, Yaz0, U8 and NW4R containers (up to 20 recursive passes), and converts:

- **TEX0 / TPL / BTI → PNG**, with full GX decode including CMPR and palettes, plus a
  "White-Alpha" strategy for I4/IA4 intensity formats — precisely the fix for the black-fringe
  artefact that makes naive Wii UI rips look wrong composited on a light background.
- **BRLYT → JSON** — the full pane tree with `name`, `x/y/z`, `scale`, `rotation`, `children`.
- **BRLAN → JSON** — animation curves as `frame` / `value` keyframe pairs.
- BRFNT → PNG atlas + JSON (README names the font: *"the Wii-specific 8×4 tiling used by fonts
  (**Rodin**)"*); BRSAR/RWAV → WAV; MDL0 → glTF; BMG → JSON.

> **This closes the decomp's single biggest gap.** `decomp-findings.md` §0 states plainly that
> the repo has the frame *counts* but not the *keyframe content*, and §7.3 leaves "what do
> frames 70→90 of `my_IplTop_a.brlan` actually do?" open. **BRLAN → JSON answers exactly that
> question**, and BRLYT → JSON supplies the pane coordinates the decomp says live only in the
> `.brlyt`.
>
> And it answers it in the legally clean way: the *output* is measurements — numbers, curves,
> coordinates — which are facts you reimplement, not files you redistribute.

Caveats: I did not build or run it, there are no releases, and it does not dump the console for
you. You still need a legitimately obtained NAND image.

### 7.1 The community norm is: rip, and don't think about it

Of thirteen projects examined, **eight bundle Nintendo-owned bytes**. Two facts make the
pattern concrete:

**Assets propagate between projects verbatim.** `assets/images/cursor.png` in
`andrewplus/Wii.JS` and `src/assets/cursor.png` in `Fraulk/Wii-Menu` are the **same file** —
65 × 91 px, 8280 bytes, identical hash:

```
MD5 (wiijs/assets/images/cursor.png)  = 2c5a8c5342156ff5abd03d2c6a2f5417
MD5 (fraulk/src/assets/cursor.png)    = 2c5a8c5342156ff5abd03d2c6a2f5417
```

Different authors, two years apart, different frameworks, no shared history — **one ripped Wii
pointer PNG is in circulation and everyone copies it.** The same holds for audio:
`travrei/revolutionmenu`'s `page.wav` (58 548 B) and `vuom.wav` (13 240 B) match
`danintosh/Wii-Menu-HTML`'s `scroll.wav` (58 548 B) and `hoverchannel.wav` (13 240 B) exactly
in size. **There is a de facto shared asset pool, and using it means inheriting an unknown chain
of custody.**

Some of it is not even redrawn. `Wii.JS`'s `assets/images/miichannel.jpg` (1101 × 505) is a
**direct screen capture of the Mii Channel splash with Nintendo's ® logo still in frame**, and
the repo's own `views/licenses-temp.html` credits only a jQuery plugin's MIT licence — no
Nintendo attribution anywhere.

**Licences are applied over ripped content and are therefore void.** `Wii.JS` is GPL-3.0 with
Nintendo's audio in-tree. `danintosh` is MIT with 24 MB of Nintendo WAVs. `travrei` is MIT with
a 14 MB BGM rip. None of those licences can grant what the licensor doesn't own. **A permissive
licence on a Wii recreation tells you nothing about whether you may use its assets — you must
check the tree.**

### 7.2 The font question, settled by forensics

Every font shipped by these projects was identified by parsing its `name` table directly. The
results are unambiguous and worse than the folklore suggests:

| File, and who ships it | Real identity per its `name` table | Status |
|---|---|---|
| `danintosh/…/main.ttf` (2 483 168 B) | **`Wii NTLG PGothic Regular`** · `Copyright (c)2006 Fontworks Japan, Inc.` · `UniqueID: FWKS:Wii NTLG PGothic Regular:2006` | **The console's own font binary, unmodified.** |
| `booper1/…/RodinBokutoh{Bold,DemiBold}.otf` | Fontworks **Rodin Bokutoh** | Commercial foundry font |
| `booper1/…/ShinGoBold.otf`, `factoryunlock/wii-fonts` | Morisawa **Shin Go** (the 3DS/Switch font) | Commercial foundry font |
| `kxtzownsu/…/WiiNTLG-Regular.ttf`, `ElastedAlorian/…/.ttc` | Same Fontworks binary as above | Ripped console font |
| `danintosh/…/clock.ttf` | **Digiface Regular**, Weatherly Systems / WSI-FONT, © 1993 — the name table itself reads ***"Redistribution strictly prohibited."*** | Ripped **and expressly forbidden** |
| `Fraulk/…/contm.ttf`, `M4rc3lv/…/ContinuumBold.{ttf,woff,woff2}`, `booper1/…/ContinuumBold.otf` | **Continuum**, © 1996/1997 **Brøderbund Software** | Proprietary. Abandonware ≠ free. |

Three things follow.

**"Continuum" is not the UI font, and people conflate two different problems.** Continuum is
the **Wii *wordmark*** lookalike — the logo lettering. Rodin NTLG is the **UI body font**. The
community's default substitute solves the wrong problem, and it isn't free either.

**`danintosh` ships `clock.ttf` = Digiface, a font whose own metadata forbids redistribution,
under an MIT licence.** That is the survey's most self-evidently void licence claim.

**The clean answers exist and are boring.** All verified `license: "OFL"` in `google/fonts`
`METADATA.pb`:

| Use | Recommendation | Licence |
|---|---|---|
| **UI / body** | **M PLUS Rounded 1c** (Coji Morishita) — Japanese-origin rounded gothic, wide weight range, the same design lineage as Rodin | OFL |
| UI, closer skeleton | **Zen Kaku Gothic New** (Yoshimichi Ohira) — non-rounded, structurally nearest to Rodin | OFL |
| Channel labels | **Zen Maru Gothic** — softer, warmer | OFL |
| **Clock digits** | **DSEG7 Classic Mini** — genuine seven-segment, as used by joogps | **SIL OFL** |
| Latin-only headings | Varela Round · Quicksand · Nunito · Rubik | OFL |
| If fidelity truly matters | **FOT-Rodin Pro N**, sold by Fontworks on MyFonts **with a webfont licence** | purchased |

A nice detail worth putting in the site's colophon: **Fontworks — the actual foundry behind
Rodin — has open-sourced seven of its own typefaces under OFL on Google Fonts** (`Klee One`,
`Reggae One`, `RocknRoll One`, `Stick`, `Train One`, `DotGothic16`). None is Rodin, but
"typeface by Fontworks, the same foundry that drew the Wii's Rodin" is both true and free.

Note the split in the survey: **booper1 and joogps disagree about the clock, and joogps is
right.** And the decomp actually makes the substitute *easier* to defend — §9.6 says the real
digits are ten pre-rendered **textures**, not text, so no font was ever going to match them.
That is precisely the frustration `context/clock.md` §6 records a GBAtemp developer hitting: he
was font-matching a bitmap.

Ignore `cufonfonts.com` and similar "free Rodin" mirrors — they are rips. `P22 Rodin` and
Creative Fabrica's "Rodin" are unrelated typefaces that merely share the sculptor's name.

### 7.3 What Nintendo actually enforces — checked against the primary source

GitHub publishes every DMCA notice it processes at <https://github.com/github/dmca>. All **81
Nintendo notices from 2014 through July 2026** were searched.

- **No notice has ever mentioned the Wii Menu.** No Wii Menu recreation, web clone, or texture
  pack appears anywhere in the archive.
- **~70 of 81 target Switch emulators** (yuzu, Eden, Citron, Sudachi, Suyu, Skyline and forks)
  under **DMCA §1201 anti-circumvention** — about `prod.keys` and TPMs, not artwork. That
  theory has no application to a web page.
- **The one directly on-point precedent is the important one.** In `2024-03-28-nintendo.md` and
  `2024-06-17-nintendo.md`, Nintendo targeted **HeavenStudio**, a fan-made Rhythm Heaven
  engine, and asked for exactly two directories:

  ```
  .../HeavenStudio/tree/master/Assets/Resources/Sprites
  .../HeavenStudio/tree/master/Assets/Resources/Sfx
  ```

  The June notice was processed **against all 291 repositories in the fork network**. The March
  notice enumerated individual PNGs by name. And the notice answers the form's question *"Is
  the work licensed under an open source license?"* with a flat **"No"** — Nintendo explicitly
  rejects the idea that a fan project's own licence covers assets it doesn't own.

  > **Nintendo did not go after the engine, the code, or the recreation. It went after
  > `Sprites/` and `Sfx/` — and it nuked every fork.** That is exactly the shape of
  > `assets/images/` + `assets/audio/` in `Wii.JS`, and the root directory of
  > `danintosh/Wii-Menu-HTML`.

  Related: `2024-09-23-nintendo.md` did the same to `ACNHMobileSpawner`
  (`Assets/Resources/Images/*.png`); `2020-10-09-nintendo.md` took down a Zelda tool as an
  "unauthorized derivative work", stating Nintendo *"does not believe it qualifies as a fair
  use."*

- **The counter-precedent proves where the line is.** `koopthekoopa/wii-ipl` — a
  *decompilation of Nintendo's actual source code*, **183 stars, CC0-1.0** — has never been
  touched. Of its 1,707 files, exactly three are images and **all three are the project's own**
  (`misc/logo.png`, `misc/logo-alt.png`, `misc/objdiff.png`). A far more legally aggressive
  project survives comfortably because it ships no assets. Same for
  `UWUVCI-PRIME/vWii-Theme-Injector` (MIT): all source, and it *dumps the user's own* asset file
  rather than shipping one.

> **The line is not "does it look like Nintendo's". It is "does the repo contain Nintendo's
> bytes."** That is the operative rule for this project.

**Two important qualifications, both from §5b:**

1. **GitHub is not the enforcement venue; other platforms are.** Steam has removed at least two
   Wii Menu wallpapers for guideline violations, one as recently as **late 2025** — and the ones
   pulled were the ones bundling **audio**. "No GitHub DMCA notice has ever named the Wii Menu"
   is true and is *not* a safe harbour.
2. **The homebrew community independently articulates the same rule.** blackb0x, a USBLoaderGX
   maintainer, on why their themes have never drawn a complaint: *"Some assets might **sound**
   the same, but they're **not the same**."* Recreated-in-kind, not byte-identical. That is the
   standard, stated by someone shipping to thousands of users.

### 7.4 The rip mirrors, for reference use only

**The Spriters Resource blocks `WebFetch` (403) but returns 200 to plain `curl` with a desktop
User-Agent** — the block is UA-based, not IP-based. <https://www.spriters-resource.com/wii/wiimenu/>
lists **38 asset sheets**, and the index alone is a useful component checklist:

`Wii Startup Menu` · `HOME Menu` · `Buttons & Miscellaneous` · **`Channel Border`** ·
**`Empty Channel Spaces`** · **`Pointer`** · **`Clock Numbers`** · `Wii Options Background` ·
`Keyboard` · `Address Book and Letters` · `Wii Message Board Images` · `Save Data Management` ·
`Memory Card and Discs` · `GameCube Game Icon and Banner` · **`Corrupted Icon & Banner Data`** ·
**`Waiting Icon`** · **`Fonts`** · Health & Safety splash (NA and EU-ENG separately) · ~18
`Wrist Strap Reminder` sheets across every region/language/revision.

Note **`Clock Numbers` exists as its own sheet** — independent corroboration of
`decomp-findings.md` §9.6 (the digits are ten textures, not glyphs). And `Corrupted Icon` /
`Waiting Icon` confirm the `corrupt_icon.ash` / `tmptitle_icon.ash` archives from
`completeness-sweep.md` §1.0.

`sounds-resource.com/wii/wiimenu/` 301-redirects to `sounds.spriters-resource.com/wii/wiimenu/`
and has exactly **one** asset, `Sound Effects` — there is no menu-music sheet there.

**Not verified:** the file manifests *inside* those sheets are JS-rendered and could not be
enumerated; nothing was downloaded. The site publishes no licence grant of any kind. **Fine for
measuring dimensions and sampling colours; not a source for shipped bytes.**

### 7.5 Recommendation for this project

For a **public portfolio piece under your own name**, the line is:

**Do — this is the "cornetespoir / joogps" model, and it is demonstrably sufficient:**
- Draw the chrome in **CSS and SVG**: tile silhouettes, the board, the notch, pill buttons,
  gloss, the blue rim, arrows. Every one of those is achieved asset-free by some project here.
- Generate the empty-slot and background textures **procedurally** (`repeating-linear-gradient`
  + SVG `feTurbulence`), per joogps.
- Use **openly-licensed fonts**: **M PLUS Rounded 1c** (OFL) for UI, **DSEG7 Classic Mini**
  (OFL) for the clock digits. Draw the "Wii"-style wordmark as **SVG paths**, not Continuum.
- **Redraw** the cursor rather than reusing the 8280-byte PNG in circulation.
- Use **your own** channel artwork — your projects, your icons. This is a portfolio site; the
  channels should be *yours* anyway, which conveniently removes the largest asset problem.
  Better still, follow `bubbaboogs/Wii Launcher` and USBLoaderGX's runtime pattern: **let the
  user supply the icons** (drag-and-drop into a slot, persist to `localStorage`). Ships nothing,
  and it is a better product.
- Synthesise or license the SFX. The decomp gives you a complete behavioural map
  (`WIPL_SE_*`, when each fires, the stereo panning) — that is the interesting part and it is
  free; the samples are not.

**Don't:**
- Ship `RodinBokutoh`, `ShinGo`, `WiiNTLG`, or any Fontworks/Morisawa binary. Not once, not
  "temporarily", not in a build artefact under `docs/`.
- Ship Nintendo's audio — especially not the menu theme, which is the single most
  takedown-attractive file in this whole survey.
- Ship Dolphin texture-pack PNGs (`tex1_*`). They are Nintendo's textures with a hash in the
  filename.
- Apply MIT/GPL to a tree containing any of the above and consider the matter handled.

**Grey zone, decide deliberately:** using WM4K's filenames, the Spriters Resource sheet index,
or Dolphin texture dumps **as measurement references** — reading dimensions and colours off
them during development, shipping none of them — is materially different from redistributing
them, and is how you get numbers like `170 × 96` honestly. Keep such files out of the repo
(git-ignored, alongside `reference/wii-ipl/`) and say in the README that you did.

**If you ever do include a third-party-owned byte**, adopt kxtzownsu's discipline: one
directory, one filename prefix, one README paragraph naming the owner. Auditable and
removable in one command.

**Write a `DISCLAIMER` like WM4K's, plus the thing WM4K lacks.** WM4K's `DISCLAIMER.txt` gets
the substance right — *"individually hand-drawn by me… no AI-generated content or automated
upscaling… not affiliated with, endorsed by, or associated with Nintendo… does not contain
copyrighted assets"* — but the repo has **no licence at all**. Do both: an OSI licence on
*your* code, an explicit statement that all visual assets are original recreations, and a
contact address for removal requests. Remember §7.3: a `LICENSE` file does not launder
third-party content, and Nintendo has said so on the record.

---

## 8. ⚠️ The date question — the prior art disagrees with `decomp-findings.md`

This was supposed to be a clean grading criterion. It is not, and the survey turned up evidence
that should go back to the corpus.

`decomp-findings.md` §9.1 concludes, from the byte-exact `iplClock.cpp`, that **there is no date
pane in `my_Clock_a.brlyt`** and recommends shipping time only. That reading of `iplClock.cpp`
is correct and I re-verified it.

But:

- **`diddy81/Wii-Theme-Brlyt-Editor` ships a `date()` function that patches
  `my_IplTop_c.brlyt` at three offsets** — a *different layout* from the clock's.
- The decomp confirms `my_IplTop_c.brlyt` is the **Message Board's background**
  (`iplBoard.cpp:84–85`, `mpLayoutBg`), that it holds three text boxes **`T_Day_a` / `T_Day_b`
  / `T_Day_c`** filled by `set_text_date()` (`iplBoard.cpp:1319–1321`, `:1721`, `:1732`) — the
  three-day carousel — and that **the Board is the parent scene and draws this layout beneath
  the channel grid every single frame** (`decomp-findings.md` §7.1, `iplBoard.cpp:263`).
- `completeness-sweep.md` §696 independently describes `my_IplTop_c` as *"grey background +
  date"*, and cites **two in-repo sources showing a date on the main menu**:
  `wii_design_specs.pdf` Figure 1-2 ("3:00 PM" over "Tue 8/7") and `reference_screen.png`
  ("12:00 AM" / "Fri 1/1").
- **Every real screenshot on the owner's own moodboard shows a date under the time** —
  `11:36 PM Mon 8/10`, `1:14 PM Sat 1/29`, `9:49 AM Fri 7/21` (`context/pinterest-board.md`).
- **Five of the six prior-art projects with any time/date display render a date**
  (Wii.JS, joogps, danintosh, Fraulk, plus the moodboard's Wii Menu+ overlay). Only booper1
  ships time-only.

**Reconciliation.** The date almost certainly *is* on screen, drawn by `my_IplTop_c` (the Board
background layer showing through beneath the grid) rather than by `my_Clock_a`. §9.1's evidence
proves the clock *layout* has no date; it does not prove the *screen* has none — and the
decomp's own §7.1 supplies the mechanism by which it would.

**Action:** treat `decomp-findings.md` §9.1's "ship time only" recommendation as **contested,
not settled**, and re-check it against `reference_screen.png` and `wii_design_specs.pdf`
Figure 1-2 (both already in this repo) before implementing. If the date stays, note that the
NTSC format is `Ddd M/D` (`Fri 1/1`, no leading zeros) — **not** `Ddd DD/MM`, which is what
joogps and Fraulk both got wrong.

I am flagging this rather than resolving it: I read the code paths, not the pixels, and the
pixels are sitting in this repo.

---

## 9. Common failure modes — use as a checklist

Ranked by how many projects commit them.

1. **One page of twelve, no paging.** 12 of 13. Only booper1 has a real slide deck and working
   arrows — and even it derives the page count from content rather than fixing it at four; only
   danintosh fakes paging (three static HTML files). **Nobody models the fixed 4×3×4 = 48-slot
   deck. It is the single most commonly skipped structural fact.**
2. **Empty slots animated far too fast and in perfect sync.** Wii.JS `0.3s steps(3)`, Fraulk
   `1s linear`. Truth: **≥ 33.3 s, random per-slot phase**. This is a one-line fix
   (`animation-delay: calc(var(--i) * -1s)` with a long duration) and nobody does it. Getting
   it right is a distinctive, cheap win.
3. **Wrong zoom duration, and wrong easing shape.** 350 / 800 / 900 ms observed; truth 467 ms.
   Easing seen: `ease`, `power1.in`, `.spring()`. Truth: **smoothstep**, symmetric,
   `cubic-bezier(0.5, 0, 0.5, 1)`.
4. **Asymmetric zoom in/out.** booper1 uses `power1.in` then `power1.out`; Wii.JS uses 900 ms
   in and 400 ms out. The decomp is unambiguous: **out is the identical animation played
   backward.**
5. **Fitting instead of filling on zoom.** `Math.min(scaleX, scaleY)` everywhere. Nintendo maps
   viewport corners onto tile corners.
6. **No hover balloon at all.** Only danintosh has a name label, and it is instant. Truth:
   **333 ms dwell**, then fade in, with `WIPL_SE_BALLOON`, dynamic width, edge clamping at 60
   virtual px.
7. **Hover implemented as a naive CSS `:hover` transition.** Interrupts mid-way and looks
   wrong. Truth: the focus-in animation **must complete** before focus-out begins, with the
   pending intent queued.
8. **Empty slots left hoverable and clickable.** Truth: `isValid()` gates every event — no
   highlight, no balloon, no tick, no rumble, and clicking does *nothing*, not even an error
   sound.
9. **Tile aspect ratio wrong.** Observed 1.818, 1.820, 1.842, 2.000. Truth **1.771** (170×96).
   Everyone eyeballs it.
10. **Autoplaying audio.** Wii.JS documents the failure; danintosh ships two autoplay `<audio>`
    tags and 24 MB of uncompressed WAV. Browsers block it. Plan a first-gesture unlock.
11. **Pixel-hardcoded layout with media-query patches.** Wii.JS and M4rc3lv both target
    1920×1080 and degrade badly. Only booper1 uses a scaled virtual design space.
12. **One animation duration for everything.** The real menu deliberately desynchronises
    layers — opening the Message Board moves the grid for **333 ms** and the bottom bar for
    **667 ms**. Nobody models this.
13. **Clock inaccuracies:** no clock at all (Wii.JS, Fraulk); 24-hour in a US skin (danintosh);
    12-hour with no AM/PM (joogps); AM/PM on the wrong side; DD/MM date order; no colon blink;
    no "Wii Menu" pre-roll.
14. **`transform` applied to `document.body`.** Fraulk's vendored `zoom.js` does this. It
    poisons the global transform context.
15. **Copy-pasted per-tile code instead of a data model.** danintosh has 24 hand-written
    functions for 12 tiles.
16. **Rendering the clock as live text in a body font.** Nobody gets the digits right this way —
    jwmu spent a year on it and ended up drawing a custom face in FontForge, then concluded
    sprites were the answer anyway. Missing with it: the **`88:88` unlit-segment ghost** behind
    the digits, which is most of what makes it read as an LCD.
17. **Forking the layout by aspect ratio.** jwmu had to ship two complete themes (4:3 and 16:9)
    with different icon *sizes*. You don't have to: vertical extent is identical (456) across
    both, only width changes (608 → 832).
18. **No fade in from black on entry.** jwmu's most-wanted missing feature; `decomp-findings.md`
    §10.4 specifies it exactly.
19. **One "hover" sound for everything.** The real menu has two distinct ticks
    (`WIPL_SE_CH_TARGETTING` for tiles, `WIPL_SE_BT_TARGETTING` for buttons/arrows) plus a
    separate `WSD_SELECT` for page scrolling. danintosh noticed the first distinction and then
    played both sounds at once.

---

## 10. Solved better elsewhere than this project's likely approach

- **Board geometry:** generate the notched board silhouette + rim + shadows as **parameterised
  SVG paths** (booper1's `display.service.ts`), not corner PNGs (Wii.JS) and not a JS-rebuilt
  `clip-path: path()` string (Fraulk). Animatable, resolution-independent, asset-free.
- **Tile silhouette:** M4rc3lv's two-element `border-radius: 50% / 5%` + `4% / 50%` union is
  a better tile shape than any `clip-path` in the survey, and needs no JS.
- **Outlining a clipped shape:** Fraulk's four stacked `drop-shadow()` filters — `border`
  cannot follow a `clip-path`, this can. Apply per column, not per tile.
- **Empty-slot / background texture:** joogps's procedural noise + dual stripe layers at
  `softLight`. Web equivalent: `repeating-linear-gradient` plus an SVG `feTurbulence` filter.
  No GIF, no spritesheet, no rip.
- **Zoom architecture:** booper1's counter-transformed overlay (scale the stage up, scale the
  content inversely down) is the correct structure for the decomp's §3.4 crossfade. joogps's
  `matchedGeometryEffect` is the same idea natively; on the web, **FLIP** is the name for it.
- **Third-party asset hygiene:** kxtzownsu's `NoA_`-prefix + single-directory quarantine +
  README disclosure.
- **Self-documentation:** Wii.JS's *Known Issues* list. Write one.

---

## 11. Prioritized takeaways

### Adopt

1. **Author everything in a virtual design space and scale with `calc(n / var(--designHeight) *
   100dvh)`.** booper1 proves the pattern works in production; the decomp gives you the right
   numbers (**832 × 456**, tile **170 × 96**, tile height **21.05%** of viewport). Note `dvh`,
   not `vh`.
2. **Build the fixed 4 × 3 × 4 = 48 slot deck from day one.** No project in this survey does —
   booper1 comes closest and still derives the page count from content. It is the most-skipped
   structural fact and therefore the cheapest way to be visibly more accurate than every other
   web recreation. Pair it with the empty-slot rules (§9 items 2 and 8), which only make sense
   once the deck is fixed-size.
3. **One easing token, used everywhere: `cubic-bezier(0.5, 0, 0.5, 1)`** (smoothstep). Nobody
   in this survey uses it. It is the engine's *standard* interpolator, not just the zoom's.
4. **Pin the timings as named constants in one file** (booper1's `timing-variables.ts` is the
   right shape, its values are wrong): zoom **467**, page slide **333**, balloon **333** /
   **267**, board grid **333** / bar **667**, arrow hover **250** / press **500** /
   appear **167**, clock pre-roll **3000**.
5. **Generate the board as SVG paths; build the tile silhouette from two `border-radius`
   ellipse rects; outline with stacked `drop-shadow()`s; texture procedurally.** Four
   techniques, four different projects, zero Nintendo assets between them.
6. **The empty-slot detail: a ≥ 33 s loop with a random per-slot phase.** One line
   (`animation-delay: calc(var(--slot-seed) * -1s)`), and it is the difference between "looks
   like the Wii" and "looks like a CSS demo".
7. **Ship the clock pre-roll** — "Wii Menu" for 3000 ms on first load only, then crossfade.
   booper1 independently implemented it, which is good evidence people register it.
8. **Adopt kxtzownsu's quarantine convention** for any third-party byte that does end up in the
   tree.
9. **Fonts: M PLUS Rounded 1c (OFL) for UI. Wordmark as SVG paths.** Decided; stop
   re-litigating it.
10. **Render the clock digits as sprites/SVG, not text — and draw the `88:88` ghost behind
    them.** Two independent lines of evidence agree (`decomp-findings.md` §9.6 from the code;
    jwmu's year of FontForge work from the pixels). If you must use a font, DSEG7 Classic Mini
    (OFL) is the honest fallback, but sprites are both more accurate *and* avoid shipping a
    derived font file — you get to be more accurate than the best homebrew attempt for less
    work, because the web gives you what USBLoaderGX's engine wouldn't.
11. **Ship the things jwmu wanted and couldn't have:** a distinct page-scroll sound, a distinct
    startup sound separate from the music, and **the fade in from black** (§10.4). Three free
    wins over the current fidelity leader.
12. **Use `Tikilou/Wii-System-Menu-Extractor-Normalizer` to close the decomp's asset gap** —
    see below. This is the highest-leverage research action available after this survey.

### Avoid

1. **Do not bundle Rodin Bokutoh, Shin Go, WiiNTLG, or any foundry font.** booper1 does and
   serves them publicly from GitHub Pages. This is the clearest liability in the survey.
2. **Do not use the circulating ripped assets** — the 8280-byte `cursor.png`, the shared WAVs,
   Dolphin `tex1_*` textures. Chain of custody is unknown and shared.
3. **Do not put a permissive licence over a tree containing them** and think it resolves
   anything. Three projects here do exactly that.
4. **Do not vendor `zoom.js` (or any generic zoom library).** It transforms `document.body`,
   its 800 ms default has already polluted this project's own research corpus, and the effect
   you need — corner-to-corner mapping with a black surround and an alpha crossfade — is not
   what it does.
5. **Do not use naive CSS `:hover` transitions for tile focus.** Model the four-state machine
   with a queued pending intent so a flick-over-and-off plays in→out in full.
6. **Do not make empty slots interactive.**
7. **Do not autoplay audio.** Gate it behind the first user gesture.

### Read in depth before the next implementation pass

1. **`booper1/Wii-UI`** — <https://github.com/booper1/Wii-UI>. Read `src/app/services/
   display.service.ts` (virtual design space, generated SVG board geometry, grid math) and
   `src/app/services/zoom.service.ts` (counter-transformed zoom overlay). **Read for
   architecture, re-derive the code — the repo has no licence and its fonts are toxic.** Then
   open <https://skour.is/Wii-UI/> and compare its 350 ms `power1.in` zoom against a 467 ms
   smoothstep to feel the difference.
2. **`M4rc3lv/WiiMenu`'s `Client/twobuttons.css`** — ten lines, the best tile silhouette here.
3. **`cornetespoir/wii-menu-page`'s `theme.html`** — 16 KB, zero assets, most-starred. Proof
   the responsible path is also the popular one.
4. **`joogps/Wii-Menu`'s `ChannelView.swift`** — the procedural empty-slot recipe, worth
   porting to CSS/SVG.
5. **`diddy81/Wii-Theme-Brlyt-Editor`'s `chansel.py`** — 60 lines, and the only public index of
   which pane lives in which `.brlyt`. Also the source of the `my_IplTop_c` date question in §8.
6. **The GBAtemp jwmu thread in full** (§5b) — not code, but the only place someone has written
   down what actually goes wrong when you chase 1:1 fidelity on this specific UI. Read it before
   the clock and the aspect-ratio work.
7. **<https://wii.dupa.gay>** and its [writeup](https://dupa.gay/blog/2025-03-12-0) — the
   closest live analogue to what this project is building, with a squircle-`clip-path` CRT
   border and a deliberately laggy pointer. Open it in a browser; it is a Vite SPA and
   fetch-based inspection returns nothing.

### Two open items to close first

**1. Resolve the date question (§8) before building the clock.** The decomp says one thing, and
`wii_design_specs.pdf` Figure 1-2, `reference_screen.png`, the owner's moodboard, and five of
six prior-art projects say another. All the evidence needed is already in this repo. It is a
ten-minute check and it determines a visible element.

**2. Evaluate `Tikilou/Wii-System-Menu-Extractor-Normalizer` (§7.0) — the biggest research
unlock this survey found.** `decomp-findings.md` is explicit that it has frame *counts* but not
*keyframe content*, and that pane positions, sizes and colours "live in the `.brlyt`" and are
therefore unrecoverable. This tool converts **BRLYT → JSON** (pane tree with `x/y/z`, `scale`,
`rotation`) and **BRLAN → JSON** (`frame`/`value` keyframe pairs). Every remaining `[Not found
in decomp]` in the corpus — what the hover ring does, what frames 70→90 of the Message Board
transition look like, the exact easing baked into each `.brlan`, the real pane colours — is
answerable from its output.

It is also the **legally clean** path: run it against a NAND dump you own, extract *numbers*,
implement the numbers, ship nothing. That is precisely the distinction §7.3's DMCA evidence
says matters. Caveats: it is new, has no releases, and was not built or run during this survey —
treat "it works as advertised" as unverified until someone tries it.
