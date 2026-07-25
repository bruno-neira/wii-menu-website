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
        const els = [...document.querySelectorAll('.channel-static')]
        const bg = getComputedStyle(els[0]).backgroundImage
        let h = 0
        for (let i = 0; i < bg.length; i++) h = (Math.imul(31, h) + bg.charCodeAt(i)) | 0
        return {
          atlasHash: h,
          phases: els.map((e) => e.style.getPropertyValue('--snow-phase')),
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
   * The statistical assertion that would have caught the old implementation's
   * actual bug. The previous version gave each ROW one shared brightness, so
   * row-variance dominated pixel-variance — it rendered horizontal shimmer
   * bands instead of snow. Real noise is the other way round.
   *
   * A pixel diff would never have flagged that, because the old output was
   * self-consistent. This asserts the noise has the right STRUCTURE.
   */
  test('noise is grain, not row bands', async ({ page }) => {
    const stats = await page.evaluate(async () => {
      const el = document.querySelector('.channel-static')
      const url = getComputedStyle(el).backgroundImage.slice(5, -2)
      const img = new Image()
      img.src = url
      await img.decode()

      const W = 170
      const H = 96
      const c = document.createElement('canvas')
      c.width = W
      c.height = H
      const ctx = c.getContext('2d')
      ctx.drawImage(img, 0, 0, W, H, 0, 0, W, H) // first atlas frame
      const d = ctx.getImageData(0, 0, W, H).data

      const lum = []
      for (let i = 0; i < W * H; i++) lum.push(d[i * 4])

      const mean = lum.reduce((a, b) => a + b, 0) / lum.length
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

      return { mean, pixelSigma: sd(lum), rowSigma: sd(rowMeans), colSigma: sd(colMeans) }
    })

    // Base tone should sit at the measured #D4D4D4 (212).
    expect(stats.mean).toBeGreaterThan(206)
    expect(stats.mean).toBeLessThan(218)

    // The load-bearing assertion: per-pixel variation must dominate per-row
    // variation. The old implementation had this inverted at ~1.5:1.
    expect(stats.pixelSigma).toBeGreaterThan(stats.rowSigma)

    // And the grain should be roughly isotropic — no directional banding.
    expect(Math.abs(stats.rowSigma - stats.colSigma)).toBeLessThan(4)
  })
})
