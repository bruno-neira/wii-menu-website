import { useEffect, useRef, useState } from 'react'
import './WiiCursor.css'

/**
 * The Wii Remote pointer — the on-screen hand — replacing the native cursor.
 *
 * Why a DOM follower rather than `cursor: url(...)`: the authentic size is
 * ~50.6 stage px tall, which at any realistic viewport is far past the **32 px**
 * viewport-containment threshold that Chromium, WebKit AND Gecko all enforce on
 * custom cursors. Over that, the engine silently drops the image and reverts to
 * the system arrow around the whole window perimeter. `cursor: url()` is simply
 * incapable of the size the console used, so it is not a trade-off.
 * (context/components/cursor.md §12.1, §12.3.)
 *
 * The art is drawn from measurements, not traced: per-row silhouette extents in
 * §3.1, cross-checked against a themer's template that recolours the stock
 * shape. Sizes come from the decompiled layout, which draws the 64x64 texture
 * cell into a 54x54 quad — a 0.84375 factor that the first research pass missed,
 * making every figure ~16 % too large.
 *
 * DELIBERATE DIVERGENCES, both by request:
 *   - No tilt. Nintendo's own no-roll-data value is exactly 15 degrees, written
 *     as a literal in the HOME Menu's cursor code and independently derivable
 *     from the Classic controller's horizon fallback. We render upright.
 *   - No player numeral is drawn as "Wii" branding; the "1" is kept because it
 *     is a digit, not a mark, and it is most of what makes the shape read as
 *     this console's cursor rather than a generic pointing hand.
 */

/**
 * Hand geometry, in the SVG's own units.
 *
 * The viewBox keeps Nintendo's 64-unit texture cell as its frame of reference so
 * the numbers below are directly comparable to §3.1's per-row table. The hand
 * body spans HAND_W x HAND_H inside it; everything else is padding for the
 * shadow, which is offset down-and-right and would otherwise be clipped.
 */
const VIEW = { x: 8, y: 0, w: 48, h: 64 }
const HAND = { w: 41, h: 56 }

/** Shadow: pane offset (+3, -3) on a 54-unit quad => 5.6 % down-and-right. */
const SHADOW_OFFSET = 3
const SHADOW_ALPHA = 0.353

/** P1's `tev color 0`, straight from the decompiled P1_Def material. */
const P1_COLOUR = '#008CFF'

/**
 * The hand outline, drawn as the CENTRE of a 4-unit stroke.
 *
 * The measured silhouette includes the outline, so the path is inset ~2 units
 * from it and stroked 4 wide, which puts the stroke's outer edge back on the
 * measurement. Round joins do the rest: the console's art is a chunky cartoon
 * hand, and a coarse polygon under a heavy round-joined stroke reproduces that
 * far more honestly than fake-smooth bezier curves would.
 *
 * Traversed clockwise from the fingertip.
 */
const HAND_PATH = `
  M 17,9
  A 5,5 0 0 1 27,9
  L 27,15
  L 29,19
  L 39,22
  L 47,25
  L 48,28
  L 48,42
  L 45,46
  L 43,50
  L 43,53
  L 41,56
  L 19,56
  L 17,53
  L 16,50
  L 13,47
  L 11,44
  L 11,31
  L 13,28
  L 17,25
  Z
`

/**
 * Finger separations — the three short creases where the folded fingers meet
 * the back of the hand. Small, but they are why the fist reads as fingers
 * rather than a blob.
 */
const CREASES = [
  'M 32,21 L 32,26',
  'M 39,23 L 39,28',
  'M 45,25.5 L 45,30',
]

/**
 * The player numeral. Centred at ~55 % of the hand's width and ~68 % of its
 * height, cap height ~28 % of the hand — stamped on the back of the fist, not
 * floating beside it. Drawn as a stroked path rather than text so it cannot
 * shift with font availability.
 */
const NUMERAL_PATH = 'M 28.5,36 L 32,32.3 L 32,48'

function HandArt() {
  return (
    <svg
      className="wii-cursor__art"
      viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* The bottom tint. Nintendo does not paint this: the greyscale plate
            is a TINT MASK and the colour arrives from the material's colour
            register, so the wash is `(255 - plateValue)/255` of the player
            colour. That resolves to 0 % at ~62 % height ramping to ~27 % at the
            base — reproduced here directly as a gradient. */}
        <linearGradient id="wii-cursor-wash" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.62" stopColor={P1_COLOUR} stopOpacity="0" />
          <stop offset="1" stopColor={P1_COLOUR} stopOpacity="0.27" />
        </linearGradient>
        <filter id="wii-cursor-shadow-blur" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="0.8" />
        </filter>
      </defs>

      {/* The shadow is a SEPARATE offset silhouette on its own pane (N_SRot),
          not a filter on the hand — which is also the cheaper web approach,
          since drop-shadow() on a moving element re-rasterises every frame. */}
      <g
        transform={`translate(${SHADOW_OFFSET} ${SHADOW_OFFSET})`}
        filter="url(#wii-cursor-shadow-blur)"
      >
        <path
          d={HAND_PATH}
          fill={`rgba(0,0,0,${SHADOW_ALPHA})`}
          stroke={`rgba(0,0,0,${SHADOW_ALPHA})`}
          strokeWidth="4.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </g>

      {/* The hand: flat white, heavy black outline, no gloss. The Wii Menu's
          Frutiger-Aero gloss deliberately does NOT extend to the cursor — it is
          flat and high-contrast so it reads against any background. The outline
          is ~9.5 % of the hand's width; do not thin it, it is the single most
          defining trait of the shape. */}
      <path
        d={HAND_PATH}
        fill="#FFFFFF"
        stroke="#000000"
        strokeWidth="4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d={HAND_PATH} fill="url(#wii-cursor-wash)" stroke="none" />

      {CREASES.map((d) => (
        <path
          key={d}
          d={d}
          stroke="#000000"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
          opacity="0.8"
        />
      ))}

      <path
        d={NUMERAL_PATH}
        stroke={P1_COLOUR}
        strokeWidth="3.4"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

export default function WiiCursor() {
  const ref = useRef(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    // Only take over a real, fine-grained pointer. Touch has no cursor at all,
    // and hiding the native one under forced-colors would strip a genuine
    // accessibility affordance and give nothing back.
    const fine = window.matchMedia('(pointer: fine)')
    const forced = window.matchMedia('(forced-colors: active)')
    const allowed = () => fine.matches && !forced.matches
    if (!allowed()) return

    const el = ref.current
    if (!el) return

    // Written straight to style rather than through state: a re-render per
    // pointermove would add a frame of latency to the one element whose whole
    // job is to be where the pointer is.
    let shown = false
    const move = (e) => {
      el.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`
      if (!shown) {
        shown = true
        setActive(true)
      }
    }
    // Deliberately not shown until the pointer actually moves. That also keeps
    // it out of screenshot tests for free, since Playwright fires no pointer
    // events unless a test asks for them.
    const leave = () => setActive(false)
    const enter = () => setActive(true)

    window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerleave', leave)
    document.addEventListener('pointerenter', enter)
    document.documentElement.classList.add('wii-cursor-active')
    return () => {
      window.removeEventListener('pointermove', move)
      document.removeEventListener('pointerleave', leave)
      document.removeEventListener('pointerenter', enter)
      document.documentElement.classList.remove('wii-cursor-active')
    }
  }, [])

  return (
    <div
      ref={ref}
      className={`wii-cursor${active ? ' wii-cursor--visible' : ''}`}
      aria-hidden="true"
    >
      <HandArt />
    </div>
  )
}

export { HAND, VIEW }
