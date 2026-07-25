# Wii Menu — Home Screen Component Inventory

> **⚠️ THIS DOC IS PARTLY OUT OF DATE (annotated 2026-07-24).** It is an inventory and a
> punch list, and the punch list has since been worked through — every one of its seven
> prioritized deep-dives now exists under `context/components/`. Its *coverage grades* are
> therefore stale, and two of its "well-covered, no deep-dive needed" calls (the clock,
> item 10; the pointer, item 13) turned out to be wrong. Its single most valuable call —
> item 11, that the date contradicts `clock.md` — was **correct**. Markers inline.
> See `context/README.md` for the current index.

Purpose of this doc: a **systematic inventory** of every distinct visual/interactive UI
component that appears on the Wii Menu home screen (the channel-grid screen), to serve as
the punch list for a follow-up round of **per-component deep-dive docs**. This doc does not
re-derive detailed facts already captured elsewhere — it points at what exists, grades how
well each item is already covered by `context/visual-design.md`, `context/animations-
interactions.md`, `context/audio.md`, `context/channels.md`, `context/clock.md`,
`context/system-ui.md`, `context/version-history.md`, `context/technical-specs.md`, and
`context/pinterest-board.md`, and flags contradictions/gaps.

**New primary source found in this pass:** the official Nintendo-printed **"Wii Operations
Manual — Channels and Settings"** (RVK model, English), scanned in full on Internet Archive
with an OCR text layer — item `wii-opmanual-chset` / file `WiiRVKChEng_djvu.txt`
(https://archive.org/details/wii-opmanual-chset). This is a first-party Nintendo consumer
document (the physical booklet packed in the box) and is treated as **[Official]**-tier,
on par with or above Nintendo's web support pages, which several existing docs already used.
It contains an annotated diagram of the Wii Menu home screen with callout labels — this is
the single best "ground truth" source available for confirming *which discrete UI elements
Nintendo itself considered worth labeling* on this screen, and it settles one open
contradiction between existing docs (see item 11, Date display). The companion **"Wii
Operations Manual — System Setup"** (item `wii-op-mn-en-setup`) was also checked but defers
Wii-Menu-screen content to the Channels & Settings volume ("See the Wii Menu section of the
Operations Manual - Channels and Settings, for more information on this feature," p.18) and
was not otherwise useful here.

Sourcing tags used below: **[Official]** = Nintendo-authored (manual, support page,
developer spec PDF, marketing page). **[Fan/community]** = wikis, forums, fan
reverse-engineering, screenshot analysis, or fan web-clone precedent.

---

## 1. Channel grid / paging container

The rectangular area holding the 4-column × 3-row tile grid, one of 4 pages (48 slots
total), that makes up the bulk of the screen.

- **[Official]** Nintendo's internal "Icon and Banner Specifications" dev PDF (already used
  in `visual-design.md`): *"When Wii is started, 12 Channels, 4 Channels wide X 3 Channels
  high are displayed."*
- **[Official]** Wii Operations Manual — Channels & Settings (new, this pass): *"The Wii Menu
  can have up to 48 Channels at one time. If you have more Channels than can be shown on the
  screen at one time, these can be accessed by selecting the blue scroll arrows."* — confirms
  48-slot ceiling and names the nav control "blue scroll arrows" (see item 5).
- **[Fan/community]** WiiBrew/Wikipedia corroborate 4 pages × 4×3 grid.
- **Existing coverage:** well covered structurally in `channels.md` ("Grid layout & general
  Wii Menu structure") and `visual-design.md` §1 (grid framing/margins, ~87% width, gutter
  recess color). `animations-interactions.md` §4 covers *paging* triggers but flags the
  page-transition motion itself (cut/slide/crossfade) as an unresolved gap. **Net: solid on
  static layout, gap remains on transition motion** — see item 5's recommendation.

## 2. Generic populated channel tile (reusable frame)

The reusable rounded-rect "card" chrome that every non-empty, non-Disc-Channel tile sits in,
independent of any specific channel's artwork.

- **[Official]** Nintendo Icon/Banner Spec PDF: authored icon canvas is **128×96px (4:3)** /
  **170×96px (16:9)**, clipped to a rounded-rect mask; animation is **mandatory** — *"Use of
  still image icons for which animation has not been set is prohibited."*
- **[Fan/community]** Screenshot-derived shape/size/gutter measurements in `visual-design.md`
  §2 (rounded rect, thin gray keyline, drop shadow, ~84×45px at reference-screenshot scale).
- **Existing coverage:** well covered in `visual-design.md` §2 (shape, size, mandatory
  animation rule). Hover/select highlight treatment (scale factor, glow color, timing) is
  explicitly flagged there as **unconfirmed — genuine gap**.

## 3. Empty/blank channel slot tile

The placeholder tile shown in a grid slot that has no channel installed.

- **[Fan/community]** `visual-design.md` §2: screenshot analysis shows empty tiles are
  **not** perfectly blank — flat medium-gray (~`#C6C6C6`–`#CCCCCC`) rounded-rect with faint
  diagonal grain/noise texture and a **faint ghosted "Wii" wordmark watermark**, no "+"
  insert glyph.
- No official Nintendo text source found describing the empty-slot appearance specifically
  (the Ops Manual diagram doesn't call it out as its own labeled element).
- **Existing coverage:** visual appearance well covered (screenshot-sourced) in
  `visual-design.md` §2. **Interaction behavior is not covered anywhere** — no doc addresses
  what, if anything, happens on clicking/pointing at an empty slot (nothing? routes to Wii
  Shop Channel? just no-ops?). This is a real, uncovered gap.

## 4. Disc Channel tile (fixed/special)

The permanently-anchored top-left tile that is functionally and behaviorally distinct from
every other tile (fixed position, can't be moved/deleted, drives physical disc insertion).

- **[Official]** Nintendo Icon/Banner Spec PDF: *"The Channels can be freely arranged, except
  for the Disc Channel in the upper left."*
- **[Official]** Wii Operations Manual — Channels & Settings: describes disc-insertion flow
  ("Using the Wii Remote Plus, select the Disc Channel on the Wii Menu... the console will
  turn on automatically and the Wii Menu will appear... label faces upwards").
- **[Fan/community]** WiiBrew's Disc Channel page (via `animations-interactions.md` §3):
  spinning-disc animation while polling drive, "no disc" tone, disc-slides-in animation when
  detected, System-Update banner override.
- **Existing coverage:** this is the **best-covered component in the whole corpus** —
  substantively documented across `channels.md` §1, `visual-design.md` §1 (fixed-position
  citation) and §2 (glossy tile appearance), and `animations-interactions.md` §3 (launch
  animation sequence). No dedicated deep-dive needed; already near-complete.

## 5. Page-navigation control(s) — arrows / scroll control

The control(s) used to move between the grid's 4 pages.

- **[Official]** Wii Operations Manual — Channels & Settings: officially named **"blue
  scroll arrows"** — the only Nintendo-sourced terminology found for this control on the
  *main* Wii Menu. Notably, the manual does **not** describe a numeric or dot page-count
  indicator for the main Wii Menu screen (contrast with item 14b below, where the *SD Card
  Menu* — a visually similar but separate screen — explicitly has "Current and total page
  numbers" as its own labeled callout).
- **[Fan/community]** `visual-design.md` §1: single reference screenshot shows a small solid
  **cyan right-pointing chevron** at the grid's right edge (page 1, so no left arrow visible;
  a mirrored left arrow on pages 2–4 is inferred, not confirmed).
- **[Official-adjacent]** Nintendo Support "How to Arrange Channels" (cited in
  `animations-interactions.md` §4): confirms the page arrow is a **live drag-and-drop target**
  — dragging a channel (A+B held) onto the arrow and holding triggers a page turn.
- **Existing coverage: thin and scattered.** Visual design of the arrow (one screenshot
  observation only), the transition motion between pages (explicitly flagged as an
  undocumented gap in `animations-interactions.md` §4), and whether a dot/numeric page
  indicator exists on the main menu at all (new ambiguity surfaced this pass) are all open.
  **Strong candidate for a dedicated deep-dive.**

## 6. Bottom bar container

The overall bar shape/background spanning the bottom of the screen that the Wii button, SD
Card Menu icon, and Message Board icon sit on — as distinct from the buttons themselves.

- **[Official]** Wii Operations Manual — Channels & Settings confirms the three icons'
  relative positions (Wii icon "bottom left," Message Board implied bottom-right via the
  Ops Manual diagram layout, SD Card Menu "next to" the Wii icon) but does not describe the
  bar's own chrome (color, height, curvature) as a discrete shape.
- **[Fan/community]** `visual-design.md` §5 ("Bottom bar visual design") and a "curved
  divider line" mentioned in §3 color-palette notes describe the bar's construction from
  screenshot analysis; `system-ui.md` §1 documents the *contents* of the bar (icon inventory
  table) and a background-color-swap-to-black behavior when the Wii button/SD Card Menu is
  active, flagged **[Fan consensus, page itself unverified]**.
- **Existing coverage:** the bar's *contents* (which icons, where) are well covered in
  `system-ui.md` §1. The bar's own **visual construction as a shape** (exact height, corner
  treatment, the "curved divider line," color transitions) is scattered thinly across
  `visual-design.md` §3 and §5 rather than centrally documented. **Good candidate for a
  dedicated doc** that isolates the container from its contents.

## 7. Wii button (bottom-left)

The stylized "Wii" logo button in the bottom-left corner; opens Wii Settings/Data
Management ("Wii Options").

- **[Official]** Wii Operations Manual — Channels & Settings (new, this pass): *"To reach Wii
  Settings and Data Management, select the Wii icon on the bottom left of the Wii Menu
  screen."* Also labeled on the manual's Wii-Menu diagram as **"Wii Settings and Data
  Management"** (the callout's own name for this icon — not literally "Wii button," which is
  fan/colloquial terminology).
- **[Official]** Nintendo UK support (cited in `system-ui.md`): *"Locate the 'Wii' button
  positioned in the bottom-left corner of the screen."*
- **Existing coverage:** function/position **well covered** in `system-ui.md` §1 and §5
  (leads to Wii Options screen → Wii Settings / Data Management). The icon's own **visual
  design** (exact glyph rendering, button shape/bevel, color) is comparatively thin —
  addressed only in passing via `visual-design.md`'s general bottom-bar notes, no dedicated
  close-up treatment.

## 8. SD Card Menu icon/button

Icon (bottom-left, next to the Wii button) that opens the separate full-screen SD Card Menu.
Introduced in System Menu 4.0.

- **[Official]** Wii Operations Manual — Channels & Settings: *"Access the SD Card Menu
  screen (To use this menu item, an SD Card [sold separately] must be inserted into the SD
  Card slot. The icon will appear gray if there is no SD Card inserted.)"* and later, *"When
  you select the SD Card Menu icon from the Wii Menu, you will see a display..."* — confirms
  the **grayed-out disabled state** when no card is present.
- **[Fan/community]** Nintendo World Report walkthrough (cited in `system-ui.md` §4):
  position and System Menu 4.0 introduction; WiiBrew changelog for the version number.
- **Existing coverage:** function, position, version-introduced, and disabled/grayed state
  are **well covered** in `system-ui.md` §4 and `version-history.md`. The icon's own
  **graphic design** (what the icon symbol actually looks like — an SD card glyph? a
  generic tile icon?) is not documented anywhere in this corpus — a real gap, moderate
  priority since it's a single small glyph.

## 9. Message Board / Mail icon-button (bottom-right)

Envelope-style icon that opens the Wii Message Board; blinks on new message.

- **[Official]** Wii Operations Manual — Channels & Settings: *"Open the Wii Message Board...
  Blinks when you have received a message."*
- **[Fan/community]** WiiBrew System Menu changelog (cited in `system-ui.md` §3): "The Wii
  Message Board button will now flash when a message arrives" (System Menu 3.0 changelog —
  implies the blink behavior wasn't present from launch, was added in 3.0).
- **Existing coverage:** function, position, and *contents* of the Message Board itself are
  **the most thoroughly documented icon-button in the corpus** (`system-ui.md` §3 is
  extensive: calendar strip, bulletin list, "Today's Accomplishments," photo-attachment
  icons, LetterBomb trivia). However, the **open/close transition animation** ("flips up like
  a folder") is explicitly flagged there as **[Fan consensus]only**, with no primary
  frame-by-frame source. **Good candidate for a focused animation deep-dive**, separate from
  the (already well-covered) functional/content side.

## 10. Clock display

The digital time readout in the top-left area.

- **[Official]** Wii Operations Manual — Channels & Settings diagram labels this callout
  **"Current Time"**, confirming it as a discrete, Nintendo-acknowledged element of the Wii
  Menu screen (not merely a fan inference).
- **Existing coverage:** this has its **own dedicated file**, `clock.md`, covering placement,
  sizing, time format (12h vs 24h regional ambiguity flagged), interaction, animation, visual
  styling, and version differences. **Best-covered component after the Disc Channel** — no
  further deep-dive needed except resolving the date question below, which properly belongs
  to item 11.

## 11. Date display — **flag: likely contradicts `clock.md`'s conclusion**

> **✅ RESOLVED (2026-07-24) — this item was RIGHT and is now settled; close it.** The
> date **is** shown on the main Wii Menu, as an element separate from the clock. Confirmed
> across three manual editions (two US, one UK/PAL), by the manual's rendered page images
> (not just the OCR layer), and by six real screenshots. Format is `DDD M/D` (`Fri 1/1`) —
> no leading zeros, no year, 3-letter Title-Case weekday — centred on the screen midline,
> **below** the cyan divider on the bar, with the clock **above** the divider on the page
> background. The two use different typefaces (seven-segment vs proportional sans),
> different sizes (date ≈0.76×) and different greys.
> Note the trap that produced the original error: `grep -i "current date"` on the US OCR
> **misses** the callout (it is line-wrapped as `Current` / `Date`) and instead hits an
> unrelated Message Board callout. Read the section; don't grep it.
> Note also the honest nuance: `clock.md` was right that the *clock component* has no date
> pane — the date is drawn by a different subsystem. It was wrong about the *screen*.
> See `context/components/date-display.md` (the definitive treatment).
> Evidence tier: official ×3 + pixel measurement ×6 + decomp.

A separate "Current Date" readout, distinct from the time.

- **[Official] — new finding this pass, directly relevant:** the Wii Operations Manual —
  Channels & Settings' annotated Wii-Menu diagram has **two separate callout labels**:
  **"Current Time"** and **"Current Date"** — appearing as distinct items in the diagram's
  callout list (confirmed via direct fetch of the OCR'd manual text; "Current Time" appears
  near the top of the callout sequence, "Current Date" appears later, positioned near the
  Message Board callout in the OCR'd reading order). This is a first-party Nintendo document
  labeling *both* as discrete on-screen elements of the Wii Menu itself — not the Settings/
  Calendar sub-screen.
- **This directly contradicts `clock.md` §3 ("Date Display")**, which concluded *"no source
  in this pass could confirm the date is rendered visibly on the main menu screen itself"*
  and recommended a **time-only** implementation, based on weaker evidence (a paraphrased
  GBAtemp forum comment arguing the date is *absent*, plus indirect Nintendo-UK
  Calendar-settings pages that don't address the main-menu display question either way).
- **It is, however, consistent with `system-ui.md` §2**, which already (independently) cited
  WiiBrew/encyclopedic summaries stating each Menu page displays "the current time **and
  date**" — so two of the three existing docs that touch this question lean "date is shown,"
  and the new official-manual evidence now tips the balance further in that direction.
- **Net assessment:** the weight of evidence, especially after this pass, now favors **date
  IS shown as a distinct on-screen element** alongside the clock — the opposite of `clock.md`'s
  current recommendation. This is exactly the kind of contradiction flagged for follow-up:
  **highest-priority candidate for a dedicated deep-dive doc**, both to resolve the
  clock.md ↔ system-ui.md conflict with visual (screenshot/video) evidence and to nail down
  the date's exact placement, format (the MM/DD inference in `clock.md` is unconfirmed), and
  styling relative to the time readout.

## 12. Background/backdrop of the whole screen

The screen's base surface behind the grid and bottom bar.

- **[Fan/community]** `visual-design.md` §3: pixel-sampled from a reference screenshot as
  **near-white/light neutral gray**, explicitly correcting a common misconception that the
  background is a strong blue wash (blue appears only as targeted accents — button rings,
  a curved divider line, specific channel tiles).
- **[Fan/community]** `system-ui.md` §8 discusses whether the Menu is framed as "on a TV"
  (bezel/frame device) as a distinct design question from the background color itself.
- No official Nintendo source found describing the backdrop specifically (not called out in
  the Ops Manual diagram or the Icon/Banner spec, which focus on tile content).
- **Existing coverage:** color/tone reasonably well covered via screenshot analysis in
  `visual-design.md` §3. Any background **texture/animation/gradient** (does it shift, is it
  perfectly flat, does it change per system-menu version/theme) is **not covered** anywhere —
  moderate-priority gap, lower urgency since the base color question is already settled.

## 13. Wii Remote pointer/cursor (on-screen hand icon)

The white gloved-hand cursor driven by the Wii Remote's IR pointer.

- **[Official]** Nintendo Support troubleshooting page (cited in `animations-interactions.md`
  §2): operating range (3–8 ft / 1–3m from sensor bar), IR-interference guidance, and
  confirms the on-screen hand's rotation is **accelerometer-tilt-driven** (a Remote pointed
  straight down shows the hand pointing down).
- **[Fan/community]** WiiBrew Wiimote/Pointing page: full IR-to-screen-space algorithm,
  "dragging circle" smoothing scheme; Spriters Resource archived sprite sheet for the hand
  cursor asset itself; fan cursor packs documenting multiple pointer states (idle/busy) and
  the A-press finger-curl click feedback (flagged fan-consensus, not text-sourced).
- **Existing coverage:** this is the **second-best-covered component in the corpus** —
  `animations-interactions.md` §2 is a thorough, dedicated section (hardware math, smoothing
  algorithm, visual asset provenance, click feedback, tilt response, concrete web-recreation
  guidance). It currently lives as a *subsection* of the broader animations doc rather than
  its own file — a dedicated doc could be a straightforward "promotion" of existing material
  rather than new research, so this is **lower priority** than the genuine research gaps
  above.

## 14. Other distinct components found

> **⚠️ SUPERSEDED (2026-07-24) — item 14a below describes the preview as "the tile
> enlarges into a preview." It does not.** The grid is **replaced** by a full-screen
> banner drawn from a completely separate asset at a different aspect ratio, under a
> black frame, with blue arrows at the screen edges that step to the **adjacent channel**
> without returning to the grid. The left button is contextual ("Wii Menu" from the grid,
> "SD Card Menu" from the SD Card Menu); the right is "Start", or "Update" when the
> channel has a pending update, and it has a **real disabled state** that greys out and
> plays `WIPL_SE_GRAY_BUTTON` when pressed. Zoom = 28 frames / 467 ms, exact smoothstep.
> Item **14b (page indicator)** resolves **negative** — none exists on the Wii Menu.
> Item **14c ("newly arrived" badge)** should be **closed as unconfirmable by design**:
> Nintendo specifies the *mechanism* (a pane group named `New`, plus `Whole`/`New`
> animation tags) and deliberately leaves the artwork to each channel's own developer.
> See `context/components/channel-tile.md` §7 and §9,
> `context/components/page-navigation.md` §8,
> `context/components/transient-states-and-overlays.md` items 2 and 4.
> Evidence tier: official + decomp.

### 14a. Channel-preview / "Start" overlay
When a tile is single-clicked (not double-clicked/launched), Nintendo Support's "How to
Arrange Channels" page (cited in `animations-interactions.md` §3) and this project's own
`channels.md` describe a **zoom-to-preview step**: the tile enlarges into a preview showing
the channel's banner animation + audio, with **"Start"** and **"Wii Menu"** text buttons
appearing at the bottom before the second click actually launches the channel. This is a
genuinely distinct, transient UI component (an overlay/bar with its own buttons), not just
"the tile getting bigger." **Coverage: mentioned only in passing** inside
`animations-interactions.md` §3's launch-animation section — never treated as its own
component. Worth a dedicated doc if the project wants to replicate the two-step
preview→launch flow rather than a single-click launch.

### 14b. Page count indicator (dots vs. numeric — ambiguous, needs research)
`technical-specs.md` §7 (safe-area discussion) references a **"page-dot/date-time footer"**
in passing, and `animations-interactions.md` §4 leans on "the existence of visible
page-indicator dots at the bottom of the Menu" as supporting evidence for a slide-paradigm
recommendation — but neither doc cites a primary source specifically confirming **dots** (as
opposed to no indicator at all, or a numeric readout). Notably, the newly-found Ops Manual
**does** document a numeric **"Current and total page numbers"** indicator, but only for the
**SD Card Menu** (a separate screen) — not for the main Wii Menu. **Coverage: thin,
internally inconsistent inference chain, no direct source for the main-menu case.**
Worth resolving alongside item 5 (page-navigation arrows), since it's the same feature area.

### 14c. "Newly arrived" / new-content badge overlay
Nintendo's Icon/Banner Spec PDF (§2.9, Figure 2-11, cited in `visual-design.md` §2) documents
a **"New group"/"Newly Arrived" animation-tag overlay** that plays on a channel's icon when
it receives new WiiConnect24 content — a distinct visual badge/overlay mechanism layered on
top of the generic tile frame (item 2). **Coverage: single citation only, no visual detail**
(color, shape, exact trigger duration) — flagged explicitly as unconfirmed in
`visual-design.md`. Worth a short dedicated treatment given it's cleanly sourced to an
official spec but visually undescribed.

### Considered and excluded from this list
- **Health and Safety boot screen** (`system-ui.md` §6) — a pre-Menu boot screen, not part of
  the channel-grid home screen itself; out of scope for this inventory by the task's own
  framing.
- **Wii Points balance / Wii Speak icon** — both explicitly ruled out by `system-ui.md` §1–2
  as *not* appearing on the Wii Menu (sourced by omission); listed there as corrections to
  avoid, not components to inventory here.

---

## Prioritized recommendation: next 7 deep-dive docs

> **⚠️ SUPERSEDED (2026-07-24): all seven of these deep-dives have been written, plus
> several more, and every item on this list is now closed or reduced.** Current status:
> | # | Item | Status |
> |---|---|---|
> | 1 | Date display | **Resolved — date IS shown.** `components/date-display.md` |
> | 2 | Page-nav + indicator | **Resolved.** 333 ms horizontal slide; **no indicator exists at all** (item 14b resolves *negative*); arrows are removed rather than greyed. `components/page-navigation.md` |
> | 3 | Bottom bar container | **Resolved.** Exact contour, Bézier fit, fill model, opacity proof. `components/bottom-bar-container.md` |
> | 4 | Message Board open/close | **Partly resolved.** Timings exact (333 ms grid / 667 ms bar, desynchronised, **no fader**); the "flip" motion itself is still unproven. |
> | 5 | SD Card Menu icon | **Resolved.** Flat pictogram, no button chrome; greys rather than disappears and stays clickable. `components/empty-slot-and-sd-icon.md` |
> | 6 | Empty-slot interaction | **Resolved.** Inert at rest, highlighted drop target during a drag — and the slots are **animated**. |
> | 7 | Channel-preview overlay | **Resolved.** Full-screen banner, contextual left button, ≥1000 ms dwell, 467 ms zoom. |
>
> Items this list called "already well-covered" that turned out **not** to be: the **clock**
> (item 10 — `clock.md` contains several disproven claims) and the **Wii Remote pointer**
> (item 13 — the single-cursor model is wrong; there are four numbered cursors plus a
> separate authored grab layout). Neither should be "promoted" as-is.
> The highest-leverage remaining work is no longer a component doc: it is **extracting
> `.brlan` animation contents from a NAND dump**, which is the only thing that can settle
> what the remaining animations actually *look* like.

Ranked by (a) how thin/contradictory existing coverage is and (b) how central the component
is to the visual/interactive experience of the home screen:

1. **Date display (item 11)** — highest priority. A direct, now better-evidenced
   contradiction exists between `clock.md` (time-only) and `system-ui.md` (time-and-date),
   and this pass's official-manual finding tips the balance toward "date is shown." This
   needs to be resolved with visual (screenshot/video) confirmation before any further clock/
   date implementation work proceeds — it blocks a decision, not just a nice-to-have detail.
2. **Page-navigation controls — arrows + indicator (items 5 + 14b)** — thin, scattered
   sourcing; the page-transition motion is an explicit known gap, and it's now unclear
   whether a dot/numeric page indicator exists on the main menu at all (vs. only on the
   separate SD Card Menu). Central to the multi-page grid, one of the most-used interactions.
3. **Bottom bar container chrome (item 6)** — the contents (which icons) are well documented,
   but the container's own shape/color/curvature is only addressed in passing across two
   other docs; it's the literal frame for three other components on this list.
4. **Message Board open/close animation (item 9)** — function and content are the
   best-covered icon-button in the corpus, but the "flips up like a folder" transition is
   explicitly fan-consensus-only with no primary source; isolating just the animation would
   close a specific, well-scoped gap.
5. **SD Card Menu icon graphic design (item 8)** — function/position/version history are
   solid; nobody has documented what the icon glyph itself actually looks like.
6. **Empty/blank channel slot interaction behavior (item 3)** — visual appearance is
   screenshot-sourced and solid, but no doc anywhere addresses what clicking an empty slot
   does.
7. **Channel-preview/"Start" overlay (item 14a)** — currently a footnote inside the launch-
   animation section of `animations-interactions.md`; deserves to be treated as its own
   component given it's a distinct, stateful UI element (enlarged preview + two named
   buttons) rather than simply "the tile animating."

Lower priority (already well-covered or easily "promoted" from existing material rather than
requiring new research): Disc Channel (item 4), Clock (item 10), Wii Remote pointer (item
13), Wii button function (item 7, though its icon *graphic design* specifically could ride
along with #3's bottom-bar deep dive), background color (item 12), and the "newly arrived"
badge (item 14c, low visual stakes).
