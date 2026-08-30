import { useEffect, useRef } from 'react'

/**
 * Animated synthwave / retrowave background.
 *
 * A perspective grid floor that scrolls out of the screen toward the viewer,
 * with a banded gradient sun sitting on the horizon. Rendered on a canvas so
 * it stays cheap regardless of how many grid lines are on screen.
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

const DEFAULTS = {
  speed: 1,
  size: { width: '100%', height: '100%' },
  horizon: 0.7,
  gridDensity: 14,
  sunSize: 0.3,
  lineWidth: 1.6,
  glow: 1,
}

function toCssSize(value) {
  return typeof value === 'number' ? `${value}px` : value
}

/** Returns `color` with its alpha multiplied by `factor`, for gradient stops. */
function fadeAlpha(color, factor) {
  const rgb = color.match(/rgba?\(([^)]+)\)/)
  if (rgb) {
    const [r, g, b, a = 1] = rgb[1].split(',').map(Number)
    return `rgba(${r}, ${g}, ${b}, ${a * factor})`
  }
  const hex = color.replace('#', '')
  const full = hex.length === 3 ? hex.replace(/./g, (ch) => ch + ch) : hex
  const n = parseInt(full.slice(0, 6), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${factor})`
}

const MOUNTAINS = {
  /** Distance from the centre line, in grid columns, where the range starts. */
  inner: 3.4,
  /** Where it ends — well past the canvas edge at close range. */
  outer: 14,
  columns: 26,
  /**
   * Depth the mesh is kept alive to. The whole nearest strip — not just its
   * front edge — has to clear the side of the canvas before it is recycled,
   * or dropping it pops a visible band off the bottom corners. At `inner`
   * columns out that means `near + step` must stay under half the grid
   * density, which is what pins these two numbers together.
   */
  near: 0.1,
  /** World depth between ridges. Half of them carry a drawn ridge line. */
  step: 0.35,
  rows: 52,
  /** Peak height in eye-heights — anything above 1 breaks the horizon. */
  amplitude: 1.5,
  /** How many columns the slope takes to climb from the roadside to full height. */
  ramp: 3,
}

/*
 * Ridge heights, cached by side and ridge index.
 *
 * Every ridge is pinned to a fixed world depth, so the terrain under it never
 * changes — but the mesh is 26 columns across, 52 rows deep and mirrored, so
 * recomputing it each frame is ~2,700 three-octave noise lookups per frame for
 * an answer that was the same last frame. Each ridge is sampled once, the
 * first time it appears at the back, and thrown away once it has passed the
 * camera. Same numbers, same mountains — just not computed 60 times a second.
 */
const ridgeCache = new Map()

function ridgeHeights(side, index, worldZ, columnAt) {
  const key = index * 2 + (side > 0 ? 1 : 0)
  let heights = ridgeCache.get(key)
  if (heights) return heights

  heights = new Float64Array(MOUNTAINS.columns)
  for (let j = 0; j < MOUNTAINS.columns; j++) {
    heights[j] = terrainHeight(columnAt(j), worldZ)
  }
  ridgeCache.set(key, heights)
  return heights
}

/** Drops ridges the camera has already passed — they never come back. */
function pruneRidges(first) {
  if (ridgeCache.size <= MOUNTAINS.rows * 4) return
  for (const key of ridgeCache.keys()) {
    if (key >> 1 < first) ridgeCache.delete(key)
  }
}

/** Deterministic hash in [0, 1) — stands in for a seeded random table. */
function hash2(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return n - Math.floor(n)
}

function valueNoise(x, y) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash2(xi, yi)
  const b = hash2(xi + 1, yi)
  const c = hash2(xi, yi + 1)
  const d = hash2(xi + 1, yi + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

/**
 * Terrain height at (x, z) in eye-heights. Ridged noise — folding the octaves
 * around their midpoint gives creased peaks rather than rolling dunes — faded
 * to nothing near the road so the floor stays clear.
 */
function terrainHeight(x, z) {
  let sum = 0
  let amp = 1
  let norm = 0
  let fx = 0.42
  let fz = 0.34
  for (let o = 0; o < 3; o++) {
    sum += amp * (1 - Math.abs(valueNoise(x * fx, z * fz) * 2 - 1))
    norm += amp
    amp *= 0.5
    fx *= 2.1
    fz *= 2.1
  }
  const ridged = Math.pow(sum / norm, 1.4)
  const ramp = Math.min(1, Math.max(0, (Math.abs(x) - MOUNTAINS.inner) / MOUNTAINS.ramp))
  return ridged * ramp * ramp * MOUNTAINS.amplitude
}

/** Mixes two hex colors, `t` running 0 -> `a`, 1 -> `b`. */
function mixHex(a, b, t) {
  const parse = (hex) => {
    const h = hex.replace('#', '')
    const full = h.length === 3 ? h.replace(/./g, (ch) => ch + ch) : h
    const n = parseInt(full.slice(0, 6), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const [r1, g1, b1] = parse(a)
  const [r2, g2, b2] = parse(b)
  const m = (x, y) => Math.round(x + (y - x) * t)
  return `rgb(${m(r1, r2)}, ${m(g1, g2)}, ${m(b1, b2)})`
}

/**
 * Wireframe ranges flanking the road, one mirrored copy per side.
 *
 * Each ridge is pinned to a fixed world depth and sampled there, so the range
 * is rigid: it slides down the screen in perspective exactly like the floor
 * rows rather than rippling in place. Ridges that pass the camera are dropped
 * and new ones appear at the back. Strips are painted far to near onto an
 * opaque face, which is what stops distant ridges showing through the ones in
 * front of them.
 */
function drawMountains(ctx, view) {
  const { height, horizonY, cx, K, columnGap, travel, colors, glow } = view
  const { inner, outer, columns, near, step, rows } = MOUNTAINS
  const far = near + (rows - 1) * step
  // Index of the first ridge still in front of the camera. Ridges live at
  // fixed multiples of `step` in world space, so this is what recycles them.
  const first = Math.ceil((travel + near) / step)

  ctx.save()
  ctx.lineJoin = 'round'
  ctx.lineWidth = 1.1
  ctx.strokeStyle = colors.mountain
  if (glow > 0) {
    ctx.shadowColor = colors.mountainGlow
    ctx.shadowBlur = 5 * glow
  }

  for (const side of [-1, 1]) {
    /** World x of column `j` on this side of the road. */
    const columnAt = (j) => side * (inner + (outer - inner) * (j / (columns - 1)))

    // Built back to front, so the painter's pass below can walk it in order.
    const grid = []
    for (let i = rows - 1; i >= 0; i--) {
      const worldZ = (first + i) * step
      const z = worldZ - travel
      const scale = 1 / z
      const index = first + i
      const row = {
        index,
        fog: Math.min(1, Math.max(0, (far - z) / (far - 2))),
        points: [],
      }
      const heights = ridgeHeights(side, index, worldZ, columnAt)
      for (let j = 0; j < columns; j++) {
        row.points.push({
          x: cx + columnAt(j) * columnGap * scale,
          y: horizonY + K * (1 - heights[j]) * scale,
        })
      }
      grid.push(row)
    }

    for (let i = 0; i < rows - 1; i++) {
      const back = grid[i]
      const front = grid[i + 1]

      // Opaque face for this strip, tinted toward the haze with distance.
      ctx.save()
      ctx.shadowBlur = 0
      ctx.beginPath()
      back.points.forEach((p, j) => (j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
      for (let j = front.points.length - 1; j >= 0; j--) {
        ctx.lineTo(front.points[j].x, front.points[j].y)
      }
      ctx.closePath()
      ctx.fillStyle = mixHex(colors.haze, colors.mountainFill, front.fog)
      ctx.fill()
      ctx.restore()

      ctx.globalAlpha = 0.12 + 0.62 * front.fog
      ctx.beginPath()
      // Ridge lines on every other plane, so halving `step` to keep the mesh
      // alive longer does not double how busy the wireframe looks. The parity
      // is taken from the absolute plane index, so the drawn lines travel with
      // the terrain instead of flickering between planes.
      if (front.index % 2 === 0) {
        front.points.forEach((p, j) => (j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
      }
      // Seams running back into the screen, on every strip.
      for (let j = 0; j < columns; j++) {
        ctx.moveTo(back.points[j].x, back.points[j].y)
        ctx.lineTo(front.points[j].x, front.points[j].y)
      }
      ctx.stroke()
    }

    // Curtain hanging off the nearest ridge down past the bottom edge. The
    // strips only cover the surface itself, so without this the floor shows
    // through underneath the closest slopes.
    const nearest = grid[grid.length - 1].points
    ctx.save()
    ctx.shadowBlur = 0
    ctx.globalAlpha = 1
    ctx.beginPath()
    nearest.forEach((p, j) => (j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
    ctx.lineTo(nearest[nearest.length - 1].x, height + 10)
    ctx.lineTo(nearest[0].x, height + 10)
    ctx.closePath()
    ctx.fillStyle = colors.mountainFill
    ctx.fill()
    ctx.restore()

    ctx.globalAlpha = 1
    ctx.beginPath()
    nearest.forEach((p, j) => (j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
    ctx.stroke()
  }

  ctx.globalAlpha = 1
  ctx.restore()
  pruneRidges(first)
}

/**
 * Paints the sun once onto an offscreen canvas. The sun never moves, so this
 * only re-runs on resize or when the colors change.
 */
export function renderSun(radius, colors, dpr) {
  const rim = radius * 1.05
  const size = Math.ceil(rim * 2)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(size * dpr))
  canvas.height = Math.max(1, Math.ceil(size * dpr))

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

export default function SynthwaveBackground({
  /** Multiplier on how fast the floor rushes toward the viewer. */
  speed = DEFAULTS.speed,
  /** Partial override of the palette above. */
  colors: colorOverrides,
  /** `{ width, height }` — numbers are px, strings pass through as CSS. */
  size,
  /** Horizon position as a fraction of height (0 = top, 1 = bottom). */
  horizon = DEFAULTS.horizon,
  /** Roughly how many grid columns span the canvas at the bottom edge. */
  gridDensity = DEFAULTS.gridDensity,
  /** Sun radius as a fraction of the smaller canvas dimension. */
  sunSize = DEFAULTS.sunSize,
  /** Base grid stroke width in px (lines taper with distance). */
  lineWidth = DEFAULTS.lineWidth,
  /** Neon bloom strength, 0 disables it. */
  glow = DEFAULTS.glow,
  /**
   * Selector for the element this canvas is the background of. The canvas is
   * fixed to the viewport, so it is never off screen itself — but once the
   * page has scrolled past this element the sections below paint over it and
   * nothing it draws can be seen. While that is true the loop stops entirely
   * rather than animating a hidden scene. Omit it and the canvas always runs.
   */
  visibleWhile,
  className,
  style,
  ...rest
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  // Live prop mirror so the animation loop never has to be torn down.
  const propsRef = useRef(null)
  propsRef.current = {
    speed,
    colors: { ...DEFAULT_COLORS, ...colorOverrides },
    horizon,
    gridDensity,
    sunSize,
    lineWidth,
    glow,
    visibleWhile,
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    const ctx = canvas.getContext('2d')

    let width = 0
    let height = 0
    let dpr = 1
    let sun = null
    let sunRadius = 0
    let sunKey = ''
    let phase = 0
    // Total distance travelled. The mountains are pinned to absolute world
    // depths, so this must not wrap — a wrap would jump the terrain.
    let travel = 0
    let last = performance.now()
    let frame = 0

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    const resize = () => {
      const rect = container.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = Math.max(1, Math.round(rect.width))
      height = Math.max(1, Math.round(rect.height))
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      sun = null
    }

    const draw = (now) => {
      /*
       * Under reduced motion nothing on the canvas moves, so one frame is the
       * whole animation — it is repainted on resize instead of 60 times a
       * second. `run` puts the loop back if the setting changes.
       */
      frame = reduceMotion.matches ? 0 : requestAnimationFrame(draw)

      const p = propsRef.current
      const c = p.colors
      const delta = Math.min((now - last) / 1000, 0.1)
      last = now
      if (!reduceMotion.matches) {
        // One unit of phase == one grid row passing the viewer.
        const step = delta * p.speed * 0.55
        phase = (phase + step) % 1
        travel += step
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)

      const horizonY = height * p.horizon
      const cx = width / 2
      const radius = Math.min(width, height) * p.sunSize

      // Sky.
      const sky = ctx.createLinearGradient(0, 0, 0, horizonY)
      sky.addColorStop(0, c.skyTop)
      sky.addColorStop(1, c.skyBottom)
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, width, horizonY)

      // Ground.
      ctx.fillStyle = c.ground
      ctx.fillRect(0, horizonY, width, height - horizonY)

      // Sun, cached until size or palette changes.
      const key = `${radius}|${dpr}|${c.sun.join()}|${c.sunRim}`
      if (!sun || key !== sunKey) {
        sun = renderSun(radius, c, dpr)
        sunRadius = radius
        sunKey = key
      }
      const sunCenterY = horizonY - sunRadius * 0.73
      ctx.drawImage(
        sun.canvas,
        cx - sun.size / 2,
        sunCenterY - sun.size / 2,
        sun.size,
        sun.size,
      )

      // Knock back the part of the disc that dips below the horizon so it
      // reads as glow spilling onto the floor rather than a solid circle.
      ctx.globalAlpha = 0.6
      ctx.fillStyle = c.ground
      ctx.fillRect(0, horizonY, width, height - horizonY)
      ctx.globalAlpha = 1

      // Grid.
      const depth = height - horizonY
      // y(z) = horizonY + K / z, with z = 1 landing exactly on the bottom edge.
      const K = depth
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, horizonY, width, depth)
      ctx.clip()
      ctx.strokeStyle = c.grid
      ctx.lineCap = 'butt'
      if (p.glow > 0) {
        ctx.shadowColor = c.gridGlow
        ctx.shadowBlur = 8 * p.glow
      }

      // Columns: evenly spaced along the bottom edge, converging on the
      // vanishing point. Extra lines run past the edges so the fan fills the
      // corners.
      const columnGap = width / p.gridDensity
      const columns = Math.ceil((width * 2.5) / columnGap)
      ctx.lineWidth = Math.max(0.6, p.lineWidth * 0.7)
      ctx.beginPath()
      for (let j = -columns; j <= columns; j++) {
        const xBottom = cx + j * columnGap
        ctx.moveTo(cx, horizonY)
        ctx.lineTo(xBottom, height)
      }
      ctx.stroke()

      // Rows: fixed positions in depth, shifted by `phase` so they sweep down
      // and off the bottom of the screen.
      for (let i = 0; i < 220; i++) {
        const z = i + 1 - phase
        if (z <= 0) continue
        const y = horizonY + K / z
        if (y > height) continue
        if (y - horizonY < 0.4) break
        ctx.globalAlpha = Math.min(1, 0.25 + 1.4 / z)
        ctx.lineWidth = Math.max(0.5, p.lineWidth / z)
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      ctx.restore()

      // Haze fading the grid into the horizon.
      const haze = ctx.createLinearGradient(0, horizonY, 0, horizonY + depth * 0.45)
      haze.addColorStop(0, c.haze)
      haze.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.globalAlpha = 0.85
      ctx.fillStyle = haze
      ctx.fillRect(0, horizonY, width, depth * 0.45)
      ctx.globalAlpha = 1

      // Mountains last of the scene geometry: they stand in front of both the
      // floor and the sun.
      drawMountains(ctx, {
        height,
        horizonY,
        cx,
        K,
        columnGap,
        travel,
        colors: c,
        glow: p.glow,
      })

      // Glow riding the horizon line. Drawn as a wide, flat ellipse centred on
      // the sun so it falls off in every direction — a rectangle would leave
      // hard vertical seams where the gradient stops.
      if (p.glow > 0) {
        const glowW = radius * 2.8
        const glowH = radius * 0.6 * p.glow
        ctx.save()
        ctx.translate(cx, horizonY)
        ctx.scale(glowW, glowH)
        const bloom = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
        bloom.addColorStop(0, c.horizonGlow)
        bloom.addColorStop(0.4, fadeAlpha(c.horizonGlow, 0.5))
        bloom.addColorStop(0.7, fadeAlpha(c.horizonGlow, 0.15))
        bloom.addColorStop(1, fadeAlpha(c.horizonGlow, 0))
        ctx.fillStyle = bloom
        ctx.fillRect(-1, -1, 2, 2)
        ctx.restore()
      }
    }

    /*
     * The loop only runs while the scene can actually be seen. Starting resets
     * the clock, so no time accumulates while it is stopped and the floor
     * picks up exactly where it left off rather than jumping forward by however
     * long the reader spent further down the page.
     */
    let running = false

    const run = () => {
      if (running) return
      running = true
      last = performance.now()
      frame = requestAnimationFrame(draw)
    }

    const halt = () => {
      running = false
      cancelAnimationFrame(frame)
      frame = 0
    }

    /* A resize is a repaint even when the loop is stopped. */
    const onResize = () => {
      resize()
      if (!running || !frame) draw(performance.now())
    }

    resize()
    const observer = new ResizeObserver(onResize)
    observer.observe(container)

    /*
     * Nothing this canvas paints is visible once the page has scrolled past
     * the section it sits behind — the sections below it are opaque — so the
     * loop stops there and starts again on the way back up.
     */
    const watched =
      propsRef.current.visibleWhile &&
      document.querySelector(propsRef.current.visibleWhile)

    const seen = watched
      ? new IntersectionObserver(
          ([entry]) => (entry.isIntersecting ? run() : halt()),
          /* Generous margin: back on well before any of it can be seen. */
          { rootMargin: '250px' },
        )
      : null

    if (seen) seen.observe(watched)
    else run()

    /* Reduced motion is a setting, not a constant — pick the loop back up. */
    const onMotionChange = () => {
      if (!reduceMotion.matches && running && !frame) {
        last = performance.now()
        frame = requestAnimationFrame(draw)
      } else {
        draw(performance.now())
      }
    }
    reduceMotion.addEventListener('change', onMotionChange)

    return () => {
      halt()
      observer.disconnect()
      seen?.disconnect()
      reduceMotion.removeEventListener('change', onMotionChange)
    }
  }, [])

  const { width, height } = { ...DEFAULTS.size, ...size }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: toCssSize(width),
        height: toCssSize(height),
        overflow: 'hidden',
        lineHeight: 0,
        ...style,
      }}
      aria-hidden="true"
      {...rest}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  )
}
