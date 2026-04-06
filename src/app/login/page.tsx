"use client";

import { FormEvent, Suspense, useEffect, useState } from 'react';
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
  const [formVisible, setFormVisible] = useState(false); // delayed for animation
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const hasMode = mode !== null;

  // Small delay so panel expands before form appears
  useEffect(() => {
    if (mode !== null) {
      const t = setTimeout(() => setFormVisible(true), 120);
      return () => clearTimeout(t);
    }
    setFormVisible(false);
    return undefined;
  }, [mode]);

  const handleBack = () => {
    setFormVisible(false);
    setTimeout(() => { setMode(null); setEmail(''); setPassword(''); setError(''); }, 200);
  };

  const handleTeacherLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError(''); setIsLoading(true);
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
    setError(''); setIsLoading(true);
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

  const isTeacher = mode === 'teacher';

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-black">

      {/* ── Full-screen photo ── */}
      <div className="absolute inset-0">
        <img
          src="/Gracie%20Barra.jpg"
          alt="Gracie Barra"
          className="h-full w-full object-cover object-center"
        />
      </div>

      {/* ── GB logo top-left ── */}
      <div className="absolute left-0 top-0 z-20 p-6">
        <GBLogo size={48} />
      </div>

      {/* ── Bottom panel — always present, animates height ── */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10"
        style={{
          height: hasMode ? '72vh' : '28vh',
          transition: 'height 0.45s cubic-bezier(0.32,0.72,0,1)',
          /* Gradient: fully transparent at top, dark at bottom */
          background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.6) 30%, rgba(0,0,0,0.88) 60%, rgba(0,0,0,0.96) 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '0 24px 48px',
        }}
      >
        {/* ── Role buttons (hide when mode selected) ── */}
        <div
          style={{
            opacity: hasMode ? 0 : 1,
            transform: hasMode ? 'translateY(12px)' : 'translateY(0)',
            transition: 'opacity 0.2s ease, transform 0.2s ease',
            pointerEvents: hasMode ? 'none' : 'auto',
            position: hasMode ? 'absolute' : 'relative',
            width: '100%',
          }}
        >
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setMode('teacher')}
              style={{
                width: '100%', borderRadius: '16px',
                border: '2px solid rgba(0,0,0,0.75)',
                background: 'rgba(255,255,255,0.82)',
                backdropFilter: 'blur(8px)',
                padding: '18px 24px',
                fontSize: '17px', fontWeight: 600,
                color: '#0a0a0a',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
            >
              Professor
            </button>
            <button
              type="button"
              onClick={() => setMode('student')}
              style={{
                width: '100%', borderRadius: '16px',
                border: '2px solid rgba(0,0,0,0.75)',
                background: 'rgba(255,255,255,0.82)',
                backdropFilter: 'blur(8px)',
                padding: '18px 24px',
                fontSize: '17px', fontWeight: 600,
                color: '#0a0a0a',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
            >
              Aluno
            </button>
          </div>
        </div>

        {/* ── Form (fade in after mode selected) ── */}
        <div
          style={{
            opacity: formVisible ? 1 : 0,
            transform: formVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
            pointerEvents: formVisible ? 'auto' : 'none',
          }}
        >
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-white/40">
            {isTeacher ? 'Professor' : 'Aluno'}
          </p>
          <h2 className="mb-6 text-3xl font-bold text-white">
            Entrar
          </h2>

          <form className="space-y-3" onSubmit={isTeacher ? handleTeacherLogin : handleStudentLogin}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="Email"
              className="w-full rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-base text-white outline-none placeholder:text-white/30 focus:border-white/30 focus:bg-white/15 transition backdrop-blur-sm"
            />

            {isTeacher && (
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Palavra-passe"
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-base text-white outline-none placeholder:text-white/30 focus:border-white/30 focus:bg-white/15 transition backdrop-blur-sm"
              />
            )}

            {error && (
              <p className="rounded-xl bg-red-900/40 px-4 py-2.5 text-sm text-red-300">{error}</p>
            )}

            <div className="space-y-2 pt-1">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-2xl bg-[#c81d25] px-6 py-4 text-base font-semibold text-white transition hover:bg-[#a8141c] active:scale-[0.98] disabled:opacity-60"
              >
                {isLoading ? 'A entrar...' : 'Entrar'}
              </button>
              <button
                type="button"
                onClick={handleBack}
                className="w-full rounded-2xl border border-white/15 bg-white/8 px-6 py-4 text-base font-semibold text-white/60 transition hover:bg-white/10 active:scale-[0.98]"
              >
                Voltar
              </button>
            </div>
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
        <div className="flex min-h-[100dvh] items-center justify-center bg-black">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
