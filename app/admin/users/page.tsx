import type { Metadata } from 'next';
import { PageHeader } from '@/components/layout/PageShell';
import { UsersAdmin } from '@/components/admin/UsersAdmin';

export const metadata: Metadata = { title: 'People' };

export default function UsersPage() {
  return (
    <>
      <PageHeader title="People" description="Reviewers, LGA ambassadors and institutional partners. Ambassadors get an ID that is stamped on every record they send." />
      <UsersAdmin />
    </>
  );
}
