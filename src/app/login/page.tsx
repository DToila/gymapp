"use client";

import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import GBLogo from '@/components/GBLogo';
import { supabase } from '../../../lib/supabase';
import { getMemberByEmail } from '../../../lib/database';
import { writeStudentSessionId } from '@/components/student/studentSession';

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
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) { setError(signInError.message || 'Credenciais inválidas.'); return; }
      const user = data.user;
      if (!user) { setError('Nenhum utilizador retornado.'); return; }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      const role = (profile?.role && isRole(profile.role) ? profile.role : null) || roleFromUser(user);
      if (!role) { setError('Função não encontrada. Contacta o administrador.'); await supabase.auth.signOut(); return; }
      if (typeof window !== 'undefined') window.sessionStorage.setItem('cached_profile_role', role);
      const nextPath = searchParams.get('next');
      router.replace(nextPath?.startsWith('/') ? nextPath : '/dashboard');
    } catch { setError('Falha no login. Tenta novamente.'); }
    finally { setIsLoading(false); }
  };

  const handleStudentLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const student = await getMemberByEmail(email);
      if (!student) { setError('Perfil não encontrado. Verifica o teu email.'); return; }
      const status = String((student as { status?: unknown }).status || '').trim().toLowerCase();
      if (status === 'pendente' || status === 'pedido') { setError('Este aluno ainda não tem acesso.'); return; }
      writeStudentSessionId(student.id);
      router.replace('/student/dashboard');
    } catch { setError('Falha no login. Tenta novamente.'); }
    finally { setIsLoading(false); }
  };

  /* ── Selection screen ── */
  if (mode === null) {
    return (
      <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#0b0b0b]">
        {/* Hero */}
        <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden">
          {/* Gradient background */}
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse 80% 80% at 50% 30%, #c81d25 0%, #7a1118 45%, #0b0b0b 100%)',
            }}
          />
          {/* Subtle texture overlay */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '12px 12px' }}
          />
          {/* Branding */}
          <div className="relative z-10 flex flex-col items-center select-none">
            <div className="mb-5 rounded-2xl bg-white/10 p-5 backdrop-blur-sm ring-1 ring-white/20">
              <GBLogo size={72} />
            </div>
            <p className="text-lg font-extrabold tracking-[0.22em] text-white">GRACIE BARRA</p>
            <p className="mt-1 text-xs tracking-[0.25em] text-white/50 uppercase">Carnaxide &amp; Queijas</p>
          </div>
        </div>

        {/* Bottom sheet */}
        <div className="relative z-10 rounded-t-[2rem] bg-white px-6 pb-10 pt-7 shadow-[0_-12px_40px_rgba(0,0,0,0.4)]">
          {/* Handle */}
          <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-gray-200" />

          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Selecionar Acesso</h1>
              <p className="mt-1.5 text-sm text-gray-400">
                Entra como professor ou como aluno.
              </p>
            </div>
            <GBLogo size={38} />
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setMode('teacher')}
              className="w-full rounded-2xl border-2 border-[#c81d25] bg-white px-6 py-4 text-base font-semibold text-[#c81d25] transition hover:bg-[#c81d25]/5 active:scale-[0.98]"
            >
              Professor
            </button>
            <button
              type="button"
              onClick={() => setMode('student')}
              className="w-full rounded-2xl border-2 border-[#c81d25] bg-white px-6 py-4 text-base font-semibold text-[#c81d25] transition hover:bg-[#c81d25]/5 active:scale-[0.98]"
            >
              Aluno
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Login form screen ── */
  const isTeacher = mode === 'teacher';

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#0b0b0b]">
      {/* Hero — compressed */}
      <div className="relative flex items-center justify-center overflow-hidden" style={{ minHeight: '28vh' }}>
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 100% 160% at 50% -20%, #c81d25 0%, #7a1118 50%, #0b0b0b 100%)' }}
        />
        <div className="relative z-10 flex flex-col items-center select-none py-8">
          <div className="mb-3 rounded-xl bg-white/10 p-3.5 backdrop-blur-sm ring-1 ring-white/20">
            <GBLogo size={44} />
          </div>
          <p className="text-xs font-bold tracking-[0.2em] text-white/70 uppercase">
            {isTeacher ? 'Área de Professores' : 'Área de Alunos'}
          </p>
        </div>
      </div>

      {/* Bottom sheet — form */}
      <div className="relative z-10 flex-1 rounded-t-[2rem] bg-white px-6 pb-10 pt-7 shadow-[0_-12px_40px_rgba(0,0,0,0.4)]">
        <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-gray-200" />

        <h2 className="mb-1 text-2xl font-bold text-gray-900">
          {isTeacher ? 'Entrar como Professor' : 'Entrar como Aluno'}
        </h2>
        <p className="mb-6 text-sm text-gray-400">
          {isTeacher ? 'Usa as tuas credenciais de staff.' : 'Usa o teu email de aluno.'}
        </p>

        <form className="space-y-4" onSubmit={isTeacher ? handleTeacherLogin : handleStudentLogin}>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-gray-400">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="email@exemplo.com"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-300 focus:border-[#c81d25] focus:ring-2 focus:ring-[#c81d25]/10 transition"
            />
          </div>

          {isTeacher && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-gray-400">
                Palavra-passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-300 focus:border-[#c81d25] focus:ring-2 focus:ring-[#c81d25]/10 transition"
              />
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-3 pt-1">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-2xl bg-[#c81d25] px-6 py-4 text-base font-semibold text-white transition hover:bg-[#a8141c] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'A entrar...' : 'Entrar'}
            </button>
            <button
              type="button"
              onClick={handleBack}
              className="w-full rounded-2xl border-2 border-gray-200 bg-white px-6 py-4 text-base font-semibold text-gray-500 transition hover:border-gray-300 active:scale-[0.98]"
            >
              Voltar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-[#0b0b0b]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#c81d25] border-t-transparent" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
