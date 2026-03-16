"use client";

import { useCallback, useEffect, useState } from 'react';
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
import { BEHAVIOR_EVENTS_STORAGE_KEY, BEHAVIOR_UPDATED_EVENT, readBehaviorEvents } from '@/lib/attendanceState';

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

  const loadDashboardData = useCallback(async () => {
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

      const kidIds = new Set(realKids.map((kid) => kid.id));
      const mergedBehaviorEvents = readBehaviorEvents()
        .filter((event) => kidIds.has(event.kidId))
        .map((event) => ({
          kidId: event.kidId,
          createdAt: new Date(`${event.dateKey}T12:00:00`).toISOString(),
          value: event.value,
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setRecentNotes(mapped);
      setKidsMembers(realKids);
      setKidsBehaviorEvents(mergedBehaviorEvents);
    } catch (error) {
      console.error('Error loading recent notes:', error);
      setRecentNotes([]);
      setKidsMembers([]);
      setKidsBehaviorEvents([]);
    } finally {
      setRecentNotesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === BEHAVIOR_EVENTS_STORAGE_KEY) {
        loadDashboardData();
      }
    };

    const handleBehaviorUpdated = () => {
      loadDashboardData();
    };

    const handleFocus = () => {
      loadDashboardData();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(BEHAVIOR_UPDATED_EVENT, handleBehaviorUpdated as EventListener);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(BEHAVIOR_UPDATED_EVENT, handleBehaviorUpdated as EventListener);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [loadDashboardData]);

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
