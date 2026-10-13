/** A grey block that holds the place of content while it loads. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded bg-panel-3 ${className}`.trim()} />;
}

export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading figures" className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-lg bg-panel p-4">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="mt-2 h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div role="status" aria-label="Loading table" className="rounded-lg bg-panel p-3">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex gap-4 border-t border-line py-3 first:border-t-0">
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton key={c} className="h-5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
