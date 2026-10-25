import './Seafloor.css'

/**
 * The reef the FAQ is read against.
 *
 * Ported from the seafloor canvas rather than reinvented: same layers, same
 * colours, same motion. What changed in the port is where things are measured
 * from. The canvas was one screen tall and sized everything as a percentage of
 * itself; this section is a list of questions and grows every time one opens,
 * so a percentage of the section would resize the whole reef on every frame of
 * that slide — the mistake the light shafts used to make. Every layer here is
 * pinned to the viewport instead, which is also what the water above it does.
 *
 * The scene is scenery: `aria-hidden`, no pointer events, and every animation
 * confined to `transform` and `opacity` so none of it can cost a repaint. See
 * the motion rules in CLAUDE.md.
 */

/**
 * Turns an ASCII sprite into a stack of `box-shadow` pixels on a single
 * element, one shadow per lit cell. A fish is then one div and no image.
 */
function sprite(rows, palette, px) {
  const pixels = []
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const colour = palette[row[x]]
      if (colour) pixels.push(`${x * px}px ${y * px}px 0 ${colour}`)
    }
  })
  return pixels.join(', ')
}

/* d outline · b body · w belly · l fin · f tail · e eye white · o pupil */
const BIG = [
  '...........dd...',
  '..........dllld.',
  '..d.....ddbbbwwd',
  '.dd...ddbbbbbbwd',
  'dffd.dbbbbbbeodd',
  'dfffddbbbbbbbeod',
  'dffd.dbbbbbbbbbd',
  '..dd..ddbbbbbbbd',
  '..d.....ddllllbd',
  '...........dd...',
]

const MID = [
  '......dddd..',
  '..d.ddbbbwwd',
  '.dfddbbbbeod',
  'dfffdbbbbeod',
  '.dfddbbbbbbd',
  '..d.ddbbbbbd',
  '......dddd..',
]

const SMALL = [
  '....ddd..',
  '.d.dbbwd.',
  'ddddbbeod',
  '.d.dbbbd.',
  '....ddd..',
]

const CYAN = { d: '#0f3a86', b: '#2fd3f0', w: '#c9f6ff', l: '#8ef0ff', f: '#1fb6d8', e: '#ffffff', o: '#0d2a6b' }
const VIOLET = { d: '#301a70', b: '#8b7cf0', w: '#d8d0ff', l: '#b5a9ff', f: '#6a5cd8', e: '#ffffff', o: '#1b0f4a' }
const PINK = { d: '#8a1256', b: '#ff5fae', w: '#ffd6ec', l: '#ff9bd0', f: '#e0368f', e: '#ffffff', o: '#5c0a38' }
const GHOST = {
  d: 'rgba(30, 60, 140, 0.55)',
  b: 'rgba(80, 120, 220, 0.5)',
  w: 'rgba(160, 200, 255, 0.5)',
  l: 'rgba(110, 160, 235, 0.5)',
  f: 'rgba(60, 100, 190, 0.5)',
  e: 'rgba(220, 240, 255, 0.6)',
  o: 'rgba(20, 40, 110, 0.6)',
}

/** Four fish, each one div: the sprite, its pixel size, and how it crosses. */
const FISH = [
  { key: 'big', shadow: sprite(BIG, CYAN, 5), px: 5, className: 'fish--big' },
  { key: 'mid', shadow: sprite(MID, VIOLET, 4), px: 4, className: 'fish--mid' },
  { key: 'small', shadow: sprite(SMALL, PINK, 3), px: 3, className: 'fish--small' },
  { key: 'ghost', shadow: sprite(MID, GHOST, 3), px: 3, className: 'fish--ghost' },
]

const BUBBLE = [
  '..www..',
  '.w...w.',
  'whh...w',
  'wh....w',
  'w.....w',
  '.w...w.',
  '..www..',
]

const BUBBLE_PALETTE = { w: 'rgba(255, 255, 255, 0.85)', h: '#ffffff' }

/*
 * Bubbles, seeded by index rather than Math.random so the reef does not
 * reshuffle on every render — the same trick the beach's star field uses.
 */
const BUBBLES = Array.from({ length: 12 }, (_, i) => {
  const a = ((i * 9301 + 49297) % 233280) / 233280
  const b = ((i * 4211 + 1327) % 99991) / 99991
  const px = 2 + Math.round(b * 3)
  return {
    key: i,
    left: `${(3 + a * 94).toFixed(1)}%`,
    px,
    shadow: sprite(BUBBLE, BUBBLE_PALETTE, px),
    duration: `${(11 + a * 16).toFixed(1)}s`,
    delay: `${(-b * 22).toFixed(1)}s`,
  }
})

/** A fan of coral fronds. Each entry is `[width, height, rotation]` in px/deg. */
function Fronds({ className, fronds, tones }) {
  return (
    <div className={`fan ${className}`}>
      {fronds.map(([w, h, rotate], i) => (
        <span
          key={`${w}-${h}-${rotate}`}
          style={{
            width: w,
            height: h,
            background: tones[i % tones.length],
            rotate: `${rotate}deg`,
          }}
        />
      ))}
    </div>
  )
}

/*
 * Frond tones, in the order they run across a fan. They are tokens rather than
 * hexes for the same reason everything else down here is: the depths have one
 * palette, in index.css, and a second copy of it in a component is how the
 * blues drifted apart the first time.
 */
const CORAL = ['var(--coral)', 'var(--coral-lit)', 'var(--coral-deep)', 'var(--coral-lit)', 'var(--coral)']
const CORAL_DEEP = ['var(--coral-deep)', 'var(--coral)', 'var(--coral-lit)', 'var(--coral-deep)']
const LILAC = ['var(--violet-lit-2)', 'var(--violet-mid)', 'var(--violet-lit)', 'var(--violet-mid)']
const SEA_LILAC = ['var(--violet-lit-2)', 'var(--urchin-pale)', 'var(--violet-lit)', 'var(--violet-mid)']

export default function Seafloor() {
  return (
    <div className="sea" aria-hidden="true">
      {/* ------------------------------------------------ the water surface */}
      <div className="sea-surface">
        <div className="caustic caustic--coarse" />
        <div className="caustic caustic--fine" />
        <div className="surface-sheen" />
      </div>

      {/* Shafts angling down from the surface. One static layer, no blur. */}
      <div className="shafts" />

      {/* --------------------------------------------------------- the reef */}
      <div className="bed">
        <div className="haze" />
        <div className="sand" />
        <div className="sand-line" />

        {/* ---------------------------------------------------- left stack */}
        <div className="reef reef--left">
          <span className="rock rock--l1" />
          <span className="rock rock--l2" />
          <span className="rock rock--l3" />

          <Fronds className="fan--l1" tones={CORAL} fronds={[[13, 54, -26], [15, 84, -12], [16, 104, 0], [15, 78, 14], [12, 46, 28]]} />
          <Fronds className="fan--l2" tones={LILAC} fronds={[[10, 60, -20], [11, 96, -6], [10, 72, 12]]} />
          <Fronds className="fan--l3" tones={CORAL_DEEP} fronds={[[18, 64, -22], [20, 108, -7], [19, 86, 11], [15, 52, 26]]} />

          <span className="kelp kelp--l1" />
          <span className="kelp kelp--l2" />
          <span className="kelp kelp--l3" />

          <div className="anemone">
            <span /><span /><span /><span />
            <span className="anemone-foot" />
          </div>

          <span className="brain brain--l1" />
          <span className="brain brain--l2" />
        </div>

        {/* --------------------------------------------------- right stack */}
        <div className="reef reef--right">
          <span className="rock rock--r1" />
          <span className="rock rock--r2" />
          <span className="rock rock--r3" />

          <Fronds className="fan--r1" tones={SEA_LILAC} fronds={[[12, 58, -24], [14, 112, -8], [13, 88, 10], [11, 50, 24]]} />
          <Fronds className="fan--r2" tones={CORAL_DEEP} fronds={[[19, 72, -20], [22, 126, -4], [20, 94, 13], [16, 58, 28]]} />

          <div className="urchin">
            <span /><span /><span /><span />
            <span className="urchin-body" />
          </div>

          <span className="kelp kelp--r1" />
          <span className="kelp kelp--r2" />

          <span className="brain brain--r1" />
          <span className="brain brain--r2" />
        </div>

        {/* Foreground fronds, centre. */}
        <Fronds className="fan--centre" tones={CORAL} fronds={[[10, 34, -22], [11, 52, -6], [10, 40, 16]]} />

        {/* ------------------------------ the set on the sand, still playing */}
        <div className="crt">
          <span className="crt-flex" />
          <span className="crt-hook" />
          <span className="crt-lamp" />

          <div className="crt-body">
            <span className="crt-handle" />
            <div className="crt-screen">
              <span className="crt-hill" />
              <span className="crt-ridge" />
              <span className="crt-cloud crt-cloud--l" />
              <span className="crt-cloud crt-cloud--r" />
              <span className="crt-scan" />
              <span className="crt-glare" />
            </div>
            <div className="crt-deck">
              <span className="crt-grille" />
              <span className="crt-knob crt-knob--gold" />
              <span className="crt-knob crt-knob--pink" />
            </div>
          </div>

          <div className="crt-stand">
            <span />
          </div>
        </div>

        {/* Props washed up beside it. */}
        <div className="prop prop--camera">
          <span className="prop-face" />
          <span className="prop-eye prop-eye--l" />
          <span className="prop-eye prop-eye--r" />
        </div>
        <div className="prop prop--radio">
          <span className="prop-grille" />
          <span className="prop-bar" />
          <span className="prop-dot" />
        </div>
        <span className="pebble pebble--1" />
        <span className="pebble pebble--2" />
        <span className="pebble pebble--3" />
      </div>

      {/* --------------------------------------------------- what is moving */}
      <div className="school">
        {FISH.map((fish) => (
          <div key={fish.key} className={`fish ${fish.className}`}>
            <span style={{ width: fish.px, height: fish.px, boxShadow: fish.shadow }} />
          </div>
        ))}
      </div>

      <div className="bubbles">
        {BUBBLES.map((bubble) => (
          <span
            key={bubble.key}
            style={{
              left: bubble.left,
              width: bubble.px,
              height: bubble.px,
              boxShadow: bubble.shadow,
              animationDuration: bubble.duration,
              animationDelay: bubble.delay,
            }}
          />
        ))}
      </div>

      {/* Scanlines, halftone and the fringe off a worn tape. Tiled patterns
          only, so growing the section re-blits rather than re-computing. */}
      <div className="grain" />
    </div>
  )
}
