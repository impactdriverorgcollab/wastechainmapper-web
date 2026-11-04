'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { ApiError, confirmAlerts, subscribeAlerts, unsubscribeAlerts } from '@/lib/api';
import { RIVERS_STATE_LGAS } from '@/lib/constants';
import type { AlertKind } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';

const LINK = 'text-accent underline underline-offset-2 hover:text-accent-hover';

const KINDS: { kind: AlertKind; label: string; hint: string }[] = [
  { kind: 'sites', label: 'Checked sites', hint: 'When a reviewer checks a site in your areas. At most one email a day.' },
  { kind: 'drainage', label: 'Heavy rain and blocked drains', hint: 'When heavy rain is forecast and there are recorded sites in drains in your areas.' },
  { kind: 'watch', label: 'Areas to watch', hint: 'Once a week, the zones where new records are arriving fastest. Experimental.' },
];

function Done({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div role="status" className="rounded-lg bg-success-soft p-5">
      <CheckCircle2 size={24} className="text-success" aria-hidden="true" />
      <h2 className="mt-2 text-lg font-semibold text-fg">{title}</h2>
      <div className="mt-1 text-sm text-fg-muted">{children}</div>
    </div>
  );
}

export function SubscribeForm() {
  const [email, setEmail] = useState('');
  const [everywhere, setEverywhere] = useState(true);
  const [lgas, setLgas] = useState<string[]>([]);
  const [kinds, setKinds] = useState<AlertKind[]>(['sites', 'drainage']);
  const [errors, setErrors] = useState<{ email?: string; lgas?: string; kinds?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const found = {
      email: /^\S+@\S+\.\S+$/.test(email.trim()) ? undefined : 'Enter an email address like name@example.org.',
      lgas: everywhere || lgas.length > 0 ? undefined : 'Choose at least one area, or all of Rivers State.',
      kinds: kinds.length > 0 ? undefined : 'Choose at least one kind of alert.',
    };
    setErrors(found);
    if (found.email || found.lgas || found.kinds) return;
    setBusy(true);
    try {
      await subscribeAlerts(email.trim(), everywhere ? [] : lgas, kinds);
      setSent(true);
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      setErrors({ form: status === 429 ? 'Too many requests from this connection. Please try again later.' : err instanceof Error ? err.message : 'That did not work. Try again.' });
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <Done title="Check your email">
        <p>We sent a link to {email.trim()}. Open it to start the alerts. Nothing is sent until you do. Check your spam folder too.</p>
      </Done>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      {errors.form && <p role="alert" className="rounded bg-danger-soft px-3 py-3 text-sm text-danger">{errors.form}</p>}
      <div className="max-w-md">
        <TextField label="Email address" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
      </div>

      <fieldset>
        <legend className="label">Which areas?</legend>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base text-fg">
          <input type="radio" name="where" checked={everywhere} onChange={() => setEverywhere(true)} className="h-5 w-5 accent-accent" />
          All of Rivers State
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base text-fg">
          <input type="radio" name="where" checked={!everywhere} onChange={() => setEverywhere(false)} className="h-5 w-5 accent-accent" />
          Only some local government areas
        </label>
        {!everywhere && (
          <div className="mt-2 grid gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
            {RIVERS_STATE_LGAS.map((l) => (
              <label key={l} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-fg">
                <input type="checkbox" className="h-5 w-5 accent-accent" checked={lgas.includes(l)} onChange={(e) => setLgas(e.target.checked ? [...lgas, l] : lgas.filter((x) => x !== l))} />
                {l}
              </label>
            ))}
          </div>
        )}
        {errors.lgas && <p className="field-error">{errors.lgas}</p>}
      </fieldset>

      <fieldset>
        <legend className="label">What should we tell you about?</legend>
        {KINDS.map((k) => (
          <label key={k.kind} className="flex cursor-pointer gap-3 py-2 text-base text-fg">
            <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-accent" checked={kinds.includes(k.kind)} onChange={(e) => setKinds(e.target.checked ? [...kinds, k.kind] : kinds.filter((x) => x !== k.kind))} />
            <span>{k.label}<span className="block text-sm text-fg-muted">{k.hint}</span></span>
          </label>
        ))}
        {errors.kinds && <p className="field-error">{errors.kinds}</p>}
      </fieldset>

      <Button type="submit" variant="primary" loading={busy}>{busy ? 'Sending' : 'Send me a confirmation link'}</Button>
      <p className="text-sm text-fg-muted">Every alert has a link to stop them. Your address is used for nothing else.</p>
    </form>
  );
}

export function ConfirmAlerts() {
  const token = useSearchParams().get('token');
  const [done, setDone] = useState<{ lgas: string[] } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!token) return <p role="alert" className="rounded bg-danger-soft px-3 py-3 text-sm text-danger">This link is not complete. Open it again from your email.</p>;

  async function confirm() {
    setBusy(true);
    setFailed(null);
    try {
      const r = await confirmAlerts(token!);
      setDone({ lgas: r.lgas });
    } catch (e) {
      setFailed(e instanceof Error ? e.message : 'That did not work. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (done) return <Done title="Your alerts are on"><p>For {done.lgas.length ? done.lgas.join(', ') : 'all of Rivers State'}. The first email comes the next morning there is something to say. <Link href="/map" className={LINK}>See the map</Link></p></Done>;
  return (
    <div className="space-y-4">
      {failed && <p role="alert" className="rounded bg-danger-soft px-3 py-3 text-sm text-danger">{failed}</p>}
      <Button variant="primary" onClick={confirm} loading={busy} className="w-full">{busy ? 'Starting' : 'Start my alerts'}</Button>
    </div>
  );
}

export function Unsubscribe() {
  const params = useSearchParams();
  const id = params.get('id');
  const token = params.get('token');
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!id || !token) return <p role="alert" className="rounded bg-danger-soft px-3 py-3 text-sm text-danger">This link is not complete. Open it again from the email.</p>;

  async function stop() {
    setBusy(true);
    setFailed(null);
    try {
      await unsubscribeAlerts(id!, token!);
      setDone(true);
    } catch (e) {
      setFailed(e instanceof Error ? e.message : 'That did not work. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (done) return <Done title="Your alerts are stopped"><p>Your address has been removed. <Link href="/alerts" className={LINK}>Sign up again</Link> at any time.</p></Done>;
  return (
    <div className="space-y-4">
      {failed && <p role="alert" className="rounded bg-danger-soft px-3 py-3 text-sm text-danger">{failed}</p>}
      <Button variant="danger" onClick={stop} loading={busy} className="w-full">{busy ? 'Stopping' : 'Stop my alerts'}</Button>
    </div>
  );
}
