import type { ReactNode } from 'react';
import { TIER_INFO } from '@/lib/constants';
import type { ConfidenceTier } from '@/lib/types';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent';

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-panel-3 text-fg-muted',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  accent: 'bg-accent-soft text-accent',
};

/** A small label. The text always says the meaning, colour only reinforces it. */
export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${TONE_CLASS[tone]}`}>
      {children}
    </span>
  );
}

/** A dot in the tier colour followed by its name. */
export function TierLabel({ tier }: { tier: ConfidenceTier }) {
  const info = TIER_INFO[tier];
  return (
    <span className="inline-flex items-center gap-2 text-fg">
      <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${info.dotClass}`} />
      {info.label}
    </span>
  );
}
