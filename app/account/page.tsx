import type { Metadata } from 'next';
import { PageShell } from '@/components/layout/PageShell';
import { AccountHome } from '@/components/account/AccountHome';

export const metadata: Metadata = { title: 'My record' };

export default function AccountPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-3xl">
        <AccountHome />
      </div>
    </PageShell>
  );
}
