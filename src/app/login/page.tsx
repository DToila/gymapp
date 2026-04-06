"use client";

import { FormEvent, Suspense, useRef, useState } from 'react';
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

/* ── Snap positions as % of screen height the sheet occupies ── */
const SNAP_COLLAPSED = 0.38; // sheet takes 38% → shows more photo
const SNAP_EXPANDED  = 0.72; // sheet takes 72% → bigger sheet

function RoleSelectSheet({ onSelect }: { onSelect: (m: 'teacher' | 'student') => void }) {
  // 0 = collapsed (less sheet), 1 = expanded (more sheet)
  const [expanded, setExpanded] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ y: number; expanded: boolean } | null>(null);

  const snapFrac = expanded ? SNAP_EXPANDED : SNAP_COLLAPSED;

  /* Drag handlers */
  const onPointerDown = (e: React.PointerEvent) => {
    dragStart.current = { y: e.clientY, expanded };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const dy = dragStart.current.y - e.clientY; // positive = dragged up
    if (Math.abs(dy) > 30) {
      setExpanded(dy > 0);
      dragStart.current = null;
    }
  };

  const onPointerUp = () => { dragStart.current = null; };

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-black">
      {/* Full-screen photo */}
      <div className="absolute inset-0">
        <img
          src="/Gracie%20Barra.jpg"
          alt="Gracie Barra"
          className="h-full w-full object-cover object-center"
        />
        {/* Light gradient — not too dark */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.55) 100%)' }}
        />
      </div>

      {/* GB logo */}
      <div className="relative z-10 p-6 select-none">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-black/30 p-2 backdrop-blur-md ring-1 ring-white/20">
            <GBLogo size={34} />
          </div>
          <div>
            <p className="text-sm font-extrabold tracking-[0.2em] text-white drop-shadow">GRACIE BARRA</p>
            <p className="text-[10px] tracking-[0.22em] text-white/60 uppercase">Carnaxide &amp; Queijas</p>
          </div>
        </div>
      </div>

      {/* Draggable bottom sheet */}
      <div
        ref={sheetRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="absolute left-0 right-0 bottom-0 z-20 touch-none select-none"
        style={{
          height: `${snapFrac * 100}vh`,
          transition: 'height 0.35s cubic-bezier(0.32,0.72,0,1)',
          borderRadius: '2rem 2rem 0 0',
          background: 'rgba(10,10,10,0.72)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderBottom: 'none',
          display: 'flex',
          flexDirection: 'column',
          padding: '0 24px 40px',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-4 pb-2 cursor-grab active:cursor-grabbing shrink-0">
          <div style={{ width: 40, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.25)' }} />
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col justify-between overflow-hidden pt-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white leading-tight">Selecionar<br />Acesso</h1>
              <p className="mt-2 text-sm text-white/50">Entra como professor ou como aluno.</p>
            </div>
            <GBLogo size={38} />
          </div>

          <div className="space-y-3 pb-2">
            <button
              type="button"
              onClick={() => onSelect('teacher')}
              className="w-full rounded-2xl border-2 border-[#c81d25] bg-transparent px-6 py-5 text-lg font-semibold text-[#c81d25] transition hover:bg-[#c81d25]/15 active:scale-[0.98]"
            >
              Professor
            </button>
            <button
              type="button"
              onClick={() => onSelect('student')}
              className="w-full rounded-2xl border-2 border-[#c81d25] bg-transparent px-6 py-5 text-lg font-semibold text-[#c81d25] transition hover:bg-[#c81d25]/15 active:scale-[0.98]"
            >
              Aluno
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
    return <RoleSelectSheet onSelect={setMode} />;
  }

  /* ── Login form screen ── */
  const isTeacher = mode === 'teacher';

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#0b0b0b]">
      {/* Hero — compressed photo */}
      <div className="absolute inset-0">
        <img src="/Gracie%20Barra.jpg" alt="Gracie Barra" className="h-full w-full object-cover object-top" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0.95) 100%)' }} />
      </div>

      {/* GB logo top */}
      <div className="relative z-10 p-6 select-none">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white/10 p-2 backdrop-blur-sm ring-1 ring-white/20">
            <GBLogo size={36} />
          </div>
          <p className="text-xs font-bold tracking-[0.2em] text-white/70 uppercase">
            {isTeacher ? 'Área de Professores' : 'Área de Alunos'}
          </p>
        </div>
      </div>

      <div className="relative z-10 flex-1" />

      {/* Bottom sheet — dark form */}
      <div className="relative z-10 rounded-t-[2rem] bg-[#111] px-6 pb-12 pt-7 shadow-[0_-16px_50px_rgba(0,0,0,0.7)]"
        style={{ minHeight: '58vh' }}>
        <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-zinc-700" />

        <h2 className="mb-1 text-3xl font-bold text-white">
          {isTeacher ? 'Entrar como Professor' : 'Entrar como Aluno'}
        </h2>
        <p className="mb-7 text-sm text-zinc-400">
          {isTeacher ? 'Usa as tuas credenciais de staff.' : 'Usa o teu email de aluno.'}
        </p>

        <form className="space-y-4" onSubmit={isTeacher ? handleTeacherLogin : handleStudentLogin}>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-zinc-500">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="email@exemplo.com"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-3.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[#c81d25] transition"
            />
          </div>

          {isTeacher && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-zinc-500">Palavra-passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-3.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[#c81d25] transition"
              />
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-900/50 bg-red-900/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-3 pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-2xl bg-[#c81d25] px-6 py-5 text-lg font-semibold text-white transition hover:bg-[#a8141c] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'A entrar...' : 'Entrar'}
            </button>
            <button
              type="button"
              onClick={handleBack}
              className="w-full rounded-2xl border-2 border-zinc-700 bg-transparent px-6 py-5 text-lg font-semibold text-zinc-400 transition hover:border-zinc-500 active:scale-[0.98]"
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
