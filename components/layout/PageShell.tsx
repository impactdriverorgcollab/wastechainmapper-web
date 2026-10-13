import Link from 'next/link';
import type { ReactNode } from 'react';
import { SiteHeader } from './SiteHeader';

/** Header, one content column and a footer. Used by every page except the full-screen map. */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader>
        <Link href="/admin" className="btn-ghost">Admin</Link>
      </SiteHeader>
      <main id="main" className="page py-6 sm:py-8">{children}</main>
      <footer className="page">
        <p className="border-t border-line py-6 text-sm text-fg-muted">
          Sites found in the news appear as unconfirmed until a reviewer checks them.
          Place names and positions come from{' '}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            OpenStreetMap contributors<span className="sr-only"> (opens in a new tab)</span>
          </a>. Water points come from the{' '}
          <a
            href="https://www.waterpointdata.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            Water Point Data Exchange<span className="sr-only"> (opens in a new tab)</span>
          </a>{' '}
          (CC BY-SA), surveyed in 2015 and 2018, so a point may have changed since.
        </p>
      </footer>
    </>
  );
}

export function PageHeader({
  title, description, actions,
}: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold text-fg sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 max-w-prose text-base text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
    </div>
  );
}
