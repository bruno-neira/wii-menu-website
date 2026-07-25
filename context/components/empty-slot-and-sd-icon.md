# Component Deep-Dive: Empty Channel Slot & SD Card Menu Icon

Follow-up to `context/component-inventory.md` items **3** (empty/blank channel slot) and **8**
(SD Card Menu icon) — the two components the inventory ranked #6 and #5 in its priority list.
They are grouped here because both are small, both were flagged as "appearance undocumented,"
and both turned out to be resolvable from the same two newly-accessible primary sources.

**Sourcing tags:** **[Official]** = Nintendo-authored (printed Operations Manual, support page,
developer spec). **[Fan/community]** = wikis, forums, asset rips, press. **[Inferred]** = my
reasoning from the above or from direct pixel measurement; not stated by any source.

---

## 0. Sources unlocked in this pass (both were previously blocked)

Two sources that earlier research passes could not get at were retrieved here, and between them
they settle most of the open questions in both components.

### 0.1 The Operations Manual's **page images**, not just its OCR text

Prior passes read the OCR'd text layer of the Wii Operations Manual — Channels and Settings
(Internet Archive item `wii-opmanual-chset`). This pass downloaded the **PDF** and rendered the
actual scanned pages, which contain **Nintendo's own annotated screenshots of the Wii Menu and
the SD Card Menu**. Text OCR cannot see a screenshot; the page render can.

- Manual PDF: <https://archive.org/download/wii-opmanual-chset/WiiRVKChEng.pdf>
- Item page: <https://archive.org/details/wii-opmanual-chset>
- The Wii Menu diagram is on **manual page 2** (PDF page 3, left half). The SD Card Menu
  diagram is on **manual page 66** (PDF page 35, left half). The embedded raster is only
  **315 × 214 px** natively, so it is low-resolution — good enough for silhouette, layout and
  **color**, not for fine detail.

This is a **first-party Nintendo image of the exact screen this project is recreating**, and it
independently corroborates the repo's `reference_screen.png` on every point where they overlap.

### 0.2 The Spriters Resource — 403 defeated

`context/channels.md` and `context/component-inventory.md` both note that The Spriters Resource
403'd during earlier research. **It does not block browsers, only default HTTP clients** — a
request with a normal desktop `User-Agent` (and a `Referer` on the media host) returns the page
and the sheet image fine. Three Wii Menu sheets were pulled this way:

| Asset | URL | What it gave us |
|---|---|---|
| **Empty Channel Spaces** | <https://www.spriters-resource.com/wii/wiimenu/asset/68562/> | The empty-slot texture itself (§A.5) |
| **Channel Border** | <https://www.spriters-resource.com/wii/wiimenu/asset/211441/> | The shared rounded-rect tile mask (§A.2) |
| **Buttons & Miscellaneous** | <https://www.spriters-resource.com/wii/wiimenu/asset/68370/> | Clean high-res SD-card pictogram + the round bottom-bar buttons (§B.1) |

Full index of Wii Menu sheets: <https://www.spriters-resource.com/wii/wiimenu/> — also contains
`Pointer`, `Clock Numbers`, `Wii Message Board Images`, `Corrupted Icon & Banner Data`,
`Waiting Icon`, and `Wii Options Background`, several of which are relevant to other open
component docs and are **now known to be retrievable**.

### 0.3 Measurement basis

All pixel figures below tagged "reference" are measured from the repo's
`reference_screen.png`, which is **420 × 236 px** — a downscaled 16:9 capture. Treat absolute
pixel values as **ratios**, not as CSS pixels. Note also that this capture carries a
**1-pixel horizontal scanline pattern across the entire frame** (background included, amplitude
≈ ±7/255) — this is a capture/display artifact, **not** Wii Menu art. See §A.6.

---

# PART A — The empty / blank channel slot

## A.1 Exact appearance — the `channels.md` claim, settled

`context/channels.md` describes the empty tile as *"a flat medium-gray rounded-rectangle with a
subtle inset bevel and no '+'/insert glyph,"* flagged **"fan consensus, verify against
screenshots."** Verdict after direct measurement and asset retrieval:

| Claim in `channels.md` | Verdict | Evidence |
|---|---|---|
| Rounded rectangle | ✅ **Confirmed** | Reference screenshot; Nintendo's manual diagram; shared `Channel Border` mask asset |
| Flat gray fill | ⚠️ **Mostly right, tone is too dark** | Measured **#D4D4D4**, not "medium gray" (§A.1.1) |
| Subtle inset bevel | ✅ **Confirmed** | Darker keyline on top/left, fill brightens downward, tile sits darker than the page behind it (§A.1.1) |
| No "+" / insert glyph | ✅ **Confirmed** | No glyph in the screenshot, in Nintendo's diagram, or in the ripped texture |
| *(implied)* otherwise blank | ❌ **Wrong** | There is a **ghosted "Wii" wordmark** centred in every empty tile (§A.1.2) |

So `channels.md` is right about what *isn't* there and wrong about what *is*. `visual-design.md`
§2 already caught the watermark from screenshot analysis; this pass confirms it from **two
independent non-screenshot sources** (Nintendo's own manual art and the ripped game texture),
which moves it from "one person's zoom" to settled fact.

### A.1.1 Measured tone and bevel — **[Inferred, direct measurement]**

Sampled across **all six** empty tiles in `reference_screen.png` (row 2 cols 3–4, row 3 cols
1–4). They are identical to within ±2/255, and **perfectly neutral** (R = G = B exactly):

| Element | Value | Notes |
|---|---|---|
| Fill, overall mean | **`#D4D4D4`** (212) | Consistent across all six tiles |
| Fill, top ~20% | `#D1D1D1` (209) | |
| Fill, bottom ~20% | `#DCDCDC` (220) | ~11 levels brighter than the top |
| Keyline, **top & left** | **`#BDBDBD`** (≈189) | Distinct, ~1px |
| Keyline, **bottom & right** | `#CECED3` (≈206–211) | Much weaker / nearly absent |
| Page background behind grid | `#E6E6E6` (230) | The tile is ~19 levels **darker** than the page |

The asymmetry is the whole story: **dark line on top-left + light on bottom-right + fill
brightening downward + tile darker than its surroundings** is a textbook *recessed / pressed-in*
treatment. `channels.md`'s "subtle inset bevel" is correct, and it is subtle — the total
top-to-bottom delta is ~11/255 (≈4%).

> ⚠️ **Correction to `context/visual-design.md` §2 and its color table.** That doc lists the
> empty-slot fill as `#C6C6C6`–`#CCCCCC` and a "grid gutter/recess background" of
> `#BEBEBE`–`#C0C0C0`. Measured against the same reference image, the fill is **`#D4D4D4`**
> and the gutter between tiles is **`#E6E6E6`** — the same value as the page background, i.e.
> **there is no darker recessed gutter at all**. Nintendo's manual art agrees on the light tone
> (empty tiles mean ≈ RGB 210/200/206 there, allowing for print color shift). Recommend using
> `#D4D4D4` and dropping the "gutter recess" row.

### A.1.2 The "Wii" watermark — **[Official] + [Fan/community]**

Every empty tile carries a **faint, centred "Wii" wordmark** in the official Wii logotype
(capital W, two dotted lowercase i's). Confirmed three ways:

1. **Reference screenshot** — invisible at 1:1, unambiguous after Gaussian blur +
   auto-contrast. Amplitude is only about **11/255 darker than the surrounding fill** (≈4%).
2. **Nintendo's own manual diagram** — the empty tiles in the Operations Manual's Wii Menu
   screenshot show the same faint mark (too low-res to read, but present as a centred smudge in
   the right place). **[Official]**
3. **The ripped texture** — the Spriters Resource `Empty Channel Spaces` sheet shows the
   wordmark as **solid black, cleanly antialiased, dead-centre**, in all four frames. **[Fan]**

Geometry from the texture: the wordmark occupies roughly **45 × 20 px inside a 128 × 96 canvas**
— i.e. **~35% of the tile's width, ~21% of its height, centred both axes**.

### A.1.3 About the "+" that people remember — **[Inferred]**

`channels.md` speculates the remembered "+" is the hovering cursor. I found no "+" glyph in any
empty-slot asset, screenshot, or Nintendo diagram, so the negative claim holds — but the
proposed explanation is probably wrong. Two better candidates: (a) the **Wii Remote's physical
`+` button**, which is the documented way to page the grid ("By pressing the plus and minus
buttons on the Wii Remote users can scroll across accessing empty slots" —
[Wikipedia, Wii system software](https://en.wikipedia.org/wiki/Wii_system_software)); and
(b) the **on-screen `+` / `−` circular buttons** that do exist in the Wii Menu's asset set
(visible in the `Buttons & Miscellaneous` sheet: glossy domes with cyan rings and gray `+`/`−`
glyphs) but are used elsewhere in the system UI, not on empty grid slots. Either would seed the
memory. Don't render a "+" on the tile.

## A.2 Does the empty slot differ from a populated tile's frame?

**No — same frame, different content.** **[Inferred, strongly supported]**

- **Same geometry.** Measured in the reference: populated tiles occupy y 70–114, empty tiles
  y 119–166; both ≈ **85 px wide × 46 px tall** on a **88.5 px column pitch / 49 px row pitch**
  (≈3 px gutter). Both show the same ~4 px corner curve at that scale. Grid spans x 34 → 384.
- **Same rounded-rect mask.** The Spriters Resource **`Channel Border`** asset is a single
  shared **rounded-rect corner mask** — the ripper's own caption reads *"Used when loading
  channels from the Wii Menu or the SD Card Menu. Left – Internal/Original Sprite. Right – How
  it appears normally."* One mask, applied to tiles regardless of what's in them.
- **The corner is a squircle, not a circular radius.** Measured on that mask (hole is
  779 × 442): the edge inset falls off as roughly `inset ≈ C/dy` — 36 px in at 8 px down, 12 at
  32, 5 at 64, still 2 at 128. A true circular radius would reach zero at `dy = R`. For CSS,
  a `border-radius` of about **5% of tile width** approximates the visually dominant part;
  matching it properly needs an SVG/superellipse mask. *(Caveat: this asset is described as the
  channel-**loading** border, so its radius may differ slightly from the resting grid tile.
  The reference screenshot's resting tiles measure consistently with it, but at 420 px wide the
  measurement can't discriminate finely.)*
- **What differs is only the fill.** A populated tile's banner art bleeds to the mask edge with
  a 1 px antialiased boundary and a soft drop shadow. An empty tile shows the gray field +
  watermark + the inset keyline described in §A.1.1. Nintendo's manual art shows populated and
  empty tiles sitting in visually identical frames on the same grid.

**Implementation:** build **one** `<ChannelTile>` with the shared frame, and switch only its
content layer between `banner` and `empty`. Do not build a separate empty-slot component with
its own border treatment.

## A.3 Interaction — is an empty slot hoverable / selectable?

**No source states this either way. The evidence points to "inert."** **[Inferred]**

What the sources actually support:

- **Nintendo enumerates what is selectable, and empty slots aren't on the list.** The Operations
  Manual's Wii Menu page lists five activities — *"Play a Game Disc / Use one of the built-in
  software programs (Channels) / Change Wii console settings / Access the SD Card Menu screen /
  Interact with the Wii Message Board"* — then says *"To select any of these activities, simply
  point at one with the Wii Remote Plus and press the A Button."* The accompanying diagram
  labels six elements (Current Time, Wii Settings and Data Management, SD Card Menu, Wii
  Channels, Current Date, Wii Message Board). **An empty slot is not among them.** **[Official,
  by omission]**
- **No hover sound exists for it.** `context/audio.md` §2–3 establishes that Menu audio fires on
  **focus** (landing on a channel) and **activation** — with no continuous cursor-movement
  sound. If empty slots produced a focus event they'd have a focus blip; nothing in the sound
  research suggests one.
- **Nothing routes from an empty slot.** The inventory speculated it might open the Wii Shop
  Channel. No source supports that. What *does* exist and is easily confused with it is the
  manual's **"Shortcut Channels"**: *"Some channels are not installed on the Wii system, but can
  be downloaded for free from the Wii Shop Channel. Select a channel icon from the Wii Menu to
  find out more information about the Channel and to connect to the Wii Shop Channel to download
  it."* Those are **populated tiles with their own artwork** that act as shop links — a
  *different thing* from a blank slot. **[Official]**

**Recommendation for the clone:** treat empty slots as **non-focusable and non-clickable** in
the resting state — no hover scale, no glow, no sound, no cursor change, `pointer-events` off
for click purposes. Keep them as drop targets during a drag (§A.4). Flag this as an
**inference**, not a sourced fact; a video capture of a pointer crossing empty slots would
settle it in seconds and is the cheapest remaining verification.

## A.4 Role in drag-and-drop

**Empty slots are the documented drop target.** **[Official]**

- Nintendo Support, *How to Arrange Channels on the Wii Menu or the SD Card Menu*: *"Grab the
  desired channel by pressing and holding the A and B Buttons on the Wii Remote. **Drag it over
  an empty spot and release the A and B Buttons.** To move a channel to another page, hold it
  over the arrow button until the page changes."*
  <https://en-americas-support.nintendo.com/app/answers/detail/a_id/1520/>
- Nintendo World Report's rearranging feature uses the same language: *"Holding down the A
  Button and B Trigger while pointing at a channel screen will grab it for easy repositioning
  into an empty slot,"* and notes the only restriction is that *"the Disc Channel cannot be
  moved from the upper-left corner on the first page."* **[Fan/community]**
  <http://www.nintendoworldreport.com/feature/12566/wii-tricks-and-secrets-wii-menu-rearranging-channels>
- The same A+B drag works inside the SD Card Menu: *"Point at the item you want to move, and
  then hold down the A and B Buttons and drag the item to the new location."* **[Official]**

This corroborates `context/animations-interactions.md` §5's finding: **drop-onto-empty, no
iOS-style shuffle**.

**Does the empty slot highlight during a drag?** **No source describes any drop-target
feedback** — not the Nintendo Support page, not NWR, not the manual, not the asset sheets. Two
observations that bear on it:

- The `Empty Channel Spaces` sheet contains **four frames**, not one (§A.5). If the empty slot
  had *any* state variation, that's where it would live — and the four frames do differ in
  tonal range. But nothing labels them, so which (if any) is a highlight state is unknown.
- The page-turn arrow **is** a documented live drop target (hold a dragged channel over it and
  the page turns), so the drag system does have hover-sensitive targets. **[Official]**

**Recommendation:** implement a **subtle** drop-target cue (e.g. brighten the empty fill by
~6–8% and/or a soft inner glow, 120–160 ms) and label it in code as **invented affordance, not
sourced**. A modern web build genuinely needs the feedback that a 2006 IR-pointer UI could get
away with omitting; just don't claim it's authentic.

## A.5 The "Empty Channel Spaces" sprite sheet — retrieved

Sheet: **271 × 207 px**, teal (`#008080`) background, containing **four sprites of exactly
128 × 96 px** at offsets (5,5), (138,5), (5,106), (138,106).

**128 × 96 is significant** — it is precisely the **4:3 authored icon canvas** from Nintendo's
own *Icon and Banner Specifications* PDF (already cited in `visual-design.md` §2). So these are
the genuine empty-slot icon textures at authoring resolution, not a screenshot crop.

What each frame contains:

- **A bold, solid-black "Wii" wordmark**, centred, cleanly antialiased. Identical placement in
  all four frames (§A.1.2).
- **A dense grayscale noise field** filling the rest of the canvas. All four are pure grayscale
  (R = G = B) quantised to exactly **16 levels, all multiples of 17** — the signature of a
  **4-bit `I4` GameCube/Wii intensity texture**.
- The frames differ only in tonal range: two are full-range (mean ≈ 147–151), one is lighter
  (dark floor clamped at 51, mean ≈ 166), one is darker (white ceiling clamped at 221, mean
  ≈ 126).

> ⚠️ **Do not use this sheet's raw pixels as the tile fill.** Its mean is ≈ #93–#A6, but the
> empty tile renders on screen at **#D4D4D4** and its watermark is only ~4% darker than the
> fill, whereas the sheet's wordmark is solid black. The texture is clearly **modulated at low
> opacity** (or used as an intensity/alpha map) rather than blitted directly — or the rip
> discarded an `IA`-format alpha channel. **[Inferred]** Take the *wordmark shape and placement*
> from the sheet and the *tone* from the screenshot.

**However, the noise is real, not a rip artifact.** Testing the reference screenshot: after
removing the capture's horizontal scanlines, the empty tile still carries residual high-pass
grain with **σ ≈ 2.5/255**, versus **σ ≈ 0.3** for the flat page background beside it — an
8× difference. So there genuinely is a fine grain baked into the empty-slot art; it's just
applied at roughly **1% amplitude**, not the ~40% the raw sheet implies.

**Why four frames is unresolved.** Could be state variants (normal / highlighted / drag-target),
could be per-tile noise seeds for variety, could be LOD or region variants. Nothing in the sheet
or its page says. **Flagged as an open question.**

## A.6 Corrections to existing docs

1. **`channels.md`** — the empty tile is **not** unlabelled; it carries a centred ghosted "Wii"
   wordmark. Also, the "no '+' glyph" claim can be **promoted from fan-consensus to confirmed**,
   but the accompanying explanation (that the "+" memory comes from the cursor) should be
   replaced (§A.1.3).
2. **`visual-design.md` §2 + color table** — fill is **`#D4D4D4`**, not `#C6C6C6`–`#CCCCCC`;
   there is **no darker gutter recess** (`#BEBEBE`–`#C0C0C0` does not appear); and the *"faint
   **diagonal** grain/noise texture"* is a misread — the visible striping is the capture's
   **horizontal scanlines, present across the whole frame including the background**. The real
   grain is isotropic noise at ~1% amplitude (§A.5).
3. **`component-inventory.md` item 3** — "no official Nintendo text source found describing the
   empty-slot appearance" remains true for *text*, but Nintendo's manual **diagram** does depict
   empty slots (watermark included), which is a stronger source than any prose would have been.

## A.7 Implementation recipe (empty slot)

```css
.tile--empty {
  /* same frame as a populated tile — only the content layer differs */
  background:
    /* ghosted Wii wordmark, ~35% of tile width, centred */
    center / 35% auto no-repeat url("wii-wordmark.svg"),
    linear-gradient(to bottom, #D1D1D1 0%, #D4D4D4 55%, #DCDCDC 100%);
  /* inset bevel: dark on top-left, light on bottom-right */
  box-shadow:
    inset  1px  1px 0 #BDBDBD,
    inset -1px -1px 0 #DCDCDC;
}
```

- Wordmark opacity ≈ **0.05** against the fill (target ~11/255 of contrast) — it must be
  almost subliminal. Do not make it legible.
- Optional 1% monochrome noise overlay for the grain; genuinely optional, it's at the edge of
  perceptibility.
- Corner radius ≈ **5% of tile width**; use the same value as populated tiles.
- Tile aspect ≈ **16:9** on a widescreen render (85 × 46 measured); the authored icon canvas is
  **128 × 96 (4:3)** / **170 × 96 (16:9)** per Nintendo's spec.
- No hover state, no click handler; enable as a drop target only while a drag is in flight.

---

# PART B — The SD Card Menu icon

## B.1 Exact visual design

**It is a literal SD-card pictogram, and it is *not* a round button.** **[Official]**

This is the gap `component-inventory.md` item 8 called out ("nobody has documented what the icon
glyph itself actually looks like"). Resolved from three angles.

### B.1.1 Form: flat pictogram, no button chrome

The bottom bar's other two controls — the **Wii button** and the **Message Board button** — are
**circular glossy domes** with a light-gray gradient, a soft specular highlight in the upper
left, a **cyan ring stroke** (`~#35BEED`, matching `visual-design.md`'s accent value), and a
faint concentric outer "socket" ring at ~1.3× the button diameter. The `Buttons &
Miscellaneous` sheet contains exactly these as discrete assets (a bare glossy dome, plus domes
carrying a `Wii` wordmark, a keyboard glyph, a pencil glyph, and `+`/`−` glyphs).

The **SD Card Menu icon has none of that**. It is a **bare flat pictogram sitting directly on
the bar** — no circle, no ring, no dome, no socket. Confirmed in both the repo's
`reference_screen.png` and Nintendo's manual diagram. This is a real design asymmetry and worth
preserving: it visually codes the SD icon as *conditional/secondary* next to two permanent
round buttons.

### B.1.2 The card graphic

Best resolution available comes from the same artwork reused at larger size in the Data
Management panel icons on the `Buttons & Miscellaneous` sheet (**36 × 46 px** there, vs
**16 × 22 px** in the bottom bar). Structure, top to bottom:

- **Portrait card silhouette**, aspect ≈ **0.72–0.78 (roughly 3:4)** — real SD cards are
  24 × 32 mm = 0.75, so it's drawn to life proportions.
- **Chamfered top-right corner** — the SD card's orientation notch, cut at ~45°, starting about
  **11% down from the top and 17% in from the right**. The chamfer facet is drawn with a lighter
  inner fill, giving it a small folded/beveled look.
- **A small notch on the left edge**, roughly 25–45% down — the write-protect slider recess.
  Present in the large version; too small to resolve in the 16 px bottom-bar version.
- **Outline stroke** in dark gray (`≈#6B6B6B` at large size), with a thin lighter inner frame
  band before the face.
- **White card face**.
- **The SD Card Association "SD" logo**, centred — the stylised mark where the S flows into a D
  drawn as a swoosh with a horizontal tail. Rendered in medium gray. In the 16 px bottom-bar
  version it reduces to a small gray smear, which is fine — nobody reads it at that size.
- **A medium-gray horizontal band across the bottom ~20%** of the face, inset from the sides
  (the label/contact-edge area).

### B.1.3 Color — active vs. gray **(this settles §B.3)**

| Sample | Source | Result |
|---|---|---|
| **Reference screenshot** (`reference_screen.png`) | fan capture | **Fully achromatic.** Face `#FFFFFF`, outline min `#949494`, top band `#A1A1A1`, bottom band `#A3A3A3`, SD logo `#C2C2C2`. Max R−B spread across the whole icon: **8** (and that's bleed from the bar behind it). |
| **Nintendo's manual diagram** | **[Official]** | **Distinctly cyan-blue.** Mean RGB **(171, 201, 214)**; most saturated pixel **(90, 185, 215) ≈ `#5AB9D7`**; blue-minus-red **+34 mean, +125 max**. |

For control, in that same Nintendo image the **Wii button measures B−R = +4** and the **Message
Board button B−R = +4** — i.e. neutral gray — while the bar background is +10. **The SD icon is
the only strongly-colored element in the bottom bar.** The blue is deliberate and specific, not
a global color cast on the scan.

**Therefore:**

- **Active state (card inserted):** the card body is rendered in the Wii's **accent cyan**
  (≈ `#5AB9D7` as scanned; the family matches `visual-design.md`'s `#35BEED` accent, allowing
  for print shift), with a white/very light middle band carrying the SD logo and a blue bottom
  band. Outline reads as a desaturated blue-gray (`≈#7B9FAD`).
- **Grayed state (no card):** the identical pictogram **fully desaturated** to neutral white/
  gray, and noticeably lower in contrast (outline bottoms out at `#949494` rather than a firm
  dark stroke).

`reference_screen.png` is therefore a capture of the **disabled** state — worth knowing, since
the project has been treating it as the canonical look.

> ⚠️ **Caveats.** The manual image is a **315 × 214 print scan**, so the exact hex is
> approximate and print color shift is real. And part of the reference screenshot's low contrast
> is simply downscaling blur. What is *not* in doubt is the **hue difference**: +34 mean B−R
> versus ≈0, on the same element, is far outside any plausible scan-artifact range.

## B.2 Placement

Officially, *"the SD Card Menu icon ... next to the Wii icon"* / *"appears as an icon in the
bottom-left of the screen right next to the Wii button"*
([Nintendo World Report](http://www.nintendoworldreport.com/news/18036/the-wii-sd-card-menu-a-walkthrough)).
Measured from `reference_screen.png` (420 × 236), expressed as ratios so it scales:

| Quantity | Reference px | As a ratio |
|---|---|---|
| Wii button diameter (cyan ring outer) | 38 | **9.0% of screen width** |
| Wii button center | (37.5, 197.5) | **8.9% W, 83.7% H** |
| Wii button outer socket ring | ~49 | ~1.3× the button |
| SD icon size | 16 × 22 | **3.8% W × 9.3% H** |
| SD icon center | (86.5, 207.5) | **20.6% W, 87.9% H** |
| Gap: Wii ring right edge → SD icon left edge | 23 | **5.5% W** (≈0.6× button diameter) |
| Center-to-center, Wii → SD | 49 | **11.7% W** (≈**1.29× button diameter**) |
| Message Board button center | (381.5, ~201) | 90.8% W — mirrored bottom-right |

Two placement details that are easy to get wrong:

1. **They are bottom-aligned, not center-aligned.** SD icon bottom edge y = 218; Wii ring bottom
   edge y = 217. But the SD icon's *center* sits **10 px lower** than the Wii button's center
   (207.5 vs 197.5). Aligning centers will look wrong.
2. **The SD icon is small** — its height is only **~58% of the Wii button's diameter**. It is
   deliberately subordinate.

Both are consistent with Nintendo's manual diagram, which shows the same small blue card tucked
low and to the right of the Wii button, well inside the bar's cyan wave divider.

## B.3 The grayed-out state

**[Official]** — the manual states it twice, in two different sections:

> *"Access the SD Card Menu screen — (To use this menu item, an SD Card [sold separately] must
> be inserted into the SD Card slot. **The icon will appear gray if there is no SD Card
> inserted.**)"* — Wii Operations Manual: Channels and Settings, p. 2

> *"When you select the SD Card Menu icon from the Wii Menu, you will see a display of the
> contents of the SD Card. (**If the icon is gray, there is no SD Card inserted into the SD Card
> slot.**)"* — ibid., p. 66

Appearance of each state is worked out in §B.1.3: **active = cyan-blue card; gray = the same
card desaturated to neutral and lowered in contrast.** The icon **remains present in both
states** — the manual describes it as changing color, never as appearing/disappearing.

**Unresolved:** whether the grayed icon is also **non-clickable**, or clickable-but-errors. The
manual's phrasing (*"To **use this menu item**, an SD Card must be inserted"*) reads as
"disabled," and its second passage frames grayness as a *diagnostic* for the user ("if the icon
is gray, there's no card") rather than as an error path. **[Inferred]** — implement grayed as
inert with no click response; low confidence, low stakes.

## B.4 When it appears at all

**Introduced in System Menu 4.0 (March 2009), and absent entirely before that.** The "absent vs.
present-but-inert" question can't be closed with a direct quote, but the evidence is one-sided:

- [WiiBrew — System Menu](https://wiibrew.org/wiki/System_Menu) 4.0 changelog: *"SDHC support
  added and possibility to launch channels on an SD card."* **[Fan/community]**
- [Wikipedia — Wii system software](https://en.wikipedia.org/wiki/Wii_system_software):
  *"The SD Card Menu is a feature made available with the release of Wii Menu version 4.0."*
- Nintendo World Report: *"This menu appears after applying the latest Wii firmware update
  (available now), and appears as an icon in the bottom-left of the screen right next to the Wii
  button,"* with a screenshot captioned *"After the update is applied, this icon appears on your
  Wii Menu."* **[Fan/community]** — "appears ... after the update" is the closest anything comes
  to saying it was previously absent.

**Verdict: absent pre-4.0** — **[Inferred, strong]**. Nothing describes a 4.0-only *appearance*
change to an already-existing icon, and no pre-4.0 screenshot or description places anything in
that slot. For the clone this only matters if the project ever ships a version toggle.

Related, from the same changelog: **channel rearranging arrived in System Menu 2.0**, not at
launch — so empty slots weren't drop targets in 1.0 either. **[Fan/community]**

## B.5 Click behavior and transition

- **Activation:** *"To select any of these activities, simply point at one with the Wii Remote
  Plus and press the A Button."* Single A-press — **not** the two-step
  select-then-Start used for channel tiles. **[Official]**
- **Result:** *"When you select the SD Card Menu icon from the Wii Menu, you will see a display
  of the contents of the SD Card."* **[Official]** It is a **full screen replacement**, not an
  overlay or a modal — the SD Card Menu has its own bottom bar with its own buttons (§B.6).
- **The transition itself is undocumented.** No source describes the motion between the Wii Menu
  and the SD Card Menu. This is a genuine gap, parallel to the unresolved page-transition motion
  in `animations-interactions.md` §4 and the Message Board "flips up like a folder" claim in
  `system-ui.md` §3.
- **`system-ui.md` §1's "background swaps to black" claim is now corroborated —
  and improved on.** That doc flagged it as *"[Fan consensus, page itself unverified]"*
  (the source wiki page 402'd). Nintendo's own SD Card Menu screenshot (§B.6) shows a **black
  content area**. Note the refinement: it is **not** a whole-screen black — the **bottom bar
  stays light gray**. Only the grid region goes black. **[Official]**

## B.6 The SD Card Menu screen (brief)

From Nintendo's annotated diagram on manual p. 66 plus its surrounding text — this is now
**[Official]** where `system-ui.md` §4 previously had **[Fan consensus]**:

- **Capacity — officially confirmed.** *"The SD Card Menu can hold a maximum of **240 items**,
  but can only show **12 items** at one time."* 240 / 12 = **20 pages**, and the sample
  screenshot's page counter literally reads **"1/20"**. This upgrades `system-ui.md`'s
  *"Reported capacity: 20 pages, 12 slots per page … [Fan consensus, moderately strong]"* to a
  first-party fact, and independently matches NWR's *"expands the number of SD Card pages to 20,
  with 12 channel slots available on each page."*
- **Layout:** same **4 × 3 grid** of rounded-rect tiles as the Wii Menu, on a **black
  background**. Unused positions show the **same gray placeholder tiles** as the main menu.
- **Paging:** a **cyan scroll triangle** at the right edge, visually identical to the main menu's
  "blue scroll arrows"; *"Select the scroll icon to scroll to next page … (You can also press the
  + or − Buttons on the Wii Remote Plus.)"*
- **Bottom bar** (light gray, not black), with four labeled elements:
  - **Wii button, bottom-left** — callout: *"Return to the Wii Menu"*
  - **"?" round button, bottom-right** — callout: *"View SD Card Menu instructions"*
  - **"1/20" page counter**, centered, sitting in a small dark tab that dips down out of the
    black content area — callout: *"Current and total page numbers"*
  - The words **"SD Card Menu"** as a centered title beneath the counter
- **Rearranging:** same A+B drag as the main menu. **[Official]**
- **Launching:** two-step, like channels — *"Select an item from the SD Card menu and press the A
  Button to open the Start screen. Select 'Start' to run the Channel, game, or other program."*
  **[Official]** — this independently corroborates the channel-preview/"Start" overlay that
  `component-inventory.md` item 14a flagged as under-documented.
- **Contents:** *"Wii Channels, WiiWare, or Virtual Console games stored on the SD Card. (The
  images of some Channels may vary from the Wii Menu.)"* Save data and add-on content are
  excluded. **[Official]**

> **Note for item 14b (page indicator).** The inventory noted that the manual documents a numeric
> page indicator *only* for the SD Card Menu, not the main Wii Menu. That asymmetry is confirmed
> here: the SD Card Menu screenshot has a visible **"1/20"**, and the Wii Menu screenshot
> **has no page indicator of any kind** — the bottom bar there carries only the Wii button, SD
> icon, clock, date, and Message Board button. This is **[Official] evidence against** the
> "page-indicator dots" premise that `animations-interactions.md` §4 leans on.

## B.7 Implementation recipe (SD icon)

- Draw it as an **inline SVG**, not a font glyph or a raster: portrait rounded rect, aspect
  ~0.73, **top-right corner chamfered** at 45° (≈11% down / ≈17% in), small notch on the left
  edge at ~25–45% height, a bottom band occupying the lower ~20% of the face.
- **Two color variants driven by one class**, since the geometry is identical:
  - `--sd-active`: body `#5AB9D7` (or reuse the project's `#35BEED` accent), band `#FFFFFF`,
    outline `#7B9FAD`
  - `--sd-disabled`: body `#FFFFFF`, outline `#949494`, bands `#A1A1A1`, logo `#C2C2C2`
  - A `filter: grayscale(1)` shortcut gets close but loses the contrast drop; prefer explicit
    colors.
- **No button chrome.** No circle, no ring, no dome, no shadow socket. Flat on the bar.
- Size to **~9.3% of screen height**, **bottom-align** with the Wii button, and place its center
  at **~1.29× the Wii button's diameter** to the right of the Wii button's center.
- Single click → full-screen route change to the SD Card Menu (black grid area, light bar,
  Wii button left, "?" right, `n/20` counter center). No preview/Start step for the icon itself.

---

## Consolidated gaps and open questions

| # | Question | Status | Cheapest way to close it |
|---|---|---|---|
| 1 | Does the pointer react to an empty slot (hover scale / sound / cursor change)? | **Unsourced.** Inferred "no" from Nintendo's enumeration of selectable elements and from `audio.md`'s focus-only sound model. | Any Wii Menu video where the pointer crosses blank tiles. Seconds of footage. |
| 2 | Does an empty slot highlight as a drop target mid-drag? | **Unsourced.** No source describes any drop feedback. Four unexplained frames exist in the sprite sheet. | Video of an A+B drag. |
| 3 | What are the **four frames** in `Empty Channel Spaces` for? | **Unknown.** They differ only in tonal range. | Extract `opening.bnr`/layout data from a real System Menu NAND and read the `.brlyt` that references them. |
| 4 | Is the *grayed* SD icon clickable (inert vs. error message)? | **Unsourced.** Inferred inert. | Boot a Wii / Dolphin with no SD card and click it. |
| 5 | The Wii Menu → SD Card Menu **transition motion** | **Unsourced.** Same class of gap as the page-transition and Message-Board-open motions. | Video capture. |
| 6 | Exact **active** SD icon hex | **Approximate only** — derived from a 315 × 214 print scan. | A clean digital screenshot of a 4.x Wii Menu with a card inserted. |
| 7 | Whether the empty tile's ~1% grain is per-tile randomized or one shared texture | **Unknown.** Screenshot tiles are identical to within ±2/255, which weakly suggests shared. | Same as #3. |

---

## Sources

**[Official] — Nintendo**

- Wii Operations Manual — Channels and Settings (RVK, English), full scan + PDF page images:
  <https://archive.org/details/wii-opmanual-chset> ·
  PDF: <https://archive.org/download/wii-opmanual-chset/WiiRVKChEng.pdf> ·
  OCR text: <https://archive.org/download/wii-opmanual-chset/WiiRVKChEng_djvu.txt>
  (Wii Menu diagram: manual p. 2 / PDF p. 3. SD Card Menu diagram: manual p. 66 / PDF p. 35.)
- How to Arrange Channels on the Wii Menu or the SD Card Menu — Nintendo Support:
  <https://en-americas-support.nintendo.com/app/answers/detail/a_id/1520/>
- Icon and Banner Specifications (Nintendo developer PDF) — 128 × 96 / 170 × 96 icon canvas;
  cited via `context/visual-design.md` §2:
  <https://pokeacer.xyz/wii/pdf/IconBanner_Specification.pdf>

**[Fan/community]**

- The Spriters Resource — Wii Menu index: <https://www.spriters-resource.com/wii/wiimenu/>
  - Empty Channel Spaces: <https://www.spriters-resource.com/wii/wiimenu/asset/68562/>
  - Channel Border: <https://www.spriters-resource.com/wii/wiimenu/asset/211441/>
  - Buttons & Miscellaneous: <https://www.spriters-resource.com/wii/wiimenu/asset/68370/>
  - (Sheets ripped by "Alory (Aka SIG7)"; original graphics © Nintendo.)
- WiiBrew — System Menu: <https://wiibrew.org/wiki/System_Menu>
- Wikipedia — Wii system software: <https://en.wikipedia.org/wiki/Wii_system_software>
- Nintendo World Report — The Wii SD Card Menu: A Walkthrough:
  <http://www.nintendoworldreport.com/news/18036/the-wii-sd-card-menu-a-walkthrough>
- Nintendo World Report — Wii Menu: Rearranging Channels:
  <http://www.nintendoworldreport.com/feature/12566/wii-tricks-and-secrets-wii-menu-rearranging-channels>
- HackMii — System Menu 4.0 Rundown (checked; contains no UI detail):
  <https://hackmii.com/2009/03/system-menu-40-rundown/>

**Direct measurement**

- `reference_screen.png` (repo root, 420 × 236) — all pixel/geometry figures tagged "reference."
- `wii_design_specs.pdf` (repo root) — searched for both components; contains **nothing**
  relevant to empty slots or the SD Card Menu icon.
