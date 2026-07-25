import { useState, useEffect } from 'react'
import './Clock.css'

export default function Clock() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const hours = time.getHours()
  const minutes = time.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const display12 = hours % 12 || 12
  const minutesPadded = String(minutes).padStart(2, '0')

  return (
    <div className="clock-container">
      <span className="clock-time">{display12}:{minutesPadded}</span>
      <span className="clock-ampm">{ampm}</span>
    </div>
  )
}
