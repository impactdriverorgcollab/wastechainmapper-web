import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageHeader, PageShell } from '@/components/layout/PageShell';
import { SignInForm } from '@/components/account/AccountForms';

export const metadata: Metadata = { title: 'Sign in' };

export default function SignInPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-sm">
        <PageHeader title="Sign in" description="For public reporters, ambassadors, partners and staff." />
        <Suspense>
          <SignInForm />
        </Suspense>
      </div>
    </PageShell>
  );
}
