import { TIER_COLORS } from '@/lib/constants';
import type { ConfidenceTier } from '@/lib/types';

const TIERS: ConfidenceTier[] = ['HIGH', 'MEDIUM', 'LOW'];

export function ConfidenceLegend() {
  return (
    <div className="bg-surface-1 border border-border px-3 py-2 text-xs">
      <p className="section-header mb-2">Dump site confidence</p>
      <div className="space-y-1.5">
        {TIERS.map((tier) => {
          const { hex, label, description } = TIER_COLORS[tier];
          return (
            <div key={tier} className="flex items-center gap-2">
              <span className="shrink-0 rounded-full" style={{ width: 10, height: 10, background: hex }} />
              <span className="text-text-secondary">
                {label}
                <span className="text-text-dim ml-1">— {description}</span>
              </span>
            </div>
          );
        })}

        <div className="border-t border-border mt-2 pt-2 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded-full border-2" style={{ width: 10, height: 10, background: '#22c55e', borderColor: '#ffffff' }} />
            <span className="text-text-secondary">Collection point</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded-full" style={{ width: 10, height: 10, background: '#3b82f6' }} />
            <span className="text-text-secondary">Recycling facility</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded-full" style={{ width: 10, height: 10, background: '#f59e0b' }} />
            <span className="text-text-secondary">Transfer station</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded-full" style={{ width: 10, height: 10, background: '#60a5fa' }} />
            <span className="text-text-secondary">Water source</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded-full" style={{ width: 10, height: 10, background: '#a855f7' }} />
            <span className="text-text-secondary">Water anomaly</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="16" height="8" className="shrink-0">
              <line x1="0" y1="4" x2="16" y2="4" stroke="#4a5568" strokeWidth="1.5" strokeDasharray="3,3" />
            </svg>
            <span className="text-text-secondary">Waste collection route</span>
          </div>
        </div>
      </div>
    </div>
  );
}
