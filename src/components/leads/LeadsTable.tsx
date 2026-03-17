'use client';

import { Lead } from './types';

interface LeadsTableProps {
  leads: Lead[];
  onRowClick: (lead: Lead) => void;
}

export default function LeadsTable({ leads, onRowClick }: LeadsTableProps) {
  const statusBadgeColor = (status: Lead['status']) => {
    const colors: Record<Lead['status'], string> = {
      'new': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      'contacted': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      'trial_booked': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      'trial_done': 'bg-green-500/20 text-green-300 border-green-500/30',
      'converted_to_request': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      'lost': 'bg-red-500/20 text-red-300 border-red-500/30',
    };
    return colors[status];
  };

  const sourceChipColor = (source: Lead['contact_source']) => {
    if (source === 'Website' || source === 'Instagram') return 'bg-[#1b2430] text-[#93c5fd] border-[#2a3a4e]';
    if (source === 'Walk-in' || source === 'Alunos GBCQ') return 'bg-[#1f2a1f] text-[#86efac] border-[#2e4230]';
    return 'bg-[#26201b] text-[#fdba74] border-[#3d2f23]';
  };

  const statusLabel = (status: Lead['status']) => {
    const labels: Record<Lead['status'], string> = {
      new: 'New',
      contacted: 'Contacted',
      trial_booked: 'Trial Booked',
      trial_done: 'Trial Done',
      lost: 'Lost',
      converted_to_request: 'Converted',
    };
    return labels[status];
  };

  const isOverdue = (date?: string) => {
    if (!date) return false;
    const today = new Date().toISOString().slice(0, 10);
    return date < today;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#222]">
            <th className="px-4 py-3 text-left font-semibold text-zinc-300">Name</th>
            <th className="px-4 py-3 text-left font-semibold text-zinc-300">Source</th>
            <th className="px-4 py-3 text-left font-semibold text-zinc-300">Status</th>
            <th className="px-4 py-3 text-left font-semibold text-zinc-300">Next Contact</th>
            <th className="px-4 py-3 text-left font-semibold text-zinc-300">Class</th>
            <th className="px-4 py-3 text-left font-semibold text-zinc-300">Enrolled</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-b border-[#0f0f0f] hover:bg-[#0f0f0f] transition cursor-pointer" onClick={() => onRowClick(lead)}>
              <td className="px-4 py-3">
                <p className="font-medium text-white">{lead.name}</p>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-block rounded-full border px-3 py-1 text-xs font-medium ${sourceChipColor(lead.contact_source)}`}>
                  {lead.contact_source}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-block px-3 py-1 rounded-full border text-xs font-medium ${statusBadgeColor(lead.status)}`}>
                  {statusLabel(lead.status)}
                </span>
              </td>
              <td className="px-4 py-3 text-zinc-300">
                <div className="flex items-center gap-2">
                  <span>{lead.next_contact_date || '-'}</span>
                  {isOverdue(lead.next_contact_date) ? (
                    <span className="inline-block rounded-full border border-[#ef4444]/30 bg-[#ef4444]/20 px-2 py-0.5 text-[10px] font-semibold text-[#fca5a5]">
                      Overdue
                    </span>
                  ) : null}
                </div>
              </td>
              <td className="px-4 py-3 text-zinc-300">{lead.class_type}</td>
              <td className="px-4 py-3 text-zinc-300">{lead.enrolled ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
