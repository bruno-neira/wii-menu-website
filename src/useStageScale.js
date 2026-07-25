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
      const scale = Math.min(cw / width, ch / height)
      stage.style.setProperty('--stage-scale', String(scale))
    }

    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(container)
    return () => observer.disconnect()
  }, [stageRef, width, height])
}

/**
 * The stage's virtual dimensions.
 *
 * 810x456 is the *visible* area of the Wii's 16:9 layout space. The full
 * authored space is 832x456, but the outer ~11px per side fell into TV overscan
 * and was never seen. 810x456 is what a viewer actually saw, is true 16:9, and
 * is what `reference_screen.png` maps to (420x236 x 1.929).
 *
 * Note for anyone porting decomp coordinates: those are in the 832-wide space,
 * so subtract 11 from x.
 */
export const STAGE = { WIDTH: 810, HEIGHT: 456 }
