import { useMemo } from 'react'
import { getNoiseAtlas, tileSeedVars, NOISE_GEOMETRY } from './channelNoise'
import './ChannelStatic.css'

/**
 * TV snow for an empty channel slot.
 *
 * This is authentic, not decoration: the Wii really does render animated white
 * noise here. Nintendo's `my_IplTop_b.brlan` drives three superimposed tracks on
 * one quad — a 15 Hz four-frame texture flicker plus two linear vertical scrolls
 * at a 5:1 speed ratio — composited at only a few percent contrast, which is why
 * almost nobody remembers it as static.
 *
 * See context/brlan-extraction.md §4 and
 * context/components/empty-slot-noise.md before changing anything here.
 * The contrast knob lives in channelNoise.js.
 *
 * @param {number} index   Grid position. Seeds this tile's scroll phase and
 *                         crop so no two tiles drift in lockstep.
 * @param {number} [frame] Freeze on a specific noise frame. For tests and
 *                         Storybook; omit to animate.
 */
export default function ChannelStatic({ index = 0, frame }) {
  const { FRAMES } = NOISE_GEOMETRY

  const { base, frozen } = useMemo(() => {
    const vars = tileSeedVars(index)
    return {
      base: { backgroundImage: `url(${getNoiseAtlas()})`, ...vars },
      frozen:
        frame != null
          ? {
              animation: 'none',
              backgroundPositionY: `${((frame % FRAMES) * 100) / (FRAMES - 1)}%`,
            }
          : null,
    }
  }, [index, frame, FRAMES])

  return (
    <div className="channel-static" aria-hidden="true">
      {/* Order matters: the flicker is the opaque base. The drift layers sit
          ON TOP and blend, approximating Nintendo's three TEV stages on one
          quad. Put the flicker last and it occludes the drifts entirely. */}
      <div className="channel-static__flicker" style={{ ...base, ...frozen }} />
      <div className="channel-static__drift-fast" style={{ ...base, ...frozen }} />
      <div className="channel-static__drift-slow" style={{ ...base, ...frozen }} />
    </div>
  )
}
