"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import GBLogo from '@/components/GBLogo';

interface TeacherSidebarProps {
  active: 'dashboard' | 'members';
  requestsCount?: number;
}

export default function TeacherSidebar({ active, requestsCount = 0 }: TeacherSidebarProps) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { key: 'dashboard', label: 'Dashboard', onClick: () => router.push('/') },
    { key: 'members', label: 'Membros', onClick: () => router.push('/members') },
    { key: 'attendance', label: 'Presenças', onClick: () => {} },
    { key: 'export', label: 'Export DD', onClick: () => {} },
    { key: 'settings', label: 'Definições', onClick: () => {} }
  ];

  return (
    <aside style={{
      width: collapsed ? '72px' : '200px',
      background: '#0f0f0f',
      borderRight: '1px solid #2a2a2a',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s',
      flexShrink: 0
    }}>
      <div style={{ padding: collapsed ? '16px 10px' : '18px 16px', borderBottom: '1px solid #2a2a2a' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <GBLogo size={collapsed ? 28 : 32} />
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              style={{ background: 'none', border: '1px solid #2a2a2a', color: '#888', width: '24px', height: '24px', cursor: 'pointer' }}
            >
              ‹
            </button>
          )}
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              style={{ background: 'none', border: '1px solid #2a2a2a', color: '#888', width: '24px', height: '24px', cursor: 'pointer' }}
            >
              ›
            </button>
          )}
        </div>
        {!collapsed && (
          <div style={{ marginTop: '10px', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: '#666' }}>
            Carnaxide & Queijas
          </div>
        )}
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', paddingTop: '8px', flex: 1 }}>
        {navItems.map((item) => {
          const isActive = (active === 'dashboard' && item.key === 'dashboard') || (active === 'members' && item.key === 'members');
          return (
            <button
              key={item.key}
              onClick={item.onClick}
              style={{
                margin: '0',
                border: 'none',
                textAlign: 'left',
                background: isActive ? 'rgba(204,0,0,0.1)' : 'transparent',
                borderLeft: isActive ? '2px solid #CC0000' : '2px solid transparent',
                color: isActive ? '#f0f0f0' : '#8a8a8a',
                fontSize: '12px',
                padding: collapsed ? '10px 8px' : '10px 14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'space-between'
              }}
            >
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>{collapsed ? item.label.charAt(0) : item.label}</span>
              {!collapsed && item.key === 'dashboard' && requestsCount > 0 && (
                <span style={{ minWidth: '18px', height: '18px', borderRadius: '9px', background: '#CC0000', color: '#fff', fontSize: '10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>
                  {requestsCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
