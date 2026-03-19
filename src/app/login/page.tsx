"use client";

import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import GBLogo from '@/components/GBLogo';
import { supabase } from '../../../lib/supabase';
import { getMemberByEmail } from '../../../lib/database';
import { writeStudentSessionId } from '@/components/student/studentSession';

type AppRole = 'admin' | 'staff' | 'coach';
type LoginMode = 'teacher' | 'student' | null;

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
  const [mode, setMode] = useState<LoginMode>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleBack = () => {
    setMode(null);
    setEmail('');
    setPassword('');
    setError('');
  };

  const handleTeacherLogin = async (event: FormEvent) => {
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

      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('cached_profile_role', role);
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

  const handleStudentLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const student = await getMemberByEmail(email);
      if (!student) {
        setError('Student profile not found. Please check your email.');
        return;
      }

      const status = String((student as { status?: unknown }).status || '').trim().toLowerCase();
      if (status === 'pending' || status === 'request') {
        setError('This student is still a request and cannot log in yet.');
        return;
      }

      writeStudentSessionId(student.id);
      router.replace('/student/dashboard');
    } catch (err) {
      console.error('Student login failed:', err);
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-zinc-100">
      <div className={`mx-auto flex min-h-screen w-full items-center px-6 ${mode === null ? 'max-w-4xl' : 'max-w-md'}`}>
        <div className={`w-full rounded-2xl border border-[#222] bg-[#121212] shadow-[0_12px_30px_rgba(0,0,0,0.45)] ${mode === null ? 'p-10' : 'p-6'}`}>
          <div className={`flex items-center gap-3 ${mode === null ? 'mb-8' : 'mb-6'}`}>
            <GBLogo size={mode === null ? 56 : 42} />
            <div>
              <p className={`${mode === null ? 'text-lg tracking-[0.2em]' : 'text-sm tracking-[0.18em]'} font-extrabold text-zinc-100`}>GRACIE BARRA</p>
              <p className={`${mode === null ? 'text-xs' : 'text-[10px]'} uppercase tracking-[0.2em] text-zinc-500`}>GymApp Login</p>
            </div>
          </div>

          {mode === null ? (
            <>
              <h1 className="mb-2 text-4xl font-bold text-white">Acesso</h1>
              <p className="mb-8 text-lg text-zinc-400">Escolhe o tipo de conta para entrar.</p>

              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setMode('teacher')}
                  className="w-full rounded-xl border border-[#c81d25] bg-[#c81d25] px-6 py-5 text-2xl font-semibold text-white transition hover:bg-[#a8141c]"
                >
                  Professor
                </button>
                <button
                  type="button"
                  onClick={() => setMode('student')}
                  className="w-full rounded-xl border border-[#2a2a2a] bg-[#141414] px-6 py-5 text-2xl font-semibold text-zinc-100 transition hover:border-[#c81d25]"
                >
                  Aluno
                </button>
              </div>
            </>
          ) : null}

          {mode === 'teacher' ? (
            <>
              <h1 className="mb-1 text-2xl font-bold text-white">Teacher Sign in</h1>
              <p className="mb-5 text-sm text-zinc-400">Use your staff account credentials.</p>

              <form className="space-y-3" onSubmit={handleTeacherLogin}>
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

                <button
                  type="button"
                  onClick={handleBack}
                  className="w-full rounded-xl border border-[#2a2a2a] bg-[#141414] px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500"
                >
                  Back
                </button>
              </form>
            </>
          ) : null}

          {mode === 'student' ? (
            <>
              <h1 className="mb-1 text-2xl font-bold text-white">Student Sign in</h1>
              <p className="mb-5 text-sm text-zinc-400">Use your student email.</p>

              <form className="space-y-3" onSubmit={handleStudentLogin}>
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

                {error ? (
                  <div className="rounded-xl border border-[#5b1f24] bg-[#2a1214] px-3 py-2 text-sm text-rose-300">{error}</div>
                ) : null}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-xl border border-[#c81d25] bg-[#c81d25] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#a8141c] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? 'Signing in...' : 'Enter'}
                </button>

                <button
                  type="button"
                  onClick={handleBack}
                  className="w-full rounded-xl border border-[#2a2a2a] bg-[#141414] px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500"
                >
                  Back
                </button>
              </form>
            </>
          ) : null}
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
