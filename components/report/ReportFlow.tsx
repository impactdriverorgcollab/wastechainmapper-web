'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ApiError, submitReport, uploadPhoto } from '@/lib/api';
import { useSession } from '@/lib/auth';
import type { SubmissionInput, SubmitResult } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { ObservationForm, type FormPhoto } from './ObservationForm';

interface Saved {
  result: SubmitResult;
  failed: FormPhoto[];
}

/** The public form: send the report first, then the photos one by one, so a weak connection loses as little as possible. */
export function ReportFlow() {
  const [saved, setSaved] = useState<Saved | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [key, setKey] = useState(0);
  const session = useSession();

  async function send(input: SubmissionInput, photos: FormPhoto[]) {
    let result: SubmitResult;
    try {
      result = await submitReport(input, session.token);
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) {
        throw new Error('You have sent several reports in the last hour. Please try again later.');
      }
      throw e;
    }
    const failed: FormPhoto[] = [];
    for (const p of photos) {
      try {
        await uploadPhoto(result.id, result.uploadToken, p.dataUrl, p.capturedAt);
      } catch {
        failed.push(p);
      }
    }
    setSaved({ result, failed });
    window.scrollTo({ top: 0 });
  }

  async function retryPhotos() {
    if (!saved) return;
    setRetrying(true);
    const failed: FormPhoto[] = [];
    for (const p of saved.failed) {
      try {
        await uploadPhoto(saved.result.id, saved.result.uploadToken, p.dataUrl, p.capturedAt);
      } catch {
        failed.push(p);
      }
    }
    setSaved({ ...saved, failed });
    setRetrying(false);
  }

  if (saved) {
    return (
      <div className="space-y-4" role="status">
        <div className="rounded-lg bg-success-soft p-5">
          <CheckCircle2 size={24} className="text-success" aria-hidden="true" />
          <h2 className="mt-2 text-xl font-semibold text-fg">Your report was received</h2>
          <p className="mt-1 text-base text-fg-muted">
            Reference <span className="font-mono text-sm text-fg">{saved.result.id.slice(0, 8)}</span>.
            A reviewer will check it before anything appears on the map. It will show as reported until then.
            {!saved.result.placed && ' We could not place it from what you gave us, so the reviewer will try to find it.'}
            {saved.result.possibleDuplicate && ' It looks close to a recent report, so the reviewer will compare them.'}
            {saved.result.credited && ' It will count towards your record once it is approved.'}
          </p>
        </div>

        {saved.failed.length > 0 && (
          <div role="alert" className="rounded-lg bg-warning-soft p-4">
            <p className="text-sm text-fg">
              {saved.failed.length === 1 ? 'One photo' : `${saved.failed.length} photos`} did not upload. Your report is saved without {saved.failed.length === 1 ? 'it' : 'them'}.
            </p>
            <div className="mt-3">
              <Button onClick={retryPhotos} loading={retrying}>Try the photos again</Button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button variant="primary" onClick={() => { setSaved(null); setKey((k) => k + 1); window.scrollTo({ top: 0 }); }}>Report another place</Button>
          {saved.result.credited
            ? <Link href="/account" className="btn-secondary">See my record</Link>
            : <Link href="/map" className="btn-secondary">See the map</Link>}
        </div>

        {!saved.result.credited && (
          <p className="text-sm text-fg-muted">
            Want your next reports to count? <Link href="/account/join?next=/report" className="text-accent underline underline-offset-2 hover:text-accent-hover">Create an account</Link> and sign in before you send them. This report cannot be added later.
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <p className="mb-4 rounded bg-panel px-3 py-3 text-sm text-fg-muted">
        {session.token
          ? <>Signed in as {session.user?.displayName ?? 'you'}. This report will count towards your record once it is approved.</>
          : <>Have an account? <Link href="/account/sign-in?next=/report" className="text-accent underline underline-offset-2 hover:text-accent-hover">Sign in</Link> first so this report counts towards your record.</>}
      </p>
      <ObservationForm
        key={key}
        variant="public"
        submitLabel="Send my report"
        onSubmit={send}
        footerNote="Nothing you send is published until a reviewer has checked it."
      />
    </>
  );
}
