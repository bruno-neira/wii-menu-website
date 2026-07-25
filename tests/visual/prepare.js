/**
 * Shared page preparation for visual runs.
 *
 * Everything here exists to remove a source of nondeterminism. If a value
 * varies between runs, a diff reports it as a regression and the harness stops
 * being trustworthy.
 */

/**
 * `reference_screen.png` reads 12:00 AM, Fri 1/1.
 *
 * 1 January 2021 was a Friday, so freezing to that instant makes the rendered
 * clock and date MATCH the reference exactly rather than needing to be masked
 * out. A masked region is a region you are not verifying; this way the clock is
 * actually under test.
 */
export const REFERENCE_INSTANT = new Date('2021-01-01T00:00:00')

export async function preparePage(page, { instant = REFERENCE_INSTANT } = {}) {
  await page.clock.install({ time: instant })
  await page.goto('/')

  // Block on the real font. Without this the first paint can land mid-swap and
  // glyph metrics differ between runs.
  await page.evaluate(() => document.fonts.ready)

  // The noise atlas is generated synchronously at module init, but the
  // background-image it produces is a data URL the compositor still has to
  // decode. Wait for it to be non-empty before capturing.
  await page.waitForFunction(() => {
    const el = document.querySelector('.channel-static')
    if (!el) return true // no empty tiles on this page is a valid state
    return getComputedStyle(el).backgroundImage.startsWith('url("data:image/png')
  })
}
