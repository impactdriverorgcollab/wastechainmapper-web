import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageHeader, PageShell } from '@/components/layout/PageShell';
import { Unsubscribe } from '@/components/alerts/AlertForms';

export const metadata: Metadata = { title: 'Stop your alerts', robots: { index: false }, referrer: 'no-referrer' };

export default function UnsubscribePage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-sm">
        <PageHeader title="Stop your alerts" description="Your address will be removed straight away." />
        <Suspense><Unsubscribe /></Suspense>
      </div>
    </PageShell>
  );
}
