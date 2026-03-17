"use client";

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StudentSidebar, { StudentNavKey } from './StudentSidebar';
import { clearStudentSessionId } from './studentSession';
import { useStudentMember } from './useStudentMember';

export default function StudentShell({
  active,
  title,
  subtitle,
  rightActions,
  children,
}: {
  active: StudentNavKey;
  title: string;
  subtitle: string;
  rightActions?: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();
  const { member, loading } = useStudentMember();

  useEffect(() => {
    if (!loading && !member) {
      router.push('/');
    }
  }, [loading, member, router]);

  if (loading || !member) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0b0b] text-zinc-300">
        Loading student area...
      </div>
    );
  }

  const initials = member.name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-[#0b0b0b] text-zinc-100">
      <StudentSidebar active={active} />

      <main className="flex-1 p-6 lg:p-8">
        <div className="mx-auto max-w-[1320px]">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <label className="flex w-full max-w-[500px] items-center gap-2 rounded-full border border-[#222] bg-[#121212] px-4 py-2.5 shadow-[0_6px_22px_rgba(0,0,0,0.28)]">
              <span className="text-zinc-500">⌕</span>
              <input
                placeholder="Search..."
                className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 outline-none"
              />
            </label>

            <div className="flex items-center gap-2">
              {rightActions}
              <button className="grid h-10 w-10 place-items-center rounded-xl border border-[#252525] bg-[#141414] text-zinc-200">🔔</button>
              <button
                className="rounded-xl border border-[#252525] bg-[#141414] px-3 py-2 text-xs text-zinc-200"
                onClick={() => {
                  clearStudentSessionId();
                  router.push('/');
                }}
              >
                Logout
              </button>
            </div>
          </div>

          <header className="mb-6 rounded-2xl border border-[#222] bg-[#121212] p-4 shadow-[0_8px_22px_rgba(0,0,0,0.35)]">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-full border border-[#2a2a2a] bg-[#1a1a1a] text-lg font-bold text-zinc-200">
                {initials}
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white">{title}</h1>
                <p className="mt-1 text-lg text-zinc-400">{subtitle}</p>
              </div>
            </div>
          </header>

          {children}
        </div>
      </main>
    </div>
  );
}
