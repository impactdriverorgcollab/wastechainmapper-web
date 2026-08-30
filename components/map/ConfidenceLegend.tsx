import { TIER_COLORS } from '@/lib/constants';
import type { ConfidenceTier } from '@/lib/types';

const TIERS: ConfidenceTier[] = ['HIGH', 'MEDIUM', 'LOW'];

export function ConfidenceLegend() {
  return (
    <div className="bg-surface-1 border border-border px-3 py-2 text-xs">
      <p className="section-header mb-2">Confidence tier</p>
      <div className="space-y-1.5">
        {TIERS.map((tier) => {
          const { hex, label, description } = TIER_COLORS[tier];
          return (
            <div key={tier} className="flex items-center gap-2">
              <span
                className="shrink-0 rounded-full"
                style={{ width: 10, height: 10, background: hex }}
              />
              <span className="text-text-secondary">
                {label}
                <span className="text-text-dim ml-1">— {description}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
