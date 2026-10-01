import { useEffect, useMemo, useRef, useCallback } from 'react'
import { GoogleMap, MarkerF, CircleF, PolygonF } from '@react-google-maps/api'
import { useStore, visibleResults } from '../store'
import { TIERS } from '../lib/scoring'
import { circlePath, distanceKm } from '../lib/geo'
import { reverseGeocodeName } from '../lib/places'

const WORLD = [
  { lat: 85, lng: -180 }, { lat: 85, lng: 0 }, { lat: 85, lng: 180 },
  { lat: -85, lng: 180 }, { lat: -85, lng: 0 }, { lat: -85, lng: -180 },
]
const PROMPT_KM = 5
const DEBOUNCE_MS = 2000

const darkStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1f2937' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#111827' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0b1220' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#374151' }] },
]

const pin = (color, selected) => ({
  path: google.maps.SymbolPath.CIRCLE,
  fillColor: color,
  fillOpacity: 1,
  strokeColor: '#fff',
  strokeWeight: selected ? 3 : 1.5,
  scale: selected ? 12 : 8,
})

export default function MapView({ onMoveAway }) {
  const { results, filters, sort, searchCenter, radiusKm, selectedId, dark, flyTo, loading } = useStore()
  const map = useRef(null)
  const timer = useRef(null)
  const programmatic = useRef(false)
  const declinedAt = useRef(null)
  const visible = useMemo(() => visibleResults(results, filters, sort), [results, filters, sort])

  const mask = useMemo(
    () => (searchCenter ? [WORLD, circlePath(searchCenter, radiusKm)] : null),
    [searchCenter, radiusKm],
  )

  const moveTo = useCallback((pos, zoom) => {
    if (!map.current) return
    programmatic.current = true
    map.current.panTo(pos)
    if (zoom) map.current.setZoom(zoom)
  }, [])

  useEffect(() => {
    if (flyTo) {
      declinedAt.current = null
      moveTo(flyTo, radiusKm > 5 ? 12 : radiusKm > 2 ? 13 : 14)
    }
  }, [flyTo]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const b = results.find((r) => r.id === selectedId)
    if (b) moveTo({ lat: b.lat, lng: b.lng })
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  // "idle" fires once a pan/zoom settles; we then wait 2s more before prompting.
  const onIdle = () => {
    clearTimeout(timer.current)
    if (programmatic.current) { programmatic.current = false; return }
    if (!searchCenter || !map.current) return
    timer.current = setTimeout(async () => {
      const c = map.current.getCenter()
      const pos = { lat: c.lat(), lng: c.lng() }
      if (distanceKm(searchCenter, pos) <= PROMPT_KM) return
      if (declinedAt.current && distanceKm(declinedAt.current, pos) <= PROMPT_KM) return
      const name = await reverseGeocodeName(pos)
      onMoveAway(pos, name, () => { declinedAt.current = pos })
    }, DEBOUNCE_MS)
  }

  const searchHere = async () => {
    const c = map.current.getCenter()
    const pos = { lat: c.lat(), lng: c.lng() }
    const label = await reverseGeocodeName(pos)
    useStore.getState().runSearch({ center: pos, label })
  }

  return (
    <>
    <button
      onClick={searchHere}
      disabled={loading}
      className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full shadow bg-white dark:bg-gray-800 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-60"
    >
      {loading ? 'Searching…' : '🔍 Search here'}
    </button>
    <GoogleMap
      mapContainerClassName="w-full h-full"
      center={searchCenter || { lat: 10.3157, lng: 123.8854 }}
      zoom={13}
      onLoad={(m) => (map.current = m)}
      onIdle={onIdle}
      options={{ streetViewControl: false, fullscreenControl: false, mapTypeControl: false, styles: dark ? darkStyle : null }}
    >
      {searchCenter && (
        <>
          <CircleF
            center={searchCenter}
            radius={radiusKm * 1000}
            options={{ strokeColor: '#3b82f6', strokeOpacity: 0.9, strokeWeight: 2, fillOpacity: 0, clickable: false }}
          />
          <PolygonF
            paths={mask}
            options={{ fillColor: '#000', fillOpacity: dark ? 0.45 : 0.22, strokeWeight: 0, clickable: false }}
          />
        </>
      )}
      {visible.map((b) => (
        <MarkerF
          key={b.id}
          position={{ lat: b.lat, lng: b.lng }}
          title={b.name}
          icon={pin(TIERS[b.tier].color, b.id === selectedId)}
          zIndex={b.id === selectedId ? 999 : b.score}
          onClick={() => useStore.setState({ selectedId: b.id, tab: 'results' })}
        />
      ))}
    </GoogleMap>
    </>
  )
}
