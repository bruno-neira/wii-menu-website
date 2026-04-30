import { useState, useEffect } from 'react'
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
        <span className="wii-button-text">Wii</span>
      </div>
    </button>
  )
}


function MailButton() {
  return (
    <button className="mail-button" aria-label="Wii Message Board">
      <div className="mail-button-inner">
        <svg className="mail-icon" viewBox="0 0 76 51" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="1" width="74" height="49" rx="3" fill="#a4a4a4" stroke="none"/>
          <polyline points="1,13 38,30 75,13" fill="none" stroke="#d8d9e0" strokeWidth="4"/>
        </svg>
      </div>
    </button>
  )
}

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
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#d3d4db" />
            <stop offset="100%" stopColor="#acafb7" />
          </linearGradient>
        </defs>

        {/* Main bar shape — proportions derived from Figma reference rectangles:
            Wings: x 0..172 and 829..1000, y=0
            Left curve: x 172→338, y 0→61  (green rect bounds + purple rect top)
            Flat trough: x 338..661, y=61
            Right curve: x 661→829, y 61→0 */}
        <path
          d="
            M0,0
            L172,0
            C230,0 290,61 338,61
            L661,61
            C710,61 770,0 829,0
            L1000,0
            L1000,155
            L0,155
            Z
          "
          fill="url(#barGrad)"
        />

        {/* Cyan groove line — traces the top contour, gives the recessed look */}
        <path
          d="
            M0,0
            L172,0
            C230,0 290,61 338,61
            L661,61
            C710,61 770,0 829,0
            L1000,0
          "
          fill="none"
          stroke="#4cbadf"
          strokeWidth="2"
        />
      </svg>

      {/* Left side: Wii button */}
      <div className="bar-left">
        <WiiButton />
      </div>

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
