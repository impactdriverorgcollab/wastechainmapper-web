'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ApiError, register, signIn } from '@/lib/api';
import { readSession, saveSession, useSession } from '@/lib/auth';
import type { AuthUser } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';

const BLOCKED = 'Your browser is blocking site storage, so sign-in cannot be kept. Allow storage for this site or use a normal window.';

const looksLikeEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v);
const looksLikePhone = (v: string) => /^\+?[\d\s().-]{8,20}$/.test(v);

function homeFor(role?: string) {
  if (role === 'ADMIN' || role === 'FIELD_VERIFIER') return '/admin';
  return role === 'PARTNER' ? '/admin/exports' : '/account';
}

/** Follows a return address only inside this site's own signed-in areas. */
function useReturnAddress() {
  const next = useSearchParams().get('next');
  return next && /^\/(account|report|field|admin)(\/|$|\?)/.test(next) ? next : null;
}

function contactProblem(value: string) {
  if (!value) return 'Enter your email address or phone number.';
  if (value.includes('@') ? !looksLikeEmail(value) : !looksLikePhone(value)) return 'Enter an email address like name@example.org, or a phone number like 0803 123 4567.';
  return undefined;
}

function FormAlert({ text }: { text?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (text) ref.current?.focus(); }, [text]);
  if (!text) return null;
  return <p ref={ref} tabIndex={-1} role="alert" className="rounded bg-danger-soft px-3 py-3 text-sm text-danger">{text}</p>;
}

function useFinish() {
  const router = useRouter();
  const returnTo = useReturnAddress();
  const session = useSession();

  // Someone who is already signed in has no use for these pages.
  useEffect(() => {
    if (session.token) router.replace(returnTo ?? homeFor(session.user?.role));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.token, session.user?.role]);

  return (token: string, user: AuthUser) => {
    saveSession(token, user);
    return !!readSession();
  };
}

export function SignInForm() {
  const finish = useFinish();
  const next = useReturnAddress();
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ contact?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const value = contact.trim();
    const found = { contact: contactProblem(value), password: password ? undefined : 'Enter your password.' };
    setErrors(found);
    if (found.contact || found.password) return;

    setLoading(true);
    try {
      const { accessToken, user } = await signIn(value, password);
      if (!finish(accessToken, user)) setErrors({ form: BLOCKED });
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      setErrors({
        form: status === 401 ? 'That email, phone number or password is not right. Check them and try again.'
          : status === 429 ? 'Too many attempts. Wait a few minutes before trying again.'
          : err instanceof Error ? err.message : 'Sign-in failed. Try again.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <FormAlert text={errors.form} />
      <TextField label="Email or phone number" name="username" autoComplete="username" value={contact} onChange={(e) => setContact(e.target.value)} error={errors.contact} required />
      <TextField label="Password" type="password" name="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} required />
      <Button type="submit" variant="primary" loading={loading} className="w-full">{loading ? 'Signing in' : 'Sign in'}</Button>
      <p className="text-sm text-fg-muted">
        New here? <Link href={`/account/join${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="text-accent underline underline-offset-2 hover:text-accent-hover">Create an account</Link>.
      </p>
      <p className="text-sm text-fg-muted"><Link href="/account/forgot" className="text-accent underline underline-offset-2 hover:text-accent-hover">Forgot your password?</Link></p>
    </form>
  );
}

export function JoinForm() {
  const finish = useFinish();
  const next = useReturnAddress();
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [trap, setTrap] = useState('');
  const [errors, setErrors] = useState<{ name?: string; contact?: string; password?: string; form?: string }>({});
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const value = contact.trim();
    const found = {
      name: name.trim().length >= 2 ? undefined : 'Enter your name.',
      contact: contactProblem(value),
      password: password.length >= 8 ? undefined : 'Use at least 8 characters.',
    };
    setErrors(found);
    setExists(false);
    if (found.name || found.contact || found.password) return;

    setLoading(true);
    try {
      const { accessToken, user } = await register({
        displayName: name.trim(), password, website: trap || undefined,
        ...(value.includes('@') ? { email: value } : { phone: value }),
      });
      if (!finish(accessToken, user)) setErrors({ form: BLOCKED });
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      if (status === 409) setExists(true);
      else setErrors({ form: status === 429 ? 'Too many new accounts from this connection. Please try again later.' : err instanceof Error ? err.message : 'That did not work. Try again.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <FormAlert text={errors.form} />
      {exists && (
        <p role="alert" className="rounded bg-warning-soft px-3 py-3 text-sm text-fg">
          That email or phone number already has an account.{' '}
          <Link href={`/account/sign-in${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="text-accent underline underline-offset-2 hover:text-accent-hover">Sign in instead</Link>.
        </p>
      )}
      <TextField label="Your name" name="name" autoComplete="name" hint="Only reviewers see this. You choose a separate public name later, if you want one." value={name} onChange={(e) => setName(e.target.value)} error={errors.name} required />
      <TextField label="Email or phone number" name="username" autoComplete="username" hint="You use this to sign in. It is never shown in public." value={contact} onChange={(e) => setContact(e.target.value)} error={errors.contact} required />
      <TextField label="Password" type="password" name="new-password" autoComplete="new-password" hint="At least 8 characters." value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} required />
      {/* People never see this field. Bots fill it in. */}
      <div className="sr-only" aria-hidden="true">
        <label>Website<input tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} /></label>
      </div>
      <Button type="submit" variant="primary" loading={loading} className="w-full">{loading ? 'Creating your account' : 'Create my account'}</Button>
      <p className="text-sm text-fg-muted">
        Already have one? <Link href={`/account/sign-in${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="text-accent underline underline-offset-2 hover:text-accent-hover">Sign in</Link>.
      </p>
    </form>
  );
}
