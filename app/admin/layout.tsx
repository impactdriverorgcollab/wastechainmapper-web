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
  // Ambassadors and partners work in the field app. The admin area is for reviewers and administrators.
  const role = session.user?.role;
  const isPartner = role === 'PARTNER';
  const wrongArea = !!role && role !== 'ADMIN' && role !== 'FIELD_VERIFIER' && !isPartner;
  // Partners see only the downloads and the collection points they can add to.
  const partnerAllowed = pathname.startsWith('/admin/exports') || pathname.startsWith('/admin/collection-points');

  // Send anyone without a session to the sign-in page, and bring them back afterwards.
  useEffect(() => {
    if (signedOut && !isLogin) router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
  }, [signedOut, isLogin, pathname, router]);

  useEffect(() => {
    if (wrongArea && !isLogin) router.replace('/field');
    if (isPartner && !isLogin && !partnerAllowed) router.replace('/admin/exports');
  }, [wrongArea, isPartner, partnerAllowed, isLogin, router]);

  if (isLogin) return <>{children}</>;

  if (!session.ready || signedOut || wrongArea) {
    return (
      <div role="status" aria-label="Checking your session" className="page py-8">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    );
  }

  const partnerLinks: NavItem[] = [
    { href: '/admin/exports', label: 'Exports' },
    { href: '/admin/collection-points', label: 'Collection points' },
  ];
  const staffLinks: NavItem[] = [
    { href: '/admin/overview', label: 'Overview' },
    { href: '/admin/queue', label: 'Review queue' },
    { href: '/admin/sites', label: 'Sites' },
    { href: '/admin/collection-points', label: 'Collection points' },
    { href: '/admin/lgas', label: 'Local governments' },
    { href: '/admin/exports', label: 'Exports' },
    // Only administrators can manage people, sources and keys. The API refuses everyone else.
    ...(session.user?.role === 'ADMIN'
      ? [
          { href: '/admin/sources', label: 'Sources' },
          { href: '/admin/users', label: 'People' },
          { href: '/admin/import', label: 'Import data' },
          { href: '/admin/api-keys', label: 'API keys' },
          { href: '/admin/audit', label: 'Audit log' },
        ]
      : []),
  ];
  const links = isPartner ? partnerLinks : staffLinks;

  return (
    <>
      <SiteHeader links={links} section={isPartner ? 'Partner' : 'Admin'}>
        <Link href="/map" className="btn-ghost">Public site</Link>
        <button type="button" onClick={signOut} className="btn-ghost">
          <LogOut size={16} aria-hidden="true" />
          Sign out
        </button>
      </SiteHeader>
      <main id="main" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </>
  );
}
