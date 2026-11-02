import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageHeader, PageShell } from '@/components/layout/PageShell';
import { ResetForm } from '@/components/account/EmailForms';

export const metadata: Metadata = { title: 'Choose a new password', robots: { index: false }, referrer: 'no-referrer' };

export default function ResetPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-sm">
        <PageHeader title="Choose a new password" />
        <Suspense>
          <ResetForm />
        </Suspense>
      </div>
    </PageShell>
  );
}
