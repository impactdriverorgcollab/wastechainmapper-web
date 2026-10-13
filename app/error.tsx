'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="page flex min-h-dvh flex-col items-center justify-center py-12 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="mt-2 max-w-prose text-base text-fg-muted">
        The page could not be shown. Try again. If it keeps happening, go back to the map.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button variant="primary" onClick={reset}>Try again</Button>
        <Link href="/map" className="btn-secondary">Go to the map</Link>
      </div>
    </main>
  );
}
