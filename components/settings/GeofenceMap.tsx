'use client'

import { useEffect, useRef } from 'react'
import { loadLeaflet } from '@/lib/leaflet'

interface Props {
  lat: number | null
  lng: number | null
  radiusM: number
  onPick: (lat: number, lng: number) => void
}

/** Interactive map: click / drag the marker to set the geofence centre. */
export function GeofenceMap({ lat, lng, radiusM, onPick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const circleRef = useRef<any>(null)
  const onPickRef = useRef(onPick)
  onPickRef.current = onPick

  // init once
  useEffect(() => {
    let cancelled = false
    loadLeaflet().then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return
      const start: [number, number] =
        lat != null && lng != null ? [lat, lng] : [20.5937, 78.9629] // India centroid
      const map = L.map(containerRef.current).setView(start, lat != null ? 16 : 4)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map)

      const place = (la: number, ln: number) => {
        if (!markerRef.current) {
          markerRef.current = L.marker([la, ln], { draggable: true }).addTo(map)
          markerRef.current.on('dragend', () => {
            const p = markerRef.current.getLatLng()
            onPickRef.current(p.lat, p.lng)
          })
          circleRef.current = L.circle([la, ln], {
            radius: radiusM,
            color: '#4f46e5',
            fillColor: '#6366f1',
            fillOpacity: 0.15,
          }).addTo(map)
        } else {
          markerRef.current.setLatLng([la, ln])
          circleRef.current.setLatLng([la, ln])
        }
      }

      if (lat != null && lng != null) place(lat, lng)

      map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
        place(e.latlng.lat, e.latlng.lng)
        onPickRef.current(e.latlng.lat, e.latlng.lng)
      })

      mapRef.current = map
      setTimeout(() => map.invalidateSize(), 100)
    })
    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      markerRef.current = null
      circleRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // keep circle radius / marker position in sync with props
  useEffect(() => {
    if (circleRef.current) circleRef.current.setRadius(radiusM)
  }, [radiusM])

  useEffect(() => {
    if (lat == null || lng == null || !mapRef.current) return
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng])
      circleRef.current?.setLatLng([lat, lng])
      mapRef.current.setView([lat, lng], Math.max(mapRef.current.getZoom(), 15))
    }
  }, [lat, lng])

  return (
    <div
      ref={containerRef}
      className="h-72 w-full overflow-hidden rounded-xl border border-zinc-200"
    />
  )
}
