"use client";

import { useEffect, useState } from 'react';
import { getMembers, getRecentTeacherNotes } from '../../../lib/database';
import { getAgeFromDateOfBirth } from '../../../lib/types';
import { kpis, notes as notesFallback, unpaidPayments, kidsNeedsAttention, kidsGreatBehavior, attendanceRecent, requests, birthdays } from './mockData';
import Topbar from './Topbar';
import KpiCard from './KpiCard';
import RecentNotesList from './RecentNotesList';
import UnpaidPaymentsTable from './UnpaidPaymentsTable';
import KidsBehaviorPanel from './KidsBehaviorPanel';
import AttendancePanel from './AttendancePanel';
import PendingRequestsList from './PendingRequestsList';
import UpcomingBirthdays from './UpcomingBirthdays';
import TeacherSidebar from '@/components/members/TeacherSidebar';
import { NoteItem } from './types';

const getRelativeTime = (isoDate: string): string => {
  const then = new Date(isoDate).getTime();
  if (Number.isNaN(then)) return 'Just now';

  const diffSeconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSeconds < 60) return 'Just now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} min ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  return 'Yesterday';
};

export default function DashboardPage({ onLogout }: { onLogout: () => void }) {
  const [recentNotes, setRecentNotes] = useState<NoteItem[]>(notesFallback.slice(0, 5));

  useEffect(() => {
    const loadRecentNotes = async () => {
      try {
        const [recent, members] = await Promise.all([
          getRecentTeacherNotes(5),
          getMembers(),
        ]);

        const memberById = new Map(members.map((member) => [member.id, member]));
        const mapped: NoteItem[] = recent.map((note) => {
          const member = memberById.get(note.member_id);
          const age = member?.date_of_birth ? getAgeFromDateOfBirth(member.date_of_birth) : null;
          const audience: 'Kid' | 'Adult' = age !== null && age < 16 ? 'Kid' : 'Adult';

          return {
            id: note.id,
            name: member?.name || 'Unknown Student',
            audience,
            preview: `${note.teacher_name}: ${note.note_text}`,
            time: getRelativeTime(note.created_at),
          };
        });

        setRecentNotes(mapped);
      } catch (error) {
        console.error('Error loading recent notes:', error);
        setRecentNotes(notesFallback.slice(0, 5));
      }
    };

    loadRecentNotes();
  }, []);

  return (
    <div className="flex min-h-screen bg-[#0b0b0b] text-zinc-100">
      <TeacherSidebar active="dashboard" requestsCount={requests.length} onLogout={onLogout} />

      <main className="flex-1 p-6 lg:p-8">
        <Topbar />

        <header className="mb-6">
          <h1 className="text-4xl font-bold text-white">Dashboard</h1>
          <p className="mt-1 text-lg text-zinc-400">Welcome back, Professor</p>
        </header>

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((item) => (
            <KpiCard key={item.id} item={item} />
          ))}
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            <RecentNotesList notes={recentNotes} />
            <UnpaidPaymentsTable rows={unpaidPayments} />
          </div>

          <div className="space-y-4 lg:col-span-5">
            <KidsBehaviorPanel needsAttention={kidsNeedsAttention} greatBehavior={kidsGreatBehavior} />
            <AttendancePanel checkedIn={27} total={62} recent={attendanceRecent} />
            <PendingRequestsList requests={requests} />
            <UpcomingBirthdays items={birthdays} />
          </div>
        </section>
      </main>
    </div>
  );
}
