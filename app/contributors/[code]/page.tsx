import type { Metadata } from 'next';
import { PageShell } from '@/components/layout/PageShell';
import { ContributorRecord } from '@/components/account/ContributorRecord';

export const metadata: Metadata = {
  title: 'Contributor record',
  description: 'Waste reports by this person that a WasteChainMapper reviewer has checked.',
};

export default function ContributorPage({ params }: { params: { code: string } }) {
  return (
    <PageShell>
      <div className="mx-auto max-w-3xl">
        <ContributorRecord code={params.code} />
      </div>
    </PageShell>
  );
}
