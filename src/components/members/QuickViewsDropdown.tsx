"use client";

import { QuickView } from './types';

interface QuickViewsDropdownProps {
  value: QuickView;
  onChange: (view: QuickView) => void;
}

export default function QuickViewsDropdown({ value, onChange }: QuickViewsDropdownProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-500">View</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as QuickView)}
        className="rounded-lg border border-[#252525] bg-[#151515] px-3 py-2 text-xs text-zinc-100"
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
