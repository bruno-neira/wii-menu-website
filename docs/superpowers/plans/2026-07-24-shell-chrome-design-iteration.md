# Shell/Chrome Design Iteration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the Wii Menu clone's clock and channel-tile shape in line with the research findings and the project's own reference screenshot, while leaving everything else (empty-tile static, MacBook bezel framing, bottom bar, background) untouched.

**Architecture:** Two isolated component-level edits (Clock, Channel) plus one dead-code removal (`App.jsx`'s unused clip-path SVG def), followed by a manual visual verification pass against `reference_screen.png`. No new dependencies, no build config changes.

**Tech Stack:** React 18 + Vite, plain CSS (no CSS-in-JS/preprocessor), Google Fonts via `<link>` tags in `index.html`.

## Global Constraints

- Work stays inside the existing React/Vite codebase — no framework/tooling changes (a separate research track is evaluating that independently).
- No automated test suite exists in this project — verification is manual, via dev server + browser, compared against `reference_screen.png`.
- Keep the MacBook-bezel "TV frame" wrapper as-is.
- Keep the animated TV-static effect on empty channel tiles (`ChannelStatic.jsx`) — do not touch it.
- No real channel content (Disc/Mii/Photo/etc.) this iteration — channels stay empty.
- Clock keeps `H:MM AM/PM` format (confirmed correct by `reference_screen.png`, which shows `12:00 AM`).
- Design source of truth: `docs/superpowers/specs/2026-07-24-shell-chrome-design-iteration-design.md` and `context/visual-design.md` / `context/clock.md` / `context/technical-specs.md`.

---

### Task 1: Clock — proportional font digits with drop shadow

**Files:**
- Modify: `index.html` (add a Google Fonts link)
- Modify: `src/components/Clock.jsx` (full rewrite — replace seven-segment rendering with text)
- Modify: `src/components/Clock.css` (font, color, drop shadow; remove now-unused segment styles)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `Clock` default export unchanged in signature (no props, no return-value contract with parents) — `WiiMenu.jsx` continues to render `<Clock />` inside `.clock-above-bar` with no changes needed there.

- [ ] **Step 1: Add the replacement font to `index.html`**

Open `index.html` and add a second Google Fonts `<link>` pair right after the existing `RocknRoll One` one:

```html
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=RocknRoll+One&display=swap" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@500;700&display=swap" rel="stylesheet" />
```

(Only the last line is new — the `preconnect` links and the `RocknRoll One` link already exist and stay as-is.)

- [ ] **Step 2: Rewrite `src/components/Clock.jsx`**

Replace the entire file contents with:

```jsx
import { useState, useEffect } from 'react'
import './Clock.css'

export default function Clock() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const hours = time.getHours()
  const minutes = time.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const display12 = hours % 12 || 12
  const minutesPadded = String(minutes).padStart(2, '0')

  return (
    <div className="clock-container">
      <span className="clock-time">{display12}:{minutesPadded}</span>
      <span className="clock-ampm">{ampm}</span>
    </div>
  )
}
```

This drops `DIGIT_SEGMENTS`, `SEGMENT_POINTS`, `SevenSegDigit`, and `SevenSegColon` entirely — the digits are now plain text, so no per-segment SVG rendering is needed.

- [ ] **Step 3: Rewrite `src/components/Clock.css`**

Replace the entire file contents with:

```css
.clock-container {
  display: flex;
  align-items: baseline;
  gap: clamp(4px, 1vw, 12px);
  user-select: none;
}

.clock-time {
  font-family: 'M PLUS Rounded 1c', 'Quicksand', Arial, sans-serif;
  font-weight: 700;
  font-size: clamp(20px, 4.37vw, 66px);
  color: #7a7a7a;
  letter-spacing: 0.5px;
  font-variant-numeric: tabular-nums;
  text-shadow:
    0 1px 0 rgba(255, 255, 255, 0.6),
    0 2px 3px rgba(0, 0, 0, 0.18);
}

.clock-ampm {
  font-family: Arial, Helvetica, sans-serif;
  font-size: clamp(8px, 1.72vw, 26px);
  font-weight: 700;
  color: #9b9b9b;
  letter-spacing: 1px;
  align-self: flex-end;
  margin-bottom: 0.15em;
}
```

This removes the old `.clock-time` flex-row-of-segments layout, `.seg-group`, `.seg-digit`, and `.seg-colon` rules (no longer applicable since there are no SVG segments), and keeps `.clock-ampm` visually similar to before (same font stack/weight/tracking) but re-tuned to sit next to plain text instead of SVG digits.

- [ ] **Step 4: Visually spot-check in isolation**

Run `npm run dev` from `/Users/brunoneira/orchids-projects/wiimenu-website`, open the printed local URL in a browser, and confirm:
- The clock renders as proportional-font digits (not blocky LCD segments).
- A soft shadow is visible behind the digits.
- `AM`/`PM` still renders next to the time.
- Nothing overlaps the bottom bar or looks obviously mispositioned.

Leave the dev server running for Task 2 and Task 3.

- [ ] **Step 5: Commit**

```bash
git add index.html src/components/Clock.jsx src/components/Clock.css
git commit -m "Switch clock to proportional-font digits with drop shadow

Replaces seven-segment LCD-style rendering with real text digits per
context/clock.md, which found the actual Wii Menu clock uses the
system's proportional font (Rodin NTLG) with a drop shadow, not
segmented digits."
```

---

### Task 2: Channel tiles — plain rounded rectangle instead of pillow clip-path

**Files:**
- Modify: `src/App.jsx` (remove the now-unused `#crt-clip` SVG def)
- Modify: `src/components/Channel.css` (`.channel` and `.channel-inner` shape)

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: no interface change — `Channel.jsx` (unmodified) continues to render `.channel > .channel-inner` exactly as before; only the CSS shape mechanism changes.

- [ ] **Step 1: Simplify `src/App.jsx`**

The current file wraps a hidden `<svg>` (defining `#crt-clip`, a `clipPath` used by `.channel`) around `<WiiMenu />`. Once `.channel` no longer references it (Step 2 below), nothing uses this def. Replace the entire file contents with:

```jsx
import WiiMenu from './components/WiiMenu'

function App() {
  return <WiiMenu />
}

export default App
```

- [ ] **Step 2: Update `.channel` and `.channel-inner` in `src/components/Channel.css`**

Replace the `.channel` and `.channel-inner` rule blocks (the file's first two rule blocks, roughly lines 1–31) with:

```css
.channel {
  position: relative;
  /* Figma-derived dimensions: 306.91 × 169.06px */
  aspect-ratio: 307 / 169;
  border-radius: 10% / 18%;
  background: #b8bfc8;
  cursor: pointer;
  transition: transform 0.1s ease;
}

.channel:hover {
  transform: scale(1.03);
}

.channel:hover .channel-inner::after {
  opacity: 0.3;
}

.channel-inner {
  position: absolute;
  inset: 2.5% 1.5%;
  border-radius: 8% / 15%;
  background: #d8dadc;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
```

Leave the rest of the file (the `.channel-inner::before` gloss overlay and `.channel-inner::after` hover highlight rule blocks, at the end of the file) exactly as-is — they're unrelated to the tile's outer shape.

- [ ] **Step 3: Visually spot-check against the reference screenshot**

With the dev server still running, reload the browser and compare the channel grid's corner rounding against `reference_screen.png` (open it in an image viewer or via the Read tool). If the corners read as too round or too sharp relative to the reference, adjust the two `border-radius` percentages (keep the two values — horizontal/vertical — in the same rough ratio) and reload until it visually matches. Confirm hover scale/highlight still works and no tile clips oddly at grid edges.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx src/components/Channel.css
git commit -m "Simplify channel tiles from pillow clip-path to rounded rectangle

context/visual-design.md flagged the concave/bowed-side 'CRT pillow'
shape as likely overstated after pixel-inspecting reference_screen.png,
which shows plain rounded-rectangle tiles. Removes the now-unused
#crt-clip SVG def from App.jsx."
```

---

### Task 3: Full verification pass (bottom bar, background, overall)

**Files:** none expected — this task only edits files if the visual check in Step 2 finds a real discrepancy, in which case the specific file(s) found to be off (`src/components/BottomBar.css` and/or `src/components/WiiMenu.css`) get a targeted fix.

**Interfaces:**
- Consumes: the running dev server and completed changes from Task 1 and Task 2.
- Produces: nothing consumed by later tasks — this is the final task in the plan.

- [ ] **Step 1: Take a full-page screenshot of the running app**

With `npm run dev` still running, use the browser to load the app's local URL, then take a screenshot of the whole rendered `.tv-frame` area (e.g. via the Claude in Chrome extension's screenshot tool, or any screenshot method available).

- [ ] **Step 2: Side-by-side comparison against `reference_screen.png`**

Read `/Users/brunoneira/orchids-projects/wiimenu-website/reference_screen.png` and compare against the Step 1 screenshot on these specific points:
- Background tone (should already match — light neutral gray, not blue).
- Bottom bar shape, Wii button position/style, Message Board icon position/style, date text position — should already match, per `context/system-ui.md`.
- Clock position and general weight (from Task 1).
- Channel tile corner rounding (from Task 2).

If everything matches (expected outcome per the design spec), skip to Step 4.

- [ ] **Step 3: Fix any real discrepancy found (conditional)**

If Step 2 surfaces an actual mismatch in the bottom bar or background (not clock/tiles, which are covered by Tasks 1–2), make the smallest possible CSS edit in `src/components/BottomBar.css` or `src/components/WiiMenu.css` to correct it, reload, and re-compare. Do not restructure either file beyond the specific discrepancy found.

- [ ] **Step 4: Stop the dev server**

Stop the `npm run dev` process (Ctrl-C in its terminal, or kill the background process if it was started with `run_in_background`).

- [ ] **Step 5: Commit (only if Step 3 made changes)**

```bash
git add src/components/BottomBar.css src/components/WiiMenu.css
git commit -m "Fix <specific discrepancy> found in visual verification pass"
```

If Step 3 made no changes, there is nothing to commit for this task — the plan is complete after Task 2's commit.
