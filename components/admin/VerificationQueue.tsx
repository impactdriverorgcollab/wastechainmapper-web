'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { getGazetteer, getVerificationQueue, placeReport, verifyReport } from '@/lib/api';
import { useAuthedSWR } from '@/lib/auth';
import { plural } from '@/lib/format';
import type { Report } from '@/lib/types';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TextAreaField } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { ReportCard, type ReviewAction } from './ReportCard';

const OUTCOME: Record<ReviewAction, { done: string; title: string; confirm: string; body: string; tone: 'primary' | 'danger' }> = {
  CORROBORATED: {
    done: 'Corroborated. The site now appears on the map as corroborated.',
    title: 'Corroborate this report?',
    confirm: 'Corroborate',
    body: 'You have checked the source and the location, but nobody has visited the site. It will appear on the map as corroborated.',
    tone: 'primary',
  },
  FIELD_VERIFIED: {
    done: 'Marked field-verified. The site now appears on the map as field-verified.',
    title: 'Mark as field-verified?',
    confirm: 'Mark field-verified',
    body: 'Use this only if someone has visited the site or has first-hand evidence, such as photos taken there.',
    tone: 'primary',
  },
  REJECTED: {
    done: 'Rejected. It is out of the queue.',
    title: 'Reject this report?',
    confirm: 'Reject report',
    body: 'It will leave the queue and will not appear on the map. A reason helps the next reviewer.',
    tone: 'danger',
  },
};

export function VerificationQueue() {
  const { data, error, isLoading, isValidating, mutate, token } = useAuthedSWR<Report[]>(
    'review-queue',
    (t) => getVerificationQueue(t, 100),
  );

  const [pending, setPending] = useState<{ report: Report; action: ReviewAction } | null>(null);
  const [note, setNote] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  // The communities a reviewer can pick when the scraper could not place a story.
  const gazetteer = useSWR('gazetteer', getGazetteer, { revalidateOnFocus: false });
  const places = (gazetteer.data ?? []).filter((p) => p.centroidLat != null && p.centroidLng != null);

  async function place(report: Report, placeId: string) {
    if (!token) return;
    setBusyId(report.id);
    setMessage(null);
    try {
      const updated = await placeReport(report.id, placeId, token);
      // Swap the card for the placed version. It now has a position and can be approved.
      await mutate((current) => (current ?? []).map((r) => (r.id === report.id ? updated : r)), { revalidate: false });
      setMessage({ kind: 'ok', text: `Placed at ${updated.extractedLocationText}. You can now corroborate it.` });
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : 'The place was not saved. Try again.' });
    } finally {
      setBusyId(null);
    }
  }

  async function submit(report: Report, action: ReviewAction, notes?: string) {
    if (!token) return;
    setBusyId(report.id);
    setMessage(null);
    try {
      await verifyReport(report.id, action, notes, token);
      // Remove the card straight away. The server already has the change.
      await mutate((current) => (current ?? []).filter((r) => r.id !== report.id), { revalidate: false });
      setMessage({ kind: 'ok', text: OUTCOME[action].done });
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : 'The change was not saved. Try again.' });
    } finally {
      setBusyId(null);
      setPending(null);
      setNote('');
    }
  }

  function choose(report: Report, action: ReviewAction) {
    // Corroborating is the everyday action and saves in one tap. The other two ask first.
    if (action === 'CORROBORATED') void submit(report, action);
    else { setNote(''); setPending({ report, action }); }
  }

  if (error && error.status !== 401) {
    return <ErrorState message={error.message} onRetry={() => mutate()} retrying={isValidating} />;
  }

  if (isLoading || !data) {
    return (
      <div role="status" aria-label="Loading the review queue" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-72" />)}
      </div>
    );
  }

  const outcome = pending ? OUTCOME[pending.action] : null;

  return (
    <div className="space-y-4">
      <div aria-live="polite" role="status">
        {message && (
          <p className={`rounded px-3 py-3 text-sm ${message.kind === 'ok' ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}>
            {message.text}
          </p>
        )}
      </div>

      {data.length === 0 ? (
        <EmptyState title="The queue is empty">
          New reports from the news scraper and WhatsApp appear here, including stories it could not place, which you can place by hand. If you expected some, the last scrape may simply have found no relevant news. It runs at 7:00 and 19:00, and you can run it by hand with a longer look-back (see the scraper README).
        </EmptyState>
      ) : (
        <>
          <p className="text-sm text-fg-muted">
            {plural(data.length, 'report')} to review
            {data.some((r) => r.geocodedLatitude == null) &&
              `, ${data.filter((r) => r.geocodedLatitude == null).length} of them without a place yet`}
            . Placed stories come first.
          </p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                busy={busyId === report.id}
                places={places}
                onAction={choose}
                onPlace={place}
              />
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!pending}
        title={outcome?.title ?? ''}
        confirmLabel={outcome?.confirm ?? 'Confirm'}
        tone={outcome?.tone}
        loading={!!pending && busyId === pending.report.id}
        onCancel={() => setPending(null)}
        onConfirm={() => pending && submit(pending.report, pending.action, note)}
      >
        {pending && (
          <>
            <p className="text-sm">{outcome?.body}</p>
            <p className="text-sm font-semibold text-fg">
              {pending.report.extractedLocationText ?? 'Report with no place named'}
            </p>
            <TextAreaField
              label="Note"
              optional
              value={note}
              maxLength={2000}
              onChange={(e) => setNote(e.target.value)}
              hint="Kept with the record for the next reviewer."
            />
          </>
        )}
      </ConfirmDialog>
    </div>
  );
}
