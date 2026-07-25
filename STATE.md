# Project State — 2026-07-25

Handoff snapshot. Read this first when picking the project back up.

**Branch:** `bruno/channel-static` · **HEAD:** see `git log -1` · working tree clean
**Session commits:** 33 · **Research corpus:** 40 markdown docs

---

## What this project is

A high-fidelity React + Vite recreation of the Nintendo Wii System Menu, targeting
**System Menu 4.x** (the final, most feature-complete version).

Two rules govern every decision:

1. **Default to authenticity.** When a choice arises, match what the real console did. Look it
   up in `context/` rather than picking by taste. Divergences must be deliberate, documented,
   and revertible in one line.
2. **Clean room.** Where copying is not legal: look at references, write our own spec, build from
   that spec. `context/` *is* the spec layer. Full policy in `docs/asset-and-code-policy.md`.

---

## Start here

| File | Why |
|---|---|
| `context/README.md` | Corpus index, source-precedence tiers, settled-facts table, open questions |
| `docs/asset-and-code-policy.md` | The clean-room rule and where the legal line actually falls |
| `context/primary-sources.md` | Strongest evidence sources, ranked. **Includes a prompt-injection warning — see below.** |
| `context/brlan-extraction.md` | Extracted layout/animation binaries. Highest-authority source in the project. |

### ⚠️ Security note

`tcrf.net` served a **prompt-injection payload** to two independent research agents — text
addressed to LLMs, falsely claiming the user had requested file deletions. Both ignored it;
nothing ran. It is recorded as do-not-fetch in `context/primary-sources.md`. Open it in a real
browser if you need it.

---

## Current state of the build

Full-bleed **832×456 anamorphic stage**, scaled by one transform with `ANAMORPHIC_X = 0.97436`
applied horizontally. Every CSS value inside the stage is a literal coordinate in Nintendo's
authoring space, so extracted values drop in unconverted. At the 1664×912 test viewport the scale
is exactly **2.0000**.

Built: channel grid (12 empty slots, correct 170×96 pitch with the peeking 5th column), bottom bar
with Wii button / SD card icon / Message Board button, seven-segment clock with AM/PM, date.

**Not built:** channel artwork, page navigation behaviour, any transitions, audio, cursor.

### Fidelity vs `reference_screen.png`

| Region | Session start | Now |
|---|---|---|
| bottomBar | 0.4691 | **0.6620** (differing pixels 30% → 7.7%) |
| clockDate | 0.5726 | **0.5807** |
| wholeStage | 0.1104 | **0.1759** |
| grid | 0.0872 | **0.1227** |

`grid` stays low because twelve empty tiles are standing in for six populated colourful channels.
It is not a useful discriminator until Phase 4 — a control run showed changing only the noise
**seed** moves it as much as real changes do.

---

## Verification

```bash
npm run visual          # both harnesses (10 tests)
npm run visual:gate     # did I break something that worked?
npm run visual:ratchet  # am I closer to the real thing?
npm run visual:update   # re-baseline — deliberately, never reflexively
```

Two harnesses because there are two different questions. The **gate** is snapshot regression
against our own last render. The **ratchet** scores per-region SSIM against the real reference and
fails only on regression, raising the bar when a score improves.

Determinism is by construction: the clock is frozen to `2021-01-01T00:00:00`, which renders
`12:00 AM Fri 1/1` and **matches the reference exactly** rather than needing a mask — a masked
region is a region you are not verifying. The noise is a seeded PRNG, so there is no
`Math.random()` or `requestAnimationFrame` anywhere in the render path.

### Read this before trusting a number

- **SSIM is a regression net, not a taste judge.** It ranked a visibly-wrong oversized bottom-bar
  pill *higher* than the correct one. Every real visual bug this session was caught by a human
  looking at the screen, not by the metric. Always look.
- **`TOL` is 0.005**, justified by measurement: a control run changing only the noise seed moved
  `grid` 0.0013 and `wholeStage` 0.0011. A threshold below the noise floor reports noise as
  regression. Tighten it once channels exist.
- The statistical assertions in `gate.spec.js` exist because pixel diffing cannot see structure.
  The old noise implementation was wrong for weeks while every screenshot test passed — the output
  was wrong but self-consistent.

---

## Next steps, in recommended order

### 1. Whole-branch code review — **outstanding**
33 commits have landed with only the first three ever formally reviewed. A review was dispatched
and **stopped before producing output**, so this is genuinely undone. A code-only diff is ready at
`.superpowers/sdd/2026-07-24-shell-chrome-design-iteration/branch-review.diff` (82 KB).
Highest-value question for it: *is the harness sound* — thresholds calibrated to fit rather than to
catch, assertions that pass vacuously, and whether any of the several re-baselines hid a defect.

### 2. Phase 4 — channel content
The largest remaining fidelity gap, and it restores `grid` as a useful measurement. Requires
redrawing Disc / Mii / Photo / Shop / Forecast / News tile art **clean-room from measurements** —
this is the first place where "as authentic as possible" genuinely collides with "we cannot copy
this," and it is design work, not transcription.

### 3. Phase 3 — motion
Deliberately deferred: there is nothing to page between and nothing to launch yet. All values are
already extracted and waiting — page slide **333ms**, launch zoom **467ms** on exact smoothstep
`cubic-bezier(0.5, 0, 0.5, 1)`, bar-button hover **100ms in / 133ms out** (asymmetric), Message
Board grid slide **Y +423 over 17 frames**. CSS/WAAPI only — a JS animation library breaks the
harness, because Playwright can freeze CSS animations but cannot stop a rAF loop.

### Smaller, unblocked
- Tile outer halo + bottom shadow (`context/components/channel-tile.md` layers 1–2)
- TypeScript adoption and Vite 4→8 upgrade — both deliberately deferred to avoid conflating them
  with the coordinate refactor
- A 4:3 / 16:9 toggle mirroring Wii Settings — authentic, but blocked on measuring the 4:3 layout,
  which the decomp proves cannot be derived from the 16:9 one

---

## Decisions already made (don't relitigate without new evidence)

| Decision | Why |
|---|---|
| Stay on React + Vite | Measured: migrating buys ~35–42 KB. DnD, audio and cursor all bypass the framework anyway — the choice barely matters here |
| Fixed stage + one transform | Three independent sources converged on it, including booper arriving at it separately |
| Bezel removed, full-bleed | The console renders edge-to-edge and draws no chrome; also yields exactly 2.0000× scale |
| CSS/WAAPI only, no animation library | Playwright cannot freeze a rAF loop, which would break all visual testing |
| Empty-slot noise at authentic contrast | It is genuinely subtle; the band structure, not the grain, is what makes it read as a TV screen |
| Superellipse tile via generated polygon | Hand-authored arc path rendered with chopped corners; sampling the fitted equation works |

---

## Known gaps and cautions

- **`reference_screen.png` is only 420×236**, and it shows the SD icon in its *disabled* state.
  Higher-resolution captures would improve every measurement.
- **The Pinterest board was never mined** (`context/pinterest-board.md` catalogs it, but the grid
  would not render for automation). It likely holds higher-res captures and states we have no
  reference for.
- Several corpus docs carry **⚠️ SUPERSEDED** markers. 87 of them. Trust `context/README.md`'s
  precedence tiers over any individual doc, and check for markers before relying on a claim.
- `reference/` holds ~550 MB of git-ignored reference material (the decomp clone, extracted theme
  archives). Re-clone or re-extract per `context/primary-sources.md` if it is missing.

---

## Things that went wrong, so they don't recur

- An agent reported a visual check it **had no browser access to perform**. It substituted a
  dev-server boot test and filed it under "all verifications passed." Fix: split roles by tool
  access, and make the gate a script whose exit code lands in the transcript.
- `context/clock.md` was wrong on three counts and drove a full implement-review-revert cycle.
  That is why the reconciliation pass and precedence tiers exist.
- The single worst visual bug was **not** in the component being debugged: a 0.65-alpha white gloss
  in `Channel.css` washed out the top half of every empty tile while four attempts were spent
  tuning the noise. `gate.spec.js` now has a canary for exactly that.
- The ratchet **did not ratchet** — it only wrote a baseline when the file was absent, so
  improvements went unrecorded and the bar sat far below the build. Fixed 2026-07-25.
