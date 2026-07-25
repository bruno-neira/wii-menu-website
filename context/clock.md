# Wii Menu — Clock Reference

Research notes for recreating the digital clock shown in the top-left area of the
**Wii Menu** (System Menu), as distinct from the Forecast Channel / News Channel
weather-and-headline tickers. Precision here matters more than breadth — this is a
small UI element, and primary documentation of its exact pixel styling is thin, so
fan-consensus and inferred claims are explicitly flagged as such throughout.

## 1. Placement & Sizing

- The clock sits directly **above the Disc Channel tile**, which is permanently
  anchored in the top-left slot of the first page of the 4×3 channel grid (the Disc
  Channel cannot be moved by normal means; only homebrew like Preloader/Priiloader
  can relocate it). This anchors the clock's position relative to the grid. [Wii Wiki — Wii Menu](https://wii.fandom.com/wiki/Wii_Menu), [Nintendo UK — Wii Menu](https://www.nintendo.com/en-gb/Wii/Wii-Channels/Wii-Menu/Wii-Menu-749371.html)
- It renders as a small digital readout in the **top-left corner of the screen**,
  outside/above the scrolling channel grid itself, so it stays fixed on-screen as
  you page between the Wii Menu's multiple pages (each of the menu's pages is a
  4×3 grid; the clock is part of the persistent chrome, not part of the grid
  content). [Wii Channel Menu — Nintendo Fandom](https://nintendo.fandom.com/wiki/Wii_Channel_Menu)
- **Fan-consensus / unsourced from primary docs:** exact pixel dimensions and
  margins are not documented anywhere found in this research pass. Recreators
  should treat it as a compact HH:MM readout roughly the visual weight of a
  single grid-tile label — sized small enough not to compete with the Disc
  Channel tile beneath it, not sourced to an official spec.

## 2. Time Format

- **The clock display shown on the Wii Menu itself is region-dependent**: fan-wiki
  sources describe it as **12-hour in the Americas (NTSC) and 24-hour in Europe
  (PAL)**. [Wii Menu — Super Mario Wiki](https://www.mariowiki.com/Wii_Menu)
- This must be distinguished from the **time-entry screen** in
  Wii Settings → Calendar → Time, which Nintendo's own support documentation
  states is always presented in **24-hour ("military") format** for input,
  regardless of region — e.g. you enter "13:00" for 1:00 p.m. — and the console
  has **no user-facing option to switch to 12-hour input**, and does **not
  auto-adjust for Daylight Saving Time**. [Nintendo Support — How to Change the System Date and Time](https://en-americas-support.nintendo.com/app/answers/detail/a_id/1776/~/how-to-change-the-system-date-and-time), [Nintendo Support — Time Settings on the System Are Incorrect](https://en-americas-support.nintendo.com/app/answers/detail/a_id/2861/~/time-settings-on-the-system-are-incorrect)
- Net takeaway for recreation purposes: **the input/settings screen is always
  24-hour**, but **the on-menu clock readout itself can display in 12-hour form
  for NTSC/Americas systems** (community reports on GBAtemp describe this
  as effectively a 12-hour clock in some regions). [GBAtemp — Wii menu clock](https://gbatemp.net/threads/wii-menu-clock.57476/), [GBAtemp — Time on wii menu](https://gbatemp.net/threads/time-on-wii-menu.133294/)
- **AM/PM indicator:** No source found in this pass shows or confirms an AM/PM
  glyph next to the on-menu clock; several community answers describe the Wii as
  a straightforward 24-hour/military display with no AM/PM option at all. This is
  a **genuine inconsistency in the available sourcing** — treat the
  region-dependent 12-hour claim as fan-consensus rather than confirmed, and if
  building a 12-hour mode, the safer default (given the weight of sourcing) is
  **no AM/PM suffix shown on-menu**, mirroring a plain "H:MM" readout.
- **Seconds:** No source found describes seconds being displayed on the Wii Menu
  clock. Treat as **not shown** (HH:MM granularity only) — consistent with every
  screenshot description and forum discussion found, none of which mention a
  seconds field.

## 3. Date Display

- Multiple wiki summaries state each Wii Menu page "displays the current time
  **and date**," but no source in this pass could confirm the date is rendered
  **visibly on the main menu screen itself** alongside the clock. [Wii Menu — Super Mario Wiki](https://www.mariowiki.com/Wii_Menu), [Wii Channel Menu — Nintendo Fandom](https://nintendo.fandom.com/wiki/Wii_Channel_Menu)
- A directly relevant fan comment found in search results (paraphrased from a
  forum discussion) criticized the design specifically because the date is
  **not** shown next to the clock: *"the clock is a nice addition but very ugly
  compared to the design of the rest of the menu, they couldn't have put it
  beside the date, or in the corner?"* — implying the consensus among users is
  that **only the time is shown on the main menu; the date is not.** [GBAtemp — Time on wii menu](https://gbatemp.net/threads/time-on-wii-menu.133294/)
- The full date (day/month/year) is only accessible by drilling into
  **Wii button → Wii Settings → Calendar**, where "Date" and "Time" are separate
  sub-screens with their own up/down arrow adjustment controls. [Nintendo UK — Calendar](https://www.nintendo.com/en-gb/Support/Wii/Usage/Wii-Menus/Calendar/Calendar-242899.html), [Nintendo Support — How to Change the System Date and Time](https://en-americas-support.nintendo.com/app/answers/detail/a_id/1776/~/how-to-change-the-system-date-and-time)
- Where a date format is documented at all (in a tangential context — a
  Wii-menu-styled tech demo on 3DS), it is described as **MM/DD** for English/US
  locales regardless of other regional settings, which is at least suggestive of
  the Wii's own convention, though **not a confirmed 1:1 source for the actual
  console.** [Wii Menu — Super Mario Wiki](https://www.mariowiki.com/Wii_Menu)
- **Recommendation for the recreation:** show time-only on the main menu (no
  date chip), matching the weight of evidence above; a date can live in a
  Settings/Calendar sub-screen if the project implements one.

## 4. Interaction (Click/Select Behavior)

- **No source found confirms the clock area is a selectable/clickable element**
  on the real Wii Menu. The documented path to change or view the date/time is
  always described as a multi-step menu traversal: **Wii button → Wii Settings →
  Calendar → Date / Time**, not a direct click on the clock readout itself. [Nintendo UK — Calendar](https://www.nintendo.com/en-gb/Support/Wii/Usage/Wii-Menus/Calendar/Calendar-242899.html), [Nintendo Support — How to Change the System Date and Time](https://en-americas-support.nintendo.com/app/answers/detail/a_id/1776/~/how-to-change-the-system-date-and-time)
- One search summary explicitly states: *"clicking on the clock display itself
  is not the method to access settings—instead, you need to navigate through the
  Wii Menu button to access Wii Settings and then Calendar."* This should be
  treated as a reasonably confident negative finding, though it is a
  search-engine synthesis rather than a directly quoted primary source.
- **Fan-consensus recommendation:** the clock on the real console is very likely
  **purely decorative / non-interactive** — it is not part of the pointer-driven
  channel grid (which uses A+B hold-and-drag for repositioning channels, A to
  launch, etc.) and behaves more like a fixed HUD element than a channel icon.
  [Wii Channel Menu — Nintendo Fandom](https://nintendo.fandom.com/wiki/Wii_Channel_Menu)
- For the web recreation, it would be reasonable (and arguably *more* useful
  than the original) to make clicking the clock open a Settings/date-time
  screen, but this should be understood as a **deliberate enhancement beyond
  documented original behavior**, not a faithful recreation of confirmed
  original functionality.

## 5. Animation

- No source found in this pass documents any specific animation on the clock
  itself (no confirmed tick, no confirmed fade transition on the minute
  rollover). This appears to be **undocumented territory** even among the
  homebrew/theming community that has otherwise reverse-engineered much of the
  Wii Menu's visuals (see Section 6 on the USBLoaderGX "Accurate Wii Menu Theme"
  project, whose author explicitly grappled with recreating the clock's static
  rendering, drop shadow, and font — with **no mention of any minute-change
  animation** needing to be replicated). [GBAtemp — Accurate Wii Menu USBLoaderGX Theme](https://gbatemp.net/threads/accurate-wii-menu-usbloadergx-theme.665889/)
- **Recommendation:** treat the digits as updating instantaneously/statically
  once per minute, with no special transition effect, consistent with the
  simple, static "digital readout" character the rest of the sourcing implies.
  If any subtle animation is desired for polish, a very quick crossfade on digit
  change would be a safe, low-risk embellishment rather than a documented
  feature.

## 6. Visual Styling

- **Font:** The Wii's system-wide typeface is **Rodin NTLG** (also written
  "FOT-RodinNTLG"), a sans-serif typeface by **Fontworks** that combines the
  Rodin Latin/numeral design with New Type Labo Gothic kana; it was used across
  GameCube, Wii, DSi, 3DS, and Wii U system UI, and is reported to be the font
  used for the Wii Menu's clock/menu text. [dafont.com forum — Nintendo 3DS System Font](https://www.dafont.com/forum/read/475947/nintendo-3ds-system-font) (cites Rodin NTLG as the shared Nintendo system font across these platforms; treat as fan-sourced but consistent across multiple independent mentions)
  - Note: the Wii Menu clock specifically is rendered from a bundled `.ttf` font
    file (i.e., it is genuine vector text, not a sprite/bitmap font), per a
    homebrew developer who inspected the system menu's assets while building an
    "accurate" theme replica. [GBAtemp — Accurate Wii Menu USBLoaderGX Theme](https://gbatemp.net/threads/accurate-wii-menu-usbloadergx-theme.665889/)
  - That same developer found no font available (stock or third-party) that
    matched Nintendo's clock rendering exactly, and had to hand-tweak a
    close-but-imperfect substitute — a strong signal that the true clock face
    has **subtle proportions/kerning that are hard to replicate pixel-perfect**,
    useful context for calibrating how much fidelity to chase. [GBAtemp — Accurate Wii Menu USBLoaderGX Theme](https://gbatemp.net/threads/accurate-wii-menu-usbloadergx-theme.665889/)
- **Drop shadow:** Confirmed by the same source — wherever the Wii Menu (and
  menu-replacement software modeled on it, like USBLoaderGX) renders the clock,
  there is a **non-removable drop shadow behind the digits**, described in the
  thread via the placeholder glyph pattern **"88:88"** (the classic
  seven-segment-style "all segments lit" placeholder used to represent/measure a
  digital clock's shadow/glow layer). This confirms the real clock has a
  **soft shadow or glow treatment behind the digits**, not flat, shadowless
  text. [GBAtemp — Accurate Wii Menu USBLoaderGX Theme](https://gbatemp.net/threads/accurate-wii-menu-usbloadergx-theme.665889/)
- **Color / background chip:** No source in this pass gives an exact hex color
  or confirms/denies a background "pill" or chip behind the clock text. Given
  the Wii Menu's overall aesthetic (white/light-blue text over the signature
  blue gradient background, consistent with the rest of the System Menu chrome),
  the **fan-consensus assumption** is white or near-white digits with the
  aforementioned drop shadow for legibility against the blue backdrop, rather
  than a solid-colored chip/pill container — but this is an **inference from the
  overall Wii Menu design language, not a directly sourced claim**, and should
  be verified against reference screenshots/video before being treated as fact.
- **Transparency:** Not documented in any source found; likely fully opaque
  digit glyphs (per the drop-shadow finding above, which implies solid text with
  a shadow layer rather than a translucent readout), but unconfirmed.

## 7. Version Differences (System Menu 1.0 vs. 3.0 vs. 4.x)

- **The clock was not present at Wii launch.** System Menu **1.0** (the
  launch-day menu) had **no clock display** at all. [WiiBrew — System Menu 1.0](https://wiibrew.org/wiki/System_Menu_1.0)
- The clock was **introduced in System Menu 3.0**, released **August 6, 2007**.
  WiiBrew's changelog for that update states plainly: *"The current time will now
  be displayed in the Wii Menu."* This update bundled the clock alongside other
  UI/feature additions from the same release (e.g. dynamic channel info,
  Message Board notifications). [WiiBrew — 3.0](https://wiibrew.org/wiki/3.0), [WiiBrew — System Menu](https://wiibrew.org/wiki/System_Menu)
- From **3.0 onward** (through the later 4.x menus most people picture when they
  think of "the Wii Menu"), the clock persisted as a fixture of the top-left
  corner; no source found in this pass documents any **redesign** of the clock's
  look between 3.0 and 4.3 (the final major System Menu version) — the
  available evidence suggests its position, font, and drop-shadow treatment were
  stable across that whole span. Treat "the clock looked the same from 3.0
  through 4.3" as a **reasonable inference from absence of contrary evidence**,
  not a positively confirmed fact.
- **Practical implication for the recreation project:** if the project is
  modeling a specific System Menu version, only versions **3.0 and later**
  should render a clock at all; anything modeling 1.0–2.x should omit it
  entirely for accuracy.

## Open Gaps / Things to Verify Visually

Given how thin official/primary documentation is for this specific element, the
following should ideally be confirmed against direct screenshots or video
footage of a real (or accurately emulated, e.g. Dolphin) Wii Menu before final
implementation, rather than taken purely from this doc:

1. Exact digit color/hex and whether there's any background pill.
2. Whether AM/PM is genuinely shown in NTSC 12-hour mode, or whether the Wii
   truly only ever displays 24-hour time and the "12-hour Americas" claim is a
   wiki inaccuracy.
3. Exact pixel position/size relative to the Disc Channel tile and screen edge.
4. Whether the date ever appears on the main menu screen (weight of evidence
   here says no, but it's not airtight).

## Sources

- [Wii Menu — Super Mario Wiki](https://www.mariowiki.com/Wii_Menu)
- [Wii Channel Menu — Nintendo Fandom](https://nintendo.fandom.com/wiki/Wii_Channel_Menu)
- [Wii Menu — Wii Wiki (Fandom)](https://wii.fandom.com/wiki/Wii_Menu)
- [Wii Menu — Nintendo UK](https://www.nintendo.com/en-gb/Wii/Wii-Channels/Wii-Menu/Wii-Menu-749371.html)
- [Nintendo Support — How to Change the System Date and Time](https://en-americas-support.nintendo.com/app/answers/detail/a_id/1776/~/how-to-change-the-system-date-and-time)
- [Nintendo Support — Time Settings on the System Are Incorrect](https://en-americas-support.nintendo.com/app/answers/detail/a_id/2861/~/time-settings-on-the-system-are-incorrect)
- [Nintendo UK — Calendar](https://www.nintendo.com/en-gb/Support/Wii/Usage/Wii-Menus/Calendar/Calendar-242899.html)
- [GBAtemp — Wii menu clock (thread)](https://gbatemp.net/threads/wii-menu-clock.57476/)
- [GBAtemp — Time on wii menu (thread)](https://gbatemp.net/threads/time-on-wii-menu.133294/)
- [GBAtemp — Accurate Wii Menu USBLoaderGX Theme (thread)](https://gbatemp.net/threads/accurate-wii-menu-usbloadergx-theme.665889/)
- [WiiBrew — System Menu](https://wiibrew.org/wiki/System_Menu)
- [WiiBrew — System Menu 1.0](https://wiibrew.org/wiki/System_Menu_1.0)
- [WiiBrew — 3.0 (update changelog)](https://wiibrew.org/wiki/3.0)
- [dafont.com forum — Nintendo 3DS System Font (Rodin NTLG discussion)](https://www.dafont.com/forum/read/475947/nintendo-3ds-system-font)
- [The Spriters Resource — Wii Menu Fonts asset](https://www.spriters-resource.com/wii/wiimenu/asset/68556/)
