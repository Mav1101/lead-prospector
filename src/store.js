import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { searchBusinesses, geocode } from './lib/places'
import { enrich } from './lib/scoring'

export const useStore = create(
  persist(
    (set, get) => ({
      // persisted
      apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
      dark: window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
      leads: {}, // id -> lead
      customCategories: [],
      category: 'Plumbing',
      radiusKm: 3,
      locationText: 'Cebu City, Philippines',
      filters: { noWebsite: false, lowTraffic: false, activeGbp: false, hasPhone: false },
      sort: 'score',

      // transient
      results: [],
      searchCenter: null,
      loading: false,
      error: '',
      selectedId: null,
      tab: 'results',
      toast: '',
      flyTo: null, // { lat, lng, n } — consumed by the map

      set: (patch) => set(patch),
      setFilter: (k, v) => set((s) => ({ filters: { ...s.filters, [k]: v } })),
      notify: (msg) => {
        set({ toast: msg })
        clearTimeout(get()._toastT)
        set({ _toastT: setTimeout(() => set({ toast: '' }), 2500) })
      },

      // Search around a text location, or around explicit coords (geobounding re-search).
      runSearch: async ({ center, label, force } = {}) => {
        const s = get()
        set({ loading: true, error: '', selectedId: null })
        try {
          let c = center
          let text = label ?? s.locationText
          if (!c) {
            const g = await geocode(s.locationText)
            c = { lat: g.lat, lng: g.lng }
            text = g.label
          }
          const { results, cached } = await searchBusinesses({
            center: c, category: s.category, radiusKm: s.radiusKm, force,
          })
          set({
            results, searchCenter: c, locationText: text, loading: false,
            flyTo: { ...c, n: Date.now() },
          })
          get().notify(cached ? `${results.length} results (cached <24h)` : `${results.length} results`)
        } catch (e) {
          set({ loading: false, error: e?.message || 'Search failed' })
        }
      },

      addLead: (b) =>
        set((s) => ({ leads: { ...s.leads, [b.id]: { ...b, savedAt: s.leads[b.id]?.savedAt || Date.now(), tags: s.leads[b.id]?.tags || [] } } })),
      removeLeads: (ids) =>
        set((s) => {
          const leads = { ...s.leads }
          ids.forEach((id) => delete leads[id])
          return { leads }
        }),
      tagLeads: (ids, tag) =>
        set((s) => {
          const leads = { ...s.leads }
          ids.forEach((id) => {
            if (leads[id]) leads[id] = { ...leads[id], tags: [...new Set([...(leads[id].tags || []), tag])] }
          })
          return { leads }
        }),
      // Manual override ("I visited the site, it's weak") re-scores the business.
      setTraffic: (id, traffic) =>
        set((s) => ({
          results: s.results.map((b) => (b.id === id ? enrich({ ...b, trafficOverride: traffic }) : b)),
          leads: s.leads[id] ? { ...s.leads, [id]: { ...s.leads[id], ...enrich({ ...s.leads[id], trafficOverride: traffic }) } } : s.leads,
        })),
      addCategory: (c) =>
        set((s) => (c && !s.customCategories.includes(c) ? { customCategories: [...s.customCategories, c] } : {})),
    }),
    {
      name: 'lp:state',
      partialize: (s) => ({
        apiKey: s.apiKey, dark: s.dark, leads: s.leads, customCategories: s.customCategories,
        category: s.category, radiusKm: s.radiusKm, locationText: s.locationText,
        filters: s.filters, sort: s.sort,
      }),
    },
  ),
)

const trafficRank = { Low: 0, Unknown: 1, Medium: 2, High: 3 }

export function visibleResults(results, filters, sort) {
  const out = results.filter(
    (b) =>
      (!filters.noWebsite || !b.website) &&
      (!filters.lowTraffic || b.traffic === 'Low') &&
      (!filters.activeGbp || b.gbpActive) &&
      (!filters.hasPhone || b.phone),
  )
  const cmp = {
    score: (a, b) => b.score - a.score || a.distanceKm - b.distanceKm,
    distance: (a, b) => a.distanceKm - b.distanceKm,
    updated: (a, b) => (b.lastReviewAt || 0) - (a.lastReviewAt || 0),
    alpha: (a, b) => a.name.localeCompare(b.name),
    traffic: (a, b) => trafficRank[a.traffic] - trafficRank[b.traffic],
  }[sort]
  return [...out].sort(cmp)
}
