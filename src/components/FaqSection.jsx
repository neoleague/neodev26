import PixelBubble from './PixelBubble'
import './Faq.css'

/**
 * FAQ, staged as a dive. The wave sweep above has already put the reader under
 * the water; from here the questions descend into the dark, each one a station
 * further down than the last.
 */

const FAQS = [
  {
    q: 'Who can join?',
    a: 'All students high school and below are welcome to participate!',
  },
  {
    q: 'What does it cost?',
    a: 'Neodev is completely free! Breakfast, lunch, and dinner will be provided as well.',
  },
  {
    q: 'Do I need a team?',
    a: "Teams are based on schools. You don't need a team to sign up!",
  },
  {
    q: 'What do I bring?',
    a: 'Participants must bring a laptop or device to work on. Chargers are also recommended.',
  },
]

/** Light shafts angling down from the surface. */
const RAYS = [
  { left: 8, width: 12, tilt: -9, delay: 0 },
  { left: 27, width: 7, tilt: -5, delay: -3.5 },
  { left: 46, width: 15, tilt: -2, delay: -7 },
  { left: 68, width: 9, tilt: 4, delay: -2 },
  { left: 84, width: 13, tilt: 8, delay: -5.5 },
]

/**
 * Bubbles rising past the reader. Seeded by index so they stay put — and big
 * enough that the eight pixels across their sprite are actually visible.
 */
const BUBBLES = Array.from({ length: 26 }, (_, i) => ({
  left: (i * 47.3) % 100,
  size: 10 + (i % 4) * 6,
  duration: 11 + (i % 7) * 2.5,
  delay: -((i * 3.1) % 16),
  drift: (i % 2 ? 1 : -1) * (10 + (i % 4) * 8),
}))

/*
 * The seabed, stepped rather than curved. Heights are quantised to the cell
 * below, so the profile lands on grid lines and reads as a low-resolution
 * sprite instead of a smooth hill.
 */
const CELL = 24
const FLOOR_W = 1440
const FLOOR_H = 220
const COLS = FLOOR_W / CELL

/** A ridge line: three sines mixed, then snapped to the grid. */
function ridge(seed, base, amp) {
  return Array.from({ length: COLS + 1 }, (_, i) => {
    const n =
      Math.sin((i + seed) * 0.45) * 0.5 +
      Math.sin((i + seed) * 0.17) * 0.35 +
      Math.sin((i + seed) * 0.91) * 0.15
    return Math.round((base + n * amp) / CELL) * CELL
  })
}

/** Turns a ridge into a staircase: across, down, across, down. */
function stair(heights) {
  let d = `M0 ${heights[0]}`
  for (let i = 1; i < heights.length; i += 1) {
    d += ` H${i * CELL} V${heights[i]}`
  }
  return `${d} H${FLOOR_W} V${FLOOR_H} H0 Z`
}

const FLOOR_FAR = stair(ridge(0, 124, 48))
const FLOOR_NEAR = stair(ridge(7, 174, 32))

export default function FaqSection() {
  return (
    <section id="faq" aria-labelledby="faq-title">
      {/* ------------------------------------------------------- the water */}
      <div className="deep" aria-hidden="true">
        <div className="deep-rays">
          {RAYS.map((ray) => (
            <span
              key={ray.left}
              style={{
                left: `${ray.left}%`,
                width: `${ray.width}%`,
                '--tilt': `${ray.tilt}deg`,
                animationDelay: `${ray.delay}s`,
              }}
            />
          ))}
        </div>

        <div className="deep-bubbles">
          {BUBBLES.map((bubble) => (
            <span
              key={`${bubble.left}-${bubble.size}`}
              style={{
                left: `${bubble.left}%`,
                width: bubble.size,
                height: bubble.size,
                '--drift': `${bubble.drift}px`,
                animationDuration: `${bubble.duration}s`,
                animationDelay: `${bubble.delay}s`,
              }}
            >
              <PixelBubble />
            </span>
          ))}
        </div>

        {/* The seabed, closing the section off at the bottom. */}
        <svg
          className="seabed"
          viewBox={`0 0 ${FLOOR_W} ${FLOOR_H}`}
          preserveAspectRatio="none"
          shapeRendering="crispEdges"
        >
          <path className="seabed-far" d={FLOOR_FAR} />
          <path className="seabed-near" d={FLOOR_NEAR} />
        </svg>
      </div>

      {/* ------------------------------------------------------- the content */}
      <div className="faq-inner">
        <header className="faq-head">
          <h2 className="faq-title" id="faq-title">
            FAQ
          </h2>
        </header>

        <ol className="dive">
          {FAQS.map((faq) => (
            <li className="station" key={faq.q}>
              <details className="card">
                <summary>
                  <span className="card-q">{faq.q}</span>
                  <span className="card-toggle" aria-hidden="true" />
                </summary>
                <p className="card-a">{faq.a}</p>
              </details>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
