import Link from 'next/link';

export default function NotFound() {
  return (
    <main id="main" className="page flex min-h-dvh flex-col items-center justify-center py-12 text-center">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="mt-2 max-w-prose text-base text-fg-muted">
        There is nothing at this address. It may have moved, or the link may be wrong.
      </p>
      <Link href="/map" className="btn-primary mt-6">Go to the map</Link>
    </main>
  );
}
