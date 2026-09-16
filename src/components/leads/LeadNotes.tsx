'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

export interface LeadNote {
  id: string;
  lead_id: string;
  staff_name: string;
  staff_email: string | null;
  note_text: string;
  created_at: string;
}

interface LeadNotesProps {
  leadId: string;
  currentStaffName: string;
  currentStaffEmail: string | null;
}

const formatTimestamp = (iso: string) =>
  new Date(iso).toLocaleString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function LeadNotes({ leadId, currentStaffName, currentStaffEmail }: LeadNotesProps) {
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadNotes = async () => {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('lead_notes')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (cancelled) return;
      if (fetchError) {
        setError('Não foi possível carregar as notas internas.');
      } else {
        setNotes(data || []);
      }
      setLoading(false);
    };

    loadNotes();
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  const handleAddNote = async () => {
    const trimmed = draft.trim();
    if (!trimmed || saving) return;

    setSaving(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from('lead_notes')
      .insert([
        {
          lead_id: leadId,
          staff_name: currentStaffName,
          staff_email: currentStaffEmail,
          note_text: trimmed,
        },
      ])
      .select()
      .single();

    if (insertError) {
      setError('Não foi possível guardar a nota.');
    } else if (data) {
      setNotes((prev) => [data, ...prev]);
      setDraft('');
    }
    setSaving(false);
  };

  return (
    <div className="rounded-2xl border border-[#2a2440] bg-[#14101f] p-4">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#c4b5fd]">
        Histórico de Contacto (notas internas)
      </p>
      <p className="mb-3 text-[11px] text-zinc-500">
        Só a equipa vê isto — regista aqui chamadas e tentativas de contacto. Não é o mesmo que a "Mensagem Inicial
        (formulário)" enviada pelo próprio lead.
      </p>

      {error && (
        <div className="mb-3 rounded-lg border border-[#ef4444]/40 bg-[#ef4444]/10 px-3 py-2 text-xs text-[#fca5a5]">
          {error}
        </div>
      )}

      <div className="mb-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleAddNote();
            }
          }}
          placeholder='Ex: "liguei, não atendeu"'
          disabled={saving}
          className="flex-1 rounded-xl border border-[#2a2440] bg-[#0f0c1a] px-3 py-2 text-sm text-white focus:border-[#8b5cf6] focus:outline-none disabled:opacity-60"
        />
        <button
          type="button"
          onClick={handleAddNote}
          disabled={saving || !draft.trim()}
          className="rounded-xl bg-[#7c3aed] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#6d28d9] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? '...' : 'Adicionar'}
        </button>
      </div>

      <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
        {loading ? (
          <p className="text-xs text-zinc-500">A carregar...</p>
        ) : notes.length === 0 ? (
          <p className="text-xs text-zinc-500">Ainda sem notas internas para este lead.</p>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="rounded-xl border border-[#221d38] bg-[#171229] px-3 py-2">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#c4b5fd]">{note.staff_name}</span>
                <span className="text-[10px] text-zinc-500">{formatTimestamp(note.created_at)}</span>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm text-zinc-200">{note.note_text}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
