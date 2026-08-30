import { useEffect, useRef } from 'react'
import { DEFAULT_COLORS, renderSun } from './SynthwaveBackground'

/**
 * The banded sun from the title screen's background, and nothing else from it
 * — no sky, no ground, no perspective grid, no mountains, no horizon bloom.
 * The sponsor page sits on the flat `--sky` body colour and wants the one
 * landmark, not the scene.
 *
 * `renderSun` is the same function the full background uses, so the disc here
 * is the same disc: identical gradient, rim and band spacing. It paints once
 * per size change — the sun never moved in the original either, and this page
 * runs no animation at all.
 */
export default function SunBackdrop({ className }) {
  const hostRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current

    const paint = () => {
      const rect = host.getBoundingClientRect()
      if (rect.width < 1 || rect.height < 1) return

      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      /* `renderSun` pads the disc by its rim, so back the radius off to fit. */
      const radius = Math.min(rect.width, rect.height) / 2 / 1.05
      const sun = renderSun(radius, DEFAULT_COLORS, dpr)

      canvas.width = sun.canvas.width
      canvas.height = sun.canvas.height
      canvas.style.width = `${sun.size}px`
      canvas.style.height = `${sun.size}px`
      canvas.getContext('2d').drawImage(sun.canvas, 0, 0)
    }

    paint()
    const observer = new ResizeObserver(paint)
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={hostRef} className={className} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  )
}
