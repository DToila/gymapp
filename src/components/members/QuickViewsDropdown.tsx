"use client";

import { QuickView } from './types';

interface QuickViewsDropdownProps {
  value: QuickView;
  onChange: (view: QuickView) => void;
}

export default function QuickViewsDropdown({ value, onChange }: QuickViewsDropdownProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ color: '#888888', fontSize: '12px' }}>View</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as QuickView)}
        style={{
          background: '#121212',
          color: '#f0f0f0',
          border: '1px solid #2a2a2a',
          padding: '8px 10px',
          fontSize: '12px'
        }}
      >
        <option value="recent">Recent</option>
        <option value="unpaid">Unpaid / To pay</option>
        <option value="birthdays">Birthdays (next 7 days)</option>
        <option value="newThisMonth">New this month</option>
        <option value="inactive">Inactive</option>
      </select>
    </div>
  );
}
