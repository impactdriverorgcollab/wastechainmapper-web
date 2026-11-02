import type { Metadata } from 'next';
import { PageHeader, PageShell } from '@/components/layout/PageShell';
import { ForgotForm } from '@/components/account/EmailForms';

export const metadata: Metadata = { title: 'Forgot your password' };

export default function ForgotPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-sm">
        <PageHeader title="Forgot your password" description="Enter your email address and we will send you a link to choose a new one." />
        <ForgotForm />
      </div>
    </PageShell>
  );
}
