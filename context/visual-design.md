# Wii Menu — Visual Design Reference

Research reference for the fan-made React recreation of the Nintendo Wii "Wii Menu" (System
Menu) — this doc focuses specifically on **visual design**: layout, tile appearance, color,
typography, chrome, and pixel dimensions. It complements (and avoids re-deriving) the existing
`context/technical-specs.md` (resolution/framerate/font/aspect-ratio deep dive) and
`context/channels.md` (per-channel functional/content reference).

**Primary sources used, in order of authority:**

1. **`wii_design_specs.pdf`** (project root) — a leaked/archived Nintendo internal developer
   document, *"Icon and Banner Specifications," version 1.0.0, doc # RVL-06-0166-001-L,
   © 2005–2008 Nintendo, marked CONFIDENTIAL*. This is the closest thing to an **official
   primary source** available for this project: it's Nintendo's own spec sheet telling
   third-party channel developers exactly how to author Wii Menu icon/banner art. Cited below
   as **"Nintendo Icon/Banner Spec PDF, §X.X."**
2. **`reference_screen.png`** (project root) — an authentic Wii Menu screenshot. Cited below as
   **"reference screenshot"**, with pixel coordinates/hex values sampled directly from the file
   using Python/PIL during this research pass so they can be independently re-verified.
3. Fan wikis, Nintendo Support pages, and general web search — cited inline with URLs. Much of
   the Wii Menu's fine visual detail (hover states, loading-strip animations, exact chrome hex
   values) turns out to be **poorly documented in text form anywhere on the web** — it lives in
   people's visual memory of the hardware, not in write-ups. Where that's the case, it's flagged
   explicitly as **unconfirmed / no citable source found** rather than presented as fact.

---

## 0. Important correction before anything else: which era does the reference screenshot show?

The reference screenshot has an **SD card icon** in the bottom bar next to the "Wii" button.
Per `context/version-history.md` (sourced from WiiBrew), the SD Card Menu and its associated
bottom-bar icon were only **added in System Menu 4.0 (March 25, 2009)** — before that there was
no SD card affordance on the main Menu screen. That means:

- `reference_screen.png` depicts the **System Menu 4.0+ (2009–2010) look**, not the November
  2006 launch-day look.
- The clock (bottom-center "12:00 AM") was added even earlier, in **System Menu 3.0 (Aug 6,
  2007)** — so a from-scratch, pre-3.0 Menu wouldn't have it either.
- Practical takeaway for the rebuild: treat the reference screenshot as authoritative for **the
  "late-era," most-remembered Wii Menu look** (this is almost certainly what most visitors
  picture when they think "Wii Menu"), not literally the day-one 2006 UI. No source found this
  session documents a *color/theme* change between versions (e.g. no evidence of a "blue era"
  vs. "white era" repaint) — only that bottom-bar icons were added incrementally as features
  shipped. Treat any claim of a distinct earlier color scheme as **unconfirmed**.
- The reference screenshot's own pixel dimensions are **420 × 236 px** (confirmed via `file` and
  PIL) — an aspect ratio of 1.780, i.e. it is a **16:9-mode capture**, not 4:3 (1.778 target vs.
  1.333 for 4:3). Every pixel measurement taken from it in this doc (tile size, gutters, etc.)
  is therefore a **16:9-mode measurement** — see §7 for how that maps to Nintendo's documented
  4:3 vs. 16:9 canvas sizes.

---

## 1. Overall layout / grid

- **Grid shape**: a fixed **4 columns × 3 rows = 12 channel slots per page**. Nintendo's own
  developer doc confirms this exactly, captioned under a diagram of the Menu: *"When Wii is
  started, 12 Channels, 4 Channels wide X 3 Channels high are displayed"* (Nintendo Icon/Banner
  Spec PDF, §1, Figure 1-1). This corroborates the fan-sourced figure already in
  `context/channels.md` (4×3 grid, 4 pages, 48 slots total, Wikipedia/handwiki).
- **Disc Channel placement**: permanently fixed to the **top-left slot**, and is the *only* tile
  that cannot be moved — Nintendo's own doc states it plainly: *"The Channels can be freely
  arranged, except for the Disc Channel in the upper left"* (Nintendo Icon/Banner Spec PDF, §1,
  Figure 1-1). This is now confirmed by both an official source and fan wikis.
- **Reference screenshot's actual page-1 population** (visually confirmed): row 1 = Disc
  Channel, Mii Channel, Photo Channel, Wii Shop Channel; row 2 = Forecast Channel, News
  Channel, then two empty slots; row 3 = four empty slots. This matches the "6 primary
  channels" default set documented in `context/channels.md`.
- **Paging**: pages are flipped with the **+ / − buttons** on the Wii Remote (or D-pad)
  (`context/channels.md`, Wikipedia). Visually, the reference screenshot shows a small solid
  **cyan right-pointing triangle/chevron** floating at the right edge of the grid, vertically
  centered around row 2 (sampled around x≈395, y≈85 in the 420×236 image) — this is the
  "more pages this way" affordance. No left-pointing arrow is visible in the reference
  screenshot because it depicts **page 1** (no previous page exists); a mirrored left arrow on
  pages 2–4 is a reasonable inference but **not directly confirmed** by this screenshot.
- **Grid framing / margins**: measured from the reference screenshot, the 4-column tile grid
  spans roughly **x = 36 to x = 401 out of 420px width** (~87% of screen width), leaving
  roughly **6–7% margin on each side** — consistent with the general CRT-era "action-safe"
  design convention already discussed in `context/technical-specs.md` §6, though no
  Nintendo-published exact margin spec was found (same gap flagged there applies here).
- **Grid "recess"**: the area directly behind the tile grid (the gutters between tiles) reads as
  a slightly darker gray (~`#BEBEBE`–`#C0C0C0`, sampled) than the page background outside the
  grid (~`#E4E4E4`–`#EFEFEF`, sampled) — i.e. the whole grid sits on a subtly recessed panel,
  not directly on the page background. This is a screenshot observation, not sourced from text.

## 2. Channel tile appearance

- **Shape**: a **rounded rectangle** with a moderate corner radius, a thin gray keyline/border
  stroke, and a soft drop shadow beneath the tile giving it a slightly raised "card" look. This
  was confirmed by cropping and 8×-zooming the Disc Channel tile from the reference screenshot
  (see analysis below) — it reads as a conventional rounded-rect card, **not** a strongly
  barrel-distorted/concave "pillow CRT" shape. **Flag**: fan discourse (including this brief's
  own framing) often describes Wii Menu tiles as having an exaggerated concave/pillow "CRT"
  curvature; pixel inspection of the actual reference screenshot does not obviously support a
  strong barrel/pillow distortion — it looks like a normal `border-radius` rounded rectangle
  with a bottom drop-shadow/reflection. Treat "pillow CRT" as **fan consensus / visually
  overstated**, not something to over-engineer in CSS.
- **Size & aspect**: tiles measure roughly **84px wide × 45px tall** in the 420×236 reference
  capture (~1.87:1, landscape-oriented) — i.e. noticeably wider than tall. (Measured by
  horizontal/vertical pixel-transition scans of the reference screenshot; treat as
  screenshot-derived, not an official spec — see §7 for Nintendo's own authored-canvas numbers,
  which differ because they include extra bleed/safe-area margin baked into the source art.)
- **Spacing/gutters**: roughly **10–12px horizontal gutter** between columns and a tighter
  **~4–5px vertical gutter** between rows, at the reference screenshot's scale — i.e. gutters
  are asymmetric, tighter vertically than horizontally. Screenshot-derived, not officially
  documented.
- **Official authored-icon canvas** (this is the part actually specified by Nintendo): each
  channel's Menu-tile artwork is authored as a **128×96 px** image in 4:3 mode, or **170×96 px**
  in 16:9 mode, centered on the layout origin, clipped to a rounded-rectangle mask (visually a
  rounded-rect "TV screen" cutout in Nintendo's own diagram) — see §7 for the exact safe-area
  numbers (Nintendo Icon/Banner Spec PDF, §2.1, §2.3, Figures 2-1/2-2).
- **Animation is mandatory, not optional**: Nintendo's spec explicitly prohibits static tiles —
  *"Use of still image icons for which animation has not been set is prohibited"* (Nintendo
  Icon/Banner Spec PDF, §2.5). Every real channel tile on a real Wii Menu is therefore always
  animating in some loop, even if subtly (e.g. a slow shimmer/idle motion) — useful ammunition
  for the React rebuild: **no channel tile should ever be a fully static image**, even at rest.
  (Icons loop a single frame range; full-screen banners can additionally use separate "Start"
  → "Loop" animation-tag segments, e.g. a trademark/logo intro that plays once before the
  looping idle state — Nintendo Icon/Banner Spec PDF, §3.6, Figure 3-5.)
- **Empty slot tiles**: flat, unlabeled, medium-gray rounded-rect (~`#C6C6C6`–`#CCCCCC`,
  sampled) with a **faint diagonal grain/noise texture** and, distinctly, a **faint ghosted
  "Wii" wordmark watermark** visible inside several empty tiles in the reference screenshot
  (visible on close zoom — a light gray-on-gray "Wii" logo, barely legible, centered in the
  tile). This directly confirms/refines the "fan consensus" flagged as unverified in
  `context/channels.md` (that empty tiles are plain gray placeholders) — the reference
  screenshot shows they are **not** perfectly blank; they carry a subtle Wii-branded watermark
  texture. No "+"-style insert glyph is visible.
- **Disc Channel (no disc) tile**: glossy near-white tile (`#ECECEC` top fading to `#E3E3E3`
  toward the bottom, sampled) containing a chrome/silver disc graphic with a radial specular
  highlight and a soft shadow/reflection ellipse beneath it — consistent with
  `context/channels.md`'s sourced description of an animated spinning/glinting disc graphic.
- **Hover/select state**: **not visible in the static reference screenshot** (no tile is shown
  in a highlighted state) — this is a genuine gap. `context/channels.md` (WiiBrew-sourced)
  states that selecting a tile "enlarges/highlights it and plays its ambient animation/sound
  preview," which is the best-sourced behavioral description available; exact scale factor,
  glow color, and transition timing are **unconfirmed / no citable source found** this session.
  Recommend verifying against Wii Menu gameplay-footage video before pixel-matching a
  hover/select treatment.
- **"Loading strip" for newly downloaded channels**: **no source was found** describing this
  detail in citable text form (searched specifically this session). It is a real, commonly
  remembered feature, but treat any specific implementation (colors, diagonal stripe pattern,
  duration) as **unconfirmed** absent a screenshot/video reference. Related, and *is* sourced:
  Nintendo's own "New group" / "Newly Arrived" animation-tag feature, which plays a distinct
  animation overlay on a channel's icon when that channel receives a new WiiConnect24 message
  (not the same as a fresh-download loading state, but the closest documented "icon overlay
  animation" mechanism) (Nintendo Icon/Banner Spec PDF, §2.9, Figure 2-11).

## 3. Color palette

**Correcting a likely misconception up front**: the background of the actual on-screen Wii Menu,
per direct pixel sampling of the reference screenshot, is **not** a strong blue wash. It's a
near-white, neutral light gray. Blue appears only as a **targeted accent color** (button rings,
a curved divider line, and specific channel tiles like Forecast/Shop) — not as the page
background. If "the signature Wii blue background" is the mental image being targeted, that
likely conflates the **Wii console/box branding blue** with the **Menu UI**, which reads as
gray/silver/white in an actual screenshot. Flag this clearly for design decisions.

All values below were sampled directly from `reference_screen.png` using PIL (coordinates given
so they can be re-checked); **no official Nintendo-published hex values for Menu UI chrome were
found**. The closest thing to an "official" Wii color found is from a brand-color aggregator,
which itself admits it's an approximation:

> "Grey: #8A8A8A ... These color values have not been given explicitly in the Wii brand
> guidelines. They are, however, the closest numbers based on the official color codes
> provided." ([BrandColorCode.com — Wii](https://www.brandcolorcode.com/wii))

### Sampled swatches (reference screenshot, 420×236px capture)

| Element | Approx. hex | Notes |
|---|---|---|
| Page background (outside grid) | `#E4E4E4`–`#EFEFEF` | Light neutral gray, very slight warmth; not blue |
| Grid gutter/recess background | `#BEBEBE`–`#C0C0C0` | Sits slightly darker than page background |
| Disc Channel tile fill | `#ECECEC`→`#E3E3E3` | Subtle top-to-bottom gradient (glossy card look) |
| Empty slot tile fill | `#C6C6C6`–`#CCCCCC` | Flat gray + faint grain + ghosted "Wii" watermark |
| Forecast Channel tile | `#0097E9` (top-left) → `#001698` (bottom-right) | Diagonal gradient, bright cyan-blue to deep navy — the closest thing to "Wii blue" actually on screen |
| News Channel tile | `#236D21`–`#287115` | Forest/hunter green, with a lighter green world-map line-art overlay |
| Photo Channel tile header | `#DD924F`–`#E38F47` | Warm terracotta/orange "corkboard" header band above live photo thumbnails |
| Wii Shop Channel bag icon | `#458CFF` | Bright cornflower-blue shopping-bag glyph on white tile |
| Bottom bar background | `#CECFD2` (edges) → `#F0F0F0` (center) | Soft light-gray gradient, brightest near the wave's center dip |
| **Accent cyan-blue** (wave divider line + button ring strokes) | **`#35BEED`** (rgb 53,190,237) | Found by scanning for the most saturated blue pixels along the bottom-bar divider and the "Wii"/envelope button rings — this is the single most Wii-blue-looking value actually present in the UI, used sparingly as a stroke/accent, not a fill |
| Clock/date text | `#C3C4CB`–`#EFEFEF` range (anti-aliased) | Mid-gray, not black — soft, low-contrast text typical of the Menu's UI |

**Practical takeaway for the rebuild**: use light neutral gray/off-white (`#E4E4E4`–`#F2F2F2`
range) as the dominant background, reserve the bright cyan-blue (`~#35BEED`) strictly for
accent strokes (button rings, the wave divider, focus/selection glows), and let individual
channel tiles carry their own distinct brand colors (blue Forecast, green News, orange/warm
Photo, etc.) rather than tinting the whole page blue.

## 4. Typography

This builds on `context/technical-specs.md` §4, which already establishes the core research
(repeated here only in summary — see that file for full sourcing):

- The Wii's system font (Menu, built-in channels, Virtual Console UI) is **Rodin NTLG**
  (Fontworks; "New Type Labo Gothic" kana + "Rodin" Latin), a rounded geometric sans, extracted
  from console WADs by the homebrew community as `WiiNTLG-Regular` ([List of Nintendo system
  fonts — NintendoWiki](https://niwanetwork.org/wiki/List_of_Nintendo_system_fonts), via
  `context/technical-specs.md`).
- **New finding this session** (minor historical trivia, single-source, low confidence): a
  font-identification project's post states that a pre-release build ("Ver.0.1") of the Wii
  Menu used **Futura Pro Bold Italic** as a placeholder UI font before Rodin NTLG was finalized
  — *"Ver.0.1 of the Wii's menu uses Futura Pro Bold Italic as a UI font. The final sans-serif
  typeface used in the Wii's OS was Rodin NTLG... The reason Futura was used (perhaps as a
  placeholder) is still unclear."* ([Fontendo on X](https://x.com/Fontendou/status/1318235395293937665)).
  Interesting as trivia; **not relevant** to recreating the shipped/known Menu, and not
  independently corroborated — flag as unconfirmed/single-source.
- **Official constraint on in-icon/in-banner text** (new, from the Nintendo dev doc): text
  boxes placed *inside* a channel's own icon or banner layout (e.g. a channel's name label
  baked into its tile art, like "Forecast Channel" / "News Channel" in the reference
  screenshot) are restricted to **two specific proprietary bitmap font files**:
  `data\fonts\wbf1.brfna` and `data\fonts\wbf2.brfna`, shipped as part of the official icon/
  banner authoring package — *"any other font is prohibited"* (Nintendo Icon/Banner Spec PDF,
  §2.7, §3.8). This confirms that even third-party/first-party channel developers didn't have
  free rein over typography inside their tiles — everything funnels through the same couple of
  system bitmap fonts, which is why all tile labels and system chrome text look visually
  consistent (same rounded sans family) across every channel.
- **Visual confirmation from the reference screenshot**: the clock ("12:00 AM"), date ("Fri
  1/1"), and channel-name labels ("Forecast Channel", "News Channel", "Photo Channel", "Wii
  Shop Channel") all render in a clean, medium-weight, rounded sans-serif with soft terminals —
  consistent with Rodin NTLG's known character (rounded, friendly, slightly geometric).
- **Recommended free web substitutes** (carried over from `context/technical-specs.md`, since
  Rodin NTLG is a commercial Fontworks license unsuitable for bundling in a public hobby
  project): **M PLUS Rounded 1c**, **Quicksand**, **Comfortaa**, **Baloo 2**, **Varela Round**,
  **Nunito** (Google Fonts). M PLUS Rounded 1c is the closest to Rodin NTLG's specific
  rounded-Japanese-capable geometry if kana-adjacent styling matters.

## 5. Bottom bar visual design

Directly observed in the reference screenshot (System Menu 4.0+ era — see §0):

- **Wave/scallop-shaped divider**: a curved cyan accent line (`#35BEED`, sampled) separates the
  channel grid area above from a light-gray gradient bar below. The curve dips down toward each
  of the two corner circular buttons and arcs upward toward the center where the clock sits —
  giving the bottom bar a signature "scalloped shelf" silhouette rather than a straight edge.
  This is a purely decorative/structural divider, not itself interactive.
- **Bottom-left**: a circular button with a cyan ring-outline and light-gray fill, labeled
  **"Wii"** — this is the system options/settings entry point.
- **Immediately right of the Wii button**: a small flat gray **SD card slot icon** (a simplified
  SD-card silhouette glyph, no ring/circle around it, smaller and plainer than the two
  corner buttons). As noted in §0, this icon's presence dates the reference screenshot to
  **System Menu 4.0 or later** (added alongside the SD Card Menu feature,
  `context/version-history.md` / WiiBrew).
- **Center**: a large clock reading **"12:00 AM"** in soft gray, with the smaller-size AM/PM
  suffix, and the date **"Fri 1/1"** in matching gray directly beneath it. Per
  `context/version-history.md`, the clock itself was introduced in **System Menu 3.0 (Aug 6,
  2007)** — a from-scratch "launch era" recreation shouldn't include it, but the reference
  screenshot's era should. Time format is region-dependent: 12-hour with AM/PM for the
  Americas, 24-hour for Europe (general web-search corroboration, no single authoritative
  Nintendo doc fetched directly this session for the exact regional rule — treat as
  well-corroborated but not primary-sourced).
- **Bottom-right**: a circular button, cyan ring-outline, light-gray fill, containing a flat
  gray **envelope glyph** — opens the **Wii Message Board**. Per `context/version-history.md`
  (WiiBrew-sourced), starting in System Menu 3.0 this button **flashes/animates when a new
  message arrives** — not observable in the static reference screenshot (no new-message state
  present), so treat the flash behavior as sourced-but-unverified visually.
- **Bar fill styling**: a soft light-gray gradient, roughly `#CECFD2` near the outer edges
  brightening toward `#F0F0F0` near the wave's central dip — it reads as a mostly **opaque**
  brushed-metal/glossy gray panel in the reference screenshot, **not** obviously
  semi-transparent. Flag this as a correction to the brief's premise: pixel sampling doesn't
  show a see-through/translucent bar in this screenshot; if a translucent look is desired for
  the web version it would be a deliberate stylization rather than a faithfully sourced detail.
- **Health & Safety / general Settings icon**: **not present as its own bottom-bar icon** in
  the reference screenshot or in any sourced material found this session. The Health & Safety
  screen is a separate full-screen warning shown once at console power-on, *before* the Wii
  Menu loads (general web-search corroboration) — it is not a persistent bottom-bar button.
  General system Settings is reached via the **"Wii" button** (bottom-left), not a distinct
  icon. **Wii Speak**: no dedicated bottom-bar icon found either — Wii Speak is a peripheral
  configured through Wii Settings, not represented with its own permanent Menu-bar glyph as far
  as sourced material shows. Treat the brief's assumption of five distinct bottom-bar icons
  (remote-sync / message board / Wii Speak / SD card / Health & Safety) as **not matching** what
  the reference screenshot and sourced material actually show — the confirmed, visually present
  set is: **Wii (options) button, SD card icon, clock/date, Message Board (envelope) button**,
  plus the decorative wave divider. Wii Remote sync is a **physical console button** (under the
  SD slot cover, held 15 seconds) rather than an on-screen Menu icon at all (general web-search
  corroboration).

## 6. Corner / decoration details

- **Disc slot light**: this is a **physical console LED**, not a rendered Menu-UI graphic. It
  blinks blue when WiiConnect24 receives new data, and is user-adjustable to Bright / Dim / Off
  via *System Settings → WiiConnect24 → Slot Illumination* ([How to Adjust the Disc Slot
  Illumination — Nintendo Support](https://en-americas-support.nintendo.com/app/answers/detail/a_id/2705/~/how-to-adjust-the-disc-slot-illumination)).
  Also, starting System Menu 3.2 (Feb 2008), the disc slot LED reportedly signals new
  WiiConnect24 data received mid-game (`context/version-history.md`, WiiBrew-sourced). **For
  the web rebuild**: since there's no physical disc slot to light up, any "glow near the disc
  slot" effect would need to be a deliberate stylistic simulation (e.g. a subtle blue glow
  animation near the Disc Channel tile) rather than a documented on-screen Menu element —
  flag clearly that this is hardware behavior being adapted, not a UI element being reproduced.
- **Wii Points / Shop balance display**: **not present on the main Wii Menu screen** in the
  reference screenshot, and no sourced material found this session places it there. Search
  summaries indicate the points balance displays **inside the Wii Shop Channel itself** (at the
  bottom of that channel's own screen, selectable to add more points) — i.e. it's a Shop
  Channel-internal UI element, not a persistent Wii Menu HUD item. **Correcting the brief's
  premise**: do not add a persistent points balance to the Menu grid itself unless
  intentionally taking creative license: this is not sourced as authentic. (No primary
  Nintendo source directly fetched for this — flag as search-snippet sourced, moderate
  confidence.)
- **Clock/date display location**: **corrects the brief's premise** — per the reference
  screenshot, the clock and date render **bottom-center** (on the curved bottom bar, under the
  grid), **not top-left**. See §5 for full detail. No top-left UI element is present in the
  reference screenshot at all; the top of the screen is just plain background above the grid.
- **Weather / news live-tile ticker text**: already well-covered in `context/channels.md` and
  not re-derived here — summary: since **System Menu 3.0 (Aug 6, 2007)**, the Forecast Channel
  tile shows a live current-conditions weather icon for the user's location, and the News
  Channel tile shows two scrolling headlines (three when highlighted), both driven by
  WiiConnect24 data and both fading/reverting to a placeholder message if the channel isn't
  opened regularly (`context/channels.md`, WiiBrew-sourced, §7–8 of that doc).
- **Page-turn arrow**: a small solid cyan right-pointing triangle/chevron sits at the grid's
  right edge (see §1) — the clearest and simplest "more content this way" affordance visible in
  the reference screenshot; visually minimal (no circle/button chrome around it, just a
  flat triangle glyph, semi-glossy).

## 7. Pixel dimensions / resolution — what's actually documented

This section adds hard numbers on top of `context/technical-specs.md` §1 and §7 (which cover
the console's overall 640×480-territory output and the "don't try to hard-target 640×480 in a
responsive rebuild" recommendation — not repeated here). What's new in this pass is the
**authored-content canvas sizes Nintendo's own tooling actually targeted**, from the Icon/Banner
Spec PDF:

| Asset | 4:3 mode | 16:9 mode | Source |
|---|---|---|---|
| Channel icon (Menu tile) full canvas | 128 × 96 px | 170 × 96 px | Nintendo Icon/Banner Spec PDF, §2.1/2.3, Fig. 2-1/2-2 |
| Channel icon "safe"/guaranteed-visible area (rounded-rect clip) | 120 × 88 px | 160 × 88 px | Same, Fig. 2-1/2-2 |
| Full-screen banner physical framebuffer (NintendoWare Viewer) | 608 × 456 px | 608 × 456 px | Nintendo Icon/Banner Spec PDF, §3.4.1, Code 3-1 (`fb_width`/`fb_height`) |
| Full-screen banner output/screen size (Viewer) | 670 × 456 px | 670 × 456 px | Same, Code 3-1 (`vi_width`/`vi_height`) |
| Full-screen banner visible content area (behind chrome/arrows) | 590 × 456 px | 810 × 456 px | Same, §3.4.2, Fig. 3-3/3-4 |
| Full-screen banner "safe" content band height (both modes) | 332 px tall | 332 px tall | Same, Fig. 3-3/3-4 |

Key implications:

- **The icon canvas is not square and not 4:3-locked** — in 16:9 mode Nintendo actually
  authored a **wider** (170px vs 128px) source image rather than just letting the console
  stretch a 4:3 image, *unless* a developer opts out via the "Target for position adjustment"
  layout flag, in which case the extra width is simply cropped instead of stretched (Nintendo
  Icon/Banner Spec PDF, §2.3, Figs. 2-4–2-7). This nuances the "the Wii Menu never reflows for
  widescreen, it just stretches" claim in `context/technical-specs.md` §3 — that claim is true
  at the **grid/page level** (still fixed 4×3, no extra columns), but **individual tile art
  itself** could be authored with real extra horizontal pixels for 16:9 rather than only being
  stretched. Worth reconciling if pixel-perfect tile art fidelity matters.
- **Full-screen banners target roughly 608–670px-wide × 456px-tall canvases** — noticeably
  *not* the commonly-cited "640×480." This is a real, documented internal target distinct from
  the raw EFB/XFB hardware numbers already covered in `context/technical-specs.md` §1. For a
  responsive web rebuild, this suggests treating the Menu's core composition as roughly a
  **~608–670 : 456** (≈ 1.33–1.47 : 1) canvas is closer to what Nintendo's own tools assumed
  than a strict 640×480 (1.33:1) or 16:9 (1.78:1) assumption — it's a hybrid, slightly-wider-
  than-4:3 "overscan-safe" working canvas.
- **The reference screenshot is 420×236px (16:9, 1.780 ratio)** — confirmed via direct file
  inspection. Any pixel measurements pulled from it in §1–§2 above (tile size ~84×45px, gutters,
  margins) are native to that specific 16:9 capture and would need proportional conversion if
  targeting a 4:3 composition instead.
- **PAL50 timing note** (bonus, not directly a "dimension" but adjacent and concretely sourced):
  on PAL consoles, the Wii Menu's icon/banner animations play back at **1.2× NTSC speed** to
  compensate for the 50Hz vs. 60Hz frame-rate difference, with Nintendo's own doc cautioning
  that animation frames shorter than "1.2 frames" may not visibly appear during PAL playback
  (Nintendo Icon/Banner Spec PDF, §2.6, §3.7). Not essential for a web clone (no NTSC/PAL
  concept applies), but useful confirmation that the 60fps-vsync inference in
  `context/technical-specs.md` §2 is correct and that Nintendo explicitly tuned for regional
  refresh-rate differences.
- **Sound is mandatory on full-screen banners**: *"Use of a silent banner for which no banner
  sound has been set is prohibited"* — every channel's full-screen banner must play a sound
  effect, starting when the "zoom-in" transition completes and fading out when "Wii Menu" is
  selected to back out (Nintendo Icon/Banner Spec PDF, §4, §4.2). Not a pixel/visual fact, but
  directly relevant to faithfully recreating the **banner-open transition** as an audio-visual
  moment, not just a visual zoom.

---

## Further reading / existing fan implementations

- [andrewplus/Wii.JS](https://github.com/andrewplus/Wii.JS) — an existing fan recreation of the
  Wii Menu using web technologies (found via search; not deeply inspected this session beyond
  its repo description, which notes a known implementation pitfall: **CSS `clip-path` has poor
  cross-browser consistency for the tiles' rounded-corner masking**, causing channel art to
  bleed outside the intended rounded-rect outline in some browsers — worth avoiding that
  specific pitfall (prefer `overflow: hidden` + `border-radius` on a wrapping element over raw
  `clip-path` polygons for tile masking).

---

## Summary of gaps / things flagged unconfirmed in this pass

- **Hover/select tile animation** (scale amount, glow color/intensity, transition timing) — no
  citable source found; only a general textual description ("enlarges/highlights, plays ambient
  animation/sound") exists via `context/channels.md`. Verify against video footage.
- **"Loading strip" for newly downloaded channels** — no citable source found at all this
  session; treat any specific visual as speculative until a screenshot/video reference is found.
- **Exact tile corner radius, gutter px values, tile aspect ratio** — derived by direct pixel
  measurement of the one available reference screenshot, not from any official spec; treat as a
  reasonable approximation, not ground truth, and note it's specifically a 16:9-mode capture.
  Official spec (§7 above) only documents the *authored icon/banner canvas*, not the *rendered
  on-screen tile chrome size* within the Menu grid itself — that gap could not be closed with
  available sources.
- **"Pillow/concave CRT" tile shape** — pixel inspection of the actual reference screenshot does
  not clearly show this; flagged as possibly an overstated/inaccurate popular description.
- **Whether the Wii Menu's color scheme changed across System Menu versions** (vs. only gaining
  new bottom-bar icons/clock over time) — no source found either confirming or denying a repaint;
  treat the reference screenshot's gray/white/cyan-accent palette as representative of the
  System Menu 4.0+ era specifically, per §0.
- **Bottom bar transparency** — sampled pixels show an opaque gradient panel, not obviously
  translucent; flagged as a likely correction to the brief's "semi-transparent bar" premise.
- **Regional clock format rule (12h Americas / 24h Europe)** — well-corroborated by general web
  search but no single primary Nintendo document was directly fetched confirming it this
  session.
- **Wii Points/Shop balance on the main Menu, and dedicated Wii Speak / Health & Safety
  bottom-bar icons** — actively **not** found in sourced material or the reference screenshot;
  flagged as likely incorrect premises from the original brief rather than as gaps to keep
  chasing.
