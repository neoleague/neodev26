import { useEffect, useRef } from 'react'
import loopUrl from '../assets/hero-loop.webm'
import stillUrl from '../assets/hero-still.webp'
import './HeroBackdrop.css'

/**
 * The synthwave scene behind the title screen.
 *
 * It used to be a live canvas repainting the whole viewport sixty times a
 * second. It is now a baked, seamlessly looping video: the scene takes no
 * input and reacts to nothing, so every frame it drew was a frame it could
 * have drawn once. The drawing code still lives at `src/scene/synthwave.js`
 * and `tools/hero-loop.mjs` renders the loop from it — that is where to go to
 * change the scene, not here. Editing the scene and not re-running the tool
 * changes nothing on screen.
 *
 * A video rather than an animated image because nothing else compresses this:
 * the whole frame moves every frame, which an image format cannot exploit and
 * a video codec is built for. The same loop as animated WebP was 9.3 MB.
 *
 * Two things this has to do that the canvas did for itself, both of them the
 * reason there is a component here at all rather than a bare element:
 *
 * - Stop when it cannot be seen. The backdrop is fixed to the viewport, so it
 *   never scrolls away — the sections below simply paint over it — and a paused
 *   video is the difference between decoding a picture nobody is looking at
 *   and not.
 * - Hold still for `prefers-reduced-motion: reduce`. This is why the poster
 *   frame exists: a video that is never started shows its poster, so honouring
 *   the setting is just declining to call `play`.
 */
export default function HeroBackdrop({
  /**
   * Selector for the element this is the background of. While that element is
   * off screen the loop is paused. Omit it and the loop always runs.
   */
  visibleWhile,
}) {
  const ref = useRef(null)

  useEffect(() => {
    const video = ref.current
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const watched = visibleWhile ? document.querySelector(visibleWhile) : null
    let onScreen = true

    const settle = () => {
      if (reduce.matches || !onScreen) video.pause()
      /* Autoplay can be refused outright; the poster is then what shows. */
      else video.play().catch(() => {})
    }

    const seen = watched
      ? new IntersectionObserver(
          ([entry]) => {
            onScreen = entry.isIntersecting
            settle()
          },
          /* Generous margin: playing again well before any of it can be seen. */
          { rootMargin: '250px' },
        )
      : null

    if (seen) seen.observe(watched)
    reduce.addEventListener('change', settle)
    settle()

    return () => {
      seen?.disconnect()
      reduce.removeEventListener('change', settle)
    }
  }, [visibleWhile])

  return (
    <video
      ref={ref}
      className="page-background"
      aria-hidden="true"
      /*
       * Playback is started by the effect above rather than by `autoPlay`, so
       * that a reader who has asked for no motion never sees the frame or two
       * that starting and immediately pausing would cost them.
       */
      src={loopUrl}
      poster={stillUrl}
      muted
      loop
      playsInline
      preload="auto"
      tabIndex={-1}
    />
  )
}
