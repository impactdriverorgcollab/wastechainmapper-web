import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageShell';
import { AdminSites } from '@/components/admin/AdminSites';

export const metadata: Metadata = { title: 'Sites' };

export default function AdminSitesPage() {
  return (
    <>
      <PageHeader
        title="Sites"
        description="Every dump site in the database, including coordinates."
        actions={<Link href="/map" className="btn-secondary">View on map</Link>}
      />
      <AdminSites />
    </>
  );
}
