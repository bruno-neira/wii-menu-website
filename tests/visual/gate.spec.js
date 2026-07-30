import { test, expect } from '@playwright/test'
import { preparePage } from './prepare.js'

/**
 * THE GATE — "did I break something that was already working?"
 *
 * Compares the render against our own committed baseline. This is classic
 * visual regression: it says nothing about whether we match the real Wii, only
 * that we have not changed unintentionally.
 *
 * Update baselines deliberately, never reflexively:
 *   npm run visual:update
 */

test.describe('gate', () => {
  test.beforeEach(async ({ page }) => {
    await preparePage(page)
  })

  test('full stage', async ({ page }) => {
    await expect(page).toHaveScreenshot('stage.png')
  })

  test('bottom bar', async ({ page }) => {
    await expect(page.locator('.bottom-bar-wrapper')).toHaveScreenshot('bottom-bar.png')
  })

  test('clock', async ({ page }) => {
    await expect(page.locator('.clock-container')).toHaveScreenshot('clock.png')
  })

  test('channel grid', async ({ page }) => {
    await expect(page.locator('.channels-grid')).toHaveScreenshot('grid.png')
  })

  /**
   * Determinism self-check. If the seeded noise ever stops being reproducible,
   * every other test in this file starts flaking for reasons that look like
   * unrelated regressions. Catch it here, explicitly.
   */
  test('noise atlas is reproducible across reloads', async ({ page }) => {
    const read = () =>
      page.evaluate(() => {
        const els = [...document.querySelectorAll('.channel-static__flicker')]
        const bg = getComputedStyle(els[0]).backgroundImage
        let h = 0
        for (let i = 0; i < bg.length; i++) h = (Math.imul(31, h) + bg.charCodeAt(i)) | 0
        return {
          atlasHash: h,
          phases: els.map((e) => e.style.getPropertyValue('--snow-drift-delay')),
        }
      })

    const first = await read()
    await page.reload()
    await page.evaluate(() => document.fonts.ready)
    const second = await read()

    expect(second.atlasHash).toBe(first.atlasHash)
    expect(second.phases).toEqual(first.phases)
  })

  /**
   * Statistical assertions on the empty-slot texture.
   *
   * These exist because pixel diffing cannot see structure. The old
   * implementation rendered horizontal shimmer bands instead of snow, and every
   * screenshot test passed the whole time — the output was wrong but
   * self-consistent.
   *
   * Targets come from context/components/empty-slot-noise-triangulated.md,
   * which measured the console and then simulated the spec against those
   * measurements before it was implemented. Console figures in comments.
   *
   * NOTE: this reads the ATLAS, which carries the noise and the baked Ch1 gloss
   * ramp. The two rolling gratings are CSS layers on top and are asserted
   * separately below — trying to measure the full composite from a screenshot
   * means undoing the 2x stage scale, which is more fragile than it is worth.
   */
  test('empty-slot texture statistics', async ({ page }) => {
    const stats = await page.evaluate(async () => {
      const el = document.querySelector('.channel-static__flicker')
      const url = getComputedStyle(el).backgroundImage.slice(5, -2)
      const img = new Image()
      img.src = url
      await img.decode()

      // One frame is exactly the visible aperture. Reading 170x96 here (the
      // authoring plate size) would sample across a frame boundary.
      const W = 160
      const H = 88
      const c = document.createElement('canvas')
      c.width = W
      c.height = H
      const ctx = c.getContext('2d')
      ctx.drawImage(img, 0, 0, W, H, 0, 0, W, H) // frame 0
      const d = ctx.getImageData(0, 0, W, H).data

      const lum = []
      let chromatic = 0
      for (let i = 0; i < W * H; i++) {
        const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2]
        if (r !== g || g !== b) chromatic++
        lum.push(r)
      }

      const sd = (xs) => {
        const m = xs.reduce((a, b) => a + b, 0) / xs.length
        return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length)
      }

      const rowMeans = []
      for (let y = 0; y < H; y++) {
        let s = 0
        for (let x = 0; x < W; x++) s += lum[y * W + x]
        rowMeans.push(s / W)
      }
      const colMeans = []
      for (let x = 0; x < W; x++) {
        let s = 0
        for (let y = 0; y < H; y++) s += lum[y * W + x]
        colMeans.push(s / H)
      }

      let minRow = 0
      rowMeans.forEach((v, i) => { if (v < rowMeans[minRow]) minRow = i })

      return {
        mean: lum.reduce((a, b) => a + b, 0) / lum.length,
        chromatic,
        pixelSigma: sd(lum),
        rowSigma: sd(rowMeans),
        colSigma: sd(colMeans),
        minRowFraction: minRow / H,
      }
    })

    // Base tone: measured #D4D4D4 = 212 on the console.
    expect(stats.mean).toBeGreaterThan(210)
    expect(stats.mean).toBeLessThan(214)

    // Analog snow is luminance-only — with no colour burst the receiver's
    // colour-killer disables chroma entirely. Every pixel of every empty tile in
    // the reference capture is exactly R=G=B. Any chromatic pixel is a bug.
    expect(stats.chromatic).toBe(0)

    // Per-pixel grain. Console 5.4.
    expect(stats.pixelSigma).toBeGreaterThan(4.0)
    expect(stats.pixelSigma).toBeLessThan(7.5)

    // Vertical structure must be comparable to the grain rather than swamped by
    // it. An earlier build sat at 0.25 because it treated all banding as a
    // capture artifact — it is not, it is the Ch1 ramp and the my_TV_d gratings.
    //
    // The console's structural ratio is ~0.95, but that is the FULL COMPOSITE.
    // This measures the atlas, which carries the ramp but not the two CSS
    // gratings, so it cannot reach 0.95 by construction — roughly half the row
    // structure is not in this image. The band below is calibrated to the
    // ramp-only contribution; the gratings are asserted by the next test.
    // Widening this to make a grain-dominated build pass would defeat the
    // assertion, so it stays tight around the expected ramp-only value.
    const ratio = stats.rowSigma / stats.pixelSigma
    expect(ratio).toBeGreaterThan(0.40)
    expect(ratio).toBeLessThan(0.80)

    // Horizontal structure should be near zero — the gratings are horizontal
    // lines, so columns carry nothing. Console 0.55.
    expect(stats.colSigma).toBeLessThan(1.5)

    // THE GLOSS CANARY. The Ch1 ramp troughs near the top (~17% down) and rises
    // to the bottom. A re-added top-half white overlay — the single worst bug
    // this component has had — inverts that and drags the darkest row into the
    // bottom half. Nothing else moves it.
    expect(stats.minRowFraction).toBeLessThan(0.35)
  })

  /**
   * The rolling gratings are CSS, so assert them structurally rather than
   * statistically. Periods are extracted values: my_TV_d mapped at two scales.
   */
  test('empty slot carries both rolling gratings', async ({ page }) => {
    const scans = await page.evaluate(() => {
      const read = (sel) => {
        const el = document.querySelector(sel)
        if (!el) return null
        const cs = getComputedStyle(el)
        return { duration: cs.animationDuration, name: cs.animationName }
      }
      return { fine: read('.channel-static__scan-fine'), coarse: read('.channel-static__scan-coarse') }
    })

    // 4.8-unit scanline, one period per 1.668s.
    expect(scans.fine?.name).toBe('scan-roll-fine')
    expect(scans.fine?.duration).toBe('1.668s')

    // 48-unit bar, one period per 8.342s.
    expect(scans.coarse?.name).toBe('scan-roll-coarse')
    expect(scans.coarse?.duration).toBe('8.342s')
  })
})
