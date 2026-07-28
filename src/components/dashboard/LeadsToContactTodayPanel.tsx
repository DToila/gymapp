'use client';

import { useRouter } from 'next/navigation';
import Panel from './Panel';
import { LeadAwaitingDecision } from '@/components/leads/leadAutomation';

export default function LeadsToContactTodayPanel({ leads }: { leads: LeadAwaitingDecision[] }) {
  const router = useRouter();

  return (
    <Panel
      title="Leads para Contactar Hoje"
      icon={<span className="text-[#c81d25]">◷</span>}
      actionText="Ver Leads"
      onAction={() => router.push('/leads')}
    >
      {leads.length === 0 ? (
        <p className="px-1 py-2 text-sm text-zinc-500">Sem leads à espera de decisão há muito tempo. Tudo em dia.</p>
      ) : (
        <ul className="space-y-2">
          {leads.map((lead) => (
            <li key={lead.id} className="flex items-center gap-3 border-b border-[#1f1f1f] py-2 last:border-b-0">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-orange-900 text-xs text-white">
                {(lead.name || '?').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-zinc-200">{lead.name}</p>
                <p className="truncate text-xs text-zinc-500">{lead.phone || lead.email || 'Sem contacto'}</p>
              </div>
              <span className="shrink-0 rounded-full border border-orange-900/50 bg-orange-500/10 px-2 py-0.5 text-[11px] font-semibold text-orange-300">
                {lead.daysInDecisionStage !== null ? `${lead.daysInDecisionStage}d à espera` : 'sem histórico'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
