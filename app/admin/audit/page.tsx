import type { Metadata } from 'next';
import { PageHeader } from '@/components/layout/PageShell';
import { AuditLog } from '@/components/admin/AuditLog';

export const metadata: Metadata = { title: 'Audit log' };

export default function AuditPage() {
  return (
    <>
      <PageHeader title="Audit log" description="Who changed what, and when." />
      <AuditLog />
    </>
  );
}
