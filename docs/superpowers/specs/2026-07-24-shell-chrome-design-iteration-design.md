# Wii Menu Shell/Chrome Design Iteration

**Date:** 2026-07-24
**Status:** Approved

## Context

The project (`wiimenu-website`, a React/Vite recreation of the Nintendo Wii System Menu) already has a working shell: a 4×3 channel grid, bottom bar, clock, and a MacBook-bezel "TV frame" presentation wrapper. A research pass (`context/*.md`, plus a catalog of the project owner's Pinterest reference board at `context/pinterest-board.md`) compiled sourced/fan-consensus facts about the real Wii Menu's visual design, and direct pixel inspection of the project's own `reference_screen.png` and `wii_design_specs.pdf` surfaced a few concrete gaps between the current implementation and the real thing.

This iteration works within the **existing React/Vite codebase**. A separate, still-running research track is evaluating whether a different frontend framework/rendering approach would serve the project better long-term (`context/tech-*.md`, once complete) — that is an independent future decision and this iteration does not block on or preempt it.

## Goals

Bring the shell/chrome (clock, channel tile shape, bottom bar, background) closer to the real Wii Menu's documented design, while deliberately preserving the project owner's existing creative choices that aren't contradicted by research, and without expanding scope into real channel content, audio, or the presentation framing.

## Decisions (from brainstorming Q&A)

| Question | Decision |
|---|---|
| Scope | Everything: grid/tiles, bottom bar, clock, background |
| Clock style | Switch from seven-segment LCD digits to proportional-font digits + drop shadow |
| Tile shape | Switch from concave "pillow" clip-path to plain rounded rectangle |
| Empty tile static | Keep the existing animated TV-static effect (creative addition, not reverted) |
| Real channel content | Out of scope this round — channels stay empty/static |
| MacBook bezel framing | Keep as-is |
| Frutiger Aero vs. reference screenshot | Mostly match the flatter reference screenshot; treat Frutiger Aero as light seasoning only, not a dominant look |

## Design

### 1. Clock (`src/components/Clock.jsx`, `Clock.css`)

Replace the seven-segment SVG digit renderer with plain text digits:

- Format stays `H:MM AM/PM` (unchanged) — the project's own `reference_screen.png` shows `12:00 AM`, which resolves the research's flagged AM/PM uncertainty in favor of **showing** AM/PM.
- Font: a free rounded-geometric-sans stand-in for the proprietary Rodin NTLG typeface the real Wii uses — `M PLUS Rounded 1c`, `Quicksand`, or `Comfortaa` (per `context/technical-specs.md`). Pick whichever renders the digits most cleanly at small sizes; load via the existing Google Fonts `<link>` pattern already used for `RocknRoll One` in `index.html`.
- Add a soft `text-shadow` drop shadow behind the digits — confirmed in `context/clock.md` as a real, non-removable feature of the original (sourced from a homebrew developer's notes reverse-engineering the Wii Menu's assets).
- Color: shift from the current segment gray (`#9b9b9b`) toward the bottom bar's date-text gray (`#787879`-ish) for visual consistency between the two time/date displays.
- Remove the `SevenSegDigit`/`SevenSegColon`/`DIGIT_SEGMENTS`/`SEGMENT_POINTS` machinery entirely — no longer needed once rendering is plain text.
- Keep: overall position/sizing envelope (`clock-above-bar` placement in `WiiMenu.css`), update interval (once/second is fine to keep, or relax to once/minute since research found no evidence of a seconds display — implementation detail, not user-facing either way since only H:MM is shown).

### 2. Channel tiles (`src/components/Channel.css`, `src/App.jsx`)

- `.channel`: remove `clip-path: url(#crt-clip)`, replace with a `border-radius` matching the proportions visible in `reference_screen.png` (plain rounded rectangle, not concave/bowed sides).
- `.channel-inner`: keep the existing inset "bezel" treatment, gloss `::before` overlay, and hover scale/highlight `::after` — only the outer silhouette mechanism changes. Adjust its `border-radius` to match the new outer radius (no more clip-path-matching approximation needed).
- `App.jsx`: remove the now-unused `#crt-clip` SVG `<clipPath>` definition and its wrapping `<svg>` block, since nothing will reference it anymore.

### 3. Bottom bar & background (`BottomBar.jsx`/`.css`, `WiiMenu.css`)

No planned changes — both already align with research:
- Background gradient (`#ececec`/`#e8e8e8`/`#e5e5e5`) already sits within the sampled `#E4E4E4`–`#EFEFEF` range from `context/visual-design.md`.
- Bottom bar already correctly has only a Wii button (bottom-left) and Message Board icon (bottom-right), with no invented Wii Remote sync icon, Wii Speak icon, or Points balance — matching `context/system-ui.md`'s correction to the original research brief.

Action: a side-by-side visual check against `reference_screen.png` in the browser; only touch something if an actual discrepancy shows up.

### 4. Explicitly out of scope

- Real channel content (Disc/Mii/Photo/Forecast/News/Shop channel art) — future iteration.
- The MacBook-bezel "TV frame" presentation wrapper — kept as-is.
- Audio.
- Any dependency/tooling/framework changes — separate from the parallel platform meta-research track.

## Testing

All changes are visual. Verification is: start the Vite dev server, view the rendered menu in a browser, and compare against `reference_screen.png` side-by-side. No automated test suite exists in this project (no `package.json` test script), so this is manual visual verification rather than an automated regression check.

## Files touched

- `src/components/Clock.jsx` — rewrite digit rendering
- `src/components/Clock.css` — font, color, drop shadow
- `src/components/Channel.css` — clip-path → border-radius
- `src/App.jsx` — remove unused `#crt-clip` SVG def
- (possible minor touch-ups to `BottomBar.css`/`WiiMenu.css` only if the verification pass finds a real discrepancy)
