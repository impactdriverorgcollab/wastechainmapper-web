'use client';

import { useState, type FormEvent } from 'react';
import { UserPlus } from 'lucide-react';
import { createUser, updateUser, listUsers } from '@/lib/api';
import { useAuthedSWR } from '@/lib/auth';
import { RIVERS_STATE_LGAS, USER_ROLE_LABELS } from '@/lib/constants';
import type { UserRole, UserRow } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SelectField, TextField } from '@/components/ui/Field';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';

const ROLES: UserRole[] = ['ADMIN', 'FIELD_VERIFIER', 'AMBASSADOR', 'PARTNER', 'REPORTER'];

const contactOf = (u: UserRow) => u.email ?? u.phone ?? 'this account';

interface FormState { email: string; password: string; displayName: string; role: UserRole; organisation: string; lgas: string[] }

function PersonForm({
  initial, editing, busy, error, onSubmit, onCancel,
}: {
  initial: FormState; editing: boolean; busy: boolean; error: string | null;
  onSubmit: (f: FormState) => void; onCancel: () => void;
}) {
  const [f, setF] = useState<FormState>(initial);
  const [problems, setProblems] = useState<Record<string, string>>({});
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((p) => ({ ...p, [k]: v }));

  function submit(e: FormEvent) {
    e.preventDefault();
    const found: Record<string, string> = {};
    if (!editing && !/^\S+@\S+\.\S+$/.test(f.email.trim())) found.email = 'Enter an email address like name@example.org.';
    if ((!editing || f.password) && f.password.length < 12) found.password = editing ? 'A new password needs at least 12 characters, or leave it empty.' : 'Use at least 12 characters.';
    setProblems(found);
    if (Object.keys(found).length === 0) onSubmit(f);
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3 rounded-lg bg-panel p-4">
      {error && <p role="alert" className="rounded bg-danger-soft px-3 py-3 text-sm text-danger">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {!editing && <TextField label="Email" type="email" autoComplete="off" value={f.email} onChange={(e) => set('email', e.target.value)} error={problems.email} />}
        <TextField label={editing ? 'New password' : 'Password'} optional={editing} type="password" autoComplete="new-password" value={f.password} onChange={(e) => set('password', e.target.value)} error={problems.password} hint="At least 12 characters. Share it in person or by a private message." />
        <TextField label="Name" optional value={f.displayName} onChange={(e) => set('displayName', e.target.value)} />
        <TextField label="Organisation" optional value={f.organisation} onChange={(e) => set('organisation', e.target.value)} />
        <SelectField label="Role" value={f.role} onChange={(e) => set('role', e.target.value as UserRole)}>
          {ROLES.map((r) => <option key={r} value={r}>{USER_ROLE_LABELS[r]}</option>)}
        </SelectField>
      </div>
      <fieldset>
        <legend className="label">Local government areas covered <span className="font-normal text-fg-muted">(for ambassadors)</span></legend>
        <div className="grid gap-x-4 sm:grid-cols-3">
          {RIVERS_STATE_LGAS.map((l) => (
            <label key={l} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-fg">
              <input type="checkbox" className="h-5 w-5 accent-accent" checked={f.lgas.includes(l)} onChange={(e) => set('lgas', e.target.checked ? [...f.lgas, l] : f.lgas.filter((x) => x !== l))} />
              {l}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex gap-2">
        <Button type="submit" variant="primary" loading={busy}>{editing ? 'Save changes' : 'Create account'}</Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

export function UsersAdmin() {
  const { data, error, isLoading, mutate, token, user: me } = useAuthedSWR<UserRow[]>('users', (t) => listUsers(t));
  const [mode, setMode] = useState<{ kind: 'new' } | { kind: 'edit'; user: UserRow } | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [toggle, setToggle] = useState<UserRow | null>(null);

  async function save(f: FormState) {
    if (!token) return;
    setBusy(true);
    setFormError(null);
    try {
      if (mode?.kind === 'edit') {
        await updateUser(mode.user.id, {
          displayName: f.displayName, role: f.role, organisation: f.organisation, assignedLgas: f.lgas, ...(f.password && { password: f.password }),
        }, token);
        setMessage(`Saved ${contactOf(mode.user)}.`);
      } else {
        const created = await createUser({
          email: f.email.trim(), password: f.password, displayName: f.displayName || undefined, role: f.role,
          organisation: f.organisation || undefined, assignedLgas: f.lgas,
        }, token);
        setMessage(created.ambassadorCode ? `Created ${contactOf(created)}. Their ambassador ID is ${created.ambassadorCode}.` : `Created ${contactOf(created)}.`);
      }
      setMode(null);
      await mutate();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'That did not save. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function flip(u: UserRow) {
    if (!token) return;
    setBusy(true);
    try {
      await updateUser(u.id, { isActive: !u.isActive }, token);
      setMessage(`${contactOf(u)} is now ${u.isActive ? 'switched off' : 'switched on'}.`);
      await mutate();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'That did not save.');
    } finally {
      setBusy(false);
      setToggle(null);
    }
  }

  if (error && error.status !== 401) return <ErrorState message={error.message} onRetry={() => mutate()} />;
  if (isLoading || !data) return <TableSkeleton />;

  return (
    <div className="space-y-4">
      <div aria-live="polite" role="status">{message && <p className="rounded bg-success-soft px-3 py-3 text-sm text-success">{message}</p>}</div>

      {mode ? (
        <PersonForm
          key={mode.kind === 'edit' ? mode.user.id : 'new'}
          editing={mode.kind === 'edit'}
          busy={busy}
          error={formError}
          initial={mode.kind === 'edit'
            ? { email: mode.user.email ?? '', password: '', displayName: mode.user.displayName ?? '', role: mode.user.role, organisation: mode.user.organisation ?? '', lgas: mode.user.assignedLgas }
            : { email: '', password: '', displayName: '', role: 'AMBASSADOR', organisation: '', lgas: [] }}
          onSubmit={save}
          onCancel={() => { setMode(null); setFormError(null); }}
        />
      ) : (
        <Button variant="primary" onClick={() => { setMode({ kind: 'new' }); setMessage(null); }}>
          <UserPlus size={16} aria-hidden="true" />
          Add a person
        </Button>
      )}

      <div className="table-wrap" tabIndex={0}>
        <table className="data-table">
          <caption className="sr-only">Accounts</caption>
          <thead><tr><th scope="col">Person</th><th scope="col">Role</th><th scope="col">Ambassador ID</th><th scope="col">Areas</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {data.map((u) => (
              <tr key={u.id}>
                <td className="primary">{u.displayName ?? contactOf(u)}<span className="block text-xs font-normal text-fg-muted">{contactOf(u)}{u.organisation ? ` · ${u.organisation}` : ''}</span></td>
                <td>{USER_ROLE_LABELS[u.role]}</td>
                <td className="font-mono text-xs">{u.ambassadorCode ?? '-'}</td>
                <td>{u.assignedLgas.length ? u.assignedLgas.join(', ') : '-'}</td>
                <td>{u.isActive ? <Badge tone="success">Active</Badge> : <Badge>Switched off</Badge>}</td>
                <td>
                  <div className="flex gap-2">
                    <Button onClick={() => { setMode({ kind: 'edit', user: u }); setMessage(null); }}>Edit<span className="sr-only"> {contactOf(u)}</span></Button>
                    <Button onClick={() => (u.isActive ? setToggle(u) : void flip(u))} disabled={u.id === me?.id}>
                      {u.isActive ? 'Switch off' : 'Switch on'}<span className="sr-only"> {contactOf(u)}</span>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog open={!!toggle} title={`Switch off ${toggle ? contactOf(toggle) : ''}?`} confirmLabel="Switch off" tone="danger" loading={busy} onCancel={() => setToggle(null)} onConfirm={() => toggle && flip(toggle)}>
        <p className="text-sm">They will not be able to sign in. Their past records stay. You can switch the account back on later.</p>
      </ConfirmDialog>
    </div>
  );
}
