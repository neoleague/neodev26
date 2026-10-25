/**
 * The banded sun, and the palette the whole synthwave scene is drawn from.
 *
 * Split out from the rest of the scene because two very different callers want
 * only this much of it: `SunBackdrop` paints the disc on the sponsor page, and
 * the offline renderer in `tools/` bakes it into the title screen's hero loop.
 * Neither should have to pull in the grid and the mountains to get a sun.
 */

/*
 * Exported so a page that wants one piece of this scene can have it without
 * running the whole canvas — the sponsor page paints just the sun with
 * `renderSun` and these colours.
 */
export const DEFAULT_COLORS = {
  /** Sky gradient, top of the canvas down to the horizon. */
  skyTop: '#1b0b38',
  skyBottom: '#2d1055',
  /** Ground beneath the horizon. */
  ground: '#210b3f',
  /** Vertical gradient painted across the sun, top to bottom. */
  sun: ['#ffd166', '#ff9f45', '#ff5f6d', '#f43b8f', '#c13bd6'],
  /** Darker ring drawn behind the sun. */
  sunRim: 'rgba(90, 30, 80, 0.55)',
  /** Grid lines and the glow they cast. */
  grid: '#d17fff',
  gridGlow: 'rgba(209, 127, 255, 0.75)',
  /** Haze that fades the grid out as it approaches the horizon. */
  haze: '#2d1055',
  /** Glow sitting on the horizon line itself. */
  horizonGlow: 'rgba(233, 106, 255, 0.06)',
  /** Wireframe mountains flanking the road. */
  mountain: '#3fd8ff',
  mountainGlow: 'rgba(63, 216, 255, 0.65)',
  /** Opaque face the wireframe sits on, so near ridges hide far ones. */
  mountainFill: '#160a33',
}

/**
 * Makes a canvas of `w` x `h` device pixels.
 *
 * The default reaches for the DOM, which is what the sponsor page wants. The
 * offline renderer has no DOM and passes its own — that one argument is the
 * whole reason this scene's drawing code runs unchanged in Node.
 */
const domCanvas = (w, h) => {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  return canvas
}

/**
 * Paints the sun once onto an offscreen canvas. The sun never moves, so this
 * only re-runs on resize or when the colors change.
 */
export function renderSun(radius, colors, dpr, createCanvas = domCanvas) {
  const rim = radius * 1.05
  const size = Math.ceil(rim * 2)
  const canvas = createCanvas(
    Math.max(1, Math.ceil(size * dpr)),
    Math.max(1, Math.ceil(size * dpr)),
  )

  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  const cx = size / 2
  const cy = size / 2
  const top = cy - radius
  const diameter = radius * 2

  // Darker ring peeking out from behind the disc.
  ctx.beginPath()
  ctx.arc(cx, cy, rim - radius * 0.02, 0, Math.PI * 2)
  ctx.lineWidth = radius * 0.05
  ctx.strokeStyle = colors.sunRim
  ctx.stroke()

  const gradient = ctx.createLinearGradient(0, top, 0, top + diameter)
  const stops = colors.sun
  stops.forEach((color, i) => {
    gradient.addColorStop(stops.length === 1 ? 0 : i / (stops.length - 1), color)
  })

  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.fillStyle = gradient
  ctx.fill()

  // Slice horizontal gaps out of the lower half: cuts thicken and the bands
  // between them thin out toward the bottom.
  ctx.globalCompositeOperation = 'destination-out'
  let y = top + diameter * 0.42
  let cut = diameter * 0.016
  let band = diameter * 0.072
  while (y < top + diameter) {
    ctx.fillRect(0, y, size, cut)
    y += cut + band
    cut *= 1.3
    band *= 0.92
  }
  ctx.globalCompositeOperation = 'source-over'

  return { canvas, size }
}
