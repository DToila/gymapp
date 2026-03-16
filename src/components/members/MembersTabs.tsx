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
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
              isActive
                ? 'border border-[#c81d25] bg-[rgba(200,29,37,0.18)] text-zinc-100 shadow-[0_0_0_1px_rgba(200,29,37,0.25)]'
                : 'border border-[#252525] bg-[#141414] text-zinc-400 hover:bg-[#191919] hover:text-zinc-200'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
