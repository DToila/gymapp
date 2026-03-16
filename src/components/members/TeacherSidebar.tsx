"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import GBLogo from '@/components/GBLogo';
import { exportDDTxt, exportDDExcel } from '../../../lib/ddExport';

interface TeacherSidebarProps {
  active: 'dashboard' | 'members';
  requestsCount?: number;
  onLogout?: () => void;
  onExportTxt?: () => void;
  onExportExcel?: () => void;
  onAddMember?: () => void;
}

export default function TeacherSidebar({ active, requestsCount = 0, onLogout, onExportTxt, onExportExcel, onAddMember }: TeacherSidebarProps) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const exportTriggerRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

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
    router.push('/dashboard?openAddMember=1');
  };

  const navItems = [
    { key: 'dashboard', label: 'Dashboard', onClick: () => router.push('/dashboard') },
    { key: 'members', label: 'Membros', onClick: () => router.push('/members') },
    { key: 'attendance', label: 'Presenças', onClick: () => {} },
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
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'visible' }}>
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

        {/* Export DD dropdown item — always last in nav */}
        <div ref={exportTriggerRef}>
          <div
            onClick={handleExportToggle}
            style={{
              padding: collapsed ? '10px 12px' : '10px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'space-between',
              gap: '12px',
              fontSize: '13px',
              color: showExportDropdown ? '#f0f0f0' : '#888888',
              cursor: 'pointer',
              borderLeft: '2px solid transparent',
              background: showExportDropdown ? '#1a1a1a' : 'transparent',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = '#f0f0f0';
              if (!showExportDropdown) (e.currentTarget as HTMLElement).style.background = '#1a1a1a';
            }}
            onMouseLeave={(e) => {
              if (!showExportDropdown) {
                (e.currentTarget as HTMLElement).style.color = '#888888';
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }
            }}
          >
            <span>{collapsed ? 'E' : 'Export DD'}</span>
            {!collapsed && <span style={{ fontSize: '10px', color: '#666' }}>{showExportDropdown ? '▲' : '▼'}</span>}
          </div>
        </div>

        {/* Fixed-position dropdown — escapes overflow:hidden */}
        {showExportDropdown && !collapsed && dropdownPos && (
          <div
            ref={exportRef}
            style={{
              position: 'fixed',
              top: dropdownPos.top,
              left: dropdownPos.left,
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              minWidth: '140px',
              zIndex: 9999,
              boxShadow: '4px 4px 16px rgba(0,0,0,0.7)'
            }}
          >
            <div
              onClick={handleExportTxtClick}
              style={{ padding: '10px 16px', fontSize: '12px', color: '#c0c0c0', cursor: 'pointer', borderBottom: '1px solid #2a2a2a' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#2a2a2a'; (e.currentTarget as HTMLElement).style.color = '#f0f0f0'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#c0c0c0'; }}
            >
              Export TXT
            </div>
            <div
              onClick={handleExportExcelClick}
              style={{ padding: '10px 16px', fontSize: '12px', color: '#c0c0c0', cursor: 'pointer' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#2a2a2a'; (e.currentTarget as HTMLElement).style.color = '#f0f0f0'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#c0c0c0'; }}
            >
              Export Excel
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div style={{
        padding: collapsed ? '12px 12px 16px' : '12px 20px 16px',
        borderTop: '1px solid #2a2a2a',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <button
          onClick={handleAddMemberClick}
          style={{
            width: '100%',
            padding: collapsed ? '8px 0' : '9px 10px',
            fontFamily: '"Barlow Condensed", sans-serif',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            border: '1px solid #CC0000',
            background: '#CC0000',
            color: 'white',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#990000'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#CC0000'}
        >
          {collapsed ? '+' : '+ Add Member'}
        </button>

        <div style={{
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
      </div>
    </aside>
  );
}
