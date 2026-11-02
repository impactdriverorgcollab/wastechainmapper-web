import type { ReactNode } from 'react';

export function StatGrid({ children, columns = 4 }: { children: ReactNode; columns?: 3 | 4 | 5 }) {
  const cols = columns === 5 ? 'lg:grid-cols-5' : columns === 3 ? 'md:grid-cols-3' : 'lg:grid-cols-4';
  return <dl className={`grid grid-cols-2 gap-3 ${cols}`}>{children}</dl>;
}

/** One figure with its label. The value is large, the label sits under it. */
export function StatCard({ label, value, note }: { label: ReactNode; value: ReactNode; note?: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-panel p-4">
      <dd className="tabular break-words text-xl font-semibold text-fg sm:text-2xl">{value}</dd>
      <dt className="mt-1 text-sm text-fg-muted">{label}</dt>
      {note && <dd className="mt-1 text-xs text-fg-subtle">{note}</dd>}
    </div>
  );
}
