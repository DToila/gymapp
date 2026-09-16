"use client";

import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { getMemberByEmail } from '../../../lib/database';
import { writeStudentSessionId } from '@/components/student/studentSession';
import AuthHero from '@/components/auth/AuthHero';

type AppRole = 'admin' | 'staff' | 'coach';
type LoginMode = 'teacher' | 'student' | null;

const isRole = (value: string): value is AppRole =>
  value === 'admin' || value === 'staff' || value === 'coach';

const roleFromMetadata = (metadata: unknown): AppRole | null => {
  if (!metadata || typeof metadata !== 'object') return null;
  const value = (metadata as { role?: unknown }).role;
  return typeof value === 'string' && isRole(value) ? value : null;
};

const roleFromUser = (user: { user_metadata?: unknown; app_metadata?: unknown }): AppRole | null =>
  roleFromMetadata(user.user_metadata) || roleFromMetadata(user.app_metadata);

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const getSafeNextPath = (value: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('//')) {
    return null;
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

const inputClass =
  "w-full rounded-xl border border-[#2a2a2a] bg-[#141414] px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-[#c81d25]";
const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<LoginMode>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isTeacher = mode === 'teacher';

  const handleBack = () => {
    setMode(null);
    setEmail('');
    setPassword('');
    setError('');
  };

  const handleTeacherLogin = async (e: FormEvent) => {
    e.preventDefault(); setError(''); setIsLoading(true);
    try {
      const normalizedEmail = normalizeEmail(email);
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (signInError) { setError(signInError.message || 'Credenciais inválidas.'); return; }
      const user = data.user;
      if (!user) { setError('Nenhum utilizador retornado.'); return; }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      const role = (profile?.role && isRole(profile.role) ? profile.role : null) || roleFromUser(user);
      if (!role) { setError('Função não encontrada. Contacta o administrador.'); await supabase.auth.signOut(); return; }
      if (typeof window !== 'undefined') window.sessionStorage.setItem('cached_profile_role', role);
      const nextPath = getSafeNextPath(searchParams.get('next'));
      router.replace(nextPath || '/dashboard');
    } catch { setError('Falha no login. Tenta novamente.'); }
    finally { setIsLoading(false); }
  };

  const handleStudentLogin = async (e: FormEvent) => {
    e.preventDefault(); setError(''); setIsLoading(true);
    try {
      const normalizedEmail = normalizeEmail(email);
      const student = await getMemberByEmail(normalizedEmail);
      if (!student) { setError('Perfil não encontrado. Verifica o teu email.'); return; }
      const status = String((student as { status?: unknown }).status || '').trim().toLowerCase();
      if (status === 'pendente' || status === 'pedido') { setError('Este aluno ainda não tem acesso.'); return; }
      writeStudentSessionId(student.id);
      router.replace('/student/dashboard');
    } catch { setError('Falha no login. Tenta novamente.'); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="grid h-[100svh] grid-cols-1 grid-rows-[auto_1fr] overflow-hidden bg-[#0b0b0b] lg:h-auto lg:min-h-screen lg:grid-cols-2 lg:grid-rows-1 lg:overflow-visible">
      <AuthHero />

      {/* ── Content panel ── */}
      <div className="flex min-h-0 flex-col overflow-y-auto p-6 sm:p-10 lg:p-14">
        {mode ? (
          <button
            type="button"
            onClick={handleBack}
            className="mb-6 self-start text-sm font-medium text-[#c81d25] transition hover:text-[#ef3a43]"
          >
            ← Voltar
          </button>
        ) : null}

        {!mode ? (
          <div>
            <div className="mb-8">
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-500">Entrar</p>
              <h2 className="text-4xl font-black leading-tight text-white sm:text-5xl lg:hidden">Bem-vindo</h2>
              <h2 className="hidden text-4xl font-black leading-tight text-white sm:text-5xl lg:block">
                Bem-vindo à <span className="text-[#c81d25]">Gracie Barra</span>
                <br />
                Carnaxide &amp; Queijas
              </h2>
            </div>

            <div className="grid max-w-xl gap-3">
              <button
                type="button"
                onClick={() => setMode('teacher')}
                className="w-full rounded-xl border border-[#2a2a2a] bg-[#141414] px-4 py-3.5 text-left text-sm font-bold uppercase tracking-widest text-white transition hover:border-[#c81d25]"
              >
                Instrutor
              </button>
              <button
                type="button"
                onClick={() => setMode('student')}
                className="w-full rounded-xl border border-[#2a2a2a] bg-[#141414] px-4 py-3.5 text-left text-sm font-bold uppercase tracking-widest text-white transition hover:border-[#c81d25]"
              >
                Aluno
              </button>
              <button
                type="button"
                onClick={() => router.push('/register')}
                className="mt-2 w-full rounded-xl bg-[#c81d25] px-4 py-3.5 text-left text-sm font-bold uppercase tracking-widest text-white transition hover:bg-[#a8141c]"
              >
                Aluno Novo
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                {isTeacher ? 'Instrutor' : 'Aluno'}
              </p>
              <h2 className="text-3xl font-black leading-tight text-white sm:text-4xl">Entrar</h2>
            </div>

            {error ? (
              <div className="mb-4 max-w-xl rounded-xl border border-[#5b1f24] bg-[#2a1214] px-4 py-3 text-sm text-rose-300">
                {error}
              </div>
            ) : null}

            <form onSubmit={isTeacher ? handleTeacherLogin : handleStudentLogin} className="grid max-w-xl gap-4">
              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className={inputClass}
                />
              </div>

              {isTeacher ? (
                <div>
                  <label className={labelClass}>Palavra-passe</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className={inputClass}
                  />
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 w-full rounded-xl bg-[#c81d25] px-4 py-3 text-sm font-bold uppercase tracking-widest text-white transition hover:bg-[#a8141c] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? 'A entrar...' : 'Entrar'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-[#0b0b0b]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
