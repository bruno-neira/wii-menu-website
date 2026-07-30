import { defineConfig, devices } from '@playwright/test'

/**
 * Visual verification config.
 *
 * The stage renders in a fixed virtual coordinate space, so the viewport is
 * pinned to an exact integer multiple of it (832x456 x2 = 1664x912). Any other
 * size introduces fractional scaling and the diffs stop being byte-stable.
 *
 * `animations: 'disabled'` is what freezes the empty-slot snow. That only works
 * because the effect is a CSS animation — Playwright cannot stop a
 * requestAnimationFrame loop, which is why Phase 0.2 had to land first.
 */
export default defineConfig({
  testDir: './tests/visual',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],

  use: {
    // Device spread first — it carries its own viewport, which the explicit
    // values below must override, not the other way round.
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:5173',
    viewport: { width: 1664, height: 912 },
    deviceScaleFactor: 1,
    // NOTE: reducedMotion is deliberately NOT set here. Setting it at config
    // level wins over `test.use()` in a spec file, which silently disabled the
    // reduced-motion emulation and made that test assert against a preference
    // that was never enabled. Playwright's own default is 'no-preference', so
    // the default project gets the animated path for free, and the
    // reduced-motion project below opts in via its own `use`.
  },

  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      maxDiffPixelRatio: 0.002,
    },
  },

  projects: [
    { name: 'default', testIgnore: /reduced-motion\.spec\.js/ },
    {
      name: 'reduced-motion',
      use: { reducedMotion: 'reduce' },
      testMatch: /reduced-motion\.spec\.js/,
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
