/**
 * A bubble, drawn on an eight by eight grid the way a sprite would be.
 *
 * `crispEdges` turns off anti-aliasing, so scaling one up gives hard square
 * pixels rather than a smooth ring — which is the point. The ring takes
 * `currentColor`; only the glint is fixed.
 */

/* The ring: four across the top and bottom, stepping out to the full width. */
const RING =
  'M2 0h4v1H2z M1 1h1v1H1z M6 1h1v1H6z ' +
  'M0 2h1v4H0z M7 2h1v4H7z ' +
  'M1 6h1v1H1z M6 6h1v1H6z M2 7h4v1H2z'

export default function PixelBubble({ className = '', ...rest }) {
  return (
    <svg
      className={`pixel-bubble ${className}`}
      viewBox="0 0 8 8"
      shapeRendering="crispEdges"
      aria-hidden="true"
      {...rest}
    >
      <path d={RING} fill="currentColor" fillOpacity="0.7" />
      <path d="M2 2h2v1H2z M2 3h1v1H2z" fill="#fff" fillOpacity="0.85" />
    </svg>
  )
}
