import { useRef, useEffect } from 'react'

const W = 64
const H = 36
const INTERVAL = 3000

export default function ChannelStatic() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId
    let lastTime = 0

    function draw(timestamp) {
      animId = requestAnimationFrame(draw)
      if (timestamp - lastTime < INTERVAL) return
      lastTime = timestamp

      const imageData = ctx.createImageData(W, H)
      const d = imageData.data

      for (let y = 0; y < H; y++) {
        // Each row gets its own brightness — this is what makes it read as horizontal
        const rowBase = 210 + Math.random() * 18
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4
          const v = Math.min(255, Math.max(0, Math.floor(rowBase + (Math.random() - 0.5) * 12)))
          d[i] = v
          d[i + 1] = v
          d[i + 2] = v
          d[i + 3] = 255
        }
      }

      ctx.putImageData(imageData, 0, 0)
    }

    animId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animId)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        imageRendering: 'pixelated',
        display: 'block',
      }}
    />
  )
}
