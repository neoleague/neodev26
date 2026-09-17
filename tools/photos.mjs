/*
 * Derives the photographs the site ships from the camera originals.
 *
 *   node tools/photos.mjs
 *
 * `src/assets/<year>/*.JPG` are the masters: straight off the camera.
 * Nothing imports them, so Vite never builds or serves them — they are kept
 * only as the source these files are cut from. What the components import is
 * the `.webp` written beside each one here.
 *
 * Two things shrink a picture, and the second is the one that matters:
 *
 *  - WebP rather than JPEG, worth roughly a third on its own.
 *  - Each picture is resized to the frame it is shown in. Every slot on this
 *    site has a fixed `aspect-ratio` and a width bounded by its grid column, so
 *    the largest each is ever painted is knowable — the width below is twice
 *    that, which is all a 2x display can use and not a pixel more. The sponsor
 *    page's shots sit three-to-a-row in a narrow column and were being served
 *    at nearly seven times the size they are drawn at.
 *
 * The crop to the slot's ratio is baked in too. `scale=...:increase` then
 * `crop` is exactly what `object-fit: cover` was doing at runtime, from the
 * centre, so it changes nothing on screen and saves carrying pixels that were
 * only ever cut off.
 */
import { spawn } from 'node:child_process'
import { stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ffmpeg from 'ffmpeg-static'

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../src/assets')

/** `[master, published, width, the slot's aspect ratio]`, both paths under `src/assets`. */
const JOBS = [
  // About — the filled polaroids. `.photo--one` spans 5 of 12 columns in a
  // 1240px container, `.photo--four` spans 6.
  ['2024/2024-3.jpg', '2024/2024-3.webp', 900, 4 / 3],
  ['2024/2024-4.jpg', '2024/2024-4.webp', 1100, 16 / 9],
  /*
   * `.photo--two` and `.photo--three` span 3 of 12, which is narrower — but
   * below the 980px breakpoint every polaroid goes full width up to a
   * `max-width` of 460px, and that is the widest either is ever painted.
   */
  // 2025-1's master is only 720x540, so a square crop out of it tops out at
  // 540 — short of the 920 the slot would take, and the most there is.
  ['2025/2025-1.jpeg', '2025/2025-1.webp', 540, 1],
  ['2025/2025-2.jpeg', '2025/2025-2.webp', 920, 3 / 4],
  // Sponsor — `.year-shots`, three across. Widest at the 900px breakpoint,
  // where the row goes full width, not on a large screen.
  ['2024/2024-1.JPG', '2024/2024-1.webp', 560, 4 / 3],
  ['2024/2024-2.JPG', '2024/2024-2.webp', 560, 4 / 3],
  ['2025/2025-3.jpeg', '2025/2025-3.webp', 560, 4 / 3],
  ['2025/2025-4.jpeg', '2025/2025-4.webp', 560, 4 / 3],
  /*
   * Sponsor — `.sponsor-hero-photo`. Half the 1080px column on a wide screen,
   * but at the 720px breakpoint the pitch and the print stack and it goes full
   * width, which is where it is biggest. Its master is 1600x1000, so the 4:3
   * crop at this width has ten pixels of headroom and no more.
   */
  ['2024/2024-5.jpg', '2024/2024-5.webp', 1320, 4 / 3],
]

const run = (args) =>
  new Promise((done, fail) => {
    const child = spawn(ffmpeg, ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' })
    child.on('error', fail)
    child.on('exit', (code) => (code === 0 ? done() : fail(new Error(`ffmpeg exited ${code}`))))
  })

const kb = async (path) => Math.round((await stat(path)).size / 1024)

for (const [from, to, width, ratio] of JOBS) {
  const master = resolve(dir, from)
  const published = resolve(dir, to)
  /*
   * Rounded to an even number of rows: WebP encodes 4:2:0 chroma and ffmpeg
   * will quietly take the pixel off itself otherwise. At most half a pixel of
   * the slot's ratio, against a box that crops with `object-fit: cover` — but
   * better stated here than discovered in the output.
   */
  const height = 2 * Math.round(width / ratio / 2)

  await run([
    '-i', master,
    '-vf', `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`,
    '-c:v', 'libwebp',
    '-quality', '82',
    '-frames:v', '1',
    published,
  ])

  console.log(
    `  ${from.padEnd(18)} ${String(await kb(master)).padStart(4)} KB  ->  ` +
      `${to.padEnd(18)} ${String(await kb(published)).padStart(4)} KB  ${width}x${height}`,
  )
}
