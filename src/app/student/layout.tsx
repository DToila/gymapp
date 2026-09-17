"use client";

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StudentSidebar from '@/components/student/StudentSidebar';
import { useStudentMember } from '@/components/student/useStudentMember';

// A real Next.js layout instead of each page rendering its own <StudentShell>
// (which used to include the sidebar) — this persists across navigations
// within /student/*, so clicking a menu item no longer unmounts and
// remounts the whole sidebar/frame, and the "A carregar..." auth gate below
// only ever blocks once per session instead of on every single page visit.
export default function StudentLayout({ children }: { children: ReactNode }) {
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
      <StudentSidebar memberName={member.name} />
      <main className="flex-1 min-w-0 p-3 pt-16 sm:p-5 sm:pt-16 lg:p-7">
        {children}
      </main>
    </div>
  );
}
