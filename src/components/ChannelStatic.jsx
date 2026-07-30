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

  const { base, vars, frozen } = useMemo(() => {
    const seeded = tileSeedVars(index)
    return {
      vars: seeded,
      base: { backgroundImage: `url(${getNoiseAtlas()})`, ...seeded },
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
      {/* The flicker is the opaque base — it carries the baked Ch1 gloss ramp.
          The two gratings are pure CSS gradients on top and take no atlas. */}
      <div className="channel-static__flicker" style={{ ...base, ...frozen }} />
      <div className="channel-static__scan-fine" style={{ ...vars, ...frozen }} />
      <div className="channel-static__scan-coarse" style={{ ...vars, ...frozen }} />
    </div>
  )
}
