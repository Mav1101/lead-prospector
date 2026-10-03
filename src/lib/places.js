import { enrich } from './scoring'
import { distanceKm } from './geo'

export const ALL = 'All businesses'

export const CATEGORIES = [
  ALL,
  'Plumbing', 'Salon', 'Hardware Store', 'Restaurant', 'Gym', 'Dental Clinic',
  'Repair Shop', 'Retail', 'Auto Repair', 'Laundry', 'Bakery', 'Clinic', 'Real Estate',
]

const CACHE_KEY = 'lp:searchCache2'
const TTL = 24 * 3600 * 1000

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {} } catch { return {} }
}
function writeCache(c) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)) } catch { /* quota */ }
}

export async function geocode(address) {
  const { results } = await new google.maps.Geocoder().geocode({ address, region: 'PH' })
  if (!results?.length) throw new Error(`Couldn't find "${address}"`)
  const loc = results[0].geometry.location
  return { lat: loc.lat(), lng: loc.lng(), label: results[0].formatted_address }
}

export async function reverseGeocodeName(pos) {
  try {
    const { results } = await new google.maps.Geocoder().geocode({ location: pos })
    const pick = results.find((r) => r.types.includes('locality')) || results[0]
    return pick?.formatted_address?.split(',').slice(0, 2).join(',') || 'this area'
  } catch { return 'this area' }
}

function toBusiness(p, category, center) {
  const lat = p.location.lat(), lng = p.location.lng()
  const reviews = p.reviews || []
  const lastReviewAt = reviews.reduce((m, r) => Math.max(m, r.publishTime ? +r.publishTime : 0), 0) || null
  return {
    id: p.id,
    name: p.displayName,
    category,
    address: p.formattedAddress || '',
    phone: p.nationalPhoneNumber || p.internationalPhoneNumber || '',
    website: p.websiteURI || '',
    rating: p.rating ?? null,
    reviewCount: p.userRatingCount ?? null,
    lastReviewAt,
    description: p.editorialSummary || '',
    googleType: p.primaryTypeDisplayName || '',
    city: (p.addressComponents || []).find((c) => c.types.includes('locality'))?.longText || '',
    internationalPhone: p.internationalPhoneNumber || '',
    hours: p.regularOpeningHours?.weekdayDescriptions || [],
    priceLevel: p.priceLevel || '',
    plusCode: p.plusCode?.globalCode || '',
    photoCount: p.photos?.length || 0,
    topReviews: reviews.slice(0, 3).map((r) => `${r.rating}★ ${(r.text || '').replace(/\s+/g, ' ').slice(0, 200)}`),
    gbpActive: p.businessStatus === 'OPERATIONAL',
    gbpUrl: p.googleMapsURI || `https://www.google.com/maps/place/?q=place_id:${p.id}`,
    lat, lng,
    distanceKm: distanceKm(center, { lat, lng }),
    checkedAt: Date.now(),
  }
}

// Uses the Places API (New): Place.searchByText. Returns up to 20 results.
export async function searchBusinesses({ center, category, radiusKm, force = false }) {
  const key = [center.lat.toFixed(3), center.lng.toFixed(3), category, radiusKm].join('|')
  const cache = readCache()
  if (!force && cache[key] && Date.now() - cache[key].t < TTL) {
    return { results: cache[key].results.map(enrich), cached: true }
  }
  const { Place } = await google.maps.importLibrary('places')
  const fields = [
    'id', 'displayName', 'formattedAddress', 'location', 'nationalPhoneNumber',
    'internationalPhoneNumber', 'websiteURI', 'rating', 'userRatingCount',
    'businessStatus', 'googleMapsURI', 'reviews', 'editorialSummary',
    'primaryTypeDisplayName', 'addressComponents', 'regularOpeningHours', 'priceLevel',
    'plusCode', 'photos',
  ]
  // "All businesses" = nearby search with no type filter; otherwise text search on the category.
  const { places } = category === ALL
    ? await Place.searchNearby({
        fields,
        locationRestriction: { center, radius: radiusKm * 1000 },
        maxResultCount: 20,
      })
    : await Place.searchByText({
        textQuery: category,
        fields,
        locationBias: { center, radius: radiusKm * 1000 },
        region: 'ph',
        maxResultCount: 20,
      })
  const results = places
    .map((p) => toBusiness(p, category, center))
    .filter((b) => b.distanceKm <= radiusKm * 1.1)
  for (const k of Object.keys(cache)) if (Date.now() - cache[k].t > TTL) delete cache[k]
  cache[key] = { t: Date.now(), results }
  writeCache(cache)
  return { results: results.map(enrich), cached: false }
}
