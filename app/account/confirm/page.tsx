import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageHeader, PageShell } from '@/components/layout/PageShell';
import { ConfirmEmail } from '@/components/account/EmailForms';

export const metadata: Metadata = { title: 'Confirm your email address', robots: { index: false }, referrer: 'no-referrer' };

export default function ConfirmPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-sm">
        <PageHeader title="Confirm your email address" description="This shows the address on your account is really yours." />
        <Suspense>
          <ConfirmEmail />
        </Suspense>
      </div>
    </PageShell>
  );
}
