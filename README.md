# wastewatch-web

Public-facing and admin dashboard for WasteWatch — an environmental intelligence platform tracking illegal waste dumping in Rivers State, Nigeria.

Built with Next.js 14 (App Router), Tailwind CSS, and MapLibre GL.

## Pages

| Route | Audience | Purpose |
|-------|----------|---------|
| `/map` | Public | Interactive map of verified dump sites |
| `/analytics` | Public | Charts and aggregate statistics |
| `/flows` | Public | Waste collection flow records |
| `/water` | Public | Water contamination data |
| `/vehicles` | Public | Fleet tracker |
| `/stakeholder` | Public | Data for partner organisations |
| `/admin/login` | Admin | Login |
| `/admin/queue` | Admin | Verification queue — review scraper reports |
| `/admin/sites` | Admin | Manage verified sites |
| `/admin/api-keys` | Admin | Issue and revoke API keys |

## Setup

**1. Clone and install**
```bash
git clone https://github.com/your-org/wastewatch-web
cd wastewatch-web
npm install
```

**2. Environment**
```bash
cp .env.example .env.local
# Fill in NEXT_PUBLIC_API_URL and SESSION_SECRET
```

**3. Run**
```bash
npm run dev     # development (http://localhost:3000)
npm run build   # production build
npm start       # production server
```

The API (`wastewatch-api`) must be running and reachable at `NEXT_PUBLIC_API_URL`.

## Environment variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | URL of the wastewatch-api instance |
| `NEXT_PUBLIC_MAP_STYLE` | MapLibre/Stadia Maps style URL |
| `SESSION_SECRET` | Server-side secret for signing admin sessions |

## Map tiles

The map uses [Stadia Maps](https://stadiamaps.com) for base tiles (free tier available). The style URL is set via `NEXT_PUBLIC_MAP_STYLE`. Dump site overlay data is fetched from the API.
