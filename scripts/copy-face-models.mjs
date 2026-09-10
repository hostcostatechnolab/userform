// Copies the face-api model weights we use into public/models so they can be
// served statically. Runs automatically via the predev / prebuild npm scripts.
import { cp, mkdir, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'node_modules', '@vladmandic', 'face-api', 'model')
const dest = join(root, 'public', 'models')

const NEEDED = [
  'tiny_face_detector_model',
  'face_landmark_68_model',
  'face_recognition_model',
]

if (!existsSync(src)) {
  console.warn('[copy-face-models] source not found, skipping:', src)
  process.exit(0)
}

await mkdir(dest, { recursive: true })
const files = await readdir(src)
let copied = 0
for (const file of files) {
  if (NEEDED.some((n) => file.startsWith(n))) {
    await cp(join(src, file), join(dest, file))
    copied++
  }
}
console.log(`[copy-face-models] copied ${copied} file(s) -> public/models`)
