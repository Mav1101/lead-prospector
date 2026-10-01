export function distanceKm(a, b) {
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// Points approximating a circle (for the "outside radius" mask hole).
export function circlePath(center, radiusKm, steps = 90) {
  const pts = []
  const latR = radiusKm / 111.32
  const lngR = radiusKm / (111.32 * Math.cos((center.lat * Math.PI) / 180))
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * 2 * Math.PI
    pts.push({ lat: center.lat + latR * Math.sin(t), lng: center.lng + lngR * Math.cos(t) })
  }
  return pts
}
