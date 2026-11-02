'use client';

import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { removePin } from '@/lib/api';
import type { ReportPin } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

/** The pins one story put on the map. A reviewer can take off a place the story got wrong and keep the rest. */
export function StoryPins({ reportId, pins, token, onChanged }: { reportId: string; pins: ReportPin[]; token: string; onChanged: () => void }) {
  const [target, setTarget] = useState<ReportPin | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      await removePin(reportId, target.id, token);
      setTarget(null);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not save. Try again.');
      setTarget(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="mb-1 text-sm font-semibold text-fg">Pins from this story</p>
      <ul className="divide-y divide-line">
        {pins.map((pin) => (
          <li key={pin.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-fg">
              <MapPin size={14} className="shrink-0 text-fg-muted" aria-hidden="true" />
              <span className="min-w-0 break-words">{pin.name ?? 'Unnamed place'}{pin.lga ? `, ${pin.lga}` : ''}</span>
              {pin.main && <Badge tone="accent">Main pin</Badge>}
              {!pin.removable && <Badge tone="success">Confirmed</Badge>}
            </span>
            {pin.removable && <Button onClick={() => setTarget(pin)}>Remove<span className="sr-only"> {pin.name ?? 'this pin'}</span></Button>}
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="field-error">{error}</p>}
      <ConfirmDialog open={!!target} title={`Remove ${target?.name ?? 'this pin'} from this story?`} confirmLabel="Remove the pin" tone="danger" loading={busy} onCancel={() => setTarget(null)} onConfirm={confirm}>
        <p className="text-sm">
          The rest of the story stands. The pin stays on the map only if another report also supports it.
          {target?.main && ' This is the main pin, so the report moves to its next pin, or waits to be placed by hand if it has none.'}
        </p>
      </ConfirmDialog>
    </div>
  );
}
