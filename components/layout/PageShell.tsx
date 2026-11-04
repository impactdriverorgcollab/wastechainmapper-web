import Link from 'next/link';
import type { ReactNode } from 'react';
import { AccountLink } from '@/components/account/AccountLink';
import { Wordmark } from './Logo';
import { SiteHeader } from './SiteHeader';

const EXT = 'text-accent underline underline-offset-2 hover:text-accent-hover';

/** Header, one content column and a footer. Used by every page except the full-screen map. */
export function PageShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader>
        <Link href="/report" className="btn-primary">Report waste</Link>
        <AccountLink />
      </SiteHeader>
      <main id="main" className={`mx-auto w-full flex-1 px-4 py-6 sm:px-6 sm:py-10 ${wide ? 'max-w-7xl' : 'max-w-6xl'}`}>{children}</main>
      <footer className="border-t border-line bg-panel">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
              <Wordmark />
              <p className="text-sm text-fg-muted">A shared record of waste in Rivers State.</p>
            </div>
            <nav aria-label="Footer">
              <ul className="flex flex-wrap gap-x-5 text-sm">
                {[['/map', 'Map'], ['/hotspots', 'Hotspots'], ['/report', 'Report waste'], ['/leaderboard', 'Leaderboard'], ['/alerts', 'Email alerts'], ['/about', 'How the data works'], ['/developers', 'API']].map(([href, label]) => (
                  <li key={href}><Link href={href} className="inline-flex min-h-11 items-center text-fg-muted hover:text-fg">{label}</Link></li>
                ))}
              </ul>
            </nav>
          </div>
          <p className="mt-4 max-w-4xl border-t border-line pt-4 text-xs text-fg-subtle">
            Sites found in the news or sent by the public appear as reported until a reviewer checks them. Sizes and weights are estimates, and each says how it was made.
            Places, rivers, drains, schools and clinics come from{' '}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className={EXT}>OpenStreetMap contributors<span className="sr-only"> (opens in a new tab)</span></a>.
            Water points come from the{' '}
            <a href="https://www.waterpointdata.org" target="_blank" rel="noopener noreferrer" className={EXT}>Water Point Data Exchange<span className="sr-only"> (opens in a new tab)</span></a>{' '}
            (CC BY-SA), surveyed in 2015 and 2018, so a point may have changed since.
          </p>
        </div>
      </footer>
    </div>
  );
}

export function PageHeader({
  title, description, actions,
}: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-fg sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 max-w-prose text-base text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
    </div>
  );
}
