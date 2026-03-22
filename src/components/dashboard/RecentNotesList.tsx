'use client';

import { useRouter } from 'next/navigation';
import Panel from './Panel';
import { NoteItem } from './types';

const audienceClass: Record<NoteItem['audience'], string> = {
  Kid: 'bg-[#3a161a] text-[#f87171]',
  Adult: 'bg-[#10233a] text-[#60a5fa]',
};

export default function RecentNotesList({ notes, loading = false }: { notes: NoteItem[]; loading?: boolean }) {
  const router = useRouter();

  return (
    <Panel title="Notas Recentes" icon={<span className="text-[#c81d25]">✎</span>} actionText="Ver tudo" onAction={() => router.push('/members')}>
      {loading ? (
        <p className="py-4 text-sm text-zinc-500">A carregar recent notes...</p>
      ) : notes.length === 0 ? (
        <p className="py-4 text-sm text-zinc-500">Não teacher comments yet.</p>
      ) : (
        <ul className="space-y-1">
          {notes.map((note) => (
            <li key={note.id} className="flex items-center gap-3 border-b border-[#1f1f1f] py-2 last:border-b-0">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-zinc-700 text-xs text-white">{note.name.charAt(0)}</div>
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${audienceClass[note.audience]}`}>{note.audience}</span>
              <p className="min-w-0 flex-1 truncate text-sm text-zinc-200">{note.name} — {note.preview}</p>
              <span className="text-xs text-zinc-500">{note.time}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
