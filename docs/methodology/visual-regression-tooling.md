# Visual Regression & Reference-Match Tooling

**Research date:** 2026-07-24
**Scope:** methodology / tooling, not domain research.
**Motivating failure:** an agent reported "visual verification passed" for a check it had no browser access to perform. The fix is not "try harder to look" — it is to make verification produce a **machine-checkable artifact with a numeric score and a nonzero exit code**, so that a claim of success is either backed by a file on disk or is trivially falsifiable.

> **Design principle for everything below:** the verification step must fail *loudly and by default*. An agent that cannot run the browser must get an error, not an empty pass. Prefer `process.exit(1)` / test-runner failure over printed warnings.

---

## 0. TL;DR / Recommended stack

Jump to [§8](#8-recommended-stack-for-this-project) for the concrete recommendation. Short version:

| Layer | Choice |
|---|---|
| Browser driver | **Playwright** (`@playwright/test` 1.62.0), headless Chromium, scripted |
| Regression (drift vs. own last render) | **`expect(page).toHaveScreenshot()`** with baselines committed |
| Reference match (vs. `reference_screen.png`) | **standalone Node script**: `sharp` (normalize) → `pixelmatch` (diff PNG + pixel %) + windowed **SSIM** (structural score) |
| Determinism | `page.clock.setFixedTime()`, `animations: 'disabled'`, injected CSS kill-switch, `document.fonts.ready`, self-hosted fonts, seeded `Math.random`, fixed viewport + `deviceScaleFactor` |
| Agent access | Scripted Playwright via Bash (primary) + Playwright MCP `browser_take_screenshot` (interactive) |

Skip: BackstopJS (dormant), Lost Pixel (archived), all hosted SaaS (built for CI + teams; this project has neither).

---

## 1. Playwright's built-in visual comparison

**Status: actively maintained.** `playwright` / `@playwright/test` **1.62.0**, published 2026-07-24 (npm registry). This is the strongest default and it deserves to be the backbone of the setup.

### What it does

`await expect(page).toHaveScreenshot()` captures a screenshot, compares it to a stored baseline PNG, and fails the test with a three-way diff (expected / actual / diff) in the HTML report. On first run with no baseline it *writes* the baseline and fails the test — deliberately, so a missing baseline can't silently pass.

### Setup

```bash
npm i -D @playwright/test
npx playwright install chromium   # ~150MB browser download, one-time
```

`playwright.config.js`:

```js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // no CI here — fail fast, don't retry into a false green
  retries: 0,
  forbidOnly: true,
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    locale: 'en-US',
    timezoneId: 'America/New_York',
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.002,
      threshold: 0.2,
      animations: 'disabled',
      scale: 'css',
      stylePath: './tests/screenshot.css',
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

### Baselines: where they live, how they're named

Snapshots go in a directory named after the test file — `menu.spec.js` → `menu.spec.js-snapshots/`. The filename pattern is `{name}-{browser}-{platform}.png`, e.g. `landing-chromium-darwin.png`. The `-darwin` suffix is load-bearing: **a baseline recorded on macOS will not be used on Linux**, and Playwright will treat the Linux run as "missing baseline" rather than silently comparing across platforms. For a solo macOS project that's harmless; it's the thing that bites people the moment they add CI.

Override the layout with `snapshotPathTemplate` in the config. Tokens: `{testDir}`, `{testFileDir}`, `{testFileName}`, `{testFileBaseName}`, `{testFilePath}`, `{testName}`, `{arg}`, `{ext}`, `{projectName}`, `{platform}`, `{snapshotDir}`.

```js
snapshotPathTemplate: '{testDir}/__screenshots__/{testFileBaseName}/{arg}{ext}',
```

Dropping `{platform}`/`{projectName}` is exactly the trick that makes [§5](#5-comparing-against-a-static-reference-image) work.

### Updating baselines

```bash
npx playwright test -u                    # mode "changed" — updates only mismatches
npx playwright test --update-snapshots=all      # rewrite everything
npx playwright test --update-snapshots=missing  # default when no flag is passed
npx playwright test --update-snapshots=none     # never write; pure verification
npx playwright test --ignore-snapshots          # skip screenshot assertions entirely
```

Modes are `all` / `changed` / `missing` / `none`. Running **without** the flag defaults to `missing`; running **with** the flag but no value defaults to `changed`. There is also an `updateSnapshots` config field with the same values.

> **Agent-safety note:** `-u` is the single most dangerous command in this stack. An agent that can't make a test pass can "fix" it by regenerating the baseline. Consider setting `updateSnapshots: 'none'` in the config so baseline refresh requires an explicit human-typed CLI override, and treat any diff in `*-snapshots/` in `git diff` as requiring review.

### Full option list for `toHaveScreenshot()`

| Option | Default | Notes |
|---|---|---|
| `animations` | `"disabled"` | Stops CSS animations, CSS transitions and Web Animations. Finite animations are fast-forwarded to completion; infinite ones are reset to the start. |
| `caret` | `"hide"` | Hides the text caret. |
| `clip` | — | `{x, y, width, height}` region to capture. |
| `fullPage` | `false` | Capture the full scrollable page. |
| `mask` | — | Array of `Locator`s painted over with a solid box. |
| `maskColor` | `#FF00FF` | CSS color for the mask overlay. |
| `maxDiffPixels` | — | Absolute count of allowed differing pixels. |
| `maxDiffPixelRatio` | — | Ratio 0–1 of allowed differing pixels. |
| `omitBackground` | `false` | Transparent instead of white background. |
| `scale` | `"css"` | `"css"` = one image pixel per CSS pixel (resolution-independent); `"device"` = native device pixels. |
| `stylePath` | — | Path(s) to a stylesheet injected before capture. **The determinism hook.** |
| `threshold` | `0.2` | Acceptable perceived color difference in the **YIQ** color space, per pixel, 0–1. |
| `timeout` | from `expect` | Retry window. |

`threshold` and `maxDiffPixels`/`maxDiffPixelRatio` are two different knobs and both matter: `threshold` decides *whether a given pixel counts as different*, `maxDiffPixels*` decides *how many different pixels are tolerable*. Tuning only one of them is the usual reason people can't find a stable setting. Start with `threshold: 0.2` (default) and `maxDiffPixelRatio: 0.002`, then tighten.

### Masking dynamic regions

```js
await expect(page).toHaveScreenshot('menu.png', {
  mask: [page.locator('.clock-container'), page.locator('canvas')],
  maskColor: '#FF00FF',
});
```

Masking is the blunt instrument: the region is painted magenta in **both** the baseline and the candidate, so it can never differ — and can never be verified either. For this project, masking the clock and the static canvas would work but would throw away two of the more interesting things to get right. Prefer freezing ([§6](#6-determinism--the-real-battle)) over masking, and reserve masking for things genuinely outside your control.

### Fit for a CI-less local hobby project

Good, with caveats.

**Pros:** zero recurring cost; baselines are plain PNGs in git; the HTML report (`npx playwright show-report`) gives a slider-based side-by-side diff view that a human can actually read; `webServer` boots Vite automatically; the assertion has built-in auto-retry, so it re-screenshots until two consecutive captures agree — a genuinely useful anti-flake mechanism you'd otherwise hand-roll.

**Cons:**
- Baseline PNGs bloat the repo over time (mitigable: only snapshot a handful of canonical states).
- It compares against **your own previous render**, which is the wrong question for this project (see [§5](#5-comparing-against-a-static-reference-image)).
- Chromium version bumps on `npm update` will shift antialiasing and invalidate baselines. **Pin the Playwright version exactly** (`"@playwright/test": "1.62.0"`, not `^1.62.0`) — a floating minor is the #1 source of mystery diffs on a project with no CI to catch it early.
- The 3-way diff lives in the HTML report; an agent working from a terminal gets only the numbers unless it explicitly reads the PNG at `test-results/.../*-diff.png`.

Sources: <https://playwright.dev/docs/test-snapshots>, <https://playwright.dev/docs/api/class-pageassertions>, <https://playwright.dev/docs/test-cli>, <https://playwright.dev/docs/api/class-testconfig>

---

## 2. Standalone pixel-diff libraries

These are what you use when you want a *script*, not a test suite — which is exactly the reference-image workflow.

### 2.1 pixelmatch — the default

**v7.2.0**, published 2026-04-29. 6.9k stars, actively maintained (Mapbox), ISC license. This is the library Playwright itself vendors for `toHaveScreenshot`.

```bash
npm i pixelmatch pngjs
```

```js
pixelmatch(img1, img2, output, width, height, options)  // → number of mismatched pixels
```

Options: `threshold` (0–1, default `0.1`), `includeAA` (default `false` — antialiased pixels are *detected and excluded* by default), `alpha` (0.1, opacity of the unchanged background in the diff), `aaColor` (`[255,255,0]` yellow), `diffColor` (`[255,0,0]` red), `diffColorAlt` (second color to distinguish additions from removals), `diffMask` (diff on transparent background), `checkerboard`, `windowSize`.

**Notable in v7:** the color metric moved to **OKLab** with the HyAB distance metric, replacing the older YIQ approach. This is meaningfully better perceptually — but it means pixelmatch 7's `threshold` is *not* numerically equivalent to Playwright's `threshold` (still documented as YIQ) or to odiff's. Don't copy threshold values between tools.

**Strengths:** best-in-class antialiasing detection, tiny dependency footprint, dead-simple API, the diff PNG (red diff pixels over a faded original) is the most readable of the bunch.
**Downsides:** requires you to decode PNGs yourself (`pngjs` or `sharp`); requires all three buffers to be identical dimensions and will throw otherwise; single-threaded JS, so it's the slowest of the four on large images.

### 2.2 odiff — the fast one

**`odiff-bin` v4.5.0**, published 2026-07-23. 3.1k stars, MIT, very actively maintained. Originally OCaml, **now rewritten in Zig with SIMD** (SSE2/AVX2/AVX512/NEON).

```bash
npm i odiff-bin        # ships prebuilt native binaries
```

Benchmarks from the repo: ~**6.7× faster than pixelmatch** on standard screenshots (1.168s vs 7.712s) and ~5.5× on 8K images. It reads PNG, JPEG, WebP, TIFF and BMP directly — no separate decoder needed, which is a real ergonomic win over pixelmatch.

CLI (verified locally against `odiff 4.5.0`):

```
odiff <base_image> <comp_image> [diff_output] [options]
  -t, --threshold <0.0-1.0>   default 0.1
  --antialiasing              ignore antialiased pixels
  --diff-mask                 changed pixels only, transparent background
  --diff-overlay [value]      render diff on white background
  --fail-on-layout            fail if dimensions differ
  --diff-color <#hex>
  --parsable-stdout           machine-readable output
  -i, --ignore <x1:y1-x2:y2,...>   ignore regions   ← ROI exclusion, no browser needed
  --output-diff-lines / --output-diff-cols
  --reduce-ram-usage

Exit codes:  0 = match   21 = layout difference (with --fail-on-layout)   22 = pixel differences
```

Those exit codes are the single best feature for agent work: `odiff a.png b.png diff.png` in a Bash tool call either exits 0 or it doesn't. There is nothing to hallucinate.

**Verified caveat:** odiff does **not** resize. Feeding it a 1280×720 render and the 420×236 reference produced `Found 876186 different pixels (95.07%)` — garbage, not an error, because `--fail-on-layout` was not passed. **Always pass `--fail-on-layout`**, or normalize dimensions first.

Uses YIQ, like classic pixelmatch. Antialiasing handling is good but a notch behind pixelmatch's.

### 2.3 Resemble.js — semi-dormant, skip

**v5.0.0**, published 2023-06-06; last repo push 2024-02-06. 4.6k stars, MIT. The README self-describes as being in **"ultra low-maintenance mode"** with roughly annual updates. Not abandoned, but not moving.

```bash
npm i resemblejs canvas   # Node.js needs node-canvas
```

```js
resemble(file1).compareTo(file2).ignoreColors().onComplete(data => {
  console.log(data.misMatchPercentage, data.dimensionDifference, data.analysisTime);
  data.getImageDataUrl(); // diff as data URL
});
```

Genuinely distinctive features: `scaleToSameSize` (handles mismatched dimensions for you — rare and directly relevant here), `ignoreColors` / `ignoreAntialiasing` / `ignoreAlpha` / `ignoreLess` modes, `boundingBox`/`boundingBoxes` and `ignoredBox`/`ignoredBoxes` for region-of-interest work, `errorType: 'movement' | 'flat' | 'flatDifferenceIntensity'`, and `ignoreAreasColoredWith`.

**Downsides:** callback-based API in a promise world; **requires `node-canvas`**, a native module with a Cairo/Pango build chain that is a recurring install headache on macOS; slow. The `scaleToSameSize` convenience is not worth the dependency when `sharp` does resizing better and faster. **Skip.**

### 2.4 looks-same — the perceptual one

**v10.0.1**, published 2025-08-18. 828 stars, MIT, maintained by the `gemini-testing` group (the Hermione/testplane people). Reasonably active.

```bash
npm i looks-same
```

```js
const looksSame = require('looks-same');
const { equal, diffClusters, diffBounds } = await looksSame('ref.png', 'cand.png', {
  tolerance: 2.3,        // ΔE threshold (CIEDE2000)
  ignoreAntialiasing: true,   // on by default
  ignoreCaret: true,          // on by default
  shouldCluster: true,        // group diffs into spatial clusters
  clustersSize: 10,
});
await looksSame.createDiff({ reference: 'ref.png', current: 'cand.png', diff: 'diff.png', highlightColor: '#ff00ff' });
```

**Distinctive value:** it uses **CIEDE2000** ΔE, the standards-body perceptual color-difference metric, with a default `tolerance` of 2.3 (the classic "just noticeable difference"). And `diffBounds`/`diffClusters` return *coordinates* of where the differences are — not just a count. For agent work that is unusually useful: "differs in a cluster at x:180–240, y:150–170" is directly actionable in a way that "0.64% of pixels differ" is not.

**Downsides:** smaller ecosystem, PNG-focused, and `tolerance` is on a ΔE scale that doesn't map onto anything else you'll be using. Worth adding *alongside* pixelmatch if you want localized diff coordinates.

### 2.5 Comparison table

| | pixelmatch 7.2.0 | odiff-bin 4.5.0 | resemblejs 5.0.0 | looks-same 10.0.1 |
|---|---|---|---|---|
| Last publish | 2026-04-29 | 2026-07-23 | 2023-06-06 | 2025-08-18 |
| Maintained | Yes | Yes, very | ⚠️ "ultra low-maintenance" | Yes |
| Language | JS | Zig + SIMD (native) | JS + node-canvas | JS |
| Speed | baseline | ~6.7× faster | slow | moderate |
| Color metric | OKLab (HyAB) | YIQ | RGB/brightness | CIEDE2000 ΔE |
| Antialiasing | Best | Good (`--aa`) | Good | Good (default on) |
| Diff image quality | Best (red-on-faded) | Good | Good | Good |
| Decodes images itself | No (needs pngjs/sharp) | **Yes** (PNG/JPEG/WebP/TIFF/BMP) | Yes | PNG |
| Handles size mismatch | ✗ throws | ✗ (use `--fail-on-layout`) | ✓ `scaleToSameSize` | ✗ |
| Region ignore | ✗ (mask manually) | ✓ `-i x1:y1-x2:y2` | ✓ `ignoredBoxes` | ✓ |
| Diff **locations** | ✗ | lines/cols | boundingBox | ✓ `diffClusters` |
| Exit code for scripts | n/a (library) | ✓ 0/21/22 | n/a | n/a |
| API ergonomics | Excellent | Excellent (CLI + JS) | Dated (callbacks) | Good |

### 2.6 Minimal working example — verified

The following was **actually executed** on this machine, not merely written down. It normalizes a candidate of arbitrary resolution to the reference's dimensions, writes a diff PNG, and prints both a pixel-mismatch percentage and an SSIM structural score.

```bash
npm i -D sharp pixelmatch pngjs
```

```js
// scripts/compare.mjs
import fs from 'node:fs';
import sharp from 'sharp';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const [refPath, candPath, outPath = 'diff.png'] = process.argv.slice(2);
const MAX_DIFF_RATIO = 0.02;   // 2% of pixels
const MIN_SSIM       = 0.95;

const { width, height } = await sharp(refPath).metadata();

// Normalize BOTH images to the reference geometry. Lanczos3 keeps edges honest.
const norm = (p) =>
  sharp(p)
    .resize(width, height, { fit: 'fill', kernel: 'lanczos3' })
    .removeAlpha().ensureAlpha(1)
    .raw().toBuffer();

const [a, b] = await Promise.all([norm(refPath), norm(candPath)]);

const diff = new PNG({ width, height });
const mismatched = pixelmatch(a, b, diff.data, width, height, {
  threshold: 0.1,
  includeAA: false,
});
fs.writeFileSync(outPath, PNG.sync.write(diff));

const total = width * height;
const ratio = mismatched / total;

// --- windowed grayscale SSIM (8x8), ~35 lines, no dependency ---
const gray = (buf) => {
  const g = new Float64Array(total);
  for (let i = 0; i < total; i++)
    g[i] = 0.2126 * buf[i * 4] + 0.7152 * buf[i * 4 + 1] + 0.0722 * buf[i * 4 + 2];
  return g;
};
function ssim(g1, g2, w, h, win = 8) {
  const C1 = (0.01 * 255) ** 2, C2 = (0.03 * 255) ** 2;
  let acc = 0, n = 0;
  for (let y = 0; y + win <= h; y += win) {
    for (let x = 0; x + win <= w; x += win) {
      let m1 = 0, m2 = 0;
      for (let j = 0; j < win; j++) for (let i = 0; i < win; i++) {
        m1 += g1[(y + j) * w + x + i]; m2 += g2[(y + j) * w + x + i];
      }
      const N = win * win; m1 /= N; m2 /= N;
      let v1 = 0, v2 = 0, cov = 0;
      for (let j = 0; j < win; j++) for (let i = 0; i < win; i++) {
        const d1 = g1[(y + j) * w + x + i] - m1, d2 = g2[(y + j) * w + x + i] - m2;
        v1 += d1 * d1; v2 += d2 * d2; cov += d1 * d2;
      }
      v1 /= N - 1; v2 /= N - 1; cov /= N - 1;
      acc += ((2 * m1 * m2 + C1) * (2 * cov + C2)) /
             ((m1 * m1 + m2 * m2 + C1) * (v1 + v2 + C2));
      n++;
    }
  }
  return acc / n;
}
const score = ssim(gray(a), gray(b), width, height);

console.log(JSON.stringify({
  reference: refPath, candidate: candPath, diff: outPath,
  size: `${width}x${height}`,
  mismatchedPixels: mismatched,
  mismatchRatio: +ratio.toFixed(5),
  ssim: +score.toFixed(4),
}, null, 2));

const pass = ratio <= MAX_DIFF_RATIO && score >= MIN_SSIM;
console.log(pass ? 'PASS' : 'FAIL');
process.exit(pass ? 0 : 1);   // ← the part that makes this unfakeable
```

**Verified output** (reference vs. a deliberately brightened, up-then-down-scaled copy of itself):

```
reference: 420 x 236 png
pixelmatch: 638/99120 = 0.644% differing
SSIM: 0.9700
SSIM (self): 1.0000
```

The self-comparison returning exactly `1.0000` is the sanity check that the metric is wired up correctly. **Always include a self-comparison assertion in the harness** — it's how you catch a script that "passes" because it's comparing an image to itself, or because it silently failed to load the candidate.

---

## 3. Hosted / managed visual regression services

All of these are built around the same assumption: **a CI pipeline that uploads screenshots on every PR, and humans who approve diffs in a web UI.** This project has neither a CI pipeline nor a second human. That makes essentially all of them a poor fit — but here's the honest survey.

| Service | Free tier | Paid entry | Fit here |
|---|---|---|---|
| **Argos** | **5,000 screenshots/mo**, forever ("Hobby") | Pro from **$100/mo** (35k screenshots, $0.004 overage) | Best of the bunch. First-class Playwright SDK (`@argos-ci/playwright` **7.3.7**, published 2026-07-23), MIT-licensed platform repo, actively developed. Still needs GitHub/GitLab integration to be worth anything. |
| **Chromatic** | **5,000 snapshots/mo**, Chrome only, no card | Starter **$179/mo** (35k snapshots, $0.008 overage); Pro $399/mo | Built by the Storybook maintainers and heavily Storybook-shaped. This project has no Storybook. TurboSnap (change-based snapshot skipping) is great at scale, irrelevant at n=1. |
| **Percy** (BrowserStack) | Historically ~5,000 screenshots/mo — **could not verify: the pricing page is client-rendered and returned no content to WebFetch** | Contact BrowserStack | Mature, but now folded into BrowserStack's enterprise motion. Overkill. |
| **Applitools** | No published free-tier limits; "Start Free Trial" only | **Quote-only**, all tiers. Sold in "Test Units". | The Visual AI engine is legitimately the most sophisticated diffing on the market (it reasons about layout shifts rather than pixels, and has a "Layout" match level that ignores content while checking structure). But quote-only enterprise pricing rules it out. |
| **Lost Pixel** | — | — | ☠️ **ARCHIVED 2026-04-22.** Repo is read-only; the team joined Figma and sunset the product. Was the leading OSS self-hostable option. **Do not adopt.** |

**Verdict: overkill, all of them.** The value proposition of hosted VRT is (a) a shared review UI for a team, (b) cross-browser rendering farms, and (c) build-to-build history. A solo dev with no CI gets none of that. Playwright's local HTML report covers the review-UI need at zero cost. If this project ever grows a GitHub Actions workflow and a collaborator, **Argos** is the one to revisit — free tier, Playwright-native, and the only one whose free tier is a real product rather than a trial.

Sources: <https://argos-ci.com/pricing>, <https://www.chromatic.com/pricing>, <https://applitools.com/pricing/>, <https://github.com/lost-pixel/lost-pixel>

---

## 4. BackstopJS and config-driven frameworks

**BackstopJS 6.3.25** — npm published 2024-09-07; last commit to `garris/BackstopJS` also **2024-09-07**; **576 open issues**; 7.2k stars; not formally archived.

That's ~22 months of no commits as of this writing. It is **dormant, not dead** — but for a project you're starting today in 2026, adopting a tool whose last release predates two years of Chromium changes is a bad trade.

For completeness, the model it offers is genuinely nice — a declarative `backstop.json`:

```json
{
  "id": "wiimenu",
  "viewports": [{ "label": "desktop", "width": 1280, "height": 720 }],
  "scenarios": [{
    "label": "Wii Menu home",
    "url": "http://localhost:5173",
    "selectors": ["document"],
    "hideSelectors": [".clock-container"],
    "removeSelectors": ["canvas"],
    "misMatchThreshold": 0.1,
    "requireSameDimensions": true,
    "onReadyScript": "puppet/onReady.js"
  }],
  "engine": "playwright",
  "engineOptions": { "browser": "chromium" }
}
```

with a three-command workflow: `backstop reference` → `backstop test` → `backstop approve`, plus an HTML "visual diff inspector" report. Config-over-code is a real advantage for an agent — a JSON file is far easier for an LLM to modify correctly than an imperative test suite.

**But:** every capability listed above now exists natively in Playwright (`mask`, `stylePath`, `clip`, `webServer`, the HTML report), maintained by a team shipping weekly. **Verdict: skip.** Adopt BackstopJS only if the declarative-config ergonomics matter more to you than maintenance, and accept that you're on your own for Chromium regressions.

Adjacent tools worth a one-line mention:
- **`jest-image-snapshot` 6.5.2** (2026-03-09) — still maintained, but only relevant if you're already in Jest. This project isn't.
- **`blink-diff`** — last published 2016. Abandoned.
- **`reg-suit`** — still maintained, S3-backed regression reporting; assumes CI.

Source: <https://github.com/garris/BackstopJS>

---

## 5. Comparing against a STATIC REFERENCE IMAGE

**This is the project's actual problem, and it is not what visual regression tooling is designed for.**

The distinction matters more than it first appears:

| | Classic visual regression | Reference-image matching (this project) |
|---|---|---|
| Baseline origin | Your own previous render | An **external artifact** (a photo/capture of the real Wii Menu) |
| Baseline is "correct"? | By definition — it's whatever you shipped | **It's the ground truth**; your render is what's wrong |
| Geometry | Identical by construction | **Different resolution, crop, aspect, possibly gamma** |
| Expected diff | ~0% (any diff is a bug) | Large at first, monotonically shrinking; **0% is unreachable** |
| Pass criterion | Binary: changed / unchanged | **A score to be improved**, with a ratchet |
| Right question | "Did I break it?" | "Did I get closer?" |

That last row is the key design insight: for this project the tool should be a **ratchet, not a gate**. You want a committed `baseline-score.json`, and a check that fails if the score gets *worse*, plus a command that records an improvement. That is a genuinely different harness from `toHaveScreenshot`, and no off-the-shelf tool ships it.

### 5.1 The cheap trick: hijack Playwright's baseline slot

Because Playwright baselines are just PNGs at a predictable path, you can **drop your reference image in as the baseline** and let `toHaveScreenshot` do the comparison. With `snapshotPathTemplate` you control that path exactly:

```js
// playwright.config.js
snapshotPathTemplate: '{testDir}/reference/{arg}{ext}',
```

then `cp reference_screen.png tests/reference/menu.png`, and run with `--update-snapshots=none` so it can never be overwritten.

**This only works if you can make the render match the reference's geometry.** Here the reference is **420 × 236** — small, and almost certainly not the aspect you'll render at. You would need `viewport: { width: 420, height: 236 }`, which will make a UI designed at 1280×720 lay out completely differently. So: nice trick, **wrong tool for this specific reference**. Use the standalone script instead. Revisit this if you ever capture a higher-resolution reference at your render's exact aspect ratio.

### 5.2 Geometry normalization (required)

The reference is 420×236 (aspect 1.7797), a 1280×720 render is 1.7778 — close but not equal, so a naive `fit: 'fill'` introduces a sub-pixel horizontal stretch. Options, in increasing sophistication:

1. **Downscale the render to the reference** (recommended to start). Cheap, and downscaling is more forgiving than upscaling — it hides subpixel text rendering differences that you don't actually care about. `sharp(cand).resize(420, 236, { fit: 'fill', kernel: 'lanczos3' })`.
2. **Upscale the reference to the render.** Better for judging *layout*, terrible for judging *texture* — you'll be diffing against Lanczos ringing artifacts, and small text will never match.
3. **Letterbox instead of stretch:** `fit: 'contain'` with a known background, preserving aspect. Use this when the aspect mismatch is more than ~1%.
4. **Crop to a common region** with `sharp().extract({ left, top, width, height })` when the reference includes chrome (bezels, browser UI, screenshot borders) that your render doesn't.

**Always normalize to a fixed, committed target geometry** rather than "whatever the render happened to be" — otherwise the score moves when the viewport moves, and the ratchet is meaningless.

### 5.3 Alignment / registration when the crop is unknown

If the reference is a photo or an off-by-a-few-pixels crop, a global translation of 3px will tank a pixel diff while being visually irrelevant. Options:

- **Manual crop calibration (recommended).** Do it once, by hand, and commit the `{left, top, width, height}` numbers to a config file. This is a hobby project with one reference image; a human eyeballing the crop once is strictly better ROI than an automated registration pipeline. Automate nothing that happens once.
- **Phase correlation / ECC** via OpenCV (`cv2.phaseCorrelate`, `cv2.findTransformECC`) if you genuinely need sub-pixel automatic alignment. `opencv-python-headless` **5.0.0.93** (2026-07-02) is current and healthy. Given the global `uv` preference, a `uv run --with opencv-python-headless --with scikit-image script.py` one-liner needs no project-level Python setup at all.
- **Feature matching** (ORB/SIFT + homography) — appropriate for photographs of a physical screen, overkill for a digital capture.
- **Brute-force offset search:** try every `(dx, dy)` in ±8px and keep the best score. ~289 comparisons; at 420×236 that runs in under a second and needs no dependency. Crude but effective, and it *reports the offset*, which is diagnostically useful ("your whole layout is 4px high").

### 5.4 Perceptual and structural metrics

Pixel counting is the wrong primary metric against an external reference — it saturates. A render that's 3% too dark everywhere is ~100% "different" by pixel count but visually near-perfect. Use a *basket* of metrics:

| Metric | What it captures | Where to get it |
|---|---|---|
| **Mismatch ratio** (pixelmatch/odiff) | Localized, hard differences | `pixelmatch`, `odiff` |
| **SSIM** (0–1, 1 = identical) | **Structure**: luminance, contrast, correlation. Tolerant of uniform brightness/gamma shifts, sensitive to layout and edge placement. **The best single number for "does this look like the reference".** | ~35 lines of JS (§2.6), or `skimage.metrics.structural_similarity` |
| **MS-SSIM / DSSIM** | Multi-scale SSIM — better correlation with human judgment | `dssim` (Rust CLI, kornelski, 1.2k stars, last push 2026-07-03) |
| **RMSE / PSNR** | Overall magnitude of error. Cheap, coarse. | trivial to compute |
| **Perceptual hash** | Is this even the same screen? Good coarse smoke test. | `imagehash` 4.3.2 (2025-02-01) |
| **Per-channel histogram delta** | Is the palette right, independent of layout? | `sharp().stats()` |

⚠️ **JS SSIM libraries are abandoned.** `ssim.js` 3.5.0 last published **2020-10-12** and the repo (`obartra/ssim`) is **ARCHIVED**. `image-ssim` last published **2015**. There is no maintained JS SSIM package worth depending on — which is precisely why §2.6 inlines it. It's 35 lines; own them.

If you want the well-tested implementation instead, **`scikit-image` 0.26.0** (2025-12-20) is actively maintained and has `structural_similarity(im1, im2, channel_axis=-1, full=True)`, which returns both the scalar and a **per-pixel SSIM map** — and that map, rendered as a heatmap, is a far better diagnostic image than a red-pixel diff, because it shows you *where the structure is wrong* rather than where the colors differ.

### 5.5 Region-of-interest comparison — the highest-value technique here

The single most useful thing you can build for this project is **per-region scoring**. Instead of one number for the whole screen, define a committed regions file:

```json
{
  "canvas": { "width": 420, "height": 236 },
  "regions": {
    "channel-grid":  { "x": 8,   "y": 8,   "w": 404, "h": 150 },
    "clock":         { "x": 170, "y": 165, "w": 90,  "h": 30  },
    "date":          { "x": 175, "y": 198, "w": 70,  "h": 14  },
    "bottom-bar":    { "x": 0,   "y": 160, "w": 420, "h": 76  },
    "wii-button":    { "x": 12,  "y": 185, "w": 46,  "h": 32  },
    "mail-button":   { "x": 362, "y": 185, "w": 46,  "h": 32  }
  }
}
```

and score each independently. Benefits, all of which directly address the hallucinated-verification failure mode:

- **Attribution.** "channel-grid: SSIM 0.98 / bottom-bar: SSIM 0.71" tells an agent exactly where to work. A single global score does not.
- **Independent ratchets.** A region you've perfected can be locked at a high threshold while others stay loose.
- **Noise isolation.** The static canvas gets its own region with a deliberately loose threshold (or a texture-statistics check instead of a pixel check), without contaminating everything else.
- **Falsifiability.** A per-region table is a large, specific artifact. It is much harder for an agent to fabricate a plausible six-row score table than to assert "looks good".

`odiff`'s `-i x1:y1-x2:y2,...` ignore-regions flag does the inverse (exclusion) at CLI level if you want a quick version without writing a scorer.

---

## 6. Determinism — the real battle

Every false diff you eat trains you to loosen thresholds, and loose thresholds are how real regressions get through. Determinism work has the highest leverage in this entire document. **This project has four specific hazards**, all visible in the source.

### 6.1 The live clock — `src/components/Clock.jsx` ⚠️ critical

```js
const [time, setTime] = useState(new Date())
useEffect(() => { const id = setInterval(() => setTime(new Date()), 1000); ... }, [])
```

This renders the wall-clock time, so **every screenshot differs from every other screenshot**. Fix with Playwright's Clock API:

```js
// Must be called BEFORE navigation.
await page.clock.install({ time: new Date('2021-01-01T00:00:00') });
await page.goto('/');
```

- `clock.install()` — installs fake timers; must precede any other clock call.
- `clock.setFixedTime(t)` — pins `Date.now()` / `new Date()` while **leaving timers running normally**. Usually what you want: React keeps ticking, but every tick reads the same date. Least invasive.
- `clock.pauseAt(t)` — requires `install()`; halts time entirely, giving manual control of all timers and animations.
- `clock.fastForward(d)` / `clock.runFor(d)` / `clock.resume()`.

**Project-specific gift:** `reference_screen.png` shows **12:00 AM** and **Fri 1/1**. `2021-01-01T00:00:00` was a Friday — so freezing to that instant makes the clock region *match the reference exactly* rather than needing to be masked. That turns the hardest determinism problem into a free win. Pin it in a shared fixture and never think about it again. (Also set `timezoneId` in the config so the frozen instant renders as local midnight regardless of machine.)

Source: <https://playwright.dev/docs/clock>

### 6.2 The random TV static — `src/components/ChannelStatic.jsx` ⚠️ critical

```js
const rowBase = 210 + Math.random() * 18
const v = ... rowBase + (Math.random() - 0.5) * 12
```

drawn to a 64×36 canvas via `requestAnimationFrame` every 3000ms. Fully nondeterministic. Three viable strategies, in order of preference:

**(a) Seed `Math.random` via an init script.** Deterministic *and* still visually exercises the effect:

```js
await page.addInitScript(() => {
  let s = 0x2f6e2b1; // mulberry32
  Math.random = () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
});
```

`addInitScript` runs before any page script on every navigation and every frame, so React never sees the real `Math.random`. **Caveat:** the static is redrawn on a `rAF` timer, so the *number of draws before capture* also has to be deterministic — pair this with `clock.pauseAt()`, or with (b).

**(b) A test-only freeze flag.** Have `ChannelStatic` read e.g. `window.__VISUAL_TEST__` (or a `?visualtest=1` query param) and, when set, draw exactly one frame and stop. Most robust, at the cost of test-awareness in production code — an acceptable trade for a hobby project, and arguably a feature: it documents the nondeterminism.

**(c) Mask it.** `mask: [page.locator('canvas')]` or an ignore-region. Simplest, but you then have zero verification of an effect that's a signature part of the Wii Menu look. Use only as a fallback. A middle path: don't pixel-diff the region, but assert *texture statistics* on it (mean luminance in 210–228, low horizontal variance, high vertical row-to-row variance) — that verifies "it looks like horizontal static" without demanding specific pixels.

### 6.3 Remote web fonts — `index.html` ⚠️ high risk

```html
<link href="https://fonts.googleapis.com/css2?family=RocknRoll+One&display=swap" rel="stylesheet" />
<link href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@500;700&display=swap" rel="stylesheet" />
```

Two problems. First, `display=swap` guarantees a fallback-font flash — screenshot during that window and you capture the wrong typeface. Second, these are **network requests**; the screenshot outcome depends on your Wi-Fi, and offline it silently renders in a fallback font and diffs everything.

Fixes, both worth doing:

1. **Self-host the fonts.** Download the `.woff2` files into `public/fonts/`, serve locally, drop `display=swap` (or use `display=block`). This removes the network from the render path entirely — the single highest-value determinism change available here, and it improves the real app too.
2. **Wait for font load before every capture:**

```js
await page.evaluate(() => document.fonts.ready);
// belt and braces: also confirm the specific faces resolved
await page.waitForFunction(() =>
  document.fonts.check('16px "RocknRoll One"') &&
  document.fonts.check('700 16px "M PLUS Rounded 1c"')
);
```

`document.fonts.ready` resolves when font loading *and layout* have settled. `document.fonts.check()` is the stronger assertion — it verifies the specific family actually resolved, so an offline run **fails** instead of quietly screenshotting Helvetica.

### 6.4 Animations and transitions

`toHaveScreenshot` sets `animations: 'disabled'` by default (finite animations jump to their end state; infinite ones reset to frame 0). That covers CSS animations, CSS transitions, and Web Animations — but **not** `requestAnimationFrame`-driven canvas work like the static effect. Belt-and-braces with an injected stylesheet:

```css
/* tests/screenshot.css — referenced via `stylePath` */
*, *::before, *::after {
  animation-duration: 0s !important;
  animation-delay: 0s !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0s !important;
  transition-delay: 0s !important;
  caret-color: transparent !important;
  scroll-behavior: auto !important;
}
/* kill scrollbars, which differ across OS and steal layout width */
html { scrollbar-width: none !important; overflow: hidden !important; }
::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
```

Also set `reducedMotion: 'reduce'` in `use` if any code branches on `prefers-reduced-motion`.

### 6.5 Viewport, DPR, scrollbars

```js
use: {
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
  colorScheme: 'light',
  reducedMotion: 'reduce',
  locale: 'en-US',
  timezoneId: 'America/New_York',
}
```

- **`deviceScaleFactor: 1`** and **`scale: 'css'`** together guarantee a 1280×720 CSS viewport produces a 1280×720 PNG regardless of whether you're on a Retina display. Without this, the same code produces 2560×1440 on a MacBook and 1280×720 on an external monitor — an instant 100% diff.
- **Scrollbars** consume layout width and are rendered differently across OSes. `overflow: hidden` in the screenshot stylesheet is the reliable fix; make sure the page genuinely fits first.
- **Pin the Playwright version exactly.** Chromium's font rasterizer and antialiasing change between versions. `^1.62.0` will silently invalidate every baseline on some future `npm install`.

### 6.6 Determinism checklist

```
[ ] Playwright version pinned exactly (no ^)
[ ] deviceScaleFactor: 1 + scale: 'css'
[ ] Fixed viewport, committed in config
[ ] page.clock.setFixedTime(new Date('2021-01-01T00:00:00'))  ← matches reference!
[ ] timezoneId + locale pinned
[ ] Math.random seeded via addInitScript (or static frozen behind a test flag)
[ ] Fonts self-hosted; document.fonts.check() asserted per family
[ ] animations: 'disabled' + screenshot.css nuking transitions
[ ] Scrollbars hidden
[ ] Networked resources: none, or route-intercepted
[ ] Sanity: capture the same page twice in one run → must be byte-identical
```

That last line is the meta-test, and it belongs in the suite as an actual assertion. **If two consecutive captures of an unchanged page are not identical, every other number in the system is noise.** Run it first; fail the whole suite if it fails.

---

## 7. Browser automation for agents

The failure that prompted this document was an agent claiming a visual check it could not perform. The right lens for evaluating these options is therefore not "how capable is it" but **"can a claim of success be fabricated?"**

### 7.1 Scripted Playwright via Bash — primary

The agent runs `node scripts/verify-visual.mjs` (or `npx playwright test`) as a Bash tool call and reads stdout + exit code.

- ✅ **Unfakeable in the relevant sense.** The tool call's output is in the transcript. A nonzero exit is a nonzero exit. The agent cannot report "verification passed" for a command that printed `FAIL`.
- ✅ Fully deterministic, fully reproducible, works headless, no extra services.
- ✅ Produces durable artifacts (diff PNGs, JSON scores) that persist for a human to audit later.
- ⚠️ The agent does **not see the image** by default — it sees numbers. Mitigation: after the script runs, the agent uses the `Read` tool on the diff PNG to actually look at it. This is the right split: **numbers for the gate, image for the diagnosis.**
- ⚠️ Requires the dev server to be up (`webServer` in the config handles this).

### 7.2 Playwright MCP server

`@playwright/mcp` **0.0.78** (2026-07-09), microsoft/playwright-mcp, 35k stars, Apache-2.0, extremely active.

```bash
claude mcp add playwright npx @playwright/mcp@latest
```

or in `.mcp.json`:

```json
{ "mcpServers": { "playwright": { "command": "npx", "args": ["@playwright/mcp@latest"] } } }
```

Operates primarily on **accessibility snapshots** rather than pixels — a structured tree the model reads as text, which is excellent for *interaction* (click this, fill that) and cheap in tokens. `browser_take_screenshot` accepts `filename`, `element`, `target`(ref/selector), `fullPage`, `type`, `scale`. 50+ tools total; `--caps=vision` adds coordinate-based tools. Useful flags: `--isolated` (in-memory profile), `--output-dir`, `--viewport-size 1280x720`, `--device`. **Default is headed**, not headless.

- ✅ Excellent for exploratory work: navigate, hover a channel, click, then capture.
- ✅ `browser_evaluate` lets the agent inject the clock freeze / RNG seed ad hoc.
- ⚠️ **Screenshots are saved to disk**, into the output dir. The agent must then `Read` the file to see it. Don't assume capture ⇒ perception.
- ⚠️ Statefulness across turns makes runs less reproducible than a script. It's an exploration tool, not a verification gate.
- ⚠️ Version `0.0.x` — the tool surface still changes between releases.

**Use it for iteration, never as the thing that certifies a change.**

### 7.3 Claude in Chrome extension

Drives your real, logged-in Chrome via the `mcp__claude-in-chrome__*` tools (`computer`, `navigate`, `read_page`, `javascript_tool`).

- ✅ The agent genuinely **sees** the screenshot — it comes back as an image in context. Best fidelity of intent: it's looking at what you'd look at.
- ✅ Zero setup if the extension is already installed; real browser, real fonts, real GPU compositing.
- ⚠️ **Non-deterministic by construction.** Your real window size, your real DPR, your extensions, your zoom level, your OS scrollbars. Screenshots vary run to run.
- ⚠️ Requires per-site permission grants and a human-present Chrome. Can't run unattended.
- ⚠️ **This is the exact modality where the original failure becomes possible** — visual assessment with no artifact and no exit code, where "looks right to me" is the entire output.

**Use it for design judgment ("does this feel like the Wii Menu?"), never for pass/fail.**

### 7.4 Recommendation

| Purpose | Tool |
|---|---|
| Gate: does this change pass? | **Scripted Playwright + diff script via Bash.** Exit code is the verdict. |
| Diagnosis: why did it fail? | `Read` the generated diff PNG / SSIM heatmap. |
| Exploration: try a hover state, poke at layout | **Playwright MCP** |
| Aesthetic judgment | **Claude in Chrome** or a human |

**The rule to write into `CLAUDE.md`:** *never claim visual verification without pasting the numeric output of the verification script in the same message.* A claim without an accompanying scorecard is not a claim.

---

## 8. Recommended stack for this project

Solo dev, React + Vite, no CI, agent-driven, matching a fixed 420×236 reference containing a live clock and a random-noise canvas.

### 8.1 Install

```bash
npm i -D @playwright/test@1.62.0 sharp pixelmatch pngjs
npx playwright install chromium
```

Four dev dependencies, all actively maintained, no native build chains, no accounts, no subscriptions.

### 8.2 Two harnesses, not one

They answer different questions and should stay separate:

**A. Reference match (`npm run visual:ref`)** — *"how close am I to the real Wii Menu?"*
A standalone script: launch Chromium → apply determinism fixtures → capture → normalize to 420×236 with `sharp` → per-region `pixelmatch` + SSIM → write `artifacts/diff.png` and `artifacts/score.json` → compare against committed `baseline-score.json` → **exit nonzero if any region got worse.** A ratchet, not a gate.

**B. Self-regression (`npm run visual:test`)** — *"did I break something I'd already gotten right?"*
`npx playwright test` with `toHaveScreenshot()` against committed baselines. Standard VRT. Catches accidental damage during refactors.

### 8.3 The determinism fixture (shared by both)

```js
// tests/fixtures.js
export async function prepare(page) {
  // 1. Freeze time to the instant shown in reference_screen.png (Fri 1/1, 12:00 AM)
  await page.clock.install({ time: new Date('2021-01-01T00:00:00') });

  // 2. Seed Math.random before any app code runs
  await page.addInitScript(() => {
    let s = 0x2f6e2b1;
    Math.random = () => {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    window.__VISUAL_TEST__ = true;   // ChannelStatic draws one frame and stops
  });

  await page.goto('/');

  // 3. Fonts must actually be the right fonts, or fail loudly
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() =>
    document.fonts.check('16px "RocknRoll One"') &&
    document.fonts.check('700 16px "M PLUS Rounded 1c"'),
    null, { timeout: 5000 }
  );
}
```

### 8.4 Immediate source changes

1. **Self-host the two Google Fonts.** Remove the `fonts.googleapis.com` `<link>`s from `index.html`, drop the `.woff2` files in `public/fonts/`, declare `@font-face` locally without `display: swap`. Removes the network from the render path; also makes the app work offline.
2. **Add a `window.__VISUAL_TEST__` branch to `ChannelStatic.jsx`** that draws exactly one frame and skips the `requestAnimationFrame` loop. Three lines.
3. Leave `Clock.jsx` alone — `page.clock` handles it from outside, and the frozen instant matches the reference exactly.

### 8.5 Guardrails against fabricated verification

1. `"visual:ref"` and `"visual:test"` **must exit nonzero on failure.** No warn-and-continue paths.
2. Include a **self-comparison assertion** (reference vs. reference must score `1.0000`) so a broken harness fails instead of passing vacuously.
3. Include a **double-capture assertion** (two captures of an unchanged page must be byte-identical) as the first check; if it fails, every other number is noise.
4. Every run writes `artifacts/score.json` with a timestamp and a git SHA. **No file, no verification happened.**
5. Set `updateSnapshots: 'none'` in `playwright.config.js` so refreshing a baseline requires an explicit human CLI override; treat any `*-snapshots/` change in `git diff` as needing review.
6. `CLAUDE.md` rule: *any claim of visual verification must quote the score output verbatim in the same message.*

### 8.6 Explicitly not adopting

| | Why |
|---|---|
| Hosted SaaS (Percy / Chromatic / Applitools / Argos) | Built around CI + team review; this project has neither. Revisit **Argos** (free 5k screenshots/mo, Playwright-native) if CI ever appears. |
| **Lost Pixel** | Archived 2026-04-22. Dead. |
| **BackstopJS** | No commits since 2024-09-07, 576 open issues. Playwright covers everything it offered. |
| **Resemble.js** | "Ultra low-maintenance mode"; `node-canvas` install pain; `sharp` does its useful part better. |
| **`ssim.js` / `image-ssim`** | Archived / last published 2015. Inline the 35 lines (§2.6) or shell out to `scikit-image`. |
| **odiff** | Genuinely excellent and 6.7× faster — just unnecessary at 420×236, where pixelmatch runs in milliseconds. Adopt it if image sizes or the number of comparisons grows; its exit codes (0/21/22) are ideal for agent workflows. |
| **looks-same** | Worth revisiting *if* you want `diffClusters` coordinates ("differs at x:180–240, y:150–170") to guide the agent. A reasonable later addition, not a starting dependency. |

---

## Appendix: version & maintenance audit (2026-07-24)

| Package / project | Version | Last publish | Status |
|---|---|---|---|
| `@playwright/test` | 1.62.0 | 2026-07-24 | ✅ Very active |
| `@playwright/mcp` | 0.0.78 | 2026-07-09 | ✅ Very active (pre-1.0) |
| `pixelmatch` | 7.2.0 | 2026-04-29 | ✅ Active |
| `odiff-bin` | 4.5.0 | 2026-07-23 | ✅ Very active |
| `looks-same` | 10.0.1 | 2025-08-18 | ✅ Active |
| `sharp` | 0.35.3 | 2026-07-01 | ✅ Very active |
| `pngjs` | 7.0.0 | 2023-02-20 | 🟡 Stable/dormant (fine — the PNG spec doesn't move) |
| `jest-image-snapshot` | 6.5.2 | 2026-03-09 | ✅ Active |
| `@argos-ci/playwright` | 7.3.7 | 2026-07-23 | ✅ Very active |
| `resemblejs` | 5.0.0 | 2023-06-06 | 🟡 "Ultra low-maintenance"; repo last pushed 2024-02-06 |
| `backstopjs` | 6.3.25 | 2024-09-07 | 🟡 Dormant — no commits since 2024-09-07, 576 open issues |
| `lost-pixel` | 3.22.0 | 2024-11-14 | ☠️ **Repo archived 2026-04-22** |
| `ssim.js` | 3.5.0 | 2020-10-12 | ☠️ **Repo archived** |
| `image-ssim` | 0.2.0 | 2015-07-10 | ☠️ Abandoned |
| `blink-diff` | 1.0.13 | 2016-07-13 | ☠️ Abandoned |
| `dssim` (Rust CLI) | — | pushed 2026-07-03 | ✅ Active |
| `scikit-image` | 0.26.0 | 2025-12-20 | ✅ Active |
| `opencv-python-headless` | 5.0.0.93 | 2026-07-02 | ✅ Active |
| `imagehash` | 4.3.2 | 2025-02-01 | ✅ Active |

Versions verified directly against the npm and PyPI registry APIs; repo status via the GitHub API.

## Sources

- [Playwright — Visual comparisons](https://playwright.dev/docs/test-snapshots)
- [Playwright — PageAssertions.toHaveScreenshot()](https://playwright.dev/docs/api/class-pageassertions)
- [Playwright — TestConfig (snapshotPathTemplate, expect)](https://playwright.dev/docs/api/class-testconfig)
- [Playwright — Command line (`--update-snapshots`)](https://playwright.dev/docs/test-cli)
- [Playwright — Clock API](https://playwright.dev/docs/clock)
- [Playwright — Emulation](https://playwright.dev/docs/emulation)
- [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp)
- [mapbox/pixelmatch](https://github.com/mapbox/pixelmatch)
- [dmtrKovalenko/odiff](https://github.com/dmtrKovalenko/odiff)
- [rsmbl/Resemble.js](https://github.com/rsmbl/Resemble.js)
- [gemini-testing/looks-same](https://github.com/gemini-testing/looks-same)
- [garris/BackstopJS](https://github.com/garris/BackstopJS)
- [lost-pixel/lost-pixel (archived)](https://github.com/lost-pixel/lost-pixel)
- [Argos CI pricing](https://argos-ci.com/pricing)
- [Chromatic pricing](https://www.chromatic.com/pricing)
- [Applitools pricing](https://applitools.com/pricing/)
- [kornelski/dssim](https://github.com/kornelski/dssim)
- [scikit-image `structural_similarity`](https://scikit-image.org/docs/stable/api/skimage.metrics.html)
