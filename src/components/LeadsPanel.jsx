import { useState } from 'react'
import { useStore } from '../store'
import { TIERS } from '../lib/scoring'
import { downloadCsv } from '../lib/csv'
import { saveToSheets, sheetsApiEnabled } from '../lib/sheets'

const btn = 'px-2.5 py-1 rounded-md text-xs font-medium border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
const TAGS = ['Contacted', 'Not Interested', 'Follow up', 'Won']

export default function LeadsPanel() {
  const { leads, removeLeads, tagLeads, notify } = useStore()
  const [sel, setSel] = useState(new Set())
  const list = Object.values(leads).sort((a, b) => b.score - a.score)

  const toggle = (id) => setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const all = list.length > 0 && sel.size === list.length
  const chosen = () => list.filter((l) => sel.has(l.id))

  if (!list.length)
    return <p className="p-6 text-center text-gray-500">No saved leads yet. Hit “Add to Leads” on a business.</p>

  return (
    <div>
      <div className="p-3 flex flex-wrap items-center gap-2 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
        <label className="text-sm flex items-center gap-1.5">
          <input type="checkbox" checked={all} onChange={() => setSel(all ? new Set() : new Set(list.map((l) => l.id)))} />
          {sel.size ? `${sel.size} selected` : 'Select all'}
        </label>
        <button className={btn} onClick={() => downloadCsv(sel.size ? chosen() : list)}>
          Download CSV{sel.size ? ' (selected)' : ' (all)'}
        </button>
        <button className={btn} title={sheetsApiEnabled ? 'Creates a new Google Sheet in your Drive' : 'Copies the data and opens a blank Google Sheet — press Ctrl+V in cell A1'}
          onClick={async () => {
            try {
              const r = await saveToSheets(sel.size ? chosen() : list)
              notify(r.mode === 'api' ? 'Saved to Google Sheets' : 'Copied — paste into A1 of the new sheet (Ctrl+V)')
            } catch (e) { notify(e.message || 'Google Sheets export failed') }
          }}>
          Save to Google Sheets
        </button>
        <select className={btn + ' bg-transparent'} value="" disabled={!sel.size}
          onChange={(e) => { if (e.target.value) { tagLeads([...sel], e.target.value); notify(`Tagged ${sel.size}`) } }}>
          <option value="">Tag selected…</option>
          {TAGS.map((t) => <option key={t}>{t}</option>)}
        </select>
        <button className={btn + ' text-red-600'} disabled={!sel.size}
          onClick={() => { if (confirm(`Delete ${sel.size} lead(s)?`)) { removeLeads([...sel]); setSel(new Set()) } }}>
          Delete
        </button>
      </div>
      {list.map((l) => (
        <div key={l.id} className="p-3 flex gap-2 border-b border-gray-200 dark:border-gray-700 text-sm">
          <input type="checkbox" className="mt-1" checked={sel.has(l.id)} onChange={() => toggle(l.id)} />
          <div className="flex-1 min-w-0">
            <div className="font-semibold">{TIERS[l.tier].emoji} {l.name}</div>
            <div className="text-gray-500 dark:text-gray-400">{l.category} · {l.phone || 'no phone'} · {l.score}/100</div>
            {l.tags?.length > 0 && (
              <div className="mt-1 flex gap-1 flex-wrap">
                {l.tags.map((t) => <span key={t} className="px-1.5 rounded bg-blue-100 dark:bg-blue-900/50 text-xs">{t}</span>)}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
