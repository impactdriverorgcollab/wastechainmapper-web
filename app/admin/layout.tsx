'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import { useSession, useSignOut } from '@/lib/auth';
import { SiteHeader, type NavItem } from '@/components/layout/SiteHeader';
import { Skeleton } from '@/components/ui/Skeleton';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const signOut = useSignOut();

  const isLogin = pathname === '/admin/login';
  const signedOut = session.ready && !session.token;

  // Send anyone without a session to the sign-in page, and bring them back afterwards.
  useEffect(() => {
    if (signedOut && !isLogin) router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
  }, [signedOut, isLogin, pathname, router]);

  if (isLogin) return <>{children}</>;

  if (!session.ready || signedOut) {
    return (
      <div role="status" aria-label="Checking your session" className="page py-8">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    );
  }

  const links: NavItem[] = [
    { href: '/admin/queue', label: 'Review queue' },
    { href: '/admin/sites', label: 'Sites' },
    // Only administrators can manage API keys. The API refuses everyone else.
    ...(session.user?.role === 'ADMIN'
      ? [{ href: '/admin/import', label: 'Import data' }, { href: '/admin/api-keys', label: 'API keys' }]
      : []),
  ];

  return (
    <>
      <SiteHeader links={links} section="Admin">
        <Link href="/map" className="btn-ghost">Public site</Link>
        <button type="button" onClick={signOut} className="btn-ghost">
          <LogOut size={16} aria-hidden="true" />
          Sign out
        </button>
      </SiteHeader>
      <main id="main" className="page py-6 sm:py-8">{children}</main>
    </>
  );
}
