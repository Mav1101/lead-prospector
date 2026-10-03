// Everything needed to brief a website build for a business.
const COLUMNS = [
  ['name', (l) => l.name],
  ['category', (l) => l.category],
  ['google_category', (l) => l.googleType],
  ['description', (l) => l.description],
  ['address', (l) => l.address],
  ['city', (l) => l.city],
  ['phone', (l) => l.phone],
  ['phone_international', (l) => l.internationalPhone],
  ['website', (l) => l.website || ''],
  ['website_status', (l) => (l.website ? 'Has website' : 'No website')],
  ['gbp_link', (l) => l.gbpUrl],
  ['gbp_active', (l) => (l.gbpActive ? 'Yes' : 'No')],
  ['rating', (l) => l.rating],
  ['review_count', (l) => l.reviewCount],
  ['top_reviews', (l) => (l.topReviews || []).join(' | ')],
  ['opening_hours', (l) => (l.hours || []).join(' | ')],
  ['price_level', (l) => (l.priceLevel || '').replace('PRICE_LEVEL_', '')],
  ['photo_count', (l) => l.photoCount],
  ['latitude', (l) => l.lat],
  ['longitude', (l) => l.lng],
  ['plus_code', (l) => l.plusCode],
  ['est_traffic', (l) => l.traffic],
  ['lead_score', (l) => l.score],
  ['lead_tier', (l) => l.tier],
  ['tags', (l) => (l.tags || []).join('; ')],
  ['date_saved', (l) => (l.savedAt ? new Date(l.savedAt).toISOString().slice(0, 10) : '')],
]

export function leadsToRows(leads) {
  const clean = (v) => (v == null ? '' : String(v))
  return [COLUMNS.map(([h]) => h), ...leads.map((l) => COLUMNS.map(([, f]) => clean(f(l))))]
}

const esc = (v) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)

export function leadsToCsv(leads) {
  return leadsToRows(leads).map((r) => r.map(esc).join(',')).join('\r\n')
}

export function downloadCsv(leads) {
  const blob = new Blob(['\ufeff' + leadsToCsv(leads)], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}
