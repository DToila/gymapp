"use client";

import { useMemo, useState } from 'react';
import { AnnouncementItem } from '../dashboard/types';
import StudentShell from './StudentShell';
import { audienceMatchesStudent } from './studentData';
import { useStudentMember } from './useStudentMember';
import { useAnnouncements } from '@/lib/useAnnouncements';

const tagChipClass: Record<AnnouncementItem['tag'], string> = {
  URGENT: 'border-[#7f1d1d] bg-[rgba(127,29,29,0.28)] text-[#fda4af]',
  INFO: 'border-[#3f3f46] bg-[rgba(63,63,70,0.28)] text-zinc-300',
  EVENT: 'border-[#581c87] bg-[rgba(88,28,135,0.26)] text-violet-300',
  PAYMENTS: 'border-[#7c2d12] bg-[rgba(124,45,18,0.3)] text-orange-300',
};

export default function StudentAnnouncementsPage() {
  const { isKid } = useStudentMember();
  const { announcements } = useAnnouncements();
  const [filter, setFilter] = useState<'ALL' | 'KIDS' | 'ADULTS'>('ALL');

  const rows = useMemo(() => {
    const nowKey = new Date().toISOString().split('T')[0];

    return announcements
      .filter((item) => item.approvalStatus === 'approved')
      .filter((item) => item.expiresAt >= nowKey)
      .filter((item) => audienceMatchesStudent(item, isKid))
      .filter((item) => {
        if (filter === 'ALL') return true;
        return item.audience === filter || item.audience === 'ALL';
      })
      .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || b.expiresAt.localeCompare(a.expiresAt));
  }, [announcements, filter, isKid]);

  return (
    <StudentShell ativo="announcements" title="Anúncios" subtitle="Latest student announcements">
      <section className="rounded-2xl border border-[#222] bg-[#121212] p-4 shadow-[0_8px_22px_rgba(0,0,0,0.35)]">
        <div className="mb-3 flex items-center gap-2">
          {(['ALL', 'KIDS', 'ADULTS'] as Array<'ALL' | 'KIDS' | 'ADULTS'>).map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`rounded-xl border px-3 py-1.5 text-sm ${filter === item ? 'border-[#c81d25] bg-[rgba(200,29,37,0.2)] text-white' : 'border-[#2a2a2a] bg-[#171717] text-zinc-400'}`}
            >
              {item === 'ALL' ? 'Todos' : item === 'KIDS' ? 'Crianças' : 'Adultos'}
            </button>
          ))}
        </div>

        <ul className="space-y-2">
          {rows.length === 0 ? (
            <li className="rounded-xl border border-[#202020] bg-[#111] px-3 py-3 text-sm text-zinc-500">Não ativo announcements.</li>
          ) : (
            rows.map((item) => (
              <li key={item.id} className="rounded-xl border border-[#202020] bg-[#111] px-3 py-3">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${tagChipClass[item.tag]}`}>
                    {item.tag}
                  </span>
                  {item.pinned ? <span className="text-xs text-zinc-300">📌</span> : null}
                </div>
                <p className="text-sm font-medium text-zinc-100">{item.title}</p>
                <p className="mt-1 text-xs text-zinc-500">Expires: {new Date(`${item.expiresAt}T12:00:00`).toLocaleDateString('en-GB')}</p>
              </li>
            ))
          )}
        </ul>
      </section>
    </StudentShell>
  );
}
