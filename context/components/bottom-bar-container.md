# Component deep-dive: Bottom Bar **Container**

Scope: the bar's own **shape, chrome, fill, accent line, height, opacity, and behavior** — the
"shelf" that the Wii button, SD Card icon, Message Board button and clock/date sit *on*. The
buttons and the clock/date themselves have their own dedicated docs; they appear here only where
their geometry is load-bearing for the container's geometry (and it turns out to be, decisively —
see §1.4).

Follows up on item **6** of `context/component-inventory.md` ("Bottom bar container"), which rated
the bar's *contents* well covered (`system-ui.md` §1) but its *construction as a shape* as
"scattered thinly across `visual-design.md` §3 and §5 rather than centrally documented."

Sourcing tags: **[Official]** Nintendo-authored. **[Fan/community]** wikis, forums, fan
reverse-engineering. **[Measured]** derived by me this pass from direct pixel analysis of
`reference_screen.png` at the repo root (420 × 236 px, exactly 16:9). **[Inferred]** reasoned
conclusion, flagged as such.

---

## 0. Source situation — read this before trusting anything below

### 0.1 Nintendo has never described this component

The **Wii Operations Manual — Channels and Settings** (Internet Archive item
[`wii-opmanual-chset`](https://archive.org/details/wii-opmanual-chset), OCR text at
[`WiiRVKChEng_djvu.txt`](https://archive.org/stream/wii-opmanual-chset/WiiRVKChEng_djvu.txt)) was
fetched directly this pass. Its annotated Wii Menu screen diagram has exactly six callouts, in
order: **Current Time, Wii Settings and Data Management, SD Card Menu, Wii Channels, Current Date,
Wii Message Board**. **[Official]**

Every one of those is a *thing sitting on the bar*. **Nintendo never labels, names, or describes
the bar itself.** There is no official term for it — not "bottom bar," not "shelf," not "wave."
The manual's prose about this screen is entirely functional ("Open the Wii Message Board... Blinks
when you have received a message"; "The Wii Menu can have up to 48 Channels at one time"). It says
nothing about the bar's shape, height, color, curvature, or the cyan line.

**Consequence: essentially every claim in this document is [Measured] or [Fan/community], not
[Official].** That is not a research failure; the primary source genuinely does not cover it. This
also confirms `component-inventory.md` item 6's read of the Ops Manual.

### 0.2 New primary-grade source found this pass: the Wii Menu decompilation

[`koopthekoopa/wii-ipl`](https://github.com/koopthekoopa/wii-ipl) — "Wii Menu Decompilation brought
to you by fans," an active matching decompilation of the real System Menu binary (configs for
**43E / 43J / 43K / 43U** — i.e. System Menu **4.3**, US/JP/KR/EU). **[Fan/community, but
reverse-engineered from Nintendo's own shipped code — the strongest non-Nintendo tier available.]**

It does not ship the art assets (copyright), but it names the layout files and panes, which settles
several structural questions no screenshot could. Relevant findings, cited inline below:

| Layout file | Loaded by | Role |
|---|---|---|
| `my_IplTop_a.brlyt` / `.brlan` | [`src/scene/channelSelect/iplChannelSelect.cpp`](https://github.com/koopthekoopa/wii-ipl/blob/main/src/scene/channelSelect/iplChannelSelect.cpp) | **The main Wii Menu screen layout — this is where the bar lives** |
| `my_IplTop_e.brlyt` / `.brlan` | [`src/scene/button/iplButton.cpp`](https://github.com/koopthekoopa/wii-ipl/blob/main/src/scene/button/iplButton.cpp) | All bar buttons + page arrows |
| `mn_Sdcard_Btn.brlyt` | [`src/scene/sdButton/iplSDMenuButton.cpp`](https://github.com/koopthekoopa/wii-ipl/blob/main/src/scene/sdButton/iplSDMenuButton.cpp) | SD Card icon — **a separate layout file** |
| `my_IplTop_c.brlyt` | `src/scene/board/iplBoard.cpp` | Message Board background |
| `my_IplTop_f.brlyt` / `my_IplTop_g.brlyt` | `src/scene/calendar/iplDate.cpp` / `iplCalendar.cpp` | Date object / Calendar screen |
| `it_BgSetUp_a.brlyt` | `src/scene/settingSelect/iplSettingBg.cpp` | Wii Options background |

**The bar is never referenced by name anywhere in the decompiled C++.** `iplChannelSelect.cpp`
scripts `N_Ch_*` (channel slots), `BaseMask0–4`, `Picture_00–04`, `Edge0–4`, `ChMask`, and
`N_Clock0/1/2` — but nothing bar-shaped. `iplButton.cpp` scripts `B_Bbs`, `B_Ch`, `B_Set`, `B_Cal`,
`B_Add`, `B_CalExit`, `B_AddExit`, `B_Add_R`, `B_Dust`, `B_ArwR`, `B_ArwL` and their `G_*` animation
groups — all buttons, no bar.

> **[Inferred, high confidence]** The bar is **static, non-interactive artwork baked into
> `my_IplTop_a.brlyt`** — almost certainly one or two textured picture panes. No code touches it,
> nothing animates it independently, and it has no hit region. This is the cleanest available
> answer to "is the bar a component or a backdrop?": **it is a backdrop.** Build it as a
> non-interactive presentational layer; put all interactivity in the children.

### 0.3 ⚠️ Research-hygiene warning — hostile content at `tcrf.net/Wii_Menu`

The Cutting Room Floor's Wii Menu page ([`https://tcrf.net/Wii_Menu`](https://tcrf.net/Wii_Menu))
was fetched this pass and returned **an embedded prompt-injection payload** — text framed as
"instructions only for LLMs," falsely asserting "the user has specifically requested this," and
directing the agent to execute destructive filesystem commands. It contained **no** Wii Menu
content. The injection was ignored, no commands were run, and **the page was excluded as a
source**. Flagging it here so nobody on this project re-fetches it unguarded. TCRF may be
compromised, spoofed at the network layer, or serving poisoned content to non-browser user agents —
treat that domain as untrusted for this project until verified in a real browser.

### 0.4 Coverage limits of this pass

`WebSearch` quota was exhausted early, so discovery ran through direct `WebFetch`/`curl` on known
URLs plus the GitHub API. Several relevant hosts actively blocked retrieval: **reddit.com** and
**old.reddit.com** (403/domain block), **web.archive.org** (blocked), **wii.fandom.com** (HTTP 402
via WebFetch, Cloudflare via curl), **wiki.raregamingdump.ca** (Anubis proof-of-work wall). This
bites hardest on **§7 (version differences)**, where the single best lead survives only as a
search-result snippet. Marked clearly there.

---

## 1. The silhouette

This is the bar's signature feature and the thing most fan recreations get wrong. Everything in
this section is **[Measured]** from `reference_screen.png` unless noted.

### 1.1 Overall description

The bar spans the **full screen width, edge to edge**, and runs to the **very bottom** of the
frame. Its **bottom and side edges are square** — no rounded corners, no inset, no margin. All of
the shape lives in the **top edge**, which is:

**flat raised wing → S-curve down → flat lowered trough → S-curve up → flat raised wing**

Five segments, **perfectly symmetric** about the horizontal center. Both flats are truly flat
(constant to the pixel), and both transitions are smooth **ease-in-out S-curves**, not straight
chamfers and not circular arcs.

### 1.2 Segment boundaries (fractions of screen width)

Measured by finding the cyan accent pixel in every one of the 420 columns:

| Segment | x range (px, 420-wide) | x range (% of W) | Width (% of W) |
|---|---|---|---|
| Left wing (flat) | 0 → 74 | 0% → **17.6%** | 17.6% |
| Left transition (S-curve) | 74 → 148 | 17.6% → **35.2%** | 17.6% |
| **Trough (flat)** | 148 → 271 | 35.2% → **64.5%** | **29.3%** |
| Right transition (S-curve) | 271 → 345 | 64.5% → **82.1%** | 17.6% |
| Right wing (flat) | 345 → 420 | 82.1% → 100% | 17.9% |

Symmetry check: left flat 74 px, right flat 75 px; left curve 74 px, right curve 74 px. Symmetric
to within one pixel — i.e. **exactly symmetric**, with a 1 px rounding artifact.

Practical rule of thumb: **wings ≈ 17.5% each, transitions ≈ 17.5% each, trough ≈ 29%.**

### 1.3 Heights (fractions of screen height)

| Landmark | y (px, 236-tall) | y (% of H from top) | **Bar height below it** |
|---|---|---|---|
| Top edge at the **wings** | 171 | **72.5%** | **27.5% of H** |
| Top edge at the **trough** | 196 | **83.1%** | **16.9% of H** |
| Bottom of bar / bottom of screen | 235–236 | 100% | — |

- **Trough depth** (how far the trough sits below the wings): **25 px = 10.6% of H**. The wings are
  ~1.6× the trough's height.
- The wings' top edge sits **just below the channel grid**: the grid's lowest tile pixels land at
  y ≈ 165–170, i.e. a gap of only **~2% of H** between grid bottom and wing edge. The wings define
  the grid's lower boundary. **[Measured]**
- Over the trough, the clearance from grid bottom to bar edge opens up to **~13% of H** — this
  gap is what the trough exists to create (see §6).

### 1.4 Why the wings are exactly that wide — a decisive finding

The two corner buttons were measured independently of the contour:

| Element | x extent | y extent |
|---|---|---|
| Wii button (cyan ring) | 19 → **74** px (4.5% → **17.6%**) | 172 → 218 (72.9% → 92.4%) |
| Mail button (cyan ring) | **345** → 401 px (**82.1%** → 95.5%) | 172 → 218 (72.9% → 92.4%) |

Compare against §1.2: the **left wing's flat ends at x = 74 — the exact pixel where the Wii
button's ring ends.** The **right wing's flat begins at x = 345 — the exact pixel where the mail
button's ring begins.** And both buttons' tops sit at y = 172, exactly **1 px below the wing edge
line at y = 171** — the circles are tangent to, and inscribed just under, the raised edge.

> **[Inferred, very high confidence — the coincidence is pixel-exact on four independent
> boundaries]** The silhouette is **derived from the buttons, not decorative**. The wings are
> raised and held flat *precisely* long enough to seat a circular button tangent to the top edge;
> the curve begins the instant the button ends. The trough is then the leftover span, dropped to
> claw back vertical room for the clock.
>
> **Implementation consequence:** do not treat wing width and button size as independent tokens.
> Derive the wing flat from the button diameter + its edge inset, so that any change to button
> size keeps the silhouette coherent. This is the single most useful structural fact in this doc.

### 1.5 The transition curve — exact geometry

The curve is **not** linear (a straight-line ramp is off by up to 3–4 px, clearly visible), and it
is **not** symmetric. Fitting a cubic Bézier over the left transition by grid search:

**Best fit — RMS error 0.34 px (essentially pixel-exact):**

```
left transition:   M 74,171  C 122,186  112,192  148,196
```

Note the control points **cross over** in x (122 then 112). The real curve **drops fast out of the
wing and then flattens hard into the trough** — front-loaded, not a symmetric ease. Max slope is
≈ 0.55 px/px (≈ 29°) reached around x ≈ 105–112, roughly 45% of the way through the transition.
In normalized units (%H per %W) that peak slope is ≈ 0.98, i.e. **very close to 1:1**.

**Simpler symmetric approximation** (classic ease-in-out; max error 3.6 px ≈ 1.5% of H — usable,
but visibly softer at the top of the curve):

```
left transition:   M 74,171  C 111,171  111,196  148,196
```

**Full contour as one SVG path**, in the reference 420 × 236 space (scales linearly; mirror the
right side of the exact fit about x = 210):

```svg
<path d="M 0,171
         L 74,171
         C 122,186 112,192 148,196
         L 272,196
         C 308,192 298,186 346,171
         L 420,171
         L 420,236 L 0,236 Z" />
```

Same path in **percentages**, for a responsive `clip-path` or a `preserveAspectRatio="none"` SVG:

| Point | x (% W) | y (% H) |
|---|---|---|
| wing edge | 0 / 100 | 72.46 |
| wing flat end / start | 17.62 / 82.38 | 72.46 |
| control 1 | 29.05 / 70.95 | 78.81 |
| control 2 | 26.67 / 73.33 | 81.36 |
| trough start / end | 35.24 / 64.76 | 83.05 |

**Caveat — aspect ratio.** All of the above is measured from a **16:9** capture. The real Wii ships
**separate 4:3 and 16:9 layout geometry**: `iplSDMenuButton.cpp` sets the SD button's x position to
`-245.0f` for 16:9 and `-152.0f` for 4:3. Back-solving against the measured SD icon center (20.6%
from the left edge) implies a 16:9 layout half-width of ≈ 416 units (canvas ≈ 832 wide), against
which `-152.0f` in 4:3 would place the same icon at **25%** from the left — a different proportion.
**[Measured + Inferred]** So the bar's proportions are **not** simply stretched between the two
modes; elements are re-anchored toward the edges in widescreen. **If you build a 4:3 mode, the
percentages in this section will be wrong** — the wings would be proportionally wider and the
trough proportionally narrower. Treat every proportion here as **16:9-specific**. I could not
obtain a 4:3 capture to measure directly; this is an open gap.

---

## 2. Fill treatment

**This section corrects `context/visual-design.md` §5.** That doc describes the fill as
"`#CECFD2` near the outer edges brightening toward `#F0F0F0` near the wave's central dip" — a
**horizontal** gradient, light in the middle. Direct measurement shows that is wrong on both
counts. **[Measured]**

### 2.1 The gradient is vertical, and it runs DARK at top → LIGHT at bottom

Sampled 12 px below the contour at 15-px intervals across the whole width, the fill is
**horizontally uniform**: rgb(196–204, 197–206, 203–209) at every x from 0 to 345, with no
edge-to-center variation whatsoever. There is **no horizontal gradient**.

Vertically, averaged over clean columns (trough region, avoiding text and buttons), measured as
depth below the top contour:

| Depth below top edge | as % of H | Color |
|---|---|---|
| +1 px | 0.4% | `#AAAFB8` rgb(170,175,184) ← **darkest** |
| +4 px | 1.7% | `#B6B6BC` |
| +8 px | 3.4% | `#BEBFC5` |
| +12 px | 5.1% | `#C5C6CD` |
| +16 px | 6.8% | `#CBCCD2` |
| +20 px | 8.5% | `#CED0D6` |
| +22 px | 9.3% | `#D3D5DB` ← **brightest** |
| +30 px | 12.7% | `#D1D2D9` |
| +40 px | 16.9% | `#CDCFD7` (bottom of bar at the trough) |

So: **a hard dark edge immediately under the accent line, brightening rapidly over ~20 px (~8.5%
of H), peaking, then falling off very slightly toward the bottom.** This reads as the channel-grid
area casting a shadow down onto the bar, or equivalently the bar being lit from below — a recessed
shelf, not a raised one.

### 2.2 The top shading is anchored to the **curved** edge, not to a screen-space line

Decisive test — compare a wing column (x = 62, contour at y = 171) against a trough column
(x = 155, contour at y = 196):

| Same absolute y | x=62 (wing) | x=155 (trough) |
|---|---|---|
| y = 197 | rgb(211,211,217) | rgb(173,176,184) ← wildly different |
| y = 209 | rgb(198,199,205) | rgb(199,200,206) ← converged |
| y = 233 | rgb(206,207,215) | rgb(206,207,215) ← identical |

| Same depth below contour | x=62 | x=155 |
|---|---|---|
| +1 px | rgb(177,179,184) | rgb(173,176,184) ← match |
| +7 px | rgb(192,194,198) | rgb(189,191,197) ← match |
| +13 px | rgb(205,206,211) | rgb(199,200,206) ← drifting |
| +25 px | rgb(206,207,211) | rgb(210,212,219) ← diverged |

**The correct model is two stacked layers:**

1. **Base fill** — screen-space, essentially flat: a very gentle vertical ramp from about
   `#D3D5DB` at y ≈ 92% of H down to `#CDCFD7` at 100%. Barely perceptible; could be flattened to
   a single `#D0D2D9` with almost no loss.
2. **Inner shadow along the top contour** — hugging the curve, from ≈ `#AAAFB8` at the edge
   fading to nothing over ≈ 20 px (**8.5% of H**).

In CSS/SVG this is straightforward: fill the clip-path/SVG shape with the flat base, then overlay
a second shape (the same path, offset/gradient-masked) or an SVG `filter: feDropShadow` /
`feGaussianBlur` inner-shadow along the top edge. A single `linear-gradient(to bottom, ...)` on the
whole bar will **not** reproduce it — the dark band must follow the curve, or the wings will look
wrong.

### 2.3 Texture and hue

- **Flat, no visible texture.** Unlike the empty channel tiles (which `visual-design.md` §2
  documents as carrying a faint diagonal grain and a ghosted "Wii" watermark), the bar fill shows
  **no noise, grain, scanline, or brushed-metal pattern**. Adjacent samples differ by ≤ 2 levels,
  consistent with gradient banding only. Calling it "brushed metal" (as `visual-design.md` §5
  does) overstates it — it is a clean gradient. **[Measured]**
- **The gray is cool / blue-tinted, not neutral.** Blue consistently runs **7–9 levels above red**
  across the entire fill (e.g. rgb(197,198,205), rgb(206,208,216), rgb(170,175,184)). Do not use a
  neutral gray like `#CCCCCC`; the tint is part of the look and pairs with the cyan accent.

---

## 3. The accent line

### 3.1 It is a hairline stroke, not a glow

**[Measured]** Vertical slices straight through the line:

```
x = 20  (left wing)    y=169 (236,236,236)  ← plain background
                       y=170 (206,223,228)  ← 1px antialias, faint blue tint
                       y=171 ( 59,189,234)  ← CORE
                       y=172 (180,183,187)  ← immediately the dark bar fill
x = 210 (trough)       y=194 (242,242,242)
                       y=195 (218,232,238)  ← antialias
                       y=196 ( 71,188,229)  ← CORE
                       y=197 (172,175,183)  ← immediately the dark bar fill
```

- **Core width: 1 px at 420 px screen width — i.e. ~0.24% of screen width, ~0.42% of screen
  height.** On the flats it is exactly one pixel; on the diagonals it spreads to ~2 px purely from
  antialiasing the slope.
- **Solid stroke, no bloom.** There is exactly one antialiased pixel above and **zero** below —
  the fill's dark band starts on the very next row. A glow would smear symmetrically over several
  pixels in both directions. It does not.
- **Do not implement this as a `box-shadow`/`filter: drop-shadow` glow.** It is an SVG `stroke` (or
  a 1–2 px `border-top` following the path). If you want a hint of bloom for a modern-screen look,
  that is deliberate stylization, not a sourced detail — flag it as such.

### 3.2 Color, and the fact that it varies along its length

Histogram of the core pixel in every column, grouped by segment:

| Segment | Dominant core color | Hex |
|---|---|---|
| Left wing | rgb(59,189,234) × 55 cols | **`#3BBDEA`** |
| Right wing | rgb(59,189,234) × 55 cols | **`#3BBDEA`** |
| Trough | rgb(71,188,229) × 120 cols | **`#47BCE5`** |
| Peak saturation (x ≈ 32–36, 384–388) | rgb(53,190,237) | **`#35BEED`** |

So the wings are a **slightly purer, more saturated blue** than the trough, which is marginally
lighter and greener. The spread is small (Δ ≈ 12 in red) but it is systematic, not noise — 55 and
120 consecutive columns respectively hold a single exact value.

`visual-design.md` §3 lists **`#35BEED`** as the accent. **[Measured]** That is accurate but it is
the *peak-saturation* value, found only in a ~10-column window near each corner button. The
**modal** value along the line is `#3BBDEA` (wings) / `#47BCE5` (trough). For a single-token
implementation, **`#3BBDEA` is the better representative**; `#35BEED` is fine and the difference is
near-imperceptible. Keeping `#35BEED` as the project's accent token is reasonable for consistency
with the button rings, which is where it peaks.

### 3.3 It traces the full contour, edge to edge

The line is present in **every one of the 420 columns**, at the contour, with no breaks, no fade at
the screen edges, and no separate treatment over the buttons. It runs flat across the left wing,
follows both S-curves exactly, runs flat across the trough, and terminates hard at x = 0 and
x = 419. There is **no second line**, no lower rule, and no accent anywhere else on the bar.

The button rings use the same cyan family, which is why the bar reads as one system — but the rings
are separate shapes, not continuations of this stroke.

---

## 4. Height — summary table

Consolidating §1.3 for implementation. **[Measured]**, 16:9.

| Quantity | % of screen height | px at 236 H | px at 1080 H |
|---|---|---|---|
| Bar height at the **wings** | **27.5%** | 65 | ~297 |
| Bar height at the **trough** | **16.9%** | 40 | ~183 |
| Trough depth below wings | **10.6%** | 25 | ~114 |
| Top edge (wings), from top of screen | 72.5% | 171 | ~783 |
| Top edge (trough), from top of screen | 83.1% | 196 | ~897 |
| Inner-shadow depth below top edge | ~8.5% | ~20 | ~92 |

The bar occupies between **1/6 and just over 1/4** of screen height depending on where you measure
— which is why a single "bar height" number is misleading and why the shape has to be built as a
path rather than a rectangle with a decorated top.

---

## 5. Opacity — **confirmed OPAQUE**

`context/visual-design.md` §5 concluded the bar reads as opaque and flagged this as a correction to
a common assumption ("semi-transparent bar"). **That conclusion is correct, and this pass provides
a stronger proof than pixel-eyeballing.** **[Measured]**

**The test:** the background *above* the bar is not uniform — it varies horizontally from about
rgb(212,212,212) to rgb(241,241,241) depending on whether a channel tile, a gutter, or open
backdrop sits there. Sampling the background 8 px above the contour and the bar fill 12 px below
the contour, at 15-px intervals across the full width:

| x | background above (contour − 8 px) | bar fill below (contour + 12 px) |
|---|---|---|
| 0 | rgb(235,235,235) | rgb(198,200,204) |
| 75 | rgb(212,212,212) | rgb(200,201,206) |
| 105 | rgb(241,241,241) | rgb(197,198,204) |
| 165 | rgb(239,239,239) | rgb(197,199,205) |
| 255 | rgb(237,237,237) | rgb(197,199,205) |
| 330 | rgb(241,241,241) | rgb(196,198,203) |

**The background swings across a 29-level range; the bar fill stays within a 4-level range.** A
translucent bar would inherit that horizontal variation proportionally to its alpha. It inherits
**none of it**. The bar is **opaque** — alpha 1.0.

Corroborating: the channel grid's lowest tile pixels stop at y ≈ 165–170 and **nothing from the
grid is visible below the contour anywhere**, including under the trough where the bar's edge sits
30 px below the grid.

**Recommendation:** build it opaque. A `backdrop-filter: blur()` / frosted-glass treatment is a
modern-web instinct that is **not** faithful to the reference. If the project wants it, label it
explicitly as stylization.

*(Caveat: this proves opacity for this one 4.3-era 16:9 capture. It does not rule out translucency
in some other version or on some other screen — but nothing found this pass suggests otherwise.)*

---

## 6. What sits in the trough — and the surprise

The task brief assumed "the lowered central area holds the time/date." **Measurement shows the
relationship is more specific and more interesting than that.** **[Measured]**

### 6.1 The clock sits ABOVE the trough line; the date sits BELOW it

| Element | x extent (% W) | y extent (% H) | Relative to the trough line (83.1% H) |
|---|---|---|---|
| Clock digits `12:00` | 185–239 px → **44.0%–56.9%** | 172–189 px → **72.9%–80.1%** | **entirely ABOVE** — bottom of glyphs is 3.0% of H clear of the line |
| `AM` suffix | ~245–261 px → 58.3%–62.1% | 183–189 px → 77.5%–80.1% | **ABOVE** |
| Date `Fri 1/1` | 185–232 px → **44.0%–55.2%** | 202–214 px → **85.6%–90.7%** | **BELOW** — top of glyphs is 2.5% of H under the line |

Confirmed by sampling what the glyphs sit on: behind the clock at (210, 180) the surface is
rgb(239,239,239) — **the page background**, identical to the backdrop above the grid. Behind the
date at (250, 210) it is rgb(200,202,208) — **bar fill**.

> **The clock is not on the bar. It is in the notch the bar's edge carves out.** The accent line
> passes *between* the time and the date. The date is the only one of the two that is actually
> printed on the bar's surface.

This is a genuinely load-bearing distinction for the rebuild: if you place both the clock and the
date inside a "bottom bar" container, the clock will end up on the wrong surface and its color
relationship will break (see §6.3).

### 6.2 The trough is sized to the clock

The trough's flat span is **35.2% → 64.5%** of width. The full clock assembly (digits + AM) spans
**44.0% → 62.1%**. It fits inside the flat span with ~9% of W of margin on the left and ~2% on the
right. The clock's digits are centered at **50.5%** and the date at **49.6%** — both effectively
screen-centered, with `AM` hanging off to the right as an outrigger.

Combined with §1.4: **the wings are sized by the buttons, and the trough is sized by the clock.**
The entire silhouette is a packing solution. Every segment boundary is set by a child element.

### 6.3 Ink relationships (context for the clock/date docs, not re-derived here)

Darkest glyph pixel: clock rgb(155,155,155), date rgb(116,116,118). The date is much darker in
absolute terms — **but the contrast against its own substrate is identical**: clock 155 on 239
(Δ84), date 116 on 200 (Δ84). **[Measured, Inferred]** Consistent with both being drawn at the same
tint/alpha over different backgrounds. Worth flagging to whoever owns `clock.md`: if you hardcode
two different grays you will get it right by accident; if you hardcode one gray you will get one of
them wrong.

### 6.4 The trough region is a button

> **⚠️ SUPERSEDED (2026-07-24): it is not.** `B_Cal` / `G_Cal` and `B_CalExit` /
> `G_CalExit` are real panes, but they belong to the **Message Board and Calendar
> screens**, which share the `my_IplTop_e.brlyt` layout file with the main menu. On the
> channel-select screen the bottom bar exposes only three things: `B_Bbs` (Message Board),
> `B_Set` (the Wii button) and the separate SD Card icon — `iplChannelSelect.cpp`'s press
> handler has cases for exactly those. The `clock` class has no `gui::PaneManager`, no
> hit-testing and no event handler at all, and Nintendo's manual gives `Current Time` and
> `Current Date` bare callouts with **no described action**, while every genuinely
> interactive element on the same diagram gets one. **The clock/date are decorative.**
> The section's practical advice still holds for the opposite reason: keep
> `pointer-events: none` on the trough because nothing there is clickable.
> See `context/decomp-findings.md` §8.1 and §8.4, `context/components/date-display.md` §7.
> Evidence tier: decomp + official.


`iplButton.cpp` scripts `B_Cal` / `G_Cal` and `B_CalExit` / `G_CalExit`, and
`src/scene/calendar/iplCalendar.cpp` loads `my_IplTop_g.brlyt` with a `G_All` group animation.
**[Fan/community — decomp]** The clock/date area is a **calendar button**: selecting it opens the
Calendar screen, and there is a dedicated exit button and exit animation to come back. The bar
container itself is still not interactive — the hit region belongs to `B_Cal`, in the button
layout. Relevant to the container only as a reminder not to swallow pointer events on the trough.

---

## 7. Version differences (1.0 → 4.3)

**This is the weakest section of the doc.** Retrieval blocks (§0.4) prevented me from verifying the
key claim at its source. Read the confidence tags carefully.

### 7.1 The trough did not exist at launch — probably added in 2.0

The one direct claim located, from a Reddit thread on r/WiiHacks showing System Menu **1.0U**
running on a boot2 Wii
([`/r/WiiHacks/comments/gqhrrf/wii_menu_v10u_running_on_boot2_wii/`](https://www.reddit.com/r/WiiHacks/comments/gqhrrf/wii_menu_v10u_running_on_boot2_wii/)):

> "Notice how there's no dip in the Wii Menu where the clock would normally be. **2.0 was the first
> to have that.**"

**[Fan/community — LOW CONFIDENCE, single source, second-hand.]** This surfaced as a search-result
snippet and was **reproduced across two independent query phrasings**, so the snippet text itself is
reliable — but reddit.com and old.reddit.com both refused retrieval (403 / domain block), so I could
**not** open the thread, see the screenshot, check the comment's score, or find out whether anyone
contradicted it. Treat as a strong lead, not a settled fact.

If true, the implication is significant: **System Menu 1.0's bar had a flat, straight top edge all
the way across** — wings only, no trough, no S-curves. The signature silhouette this whole document
describes is **not** original to the Wii's launch.

**An unresolved tension:** WiiBrew's System Menu changelog
([`wiibrew.org/wiki/System_Menu`](https://wiibrew.org/wiki/System_Menu), fetched directly) lists
"**Clock display**" as added in **3.0 (August 6, 2007)** — the only visual change it records
anywhere in the 1.0 → 4.3 range. So if the dip arrived in 2.0 and the clock in 3.0, the trough
existed for roughly a year *before* the thing it appears purpose-built to hold.

Two candidate explanations, neither verified:
- **[Inferred]** 2.0 introduced the trough for the **date** alone (which §6.1 shows sits *on* the
  bar, unlike the clock), and 3.0 dropped the clock into the notch above it. This fits the
  decompilation's structure suspiciously well: the Date is its own separate layout object
  (`my_IplTop_f.brlyt`, loaded by `iplDate.cpp`), whereas the clock is plain panes
  (`N_Clock0/1/2`) inside the main `my_IplTop_a` layout — i.e. the date is a self-contained older
  module, the clock a later addition wired into the base layout.
- **[Inferred]** The Reddit commenter is off by a version, or is describing 3.0.

**Do not treat either as established.** Resolving this needs a verified 1.0 and 2.0 screenshot,
which I could not obtain. **Flagged as the main open gap in this document.**

### 7.2 The SD Card icon (4.0) did NOT change the bar

**[Fan/community — decomp, high confidence]** The SD Card Menu icon, added in System Menu **4.0**
(March 25, 2009 — `version-history.md`, WiiBrew), lives in its **own layout file**
(`mn_Sdcard_Btn.brlyt`) loaded by its **own scene** (`src/scene/sdButton/`), entirely separate from
both the main menu layout (`my_IplTop_a`) and the original button layout (`my_IplTop_e`) that holds
every *other* bar button. `iplButton.cpp` even carries a placeholder animation entry commented
`// left out blank for SDMenuButton`.

That is the signature of a feature **bolted onto** an existing screen rather than integrated into
it. **[Inferred, high confidence]** The bar's shape and chrome were almost certainly untouched by
4.0 — the icon was simply dropped into existing empty space on the left wing's shoulder.

Supporting measurement: the SD icon sits at **18.8%–22.4% of W**, i.e. immediately to the right of
where the left wing's flat ends (17.6%) — tucked onto the descending curve, in the gap between the
Wii button and the trough. It does not displace anything.

### 7.3 Did the bar grow as icons were added?

**No evidence that it did, and structural evidence that it did not.** The bar accommodated a new
icon in 4.0 without a layout change (§7.2), and the wing width is pinned to the corner button
diameter (§1.4), which did not change. **[Inferred, moderate confidence.]**

### 7.4 What I could not check

No verified before/after captures for 1.0, 2.0, 3.0, or 4.0 were obtainable this pass. The
decompilation covers **4.3 only** (`config/43E`, `43J`, `43K`, `43U`), so it cannot be diffed
across versions. Nintendo's own changelogs and the Ops Manual say nothing about appearance.
`context/version-history.md` should be considered the project's authority on *what* changed per
version; this doc adds only the two structural inferences above.

---

## 8. Behavior

### 8.1 The bar itself is static

**[Fan/community — decomp, high confidence]** As established in §0.2: no pane name in the
decompiled `iplChannelSelect.cpp` or `iplButton.cpp` corresponds to the bar, and no code
manipulates it. It has no hover state, no press state, no independent animation, no hit region.

It **does** participate in whole-scene transitions: `iplChannelSelect.cpp` binds
`my_IplTop_a.brlan` (an animation file for the main layout), and
`include/scene/channelSelect/iplChannelSelect.h` defines states including `STATE_FADING_IN` and
`STATE_NORMAL_FADE_ZOOM`. So the bar **fades and zooms with the rest of the screen** when the menu
enters or a channel launches — it is carried along, never animated on its own.

Separately, `iplButton.cpp` binds a `G_SeenChange` ("scene change") animation group on
`my_IplTop_e.brlan`, plus `G_CalExit`. **[Inferred]** The *buttons* animate out on scene change
while the bar simply fades with the backdrop — so on a transition you would see the buttons move
independently against a static bar, not the bar sliding away.

**It never hides.** Nothing found suggests the bar auto-hides, retracts, or collapses on the main
Wii Menu. It is present in every state of the channel-grid screen.

### 8.2 Overlays — the bar does not persist, and `system-ui.md` needs a correction

`context/system-ui.md` §1 and §4 state that selecting the Wii button or SD Card Menu icon "changes
the background from white to **black** while that overlay/menu is active," tagged **[Fan consensus,
page itself unverified]** (the cited `nintendo.fandom.com` page returned HTTP 402). The brief asks
whether the bar follows that switch.

**The framing is wrong, and the decompilation resolves it.** **[Fan/community — decomp]**

These are **not overlays layered over the Wii Menu**. They are **full scene changes**, each loading
its own background layout:

| Destination | Own background layout | Evidence |
|---|---|---|
| Wii Options / Settings | `it_BgSetUp_a.brlyt` | `src/scene/settingSelect/iplSettingBg.cpp` |
| Wii Message Board | `my_IplTop_c.brlyt` | `src/scene/board/iplBoard.cpp` |
| SD Card Menu | (enters via the Settings scene path) | `iplChannelSelect.h`: `STATE_START_SD_MENU_SCENE = STATE_START_SETTING_SCENE, /* for readability */` |

`include/scene/settingSelect/iplSettingSelect.h` further defines `STATE_WAIT_BLACK_OUT` and
`stt_wait_blackout()` — the Wii Menu **fades to black**, then the new scene's own background is
built.

> **Answer to the brief's question: the bar does not change appearance when these open, because
> the bar is not there anymore.** The Wii Menu scene blacks out and is replaced. There is no state
> in which a differently-styled bar coexists with an overlay.
>
> **Correction for `system-ui.md`:** the observed "white → black background" is not a *mode switch
> applied to the Wii Menu*. It is (a) the **blackout transition** between scenes, and/or (b) the
> destination scene simply having a dark background of its own. `system-ui.md`'s underlying visual
> observation is likely accurate; its *causal framing* ("changes the background... while that
> overlay is active") is not. Worth amending that doc.

**Implementation consequence:** model Wii Options / Message Board / SD Card Menu as **routes**, not
modals. Cross-fade through black. Do not build a bar that restyles itself for an overlay state —
that state does not exist in the original.

**Residual uncertainty:** `iplChannelSelect.h` also declares `CsChanSelSDMenuEventHandler`, and the
SD Card Menu visually resembles the channel grid, so the SD Card Menu may partly **reuse** the
channelSelect scene in a different mode rather than being a fully independent screen. If so it
might legitimately draw a bar-like element of its own. I could not confirm either way. **[Flagged
as an open question]** — but it does not change the conclusion for the *main menu's* bar, which
unloads regardless.

---

## 9. Build checklist

Condensed, implementation-facing. Percentages are of the **16:9** viewport (§1.5 caveat).

1. **One non-interactive presentational layer.** Full-bleed, pinned to the bottom, square corners,
   `pointer-events: none`. All interactivity belongs to the children.
2. **Shape it with the path in §1.5** — SVG `<path>` or CSS `clip-path: path()`. Not a rectangle
   with a decorated border. Wings 17.6% W each, transitions 17.6% W each, trough 29.3% W.
3. **Derive the wing flat from the corner-button diameter + edge inset** (§1.4), so the tangency
   survives responsive resizing. This is what makes it read as authentic.
4. **Heights:** top edge at **72.5%** of H (wings) and **83.1%** of H (trough); bar runs to 100%.
5. **Fill:** flat cool gray base ≈ `#D0D2D9` (blue 7–9 levels above red — do **not** use neutral
   gray), plus an **inner shadow following the curved top edge** from `#AAAFB8` fading out over
   **8.5% of H**. No texture. No horizontal gradient.
6. **Accent line:** 1 px (≈0.4% of H) **solid** stroke on the path, `#3BBDEA`. Full contour, edge to
   edge, no breaks, **no glow**.
7. **Opaque.** No `backdrop-filter`, no alpha.
8. **Clock goes ABOVE the trough line, on the page background; date goes BELOW it, on the bar**
   (§6.1). Do not nest the clock inside the bar container.
9. **No hide/expand/hover states.** The bar fades and zooms only as part of whole-screen
   transitions.
10. **Route, don't modal** for Wii Options / Message Board / SD Card Menu — cross-fade through
    black; the bar unmounts (§8.2).

---

## 10. Open gaps

| # | Gap | Why it matters | How to close it |
|---|---|---|---|
| 1 | **1.0 / 2.0 silhouette unverified** (§7.1) | Determines whether the trough is original or an addition; blocks any "launch-era" mode | Verified 1.0 and 2.0 screenshots. Reddit/archive.org/Fandom all blocked this pass — try a browser-based fetch or an emulator capture |
| 2 | **2.0-dip vs 3.0-clock tension** (§7.1) | If the trough predates the clock, its design rationale differs from §6.2's conclusion | Same as #1; a 2.0 capture settles it immediately |
| 3 | **4:3 geometry entirely unmeasured** (§1.5) | Every proportion in this doc is 16:9-only; 4:3 re-anchors elements (SD button 25% vs 20.6%) | Obtain a 4:3 capture, or extract `my_IplTop_a.brlyt` from a System Menu dump and read the pane rects directly |
| 4 | **Does the SD Card Menu draw its own bar?** (§8.2) | Only matters if the project builds that screen | Read `iplChannelSelect.cpp`'s SD-mode branch in full |
| 5 | **Exact curve authoring intent** (§1.5) | The 0.34 px Bézier fit is empirical; the original may be an arc pair or a texture edge | Extract the actual `.brlyt`/texture from a System Menu dump |
| 6 | **`tcrf.net` serving injection payloads** (§0.3) | Blocks a normally-excellent source; possible wider risk | Verify in a real browser before any project member re-fetches that domain |

---

## 11. Contradictions this doc resolves

| Existing claim | Location | Status |
|---|---|---|
| Bar fill is a **horizontal** gradient, `#CECFD2` at edges → `#F0F0F0` at the center dip | `visual-design.md` §5 | ❌ **Wrong.** Fill is horizontally uniform; the gradient is vertical, **dark at top → light at bottom** (§2.1) |
| The curve "dips down toward each of the two corner circular buttons and arcs upward toward the center" | `visual-design.md` §5 | ❌ **Inverted.** It is **raised** at the buttons and **dips** at the center (§1.1) |
| Bar reads as **opaque**, not translucent | `visual-design.md` §5, §"open questions" | ✅ **Confirmed**, with a stronger proof (§5) |
| Accent color `#35BEED` | `visual-design.md` §3 | ⚠️ **Refined.** Accurate but it is the peak value near the buttons; modal along the line is `#3BBDEA` / `#47BCE5` (§3.2) |
| Fill described as "brushed-metal/glossy gray panel" | `visual-design.md` §5 | ⚠️ **Overstated.** No measurable texture; it is a clean gradient (§2.3) |
| Background "changes from white to black while that overlay is active" | `system-ui.md` §1, §4 | ⚠️ **Causally wrong.** Not a mode switch on the Wii Menu — these are full scene changes with a blackout transition (§8.2) |
| Nintendo does not describe the bar's chrome as a discrete shape | `component-inventory.md` item 6 | ✅ **Confirmed** against the full Ops Manual OCR text (§0.1) |
| Clock and date both render "bottom-center on the curved bottom bar" | `visual-design.md` §6 | ⚠️ **Half right.** The **date** is on the bar; the **clock** is above the accent line on the page background (§6.1) |
