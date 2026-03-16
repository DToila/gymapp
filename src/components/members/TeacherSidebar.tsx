"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import GBLogo from '@/components/GBLogo';

interface TeacherSidebarProps {
  active: 'dashboard' | 'members';
  requestsCount?: number;
  onLogout?: () => void;
}

export default function TeacherSidebar({ active, requestsCount = 0, onLogout }: TeacherSidebarProps) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { key: 'dashboard', label: 'Dashboard', onClick: () => router.push('/dashboard') },
    { key: 'members', label: 'Membros', onClick: () => router.push('/members') },
    { key: 'attendance', label: 'Presenças', onClick: () => {} },
    { key: 'export', label: 'Export DD', onClick: () => {} },
    { key: 'settings', label: 'Definições', onClick: () => {} }
  ];

  return (
    <aside style={{
      width: collapsed ? '72px' : '248px',
      minWidth: collapsed ? '72px' : '248px',
      background: '#111111',
      borderRight: '1px solid #2a2a2a',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      transition: 'width 0.2s, min-width 0.2s',
      flexShrink: 0,
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ padding: collapsed ? '14px 12px' : '22px 20px', borderBottom: '1px solid #2a2a2a' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', gap: '8px', marginBottom: collapsed ? 0 : '8px' }}>
          <GBLogo size={collapsed ? 32 : 48} />
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              style={{ background: 'none', border: '1px solid #2a2a2a', color: '#888', width: '22px', height: '22px', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >‹</button>
          )}
        </div>
        {!collapsed && (
          <>
            <div style={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontSize: '13px',
              fontWeight: 800,
              letterSpacing: '3px',
              textTransform: 'uppercase',
              color: '#f0f0f0',
              marginBottom: '4px'
            }}>
              Gracie Barra
            </div>
            <div style={{ fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: '#555555' }}>
              Carnaxide & Queijas / GymApp
            </div>
          </>
        )}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            style={{ background: 'none', border: '1px solid #2a2a2a', color: '#888', width: '22px', height: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '8px auto 0' }}
          >›</button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {navItems.map((item) => {
          const isActive = active === item.key;
          return (
            <div
              key={item.key}
              onClick={item.onClick}
              style={{
                padding: collapsed ? '10px 12px' : '10px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'space-between',
                gap: '12px',
                fontSize: '13px',
                color: isActive ? '#f0f0f0' : '#888888',
                cursor: 'pointer',
                borderLeft: isActive ? '2px solid #CC0000' : '2px solid transparent',
                background: isActive ? 'rgba(204,0,0,0.07)' : 'transparent',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.color = '#f0f0f0';
                  (e.currentTarget as HTMLElement).style.background = '#1a1a1a';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.color = '#888888';
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }
              }}
            >
              <span>{collapsed ? item.label.charAt(0) : item.label}</span>
              {!collapsed && item.key === 'dashboard' && requestsCount > 0 && (
                <span style={{
                  minWidth: '18px',
                  height: '18px',
                  padding: '0 5px',
                  borderRadius: '9px',
                  background: '#CC0000',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {requestsCount}
                </span>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{
        padding: collapsed ? '16px 12px' : '16px 20px',
        borderTop: '1px solid #2a2a2a',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        justifyContent: collapsed ? 'center' : 'flex-start'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          background: '#CC0000',
          fontFamily: '"Barlow Condensed", sans-serif',
          fontWeight: 900,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '13px',
          flexShrink: 0
        }}>P</div>
        {!collapsed && (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: 500, color: '#f0f0f0' }}>Professor</div>
              <div style={{ fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: '#CC0000' }}>Admin</div>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                style={{
                  background: 'none',
                  border: '1px solid #2a2a2a',
                  color: '#888888',
                  fontSize: '10px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  transition: 'all 0.2s',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#f0f0f0';
                  e.currentTarget.style.color = '#f0f0f0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#2a2a2a';
                  e.currentTarget.style.color = '#888888';
                }}
              >Logout</button>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
