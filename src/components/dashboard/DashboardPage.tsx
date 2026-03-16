"use client";

import { useEffect, useState } from 'react';
import { getMembers, getRecentTeacherNotes } from '../../../lib/database';
import { getAgeFromDateOfBirth } from '../../../lib/types';
import { kpis, unpaidPayments, attendanceRecent, requests, birthdays } from './mockData';
import Topbar from './Topbar';
import KpiCard from './KpiCard';
import RecentNotesList from './RecentNotesList';
import UnpaidPaymentsTable from './UnpaidPaymentsTable';
import KidsBehaviorPanel from './KidsBehaviorPanel';
import AttendancePanel from './AttendancePanel';
import PendingRequestsList from './PendingRequestsList';
import UpcomingBirthdays from './UpcomingBirthdays';
import TeacherSidebar from '@/components/members/TeacherSidebar';
import { KidBehaviorItem, NoteItem } from './types';

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
  const [recentNotes, setRecentNotes] = useState<NoteItem[]>([]);
  const [recentNotesLoading, setRecentNotesLoading] = useState(true);
  const [kidsMembers, setKidsMembers] = useState<KidBehaviorItem[]>([]);
  const [kidsBehaviorEvents, setKidsBehaviorEvents] = useState<Array<{ kidId: string; createdAt: string; value: 'GOOD' | 'NEUTRAL' | 'BAD' }>>([]);

  useEffect(() => {
    const loadRecentNotes = async () => {
      setRecentNotesLoading(true);
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

        const realKids: KidBehaviorItem[] = members
          .filter((member) => {
            if (!member.date_of_birth) return false;
            const age = getAgeFromDateOfBirth(member.date_of_birth);
            return age !== null && age < 16;
          })
          .map((member, index) => ({
            id: member.id,
            name: member.name,
            group: `Kids ${(index % 3) + 1}`,
          }));

        const moodToBehavior = (moodRaw: string | undefined): 'GOOD' | 'NEUTRAL' | 'BAD' | null => {
          const mood = String(moodRaw || '').toLowerCase();
          if (mood === 'happy') return 'GOOD';
          if (mood === 'neutral') return 'NEUTRAL';
          if (mood === 'sad') return 'BAD';
          return null;
        };

        const behaviorEvents = realKids.flatMap((kid) => {
          const member = memberById.get(kid.id) as any;
          const moodHistory = member?.attendance_mood as Record<string, string> | undefined;
          if (!moodHistory) return [];

          return Object.entries(moodHistory)
            .map(([date, mood]) => {
              const value = moodToBehavior(mood);
              if (!value) return null;
              return {
                kidId: kid.id,
                createdAt: new Date(`${date}T12:00:00`).toISOString(),
                value,
              };
            })
            .filter((event): event is { kidId: string; createdAt: string; value: 'GOOD' | 'NEUTRAL' | 'BAD' } => Boolean(event));
        });

        setRecentNotes(mapped);
        setKidsMembers(realKids);
        setKidsBehaviorEvents(behaviorEvents);
      } catch (error) {
        console.error('Error loading recent notes:', error);
        setRecentNotes([]);
        setKidsMembers([]);
        setKidsBehaviorEvents([]);
      } finally {
        setRecentNotesLoading(false);
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
            <RecentNotesList notes={recentNotes} loading={recentNotesLoading} />
            <UnpaidPaymentsTable rows={unpaidPayments} />
          </div>

          <div className="space-y-4 lg:col-span-5">
            <KidsBehaviorPanel needsAttention={kidsMembers} greatBehavior={kidsMembers} behaviorEvents={kidsBehaviorEvents} />
            <AttendancePanel checkedIn={27} total={62} recent={attendanceRecent} />
            <PendingRequestsList requests={requests} />
            <UpcomingBirthdays items={birthdays} />
          </div>
        </section>
      </main>
    </div>
  );
}
