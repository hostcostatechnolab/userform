'use client'

// Loads Leaflet from cdnjs once (CSS + JS) and returns the global `L`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LeafletGlobal = any

const VERSION = '1.9.4'
const BASE = `https://cdnjs.cloudflare.com/ajax/libs/leaflet/${VERSION}`

let promise: Promise<LeafletGlobal> | null = null

export function loadLeaflet(): Promise<LeafletGlobal> {
  if (promise) return promise
  promise = new Promise<LeafletGlobal>((resolve, reject) => {
    const w = window as unknown as { L?: LeafletGlobal }
    if (w.L) return resolve(w.L)

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = `${BASE}/leaflet.min.css`
      document.head.appendChild(link)
    }

    const script = document.createElement('script')
    script.src = `${BASE}/leaflet.min.js`
    script.async = true
    script.onload = () => {
      const L = (window as unknown as { L: LeafletGlobal }).L
      // CDN marker images (bundler path fix isn't needed since we're on CDN)
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: `${BASE}/images/marker-icon-2x.png`,
        iconUrl: `${BASE}/images/marker-icon.png`,
        shadowUrl: `${BASE}/images/marker-shadow.png`,
      })
      resolve(L)
    }
    script.onerror = () => reject(new Error('Failed to load map library'))
    document.body.appendChild(script)
  })
  return promise
}
