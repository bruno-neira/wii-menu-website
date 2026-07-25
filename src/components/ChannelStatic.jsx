import { useMemo } from 'react'
import { getNoiseAtlas, tileSeedVars, NOISE_GEOMETRY } from './channelNoise'
import './ChannelStatic.css'

/**
 * TV snow for an empty channel slot.
 *
 * This is authentic, not decoration: the Wii really does render animated white
 * noise in empty slots. The shipped texture is a 128x96 4-bit intensity map of
 * per-pixel noise with a "Wii" wordmark stamped in it, in four independent
 * frames, seeded to a random start frame per slot. It is composited at only
 * ~4.7% contrast, which is why almost nobody remembers it as static.
 *
 * See context/components/empty-slot-noise.md before changing anything here.
 * The contrast knob lives in channelNoise.js.
 *
 * @param {number} index   Grid position. Seeds this tile's phase and crop so no
 *                         two tiles animate in lockstep.
 * @param {number} [frame] Freeze on a specific atlas row. For tests and
 *                         Storybook; omit to animate.
 */
export default function ChannelStatic({ index = 0, frame }) {
  const { FRAMES } = NOISE_GEOMETRY

  const style = useMemo(() => {
    const frozen =
      frame != null
        ? {
            animation: 'none',
            backgroundPositionY: `${((frame % FRAMES) * 100) / (FRAMES - 1)}%`,
          }
        : null

    return {
      backgroundImage: `url(${getNoiseAtlas()})`,
      ...tileSeedVars(index),
      ...frozen,
    }
  }, [index, frame, FRAMES])

  return <div className="channel-static" style={style} aria-hidden="true" />
}
