import Channel from './Channel'
import BottomBar from './BottomBar'
import Clock from './Clock'
import './WiiMenu.css'

const CHANNEL_COUNT = 12 // 4 columns × 3 rows

export default function WiiMenu() {
  return (
    <div className="wii-screen">
      <div className="tv-frame">
      <div className="wii-menu">
        {/* Background texture */}
        <div className="wii-bg" />

        {/* Channels grid area */}
        <div className="channels-area">
          <div className="channels-grid">
            {Array.from({ length: CHANNEL_COUNT }).map((_, i) => (
              <Channel key={i} />
            ))}
          </div>

          {/* Navigation arrows — left arrow hidden on first page */}
          <button className="nav-arrow nav-arrow-right" aria-label="Next page">
            <svg viewBox="0 0 45 77" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M 0,0 L 45,38.5 L 0,77 Q 18,38.5 0,0 Z"
                fill="#a8dff0"
                stroke="#4cbadf"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Clock above bar center */}
        <div className="clock-above-bar">
          <Clock />
        </div>

        {/* Bottom bar */}
        <BottomBar />
      </div>
      </div>
    </div>
  )
}
