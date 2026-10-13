import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '@/components/admin/LoginForm';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <main id="main" className="page flex min-h-dvh items-center justify-center py-12">
      <div className="w-full max-w-sm">
        <p className="text-sm text-fg-muted">WasteChainMapper</p>
        <h1 className="mt-1 text-xl font-semibold">Sign in to review reports</h1>
        <p className="mb-6 mt-2 text-base text-fg-muted">
          For field verifiers and administrators. If you need an account, ask an administrator.
        </p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
