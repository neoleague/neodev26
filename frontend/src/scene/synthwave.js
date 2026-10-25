import { DEFAULT_COLORS, renderSun } from './sun.js'

/**
 * The synthwave scene the title screen leads with: a perspective grid floor
 * rushing toward the viewer, a banded sun on the horizon, wireframe ranges
 * flanking the road.
 *
 * Nothing here runs in the browser any more. The hero ships as a baked
 * animated WebP — see `tools/hero-loop.mjs`, which calls `drawScene` frame by
 * frame — because a canvas that repaints a full-viewport scene sixty times a
 * second costs the reader a great deal more than one file does, and the scene
 * never reacts to anything. This module is the source that asset is rendered
 * from, kept beside the site so the loop can be regenerated when the palette
 * or the layout moves.
 *
 * ## What makes the loop seamless
 *
 * Three things move, and the join is only invisible if all three are back
 * where they started after exactly `LOOP_TRAVEL` units of travel:
 *
 * - The floor rows sit at whole depths, so they repeat every 1 unit.
 * - Ridge lines are drawn on every other mountain plane, and the planes sit
 *   `MOUNTAINS.step` apart, so that pattern repeats every `2 * step` units.
 *   `step` is 0.5 for exactly this reason: at the 0.35 this scene used while
 *   it was live, the shortest travel satisfying both was 7 units — about
 *   fourteen seconds of frames, for no visible gain.
 * - The terrain itself, which is noise and does not repeat at all on its own.
 *   `terrainHeight` folds it into a `LOOP_TRAVEL`-long cycle below.
 */

export { DEFAULT_COLORS, renderSun }

/**
 * World units of travel in one loop. Every moving part above divides it.
 *
 * It is the one real trade in the baked scene: short loops are small files,
 * long loops give the mountains room to be different from themselves. Four
 * units is about eight seconds at the title screen's speed, long enough that
 * the ranges have visibly changed by the time it comes round.
 */
export const LOOP_TRAVEL = 4

/**
 * The knobs `drawScene` falls back to, one per option it reads.
 *
 * There is deliberately no `speed` here. This module has no clock — the
 * caller owns `travel` and hands it in already advanced, which is what lets
 * the renderer step it in exact equal slices of a loop. `tools/hero-loop.mjs`
 * keeps its own speed for that sum. A `speed` sitting in this table was left
 * over from when a React component drove the canvas live, and read as an
 * option that does something.
 */
export const DEFAULTS = {
  horizon: 0.7,
  gridDensity: 14,
  sunSize: 0.3,
  lineWidth: 1.6,
  glow: 1,
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
  /**
   * World depth between ridges. Half of them carry a drawn ridge line, so this
   * also sets how often that pattern repeats — see the loop note at the top of
   * the file for why it is exactly 0.5.
   */
  step: 0.5,
  /** Kept in step with `step`, so the range still reaches about the same depth. */
  rows: 40,
  /** Peak height in eye-heights — anything above 1 breaks the horizon. */
  amplitude: 1.5,
  /** How many columns the slope takes to climb from the roadside to full height. */
  ramp: 3,
}

/** How many ridges fit in one loop. The terrain repeats on this stride. */
const RIDGES_PER_LOOP = Math.round(LOOP_TRAVEL / MOUNTAINS.step)

/*
 * Ridge heights, cached by side and ridge index.
 *
 * Every ridge is pinned to a fixed world depth, so the terrain under it never
 * changes — but the mesh is 26 columns across, 40 rows deep and mirrored, so
 * recomputing it each frame is ~2,000 three-octave noise lookups per frame for
 * an answer that was the same last frame.
 *
 * Because the terrain now repeats every `LOOP_TRAVEL`, ridge `i` and ridge
 * `i + RIDGES_PER_LOOP` stand on identical ground — so the key folds by that
 * stride and the cache is a small fixed table rather than something that grows
 * behind the camera and has to be pruned.
 */
const ridgeCache = new Map()

function ridgeHeights(side, index, worldZ, columnAt) {
  const wrapped = ((index % RIDGES_PER_LOOP) + RIDGES_PER_LOOP) % RIDGES_PER_LOOP
  const key = wrapped * 2 + (side > 0 ? 1 : 0)
  let heights = ridgeCache.get(key)
  if (heights) return heights

  heights = new Float64Array(MOUNTAINS.columns)
  for (let j = 0; j < MOUNTAINS.columns; j++) {
    heights[j] = terrainHeight(columnAt(j), worldZ)
  }
  ridgeCache.set(key, heights)
  return heights
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
 * Ridged noise at (x, z) — folding the octaves around their midpoint gives
 * creased peaks rather than rolling dunes.
 */
function ridgedNoise(x, z) {
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
  return Math.pow(sum / norm, 1.4)
}

/**
 * Terrain height at (x, z) in eye-heights, faded to nothing near the road so
 * the floor stays clear.
 *
 * Noise does not repeat, and a hero that comes round every eight seconds needs
 * ground that does. So the depth axis is wrapped into one loop and the result
 * cross-faded with the sample one loop behind it: at the seam the two swap
 * roles exactly, which carries the range continuously across the join instead
 * of snapping to a different set of peaks. The cost is a little less contrast
 * mid-loop, which reads as haze on ranges that are already distant.
 */
function terrainHeight(x, z) {
  const t = ((z % LOOP_TRAVEL) + LOOP_TRAVEL) % LOOP_TRAVEL
  const w = t / LOOP_TRAVEL
  const blend = w * w * (3 - 2 * w)
  const ridged =
    ridgedNoise(x, t) * (1 - blend) + ridgedNoise(x, t - LOOP_TRAVEL) * blend
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
      // Ridge lines on every other plane, so a smaller `step` does not double
      // how busy the wireframe looks. The parity is taken from the absolute
      // plane index, so the drawn lines travel with the terrain instead of
      // flickering between planes.
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
}

/**
 * Paints one frame of the scene.
 *
 * `travel` is the total distance the camera has covered, and everything that
 * moves is derived from it — including the floor's phase, which is just
 * `travel` folded into its one-unit cycle. The caller owns that clock rather
 * than this module, which is what lets the renderer step it in exact equal
 * slices of a loop instead of by however long the last frame happened to take.
 *
 * `sunCache` is an object the caller keeps across frames; the sun is repainted
 * into it only when the size or the palette changes. `createCanvas` is passed
 * through to `renderSun` so this runs outside a browser — see `sun.js`.
 */
export function drawScene(ctx, options) {
  const {
    width,
    height,
    travel,
    colors = DEFAULT_COLORS,
    horizon = DEFAULTS.horizon,
    gridDensity = DEFAULTS.gridDensity,
    sunSize = DEFAULTS.sunSize,
    lineWidth = DEFAULTS.lineWidth,
    glow = DEFAULTS.glow,
    dpr = 1,
    sunCache = {},
    createCanvas,
  } = options
  const c = colors
  const phase = ((travel % 1) + 1) % 1

  ctx.clearRect(0, 0, width, height)

  const horizonY = height * horizon
  const cx = width / 2
  const radius = Math.min(width, height) * sunSize

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
  if (!sunCache.sun || key !== sunCache.key) {
    sunCache.sun = renderSun(radius, c, dpr, createCanvas)
    sunCache.radius = radius
    sunCache.key = key
  }
  const { sun } = sunCache
  const sunCenterY = horizonY - sunCache.radius * 0.73
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
  if (glow > 0) {
    ctx.shadowColor = c.gridGlow
    ctx.shadowBlur = 8 * glow
  }

  // Columns: evenly spaced along the bottom edge, converging on the
  // vanishing point. Extra lines run past the edges so the fan fills the
  // corners.
  const columnGap = width / gridDensity
  const columns = Math.ceil((width * 2.5) / columnGap)
  ctx.lineWidth = Math.max(0.6, lineWidth * 0.7)
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
    ctx.lineWidth = Math.max(0.5, lineWidth / z)
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
    glow,
  })

  // Glow riding the horizon line. Drawn as a wide, flat ellipse centred on
  // the sun so it falls off in every direction — a rectangle would leave
  // hard vertical seams where the gradient stops.
  if (glow > 0) {
    const glowW = radius * 2.8
    const glowH = radius * 0.6 * glow
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
