'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { ApiError, confirmEmail, forgotPassword, resetPassword } from '@/lib/api';
import { clearSession } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';

const LINK = 'text-accent underline underline-offset-2 hover:text-accent-hover';

function Done({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div role="status" className="rounded-lg bg-success-soft p-5">
      <CheckCircle2 size={24} className="text-success" aria-hidden="true" />
      <h2 className="mt-2 text-lg font-semibold text-fg">{title}</h2>
      <div className="mt-1 text-sm text-fg-muted">{children}</div>
    </div>
  );
}

const Failed = ({ text }: { text: string }) => <p role="alert" className="rounded bg-danger-soft px-3 py-3 text-sm text-danger">{text}</p>;

function NoToken({ action }: { action: string }) {
  return <Failed text={`This link is not complete. Open it again from your email, or ${action}.`} />;
}

export function ForgotForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [failed, setFailed] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const value = email.trim();
    const problem = /^\S+@\S+\.\S+$/.test(value) ? undefined : 'Enter an email address like name@example.org.';
    setError(problem);
    if (problem) return;
    setBusy(true);
    setFailed(null);
    try {
      await forgotPassword(value);
      setSent(true);
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      setFailed(status === 429 ? 'Too many attempts. Wait a few minutes before trying again.' : err instanceof Error ? err.message : 'That did not work. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <Done title="Check your email">
        <p>If that address has an account, a link to choose a new password is on its way. It works for one hour. Check your spam folder too.</p>
      </Done>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {failed && <Failed text={failed} />}
      <TextField label="Email address" type="email" name="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} required />
      <Button type="submit" variant="primary" loading={busy} className="w-full">{busy ? 'Sending' : 'Send me a reset link'}</Button>
      <p className="text-sm text-fg-muted">Signed up with a phone number? Ask the WasteChainMapper team, and an administrator can set a new password for you.</p>
      <p className="text-sm text-fg-muted"><Link href="/account/sign-in" className={LINK}>Back to sign in</Link></p>
    </form>
  );
}

export function ResetForm() {
  const token = useSearchParams().get('token');
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [errors, setErrors] = useState<{ password?: string; again?: string }>({});
  const [failed, setFailed] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!token) return <NoToken action="ask for a new one" />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const found = {
      password: password.length >= 8 ? undefined : 'Use at least 8 characters.',
      again: password === again ? undefined : 'The two passwords do not match.',
    };
    setErrors(found);
    if (found.password || found.again) return;
    setBusy(true);
    setFailed(null);
    try {
      await resetPassword(token!, password);
      clearSession();
      setDone(true);
    } catch (err) {
      setFailed(err instanceof Error ? err.message : 'That did not work. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Done title="Your password has changed">
        <p>Any device still signed in with the old password has been signed out. <Link href="/account/sign-in" className={LINK}>Sign in</Link> with your new one.</p>
      </Done>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {failed && (
        <div className="space-y-2">
          <Failed text={failed} />
          {failed.includes('expired') && <p className="text-sm text-fg-muted"><Link href="/account/forgot" className={LINK}>Ask for a new link</Link></p>}
        </div>
      )}
      <TextField label="New password" type="password" name="new-password" autoComplete="new-password" hint="At least 8 characters. Staff, ambassadors and partners need at least 12." value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} required />
      <TextField label="New password again" type="password" name="confirm-password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} error={errors.again} required />
      <Button type="submit" variant="primary" loading={busy} className="w-full">{busy ? 'Saving' : 'Save my new password'}</Button>
    </form>
  );
}

/** Confirming takes a press rather than happening on load, because mail scanners open links on their own. */
export function ConfirmEmail() {
  const token = useSearchParams().get('token');
  const [failed, setFailed] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!token) return <NoToken action="send a new one from My record" />;

  async function confirm() {
    setBusy(true);
    setFailed(null);
    try {
      await confirmEmail(token!);
      setDone(true);
    } catch (err) {
      setFailed(err instanceof Error ? err.message : 'That did not work. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Done title="Your email address is confirmed">
        <p><Link href="/account" className={LINK}>Go to my record</Link></p>
      </Done>
    );
  }

  return (
    <div className="space-y-4">
      {failed && <Failed text={failed} />}
      <Button variant="primary" loading={busy} onClick={confirm} className="w-full">{busy ? 'Confirming' : 'Confirm my email address'}</Button>
    </div>
  );
}
