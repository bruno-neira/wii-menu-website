/**
 * Shared TV-snow atlas for empty channel slots.
 *
 * Generated once at first use from a fixed seed, so the bytes are identical on
 * every load and every machine. That is what makes screenshot diffing possible:
 * there is no `Math.random()` anywhere in the render path and no test-only code
 * branch. See docs/methodology/visual-regression-tooling.md.
 *
 * Every parameter below is measured from Nintendo's own shipped assets.
 * Full derivation: context/components/empty-slot-noise.md.
 */

const FRAME_W = 170 // Nintendo's authored 16:9 icon canvas
const FRAME_H = 96
const FRAMES = 24 // 1.000s loop at 24fps
const COLS = 2 // atlas is 2 tiles wide, giving per-tile crop offsets
const BASE = 212 // #D4D4D4, measured from reference_screen.png
const TEXTURE_MEAN = 150 // mean of Nintendo's noise texture
const SEED = 0x57ee7

/**
 * Contrast: the amplitude the noise is composited at over BASE.
 *
 * 0.047 is the measured value the real console uses — derived from its wordmark
 * rendering at -7/255 on screen against a -150 delta in the source texture. It
 * is deliberately subtle: on a 2006 CRT this reads as "the tile is faintly
 * alive" rather than as snow, which is why the effect is so rarely remembered.
 *
 * Raising this is the one documented divergence available. 0.10 reads as fine
 * grain; 0.18 reads unambiguously as analog snow. Everything else in this file
 * (grain size, level count, distribution, canvas, per-tile phase) is authentic
 * at any setting — only this number departs from the console.
 */
export const SNOW_CONTRAST = 0.047

const ROW_DC = 6 // faint scanline hint, ~1/4 of pixel amplitude
const GRAIN_W = 2 // 2 texels wide x 1 tall ~= NTSC's 1.5:1 anisotropy

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
 * sigma ~110, about 1.4x a uniform noise of the same range, so it punches
 * harder per unit of amplitude than `rand() * 255` would.
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
      // receiver's colour-killer disables chroma entirely. Coloured noise reads
      // as "digital glitch", not as television.
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
 * Per-tile decorrelation. Without this the whole grid pulses in unison, which
 * is the most visible failure mode of a grid-wide noise effect.
 *
 * This is the web translation of the console's own solution:
 * `System::getRndm()->get_u16() % 2000` per slot
 * (reference/wii-ipl/src/scene/channelSelect/iplChannelObj.cpp:817).
 *
 * Two independent offsets, because they fail independently:
 *   - phase  -> a negative animation-delay, i.e. start mid-loop
 *   - crop   -> a static background-position-x, which survives Playwright
 *               freezing the animation, so frozen baselines still show a
 *               properly decorrelated grid rather than 48 identical squares.
 */
export function tileSeedVars(index) {
  const rnd = mulberry32(SEED ^ ((index + 1) * 0x9e3779b9))
  return {
    '--snow-phase': rnd().toFixed(4),
    '--snow-x': `${(rnd() * 100).toFixed(2)}%`,
  }
}
