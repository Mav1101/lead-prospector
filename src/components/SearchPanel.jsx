import { useState } from 'react'
import { useStore } from '../store'
import { CATEGORIES } from '../lib/places'

const inp =
  'w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-sm'

export default function SearchPanel() {
  const s = useStore()
  const [newCat, setNewCat] = useState('')
  const cats = [...CATEGORIES, ...s.customCategories]
  const submit = (e) => { e.preventDefault(); s.runSearch({ force: false }) }

  const checks = [
    ['noWebsite', 'No Website Only'], ['lowTraffic', 'Low Traffic Only'],
    ['activeGbp', 'Active GBP Only'], ['hasPhone', 'Phone Available'],
  ]

  return (
    <form onSubmit={submit} className="p-3 space-y-2 border-b border-gray-200 dark:border-gray-700">
      <div className="flex gap-2">
        <input className={inp} value={s.locationText} onChange={(e) => s.set({ locationText: e.target.value })}
          placeholder="City, area, province (e.g. Davao City)" aria-label="Location" />
        <button disabled={s.loading}
          className="px-3 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium whitespace-nowrap">
          {s.loading ? 'Searching…' : 'Search'}
        </button>
      </div>
      <div className="flex gap-2">
        <select className={inp} value={s.category} onChange={(e) => s.set({ category: e.target.value })} aria-label="Category">
          {cats.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input className={inp + ' !w-36'} value={newCat} onChange={(e) => setNewCat(e.target.value)}
          placeholder="+ custom"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newCat.trim()) {
              e.preventDefault()
              s.addCategory(newCat.trim()); s.set({ category: newCat.trim() }); setNewCat('')
            }
          }} />
      </div>
      <label className="flex items-center gap-3 text-sm">
        <span className="whitespace-nowrap">Radius: {s.radiusKm} km</span>
        <input type="range" min="1" max="10" step="1" value={s.radiusKm} className="flex-1"
          onChange={(e) => s.set({ radiusKm: +e.target.value })}
          onMouseUp={() => s.searchCenter && s.runSearch({ center: s.searchCenter, label: s.locationText })}
          onTouchEnd={() => s.searchCenter && s.runSearch({ center: s.searchCenter, label: s.locationText })}
          onKeyUp={() => s.searchCenter && s.runSearch({ center: s.searchCenter, label: s.locationText })} />
      </label>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        {checks.map(([k, label]) => (
          <label key={k} className="flex items-center gap-1.5">
            <input type="checkbox" checked={s.filters[k]} onChange={(e) => s.setFilter(k, e.target.checked)} /> {label}
          </label>
        ))}
      </div>
      <select className={inp} value={s.sort} onChange={(e) => s.set({ sort: e.target.value })} aria-label="Sort">
        <option value="score">Sort: Lead quality (high → low)</option>
        <option value="distance">Sort: Distance (nearest)</option>
        <option value="updated">Sort: Last updated (newest)</option>
        <option value="alpha">Sort: Alphabetical</option>
        <option value="traffic">Sort: Traffic (lowest first)</option>
      </select>
      {s.error && <p className="text-sm text-red-500">{s.error}</p>}
    </form>
  )
}
