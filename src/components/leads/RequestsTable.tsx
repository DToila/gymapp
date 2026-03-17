'use client';

import { LeadRequest } from './types';

interface RequestsTableProps {
  requests: LeadRequest[];
  onRowClick: (request: LeadRequest) => void;
}

export default function RequestsTable({ requests, onRowClick }: RequestsTableProps) {
  const statusBadgeColor = (status: LeadRequest['status']) => {
    const colors: Record<LeadRequest['status'], string> = {
      'Trial Pending': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      'Trial Done': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      'Accepted': 'bg-green-500/20 text-green-300 border-green-500/30',
      'Rejected': 'bg-red-500/20 text-red-300 border-red-500/30',
      'No-show': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    };
    return colors[status];
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#222]">
            <th className="px-4 py-3 text-left font-semibold text-zinc-300">Name</th>
            <th className="px-4 py-3 text-left font-semibold text-zinc-300">Contact</th>
            <th className="px-4 py-3 text-left font-semibold text-zinc-300">Status</th>
            <th className="px-4 py-3 text-left font-semibold text-zinc-300">Trial Date</th>
            <th className="px-4 py-3 text-left font-semibold text-zinc-300">Requested</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((req) => (
            <tr
              key={req.id}
              className="border-b border-[#0f0f0f] hover:bg-[#0f0f0f] transition cursor-pointer"
              onClick={() => onRowClick(req)}
            >
              <td className="px-4 py-3 font-medium text-white">{req.name}</td>
              <td className="px-4 py-3 text-zinc-400">
                {req.phone}
                {req.email && <div className="text-xs text-zinc-500">{req.email}</div>}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-block px-3 py-1 rounded-full border text-xs font-medium ${statusBadgeColor(req.status)}`}>
                  {req.status}
                </span>
              </td>
              <td className="px-4 py-3 text-zinc-400">{req.trialDate || '-'}</td>
              <td className="px-4 py-3 text-zinc-400">{req.requestedAt || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
