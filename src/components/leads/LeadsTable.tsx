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

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
        <p className="text-lg font-semibold">Sem leads</p>
        <p className="text-sm mt-1">Adiciona o primeiro lead para começar</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile: card layout */}
      <div className="sm:hidden divide-y divide-[#1a1a1a]">
        {leads.map((lead) => (
          <div
            key={lead.id}
            onClick={() => onRowClick(lead)}
            className="p-5 hover:bg-[#111] active:bg-[#111] cursor-pointer transition-colors"
          >
            <div className="flex items-start justify-between mb-3 gap-3">
              <div className="min-w-0">
                <p className="text-xl font-bold text-white truncate">{lead.name || '(sem nome)'}</p>
                <p className="text-sm text-zinc-500 mt-1">{lead.contact_date || 'Sem data de contacto'}</p>
              </div>
              <span className={`inline-block shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold ${statusBadgeColor(lead.status)}`}>
                {lead.status}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              <span className={`inline-block rounded-full border px-3 py-1 text-sm font-medium ${sourceChipColor(lead.contact_source)}`}>
                {lead.contact_source}
              </span>
              <span className="inline-block rounded-full border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1 text-sm text-zinc-400">
                {lead.class_type}
              </span>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-base text-zinc-300">
              {lead.phone && <span>{lead.phone}</span>}
              {lead.email && <span className="truncate max-w-[200px]">{lead.email}</span>}
            </div>

            {lead.next_contact_date && (
              <p className="text-sm text-zinc-500 mt-2 flex items-center gap-2">
                <span>Próx. contacto: {lead.next_contact_date}</span>
                {isOverdue(lead.next_contact_date) && (
                  <span className="rounded-full border border-[#ef4444]/30 bg-[#ef4444]/20 px-2 py-0.5 text-xs font-semibold text-[#fca5a5]">Vencido</span>
                )}
              </p>
            )}

            {lead.notes && (
              <p className="text-sm text-zinc-500 mt-1.5 truncate">{lead.notes}</p>
            )}
          </div>
        ))}
      </div>

      {/* Desktop: table layout */}
      <div className="hidden sm:block overflow-x-auto">
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
    </>
  );
}
