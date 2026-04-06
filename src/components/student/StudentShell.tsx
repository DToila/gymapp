"use client";

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StudentSidebar, { StudentNavKey } from './StudentSidebar';
import { useStudentMember } from './useStudentMember';

export default function StudentShell({
  ativo,
  title,
  subtitle,
  rightActions,
  children,
}: {
  ativo: StudentNavKey;
  title: string;
  subtitle?: string;
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
        A carregar...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0b0b0b] text-zinc-100">
      <StudentSidebar ativo={ativo} memberName={member.name} />

      <main className="flex-1 p-3 pt-16 sm:p-5 sm:pt-16 lg:p-7">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-black leading-tight text-white">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
          </div>
          {rightActions && <div className="flex gap-2">{rightActions}</div>}
        </header>
        {children}
      </main>
    </div>
  );
}
