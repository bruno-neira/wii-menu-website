import { useState, useEffect } from 'react'
import WiiWordmark from './WiiWordmark'
import './BottomBar.css'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

function DateDisplay() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(id)
  }, [])
  const day = DAYS[now.getDay()]
  const month = MONTHS[now.getMonth()]
  const date = now.getDate()
  return (
    <div className="bar-date-group">
      <span className="bar-date">{day}</span>
      <span className="bar-date">{month}/{date}</span>
    </div>
  )
}

function WiiButton() {
  return (
    <button className="wii-button" aria-label="Wii Menu">
      <div className="wii-button-inner">
        {/* Wordmark at 50.6% of the face, flat #A2A2A2, optically raised ~2%
            (context/components/wii-button.md §1.3). Reuses the clean-room
            logotype the empty slots stamp. */}
        <WiiWordmark />
      </div>
    </button>
  )
}


/**
 * SD Card Menu icon (System Menu 4.0+).
 *
 * Deliberately NOT a round button like the Wii and Message Board controls —
 * it is a flat pictogram with no chrome, sitting outside the left pill
 * (context/components/empty-slot-and-sd-icon.md).
 *
 * Rendered in its DISABLED state: Nintendo's own art measures strongly cyan
 * (~#5AB9D7) when a card is inserted, but greys out when none is. Our reference
 * capture is achromatic, i.e. the no-card state — which is also the honest
 * default for a web recreation with no SD slot.
 */
function SdCardIcon() {
  return (
    <div className="sd-icon" aria-label="SD Card Menu (no card inserted)" role="img">
      <svg viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Card body with the chamfered top-right notch */}
        <path
          d="M2 3 h13 l7 6 v18 a2 2 0 0 1 -2 2 h-16 a2 2 0 0 1 -2 -2 v-22 a2 2 0 0 1 2 -2 z"
          fill="#b9bcc3"
          stroke="#9a9da5"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Contact fingers along the top edge */}
        <g fill="#9a9da5">
          <rect x="4.5" y="4.5" width="1.6" height="4" rx="0.6" />
          <rect x="7.4" y="4.5" width="1.6" height="4" rx="0.6" />
          <rect x="10.3" y="4.5" width="1.6" height="4" rx="0.6" />
        </g>
        {/* Lower band */}
        <rect x="3.6" y="20" width="16.8" height="7" rx="1.4" fill="#cfd2d8" />
      </svg>
    </div>
  )
}

function MailButton() {
  return (
    <button className="mail-button" aria-label="Wii Message Board">
      <div className="mail-button-inner">
        {/* Nintendo's construction, byte-decoded: the glyph is tinted grey-140
            and drawn at pane alpha 180/255 over the ball, so the face shows
            through slightly (capture composite 161-166). The fold line is a
            hole in the glyph, not a painted stroke — cut it with a mask so the
            face gradient shows through (context/components/mail-button.md
            ADDENDUM 2026-07-29). */}
        <svg className="mail-icon" viewBox="0 0 76 51" fill="none" xmlns="http://www.w3.org/2000/svg">
          <mask id="mail-fold">
            <rect x="0" y="0" width="76" height="51" fill="white" />
            <polyline points="1,13 38,30 75,13" fill="none" stroke="black" strokeWidth="4" />
          </mask>
          <rect x="1" y="1" width="74" height="49" rx="3"
                fill="rgba(140,140,140,0.706)" mask="url(#mail-fold)" />
        </svg>
      </div>
    </button>
  )
}

/* Authored once, consumed by the fill, the clip and the edge stroke. Keeping
   three copies in sync by hand is how these drift. */
const BAR_SHAPE = `
  M0,0
  L172,0
  C230,0 290,61 338,61
  L661,61
  C710,61 770,0 829,0
  L1000,0
  L1000,155
  L0,155
  Z
`

const BAR_CONTOUR = `
  M0,0
  L172,0
  C230,0 290,61 338,61
  L661,61
  C710,61 770,0 829,0
  L1000,0
`

export default function BottomBar() {
  return (
    <div className="bottom-bar-wrapper">
      {/* SVG shape for the bar */}
      <svg
        className="bottom-bar-svg"
        viewBox="0 0 1000 155"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Base fill. The dark band is NOT in this gradient — see barEdge. */}
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#d3d5db" />
            <stop offset="100%" stopColor="#c7cad1" />
          </linearGradient>

          {/* The bar's shading is anchored to its CURVED top edge, not to a
              screen-space line — the dark band follows the contour down into
              the trough and back up over the wings. A linear-gradient cannot
              express that: it would put the band across the bounding box, which
              in the trough lands above the actual surface.

              Instead: stroke the contour thickly, blur it, and clip it to the
              bar shape. The result is an inner shadow that IS the curve. */}
          <clipPath id="barClip">
            <path d={BAR_SHAPE} />
          </clipPath>
          <filter id="barEdgeBlur" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>

        {/* Main bar shape — proportions derived from Figma reference rectangles:
            Wings: x 0..172 and 829..1000, y=0
            Left curve: x 172→338, y 0→61  (green rect bounds + purple rect top)
            Flat trough: x 338..661, y=61
            Right curve: x 661→829, y 61→0 */}
        <path d={BAR_SHAPE} fill="url(#barGrad)" />

        {/* Edge-anchored dark band: a thick blurred stroke of the contour,
            clipped to the bar so only the inside half shows. */}
        <g clipPath="url(#barClip)">
          <path
            d={BAR_CONTOUR}
            fill="none"
            stroke="#a4a9b3"
            strokeWidth="26"
            filter="url(#barEdgeBlur)"
            opacity="0.85"
          />
        </g>

        {/* Cyan accent line — a 1px solid stroke tracing the full contour,
            edge to edge. Not a glow: measurement found one antialiased pixel
            above it and zero below. */}
        <path
          d={BAR_CONTOUR}
          fill="none"
          stroke="#4cbadf"
          strokeWidth="2"
        />
      </svg>

      {/* Left side: Wii button, with the SD Card icon outside the pill */}
      <div className="bar-left">
        <WiiButton />
      </div>
      <SdCardIcon />

      {/* Center: date */}
      <div className="bar-center">
        <DateDisplay />
      </div>

      {/* Right side: mail button */}
      <div className="bar-right">
        <MailButton />
      </div>
    </div>
  )
}
