/**
 * Shared TV-snow atlas for empty channel slots.
 *
 * Generated once at first use from a fixed seed, so the bytes are identical on
 * every load and every machine. That is what makes screenshot diffing possible:
 * there is no `Math.random()` anywhere in the render path and no test-only code
 * branch. See docs/methodology/visual-regression-tooling.md.
 *
 * The structure below is extracted from Nintendo's own `my_IplTop_b.brlan`
 * (see context/brlan-extraction.md §4): FOUR noise frames swapped on a 15-step
 * shuffle, not a long unique sequence. Full derivation of every constant is in
 * context/components/empty-slot-noise.md.
 */

const FRAME_W = 170 // Nintendo's authored 16:9 icon canvas
const FRAME_H = 96

/**
 * Four frames — the exact count Nintendo shipped. The ripped "Empty Channel
 * Spaces" sheet contains four 128x96 tiles, and the brlan's texture-pattern
 * track cycles values in {0,1,2,3}.
 */
const FRAMES = 4
const COLS = 2 // atlas is 2 tiles wide, giving per-tile crop offsets
const BASE = 212 // #D4D4D4, measured from reference_screen.png
const TEXTURE_MEAN = 150 // mean of Nintendo's noise texture
const SEED = 0x57ee7

/**
 * Contrast: the amplitude the noise is composited at over BASE.
 *
 * 0.047 is measured from the reference capture (the wordmark renders at -7/255
 * against a -150 delta in the source texture). The extracted layout's TEV
 * constant of (8,8,8) implies ~3.1%, so the true value sits somewhere in
 * 3-5% — either way it is deliberately subtle, and reads as "the tile is
 * faintly alive" rather than as snow.
 *
 * Raising this is the one documented divergence available. Everything else in
 * this file is authentic at any setting.
 */
export const SNOW_CONTRAST = 0.047

const ROW_DC = 6 // faint scanline hint, ~1/4 of pixel amplitude
const GRAIN_W = 2 // 2 texels wide x 1 tall ~= NTSC's 1.5:1 anisotropy

/**
 * The flicker order, verbatim from the brlan's RLTP track.
 *
 * 15 keys, one texture swap every 4 console frames (66.73ms), so the visible
 * grain repeats every 1.001s. It is deliberately not a straight 0,1,2,3 cycle:
 * consecutive frames are never equal, frame 3 appears less often than the
 * others, and two of the twelve possible transitions (1->3 and 3->2) never
 * occur at all. A naive round-robin reads as a rhythmic pulse; this does not.
 */
export const FLICKER_SEQUENCE = [0, 1, 2, 3, 0, 2, 1, 0, 3, 1, 2, 0, 1, 2, 3]

/** 15 steps x 66.73ms. */
export const FLICKER_DURATION_MS = 1001

/**
 * Two superimposed vertical texture scrolls, both perfectly linear.
 * Five wraps and one wrap per 2000-frame (33.366s) loop respectively — the
 * slower is exactly 1/5 the speed of the faster, and their interference is the
 * only reason the loop is 2000 frames long rather than 60.
 */
export const DRIFT_FAST_MS = 6673
export const DRIFT_SLOW_MS = 33366

function mulberry32(a) {
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Nintendo's measured level distribution: 26% floor, 41% ceiling, 33% spread
 * across 14 middle levels, quantised to 16 levels (a 4-bit I4 texture).
 *
 * Physically this is a hard-clipped Gaussian — a receiver with no signal runs
 * its AGC wide open until thermal noise clips against both rails. It yields
 * sigma ~110, about 1.4x a uniform noise of the same range.
 */
function sample(rnd) {
  const u = rnd()
  if (u < 0.26) return 0
  if (u >= 0.59) return 255
  return (1 + Math.floor(rnd() * 14)) * 17
}

let atlasUrl = null

export function getNoiseAtlas() {
  if (atlasUrl) return atlasUrl

  const W = FRAME_W * COLS
  const H = FRAME_H * FRAMES
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  const img = ctx.createImageData(W, H)
  const px = new Uint32Array(img.data.buffer) // 2x faster than four byte stores
  const rnd = mulberry32(SEED)

  for (let y = 0; y < H; y++) {
    const rowDc = (rnd() - 0.5) * 2 * ROW_DC
    for (let x = 0; x < W; x += GRAIN_W) {
      const n = sample(rnd)
      let v = BASE + SNOW_CONTRAST * (n - TEXTURE_MEAN) + rowDc
      v = v < 0 ? 0 : v > 255 ? 255 : v | 0
      // R=G=B always. Analog snow is luminance-only: with no colour burst, a
      // receiver's colour-killer disables chroma entirely.
      const word = 0xff000000 | (v << 16) | (v << 8) | v
      for (let g = 0; g < GRAIN_W && x + g < W; g++) px[y * W + x + g] = word
    }
  }
  ctx.putImageData(img, 0, 0)

  atlasUrl = canvas.toDataURL('image/png')
  return atlasUrl
}

export const NOISE_GEOMETRY = { FRAME_W, FRAME_H, FRAMES, COLS }

/**
 * Per-tile decorrelation, the web translation of the console's own
 * `System::getRndm()->get_u16() % 2000`
 * (reference/wii-ipl/src/scene/channelSelect/iplChannelObj.cpp:817).
 *
 * The extraction clarified what that randomisation is actually for: the flicker
 * is only 1s long and would look identical at any phase, so the random start
 * frame is really randomising the SCROLL phase across slots. Hence the delay is
 * applied to the drift layers.
 *
 * The static crop offset is ours, not Nintendo's — it survives Playwright
 * freezing the animations, so a frozen baseline still shows a decorrelated grid
 * rather than twelve identical squares.
 */
export function tileSeedVars(index) {
  const rnd = mulberry32(SEED ^ ((index + 1) * 0x9e3779b9))
  return {
    '--snow-drift-delay': `${(-rnd() * DRIFT_SLOW_MS).toFixed(0)}ms`,
    '--snow-x': `${(rnd() * 100).toFixed(2)}%`,
  }
}
