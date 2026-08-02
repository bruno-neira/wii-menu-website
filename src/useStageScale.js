import { useLayoutEffect } from 'react'

/**
 * Scale a fixed-size stage to fit its container.
 *
 * The Wii Menu was authored in a fixed virtual coordinate space and never
 * reflowed — widescreen was handled by stretching the output, not by changing
 * the layout. So the faithful web equivalent is a fixed-size root scaled by a
 * single transform, rather than a fluid grid of percentages.
 *
 * Two things fall out of that which matter here:
 *   - Every CSS value inside the stage is a literal coordinate in Nintendo's
 *     own space, so decomp and spec measurements drop in without conversion.
 *   - There is exactly one rounding regime for the whole UI, which is what
 *     makes screenshot diffs stable rather than something to tune tolerances
 *     around.
 *
 * Uses `useLayoutEffect` so the scale is applied before paint; with `useEffect`
 * the first frame renders unscaled and flashes.
 */
export function useStageScale(stageRef, width, height) {
  useLayoutEffect(() => {
    const stage = stageRef.current
    const container = stage?.parentElement
    if (!stage || !container) return

    const apply = () => {
      const { width: cw, height: ch } = container.getBoundingClientRect()
      if (!cw || !ch) return
      // Fit the *displayed* (post-squash) size, not the raw stage size.
      const scale = Math.min(cw / (width * ANAMORPHIC_X), ch / height)
      stage.style.setProperty('--stage-scale', String(scale))
      // Also on the container, so siblings of the stage can size themselves in
      // stage units — the cursor is drawn outside the stage (it must not be
      // clipped by it) but still has to match its scale exactly.
      container.style.setProperty('--stage-scale', String(scale))
    }

    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(container)
    return () => observer.disconnect()
  }, [stageRef, width, height])
}

/**
 * The stage's virtual dimensions — Nintendo's 16:9 authoring space.
 *
 * 832x456 is NOT 16:9 (it is 1.825:1). It is an *anamorphic* space: the console
 * renders into it with non-square pixels and the display presents it at 16:9.
 * Reproducing that means squashing horizontally by ANAMORPHIC_X on output:
 *
 *     832 x 0.97436 / 456  =  1.7778  =  16:9
 *
 * Holding the stage in 832-space rather than a pre-squashed 810 keeps every
 * coordinate decomp-native, so extracted layout values drop in unconverted.
 *
 * An earlier version of this file used a 810x456 stage and told porters to
 * "subtract 11 from x". That was wrong — the 832->810 relationship is a scale,
 * not an offset, and the error was worth ~4.5 stage px at the screen edges,
 * exactly where the bar, pills and page arrows live.
 */
export const STAGE = { WIDTH: 832, HEIGHT: 456 }

/** Horizontal squash applied on output. 810.4 / 832. */
export const ANAMORPHIC_X = 0.97436
