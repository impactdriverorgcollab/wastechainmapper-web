import type { Metadata } from 'next';
import { PageHeader } from '@/components/layout/PageShell';
import { SourcesAdmin } from '@/components/admin/SourcesAdmin';

export const metadata: Metadata = { title: 'Sources' };

export default function SourcesPage() {
  return (
    <>
      <PageHeader title="Sources" description="Where records come from and what each source allows. Public records are treated as reported observations, never as confirmed sites." />
      <SourcesAdmin />
    </>
  );
}
