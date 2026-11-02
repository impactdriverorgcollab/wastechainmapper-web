'use client';

import { useState } from 'react';
import { removePin } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { SiteDetail } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

/**
 * For reviewers, on an unconfirmed pin. A story that has already been approved has left the review queue,
 * so this is where its wrong pin is removed.
 */
export function PinReview({ site, token, onChanged }: { site: SiteDetail; token: string; onChanged: () => void }) {
  const [target, setTarget] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = site.communityName ?? 'this place';

  async function confirm() {
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      await removePin(target, site.id, token);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not save. Try again.');
    } finally {
      setBusy(false);
      setTarget(null);
    }
  }

  return (
    <section aria-labelledby="pin-review" className="rounded-lg bg-panel p-4">
      <h2 id="pin-review" className="text-lg font-semibold text-fg">Reports behind this pin</h2>
      <p className="mt-1 text-sm text-fg-muted">Staff only. If a report does not really describe waste at {name}, take this pin off it. The report itself stays.</p>
      {site.sources.length === 0 ? (
        <p className="mt-2 text-sm text-fg-muted">No reports are linked to this pin.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {site.sources.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="min-w-0 break-words text-sm text-fg">{s.excerpt?.slice(0, 120) ?? 'Report with no text'}</span>
              <Button onClick={() => setTarget(s.id)}>Remove from this report</Button>
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="field-error">{error}</p>}
      <ConfirmDialog open={!!target} title={`Take ${name} off this report?`} confirmLabel="Remove the pin" tone="danger" loading={busy} onCancel={() => setTarget(null)} onConfirm={confirm}>
        <p className="text-sm">The rest of the report stands. The pin leaves the map if no other report supports it.</p>
      </ConfirmDialog>
    </section>
  );
}
