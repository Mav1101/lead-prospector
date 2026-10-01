import { useEffect, useMemo, useState } from 'react'
import { useJsApiLoader } from '@react-google-maps/api'
import { useStore, visibleResults } from './store'
import MapView from './components/MapView'
import SearchPanel from './components/SearchPanel'
import BusinessCard from './components/BusinessCard'
import LeadsPanel from './components/LeadsPanel'
import { downloadCsv } from './lib/csv'

const LIBS = ['places']

function KeyGate() {
  const [v, setV] = useState('')
  return (
    <div className="h-full grid place-items-center p-6">
      <div className="max-w-md w-full space-y-3">
        <h1 className="text-xl font-bold">Lead Prospector</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Paste a Google Maps API key with <b>Maps JavaScript</b>, <b>Places API (New)</b> and <b>Geocoding</b> enabled.
          It’s stored only in this browser’s localStorage. Restrict it to your domain in Google Cloud.
        </p>
        <input className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2"
          placeholder="AIza…" value={v} onChange={(e) => setV(e.target.value.trim())} />
        <button disabled={!v} onClick={() => useStore.setState({ apiKey: v })}
          className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50">Save key</button>
      </div>
    </div>
  )
}

function Prospector({ apiKey }) {
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: apiKey, libraries: LIBS })
  const s = useStore()
  const [move, setMove] = useState(null) // { pos, name, decline }
  const visible = useMemo(() => visibleResults(s.results, s.filters, s.sort), [s.results, s.filters, s.sort])
  const leadCount = Object.keys(s.leads).length

  useEffect(() => { if (isLoaded && !s.results.length && !s.searchCenter) s.runSearch() }, [isLoaded]) // eslint-disable-line

  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const k = e.key.toLowerCase()
      const st = useStore.getState()
      if (k === 's') {
        e.preventDefault()
        const b = st.results.find((r) => r.id === st.selectedId)
        if (b) { st.addLead(b); st.notify(`Saved ${b.name}`) } else st.notify('Select a business first')
      } else if (k === 'e') {
        e.preventDefault()
        const all = Object.values(st.leads)
        all.length ? downloadCsv(all) : st.notify('No leads to export')
      } else if (k === 'l') {
        e.preventDefault()
        st.set({ tab: st.tab === 'leads' ? 'results' : 'leads' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (loadError) return <p className="p-6 text-red-500">Google Maps failed to load. Check your API key and enabled APIs.</p>
  if (!isLoaded) return <Spinner label="Loading map…" />

  const tabBtn = (t, label) => (
    <button onClick={() => s.set({ tab: t })}
      className={`flex-1 py-2 text-sm font-medium border-b-2 ${s.tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>
      {label}
    </button>
  )

  return (
    <div className="h-full flex flex-col md:flex-row">
      <div className="relative h-[45%] md:h-full md:w-[70%]">
        <MapView onMoveAway={(pos, name, decline) => setMove({ pos, name, decline })} />
        <button onClick={() => s.set({ dark: !s.dark })} title="Toggle dark mode"
          className="absolute top-3 right-3 z-10 px-3 py-1.5 rounded-full shadow bg-white dark:bg-gray-800 text-sm">
          {s.dark ? '☀️ Light' : '🌙 Dark'}
        </button>
        {s.loading && (
          <div className="absolute top-0 inset-x-0 h-1 bg-blue-200 overflow-hidden">
            <div className="h-full w-1/3 bg-blue-600 animate-[slide_1s_linear_infinite]" />
          </div>
        )}
      </div>

      <aside className="flex-1 md:flex-none md:w-[30%] min-h-0 flex flex-col bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {tabBtn('results', `Results (${visible.length})`)}
          {tabBtn('leads', `Leads (${leadCount})`)}
        </div>
        <div className="flex-1 overflow-y-auto">
          {s.tab === 'results' ? (
            <>
              <SearchPanel />
              {s.loading ? <Spinner label="Searching…" /> : visible.length ? (
                visible.map((b) => <BusinessCard key={b.id} b={b} />)
              ) : (
                <p className="p-6 text-center text-gray-500">No leads found. Try adjusting filters or search location.</p>
              )}
            </>
          ) : <LeadsPanel />}
        </div>
        <div className="px-3 py-1 text-[11px] text-gray-400 border-t border-gray-200 dark:border-gray-700">
          Ctrl+S save selected · Ctrl+E export CSV · Ctrl+L leads panel
        </div>
      </aside>

      {move && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-5 max-w-sm w-full shadow-xl space-y-4">
            <p className="font-medium">Search for leads in {move.name}?</p>
            <div className="flex justify-end gap-2">
              <button className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600"
                onClick={() => { move.decline(); setMove(null) }}>Keep current results</button>
              <button className="px-3 py-1.5 rounded-md bg-blue-600 text-white"
                onClick={() => { s.runSearch({ center: move.pos, label: move.name }); setMove(null) }}>Search here</button>
            </div>
          </div>
        </div>
      )}

      {s.toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-gray-900 text-white text-sm shadow-lg">{s.toast}</div>
      )}
    </div>
  )
}

function Spinner({ label }) {
  return (
    <div className="p-8 flex flex-col items-center gap-2 text-gray-500">
      <div className="h-8 w-8 rounded-full border-4 border-gray-300 border-t-blue-600 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

export default function App() {
  const apiKey = useStore((s) => s.apiKey)
  const dark = useStore((s) => s.dark)
  useEffect(() => { document.documentElement.classList.toggle('dark', dark) }, [dark])
  return apiKey ? <Prospector apiKey={apiKey} /> : <KeyGate />
}
