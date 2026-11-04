import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageHeader, PageShell } from '@/components/layout/PageShell';
import { ConfirmAlerts } from '@/components/alerts/AlertForms';

export const metadata: Metadata = { title: 'Start your alerts', robots: { index: false }, referrer: 'no-referrer' };

export default function ConfirmAlertsPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-sm">
        <PageHeader title="Start your alerts" description="This shows the email address is yours." />
        <Suspense><ConfirmAlerts /></Suspense>
      </div>
    </PageShell>
  );
}
