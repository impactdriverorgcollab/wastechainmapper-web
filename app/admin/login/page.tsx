'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { accessToken, user } = await login(email, password);
      // Store token in sessionStorage for MVP; replace with httpOnly cookie for production
      sessionStorage.setItem('ww_token', accessToken);
      sessionStorage.setItem('ww_user', JSON.stringify(user));
      router.push('/admin/queue');
    } catch (err: any) {
      setError(err.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="text-xs text-text-dim uppercase tracking-widest mb-1">DeltaFlow Atlas</p>
          <h1 className="text-lg font-semibold text-text">Admin access</h1>
          <p className="text-sm text-text-secondary mt-1">
            Restricted to authorised field verifiers and administrators.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-text-secondary mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-surface-1 border border-border px-3 py-2 text-sm text-text
                         focus:outline-none focus:border-text-secondary"
            />
          </div>

          <div>
            <label className="block text-xs text-text-secondary mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-surface-1 border border-border px-3 py-2 text-sm text-text
                         focus:outline-none focus:border-text-secondary"
            />
          </div>

          {error && (
            <p className="text-xs text-tier-high">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary justify-center py-2 disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
