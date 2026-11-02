import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageHeader, PageShell } from '@/components/layout/PageShell';
import { JoinForm } from '@/components/account/AccountForms';

export const metadata: Metadata = {
  title: 'Create an account',
  description: 'Keep a record of the waste you report in Rivers State, and show it in public if you choose.',
};

export default function JoinPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-sm">
        <PageHeader title="Create an account" description="Keep a record of the reports you send. You can still report waste without an account." />
        <Suspense>
          <JoinForm />
        </Suspense>
      </div>
    </PageShell>
  );
}
