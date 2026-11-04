'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useSession, useSignOut } from '@/lib/auth';
import { AdminShell, type NavGroup } from '@/components/admin/AdminShell';
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
    if (wrongArea && !isLogin) router.replace(role === 'REPORTER' ? '/account' : '/field');
    if (isPartner && !isLogin && !partnerAllowed) router.replace('/admin/exports');
  }, [wrongArea, role, isPartner, partnerAllowed, isLogin, router]);

  if (isLogin) return <>{children}</>;

  if (!session.ready || signedOut || wrongArea) {
    return (
      <div role="status" aria-label="Checking your session" className="page py-8">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    );
  }

  const isAdmin = role === 'ADMIN';
  // Grouped so the list reads as a few short sections. Only administrators manage people, sources and
  // keys, and the API refuses everyone else.
  const groups: NavGroup[] = isPartner
    ? [{ label: 'Partner', links: [{ href: '/admin/exports', label: 'Exports' }, { href: '/admin/collection-points', label: 'Collection points' }] }]
    : [
        { label: 'Review', links: [{ href: '/admin/overview', label: 'Overview' }, { href: '/admin/queue', label: 'Review queue' }, { href: '/admin/profiles', label: 'Public profiles' }] },
        { label: 'Places', links: [{ href: '/admin/sites', label: 'Sites' }, { href: '/admin/collection-points', label: 'Collection points' }, { href: '/admin/lgas', label: 'Local governments' }] },
        { label: 'Data', links: [{ href: '/admin/exports', label: 'Exports' }, ...(isAdmin ? [{ href: '/admin/import', label: 'Import data' }, { href: '/admin/sources', label: 'Sources' }] : [])] },
        ...(isAdmin ? [{ label: 'Administration', links: [{ href: '/admin/users', label: 'People' }, { href: '/admin/api-keys', label: 'API keys' }, { href: '/admin/audit', label: 'Audit log' }] }] : []),
      ];

  return (
    <AdminShell groups={groups} section={isPartner ? 'Partner' : 'Admin'} person={session.user?.displayName || session.user?.email} onSignOut={signOut}>
      {children}
    </AdminShell>
  );
}
