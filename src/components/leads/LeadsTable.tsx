'use client';

import { Lead } from './types';

interface LeadsTableProps {
  leads: Lead[];
  onRowClick: (lead: Lead) => void;
}

export default function LeadsTable({ leads, onRowClick }: LeadsTableProps) {
  const statusBadgeColor = (status: Lead['status']) => {
    const colors: Record<Lead['status'], string> = {
      'Por contactar': 'bg-zinc-500/20 text-zinc-200 border-zinc-500/30',
      Contactado: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      'Aula agendada': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      'Aula realizada': 'bg-green-500/20 text-green-300 border-green-500/30',
      Inscrito: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      'Nao inscrito': 'bg-red-500/20 text-red-300 border-red-500/30',
    };
    return colors[status];
  };

  const sourceChipColor = (source: Lead['contact_source']) => {
    if (source === 'Website' || source === 'Instagram') return 'bg-[#1b2430] text-[#93c5fd] border-[#2a3a4e]';
    if (source === 'Walk in' || source === 'Alunos GBCQ') return 'bg-[#1f2a1f] text-[#86efac] border-[#2e4230]';
    return 'bg-[#26201b] text-[#fdba74] border-[#3d2f23]';
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
            <th className="px-2 py-2 text-left text-sm font-semibold text-zinc-300 whitespace-nowrap">Nome</th>
            <th className="px-2 py-2 text-left text-sm font-semibold text-zinc-300 whitespace-nowrap">Via</th>
            <th className="px-2 py-2 text-left text-sm font-semibold text-zinc-300 whitespace-nowrap">Data Contacto</th>
            <th className="px-2 py-2 text-left text-sm font-semibold text-zinc-300 whitespace-nowrap">Telefone</th>
            <th className="px-2 py-2 text-left text-sm font-semibold text-zinc-300 whitespace-nowrap">E-mail</th>
            <th className="px-2 py-2 text-left text-sm font-semibold text-zinc-300 whitespace-nowrap">Aula</th>
            <th className="px-2 py-2 text-left text-sm font-semibold text-zinc-300 whitespace-nowrap">Obs.</th>
            <th className="px-2 py-2 text-left text-sm font-semibold text-zinc-300 whitespace-nowrap">Prox. Contacto</th>
            <th className="px-2 py-2 text-left text-sm font-semibold text-zinc-300 whitespace-nowrap">Follow-up</th>
            <th className="px-2 py-2 text-left text-sm font-semibold text-zinc-300 whitespace-nowrap">Estado</th>
            <th className="px-2 py-2 text-left text-sm font-semibold text-zinc-300 whitespace-nowrap">Aula Exp.</th>
            <th className="px-2 py-2 text-left text-sm font-semibold text-zinc-300 whitespace-nowrap">Inscrito</th>
            <th className="px-2 py-2 text-left text-sm font-semibold text-zinc-300 whitespace-nowrap">Motivo</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr
              key={lead.id}
              className="border-b border-[#0f0f0f] hover:bg-[#0f0f0f] transition cursor-pointer"
              onClick={() => onRowClick(lead)}
            >
              <td className="px-2 py-2 text-sm font-medium text-white whitespace-nowrap">{lead.name}</td>
              <td className="px-2 py-2">
                <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${sourceChipColor(lead.contact_source)}`}>
                  {lead.contact_source}
                </span>
              </td>
              <td className="px-2 py-2 text-zinc-300 whitespace-nowrap">{lead.contact_date || '-'}</td>
              <td className="px-2 py-2 text-zinc-300 whitespace-nowrap">{lead.phone || '-'}</td>
              <td className="px-2 py-2 text-zinc-300 whitespace-nowrap">{lead.email || '-'}</td>
              <td className="px-2 py-2 text-zinc-300 whitespace-nowrap">{lead.class_type}</td>
              <td className="px-2 py-2 text-zinc-300 whitespace-nowrap max-w-xs truncate">{lead.notes || '-'}</td>
              <td className="px-2 py-2 text-zinc-300 whitespace-nowrap">
                <div className="flex items-center gap-1">
                  <span>{lead.next_contact_date || '-'}</span>
                  {isOverdue(lead.next_contact_date) ? (
                    <span className="inline-block rounded-full border border-[#ef4444]/30 bg-[#ef4444]/20 px-2 py-0.5 text-[10px] font-semibold text-[#fca5a5]" title="Vencido">
                      OD
                    </span>
                  ) : null}
                </div>
              </td>
              <td className="px-2 py-2 text-zinc-300 whitespace-nowrap max-w-xs truncate">{lead.followup_note || '-'}</td>
              <td className="px-2 py-2 whitespace-nowrap">
                <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadgeColor(lead.status)}`}>
                  {lead.status}
                </span>
              </td>
              <td className="px-2 py-2 text-zinc-300 whitespace-nowrap">{lead.trial_date || '-'}</td>
              <td className="px-2 py-2 text-zinc-300 whitespace-nowrap">{lead.enrolled ? 'Sim' : 'Nao'}</td>
              <td className="px-2 py-2 text-zinc-300 whitespace-nowrap max-w-xs truncate">{lead.not_enrolled_reason_text || lead.not_enrolled_reason || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
