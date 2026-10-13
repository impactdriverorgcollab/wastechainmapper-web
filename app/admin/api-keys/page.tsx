import type { Metadata } from 'next';
import { PageHeader } from '@/components/layout/PageShell';
import { ApiKeys } from '@/components/admin/ApiKeys';

export const metadata: Metadata = { title: 'API keys' };

export default function ApiKeysPage() {
  return (
    <>
      <PageHeader title="API keys" description="Create and revoke keys for partners who use the platform data." />
      <ApiKeys />
    </>
  );
}
