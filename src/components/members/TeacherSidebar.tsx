"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import GBLogo from '@/components/GBLogo';
import { exportDDTxt, exportDDExcel } from '../../../lib/ddExport';
import { supabase } from '../../../lib/supabase';

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
  active: 'dashboard' | 'schedule' | 'members' | 'attendance' | 'leads' | 'payments' | 'settings';
  requestsCount?: number;
  role?: AppRole;
  onLogout?: () => void;
  onExportTxt?: () => void;
  onExportExcel?: () => void;
  onAddMember?: () => void;
}

export default function TeacherSidebar({ active, requestsCount = 0, role: roleProp, onLogout, onExportTxt, onExportExcel, onAddMember }: TeacherSidebarProps) {
  const router = useRouter();
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
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('cached_profile_role', roleProp);
      }
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;
        if (!user) return;

        const { data } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', user.id)
          .maybeSingle();

        const roleFromProfile = data?.role && isRole(data.role) ? data.role : null;
        const roleFromUserMeta = roleFromMetadata(user.user_metadata);
        const roleFromAppMeta = roleFromMetadata(user.app_metadata);
        const resolvedRole = roleFromProfile || roleFromUserMeta || roleFromAppMeta || 'coach';
        if (!cancelled) {
          setProfileRole(resolvedRole);
        }

        const nameFromProfile = data?.full_name || null;
        const nameFromUserMeta = fullNameFromMetadata(user.user_metadata);
        const nameFromAppMeta = fullNameFromMetadata(user.app_metadata);
        if (!cancelled) {
          setProfileName(nameFromProfile || nameFromUserMeta || nameFromAppMeta || 'Professor');
        }

        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem('cached_profile_role', resolvedRole);
        }
      } catch (error) {
        console.error('Failed to load profile for sidebar:', error);
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [roleProp]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        exportRef.current && !exportRef.current.contains(e.target as Node) &&
        exportTriggerRef.current && !exportTriggerRef.current.contains(e.target as Node)
      ) {
        setShowExportDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportToggle = () => {
    if (!showExportDropdown && exportTriggerRef.current) {
      const rect = exportTriggerRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.top, left: rect.right + 4 });
    }
    setShowExportDropdown(v => !v);
  };

  const handleExportTxtClick = async () => {
    try {
      if (onExportTxt) {
        await Promise.resolve(onExportTxt());
      } else {
        await exportDDTxt();
      }
    } catch (error) {
      console.error('Error exporting DD TXT:', error);
      alert('Error exporting DD TXT. Please try again.');
    } finally {
      setShowExportDropdown(false);
    }
  };

  const handleExportExcelClick = async () => {
    try {
      if (onExportExcel) {
        await Promise.resolve(onExportExcel());
      } else {
        await exportDDExcel();
      }
    } catch (error) {
      console.error('Error exporting DD Excel:', error);
      alert('Error exporting DD Excel. Please try again.');
    } finally {
      setShowExportDropdown(false);
    }
  };

  const handleAddMemberClick = () => {
    if (onAddMember) {
      onAddMember();
      return;
    }
    router.push('/members?openAddMember=1');
  };

  const handleLogoutClick = async () => {
    if (onLogout) {
      onLogout();
      return;
    }

    await supabase.auth.signOut();
    router.push('/login');
  };

  const navItems = [
    { key: 'dashboard', label: 'Dashboard', icon: '◔', onClick: () => router.push('/dashboard') },
    { key: 'schedule', label: 'Horário', icon: '📅', onClick: () => router.push('/schedule') },
    { key: 'members', label: 'Membros', icon: '◌', onClick: () => router.push('/members') },
    { key: 'attendance', label: 'Presenças', icon: '◍', onClick: () => router.push('/attendance') },
    { key: 'leads', label: 'Leads', icon: '◎', onClick: () => router.push('/leads') },
    { key: 'payments', label: 'Pagamentos', icon: '▣', onClick: () => router.push('/payments') },
    { key: 'settings', label: 'Definições', icon: '☰', onClick: () => router.push('/settings') }
  ];

  const visibleNavItems = navItems.filter((item) => {
    if (profileRole === 'coach') {
      return !['leads', 'payments', 'settings'].includes(item.key);
    }
    return true;
  });

  const canExportDd = profileRole !== 'coach';
  const roleLabel = profileRole.toUpperCase();

  return (
    <aside className="sticky top-0 z-10 flex h-screen w-[260px] min-w-[260px] flex-col border-r border-[#222] bg-[#0d0d0d]">
      <div className="border-b border-[#202020] px-5 py-5">
        <div className="mb-2 flex items-center gap-3">
          <GBLogo size={46} />
          <div>
            <div className="text-sm font-extrabold tracking-[0.22em] text-zinc-100">GRACIE BARRA</div>
            <div className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">Carnaxide & Queijas / GymApp</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-visible px-3 py-4">
        {visibleNavItems.map((item) => {
          const isActive = active === (item.key as any);
          return (
            <div
              key={item.key}
              onClick={item.onClick}
              className={`mb-1 flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm transition ${
                isActive
                  ? 'border-l-2 border-[#c81d25] bg-[#2a1113] text-white'
                  : 'text-zinc-400 hover:bg-[#161616] hover:text-zinc-200'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-xs">{item.icon}</span>
                <span>{item.label}</span>
              </span>
              {item.key === 'dashboard' && requestsCount > 0 ? (
                <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#c81d25] px-1.5 text-[10px] font-bold text-white">
                  {requestsCount}
                </span>
              ) : null}
            </div>
          );
        })}

        {canExportDd ? (
          <>
            <div ref={exportTriggerRef}>
              <div
                onClick={handleExportToggle}
                className={`mb-1 flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm transition ${
                  showExportDropdown ? 'bg-[#161616] text-zinc-100' : 'text-zinc-400 hover:bg-[#161616] hover:text-zinc-200'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-xs">⬇</span>
                  <span>Export DD</span>
                </span>
                <span className="text-[10px] text-zinc-500">{showExportDropdown ? '▲' : '▼'}</span>
              </div>
            </div>

            {showExportDropdown && dropdownPos && (
              <div
                ref={exportRef}
                className="fixed z-[9999] min-w-[148px] border border-[#2a2a2a] bg-[#1a1a1a] shadow-[4px_4px_16px_rgba(0,0,0,0.7)]"
                style={{ top: dropdownPos.top, left: dropdownPos.left }}
              >
                <div
                  onClick={handleExportTxtClick}
                  className="cursor-pointer border-b border-[#2a2a2a] px-4 py-2.5 text-xs text-zinc-300 hover:bg-[#2a2a2a] hover:text-zinc-100"
                >
                  Export TXT
                </div>
                <div
                  onClick={handleExportExcelClick}
                  className="cursor-pointer px-4 py-2.5 text-xs text-zinc-300 hover:bg-[#2a2a2a] hover:text-zinc-100"
                >
                  Export Excel
                </div>
              </div>
            )}
          </>
        ) : null}
      </nav>

      <div className="flex flex-col gap-3 border-t border-[#202020] p-4">
        <button
          onClick={handleAddMemberClick}
          className="w-full rounded-lg border border-[#c81d25] bg-[#c81d25] px-3 py-2.5 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[#a8141c]"
        >
          + Add Member
        </button>

        <div className="flex items-center gap-3 rounded-lg bg-[#111] p-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-[#c81d25] text-xs font-bold text-white">P</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm text-zinc-100">{profileName}</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-[#c81d25]">{roleLabel}</div>
          </div>
          <button
            onClick={handleLogoutClick}
            className="rounded-md border border-[#2a2a2a] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-zinc-400 hover:border-zinc-200 hover:text-zinc-100"
          >
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
