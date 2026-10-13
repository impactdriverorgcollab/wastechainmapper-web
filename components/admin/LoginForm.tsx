'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ApiError, login } from '@/lib/api';
import { readSession, saveSession, useSession } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);
  const formErrorRef = useRef<HTMLParagraphElement>(null);
  const emailRef = useRef<HTMLDivElement>(null);

  // Only follow a return address that stays inside the admin area.
  const next = params.get('next');
  const destination = next && next.startsWith('/admin') && !next.startsWith('//') ? next : '/admin/queue';

  // Someone who is already signed in has no use for this page.
  const session = useSession();
  useEffect(() => {
    if (session.token) router.replace(destination);
  }, [session.token, destination, router]);

  function focusFirstError(found: typeof errors) {
    requestAnimationFrame(() => {
      if (found.email) emailRef.current?.querySelector('input')?.focus();
      else if (found.password) document.getElementById('password-field')?.focus();
      else formErrorRef.current?.focus();
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const found: typeof errors = {};
    if (!email.trim()) found.email = 'Enter your email address.';
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) found.email = 'Enter an email address like name@example.org.';
    if (!password) found.password = 'Enter your password.';
    setErrors(found);
    if (found.email || found.password) { focusFirstError(found); return; }

    setLoading(true);
    try {
      const { accessToken, user } = await login(email.trim(), password);
      saveSession(accessToken, user);
      if (!readSession()) {
        const blocked = { form: 'Your browser is blocking site storage, so sign-in cannot be kept. Allow storage for this site or use a normal window.' };
        setErrors(blocked);
        focusFirstError(blocked);
        return;
      }
      router.replace(destination);
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      const form =
        status === 401 ? 'The email or password is not right. Check both and try again.'
        : status === 429 ? 'Too many attempts. Wait a few minutes before trying again.'
        : err instanceof ApiError ? err.message
        : 'Sign-in failed. Try again.';
      // Whatever was typed stays in the fields.
      setErrors({ form });
      focusFirstError({ form });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {errors.form && (
        <p ref={formErrorRef} tabIndex={-1} role="alert" className="rounded bg-danger-soft px-3 py-3 text-sm text-danger">
          {errors.form}
        </p>
      )}

      <div ref={emailRef}>
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="username"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          required
        />
      </div>

      <PasswordField value={password} onChange={setPassword} error={errors.password} />

      <Button type="submit" variant="primary" loading={loading} className="w-full">
        {loading ? 'Signing in' : 'Sign in'}
      </Button>
    </form>
  );
}

function PasswordField({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <div>
      <label htmlFor="password-field" className="label">Password</label>
      <input
        id="password-field"
        type="password"
        name="password"
        autoComplete="current-password"
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? 'password-field-error' : undefined}
        required
      />
      {error && <p id="password-field-error" className="field-error">{error}</p>}
    </div>
  );
}
