"use client";

import { MemberGameTag } from '../../../lib/types';

// Renders nothing at all — no empty state, no prompt — unless the student
// has a complete (4-5 tag) selection saved. An incomplete/abandoned attempt
// (1-3 tags) must stay invisible on the dashboard, per spec.
export default function MyGameCard({ tags }: { tags: MemberGameTag[] }) {
  if (tags.length < 4) return null;

  const ordered = [...tags].sort((a, b) => a.priority - b.priority);

  return (
    <div className="rounded-2xl border border-[#222] bg-[#121212] p-4 shadow-[0_8px_22px_rgba(0,0,0,0.35)]">
      <p className="mb-2 text-xl font-semibold text-zinc-100">O Meu Jogo</p>
      <ol className="space-y-2">
        {ordered.map((tag) => (
          <li key={tag.tag_id} className="flex items-center gap-3 rounded-xl border border-[#202020] bg-[#111] px-3 py-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#c81d25] text-xs font-bold text-white">
              {tag.priority}
            </span>
            <span className="text-sm text-zinc-200">{tag.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
