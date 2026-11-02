'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import { useSession, useSignOut } from '@/lib/auth';
import { SiteHeader, type NavItem } from '@/components/layout/SiteHeader';
import { Skeleton } from '@/components/ui/Skeleton';

const FIELD_ROLES = ['AMBASSADOR', 'ADMIN', 'FIELD_VERIFIER', 'PARTNER'];
const LINKS: NavItem[] = [{ href: '/field', label: 'Field records' }, { href: '/account', label: 'My record' }, { href: '/map', label: 'Map' }];

export default function FieldLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const session = useSession();
  const signOut = useSignOut();
  const signedOut = session.ready && !session.token;

  useEffect(() => {
    if (signedOut) router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
  }, [signedOut, pathname, router]);

  if (!session.ready || signedOut) {
    return (
      <div role="status" aria-label="Checking your session" className="page py-8">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    );
  }

  const allowed = session.user && FIELD_ROLES.includes(session.user.role);

  return (
    <>
      <SiteHeader links={LINKS} section="Field app">
        <button type="button" onClick={signOut} className="btn-ghost">
          <LogOut size={16} aria-hidden="true" />
          Sign out
        </button>
      </SiteHeader>
      <main id="main" className="page py-6 sm:py-8">
        {allowed ? children : (
          <div role="alert" className="mx-auto max-w-prose rounded-lg bg-warning-soft p-5">
            <h1 className="text-lg font-semibold text-fg">This account is not an ambassador account</h1>
            <p className="mt-1 text-sm text-fg-muted">
              The field app is for LGA ambassadors and field officers. Ask an administrator to change your role, or sign in with another account.
            </p>
            <div className="mt-3 flex gap-3">
              <Link href="/map" className="btn-secondary">Go to the map</Link>
              <button type="button" onClick={signOut} className="btn-primary">Sign out</button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
