'use client';

import { useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

/** Copies this site's address for a path. Falls back to showing it where the browser refuses. */
export function CopyLink({ path }: { path: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const address = () => `${window.location.origin}${path}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(address());
      setState('copied');
      window.setTimeout(() => setState('idle'), 2500);
    } catch {
      setState('failed');
    }
  }

  return (
    <>
      <Button onClick={copy}>
        {state === 'copied' ? <Check size={16} aria-hidden="true" /> : <Link2 size={16} aria-hidden="true" />}
        {state === 'copied' ? 'Link copied' : 'Copy link'}
      </Button>
      <span role="status" className={state === 'failed' ? 'basis-full break-all text-sm text-fg-muted' : 'sr-only'}>
        {state === 'failed' ? `Copy this address: ${address()}` : state === 'copied' ? 'Link copied' : ''}
      </span>
    </>
  );
}
