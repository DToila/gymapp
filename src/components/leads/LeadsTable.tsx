'use client';

import { Lead } from './types';

interface LeadsTableProps {
  leads: Lead[];
  onRowClick: (lead: Lead) => void;
  onAction: (leadId: string, action: string) => void;
}

export default function LeadsTable({ leads, onRowClick, onAction }: LeadsTableProps) {
  const statusBadgeColor = (status: Lead['status']) => {
    const colors: Record<Lead['status'], string> = {
      'New': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      'Contacted': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      'Trial Booked': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      'Trial Attended': 'bg-green-500/20 text-green-300 border-green-500/30',
      'Converted to Request': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      'Lost': 'bg-red-500/20 text-red-300 border-red-500/30',
    };
    return colors[status];
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#222]">
            <th className="px-4 py-3 text-left font-semibold text-zinc-300">Name</th>
            <th className="px-4 py-3 text-left font-semibold text-zinc-300">Phone</th>
            <th className="px-4 py-3 text-left font-semibold text-zinc-300">Source</th>
            <th className="px-4 py-3 text-left font-semibold text-zinc-300">Status</th>
            <th className="px-4 py-3 text-left font-semibold text-zinc-300">Owner</th>
            <th className="px-4 py-3 text-left font-semibold text-zinc-300">Last Contact</th>
            <th className="px-4 py-3 text-right font-semibold text-zinc-300">Actions</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-b border-[#0f0f0f] hover:bg-[#0f0f0f] transition cursor-pointer">
              <td className="px-4 py-3" onClick={() => onRowClick(lead)}>
                <p className="font-medium text-white">{lead.name}</p>
              </td>
              <td className="px-4 py-3 text-zinc-400">{lead.phone}</td>
              <td className="px-4 py-3 text-zinc-400">{lead.source}</td>
              <td className="px-4 py-3">
                <span className={`inline-block px-3 py-1 rounded-full border text-xs font-medium ${statusBadgeColor(lead.status)}`}>
                  {lead.status}
                </span>
              </td>
              <td className="px-4 py-3 text-zinc-400">{lead.owner || 'Unassigned'}</td>
              <td className="px-4 py-3 text-zinc-400">{lead.lastContact || '-'}</td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction(lead.id, 'menu');
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[#222] text-zinc-400 hover:text-white transition"
                >
                  ⋯
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
