/**
 * Browser-only face detection + recognition helpers built on @vladmandic/face-api.
 * Import from client components only.
 */
import type * as FaceApi from '@vladmandic/face-api'

export const MODEL_URL =
  process.env.NEXT_PUBLIC_FACE_MODEL_URL || '/models'

/** Euclidean distance below this = same person. Lower is stricter. */
export const MATCH_THRESHOLD = Number(
  process.env.NEXT_PUBLIC_FACE_MATCH_THRESHOLD || '0.5'
)

export const DESCRIPTOR_LENGTH = 128

/** Guided enrollment poses — one descriptor captured per pose. */
export const ENROLL_POSES = [
  { key: 'front', label: 'Look straight at the camera' },
  { key: 'left', label: 'Turn your head slightly to the left' },
  { key: 'right', label: 'Turn your head slightly to the right' },
  { key: 'up', label: 'Tilt your head up a little' },
  { key: 'down', label: 'Tilt your head down a little' },
] as const

/** Accepts a legacy single descriptor or a multi-sample array; returns samples. */
export function toSamples(stored: unknown): number[][] {
  if (!Array.isArray(stored) || stored.length === 0) return []
  if (Array.isArray(stored[0])) return stored as number[][]
  return [stored as number[]]
}

/** Smallest euclidean distance from `probe` to any enrolled sample. */
export function bestDistance(samples: number[][], probe: number[]): number {
  let best = Infinity
  for (const s of samples) {
    const d = descriptorDistance(s, probe)
    if (d < best) best = d
  }
  return best
}

let faceapi: typeof FaceApi | null = null
let loadPromise: Promise<typeof FaceApi> | null = null

/** Loads face-api and its model weights once; subsequent calls resolve instantly. */
export function loadFaceApi(): Promise<typeof FaceApi> {
  if (loadPromise) return loadPromise
  loadPromise = (async () => {
    const mod = await import('@vladmandic/face-api')

    // face-api registers a 'wasm' backend but we don't ship the .wasm binaries,
    // so pin an explicit backend (GPU first, then CPU) and wait for it to be
    // ready BEFORE loading models or running any inference.
    const tf = mod.tf as unknown as {
      setBackend: (name: string) => Promise<boolean>
      ready: () => Promise<void>
      getBackend: () => string | undefined
    }
    let backendReady = false
    for (const backend of ['webgl', 'cpu']) {
      try {
        const okBackend = await tf.setBackend(backend)
        if (okBackend) {
          await tf.ready()
          backendReady = true
          break
        }
      } catch {
        /* try the next backend */
      }
    }
    if (!backendReady) {
      try {
        await tf.ready()
      } catch {
        /* fall through — inference will surface a clearer error */
      }
    }

    await Promise.all([
      mod.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      mod.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      mod.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ])

    faceapi = mod
    return mod
  })()
  return loadPromise
}

export type FaceInput =
  | HTMLVideoElement
  | HTMLImageElement
  | HTMLCanvasElement

export interface DetectResult {
  descriptor: number[]
  /** detector confidence 0..1 */
  score: number
  box: { x: number; y: number; width: number; height: number }
}

export class NoFaceError extends Error {
  constructor() {
    super('No face detected — center your face and try again.')
    this.name = 'NoFaceError'
  }
}

export class MultipleFacesError extends Error {
  constructor() {
    super('More than one face in view — only you should be on camera.')
    this.name = 'MultipleFacesError'
  }
}

/** Detect exactly one face and return its 128-d descriptor. */
export async function detectSingleDescriptor(
  input: FaceInput
): Promise<DetectResult> {
  const api = faceapi ?? (await loadFaceApi())
  const opts = new api.TinyFaceDetectorOptions({
    inputSize: 320,
    scoreThreshold: 0.5,
  })

  const all = await api
    .detectAllFaces(input, opts)
    .withFaceLandmarks()
    .withFaceDescriptors()

  if (all.length === 0) throw new NoFaceError()
  if (all.length > 1) throw new MultipleFacesError()

  const { detection, descriptor } = all[0]
  const b = detection.box
  return {
    descriptor: Array.from(descriptor),
    score: detection.score,
    box: { x: b.x, y: b.y, width: b.width, height: b.height },
  }
}

/** Euclidean distance between two descriptors. Lower = more similar. */
export function descriptorDistance(a: number[], b: number[]): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i]
    sum += d * d
  }
  return Math.sqrt(sum)
}

export function isMatch(distance: number): boolean {
  return distance <= MATCH_THRESHOLD
}

/** Draw the current video frame to a JPEG blob (max 480px wide). */
export async function captureJpeg(
  video: HTMLVideoElement,
  maxWidth = 480,
  quality = 0.8
): Promise<Blob> {
  const scale = Math.min(1, maxWidth / video.videoWidth)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(video.videoWidth * scale)
  canvas.height = Math.round(video.videoHeight * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Capture failed'))),
      'image/jpeg',
      quality
    )
  )
}
