'use client';

import { useState } from 'react';
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

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2" style={{ minHeight: '420px' }}>
      {COLUMNS.map(({ status, label, textColor, badgeBg, avatarBg, highlightBorder }) => {
        const columnLeads = leads.filter((l) => l.status === status);
        const isOver = dragOverStatus === status;

        return (
          <div
            key={status}
            className={`flex flex-col rounded-xl border transition-colors ${
              isOver
                ? `${highlightBorder} bg-white/[0.03]`
                : 'border-transparent'
            }`}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between mb-2 px-1 pt-1">
              <span className={`text-xs font-bold truncate ${textColor}`}>{label}</span>
              <span className={`ml-1 shrink-0 text-xs font-bold px-1.5 py-0.5 rounded-full ${badgeBg} ${textColor}`}>
                {columnLeads.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2 flex-1 p-1">
              {columnLeads.length === 0 ? (
                <div
                  className={`rounded-lg border border-dashed p-4 text-center text-xs text-zinc-700 flex-1 flex items-center justify-center transition-colors ${
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
                      className={`rounded-xl border border-[#222] bg-[#161616] p-3 cursor-grab active:cursor-grabbing hover:bg-[#1d1d1d] hover:border-[#333] transition-all select-none ${
                        isDragging ? 'opacity-40 scale-95' : ''
                      }`}
                    >
                      {/* Avatar + name */}
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${avatarBg}`}
                        >
                          {initials(lead.name || '?')}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate leading-snug">
                            {lead.name || '(sem nome)'}
                          </p>
                          <p className="text-[10px] text-zinc-600 mt-0.5">{lead.contact_date || '—'}</p>
                        </div>
                      </div>

                      {/* Contact details */}
                      <div className="space-y-1">
                        {lead.email && (
                          <p className="text-[10px] text-zinc-500 truncate">{lead.email}</p>
                        )}
                        {lead.phone && (
                          <p className="text-[10px] text-zinc-400">{lead.phone}</p>
                        )}
                      </div>

                      {/* Chips */}
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="text-[10px] text-zinc-600 bg-[#111] border border-[#2a2a2a] rounded-full px-1.5 py-0.5">
                          {lead.contact_source}
                        </span>
                        <span className="text-[10px] text-zinc-600 bg-[#111] border border-[#2a2a2a] rounded-full px-1.5 py-0.5">
                          {lead.class_type}
                        </span>
                      </div>

                      {/* Overdue */}
                      {overdue && (
                        <p className="mt-1.5 text-[10px] text-red-400 font-medium">⚠ Follow-up em atraso</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
