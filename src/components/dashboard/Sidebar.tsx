import Link from 'next/link';
import { SidebarItemKey } from './types';

interface SidebarProps {
  active: SidebarItemKey;
  onLogout: () => void;
}

const navItems: Array<{ key: SidebarItemKey; label: string; href: string; icon: string }> = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: '◔' },
  { key: 'members', label: 'Members', href: '/members', icon: '◌' },
  { key: 'attendance', label: 'Attendance', href: '/attendance', icon: '◍' },
  { key: 'leads', label: 'Leads', href: '/leads', icon: '◎' },
  { key: 'payments', label: 'Payments', href: '/payments', icon: '▣' },
  { key: 'settings', label: 'Definições', href: '/settings', icon: '☰' },
];

export default function Sidebar({ active, onLogout }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 z-20 flex h-screen w-[260px] flex-col border-r border-[#222] bg-[#0d0d0d]">
      <div className="border-b border-[#202020] px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-[#c81d25] font-bold text-white">GB</div>
          <div>
            <p className="text-xl font-bold tracking-wide text-white">GRACIE BARRA</p>
            <p className="text-xs tracking-[0.3em] text-zinc-500">BJJ / GYM</p>
          </div>
        </div>
      </div>

      <nav className="mt-4 flex-1 px-3">
        {navItems.map((item) => {
          const activeItem = item.key === active;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                activeItem
                  ? 'border-l-2 border-[#c81d25] bg-[#2a1113] text-white'
                  : 'text-zinc-400 hover:bg-[#161616] hover:text-zinc-200'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[#202020] p-4">
        <div className="mb-3 flex items-center gap-3 rounded-lg bg-[#111] p-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-zinc-700 text-sm font-semibold text-white">P</div>
          <div>
            <p className="text-sm text-white">Professor</p>
            <p className="text-xs text-zinc-500">Admin</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full rounded-lg border border-[#2c2c2c] bg-[#121212] px-3 py-2 text-sm text-zinc-300 hover:border-[#c81d25] hover:text-white"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
