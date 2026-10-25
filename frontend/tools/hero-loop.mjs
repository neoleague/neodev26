/*
 * Bakes the title screen's hero background into a seamless loop.
 *
 *   node tools/hero-loop.mjs            # render frames, then encode
 *   node tools/hero-loop.mjs --frames   # render frames only, keep them
 *
 * The frames come from `src/scene/synthwave.js` — the same drawing code the
 * background used when it was a live canvas, so the baked loop is the scene
 * itself rather than an impression of it.
 *
 * Why a file and not a canvas: the scene takes no input and reacts to nothing,
 * so every frame it painted was a frame it could have painted once. A
 * full-viewport canvas at 60fps is real battery on a laptop and a visible cost
 * on a phone.
 *
 * Why a video and not an image: this was first built to write an animated
 * WebP, and the answer came back at 9.3 MB. Animated WebP has no motion
 * compensation worth the name — it diffs rectangles — and in this scene the
 * grid, the floor and both mountain ranges move across the whole frame every
 * frame, so there is no rectangle to diff and each frame costs close to a full
 * still. VP9 does predict motion, and the same 162 frames come out at 1.6 MB.
 * The measured spread, if it is ever worth revisiting:
 *
 *   animated WebP  1600x900 q70  9.2 MB   1024x576 q40  3.0 MB
 *   VP9            1600x900 crf34 1.9 MB  crf36  1.6 MB   crf40  1.2 MB
 */
import { createCanvas } from '@napi-rs/canvas'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ffmpeg from 'ffmpeg-static'
import { drawScene, LOOP_TRAVEL } from '../src/scene/synthwave.js'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const assets = resolve(root, 'src/assets')

/*
 * The scene as the title screen asks for it. This is the only place these live
 * now — they used to be props on the background component in App.jsx. The
 * horizon especially: the wordmark is positioned against it, so moving it here
 * without looking at App.css will shift the scene under the title.
 */
const SCENE = {
  speed: 0.9,
  horizon: 0.58,
  sunSize: 0.3,
}

/*
 * Rendered size. 16:9 at 1600 wide: the loop is a `cover` background, so this
 * is not a layout dimension, only how much detail survives on a wide display.
 * The grid lines are the only thing that really wants the resolution — the
 * rest of the scene is soft gradients.
 */
const WIDTH = 1600
const HEIGHT = 900

/*
 * 20 frames a second. The floor is a slow drift rather than fast motion, and
 * dropping from 30 to 20 is a third off the file for no judder worth seeing.
 */
const FPS = 20

/**
 * Quality, as VP9's constant-rate factor — lower is better and larger. 36 is
 * the point where the grid lines stop picking up mosquito noise around them,
 * which is the first thing to go wrong in a scene made of thin bright strokes.
 */
const CRF = 36

/** Seconds a loop takes: the world distance covered, over the speed it moves. */
const DURATION = LOOP_TRAVEL / (SCENE.speed * 0.55)
const FRAMES = Math.round(DURATION * FPS)

const frameDir = resolve(root, 'tools/.hero-frames')

async function render() {
  await rm(frameDir, { recursive: true, force: true })
  await mkdir(frameDir, { recursive: true })

  const canvas = createCanvas(WIDTH, HEIGHT)
  const ctx = canvas.getContext('2d')
  const sunCache = {}

  for (let i = 0; i < FRAMES; i++) {
    /*
     * Stepped by exact fractions of the loop rather than by elapsed time. The
     * last frame lands one step short of `LOOP_TRAVEL`, so the frame after it
     * is frame zero again — which is the whole point.
     */
    const travel = (LOOP_TRAVEL * i) / FRAMES

    drawScene(ctx, {
      ...SCENE,
      width: WIDTH,
      height: HEIGHT,
      travel,
      /* Kept across frames, or the sun is repainted once per frame. */
      sunCache,
      createCanvas,
    })

    const name = String(i).padStart(4, '0')
    await writeFile(resolve(frameDir, `${name}.png`), await canvas.encode('png'))
    if (i % 20 === 0) process.stdout.write(`  ${i}/${FRAMES}\r`)
  }

  console.log(
    `rendered ${FRAMES} frames  ${WIDTH}x${HEIGHT}  ` +
      `${DURATION.toFixed(2)}s @ ${FPS}fps`,
  )
}

function run(args) {
  return new Promise((done, fail) => {
    const child = spawn(ffmpeg, ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' })
    child.on('error', fail)
    child.on('exit', (code) => (code === 0 ? done() : fail(new Error(`ffmpeg exited ${code}`))))
  })
}

async function encode() {
  const input = ['-framerate', String(FPS), '-i', resolve(frameDir, '%04d.png')]

  await run([
    ...input,
    '-c:v', 'libvpx-vp9',
    '-crf', String(CRF),
    /* Constant quality: a bitrate of 0 is what puts -crf in charge. */
    '-b:v', '0',
    '-deadline', 'good',
    '-cpu-used', '1',
    '-row-mt', '1',
    '-tile-columns', '2',
    /* Chroma subsampling every decoder will take. */
    '-pix_fmt', 'yuv420p',
    '-an',
    resolve(assets, 'hero-loop.webm'),
  ])

  /*
   * Frame zero on its own, as the video's poster. It is what a reader sees
   * before the loop has loaded, and it is the whole of what they see if they
   * have asked for no motion — see HeroBackdrop.jsx, which then simply never
   * starts playback.
   */
  await run([
    '-i', resolve(frameDir, '0000.png'),
    '-frames:v', '1',
    '-c:v', 'libwebp',
    '-quality', '86',
    resolve(assets, 'hero-still.webp'),
  ])
}

await render()
if (!process.argv.includes('--frames')) {
  await encode()
  console.log('encoded  src/assets/hero-loop.webm  +  hero-still.webp')
}
