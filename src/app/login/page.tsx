"use client";

import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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

const EASE = '0.5s cubic-bezier(0.32,0.72,0,1)';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<LoginMode>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const hasMode = mode !== null;
  const isTeacher = mode === 'teacher';

  useEffect(() => {
    if (mode !== null) {
      const t = setTimeout(() => setFormVisible(true), 150);
      return () => clearTimeout(t);
    }
    setFormVisible(false);
    return undefined;
  }, [mode]);

  const handleBack = () => {
    setFormVisible(false);
    setTimeout(() => { setMode(null); setEmail(''); setPassword(''); setError(''); }, 220);
  };

  const handleTeacherLogin = async (e: FormEvent) => {
    e.preventDefault(); setError(''); setIsLoading(true);
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

  const handleStudentLogin = async (e: FormEvent) => {
    e.preventDefault(); setError(''); setIsLoading(true);
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

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-black">

      {/* ── Full-screen photo ── */}
      <div className="absolute inset-0">
        <img
          src="/Gracie%20Barra.jpg"
          alt="Gracie Barra"
          className="h-full w-full object-cover object-center"
        />
        {/* Overlay darkens gradually from nothing to dark at bottom */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.92) 100%)' }}
        />
      </div>

      {/* ── Logo + Name — animates from center to top-left ── */}
      <div
        style={{
          position: 'absolute',
          zIndex: 20,
          /* Position: center when no mode, top-left when mode selected */
          top: hasMode ? '20px' : '36%',
          left: hasMode ? '20px' : '50%',
          transform: hasMode ? 'translate(0,0)' : 'translate(-50%,-50%)',
          transition: `top ${EASE}, left ${EASE}, transform ${EASE}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: hasMode ? '10px' : '14px', transition: `gap ${EASE}` }}>
          {/* Logo — shrinks */}
          <div style={{
            transition: `width ${EASE}, height ${EASE}`,
            width: hasMode ? '36px' : '56px',
            height: hasMode ? '36px' : '56px',
            flexShrink: 0,
          }}>
            <img src="/gb-logo.png" alt="GB" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          {/* Name — shrinks */}
          <div style={{ overflow: 'hidden' }}>
            <p style={{
              fontWeight: 700,
              color: 'white',
              letterSpacing: '0.18em',
              margin: 0,
              whiteSpace: 'nowrap',
              fontSize: hasMode ? '13px' : '22px',
              transition: `font-size ${EASE}`,
              lineHeight: 1.2,
            }}>
              GRACIE BARRA
            </p>
            <p style={{
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: '0.22em',
              margin: 0,
              whiteSpace: 'nowrap',
              fontSize: hasMode ? '9px' : '12px',
              transition: `font-size ${EASE}, opacity ${EASE}`,
              opacity: hasMode ? 0.6 : 1,
              lineHeight: 1.4,
            }}>
              CARNAXIDE &amp; QUEIJAS
            </p>
          </div>
        </div>
      </div>

      {/* ── Bottom panel — gradient, animates height ── */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10"
        style={{
          height: hasMode ? '70vh' : '30vh',
          transition: `height ${EASE}`,
          background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.55) 30%, rgba(0,0,0,0.88) 60%, rgba(0,0,0,0.96) 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '0 24px 48px',
        }}
      >
        {/* Role buttons */}
        <div style={{
          opacity: hasMode ? 0 : 1,
          transform: hasMode ? 'translateY(10px)' : 'translateY(0)',
          transition: `opacity 0.2s ease, transform 0.2s ease`,
          pointerEvents: hasMode ? 'none' : 'auto',
          position: hasMode ? 'absolute' : 'relative',
          width: 'calc(100% - 48px)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(['teacher', 'student'] as const).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setMode(role)}
                style={{
                  width: '100%',
                  borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.18)',
                  background: 'rgba(255,255,255,0.10)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  padding: '18px 24px',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'white',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                {role === 'teacher' ? 'Professor' : 'Aluno'}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <div style={{
          opacity: formVisible ? 1 : 0,
          transform: formVisible ? 'translateY(0)' : 'translateY(18px)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
          pointerEvents: formVisible ? 'auto' : 'none',
        }}>
          <p style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>
            {isTeacher ? 'Professor' : 'Aluno'}
          </p>
          <h2 style={{ margin: '0 0 20px', fontSize: '30px', fontWeight: 700, color: 'white' }}>Entrar</h2>

          <form onSubmit={isTeacher ? handleTeacherLogin : handleStudentLogin}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="Email"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.10)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  padding: '16px 20px',
                  fontSize: '16px',
                  color: 'white',
                  outline: 'none',
                }}
              />
              {isTeacher && (
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Palavra-passe"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(255,255,255,0.10)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    padding: '16px 20px',
                    fontSize: '16px',
                    color: 'white',
                    outline: 'none',
                  }}
                />
              )}

              {error && (
                <p style={{ margin: 0, padding: '10px 16px', borderRadius: '12px', background: 'rgba(200,29,37,0.3)', color: '#fca5a5', fontSize: '14px' }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%', borderRadius: '16px',
                  border: 'none',
                  background: '#c81d25',
                  padding: '17px 24px',
                  fontSize: '16px', fontWeight: 600,
                  color: 'white', cursor: 'pointer',
                  marginTop: '4px',
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                {isLoading ? 'A entrar...' : 'Entrar'}
              </button>

              <button
                type="button"
                onClick={handleBack}
                style={{
                  width: '100%', borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  padding: '16px 24px',
                  fontSize: '16px', fontWeight: 500,
                  color: 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                }}
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
