"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import GBLogo from '@/components/GBLogo';
import { exportDDTxt, exportDDExcel } from '../../../lib/ddExport';
import { supabase } from '../../../lib/supabase';
import {
  LayoutDashboard, Calendar, Users, CheckSquare,
  Megaphone, CreditCard, Settings, Download, UserPlus,
  LogOut, ChevronDown, Menu, X
} from 'lucide-react';

type AppRole = 'admin' | 'staff' | 'coach';

const isRole = (value: string): value is AppRole => value === 'admin' || value === 'staff' || value === 'coach';

const roleFromMetadata = (metadata: unknown): AppRole | null => {
  if (!metadata || typeof metadata !== 'object') return null;
  const roleValue = (metadata as { role?: unknown }).role;
  return typeof roleValue === 'string' && isRole(roleValue) ? roleValue : null;
};

const fullNameFromMetadata = (metadata: unknown): string | null => {
  if (!metadata || typeof metadata !== 'object') return null;
  const value = (metadata as { full_name?: unknown }).full_name;
  return typeof value === 'string' && value.trim() ? value : null;
};

interface TeacherSidebarProps {
  ativo: 'dashboard' | 'schedule' | 'members' | 'attendance' | 'leads' | 'payments' | 'settings';
  requestsCount?: number;
  role?: AppRole;
  onLogout?: () => void;
  onExportTxt?: () => void;
  onExportExcel?: () => void;
  onAddMember?: () => void;
}

export default function TeacherSidebar({ ativo, requestsCount = 0, role: roleProp, onLogout, onExportTxt, onExportExcel, onAddMember }: TeacherSidebarProps) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const [profileRole, setProfileRole] = useState<AppRole>(() => {
    if (roleProp) return roleProp;
    if (typeof window !== 'undefined') {
      const cached = window.sessionStorage.getItem('cached_profile_role');
      if (cached && isRole(cached)) return cached;
    }
    return 'coach';
  });
  const [profileName, setProfileName] = useState('Professor');
  const exportTriggerRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (roleProp) {
      setProfileRole(roleProp);
      if (typeof window !== 'undefined') window.sessionStorage.setItem('cached_profile_role', roleProp);
      return;
    }
    let cancelled = false;
    const loadProfile = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;
        if (!user) return;
        const { data } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).maybeSingle();
        const resolvedRole =
          (data?.role && isRole(data.role) ? data.role : null) ||
          roleFromMetadata(user.user_metadata) ||
          roleFromMetadata(user.app_metadata) || 'coach';
        if (!cancelled) setProfileRole(resolvedRole);
        const name = data?.full_name || fullNameFromMetadata(user.user_metadata) || fullNameFromMetadata(user.app_metadata) || 'Professor';
        if (!cancelled) setProfileName(name);
        if (typeof window !== 'undefined') window.sessionStorage.setItem('cached_profile_role', resolvedRole);
      } catch (e) { console.error(e); }
    };
    loadProfile();
    return () => { cancelled = true; };
  }, [roleProp]);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (
        exportRef.current && !exportRef.current.contains(e.target as Node) &&
        exportTriggerRef.current && !exportTriggerRef.current.contains(e.target as Node)
      ) setShowExportDropdown(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // Lock body scroll when drawer open on mobile
  useEffect(() => {
    if (drawerOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const handleExportToggle = () => {
    if (!showExportDropdown && exportTriggerRef.current) {
      const rect = exportTriggerRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.top, left: rect.right + 8 });
    }
    setShowExportDropdown(v => !v);
  };

  const handleExportTxtClick = async () => {
    try { onExportTxt ? await Promise.resolve(onExportTxt()) : await exportDDTxt(); }
    catch (e) { console.error(e); alert('Erro ao exportar TXT.'); }
    finally { setShowExportDropdown(false); }
  };

  const handleExportExcelClick = async () => {
    try { onExportExcel ? await Promise.resolve(onExportExcel()) : await exportDDExcel(); }
    catch (e) { console.error(e); alert('Erro ao exportar Excel.'); }
    finally { setShowExportDropdown(false); }
  };

  const handleAddMemberClick = () => {
    setDrawerOpen(false);
    onAddMember ? onAddMember() : router.push('/members?openAddMember=1');
  };

  const handleLogoutClick = async () => {
    setDrawerOpen(false);
    if (onLogout) { onLogout(); return; }
    await supabase.auth.signOut();
    router.push('/login');
  };

  const navigate = (path: string) => {
    setDrawerOpen(false);
    router.push(path);
  };

  const navItems = [
    { key: 'dashboard',  label: 'Dashboard',  Icon: LayoutDashboard, path: '/dashboard' },
    { key: 'schedule',   label: 'Horário',    Icon: Calendar,        path: '/schedule' },
    { key: 'members',    label: 'Membros',    Icon: Users,           path: '/members' },
    { key: 'attendance', label: 'Presenças',  Icon: CheckSquare,     path: '/attendance' },
    { key: 'leads',      label: 'Leads',      Icon: Megaphone,       path: '/leads' },
    { key: 'payments',   label: 'Pagamentos', Icon: CreditCard,      path: '/payments' },
    { key: 'settings',   label: 'Definições', Icon: Settings,        path: '/settings' },
  ];

  const visibleNavItems = navItems.filter(item =>
    profileRole === 'coach' ? !['leads', 'payments', 'settings'].includes(item.key) : true
  );

  const canExportDd = profileRole !== 'coach';
  const initials = profileName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  // Shared nav content used in both desktop sidebar and mobile drawer
  const NavContent = () => (
    <>
      <nav className="flex-1 overflow-y-auto px-4 py-3">
        <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-600">Menu</p>

        {visibleNavItems.map((item) => {
          const isActive = ativo === item.key;
          return (
            <div
              key={item.key}
              onClick={() => navigate(item.path)}
              className={`mb-1 flex cursor-pointer items-center justify-between rounded-xl px-3 py-3.5 transition-colors ${
                isActive ? 'bg-[#1e1e1e] text-white' : 'text-zinc-400 hover:bg-[#1a1a1a] hover:text-zinc-100'
              }`}
            >
              <span className="flex items-center gap-3.5">
                <item.Icon size={20} className={isActive ? 'text-[#c81d25]' : 'text-zinc-500'} />
                <span className="text-[17px] font-medium">{item.label}</span>
              </span>
              {item.key === 'dashboard' && requestsCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#c81d25] px-1.5 text-[10px] font-bold text-white">
                  {requestsCount}
                </span>
              )}
            </div>
          );
        })}

        {canExportDd && (
          <div ref={exportTriggerRef}>
            <div
              onClick={handleExportToggle}
              className={`mb-1 mt-1 flex cursor-pointer items-center justify-between rounded-xl px-3 py-3.5 transition-colors ${
                showExportDropdown ? 'bg-[#1e1e1e] text-white' : 'text-zinc-400 hover:bg-[#1a1a1a] hover:text-zinc-100'
              }`}
            >
              <span className="flex items-center gap-3.5">
                <Download size={20} className="text-zinc-500" />
                <span className="text-[17px] font-medium">Export DD</span>
              </span>
              <ChevronDown size={14} className={`text-zinc-600 transition-transform ${showExportDropdown ? 'rotate-180' : ''}`} />
            </div>
          </div>
        )}
      </nav>

      <div className="border-t border-[#1e1e1e] px-4 py-4 space-y-3">
        <button
          onClick={handleAddMemberClick}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#c81d25] px-3 py-3.5 text-[15px] font-semibold text-white transition hover:bg-[#a8141c]"
        >
          <UserPlus size={18} />
          Adicionar Membro
        </button>

        <div className="flex items-center gap-3 rounded-xl px-2 py-2.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#c81d25] text-sm font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold text-zinc-100">{profileName}</div>
            <div className="text-xs text-zinc-500 capitalize">{profileRole}</div>
          </div>
          <button
            onClick={handleLogoutClick}
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
        <div className="w-10" /> {/* spacer */}
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
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-[#1e1e1e] px-4 py-4">
          <div className="flex items-center gap-3">
            <GBLogo size={36} />
            <div>
              <div className="text-sm font-bold text-white leading-tight">Gracie Barra</div>
              <div className="text-xs text-zinc-500 leading-tight">Carnaxide & Queijas</div>
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

        {showExportDropdown && (
          <div className="mx-3 mb-2 overflow-hidden rounded-lg border border-[#2a2a2a] bg-[#1a1a1a]">
            <div onClick={handleExportTxtClick} className="cursor-pointer px-4 py-3 text-sm text-zinc-300 hover:bg-[#252525] hover:text-white">Export TXT</div>
            <div onClick={handleExportExcelClick} className="cursor-pointer border-t border-[#2a2a2a] px-4 py-3 text-sm text-zinc-300 hover:bg-[#252525] hover:text-white">Export Excel</div>
          </div>
        )}
      </div>

      {/* ── Desktop sidebar ── */}
      <aside className="sticky top-0 z-10 hidden h-screen w-[240px] min-w-[240px] flex-col bg-[#111] lg:flex">
        <div className="border-b border-[#1e1e1e] px-5 py-5">
          <div className="flex items-center gap-3">
            <GBLogo size={36} />
            <div>
              <div className="text-sm font-bold text-white leading-tight">Gracie Barra</div>
              <div className="text-xs text-zinc-500 leading-tight">Carnaxide & Queijas</div>
            </div>
          </div>
        </div>

        <NavContent />

        {showExportDropdown && dropdownPos && (
          <div
            ref={exportRef}
            className="fixed z-[9999] min-w-[160px] overflow-hidden rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] shadow-xl"
            style={{ top: dropdownPos.top, left: dropdownPos.left }}
          >
            <div onClick={handleExportTxtClick} className="cursor-pointer px-4 py-3 text-sm text-zinc-300 hover:bg-[#252525] hover:text-white">Export TXT</div>
            <div onClick={handleExportExcelClick} className="cursor-pointer border-t border-[#2a2a2a] px-4 py-3 text-sm text-zinc-300 hover:bg-[#252525] hover:text-white">Export Excel</div>
          </div>
        )}
      </aside>
    </>
  );
}
