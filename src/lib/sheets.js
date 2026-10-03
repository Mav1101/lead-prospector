import { leadsToRows } from './csv'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const SCOPE = 'https://www.googleapis.com/auth/drive.file'

export const sheetsApiEnabled = !!CLIENT_ID

function loadGis() {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  return new Promise((res, rej) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.onload = res
    s.onerror = () => rej(new Error('Could not load Google sign-in'))
    document.head.appendChild(s)
  })
}

async function getToken() {
  await loadGis()
  return new Promise((res, rej) => {
    google.accounts.oauth2
      .initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        callback: (r) => (r.access_token ? res(r.access_token) : rej(new Error(r.error || 'Sign-in cancelled'))),
        error_callback: (e) => rej(new Error(e.message || 'Sign-in cancelled')),
      })
      .requestAccessToken()
  })
}

// Creates a new spreadsheet in the user's Drive and returns its URL.
async function createSheet(rows) {
  const token = await getToken()
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const title = `Leads ${new Date().toISOString().slice(0, 10)}`
  const created = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST', headers,
    body: JSON.stringify({ properties: { title }, sheets: [{ properties: { title: 'Leads', gridProperties: { frozenRowCount: 1 } } }] }),
  })
  if (!created.ok) throw new Error(`Sheets API: ${(await created.json()).error?.message || created.status}`)
  const sheet = await created.json()
  const put = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheet.spreadsheetId}/values/Leads!A1?valueInputOption=RAW`,
    { method: 'PUT', headers, body: JSON.stringify({ values: rows }) },
  )
  if (!put.ok) throw new Error(`Sheets API: ${(await put.json()).error?.message || put.status}`)
  return sheet.spreadsheetUrl
}

const tsvCell = (v) => (/[\t\n\r"]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)

// Without an OAuth client: copy as tab-separated text and open a blank sheet to paste into.
async function clipboardFallback(rows) {
  await navigator.clipboard.writeText(rows.map((r) => r.map(tsvCell).join('\t')).join('\n'))
  window.open('https://sheets.new', '_blank')
}

export async function saveToSheets(leads) {
  const rows = leadsToRows(leads)
  if (!sheetsApiEnabled) {
    await clipboardFallback(rows)
    return { mode: 'clipboard' }
  }
  const url = await createSheet(rows)
  window.open(url, '_blank')
  return { mode: 'api', url }
}
