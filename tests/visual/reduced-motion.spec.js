import { test, expect } from '@playwright/test'
import { preparePage } from './prepare.js'

/**
 * The reduced-motion fallback, in its own project so it is actually exercised.
 * If the whole suite ran with the preference on, we would only ever
 * regression-test the frozen state and never the animated one.
 *
 * The preference is applied with an explicit `page.emulateMedia()` call rather
 * than via config. Both a config-level `use` and a project-level `use` were
 * tried first and neither reached the page in the runner (the project's
 * resolved options showed `reducedMotion: "reduce"` while `matchMedia` in the
 * page still reported false). `emulateMedia` is unambiguous, is asserted below
 * before anything depends on it, and removes any dependence on option
 * precedence.
 */

async function withReducedMotion(page) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
}

test('snow freezes under prefers-reduced-motion', async ({ page }) => {
  await preparePage(page)
  await withReducedMotion(page)

  const state = await page.evaluate(() => {
    const el = document.querySelector('.channel-static')
    return {
      emulationActive: matchMedia('(prefers-reduced-motion: reduce)').matches,
      animationName: el ? getComputedStyle(el).animationName : null,
    }
  })

  // Assert the emulation is genuinely in effect BEFORE asserting on its effect.
  // Without this, a misconfigured runner yields a green "the fallback works"
  // result while never having enabled the preference — the check would be
  // verifying nothing. That is exactly what happened on the first attempt here.
  expect(state.emulationActive, 'prefers-reduced-motion emulation is not active').toBe(true)

  // The CSS media query must win; nothing here may depend on JS having run.
  expect(state.animationName).toBe('none')
})

test('reduced-motion stage snapshot', async ({ page }) => {
  await preparePage(page)
  await withReducedMotion(page)
  await expect(page).toHaveScreenshot('stage-reduced-motion.png')
})
