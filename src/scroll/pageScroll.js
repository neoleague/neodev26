/**
 * One scroll axis for the whole page.
 *
 * The wave transition takes the depths out of the document while the beach is
 * on screen, so for most of the page the browser's own scroll range covers the
 * beach and nothing else — and while the sweep is running it does not move at
 * all. Neither is something a scrollbar can show honestly.
 *
 * So the page publishes a *virtual* axis instead: one continuous range that
 * runs the beach, then the sweep, then the depths, whatever the document
 * happens to be at the time. The custom rail reads this and seeks against it,
 * and never has to know a wave exists.
 *
 * When nothing registers a driver — reduced motion, where the wave never runs
 * and the page is an ordinary one — this falls through to the real document,
 * so the rail keeps working with no special case at either end.
 */

const listeners = new Set()
let driver = null

/** Called by whoever owns the page's scrolling. See WaveTransition. */
export function setDriver(next) {
  driver = next
  notify()
}

export function clearDriver(previous) {
  if (driver === previous) {
    driver = null
    notify()
  }
}

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Position changed. Cheap enough to call from a rAF loop. */
export function notify() {
  for (const listener of listeners) listener()
}

/**
 * `position` is where the reader is on the virtual axis, `length` how far it
 * runs, and `viewport` how much of the page is on screen — the last is what
 * gives the thumb its size.
 */
export function read() {
  if (driver) return driver.read()

  const doc = document.documentElement
  const viewport = window.innerHeight
  return {
    position: window.scrollY,
    length: Math.max(0, doc.scrollHeight - viewport),
    viewport,
  }
}

/** Put the reader at `position` on the virtual axis, this frame. */
function apply(position) {
  if (driver) driver.seek(position)
  else window.scrollTo({ top: position, behavior: 'instant' })
  notify()
}

/*
 * A smooth travel along the axis is a rAF tween over `apply`, not the
 * browser's `behavior: 'smooth'`. It has to be: native smooth scrolling can
 * only move the document, and the middle leg of this axis is a wave sweep that
 * happens while the document stands still. Driving it a frame at a time is
 * what lets one gesture run the beach, the crossing and the depths as a single
 * continuous move — and what keeps the rail tracking it the whole way.
 */
let tween = 0

/** Ends any travel in progress. Safe to call when there is none. */
export function stopSeek() {
  if (tween) {
    cancelAnimationFrame(tween)
    tween = 0
  }
}

/**
 * Put the reader at `position`, immediately. Cancels a travel in progress —
 * a drag on the rail or a flick of the wheel should win over one already
 * running.
 */
export function seek(position) {
  stopSeek()
  apply(position)
}

/** Slow in, slow out. */
function ease(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

/**
 * Long journeys should not take proportionally long — the square root keeps a
 * jump to the contact form from the hero brisk without making a short hop
 * across the wave feel snapped.
 */
function duration(distance) {
  return Math.min(1500, Math.max(420, 34 * Math.sqrt(Math.abs(distance))))
}

/** Travel to `position` over time. */
export function seekTo(position, ms) {
  stopSeek()

  const from = read().position
  const distance = position - from
  if (!distance) return

  const span = ms ?? duration(distance)
  const started = performance.now()

  const step = (now) => {
    const t = Math.min(1, (now - started) / span)
    apply(from + distance * ease(t))
    tween = t < 1 ? requestAnimationFrame(step) : 0
  }

  tween = requestAnimationFrame(step)
}
