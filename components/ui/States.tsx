import type { ReactNode } from 'react';
import { AlertTriangle, Inbox } from 'lucide-react';
import { Button } from './Button';

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-lg bg-panel px-4 py-12 text-center">
      <Inbox size={24} className="mx-auto text-fg-subtle" aria-hidden="true" />
      <p className="mt-3 text-base font-semibold text-fg">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-prose text-sm text-fg-muted">{children}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message, onRetry, retrying = false,
}: { message: string; onRetry?: () => void; retrying?: boolean }) {
  return (
    <div role="alert" className="rounded-lg bg-danger-soft px-4 py-8 text-center">
      <AlertTriangle size={24} className="mx-auto text-danger" aria-hidden="true" />
      <p className="mt-3 text-base font-semibold text-fg">This did not load</p>
      <p className="mx-auto mt-1 max-w-prose text-sm text-fg-muted">{message}</p>
      {onRetry && (
        <div className="mt-4 flex justify-center">
          <Button onClick={onRetry} loading={retrying}>Try again</Button>
        </div>
      )}
    </div>
  );
}
