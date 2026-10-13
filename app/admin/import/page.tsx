import type { Metadata } from 'next';
import { PageHeader } from '@/components/layout/PageShell';
import { ImportData } from '@/components/admin/ImportData';

export const metadata: Metadata = { title: 'Import data' };

export default function ImportPage() {
  return (
    <>
      <PageHeader
        title="Import data"
        description="Add facilities, tonnage records and water readings that partners send as spreadsheets."
      />
      <ImportData />
    </>
  );
}
