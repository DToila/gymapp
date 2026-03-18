"use client";

import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import GBLogo from '@/components/GBLogo';
import { supabase } from '../../../lib/supabase';

type AppRole = 'admin' | 'staff' | 'coach';

const isRole = (value: string): value is AppRole => {
  return value === 'admin' || value === 'staff' || value === 'coach';
};

const roleFromMetadata = (metadata: unknown): AppRole | null => {
  if (!metadata || typeof metadata !== 'object') return null;
  const value = (metadata as { role?: unknown }).role;
  if (typeof value === 'string' && isRole(value)) {
    return value;
  }
  return null;
};

const roleFromUser = (user: { user_metadata?: unknown; app_metadata?: unknown }): AppRole | null => {
  return roleFromMetadata(user.user_metadata) || roleFromMetadata(user.app_metadata);
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message || 'Invalid credentials.');
        return;
      }

      const user = data.user;
      if (!user) {
        setError('No user returned by authentication.');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const profileRole = profile?.role && isRole(profile.role) ? profile.role : null;
      const metadataRole = roleFromUser(user);
      const role = profileRole || metadataRole;

      if (!role) {
        setError('Profile role not found. Contact admin.');
        await supabase.auth.signOut();
        return;
      }

      const nextPath = searchParams.get('next');
      if (nextPath && nextPath.startsWith('/')) {
        router.replace(nextPath);
        return;
      }

      router.replace('/dashboard');
    } catch (err) {
      console.error('Teacher login failed:', err);
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-zinc-100">
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-6">
        <div className="w-full rounded-2xl border border-[#222] bg-[#121212] p-6 shadow-[0_12px_30px_rgba(0,0,0,0.45)]">
          <div className="mb-6 flex items-center gap-3">
            <GBLogo size={42} />
            <div>
              <p className="text-sm font-extrabold tracking-[0.18em] text-zinc-100">GRACIE BARRA</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Teacher Login</p>
            </div>
          </div>

          <h1 className="mb-1 text-2xl font-bold text-white">Sign in</h1>
          <p className="mb-5 text-sm text-zinc-400">Use your teacher account credentials.</p>

          <form className="space-y-3" onSubmit={handleLogin}>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-[0.12em] text-zinc-500">Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-xl border border-[#2a2a2a] bg-[#141414] px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-[#c81d25]"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-[0.12em] text-zinc-500">Password</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-xl border border-[#2a2a2a] bg-[#141414] px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-[#c81d25]"
              />
            </div>

            {error ? (
              <div className="rounded-xl border border-[#5b1f24] bg-[#2a1214] px-3 py-2 text-sm text-rose-300">{error}</div>
            ) : null}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl border border-[#c81d25] bg-[#c81d25] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#a8141c] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0b0b0b] text-zinc-100">
          <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-6">
            <div className="w-full rounded-2xl border border-[#222] bg-[#121212] p-6 text-sm text-zinc-400">Loading login...</div>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
