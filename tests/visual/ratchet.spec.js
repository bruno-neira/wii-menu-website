import { test, expect } from '@playwright/test'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import { preparePage } from './prepare.js'

/**
 * THE RATCHET — "am I getting closer to the real thing?"
 *
 * This is NOT visual regression. It scores the render against
 * `reference_screen.png`, a real capture of the actual console, and fails only
 * if a score gets WORSE than the committed baseline. Improvements are recorded
 * so the bar only ever moves up.
 *
 * Why it is separate from the gate: the two answer different questions.
 * "Did I break something?" compares against my own last render. "Am I closer to
 * the truth?" compares against the reference. Conflating them is why
 * off-the-shelf visual-regression tooling feels wrong for this project.
 *
 * Method notes, from docs/methodology/design-fidelity-measurement.md:
 *  - The reference is 420x236, far smaller than our render. We DOWNSCALE the
 *    render to meet it rather than upscaling the reference, which would invent
 *    detail and penalise a correctly-crisp implementation.
 *  - Downscaling is gamma-correct. Naive downscaling biases edge pixels by up
 *    to 25 levels and swings SSIM by more than a real design change would.
 *  - A byte-perfect implementation still would not score 1.0 through this
 *    pipeline, because the reference carries scanline artefacts from its own
 *    capture. Thresholds are therefore relative to a recorded baseline, never
 *    absolute.
 *  - Scores are per-REGION. A whole-page number is dominated by whichever
 *    region differs most and tells you nothing actionable.
 */

const ROOT = path.resolve(process.cwd())
const REFERENCE = path.join(ROOT, 'reference_screen.png')
const BASELINE = path.join(ROOT, 'tests/visual/ratchet-baseline.json')
const OUT_DIR = path.join(ROOT, 'tests/visual/ratchet-output')

/** Regions expressed as fractions of the reference image. */
const REGIONS = {
  grid: { x: 0.02, y: 0.04, w: 0.96, h: 0.66 },
  bottomBar: { x: 0.0, y: 0.7, w: 1.0, h: 0.3 },
  clockDate: { x: 0.4, y: 0.68, w: 0.32, h: 0.28 },
  wholeStage: { x: 0, y: 0, w: 1, h: 1 },
}

/** Linearise sRGB, average, re-encode. Gamma-naive averaging shifts edges. */
async function gammaCorrectResize(buf, w, h) {
  return sharp(buf)
    .removeAlpha()
    .toColourspace('rgb16')
    .resize(w, h, { kernel: 'lanczos3', fit: 'fill' })
    .toColourspace('srgb')
    .png()
    .toBuffer()
}

function ssim(a, b, w, h) {
  // Global SSIM on luma. Sufficient for tracking directional movement between
  // runs; see the methodology doc for why MS-SSIM would be better if this ever
  // needs to be an absolute judgement rather than a relative one.
  const la = [], lb = []
  for (let i = 0; i < w * h; i++) {
    la.push(0.299 * a[i * 4] + 0.587 * a[i * 4 + 1] + 0.114 * a[i * 4 + 2])
    lb.push(0.299 * b[i * 4] + 0.587 * b[i * 4 + 1] + 0.114 * b[i * 4 + 2])
  }
  const mean = (x) => x.reduce((p, c) => p + c, 0) / x.length
  const ma = mean(la), mb = mean(lb)
  let va = 0, vb = 0, cov = 0
  for (let i = 0; i < la.length; i++) {
    va += (la[i] - ma) ** 2
    vb += (lb[i] - mb) ** 2
    cov += (la[i] - ma) * (lb[i] - mb)
  }
  va /= la.length; vb /= lb.length; cov /= la.length
  const C1 = (0.01 * 255) ** 2, C2 = (0.03 * 255) ** 2
  return ((2 * ma * mb + C1) * (2 * cov + C2)) / ((ma ** 2 + mb ** 2 + C1) * (va + vb + C2))
}

function crop(png, r) {
  const x = Math.round(r.x * png.width)
  const y = Math.round(r.y * png.height)
  const w = Math.round(r.w * png.width)
  const h = Math.round(r.h * png.height)
  const out = new PNG({ width: w, height: h })
  PNG.bitblt(png, out, x, y, w, h, 0, 0)
  return out
}

test('ratchet: score render against reference_screen.png', async ({ page }) => {
  test.skip(!existsSync(REFERENCE), 'reference_screen.png not found')
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

  await preparePage(page)

  /**
   * Freeze the CSS animation timeline at t=0. page.clock freezes Date and
   * timers but NOT the document timeline, so without this the screenshot
   * catches whichever flicker/scroll frame happens to be showing when the
   * test gets here — measured on identical code: grid flips between 0.1291
   * and 0.1333 run-to-run, and wholeStage moves 0.0052, which is above TOL.
   * The gate never had this problem because toHaveScreenshot disables
   * animations itself. Seeded per-tile phases are authored as delays, so
   * pinning currentTime preserves them.
   */
  await page.evaluate(() => {
    for (const a of document.getAnimations()) {
      a.currentTime = 0
      a.pause()
    }
  })

  const refPng = PNG.sync.read(readFileSync(REFERENCE))
  const shot = await page.locator('.wii-menu').screenshot()

  // Downscale the render to the reference's size, gamma-correctly.
  const resized = await gammaCorrectResize(shot, refPng.width, refPng.height)
  const renderPng = PNG.sync.read(resized)

  const scores = {}
  for (const [name, r] of Object.entries(REGIONS)) {
    const a = crop(refPng, r)
    const b = crop(renderPng, r)
    const diff = new PNG({ width: a.width, height: a.height })
    const differing = pixelmatch(a.data, b.data, diff.data, a.width, a.height, {
      threshold: 0.1,
    })
    scores[name] = {
      ssim: +ssim(a.data, b.data, a.width, a.height).toFixed(4),
      diffRatio: +(differing / (a.width * a.height)).toFixed(4),
    }
    writeFileSync(path.join(OUT_DIR, `${name}-diff.png`), PNG.sync.write(diff))
  }

  /**
   * SELF-CHECK: score the reference against ITSELF. Must be a perfect 1.0.
   * If this ever drifts, the scorer is broken and every other number in this
   * file is meaningless — a scorer that "passes" vacuously is the failure mode
   * this guards against.
   */
  const selfSsim = ssim(refPng.data, refPng.data, refPng.width, refPng.height)
  expect(selfSsim).toBeCloseTo(1.0, 4)

  writeFileSync(path.join(OUT_DIR, 'scores.json'), JSON.stringify(scores, null, 2))
  console.log('\n  Fidelity vs reference_screen.png')
  for (const [k, v] of Object.entries(scores)) {
    console.log(`    ${k.padEnd(12)} SSIM ${v.ssim.toFixed(4)}   diff ${(v.diffRatio * 100).toFixed(2)}%`)
  }

  if (!existsSync(BASELINE)) {
    writeFileSync(BASELINE, JSON.stringify(scores, null, 2))
    console.log('\n  No baseline existed — recorded current scores as the starting bar.')
    return
  }

  // The ratchet: fail only on REGRESSION.
  //
  // TOL is 0.005, not the 0.002 first used. Measured justification: changing
  // ONLY the noise seed -- a change with zero fidelity implication -- moves
  // `grid` by 0.0013 and `wholeStage` by 0.0011. Those two regions are
  // currently dominated by the absence of channel artwork, so the empty-slot
  // noise lottery swamps any real signal in them. A tolerance below that floor
  // reports noise as regression.
  //
  // Revisit once channels are populated: the floor should drop sharply, and TOL
  // should come back down with it.
  const base = JSON.parse(readFileSync(BASELINE, 'utf8'))
  const TOL = 0.005
  const regressions = []
  for (const [name, cur] of Object.entries(scores)) {
    const prev = base[name]
    if (!prev) continue
    if (cur.ssim < prev.ssim - TOL) {
      regressions.push(`${name}: SSIM ${prev.ssim.toFixed(4)} -> ${cur.ssim.toFixed(4)}`)
    }
  }
  expect(regressions, `Fidelity regressed:\n  ${regressions.join('\n  ')}`).toEqual([])

  /**
   * Actually ratchet. Without this the baseline is only ever written when the
   * file is absent, so improvements go unrecorded and the bar stays wherever it
   * was first set — which is exactly what happened: the committed baseline sat
   * at grid 0.0748 while the build measured 0.1199, meaning several real gains
   * were never locked in and a regression back to 0.0748 would have passed.
   *
   * Only raises. A score that moved down but stayed inside TOL is noise and
   * must not lower the bar, or the ratchet slowly walks backwards.
   */
  let raised = false
  for (const [name, cur] of Object.entries(scores)) {
    if (!base[name] || cur.ssim > base[name].ssim) {
      base[name] = cur
      raised = true
    }
  }
  if (raised) {
    writeFileSync(BASELINE, JSON.stringify(base, null, 2))
    console.log('  Baseline raised — improvements locked in.')
  }
})
