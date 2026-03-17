"use client";

import { useRouter } from 'next/navigation';
import GBLogo from '@/components/GBLogo';

export type StudentNavKey = 'dashboard' | 'schedule' | 'attendance' | 'payments' | 'announcements' | 'profile';

export default function StudentSidebar({ active }: { active: StudentNavKey }) {
  const router = useRouter();

  const navItems: Array<{ key: StudentNavKey; label: string; icon: string; path: string }> = [
    { key: 'dashboard', label: 'Dashboard', icon: '◔', path: '/student/dashboard' },
    { key: 'schedule', label: 'Horário', icon: '📅', path: '/student/schedule' },
    { key: 'attendance', label: 'Presenças', icon: '◍', path: '/student/attendance' },
    { key: 'payments', label: 'Pagamentos', icon: '▣', path: '/student/payments' },
    { key: 'announcements', label: 'Anúncios', icon: '📣', path: '/student/announcements' },
    { key: 'profile', label: 'Perfil', icon: '◎', path: '/student/profile' },
  ];

  return (
    <aside className="sticky top-0 z-10 flex h-screen w-[260px] min-w-[260px] flex-col border-r border-[#222] bg-[#0d0d0d]">
      <div className="border-b border-[#202020] px-5 py-5">
        <div className="mb-2 flex items-center gap-3">
          <GBLogo size={46} />
          <div>
            <div className="text-sm font-extrabold tracking-[0.22em] text-zinc-100">GRACIE BARRA</div>
            <div className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">Student Area</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = active === item.key;
          return (
            <div
              key={item.key}
              onClick={() => router.push(item.path)}
              className={`mb-1 flex cursor-pointer items-center rounded-lg px-3 py-2.5 text-sm transition ${
                isActive
                  ? 'border-l-2 border-[#c81d25] bg-[#2a1113] text-white'
                  : 'text-zinc-400 hover:bg-[#161616] hover:text-zinc-200'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-xs">{item.icon}</span>
                <span>{item.label}</span>
              </span>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
