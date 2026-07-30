import { test, expect } from '@playwright/test'
import { preparePage } from './prepare.js'

/**
 * The Wii hand pointer.
 *
 * Screenshot diffing cannot see any of this: the cursor sits OUTSIDE `.wii-menu`
 * (so it stays out of the gate and ratchet captures by construction) and is
 * hidden until the pointer first moves. That is deliberate, but it means the
 * cursor is invisible to every other test in the suite — so its contract is
 * asserted directly here.
 *
 * Sizes come from context/components/cursor.md §8: the console draws the 64x64
 * texture cell into a 54x54 quad, putting the hand at 35.4 x 50.6 stage px.
 */

/** Hand height in stage px, and the viewBox-to-element ratios around it. */
const HAND_H_STAGE = 50.6
const VIEW_H = 64
const HAND_H_UNITS = 56

test.describe('cursor', () => {
  test.beforeEach(async ({ page }) => {
    await preparePage(page)
  })

  test('is absent until the pointer moves', async ({ page }) => {
    // This is what keeps it out of every screenshot baseline without a mask.
    await expect(page.locator('.wii-cursor')).not.toHaveClass(/wii-cursor--visible/)
    await expect(page.locator('.wii-cursor')).toHaveCSS('opacity', '0')
  })

  test('appears on pointer move and tracks it, fingertip-anchored', async ({ page }) => {
    await page.mouse.move(700, 400)
    const cursor = page.locator('.wii-cursor')
    await expect(cursor).toHaveClass(/wii-cursor--visible/)

    const box = await cursor.boundingBox()
    // The hotspot is the FINGERTIP, not the box corner: 29.2% across, 3.1%
    // down. A cursor anchored at its corner is the classic version of this bug
    // and looks subtly wrong rather than obviously broken.
    expect(box.x + box.width * 0.292).toBeCloseTo(700, 0)
    expect(box.y + box.height * 0.031).toBeCloseTo(400, 0)
  })

  test('is sized in stage units, not fixed px', async ({ page }) => {
    await page.mouse.move(700, 400)

    const measure = async () => {
      const box = await page.locator('.wii-cursor').boundingBox()
      const scale = await page.evaluate(() =>
        parseFloat(
          getComputedStyle(document.querySelector('.stage-area'))
            .getPropertyValue('--stage-scale'),
        ),
      )
      // Recover the hand's height in stage px from the element's box.
      return { handStagePx: (box.height / scale) * (HAND_H_UNITS / VIEW_H), scale }
    }

    const a = await measure()
    expect(a.handStagePx).toBeCloseTo(HAND_H_STAGE, 1)

    // Halving the viewport must halve the drawn cursor. The Wii ran at a fixed
    // 480p-class resolution, so a fixed layout-unit size WAS a fixed fraction of
    // the screen; a fixed CSS px size would not reproduce that.
    await page.setViewportSize({ width: 832, height: 456 })
    await page.mouse.move(400, 200)
    const b = await measure()
    expect(b.scale).toBeLessThan(a.scale)
    expect(b.handStagePx).toBeCloseTo(HAND_H_STAGE, 1)
  })

  test('never intercepts input', async ({ page }) => {
    // The browser must hit-test the real pointer, not the drawn hand. The
    // console splits these the same way: it lets the hand draw up to 100 units
    // off-screen while hit-testing uses a zero-tolerance rect.
    await expect(page.locator('.wii-cursor')).toHaveCSS('pointer-events', 'none')

    const button = page.locator('.wii-button')
    const box = await button.boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    // With the hand drawn directly over the button, the button must still be
    // what the point resolves to.
    const tag = await page.evaluate(
      ([x, y]) => document.elementFromPoint(x, y)?.closest('button')?.className ?? null,
      [box.x + box.width / 2, box.y + box.height / 2],
    )
    expect(tag).toContain('wii-button')
  })

  test('hides the native cursor only while it is active', async ({ page }) => {
    await expect(page.locator('html')).toHaveClass(/wii-cursor-active/)
    await expect(page.locator('.wii-button')).toHaveCSS('cursor', 'none')
  })
})
