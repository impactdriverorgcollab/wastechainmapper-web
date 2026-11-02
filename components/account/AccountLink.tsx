'use client';

import Link from 'next/link';
import { useSession } from '@/lib/auth';

/** The header's way in. One sign-in page serves everyone, and this says where a signed-in person goes next. */
export function AccountLink() {
  const { token, user } = useSession();
  if (!token) return <Link href="/account/sign-in" className="btn-ghost">Sign in</Link>;
  if (user?.role === 'ADMIN' || user?.role === 'FIELD_VERIFIER') return <Link href="/admin" className="btn-ghost">Staff area</Link>;
  if (user?.role === 'PARTNER') return <Link href="/admin/exports" className="btn-ghost">Partner area</Link>;
  return <Link href="/account" className="btn-ghost">My record</Link>;
}
