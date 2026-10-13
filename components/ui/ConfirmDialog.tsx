'use client';

import { useEffect, useId, useRef, type FormEvent, type ReactNode } from 'react';
import { Button } from './Button';

interface Props {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * A modal for one short decision. It uses the browser's own dialog element, which traps
 * focus, closes on Escape and returns focus to the button that opened it.
 */
export function ConfirmDialog({
  open, title, children, confirmLabel, cancelLabel = 'Cancel', tone = 'primary', loading = false, onConfirm, onCancel,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function submit(e: FormEvent) {
    e.preventDefault();
    onConfirm();
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => { e.preventDefault(); if (!loading) onCancel(); }}
      className="m-auto w-full max-w-md rounded-lg bg-panel-2 p-0 text-fg shadow-overlay backdrop:bg-canvas/80"
    >
      <form onSubmit={submit} className="p-6">
        <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
        {children && <div className="mt-2 space-y-4 text-base text-fg-muted">{children}</div>}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
          <Button type="submit" variant={tone === 'danger' ? 'danger' : 'primary'} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
