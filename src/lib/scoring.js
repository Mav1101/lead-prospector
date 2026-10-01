export const TIERS = {
  high: { label: 'High', emoji: '🟢', color: '#10b981', hint: 'No/weak website + active Google listing. Best outreach target.' },
  medium: { label: 'Medium', emoji: '🟡', color: '#f59e0b', hint: 'Has a website but with weak traffic signals.' },
  low: { label: 'Low', emoji: '🔴', color: '#ef4444', hint: 'Already has a solid web presence.' },
}

const RECENT_MS = 90 * 24 * 3600 * 1000

// Heuristic only: derived from review volume + recency, not real traffic data.
export function estimateTraffic(b) {
  if (b.reviewCount == null) return 'Unknown'
  if (b.reviewCount >= 300) return 'High'
  if (b.reviewCount >= 50) return 'Medium'
  return 'Low'
}

export function scoreBusiness(b) {
  let score = 0
  if (b.gbpActive) score += 40
  if (!b.website) score += 30
  else if (b.traffic === 'Low') score += 15
  if (b.phone) score += 10
  if (b.lastReviewAt && Date.now() - b.lastReviewAt < RECENT_MS) score += 5
  return score
}

export function tierOf(score) {
  return score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low'
}

export function enrich(b) {
  const traffic = b.trafficOverride || estimateTraffic(b)
  const withTraffic = { ...b, traffic }
  const score = scoreBusiness(withTraffic)
  return { ...withTraffic, score, tier: tierOf(score) }
}
