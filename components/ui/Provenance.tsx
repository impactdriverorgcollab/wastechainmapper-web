import { BASIS_INFO, CONFIDENCE_LABELS } from '@/lib/constants';
import type { Provenance } from '@/lib/types';
import { formatDate } from '@/lib/format';
import { Badge } from './Badge';

/**
 * The brief's rule: never present an uncertain estimate as a verified measurement. Every figure that
 * is an estimate shows what kind of figure it is next to it, in words.
 */
export function BasisBadge({ provenance }: { provenance?: Provenance | null }) {
  if (!provenance) return <Badge>Method not recorded</Badge>;
  const info = BASIS_INFO[provenance.basis];
  return (
    <Badge tone={info.tone}>
      {info.label}
      <span className="sr-only">. {info.description}. {CONFIDENCE_LABELS[provenance.confidence]}.</span>
    </Badge>
  );
}

interface EstimateProps {
  label: string;
  value: string | null;
  provenance?: Provenance | null;
}

/** One estimated figure: the value, what kind of figure it is, and how it was made. */
export function EstimateRow({ label, value, provenance }: EstimateProps) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <dt className="text-sm text-fg-muted">{label}</dt>
      <dd className="mt-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="tabular text-base font-semibold text-fg">{value ?? 'Not estimated'}</span>
          {value && <BasisBadge provenance={provenance} />}
        </span>
        {value && provenance && (
          <span className="mt-1 block text-sm text-fg-subtle">
            {provenance.method}. {CONFIDENCE_LABELS[provenance.confidence]}. {formatDate(provenance.at)}.
          </span>
        )}
      </dd>
    </div>
  );
}
