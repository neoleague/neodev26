import { useEffect, useRef, useState } from 'react'
import { read, seek, subscribe } from '../scroll/pageScroll'
import './Scrollbar.css'

/**
 * The page's scrollbar, drawn rather than borrowed.
 *
 * The native one cannot tell the truth about this page. While the beach is on
 * screen the wave holds the depths out of the document, so the browser reads
 * the page as ending at the about section — the thumb fills most of the track
 * and the reader is told there is nothing below. Worse, it cannot be used to
 * get anywhere: dragging it stops dead at the beach, and the sweep itself
 * happens at a standstill, so the thumb does not move for the whole crossing.
 *
 * This rail runs against the virtual axis in `../scroll/pageScroll` instead,
 * which lays the beach, the sweep and the depths end to end as one range.
 * Dragging it therefore drives the wave as readily as it scrolls the page, and
 * the thumb travels the whole way down without a discontinuity anywhere.
 *
 * The native bar is hidden in Scrollbar.css. This is not decoration on top of
 * it — it is the only scrollbar the page has.
 */

/** Smallest the thumb is allowed to get, so it stays a grabbable target. */
const MIN_THUMB = 44

/** Keyboard steps, as a share of the viewport. */
const KEYS = {
  ArrowDown: 0.12,
  ArrowUp: -0.12,
  PageDown: 0.9,
  PageUp: -0.9,
}

export default function Scrollbar() {
  const railRef = useRef(null)
  const [metrics, setMetrics] = useState({ position: 0, length: 0, viewport: 0 })
  const [track, setTrack] = useState(0)
  const [dragging, setDragging] = useState(false)

  /* The track's own height, watched rather than read during render — the rail
     is laid out by CSS and the ref is still empty on the first pass. */
  useEffect(() => {
    const rail = railRef.current
    if (!rail) return undefined
    const observer = new ResizeObserver(() => setTrack(rail.clientHeight))
    observer.observe(rail)
    setTrack(rail.clientHeight)
    return () => observer.disconnect()
  }, [])

  /*
   * Read straight from the store rather than through React on every frame:
   * the sweep repaints at 60fps and a state update per frame for two numbers
   * is more machinery than this needs. State only carries what the render
   * actually draws, and it is set from a rAF so a burst of scroll events
   * collapses into one paint.
   */
  useEffect(() => {
    let frame = 0

    const sample = () => {
      frame = 0
      const next = read()
      setMetrics((prev) =>
        prev.position === next.position &&
        prev.length === next.length &&
        prev.viewport === next.viewport
          ? prev
          : next,
      )
    }

    const request = () => {
      if (!frame) frame = requestAnimationFrame(sample)
    }

    sample()
    const unsubscribe = subscribe(request)
    window.addEventListener('scroll', request, { passive: true })
    window.addEventListener('resize', request)

    // The about section settles as its fonts and images land, which changes
    // how long the page is — the wave watches for this too.
    const observer = new ResizeObserver(request)
    observer.observe(document.body)

    return () => {
      cancelAnimationFrame(frame)
      unsubscribe()
      observer.disconnect()
      window.removeEventListener('scroll', request)
      window.removeEventListener('resize', request)
    }
  }, [])

  const { position, length, viewport } = metrics
  const total = length + viewport

  /* -------------------------------------------------------------- geometry */

  const thumb =
    total > 0 && track > 0
      ? Math.min(track, Math.max(MIN_THUMB, (viewport / total) * track))
      : 0
  const travel = Math.max(0, track - thumb)
  const progress = length > 0 ? Math.min(1, Math.max(0, position / length)) : 0

  /* ------------------------------------------------------------ the gesture */

  /**
   * Where a pointer at `clientY` puts the reader, given where on the thumb it
   * took hold. Grabbing the thumb by its middle and grabbing it by its edge
   * should both keep that spot under the finger.
   */
  const positionFor = (clientY, grabOffset) => {
    const box = railRef.current.getBoundingClientRect()
    const top = clientY - box.top - grabOffset
    const span = Math.max(0, box.height - thumb)
    return span > 0 ? (top / span) * length : 0
  }

  const onThumbPointerDown = (event) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return
    event.preventDefault()
    event.stopPropagation()

    const grabOffset = event.clientY - event.currentTarget.getBoundingClientRect().top
    const el = event.currentTarget
    el.setPointerCapture(event.pointerId)
    setDragging(true)

    const onMove = (move) => seek(positionFor(move.clientY, grabOffset))
    const onUp = () => {
      setDragging(false)
      el.releasePointerCapture?.(event.pointerId)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
    }

    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
  }

  /**
   * A click on the bare track goes straight there rather than paging towards
   * it. The page is long and the crossing is the interesting part of it — one
   * click to the FAQ beats four page-downs through a wave.
   */
  const onTrackPointerDown = (event) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return
    seek(positionFor(event.clientY, thumb / 2))
  }

  const onKeyDown = (event) => {
    if (event.key === 'Home') seek(0)
    else if (event.key === 'End') seek(length)
    else if (KEYS[event.key] !== undefined) seek(position + KEYS[event.key] * viewport)
    else return
    event.preventDefault()
  }

  // Nothing to scroll — and nothing to draw. Rendered anyway so the ref exists
  // and the track can be measured.
  const idle = length <= 0 || thumb <= 0

  return (
    <div
      className="rail"
      ref={railRef}
      data-dragging={dragging ? 'true' : 'false'}
      data-idle={idle ? 'true' : 'false'}
      onPointerDown={onTrackPointerDown}
      onKeyDown={onKeyDown}
      role="scrollbar"
      aria-orientation="vertical"
      aria-controls="root"
      aria-label="Page position"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      tabIndex={0}
    >
      <span
        className="rail-thumb"
        aria-hidden="true"
        data-short={thumb < MIN_THUMB / 2 ? 'true' : 'false'}
        onPointerDown={onThumbPointerDown}
        style={{
          height: `${thumb}px`,
          transform: `translate3d(0, ${progress * travel}px, 0)`,
        }}
      >
        <span className="rail-grip" />
      </span>
    </div>
  )
}
