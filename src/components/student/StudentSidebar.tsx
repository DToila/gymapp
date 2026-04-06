"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import GBLogo from '@/components/GBLogo';
import { clearStudentSessionId } from './studentSession';
import {
  LayoutDashboard, Calendar, CheckSquare,
  CreditCard, Megaphone, User, LogOut, Menu, X
} from 'lucide-react';

export type StudentNavKey = 'dashboard' | 'schedule' | 'attendance' | 'payments' | 'announcements' | 'profile';

interface StudentSidebarProps {
  ativo: StudentNavKey;
  memberName?: string;
}

export default function StudentSidebar({ ativo, memberName = 'Aluno' }: StudentSidebarProps) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (drawerOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const navItems = [
    { key: 'dashboard',     label: 'Dashboard',   Icon: LayoutDashboard, path: '/student/dashboard' },
    { key: 'schedule',      label: 'Horário',      Icon: Calendar,        path: '/student/schedule' },
    { key: 'attendance',    label: 'Presenças',    Icon: CheckSquare,     path: '/student/attendance' },
    { key: 'payments',      label: 'Pagamentos',   Icon: CreditCard,      path: '/student/payments' },
    { key: 'announcements', label: 'Anúncios',     Icon: Megaphone,       path: '/student/announcements' },
    { key: 'profile',       label: 'Perfil',       Icon: User,            path: '/student/profile' },
  ];

  const navigate = (path: string) => {
    setDrawerOpen(false);
    router.push(path);
  };

  const handleLogout = () => {
    setDrawerOpen(false);
    clearStudentSessionId();
    router.push('/');
  };

  const initials = memberName.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'AL';

  const NavContent = () => (
    <>
      <nav className="flex-1 overflow-y-auto px-4 py-3">
        <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-600">Menu</p>

        {navItems.map((item) => {
          const isActive = ativo === item.key;
          return (
            <div
              key={item.key}
              onClick={() => navigate(item.path)}
              className={`mb-1 flex cursor-pointer items-center rounded-xl px-3 py-3.5 transition-colors ${
                isActive ? 'bg-[#1e1e1e] text-white' : 'text-zinc-400 hover:bg-[#1a1a1a] hover:text-zinc-100'
              }`}
            >
              <span className="flex items-center gap-3.5">
                <item.Icon size={20} className={isActive ? 'text-[#c81d25]' : 'text-zinc-500'} />
                <span className="text-[17px] font-medium">{item.label}</span>
              </span>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-[#1e1e1e] px-4 py-4">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#c81d25] text-sm font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold text-zinc-100">{memberName}</div>
            <div className="text-xs text-zinc-500">Aluno</div>
          </div>
          <button
            onClick={handleLogout}
            title="Sair"
            className="shrink-0 rounded-lg p-2 text-zinc-500 transition hover:bg-[#1e1e1e] hover:text-zinc-200"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* ── Mobile top bar ── */}
      <div className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-[#1e1e1e] bg-[#111] px-4 lg:hidden">
        <button
          onClick={() => setDrawerOpen(true)}
          className="rounded-lg p-2 text-zinc-400 transition hover:bg-[#1e1e1e] hover:text-white"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2">
          <GBLogo size={28} />
          <span className="text-sm font-bold text-white">Gracie Barra</span>
        </div>
        <div className="w-10" />
      </div>

      {/* ── Mobile drawer backdrop ── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Mobile drawer ── */}
      <div className={`fixed left-0 top-0 z-50 flex h-full w-[300px] flex-col bg-[#111] transition-transform duration-300 lg:hidden ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between border-b border-[#1e1e1e] px-4 py-4">
          <div className="flex items-center gap-3">
            <GBLogo size={36} />
            <div>
              <div className="text-sm font-bold text-white leading-tight">Gracie Barra</div>
              <div className="text-xs text-zinc-500 leading-tight">Área do Aluno</div>
            </div>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-[#1e1e1e] hover:text-zinc-200"
          >
            <X size={18} />
          </button>
        </div>
        <NavContent />
      </div>

      {/* ── Desktop sidebar ── */}
      <aside className="sticky top-0 z-10 hidden h-screen w-[240px] min-w-[240px] flex-col bg-[#111] lg:flex">
        <div className="border-b border-[#1e1e1e] px-5 py-5">
          <div className="flex items-center gap-3">
            <GBLogo size={36} />
            <div>
              <div className="text-sm font-bold text-white leading-tight">Gracie Barra</div>
              <div className="text-xs text-zinc-500 leading-tight">Área do Aluno</div>
            </div>
          </div>
        </div>
        <NavContent />
      </aside>
    </>
  );
}
