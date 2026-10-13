# wastewatch-web (WasteChainMapper web app)

Public map and dashboards, plus an admin area for reviewing reports. Built with Next.js 14 (App Router), Tailwind CSS, SWR and MapLibre GL.

## Pages

| Route | Audience | Purpose |
|-------|----------|---------|
| `/map` | Public | Map of dump sites, collection points, facilities, waste routes, water problems and flood-risk zones |
| `/flows` | Public | Waste flow totals and a filterable table |
| `/water` | Public | Water sources, latest readings and open anomalies |
| `/analytics` | Public | Platform totals, share of waste processed by area, tonnage by material |
| `/stakeholder` | Public | Dump site register: filter and download as CSV |
| `/admin/login` | Staff | Sign in |
| `/admin/queue` | Staff | Review queue: corroborate, mark field-verified, or reject reports |
| `/admin/sites` | Staff | Every dump site, with coordinates and a link to the map |
| `/admin/api-keys` | Admins | Create and revoke API keys |

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
npm run build && npm start   # production
```

The API (`wastewatch-api`) must be running at `API_URL`.

### Why the browser calls `/backend` and not the API

Every API data endpoint needs an API key. The website must work for visitors who have none, so the browser calls the website's own server at `/backend/...`. That route adds `WEB_API_KEY` and forwards the request. The key stays on the server. It also applies a light per-visitor limit, so the site cannot be used as a free copy of the API. Staff requests carry their own login token, which is passed on. If `WEB_API_KEY` is missing, public pages show a clear error instead of data.

| Variable | Description |
|----------|-------------|
| `API_URL` | URL of the wastewatch-api instance (server side only) |
| `WEB_API_KEY` | The website's own API key, from `npx ts-node scripts/issue-web-key.ts` in the API repo (server side only) |
| `NEXT_PUBLIC_MAP_STYLE` | MapLibre style URL for the base map (Stadia Maps needs an `api_key`) |

After changing `tailwind.config.ts` or `lib/palette.ts`, restart `npm run dev`.

## How sites get on the map

1. **The scraper finds a story** that names a specific community (for example Rumuokoro). It saves a report and puts the community on the map as an **unconfirmed** site. Several stories about the same place become one site, backed by several reports.
2. Stories it cannot place precisely (only "Port Harcourt", or a place found by a live search) are saved but **not** put on the map by themselves. They appear at the end of the review queue. For a story with no place, a reviewer picks the community it is about ("Which community is it about?") and then approves it. Reports that did get a place are corroborated, field-verified or rejected straight away.
3. **A reviewer** opens the review queue and chooses one of three outcomes:

| Action | Report status | Dump site |
|--------|---------------|-----------|
| Corroborate | Corroborated | The site becomes **corroborated** (created if there was none) |
| Field-verified | Field-verified | The site becomes **field-verified** and active |
| Reject | Rejected | If no other report backs the site, an unconfirmed site is hidden |

Use *Field-verified* only when someone has visited the site or has first-hand evidence. A site's tier is never lowered by a later, weaker report, and a hidden site comes back if a reviewer reopens and confirms its report.

## Design system

- **Tokens** live in `lib/palette.ts` (colour) and `tailwind.config.ts` (type scale, radius, shadow). Components use the Tailwind utilities only. The map reads the same palette for its paint rules.
- **Confidence tiers** are shown by brightness and size as well as colour: unconfirmed is olive and small, corroborated is amber, field-verified is ivory and largest. Red is reserved for errors and danger.
- **Components** are in `components/ui` (button, fields, badge, stat card, skeleton, empty and error states, confirm dialog) and `components/layout`.
- **Every data screen** has loading, empty and error states. Tables that scroll sideways do so inside their own box, which can be reached with the keyboard.
- Contrast was checked against WCAG AA, and every page has been run through axe with no violations at phone, tablet and desktop widths.

## Known limits

- The admin session token is kept in `sessionStorage`, so it ends with the tab. A production setup should use an httpOnly cookie set by the API, which needs an API change.
- The map reads each dataset separately. If one fails, the rest still draw and a banner names what is missing.
- Pins mark the middle of the named community, not the exact spot.
- `jose` is listed in `package.json` but nothing uses it yet.
