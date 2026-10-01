# Lead Prospector

A map + list tool for finding local businesses (Philippines focus) that make good WordPress/SEO leads: active on Google Maps but with no website or a weak web presence.

Built with React, Vite, Tailwind CSS, Zustand and the Google Maps Platform. No backend; everything is stored in your browser.

## Features

- Interactive map with color-coded pins: green (high lead score), yellow (medium), red (low)
- Search by location and category (custom categories supported, plus "All businesses")
- Radius slider (1-10 km) with a ring on the map and the outside area dimmed
- "Search here" button to search from wherever the map is centered
- Prompt to re-search when you pan more than 5 km away (after a 2 s pause)
- Filters: no website, low traffic, active GBP, phone available; five sort options
- Lead score (0-100): active GBP +40, no website +30, weak site +15, phone +10, recent review +5
- Leads list saved to localStorage with bulk tagging, delete and CSV export
- Dark mode, tooltips, keyboard shortcuts (`Ctrl+S` save selected, `Ctrl+E` export CSV, `Ctrl+L` toggle leads)
- Search results cached for 24 hours to save API quota

## Setup

1. In Google Cloud, create a project, attach billing, and enable **Maps JavaScript API**, **Places API (New)** and **Geocoding API**.
2. Create an API key. Restrict it to HTTP referrers (`http://localhost:5173/*` plus your deployed domain) and to those three APIs. Set a budget alert.
3. Install and run:

   ```bash
   npm install
   npm run dev
   ```

4. Provide the key either by pasting it into the app on first load (stored in localStorage), or by copying `.env.example` to `.env` and setting `VITE_GOOGLE_MAPS_API_KEY`.

Build for production with `npm run build`.

## How the data is derived

- **Website / phone / rating / status** come from the Google Places listing.
- **Traffic** is a rough estimate from review count only (under 50 = Low, 300+ = High), not real traffic data. You can override it per business after visiting the site.
- **Active GBP** means Google reports the business as `OPERATIONAL`.
- Each search returns at most 20 places (a Places API limit).

## License

[MIT](LICENSE)
