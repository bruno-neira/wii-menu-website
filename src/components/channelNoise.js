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

// Sized to the VISIBLE aperture, not the 170x96 plate, so one atlas texel maps
// to exactly one layout unit and the grain is never rescaled.
const FRAME_W = 160
const FRAME_H = 88

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
 * 0.055, triangulated three ways: 0.048 from the reference capture's wordmark
 * depth, 0.055 from booper's screenshot-derived asset, 0.067 from console
 * footage. This is the console's real value, not a divergence — the noise is
 * genuinely subtle. What makes an empty slot read as a little TV screen is the
 * BAND structure (the gloss ramp and the two rolling gratings), not the grain.
 */
export const SNOW_CONTRAST = 0.055

/**
 * Ch1 — the glass reflection ramp (`my_TVSpe_a`, an 8x96 I8 vertical gradient).
 *
 * Baked into the atlas per row rather than layered as a CSS gradient: a
 * translucent overlay contributes alpha x (colour - base), so its amplitude
 * would depend on whatever sits underneath. Baking makes the flicker layer
 * opaque and exact, and costs nothing since the atlas is built once.
 *
 * Shape: bright at the very top edge, trough around 15-20% down, then a linear
 * rise to the bottom. Total swing ~13/255 — about 2.4x the grain amplitude, so
 * this is the dominant vertical structure, not a subtlety.
 */
function glossRamp(yNorm) {
  const TOP = 6.5      // +6.5 at the top edge
  const TROUGH = -7.0  // -7.0 at the trough
  const BOTTOM = 5.5   // +5.5 at the bottom
  const T = 0.17       // trough position
  if (yNorm <= T) return TOP + (TROUGH - TOP) * (yNorm / T)
  return TROUGH + (BOTTOM - TROUGH) * ((yNorm - T) / (1 - T))
}

/**
 * Per-frame clipping. The four shipped frames are NOT identically distributed:
 * F1's black floor is lifted and F3's white ceiling lowered, giving a 43/255
 * spread in frame means. That is a slow luminance breath riding on the grain.
 */
const FRAME_CLIP = [
  { lo: 0, hi: 255 },
  { lo: 49, hi: 255 },
  { lo: 0, hi: 255 },
  { lo: 0, hi: 214 },
]

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
 * The two `my_TV_d` gratings — a 16x16 horizontal line pattern (1 row on, 3
 * off) mapped at two scales via the pane's tex_coords.
 *
 * These do NOT scroll the noise, which is what an earlier pass assumed. They
 * are separate rolling scanlines, and they roll DOWNWARD — measured off console
 * footage, against the NW4R sign convention that had been inferred.
 */
export const SCAN_FINE_MS = 1668 // 4.8-unit period
export const SCAN_COARSE_MS = 8342 // 48-unit period

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
    const frame = Math.floor(y / FRAME_H)
    const clip = FRAME_CLIP[frame] ?? FRAME_CLIP[0]
    // Ramp is per-row within each frame, not across the whole atlas.
    const ramp = glossRamp((y % FRAME_H) / (FRAME_H - 1))
    for (let x = 0; x < W; x++) {
      let n = sample(rnd)
      n = n < clip.lo ? clip.lo : n > clip.hi ? clip.hi : n
      // 1x1 grain: one texel per layout unit. The earlier 2x1 was an attempt to
      // model NTSC's ~1.5:1 horizontal correlation, but that belongs to the
      // capture chain, not to Nintendo's authored texture.
      let v = BASE + SNOW_CONTRAST * (n - TEXTURE_MEAN) + ramp
      v = v < 0 ? 0 : v > 255 ? 255 : v | 0
      // R=G=B always. Analog snow is luminance-only: with no colour burst, a
      // receiver's colour-killer disables chroma entirely.
      px[y * W + x] = 0xff000000 | (v << 16) | (v << 8) | v
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
 * The flicker is only 1s long and looks identical at any phase, so what the
 * console's randomisation actually varies is the GRATING phase. Hence the two
 * scan delays.
 *
 * The static crop offset is ours, not Nintendo's — it survives Playwright
 * freezing the animations, so a frozen baseline still shows a decorrelated grid
 * rather than twelve identical squares.
 */
export function tileSeedVars(index) {
  const rnd = mulberry32(SEED ^ ((index + 1) * 0x9e3779b9))
  return {
    '--snow-x': `${(rnd() * 100).toFixed(2)}%`,
    '--scan-fine-delay': `${(-rnd() * SCAN_FINE_MS).toFixed(0)}ms`,
    '--scan-coarse-delay': `${(-rnd() * SCAN_COARSE_MS).toFixed(0)}ms`,
  }
}
