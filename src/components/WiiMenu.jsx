import { useRef } from 'react'
import Channel from './Channel'
import BottomBar from './BottomBar'
import Clock from './Clock'
import { useStageScale, STAGE } from '../useStageScale'
import './WiiMenu.css'

const CHANNEL_COUNT = 12 // 4 columns × 3 rows

export default function WiiMenu() {
  const stageRef = useRef(null)
  useStageScale(stageRef, STAGE.WIDTH, STAGE.HEIGHT)

  return (
    <div className="wii-screen">
      <div className="stage-area">
          <div className="wii-menu" ref={stageRef}>
            <div className="wii-bg" />

            <div className="channels-area">
              <div className="channels-grid">
                {Array.from({ length: CHANNEL_COUNT }).map((_, i) => (
                  <Channel key={i} index={i} />
                ))}
              </div>

              {/* Page navigation. A disabled arrow is removed entirely rather
                  than greyed, so page 1 shows only the right arrow. */}
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

            <div className="clock-above-bar">
              <Clock />
            </div>

            <BottomBar />
        </div>
      </div>
    </div>
  )
}
