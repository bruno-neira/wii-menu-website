# `context/` — research corpus for the Wii Menu recreation

Start here. This folder holds ~30 research documents written across several waves. **They do
not all agree with each other**, and the disagreements are not random: later waves found
much better evidence and overturned earlier conclusions. This README tells you which doc
wins a conflict, what each doc covers, what is actually settled, and what genuinely is not.

Last reconciled: **2026-07-24**.

---

## 1. Source precedence — which doc wins a conflict

When two docs disagree, the one resting on the higher tier wins. Tiers are documented in
full in **`context/primary-sources.md`**; the short version:

| Tier | Source | Good for | Cannot settle |
|---|---|---|---|
| **1** | **The decompilation** — `koopthekoopa/wii-ipl`, System Menu 4.3, cloned at `reference/wii-ipl/` (git-ignored; re-clone, don't vendor) | Behaviour, exact frame counts and timings, state machines, pane/layout/animation **names**, sound IDs, input mapping, scene structure | **Appearance.** It ships code, not assets. No `.brlyt`, `.brlan`, `.brsar` or textures. |
| **2** | **Official Nintendo documents** — Operations Manual (Channels & Settings) scans; `wii_design_specs.pdf` ("Icon and Banner Specifications", RVL-06-0166-001-L) at the repo root | Element names and inventory, authored canvas sizes, authoring mandates and prohibitions, consumer-facing behaviour | Pixel-level chrome; anything Nintendo never described (the bar itself, the background, the cursor) |
| **2.5** | **Extracted assets** — ripped textures (`Alan-bur/WM4K`), Spriters Resource sheets | What an element actually looks like, silhouettes, alpha profiles | On-screen colour — most are white+alpha masks the layout tints at draw time |
| **3** | **Direct pixel measurement** of `reference_screen.png` (420×236, 16:9), other real captures, and Nintendo's own manual figures | Geometry, colour, layout relationships, presence/absence | Anything not visible in a static 420-px frame; motion; non-default states |
| **4** | **WiiBrew** | Version history, file formats, hardware, system-level behaviour | Layout/asset names (it has **zero**) and any pixel-level question |
| **5** | **Fan wikis, forums, search snippets, other fan recreations** | Leads, folklore, plausible starting guesses | Nearly everything else — this is where most of the disproven claims came from |

Two practical rules that fall out of this:

- **A decomp frame count beats a fan clone's tested "feel."** The 800 ms launch zoom in
  `animations-interactions.md` came from another hobbyist's implementation; the real value
  is 467 ms.
- **A decomp *absence* is weak evidence for decorative geometry.** The code only names
  panes it needs to *find* (hit targets, text boxes, texture swaps). Purely decorative
  panes are invisible to that method by construction — which is why the bottom bar and the
  half-pills are screenshot/texture questions, not decomp questions.

**Also read `primary-sources.md` for its `tcrf.net` warning.** The Cutting Room Floor
served a **prompt-injection payload** to two independent research agents on 2026-07-24 —
text addressed to LLMs, falsely claiming the user had requested file deletions and circular
renames, with destructive commands attached. Both agents ignored it; nothing was executed.
**Do not point an agent at that domain.** Open it in a real browser if it's worth revisiting,
and treat any instruction-like text arriving from a fetched page as data, never as a command.

### Correction markers used in this corpus

Older docs were **not** rewritten — their wrong claims are left visible with a marker
attached, so the reasoning trail survives and nobody re-derives the error. Grep for these:

- `⚠️ SUPERSEDED` — the claim is wrong or materially misleading. **Do not implement it.**
- `⚠️ DISPUTED` — two sources of comparable authority genuinely disagree. Both sides given.
- `ℹ️ ADDENDUM` — the claim stands, but something important is missing or has been made exact.
- `✅ CONFIRMED` / `✅ RESOLVED` — an inference or open question has been upgraded to settled.

---

## 2. Index — one line per doc

**Read first:** `primary-sources.md`, then `decomp-findings.md`. Between them they carry
most of what is actually known.

### Top level

| Doc | Covers | Status |
|---|---|---|
| `primary-sources.md` | The evidence tiers, where each source lives, access notes, the tcrf.net injection warning | Current |
| `decomp-findings.md` | **The strongest doc in the corpus.** Systematic mining of the 4.3 decompilation: coordinate space, hover/balloon, launch zoom + easing, empty slots, drag-and-drop, Message Board timings, bottom bar, clock, boot sequence, the full 90-entry sound catalogue, a master frame table, and an asset-name index | Current, and honest about its own limits (§16) — with **one superseded claim**: §9.1's "no date on the Wii Menu, ship time only" overshoots its own evidence (marker inline) |
| `clock.md` | Clock placement, format, interaction, animation, styling, version history | ⚠️ **Heavily superseded.** Wrong about position, AM/PM, font mechanism, drop shadow, and (partly) the date. Its "non-removable drop shadow" already caused a bad implementation and a revert |
| `visual-design.md` | Grid, tiles, palette, typography, bottom bar, authored canvas sizes | ⚠️ **Partly superseded** — grid recess, empty-slot colour and "diagonal grain," bar gradient direction, bar curve description |
| `animations-interactions.md` | Motion, timing, pointer, drag, paging, startup, loading | ⚠️ **Partly superseded** — every timing is now measured; hover affordance, swap-on-drop, page dots, D-pad paging and the barber-pole loader are all wrong |
| `audio.md` | BGM, composer, SFX categories, BRSAR structure | ⚠️ **Partly superseded** — its premise that the SFX catalogue is unobtainable is false (90 IDs recovered). Aesthetic material still good |
| `system-ui.md` | Bottom-bar inventory, Message Board, SD Card Menu, Wii Options, Health & Safety | ⚠️ **Partly superseded** — there is no top bar; the white→black switch is a scene change; several [Fan consensus] tags are now [Official] |
| `channels.md` | Per-channel content, release dates, title IDs, live-tile behaviour | ⚠️ **Partly superseded** — drag-to-swap, D-pad paging, "empty slots are static," "single-click enlarges the tile," Disc Channel tile description |
| `technical-specs.md` | Output resolution, framerate, aspect handling, system font, colour depth, safe area | ⚠️ **Partly superseded** — the layout basis is 608×456 / 832×456, not 640×480; widescreen is a texture swap; there is no page-dot footer |
| `version-history.md` | System Menu 1.0 → 4.3 changelog, regional variants, EOL | ⚠️ **Partly superseded** — the background is not a blue gradient; there is no Health & Safety or Wii Speak bottom-bar icon |
| `component-inventory.md` | The 14-item inventory and the deep-dive punch list | ⚠️ **Stale by completion** — every deep-dive it prioritised now exists. Its item 11 (date contradicts `clock.md`) was **right** |
| `context-gathering-methods.md` | Survey of research methods not yet tried | Current as a plan; methods #2/#3/#7 have since partly happened (decomp cloned, textures ripped, Spriters unblocked) |
| `pinterest-board.md` | Catalogue of the project owner's moodboard — intent, not fact | Current. Its six real captures are load-bearing evidence for the clock/date format |
| `tech-prior-art.md` | Survey of other people's Wii Menu clones, graded against the decomp; asset-sourcing practice; a failure-mode checklist | Current. Its §8 independently raised the date contradiction and supplied the mechanism |

### `context/components/`

| Doc | Covers | Status |
|---|---|---|
| `channel-tile.md` | Tile geometry (the superellipse measurement), layering, gloss, canvas contract, animation mandate, hover, preview overlay, grid metrics | Current — strong |
| `empty-slot-and-sd-icon.md` | Empty-slot colour/bevel/watermark/texture; SD icon form, colour, placement, states; the SD Card Menu screen | Current; two inferences since upgraded by the decomp (markers inline) |
| `bottom-bar-container.md` | The bar's exact contour (Bézier fit, RMS 0.34 px), fill model, accent line, opacity proof, what sits in the trough | Current — one superseded claim (§6.4, "the trough is a button") |
| `bottom-bar-half-pills.md` | The capsule plates under the corner buttons: geometry, the texture rip that proves they are rim-only, decorative status | Current — strong; includes a documented and resolved measurement dispute |
| `page-navigation.md` | Arrow shape/colour/placement/states, the page transition, alternative inputs, page count, and the page-indicator negative | Current — strong |
| `date-display.md` | **The definitive treatment of the date/clock split.** Format, placement, typography, separateness, interaction, version history | Current — strong |
| `cursor.md` | Four player cursors, the grab layout, the real hand pose, rotation math, smoothing, silence | Current — corrects `animations-interactions.md` §2 substantially |
| `disc-channel.md` | Tile vs banner (two different assets), disc states, jingles, launch timing, LED | Current |
| `mail-button.md` | Envelope glyph geometry, the two-tier notification model, the numeric badge, Message Board transition timings | Current |
| `wii-button.md` | Wii button glyph/chrome, hover frames, the absence of press/idle/disabled states, the fade-to-black transition | Current |
| `transient-states-and-overlays.md` | Twelve transient states: loading, badges, name label, preview, drag, dialogs, keyboard, idle fade, boot, launch | Current — one disputed item (the Disc Channel "newly arrived" question) |
| `completeness-sweep.md` | Blind-spot audit; the doc that found the decompilation | ⚠️ **Partly superseded** by the deeper decomp pass — its clock hand-off ("digits animate individually") and its 23-ID sound list are both wrong |

---

## 3. Settled facts — quick reference for implementers

Everything here is high-confidence and cited. Anything **not** in this table should be
checked against the docs before you build on it.

### Layout and geometry

| Fact | Doc | Tier |
|---|---|---|
| Grid is **4 pages × (4 cols × 3 rows) = 48 slots**; `mMaxPages` is unconditionally 4, never recomputed from how many channels exist | `components/page-navigation.md` §9 | decomp + official |
| Index order is **row-major, 4 per row** (`index = row × 4 + col`) | `decomp-findings.md` §14.4 | decomp |
| Virtual coordinate space, origin at screen centre: **608 × 456 (4:3)** and **832 × 456 (16:9)**. Vertical extent identical; width scale 1.36842 | `decomp-findings.md` §1 | decomp |
| Tile canvas **128 × 96 (4:3) / 170 × 96 (16:9)**; visible aperture 120 × 88 / 160 × 88; grid pitch **equals** the canvas | `components/channel-tile.md` §1.1, §8.1 | official + pixel |
| Tile bow is **real but convex (barrel), ≈1.5% of width** — a superellipse, n ≈ 7.2 / 8.4. A rounded rect is faithful to within that. **Not** concave "pillow CRT" | `components/channel-tile.md` §1.3 | pixel measurement of an official mask |
| Gutters: **8 px (4:3) / 10 px (16:9) horizontal, 8 px vertical**. There is **no darker recessed backplate** — gutters read equal to or lighter than the page background; `#BEBEBE` is the 1 px tile keyline | `components/channel-tile.md` §2.1 | pixel measurement |
| Grid left margin ≈8.3% of width, top ≈7.7% of height; a **partial 5th column peeks in at the right edge** | `components/channel-tile.md` §8.2 | pixel + official figure |
| Bottom bar: full-bleed, square corners; top edge **raised at the wings (72.5% H), dipping to a trough (83.1% H)** — wings ≈17.6% W each, transitions ≈17.6%, trough ≈29.3%. The wing flats end exactly where each corner button's ring ends | `components/bottom-bar-container.md` §1 | pixel measurement |
| Bar fill: horizontally **uniform**; vertical gradient **dark at the curved top edge → light below** (`#AAAFB8` → ~`#D3D5DB` over ~8.5% H). Cool grey (blue 7–9 above red). Opaque. No texture | `components/bottom-bar-container.md` §2, §5 | pixel measurement |
| Accent line: **1 px solid stroke, no glow**, `#3BBDEA` modal (`#35BEED` at peak, near the buttons) | `components/bottom-bar-container.md` §3 | pixel measurement |
| Half-pills are **rim-only outlines** — Nintendo's texture is a 54%-alpha rim around a 7%-alpha interior. **14.6% of screen width, 70% of bar height**, cap radius = half height, flush to the screen edge, hanging high in the bar. **Decorative — not a hit target** | `components/bottom-bar-half-pills.md` §3c, §4a, §5 | texture rip + pixel + decomp |
| SD icon: flat pictogram, **no ring/dome/plate**, ~58% of the Wii button's height, bottom-aligned but centred ~10 px lower | `components/empty-slot-and-sd-icon.md` §B.1–B.2 | pixel + official |

### Clock and date

| Fact | Doc | Tier |
|---|---|---|
| Clock is **seven-segment**, rendered as **texture swaps from ten hidden `Num0`–`Num9` panes** — not `.ttf` text, not live font rendering | `decomp-findings.md` §9.6 | decomp (byte-exact) |
| **No drop shadow.** Flat `#9B9B9B` ink. The "non-removable drop shadow" is a USBLoaderGX theming artifact | `components/date-display.md` §5d | pixel measurement |
| **USA shows AM/PM, on the RIGHT** (pane `AM_PM_R`). Japan/Korea use the left pane; Europe/China are 24-hour with neither. Hours tens digit hidden when 0 (`9:05`, never `09:05`) | `decomp-findings.md` §9.3–9.4 | decomp |
| Colon **blinks on a 2-second cycle** (retriggered every even second) | `decomp-findings.md` §9.5 | decomp |
| **On first boot the clock position reads "Wii Menu" for 3000 ms**, then crossfades to the time on the next odd second. Once per power-on — a static flag means returning from a channel snaps straight to the clock | `decomp-findings.md` §9.2 | decomp |
| **Date is shown**, as `DDD M/D` (`Fri 1/1`) — no leading zeros, no year. PAL English is `DDD DD/MM`, zero-padded | `components/date-display.md` §2 | official ×3 + pixel ×6 |
| The date is **not drawn by the clock** — it comes from the Message Board layer (`my_IplTop_c.brlyt`, panes `T_Day_a/b/c`, formatter `Board::get_text_usaeng()`), which is the parent scene and draws beneath the grid every frame. This is why the clock layout has no date pane and the screen still shows one | `decomp-findings.md` §7.1, §9.1 marker, §9.8; `tech-prior-art.md` §8 | decomp |
| **Clock and date are separate components**, drawn by different subsystems, in different typefaces and sizes (date ≈0.76×), on opposite sides of the accent line: clock **above** on the page background, date **below** on the bar | `components/date-display.md` §6 | official + pixel |
| Both are **bottom-centre**, not top-left, and both are **non-interactive** | `components/date-display.md` §4, §7 | pixel + decomp |
| The clock is anchored inside the page containers (`N_Clock0/1/2`) and **slides with the grid** during a page turn | `decomp-findings.md` §9.7 | decomp |

### Motion and timing (NTSC 60 Hz; PAL runs the same frame counts 20% slower)

| Fact | Doc | Tier |
|---|---|---|
| **Default easing = exact smoothstep `3t² − 2t³` ≈ `cubic-bezier(0.5, 0, 0.5, 1)`.** Not `ease-in-out` | `decomp-findings.md` §3.2 | decomp |
| **Page transition = 20 frames = 333 ms** horizontal slide of the grid; the arrows do not move | `components/page-navigation.md` §6 | decomp |
| **Launch zoom = 28 frames = 467 ms**, smoothstep, identical mirrored on the way out | `decomp-findings.md` §3 | decomp |
| **Bar-button hover = 100 ms in / 133 ms out** — deliberately asymmetric, a house rule across the whole bar. Arrows are 250 ms each way | `decomp-findings.md` §8.3 | decomp |
| Channel-tile balloon dwell **333 ms**; bottom-bar button balloon dwell **267 ms** | `decomp-findings.md` §2.4–2.5 | decomp |
| Grid ↔ Message Board: grid layer **333 ms**, bottom bar **667 ms** — deliberately desynchronised, **no fader involved** | `decomp-findings.md` §7.2 | decomp |
| Global fade to black: **20 frames = 333 ms, LINEAR** (not eased). Input is dead during any fade | `decomp-findings.md` §10.4 | decomp |
| Empty slots **animate**: ≥2000-frame (~33 s) loop at a **random per-slot start frame**. Channel icons loop ~20–40 s, also randomly phased unless they carry an icon module | `decomp-findings.md` §5.1, §14.1 | decomp + official |
| Rumble pulse **58.3 ms**; channel launch requires holding A for **5 frames (~83 ms)** | `decomp-findings.md` §2.3, §2.6 | decomp |
| Banner screen is held **≥1000 ms** before it can transition onward | `components/channel-tile.md` §7.3 | official |

### Behaviour

| Fact | Doc | Tier |
|---|---|---|
| Drag is **move-into-empty-slot only** — no swap, no shuffle. Rejected drops play `WIPL_SE_CH_NOT_MOVE`. **Disabled entirely when all 48 slots are full.** Disc Channel can't be grabbed | `decomp-findings.md` §6.3 | decomp |
| Empty slots are **inert at rest** (no hover, no sound, no click) but become **highlighted drop targets during a drag** | `decomp-findings.md` §5.2–5.3 | decomp |
| **Hover does have an affordance:** a channel-name balloon (Nintendo mandates it) plus a separate highlight object. The tile art is never deformed | `components/channel-tile.md` §6 | official + decomp |
| **No page indicator of any kind** on the Wii Menu. The numeric "1/20" indicator belongs to the SD Card Menu | `components/page-navigation.md` §8 | decomp + official |
| Unavailable page arrows are **removed, never greyed** | `components/page-navigation.md` §4.1 | decomp + pixel |
| **The D-pad does not page.** `+`/`−` only, master controller only | `components/page-navigation.md` §7 | decomp |
| The **SD icon greys rather than disappears** with no card — and stays hoverable and clickable | `decomp-findings.md` §8.5 | decomp + official |
| Two parallel SFX families: **`CH_*` for channel tiles, `BT_*` for bar buttons/arrows/SD**. Un-hover is silent. Drag SFX are stereo-panned by pointer X and speed-modulated | `decomp-findings.md` §2.3, §6.5, §11 | decomp |
| Wii Options / SD Card Menu / Message Board are **routes, not modals** — the menu scene unloads. Cross-fade through black | `components/bottom-bar-container.md` §8.2 | decomp |
| Current page and channel order **persist to NAND**. Use `localStorage` | `decomp-findings.md` §14.10 | decomp |
| There is **no diagonal-stripe loader**, **no logo splash inside the System Menu**, and **no screensaver** (only a whole-screen fade after 5 minutes idle) | `components/transient-states-and-overlays.md` items 1, 8, 10 | decomp + official |

---

## 4. Open questions

Genuinely unresolved. Ordered by how much they'd change an implementation.

| # | Question | Why it's open | What would settle it |
|---|---|---|---|
| 1 | **What every animation actually looks like** — the Message Board transition (flip? slide? scale?), the tile hover ring, the empty-slot shimmer, the dragged-tile ghost, the drop burst, the arrow idle loop, the SD icon's on/off art | The decomp gives exact frame *ranges* but the keyframes live in `.brlan` files that cannot legally be redistributed. This is one gap, not eight, and it is the single biggest one | **Extract `.brlan`/`.brlyt` assets from a NAND dump** (ThemeMii / Wii-Theme-Brlyt-Editor), or frame-step a video capture |
| 2 | **Pane positions, sizes and colours** not set programmatically | Same reason. The code sets only a handful — the SD button root, tile half-extents, balloon width/offset/clamps | Same as #1, or higher-resolution captures |
| 3 | **4:3 geometry is entirely unmeasured** | Every pixel measurement in this corpus comes from one 16:9 capture. Elements are re-anchored, not scaled, between modes (SD button: 20.6% vs 25.0% from the left edge) | A 4:3 capture, or reading the `.brlyt` pane rects |
| 4 | **Whether the "newly arrived" overlay can appear on the Disc Channel** | Nintendo's spec forbids it for disc applications; the decomp shows `setupNew()` handling the Disc Channel anyway. Two high-tier sources, flat contradiction | Dolphin, with a disc inserted and a pending WiiConnect24 message |
| 5 | **The channel-name balloon's vertical direction** (above or below the tile) | The offset *magnitude* is exact; the *sign* is ambiguous between two camera conventions | Any screenshot with a balloon visible |
| 6 | **Pre-4.3 visual history** — when the bar's trough appeared (a single unverified Reddit comment says 2.0, but WiiBrew dates the clock to 3.0), whether the half-pills predate 4.0, whether the date arrived with the clock | The decomp is **4.3 only**. Every manual scan found is 2009 or later | Verified 1.0 / 2.0 / 3.0 captures, or an emulated older System Menu |
| 7 | **The "88:88" ghost-segment layer** behind the clock digits | Claimed by a theme author whose *other* claim (the drop shadow) proved to be a USBLoaderGX artifact. Neither confirmed nor refuted by measurement | A higher-resolution capture of the clock |
| 8 | **What the four frames in the `Empty Channel Spaces` sheet are for** | They differ only in tonal range; nothing labels them | Reading the `.brlyt` that references them |
| 9 | **The cursor rotation's sign**, and KPAD's actual smoothing parameters | Direction is derived, not observed (~80% confidence); the smoothing lives inside the SDK, not the Menu | Video capture; SDK docs |
| 10 | **Whether `G_ArwR_HDAc` (the arrow drag-hold state) is ever reached** on the main menu | Its enum entries are marked `// unused` and the drag path calls the ordinary select animation | Frame-stepping a drag-over-arrow capture |

**The cheapest high-value next step is #1**, and it is the same action for #2, #5 and #8:
get the layout and animation assets out of a NAND dump. Almost every remaining "we know
*when*, not *what*" gap in this corpus collapses at once if that happens.

**The cheapest zero-risk next step** is a **higher-resolution reference capture.**
`reference_screen.png` is 420×236 and has been mined out; it cannot settle any of the fine
questions the docs keep deferring to it.
