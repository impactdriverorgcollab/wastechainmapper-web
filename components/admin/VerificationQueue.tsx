'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getVerificationQueue, verifyReport } from '@/lib/api';
import type { Report } from '@/lib/types';
import { ReportCard } from './ReportCard';

export function VerificationQueue() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const getToken = () => {
    if (typeof window === 'undefined') return null;
    const token = sessionStorage.getItem('ww_token');
    if (!token) { router.push('/admin/login'); return null; }
    return token;
  };

  useEffect(() => {
    let mounted = true;
    const token = getToken();
    if (!token) return;

    getVerificationQueue(token)
      .then((data) => { if (mounted) setReports(data); })
      .catch((e) => {
        if (!mounted) return;
        if (e.message?.includes('401') || e.message?.includes('Unauthorized')) {
          router.push('/admin/login');
        } else {
          setError(e.message);
        }
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [router]);

  async function handleVerify(id: string, status: 'FIELD_VERIFIED' | 'REJECTED') {
    const token = getToken();
    if (!token) return;

    setActionLoading(id);
    try {
      await verifyReport(id, status, undefined, token);
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return <p className="text-xs text-text-dim">Loading queue…</p>;
  }

  if (error) {
    return <p className="text-xs text-tier-high">{error}</p>;
  }

  if (reports.length === 0) {
    return (
      <div className="border border-border bg-surface-1 px-4 py-8 text-center text-xs text-text-dim">
        No reports pending review.
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-text-dim mb-3">
        {reports.length} report{reports.length !== 1 ? 's' : ''} pending
      </p>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <ReportCard
            key={report.id}
            report={report}
            loading={actionLoading === report.id}
            onApprove={(id) => handleVerify(id, 'FIELD_VERIFIED')}
            onReject={(id) => handleVerify(id, 'REJECTED')}
          />
        ))}
      </div>
    </div>
  );
}
