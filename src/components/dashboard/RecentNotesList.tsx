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
    <Panel title="Notas Recentes" icon={<span className="text-[#c81d25]">✎</span>}>
      {loading ? (
        <p className="py-4 text-sm text-zinc-500">A carregar recent notes...</p>
      ) : notes.length === 0 ? (
        <p className="py-4 text-sm text-zinc-500">Não teacher comments yet.</p>
      ) : (
        <ul className="space-y-1">
          {notes.map((note) => (
            <li key={note.id} className="border-b border-[#1f1f1f] last:border-b-0">
              <button
                type="button"
                onClick={() => router.push(`/members/${note.memberId}`)}
                className="flex w-full flex-col gap-1.5 py-2.5 text-left transition hover:bg-white/[0.03]"
              >
                <span className="flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-zinc-700 text-xs text-white">
                    {note.name.charAt(0)}
                  </span>
                  <span className="truncate text-sm font-semibold text-zinc-100">{note.name}</span>
                  <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${audienceClass[note.audience]}`}>
                    {note.audience}
                  </span>
                  <span className="ml-auto shrink-0 text-xs text-zinc-500">{note.time}</span>
                </span>
                <span className="whitespace-pre-wrap break-words pl-9 text-sm text-zinc-400">{note.preview}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
