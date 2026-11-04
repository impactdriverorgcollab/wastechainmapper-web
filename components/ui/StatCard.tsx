import type { ReactNode } from 'react';

export function StatGrid({ children, columns = 4 }: { children: ReactNode; columns?: 3 | 4 | 5 }) {
  const cols = columns === 5 ? 'lg:grid-cols-5' : columns === 3 ? 'md:grid-cols-3' : 'lg:grid-cols-4';
  return <dl className={`grid grid-cols-2 gap-x-6 gap-y-6 ${cols}`}>{children}</dl>;
}

/** One figure with its label, set off by a rule on its left. */
export function StatCard({ label, value, note }: { label: ReactNode; value: ReactNode; note?: string }) {
  return (
    <div className="min-w-0 border-l-2 border-line pl-4">
      <dd className="tabular break-words font-mono text-lg text-fg sm:text-2xl">{value}</dd>
      <dt className="mt-1 text-sm text-fg-muted">{label}</dt>
      {note && <dd className="mt-1 text-xs text-fg-subtle">{note}</dd>}
    </div>
  );
}
