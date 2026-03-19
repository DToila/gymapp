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
            <th className="px-4 py-3 text-left font-semibold text-zinc-300">Nome</th>
            <th className="px-4 py-3 text-left font-semibold text-zinc-300">Via de Contacto</th>
            <th className="px-4 py-3 text-left font-semibold text-zinc-300">Data de Contacto</th>
            <th className="px-4 py-3 text-left font-semibold text-zinc-300">Numero de Telefone</th>
            <th className="px-4 py-3 text-left font-semibold text-zinc-300">E-mail</th>
            <th className="px-4 py-3 text-left font-semibold text-zinc-300">Aula</th>
            <th className="px-4 py-3 text-left font-semibold text-zinc-300">Observacoes</th>
            <th className="px-4 py-3 text-left font-semibold text-zinc-300">Data Proximo Contacto</th>
            <th className="px-4 py-3 text-left font-semibold text-zinc-300">Followup</th>
            <th className="px-4 py-3 text-left font-semibold text-zinc-300">Estado</th>
            <th className="px-4 py-3 text-left font-semibold text-zinc-300">Data Aula Experimental</th>
            <th className="px-4 py-3 text-left font-semibold text-zinc-300">Inscrito (S/N)</th>
            <th className="px-4 py-3 text-left font-semibold text-zinc-300">Motivo Nao Inscricao</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr
              key={lead.id}
              className="border-b border-[#0f0f0f] hover:bg-[#0f0f0f] transition cursor-pointer"
              onClick={() => onRowClick(lead)}
            >
              <td className="px-4 py-3 font-medium text-white">{lead.name}</td>
              <td className="px-4 py-3">
                <span className={`inline-block rounded-full border px-3 py-1 text-xs font-medium ${sourceChipColor(lead.contact_source)}`}>
                  {lead.contact_source}
                </span>
              </td>
              <td className="px-4 py-3 text-zinc-300">{lead.contact_date || '-'}</td>
              <td className="px-4 py-3 text-zinc-300">{lead.phone || '-'}</td>
              <td className="px-4 py-3 text-zinc-300">{lead.email || '-'}</td>
              <td className="px-4 py-3 text-zinc-300">{lead.class_type}</td>
              <td className="px-4 py-3 text-zinc-300">{lead.notes || '-'}</td>
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
              <td className="px-4 py-3 text-zinc-300">{lead.followup_note || '-'}</td>
              <td className="px-4 py-3">
                <span className={`inline-block rounded-full border px-3 py-1 text-xs font-medium ${statusBadgeColor(lead.status)}`}>
                  {lead.status}
                </span>
              </td>
              <td className="px-4 py-3 text-zinc-300">{lead.trial_date || '-'}</td>
              <td className="px-4 py-3 text-zinc-300">{lead.enrolled ? 'Sim' : 'Nao'}</td>
              <td className="px-4 py-3 text-zinc-300">{lead.not_enrolled_reason_text || lead.not_enrolled_reason || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
