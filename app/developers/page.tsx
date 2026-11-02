import type { Metadata } from 'next';
import { PageHeader, PageShell } from '@/components/layout/PageShell';

export const metadata: Metadata = {
  title: 'API',
  description: 'A documented, versioned REST API for waste sites, observations, hotspots and collection points in Rivers State.',
};

const ENDPOINTS: [string, string, string][] = [
  ['GET', '/api/v1/waste-sites', 'Mapped waste locations. Filter by lga, ward, bbox, from, to, category, verification, source, setting, risk, minVolume, maxVolume.'],
  ['GET', '/api/v1/waste-sites/{id}', 'One site with its observations, verification history, sources, approved photos and collection history.'],
  ['GET', '/api/v1/waste-observations', 'Time-stamped observations. Every estimate has its basis, method, confidence and time.'],
  ['GET', '/api/v1/collection-points', 'Collection points, marked official or not and checked or not.'],
  ['GET', '/api/v1/hotspots', 'Calculated groups of sites, ranked for attention.'],
  ['GET', '/api/v1/analytics', 'Approved summary statistics.'],
  ['POST', '/api/v1/reports', 'Submit a new observation. It enters the review queue as unverified.'],
];

const SAMPLE_REQUEST = `curl "https://YOUR-API-ADDRESS/api/v1/waste-sites?lga=Obio-Akpor&verification=FIELD_VERIFIED&limit=20" \\
  -H "X-API-Key: YOUR_KEY"`;

const SAMPLE_RESPONSE = `{
  "data": [{
    "id": "c4642d4c-b56a-42c1-940d-a1f0314a4e7b",
    "latitude": 4.8901, "longitude": 6.9001,
    "verification": "FIELD_VERIFIED",
    "category": "PLASTIC", "setting": "DRAIN", "risk": "elevated",
    "lga": "Obio-Akpor", "communityName": "Choba",
    "lastObservedAt": "2026-10-31T07:10:47.000Z",
    "latestObservation": {
      "volumeM3": 4,
      "provenance": { "volume": {
        "basis": "FIELD_ESTIMATE",
        "method": "Length times width times height, halved for the shape of a heap",
        "confidence": "LOW", "at": "2026-10-31T07:10:47.275Z" } }
    }
  }],
  "meta": { "page": 1, "limit": 20, "total": 1, "view": "public" }
}`;

const SAMPLE_POST = `curl -X POST "https://YOUR-API-ADDRESS/api/v1/reports" \\
  -H "X-API-Key: YOUR_KEY" -H "Content-Type: application/json" \\
  -d '{ "setting": "DRAIN", "latitude": 4.8901, "longitude": 6.9001,
        "description": "Plastic bottles blocking the drain", "consentToUse": true }'`;

function Code({ children, label }: { children: string; label: string }) {
  return (
    <pre tabIndex={0} aria-label={label} className="overflow-x-auto rounded-lg bg-panel p-4 font-mono text-xs leading-5 text-fg">{children}</pre>
  );
}

export default function DevelopersPage() {
  return (
    <PageShell>
      <div className="max-w-3xl">
        <PageHeader title="API" description="A documented, versioned REST API. The website uses the same records." />

        <section aria-labelledby="access" className="mt-2 space-y-3">
          <h2 id="access" className="text-lg font-semibold text-fg">Access</h2>
          <p className="text-base text-fg-muted">
            Every request needs an API key in the <span className="font-mono text-sm text-fg">X-API-Key</span> header. Keys are issued by the platform administrators, with a daily limit by tier.
            Public keys return approved information only. Partner keys, issued under a data-sharing agreement, also return records that are awaiting review, marked as such.
            Reporter names and contact details are never returned.
          </p>
          <p className="text-base text-fg-muted">
            The full, testable reference is the OpenAPI (Swagger) page at <span className="font-mono text-sm text-fg">/api/docs</span> on the API address.
            Paths are shown there relative to <span className="font-mono text-sm text-fg">/api/v1</span>. Lists are paged with <span className="font-mono text-sm text-fg">page</span> and <span className="font-mono text-sm text-fg">limit</span> and return <span className="font-mono text-sm text-fg">data</span> and <span className="font-mono text-sm text-fg">meta</span>.
          </p>
        </section>

        <section aria-labelledby="endpoints" className="mt-8">
          <h2 id="endpoints" className="mb-3 text-lg font-semibold text-fg">Main endpoints</h2>
          <div className="table-wrap" tabIndex={0}>
            <table className="data-table">
              <caption className="sr-only">API endpoints</caption>
              <thead><tr><th scope="col">Method</th><th scope="col">Path</th><th scope="col">What it returns</th></tr></thead>
              <tbody>
                {ENDPOINTS.map(([m, p, d]) => (
                  <tr key={p}>
                    <td className="font-mono text-xs">{m}</td>
                    <td className="font-mono text-xs text-fg">{p}</td>
                    <td className="min-w-64">{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-sm text-fg-muted">Also: spatial questions under /spatial, journeys under /journeys, and CSV or GeoJSON downloads under /export.</p>
        </section>

        <section aria-labelledby="samples" className="mt-8 space-y-3">
          <h2 id="samples" className="text-lg font-semibold text-fg">Examples</h2>
          <Code label="Example request">{SAMPLE_REQUEST}</Code>
          <Code label="Example response">{SAMPLE_RESPONSE}</Code>
          <p className="text-sm text-fg-muted">Submitting returns an id and an upload token. Send each photo to POST /reports/&#123;id&#125;/evidence with the token in the X-Upload-Token header.</p>
          <Code label="Example submission">{SAMPLE_POST}</Code>
        </section>

        <section aria-labelledby="provenance" className="mt-8 space-y-3">
          <h2 id="provenance" className="text-lg font-semibold text-fg">Reading provenance</h2>
          <p className="text-base text-fg-muted">
            Each estimate has a <span className="font-mono text-sm text-fg">basis</span>: MEASURED, OFFICIAL, FIELD_ESTIMATE or AI_PREDICTION, a <span className="font-mono text-sm text-fg">method</span>,
            a <span className="font-mono text-sm text-fg">confidence</span> and a time. Do not treat a FIELD_ESTIMATE or AI_PREDICTION as a measurement. Records carry a
            <span className="font-mono text-sm text-fg"> verification</span> of UNVERIFIED, CORROBORATED or FIELD_VERIFIED. Spatial figures show association, not cause.
          </p>
        </section>
      </div>
    </PageShell>
  );
}
