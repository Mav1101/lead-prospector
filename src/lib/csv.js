const esc = (v) => {
  const s = v == null ? '' : String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function leadsToCsv(leads) {
  const head = ['name', 'category', 'address', 'phone', 'gbp_link', 'website', 'website_status', 'score', 'tags', 'date_saved']
  const rows = leads.map((l) => [
    l.name, l.category, l.address, l.phone, l.gbpUrl, l.website || '',
    l.website ? 'Has website' : 'No website', l.score, (l.tags || []).join('; '),
    l.savedAt ? new Date(l.savedAt).toISOString().slice(0, 10) : '',
  ])
  return [head, ...rows].map((r) => r.map(esc).join(',')).join('\r\n')
}

export function downloadCsv(leads) {
  const blob = new Blob(['\ufeff' + leadsToCsv(leads)], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}
