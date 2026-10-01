import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { TIERS } from '../lib/scoring'

export function Tip({ text, children }) {
  return <span title={text} className="cursor-help">{children}</span>
}

const btn =
  'px-2.5 py-1 rounded-md text-xs font-medium border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition'

export default function BusinessCard({ b }) {
  const { selectedId, leads, addLead, notify, setTraffic } = useStore()
  const [saved, setSaved] = useState(false)
  const ref = useRef(null)
  const selected = selectedId === b.id
  const tier = TIERS[b.tier]
  const inLeads = !!leads[b.id]

  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selected])

  const save = () => {
    addLead(b)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText([b.name, b.phone].filter(Boolean).join(' — '))
      notify('Contact copied')
    } catch { notify('Copy failed') }
  }

  const updated = b.checkedAt && new Date(b.checkedAt).toDateString() === new Date().toDateString()
    ? 'Updated today' : `Checked ${new Date(b.checkedAt).toLocaleDateString()}`

  return (
    <div
      ref={ref}
      onClick={() => useStore.setState({ selectedId: b.id })}
      className={`p-3 border-b border-gray-200 dark:border-gray-700 cursor-pointer ${
        selected ? 'bg-blue-50 dark:bg-blue-950/40 ring-2 ring-inset ring-blue-500' : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold leading-tight">
          <Tip text={`${tier.label} lead (${b.score}/100): ${tier.hint}`}>{tier.emoji}</Tip> {b.name}
        </h3>
        <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400 shrink-0">{b.score}/100 · {b.distanceKm.toFixed(1)} km</span>
      </div>
      <div className="mt-1 text-sm space-y-0.5 text-gray-600 dark:text-gray-300">
        <div>📍 {b.address}</div>
        <div>☎️ {b.phone || <span className="text-gray-400">No phone listed</span>}</div>
        <div className="flex flex-wrap gap-x-3">
          <Tip text="Website field from the Google listing. No website = best SEO/WordPress lead.">
            {b.website ? '✅ Has website' : '❌ No website'}
          </Tip>
          <Tip text="Estimated from review volume only — not real traffic data. Override below after visiting the site.">
            📉 Traffic: {b.traffic}
          </Tip>
          <Tip text="Google reports this business as OPERATIONAL (has a Google Business Profile).">
            {b.gbpActive ? '🔵 Active GBP' : '⚪ GBP not active'}
          </Tip>
        </div>
        <div className="text-xs text-gray-400">
          {b.rating ? `⭐ ${b.rating} (${b.reviewCount} reviews) · ` : ''}{updated}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
        <a className={btn} href={b.gbpUrl} target="_blank" rel="noreferrer">View GBP</a>
        {b.website && <a className={btn} href={b.website} target="_blank" rel="noreferrer">Visit Website</a>}
        <button className={`${btn} ${saved || inLeads ? 'bg-green-100 dark:bg-green-900/40 border-green-500' : ''}`} onClick={save}>
          {saved ? '✓ Saved' : inLeads ? '✓ In leads' : 'Add to Leads'}
        </button>
        <button className={btn} onClick={copy}>Copy Contact</button>
        {b.website && (
          <select
            className={btn + ' bg-transparent'}
            value={b.trafficOverride || ''}
            onChange={(e) => setTraffic(b.id, e.target.value || undefined)}
            title="Manually mark the site's traffic after visiting it"
          >
            <option value="">Traffic: auto</option>
            <option value="Low">Mark low</option>
            <option value="Medium">Mark medium</option>
            <option value="High">Mark high</option>
          </select>
        )}
      </div>
    </div>
  )
}
