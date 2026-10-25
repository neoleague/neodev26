import { useEffect, useRef } from 'react'
import waveUrl from '../assets/wave.webp'
import { clearDriver, notify, seekTo, setDriver, stopSeek } from '../scroll/pageScroll'
import './WaveTransition.css'

/**
 * The wave that carries the page from the beach into the sea.
 *
 * While the beach is on screen the FAQ is *held*: taken out of the document
 * flow, pinned to the top of the screen and clipped away to nothing. Two
 * things follow from that, and they are the whole design.
 *
 * The page now ends at the bottom of the beach. There is no seam to catch the
 * reader crossing — scrolling down simply runs out of page, however fast it is
 * done, and from there the wheel drives the wave instead. Nothing to miss, so
 * nothing to miss it by.
 *
 * And the wave uncovers the real FAQ rather than a stand-in for it. The held
 * section is laid out exactly as it will be once released, so what is behind
 * the wave during the sweep is what stays on screen after it — the questions
 * are already there as the water reaches them.
 *
 * Releasing it puts the page back in flow and scrolls to it, which changes
 * nothing on screen because the two renderings are the same one.
 */

/**
 * Scroll distance needed to cross the screen, as a multiple of the viewport.
 * Well under one: the wave is far wider than the screen now, so a short push
 * still carries it a long way, and holding the reader for a whole screen of
 * scrolling to get through made it read as a toll rather than a crossing.
 */
const SWEEP = 0.8

/**
 * How much of the picture is let off the top and bottom of the screen. What is
 * left between them is what fills it, so these also set the size: the wave is
 * scaled until the kept band is exactly one screen tall.
 */
const CROP_TOP = 0.1
const CROP_BOTTOM = 0.15

/** Wave height as a multiple of the viewport, from the crop above. */
const WALL = 1 / (1 - CROP_TOP - CROP_BOTTOM)

/**
 * Where the waterline sits across the (square) image, 0–1. Set to the face of
 * the wave rather than the lip of its curl: nothing is painted behind the
 * picture, so the clip's straight edge hides behind the water itself, and only
 * through the middle of the image is that water unbroken over the whole band
 * the crop keeps. A little further right and the hollow of the curl opens up,
 * and the edge would show straight through it.
 */
const FACE = 0.48

/**
 * The gesture's smoothing, as the stiffness of a critically damped spring in
 * radians per second. The wave chases the push instead of being placed by it.
 *
 * A spring rather than "move a share of the remaining distance each frame",
 * because that share is spent at its largest on the very first frame: the
 * wave leaves at full speed and decays from there. A wheel notch is a large
 * discrete push — around an eighth of the sweep, and the sweep is several
 * screens of travel for the picture — so a slow scroll is a line of those
 * arriving with gaps between them, and each one read as a lurch that trailed
 * off rather than as movement. A spring has to accelerate first, so the same
 * notch starts from nothing, and two that overlap add their momentum instead
 * of the second one restarting the decay.
 *
 * Critically damped, so it never overshoots — the wave has a wall behind it
 * and a rail tracking it, and neither should wobble at the end of a push.
 * About 70ms to fold and a fifth of a second to settle: slow enough to take
 * the steps out, fast enough that it still reads as the reader's own hand.
 */
const STIFFNESS = 14

/**
 * Longest frame the spring is stepped with, in seconds. A backgrounded tab
 * comes back with a gap of seconds, and integrating it in one go would snap
 * the wave across the screen; this makes it merely fast.
 */
const MAX_STEP = 0.05

/**
 * Close enough to stop, in sweep units and units per second. The distance is
 * about a fifth of a pixel of wave travel, so what it cuts short is invisible
 * rather than a pop — the old threshold was fifteen times that and could be
 * seen landing.
 */
const SETTLED = 0.00006
const STILL = 0.0008

/**
 * How fast the sweep starts, against how fast it would run at an even rate.
 * A wave does not cross at a constant speed — it gathers — so an even push
 * moves it slowly while it is still building and quickly once it is running.
 */
const GATHER = 0.4

/**
 * Shapes progress into distance. Both ends are pinned (0 stays 0, 1 stays 1),
 * so everything that reads those as the ends of the sweep is untouched: this
 * only changes where the wave is in between. Backwards it reads the same curve
 * the other way, so the sweep gathers going out and settles coming back.
 */
function shape(p) {
  return p * (GATHER + (1 - GATHER) * p)
}

/** Keeps both ends of the sweep clear of the screen. */
const CUSHION = 48

/** Wheel deltas arrive in pixels, lines or pages depending on the browser. */
const LINE = 16

function pixels(event) {
  if (event.deltaMode === 1) return event.deltaY * LINE
  if (event.deltaMode === 2) return event.deltaY * window.innerHeight
  return event.deltaY
}

/** Keys that scroll, so the sweep stays operable without a wheel. */
const KEYS = {
  ArrowDown: 0.14,
  ArrowUp: -0.14,
  PageDown: 0.55,
  PageUp: -0.55,
  ' ': 0.55,
  End: 1,
  Home: -1,
}

export default function WaveTransition() {
  const anchorRef = useRef(null)
  const stageRef = useRef(null)
  const waveRef = useRef(null)

  useEffect(() => {
    const anchor = anchorRef.current
    const stage = stageRef.current
    const wave = waveRef.current
    const depths = document.querySelector('.depths')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!depths) return undefined

    /** Where the gesture has pushed the sweep, 0–1. */
    let target = 0
    /** What is actually drawn, chasing `target` — this is what makes it smooth. */
    let current = 0
    /**
     * How fast it is chasing, in sweep units per second. Carrying it between
     * frames is the whole of what a spring has over a proportional follow:
     * a second push arriving while the first is still running adds to this
     * rather than starting a fresh decay from wherever the wave got to.
     */
    let velocity = 0
    /** Timestamp of the last spring frame, so it is stepped by real time. */
    let last = 0

    /**
     * The wave *is* at `p` — as opposed to being pushed towards it. Used
     * wherever the sweep is positioned rather than driven: armed, released,
     * rewound, or dropped by a drag on the rail. Killing the velocity is the
     * part that matters; leaving it would have the spring carry on out of a
     * position that was set, not thrown.
     */
    const place = (p) => {
      target = p
      current = p
      velocity = 0
    }
    /** Whether the depths are out of flow, waiting behind the wave. */
    let held = false
    /** Whether the wave currently owns the reader's scrolling. */
    let engaged = false
    /** Page offset the wave is holding the reader at. */
    let pinned = 0
    /**
     * Which way the reader is driving the sweep, +1 or -1. The ends are only
     * acted on when they are being driven towards: engaging forward starts at
     * 0, and without this the first frame would read that as "backed all the
     * way out" and release the wave the instant it took hold.
     */
    let heading = 1
    let lastY = window.scrollY
    let frame = 0
    let touchY = 0

    /* Measured on resize rather than per event — reading layout inside a
       scroll handler is what makes a page feel heavy. */
    let seam = 0
    let wall = 0

    const measure = () => {
      const exact = anchor.getBoundingClientRect().top + window.scrollY
      // Whole pixels: browsers report `scrollY` rounded, and a fractional
      // target comes back as a phantom move in the opposite direction.
      seam = Math.round(exact)
      /*
       * The section's real offset is fractional, so scrolling to the rounded
       * one leaves it a fraction of a pixel down the screen. Held, it would
       * sit at a flat zero — a pixel adrift of where it lands. Offsetting it
       * by the same fraction makes the two renderings the same one.
       */
      depths.style.setProperty('--hold-top', `${exact - seam}px`)
      wall = window.innerHeight * WALL
      wave.style.width = `${wall}px`
      wave.style.height = `${wall}px`
      // Hung so the kept band starts at the top of the screen and the rest of
      // the picture runs off both ends.
      wave.style.top = `${-CROP_TOP * wall}px`
    }

    /** Offset at which the beach's last line sits on the bottom of the screen. */
    const boundary = () => seam - window.innerHeight

    const paint = (p) => {
      const width = window.innerWidth
      const tail = wall * FACE
      const lead = wall - tail
      // The waterline runs from just off the left of the screen to just off
      // the right, with enough overshoot at both ends to carry the whole
      // picture clear of it.
      const edge =
        -lead - CUSHION + shape(p) * (width + tail + lead + CUSHION * 2)

      wave.style.transform = `translate3d(${edge - tail}px, 0, 0)`
      // How much of the depths is still clipped away, measured from the right.
      depths.style.setProperty(
        '--reveal',
        `${Math.max(0, Math.min(width, width - edge))}px`,
      )
      // The sweep is part of the page's one scroll axis, so the rail moves
      // with it — this is the only place the wave's own position changes.
      notify()
    }

    /** Take the depths out of flow so the page ends at the beach. */
    const hold = (p) => {
      paint(p)
      depths.classList.add('tide-held')
      held = true
    }

    /** Put the depths back in flow, at the top of the screen. */
    const release = () => {
      depths.classList.remove('tide-held')
      held = false
      engaged = false
      stage.dataset.active = 'false'
      place(1)
      lastY = seam
      window.scrollTo({ top: seam, behavior: 'instant' })
    }

    /**
     * Arm the wave: take the depths back out of flow with the sweep at zero.
     * Only safe at or above the boundary, where shortening the page cannot
     * move the reader.
     */
    const arm = () => {
      /*
       * Never when less motion was asked for: the sweep is the only way back
       * out of a held section, and it is exactly what that setting turns off.
       * Arming it there would end the page at the beach with no way on.
       */
      if (held || reduce.matches || window.scrollY > boundary()) return
      /*
       * Wind the sweep back to nothing as well as painting it there. Anything
       * that repaints from state afterwards — a resize, and holding the
       * depths is itself a resize — would otherwise redraw the sweep at
       * wherever it was left, which is fully crossed: the questions pinned to
       * the top of the screen with the beach hidden behind them.
       */
      place(0)
      hold(0)
    }

    /** Backed out of the sweep — the depths stay held, the beach stays put. */
    const rewind = () => {
      engaged = false
      stage.dataset.active = 'false'
      place(0)
      lastY = window.scrollY
    }

    /*
     * One loop, running for as long as the wave is engaged or still catching
     * up. `frame` is only cleared by the loop itself deciding to stop, so a
     * frame that never arrives can never leave a stale handle that blocks
     * every later scheduling attempt.
     */
    const tick = (now) => {
      /*
       * Real elapsed time, not "one frame". The spring is the same spring on
       * a 60Hz panel, a 120Hz one, and across a frame the page dropped
       * because a FAQ card was laying itself out — a per-frame constant is
       * none of those things, and the dropped frame is exactly where a
       * smoothing meant to hide a jolt would produce one.
       */
      const dt = last ? Math.min(MAX_STEP, (now - last) / 1000) : 1 / 60
      last = now

      /*
       * Critically damped spring, solved rather than stepped: for x'' =
       * -2w x' - w^2 x the exact answer is (x + (v + w x) t) e^-wt, so the
       * length of the frame cannot make it drift or blow up the way an Euler
       * step can when a frame runs long.
       */
      const x = current - target
      if (Math.abs(x) < SETTLED && Math.abs(velocity) < STILL) {
        current = target
        velocity = 0
      } else {
        const decay = Math.exp(-STIFFNESS * dt)
        const slope = velocity + STIFFNESS * x
        const next = (x + slope * dt) * decay
        velocity = (slope - STIFFNESS * (x + slope * dt)) * decay
        current = target + next
      }

      paint(current)

      if (engaged && heading > 0 && target >= 1 && current > 0.999) release()
      else if (engaged && heading < 0 && target <= 0 && current < 0.001) rewind()

      if (engaged || current !== target) frame = requestAnimationFrame(tick)
      else {
        frame = 0
        last = 0
      }
    }

    const schedule = () => {
      if (!frame) {
        // Cleared, so the first frame of a new run measures one frame rather
        // than however long the wave has been sitting still.
        last = 0
        frame = requestAnimationFrame(tick)
      }
    }

    const engage = (from) => {
      if (!held) {
        /*
         * Coming back up, undo any overshoot past the top of the depths before
         * lifting them out of flow. Both happen before the frame is painted,
         * so the beach never flashes through underneath.
         */
        if (from > 0 && window.scrollY < seam) {
          window.scrollTo({ top: seam, behavior: 'instant' })
        }
        hold(from)
      }
      engaged = true
      pinned = boundary()
      lastY = pinned
      stage.dataset.active = 'true'
      heading = from > 0 ? -1 : 1
      place(from)
      paint(current)
      schedule()
    }

    const advance = (delta) => {
      if (delta) heading = delta > 0 ? 1 : -1
      target = Math.min(1, Math.max(0, target + delta / (window.innerHeight * SWEEP)))
      schedule()
    }

    /* ------------------------------------------------- the one scroll axis */

    /*
     * The page as a scrollbar should see it: the beach, then the sweep, then
     * the depths, laid end to end as one range that exists whatever the
     * document is doing at the time.
     *
     * The browser's own range only ever covers one of those three — the depths
     * are out of flow for the first two — which is why the native scrollbar
     * reads the page as ending at the beach, and why it cannot be dragged
     * across the wave. Everything below feeds `../scroll/pageScroll`, and the
     * rail in Scrollbar.jsx drives the page back through `seek`.
     */

    /** Scrollable height of the depths once they are back in flow. */
    const tail = () => Math.max(0, depths.offsetHeight - window.innerHeight)

    /** Length of the sweep leg, in virtual pixels. */
    const sweepLength = () => window.innerHeight * SWEEP

    const virtualLength = () =>
      Math.max(0, boundary()) + sweepLength() + tail()

    const read = () => {
      const beach = Math.max(0, boundary())
      const sweep = sweepLength()

      let position
      // Mid-sweep. `current` rather than `target` — the rail should sit where
      // the wave is drawn, not where the gesture has asked it to go.
      if (engaged) position = beach + current * sweep
      // On the beach, with the sweep not yet started.
      else if (held) position = Math.min(window.scrollY, beach)
      // Past the wave: ordinary scrolling through the depths.
      else position = beach + sweep + Math.max(0, window.scrollY - seam)

      return { position, length: virtualLength(), viewport: window.innerHeight }
    }

    /**
     * Put the reader at `v` on that axis, immediately and without easing — a
     * dragged thumb is the gesture, so there is nothing to smooth towards.
     * Each leg has to leave the page in the state that leg assumes, which is
     * what the two crossings below are for.
     */
    const seek = (v) => {
      const beach = Math.max(0, boundary())
      const sweep = sweepLength()
      const at = Math.max(0, Math.min(virtualLength(), v))

      // ------------------------------------------------------ in the depths
      if (at >= beach + sweep) {
        if (held) release()
        engaged = false
        stage.dataset.active = 'false'
        place(1)
        window.scrollTo({ top: seam + (at - beach - sweep), behavior: 'instant' })
        lastY = window.scrollY
        return
      }

      // -------------------------------------------------------- on the beach
      if (at <= beach) {
        /*
         * Coming back up out of the depths. Land on the seam before lifting
         * them out of flow: from there, shortening the page cannot move the
         * reader, so the beach comes back under them rather than jumping.
         */
        if (!held) {
          window.scrollTo({ top: seam, behavior: 'instant' })
          hold(0)
        }
        engaged = false
        stage.dataset.active = 'false'
        place(0)
        paint(0)
        window.scrollTo({ top: at, behavior: 'instant' })
        lastY = window.scrollY
        return
      }

      // ------------------------------------------------------- in the sweep
      const p = (at - beach) / sweep
      if (!held) {
        window.scrollTo({ top: seam, behavior: 'instant' })
        hold(p)
      }
      /*
       * Engaged before the scroll, not after: `onScroll` snaps an engaged wave
       * back to `pinned`, and it must already know where that is by the time
       * the event it is about to cause arrives.
       */
      engaged = true
      pinned = boundary()
      heading = p >= current ? 1 : -1
      stage.dataset.active = 'true'
      window.scrollTo({ top: pinned, behavior: 'instant' })
      lastY = pinned
      /*
       * Both ends are held off by the branches above, so `p` is strictly
       * inside the sweep and the loop's release/rewind checks cannot fire
       * under the drag. Setting `target` and `current` together means the
       * next frame has nothing to chase, and the wave sits exactly where the
       * thumb was let go.
       */
      place(p)
      paint(p)
      schedule()
    }

    /**
     * Where on the axis `el` sits at the top of the screen. Works whichever
     * side of the wave the reader is currently on, and whether or not the
     * depths are held: offsets inside the depths are measured against the
     * section itself, which is laid out the same either way.
     */
    const virtualTargetFor = (el) => {
      const beach = Math.max(0, boundary())
      const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0

      if (depths.contains(el)) {
        const within =
          el.getBoundingClientRect().top -
          depths.getBoundingClientRect().top -
          margin
        return beach + sweepLength() + Math.max(0, within)
      }

      // The beach is in flow at all times, so its own offsets are the real ones.
      const y = el.getBoundingClientRect().top + window.scrollY - margin
      return Math.max(0, Math.min(beach, y))
    }

    /** True once the page has run out of beach to scroll. */
    const atEnd = () =>
      window.scrollY + window.innerHeight >=
      document.documentElement.scrollHeight - 2

    /**
     * `delta` is positive scrolling down. Returns true when the wave took the
     * gesture, in which case the caller stops the page from scrolling.
     */
    const drive = (delta) => {
      if (reduce.matches || !delta) return false

      // Real input outranks a nav link still in flight — drop the travel and
      // hand the page straight back to the reader.
      stopSeek()

      if (engaged) {
        advance(delta)
        return true
      }

      // Downward at the end of the beach: the wave takes over. There is no
      // moment to catch here — the page has simply run out, and stays run out
      // for as long as the reader keeps pushing.
      if (delta > 0 && held && atEnd()) {
        engage(0)
        advance(delta)
        return true
      }

      // Upward at the top of the FAQ: run the sweep backwards. Holding the
      // section again shortens the page, which lands the reader back on the
      // beach on its own.
      if (delta < 0 && !held && window.scrollY <= seam + 2) {
        engage(1)
        advance(delta)
        return true
      }

      return false
    }

    const onWheel = (event) => {
      if (drive(pixels(event))) event.preventDefault()
    }

    const onTouchStart = (event) => {
      touchY = event.touches[0].clientY
    }

    const onTouchMove = (event) => {
      const y = event.touches[0].clientY
      const delta = touchY - y
      touchY = y
      if (drive(delta)) event.preventDefault()
    }

    const onKeyDown = (event) => {
      const step = KEYS[event.key]
      if (step === undefined) return
      // A scroll key is the reader taking over, whether or not the wave is the
      // thing that ends up handling it.
      stopSeek()
      if (!engaged && !(step > 0 && held && atEnd())) return
      if (drive(step * window.innerHeight)) event.preventDefault()
    }

    /*
     * The depths are clipped away while held, so anything that sends the
     * reader straight into them — a nav link, a tab into a question or a form
     * field — has to let them out rather than drop the reader somewhere
     * invisible. Releasing lands on the FAQ's top, so both of these then put
     * the reader where they were actually headed.
     */
    const jumpTo = () => {
      const el = document.getElementById(location.hash.slice(1))
      if (!el) return

      /*
       * Drop the hash now that it has been served. It arrived from outside —
       * the sponsor page's nav links come back here as `/#faq`, and either
       * that or a bookmark is the only way one gets into the bar — and once
       * the reader is moving it has done its whole job.
       *
       * Leaving it would undo, for exactly the links that cross between the
       * two documents, the thing `onNavClick` is careful about for every link
       * that does not: an address bar reading `/#faq` says the reader is on
       * some other page called faq, when they are on the title screen looking
       * at a section of it. `replaceState` rather than assigning to
       * `location.hash` — it rewrites the entry rather than adding one, so
       * Back still goes to the sponsor page and not to this same page minus a
       * fragment, and unlike an assignment it fires no `hashchange`, so this
       * handler is not re-entered.
       */
      history.replaceState(null, '', location.pathname + location.search)

      if (reduce.matches) {
        el.scrollIntoView({ behavior: 'instant', block: 'start' })
        return
      }
      seekTo(virtualTargetFor(el))
    }

    /**
     * A nav link. The depths are clipped away while held, so an ordinary
     * anchor jump would aim at a section that is not in the document yet —
     * this lets them out first, then scrolls to where the reader asked to go.
     */
    const onNavClick = (event) => {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const link = event.target.closest?.('a[href^="#"]')
      const id = link?.getAttribute('href').slice(1)
      const el = id && document.getElementById(id)
      if (!el) return

      event.preventDefault()

      /*
       * The URL is left alone. These links are a way of scrolling the page,
       * not of going anywhere: writing the hash makes the address bar read as
       * though the reader has landed on a separate page, and puts an entry in
       * the history so Back appears to leave the site when it only walks up a
       * list of anchors. The one link in the masthead that really is a
       * destination — Sponsor — carries no hash, so it is never seen here and
       * navigates normally.
       */

      if (reduce.matches) {
        el.scrollIntoView({ behavior: 'instant', block: 'start' })
        return
      }

      /*
       * Travel the page's own axis rather than the document's. A link to the
       * FAQ from the beach is one continuous move that runs the wave on the
       * way past, instead of cutting to the far side of it — and the rail
       * tracks the whole journey, crossing included, because the axis is the
       * same one it draws.
       */
      seekTo(virtualTargetFor(el))
    }

    const onFocusIn = (event) => {
      if (!held) return
      release()
      event.target.scrollIntoView({ behavior: 'instant', block: 'center' })
    }

    const onScroll = () => {
      const y = window.scrollY
      const up = y < lastY - 1
      lastY = y

      // Ordinary scrolling moves the rail too — the sweep's own frames are
      // covered by `paint`.
      notify()

      if (engaged) {
        /*
         * Downward the page cannot move while the depths are held — it ends at
         * the beach. Upward it can, and the momentum of the flick that started
         * the sweep will keep trying to. Put it back.
         */
        if (Math.abs(y - pinned) > 1) {
          window.scrollTo({ top: pinned, behavior: 'instant' })
          lastY = pinned
        }
        return
      }

      /*
       * Coming back up past the top of the depths. The downward catch needs no
       * help — the page simply runs out of beach — but on this side there is a
       * whole screen of scrollable page above, and waiting for the next wheel
       * tick lets a fast flick outrun the catch. Watch the position instead,
       * which no speed can slip past.
       */
      if (!held && up && y < seam && !reduce.matches) {
        engage(1)
        return
      }

      // Last resort, for when the sweep was skipped: back above the beach's
      // end with the depths still in flow, arm the wave again.
      if (up) arm()
    }

    const onResize = () => {
      measure()
      paint(current)
    }

    measure()

    /*
     * Only when the wave is actually running. Under reduced motion the section
     * is never held and the page is an ordinary document, so leaving the
     * driver unset lets the rail read the real scrollbar instead.
     */
    const driver = { read, seek }
    if (!reduce.matches) setDriver(driver)

    // Hold from the start — unless the reader is already past the beach, or
    // has asked for less motion, in which case the page stays as written.
    if (!reduce.matches && window.scrollY <= boundary()) hold(0)

    /*
     * The about section settles as its fonts and images arrive, which moves
     * the seam — watch for it rather than trusting the first measurement.
     *
     * Coalesced, because the page also changes length on every frame of
     * anything that grows it: a FAQ card opening runs `block-size` from 0 to
     * the answer's height, and answering each of those frames meant a
     * `getBoundingClientRect` — a forced layout — plus a repaint of the wave,
     * landing inside the card's own layout pass. The seam is above the FAQ and
     * does not move when a card opens, so none of that work changed anything.
     * Viewport resizes are still handled immediately, by the `resize` listener
     * below; this is only the slower "the page settled" signal.
     */
    let settle = 0
    const observer = new ResizeObserver(() => {
      clearTimeout(settle)
      settle = setTimeout(onResize, 100)
    })
    observer.observe(document.body)

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onResize)
    window.addEventListener('hashchange', jumpTo)
    document.addEventListener('click', onNavClick)
    depths.addEventListener('focusin', onFocusIn)

    /*
     * Landing with a hash already in the URL — the sponsor page's nav links
     * back here are `/#faq` and `/#contact`, and either can be bookmarked.
     * The browser's own jump cannot serve those: the depths are held out of
     * the document at this point, so it would aim at a section that is not in
     * flow. One frame in, once the seam has been measured, ride there instead.
     */
    let landing = 0
    if (location.hash) landing = requestAnimationFrame(jumpTo)

    return () => {
      clearTimeout(settle)
      clearDriver(driver)
      stopSeek()
      cancelAnimationFrame(frame)
      cancelAnimationFrame(landing)
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('hashchange', jumpTo)
      document.removeEventListener('click', onNavClick)
      depths.removeEventListener('focusin', onFocusIn)
      depths.classList.remove('tide-held')
    }
  }, [])

  return (
    <div className="tide" ref={anchorRef}>
      <div className="tide-stage" ref={stageRef} data-active="false" aria-hidden="true">
        <img className="tide-wave" ref={waveRef} src={waveUrl} alt="" />
      </div>
    </div>
  )
}
