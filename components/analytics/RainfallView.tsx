'use client';

import useSWR from 'swr';
import { getAllWasteSites } from '@/lib/api';
import { PROXIMITY_NOTICE } from '@/lib/constants';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';

// Port Harcourt. One point stands for the state at this stage. Rainfall differs across the delta.
const POINT = { lat: 4.8156, lng: 7.0498 };
const MONTHS = 12;

const ymd = (d: Date) => d.toISOString().slice(0, 10);

async function loadRainfall(): Promise<{ key: string; mm: number }[]> {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 2); // the archive lags by a day or two
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - (MONTHS - 1), 1));
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${POINT.lat}&longitude=${POINT.lng}&start_date=${ymd(start)}&end_date=${ymd(end)}&daily=precipitation_sum&timezone=Africa%2FLagos`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('The rainfall record could not be loaded.');
  const json = (await res.json()) as { daily?: { time: string[]; precipitation_sum: (number | null)[] } };
  const days = json.daily;
  if (!days) throw new Error('The rainfall record came back empty.');
  const byMonth = new Map<string, number>();
  days.time.forEach((t, i) => byMonth.set(t.slice(0, 7), (byMonth.get(t.slice(0, 7)) ?? 0) + (days.precipitation_sum[i] ?? 0)));
  return Array.from(byMonth.entries()).map(([key, mm]) => ({ key, mm: Math.round(mm) }));
}

const label = (key: string) => new Date(`${key}-01T00:00:00Z`).toLocaleDateString('en-NG', { month: 'short', year: '2-digit', timeZone: 'UTC' });

/** Monthly rainfall beside the number of sites first reported that month. A pattern to look at, never a cause. */
export function RainfallView() {
  const rain = useSWR('rainfall', loadRainfall, { revalidateOnFocus: false });
  const sites = useSWR('rain-sites', () => getAllWasteSites({}), { revalidateOnFocus: false });

  if (rain.error) return <ErrorState message={rain.error.message} onRetry={() => rain.mutate()} />;
  if (!rain.data || !sites.data) return <Skeleton className="h-56 w-full" />;

  const reports = new Map<string, number>();
  for (const s of sites.data) {
    const k = s.firstSeenAt.slice(0, 7);
    reports.set(k, (reports.get(k) ?? 0) + 1);
  }
  const rows = rain.data.map((r) => ({ ...r, n: reports.get(r.key) ?? 0 }));
  const maxMm = Math.max(1, ...rows.map((r) => r.mm));
  const maxN = Math.max(1, ...rows.map((r) => r.n));
  const w = 520;
  const h = 200;
  const bw = w / rows.length;

  return (
    <div>
      <div className="rounded-lg bg-panel p-4">
        <svg viewBox={`0 0 ${w} ${h + 28}`} className="h-auto w-full" role="img" aria-label="Bars show monthly rainfall in millimetres. Dots show sites first reported in each month.">
          {rows.map((r, i) => {
            const bh = (r.mm / maxMm) * h;
            const cy = h - (r.n / maxN) * h;
            return (
              <g key={r.key}>
                <rect x={i * bw + 6} y={h - bh} width={bw - 12} height={bh} rx="3" className="fill-accent" opacity="0.35" />
                <circle cx={i * bw + bw / 2} cy={cy} r="5" className="fill-tier-medium stroke-panel" strokeWidth="2" />
                <text x={i * bw + bw / 2} y={h + 16} textAnchor="middle" className="fill-fg-muted" fontSize="10">{label(r.key)}</text>
              </g>
            );
          })}
          <line x1="0" y1={h} x2={w} y2={h} className="stroke-line-strong" />
        </svg>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-fg-muted">
          <span className="flex items-center gap-2"><span aria-hidden="true" className="h-3 w-3 rounded-sm bg-accent opacity-50" />Rainfall, up to {maxMm} mm a month</span>
          <span className="flex items-center gap-2"><span aria-hidden="true" className="h-3 w-3 rounded-full bg-tier-medium" />Sites first reported, up to {maxN} a month</span>
        </div>
      </div>
      <details className="mt-3 rounded-lg bg-panel p-4 text-sm text-fg-muted">
        <summary className="min-h-11 cursor-pointer font-semibold text-fg">Figures by month</summary>
        <div className="table-wrap mt-2" tabIndex={0}>
          <table className="data-table">
            <caption className="sr-only">Rainfall and newly reported sites by month</caption>
            <thead><tr><th scope="col">Month</th><th scope="col" className="num">Rainfall (mm)</th><th scope="col" className="num">Sites first reported</th></tr></thead>
            <tbody>{rows.map((r) => <tr key={r.key}><td className="primary">{label(r.key)}</td><td className="num">{r.mm}</td><td className="num">{r.n}</td></tr>)}</tbody>
          </table>
        </div>
      </details>
      <p className="mt-3 max-w-prose text-sm text-fg-muted">
        Rainfall is from Open-Meteo for Port Harcourt, as one point for the whole state. A site is counted in the month it was first reported, which depends on when people noticed and sent it, not only on when waste appeared. {PROXIMITY_NOTICE}
      </p>
    </div>
  );
}
