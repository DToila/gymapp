"use client";

import { MembersTab } from './types';

interface MembersTabsProps {
  activeTab: MembersTab;
  onChange: (tab: MembersTab) => void;
}

const tabs: Array<{ key: MembersTab; label: string }> = [
  { key: 'adults', label: 'Adults' },
  { key: 'kids', label: 'Kids' },
  { key: 'requests', label: 'Requests' }
];

export default function MembersTabs({ activeTab, onChange }: MembersTabsProps) {
  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            style={{
              padding: '8px 14px',
              border: isActive ? '1px solid #CC0000' : '1px solid #2a2a2a',
              background: isActive ? 'rgba(204,0,0,0.16)' : '#101010',
              color: isActive ? '#f0f0f0' : '#9a9a9a',
              fontSize: '12px',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              cursor: 'pointer'
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
