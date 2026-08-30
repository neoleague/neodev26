/**
 * Silhouette palm tree, drawn as a single SVG so it scales cleanly and costs
 * nothing to animate. Fronds sway on their own group transform; the trunk
 * leans on a slower cycle so the two never line up and read as one stiff sway.
 */

/** One frond, drawn pointing right from the crown at (0, 0). */
const FROND =
  'M0 0 C 30 -28, 74 -44, 136 -36 C 104 -21, 74 -14, 52 -9 ' +
  'C 88 -8, 116 0, 140 15 C 92 10, 42 10, 0 6 Z'

/** Rotation (deg) and length scale for each frond around the crown. */
const FRONDS = [
  { angle: -80, scale: 0.8 },
  { angle: -52, scale: 0.95 },
  { angle: -24, scale: 1.06 },
  { angle: 4, scale: 1.02 },
  { angle: 32, scale: 0.86 },
  { angle: -116, scale: 0.82 },
  { angle: -146, scale: 0.96 },
  { angle: -176, scale: 1.06 },
  { angle: -206, scale: 0.98 },
  { angle: -234, scale: 0.84 },
]

export default function PalmTree({
  /** Flips the tree so a pair can lean away from each other. */
  flip = false,
  /** Seconds per sway cycle — vary it so neighbouring trees drift apart. */
  sway = 7,
  /** Offsets the sway so two trees with the same period stay out of phase. */
  delay = 0,
  className = '',
  style,
  ...rest
}) {
  return (
    <svg
      className={`palm ${className}`}
      viewBox="0 0 260 420"
      style={{
        '--sway': `${sway}s`,
        '--sway-delay': `${delay}s`,
        transform: flip ? 'scaleX(-1)' : undefined,
        ...style,
      }}
      aria-hidden="true"
      {...rest}
    >
      <g className="palm-lean">
        {/* Trunk: tapers and curves toward the crown at (128, 132). */}
        <path
          className="palm-trunk"
          d="M112 420 C 108 330, 104 250, 118 152 L 140 154 C 132 250, 132 330, 140 420 Z"
        />
        {/* Segment rings, sparser and shorter as the trunk narrows. */}
        <g className="palm-rings">
          <path d="M112 392 q 14 8 28 0" />
          <path d="M110 348 q 14 8 28 0" />
          <path d="M108 302 q 13 7 26 0" />
          <path d="M108 256 q 12 7 24 0" />
          <path d="M110 212 q 11 6 22 0" />
          <path d="M114 174 q 10 6 20 0" />
        </g>

        <g className="palm-crown" transform="translate(128 138)">
          <g className="palm-fronds">
            {FRONDS.map((frond) => (
              <path
                key={frond.angle}
                className="palm-frond"
                d={FROND}
                transform={`rotate(${frond.angle}) scale(${frond.scale})`}
              />
            ))}
            <circle className="palm-nut" cx="-9" cy="9" r="9" />
            <circle className="palm-nut" cx="9" cy="14" r="8" />
            <circle className="palm-nut" cx="1" cy="-3" r="7" />
          </g>
        </g>
      </g>
    </svg>
  )
}
