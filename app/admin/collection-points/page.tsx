import type { Metadata } from 'next';
import { PageHeader } from '@/components/layout/PageShell';
import { CollectionPointsAdmin } from '@/components/admin/CollectionPointsAdmin';

export const metadata: Metadata = { title: 'Collection points' };

export default function CollectionPointsPage() {
  return (
    <>
      <PageHeader title="Collection points" description="Authorised and reported collection points, with the operator and schedule where the authority has shared them." />
      <CollectionPointsAdmin />
    </>
  );
}
