'use client';

import { useRef, useState } from 'react';
import { Lead, LeadStatus } from './types';

const COLUMNS: {
  status: LeadStatus;
  label: string;
  textColor: string;
  badgeBg: string;
  avatarBg: string;
  highlightBorder: string;
}[] = [
  {
    status: 'Por contactar',
    label: 'Por Contactar',
    textColor: 'text-zinc-300',
    badgeBg: 'bg-zinc-500/20',
    avatarBg: 'bg-zinc-700',
    highlightBorder: 'border-zinc-500',
  },
  {
    status: 'Contactado',
    label: 'Contactado',
    textColor: 'text-blue-300',
    badgeBg: 'bg-blue-500/20',
    avatarBg: 'bg-blue-900',
    highlightBorder: 'border-blue-500',
  },
  {
    status: 'Aula agendada',
    label: 'Aula Agendada',
    textColor: 'text-amber-300',
    badgeBg: 'bg-amber-500/20',
    avatarBg: 'bg-amber-900',
    highlightBorder: 'border-amber-500',
  },
  {
    status: 'Aula realizada',
    label: 'Aula Realizada',
    textColor: 'text-purple-300',
    badgeBg: 'bg-purple-500/20',
    avatarBg: 'bg-purple-900',
    highlightBorder: 'border-purple-500',
  },
  {
    status: 'Aguarda decisao',
    label: 'Aguarda Decisão',
    textColor: 'text-orange-300',
    badgeBg: 'bg-orange-500/20',
    avatarBg: 'bg-orange-900',
    highlightBorder: 'border-orange-500',
  },
  {
    status: 'Inscrito',
    label: 'Inscrito',
    textColor: 'text-emerald-300',
    badgeBg: 'bg-emerald-500/20',
    avatarBg: 'bg-emerald-900',
    highlightBorder: 'border-emerald-500',
  },
  {
    status: 'Nao inscrito',
    label: 'Não Inscrito',
    textColor: 'text-red-300',
    badgeBg: 'bg-red-500/20',
    avatarBg: 'bg-red-900',
    highlightBorder: 'border-red-500',
  },
];

function initials(name: string) {
  return (
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  );
}

const todayKey = () => new Date().toISOString().slice(0, 10);

interface LeadsKanbanProps {
  leads: Lead[];
  onCardClick: (lead: Lead) => void;
  onStatusChange: (lead: Lead, newStatus: LeadStatus) => void;
}

export default function LeadsKanban({ leads, onCardClick, onStatusChange }: LeadsKanbanProps) {
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<LeadStatus | null>(null);
  const [activeMobileIndex, setActiveMobileIndex] = useState(0);
  const mobileScrollRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    setDraggedLeadId(lead.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: LeadStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStatus(status);
  };

  const handleDragLeave = () => {
    setDragOverStatus(null);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: LeadStatus) => {
    e.preventDefault();
    const lead = leads.find((l) => l.id === draggedLeadId);
    if (lead && lead.status !== targetStatus) {
      onStatusChange(lead, targetStatus);
    }
    setDraggedLeadId(null);
    setDragOverStatus(null);
  };

  const handleDragEnd = () => {
    setDraggedLeadId(null);
    setDragOverStatus(null);
  };

  const scrollToColumn = (index: number) => {
    const container = mobileScrollRef.current;
    const child = container?.children[index] as HTMLElement | undefined;
    child?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
  };

  const handleMobileScroll = () => {
    const container = mobileScrollRef.current;
    if (!container || container.clientWidth === 0) return;
    const index = Math.round(container.scrollLeft / container.clientWidth);
    setActiveMobileIndex(Math.min(Math.max(index, 0), COLUMNS.length - 1));
  };

  const renderColumn = ({ status, label, textColor, badgeBg, avatarBg, highlightBorder }: (typeof COLUMNS)[number]) => {
    const columnLeads = leads.filter((l) => l.status === status);
    const isOver = dragOverStatus === status;

    return (
      <div
        key={status}
        className={`flex h-full flex-col rounded-xl border transition-colors ${
          isOver ? `${highlightBorder} bg-white/[0.03]` : 'border-transparent'
        }`}
        onDragOver={(e) => handleDragOver(e, status)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, status)}
      >
        {/* Column header */}
        <div className="mb-2 flex items-center justify-between px-1 pt-1">
          <span className={`text-xs font-bold truncate ${textColor}`}>{label}</span>
          <span className={`ml-1 shrink-0 rounded-full px-1.5 py-0.5 text-xs font-bold ${badgeBg} ${textColor}`}>
            {columnLeads.length}
          </span>
        </div>

        {/* Cards */}
        <div className="flex flex-1 flex-col gap-2 p-1">
          {columnLeads.length === 0 ? (
            <div
              className={`flex flex-1 items-center justify-center rounded-lg border border-dashed p-4 text-center text-xs text-zinc-700 transition-colors ${
                isOver ? 'border-zinc-500 text-zinc-500' : 'border-[#222]'
              }`}
            >
              {isOver ? 'Soltar aqui' : 'Sem leads'}
            </div>
          ) : (
            columnLeads.map((lead) => {
              const overdue = lead.next_contact_date && lead.next_contact_date < todayKey();
              const isDragging = draggedLeadId === lead.id;

              return (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, lead)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onCardClick(lead)}
                  className={`cursor-grab select-none rounded-xl border border-[#222] bg-[#161616] p-3 transition-all active:cursor-grabbing hover:border-[#333] hover:bg-[#1d1d1d] ${
                    isDragging ? 'scale-95 opacity-40' : ''
                  }`}
                >
                  {/* Avatar + name */}
                  <div className="mb-2 flex items-center gap-2">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${avatarBg}`}
                    >
                      {initials(lead.name || '?')}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold leading-snug text-white">
                        {lead.name || '(sem nome)'}
                      </p>
                      <p className="mt-0.5 text-[10px] text-zinc-600">{lead.contact_date || '—'}</p>
                    </div>
                  </div>

                  {/* Contact details */}
                  <div className="space-y-1">
                    {lead.email && <p className="truncate text-[10px] text-zinc-500">{lead.email}</p>}
                    {lead.phone && <p className="text-[10px] text-zinc-400">{lead.phone}</p>}
                  </div>

                  {/* Chips */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="rounded-full border border-[#2a2a2a] bg-[#111] px-1.5 py-0.5 text-[10px] text-zinc-600">
                      {lead.contact_source}
                    </span>
                    <span className="rounded-full border border-[#2a2a2a] bg-[#111] px-1.5 py-0.5 text-[10px] text-zinc-600">
                      {lead.class_type}
                    </span>
                  </div>

                  {/* Overdue */}
                  {overdue && <p className="mt-1.5 text-[10px] font-medium text-red-400">⚠ Follow-up em atraso</p>}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile (<sm): one column per screen, scroll-snap, with a tab indicator above */}
      <div className="sm:hidden">
        <div className="mb-2 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {COLUMNS.map(({ status, label, textColor, badgeBg }, index) => {
            const count = leads.filter((l) => l.status === status).length;
            const isActive = index === activeMobileIndex;
            return (
              <button
                key={status}
                type="button"
                onClick={() => scrollToColumn(index)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2.5 text-xs font-semibold transition-colors ${
                  isActive ? `border-[#c81d25] bg-[rgba(200,29,37,0.1)] ${textColor}` : 'border-[#222] text-zinc-500'
                }`}
              >
                {label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${badgeBg} ${textColor}`}>{count}</span>
              </button>
            );
          })}
        </div>

        <div
          ref={mobileScrollRef}
          onScroll={handleMobileScroll}
          className="flex snap-x snap-mandatory overflow-x-auto"
          style={{ minHeight: '420px' }}
        >
          {COLUMNS.map((col) => (
            <div key={col.status} className="w-full shrink-0 snap-center px-1">
              {renderColumn(col)}
            </div>
          ))}
        </div>
      </div>

      {/* sm and up: side-by-side grid */}
      <div className="hidden gap-2 sm:grid sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7" style={{ minHeight: '420px' }}>
        {COLUMNS.map((col) => renderColumn(col))}
      </div>
    </>
  );
}
