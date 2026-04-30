import { useState, useEffect } from 'react'
import './Clock.css'

// Segments on for each digit (a=top, b=top-right, c=bottom-right,
// d=bottom, e=bottom-left, f=top-left, g=middle)
const DIGIT_SEGMENTS = {
  '0': new Set(['a','b','c','d','e','f']),
  '1': new Set(['b','c']),
  '2': new Set(['a','b','d','e','g']),
  '3': new Set(['a','b','c','d','g']),
  '4': new Set(['b','c','f','g']),
  '5': new Set(['a','c','d','f','g']),
  '6': new Set(['a','c','d','e','f','g']),
  '7': new Set(['a','b','c']),
  '8': new Set(['a','b','c','d','e','f','g']),
  '9': new Set(['a','b','c','d','f','g']),
}

// Polygon points for each segment in a 24×42 viewBox
const SEGMENT_POINTS = {
  a: '5,1 19,1 21,3 19,5 5,5 3,3',
  b: '19,7 21,5 23,7 23,17 21,19 19,17',
  c: '19,25 21,23 23,25 23,35 21,37 19,35',
  d: '5,37 19,37 21,39 19,41 5,41 3,39',
  e: '1,25 3,23 5,25 5,35 3,37 1,35',
  f: '1,7 3,5 5,7 5,17 3,19 1,17',
  g: '5,19 19,19 21,21 19,23 5,23 3,21',
}

const SEG_ON  = '#9b9b9b'
const SEG_OFF = 'transparent'

function SevenSegDigit({ digit, hidden }) {
  const active = DIGIT_SEGMENTS[digit] ?? new Set()
  return (
    <svg
      viewBox="0 0 24 42"
      className="seg-digit"
      xmlns="http://www.w3.org/2000/svg"
      style={hidden ? { visibility: 'hidden' } : undefined}
    >
      {Object.entries(SEGMENT_POINTS).map(([id, points]) => (
        <polygon key={id} points={points} fill={active.has(id) ? SEG_ON : SEG_OFF} />
      ))}
    </svg>
  )
}

function SevenSegColon() {
  return (
    <svg viewBox="0 0 8 42" className="seg-colon" xmlns="http://www.w3.org/2000/svg">
      <circle cx="4" cy="14" r="2.5" fill={SEG_ON} />
      <circle cx="4" cy="28" r="2.5" fill={SEG_ON} />
    </svg>
  )
}

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
  const h1 = display12 >= 10 ? String(Math.floor(display12 / 10)) : null
  const h2 = String(display12 % 10)
  const m1 = String(Math.floor(minutes / 10))
  const m2 = String(minutes % 10)

  return (
    <div className="clock-container">
      <div className="clock-time">
        <div className="seg-group">
          <SevenSegDigit digit={h1 ?? '1'} hidden={!h1} />
          <SevenSegDigit digit={h2} />
        </div>
        <SevenSegColon />
        <div className="seg-group">
          <SevenSegDigit digit={m1} />
          <SevenSegDigit digit={m2} />
        </div>
        <span className="clock-ampm">{ampm}</span>
      </div>
    </div>
  )
}
