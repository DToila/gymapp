"use client";

import { useCallback, useEffect, useState } from 'react';
import { getAttendanceForDate, getKidBehaviorEvents, getMembers, getRecentTeacherNotes } from '../../../lib/database';
import { getAgeFromDateOfBirth } from '../../../lib/types';
import { announcements, kpis, unpaidPayments, birthdays } from './mockData';
import Topbar from './Topbar';
import KpiCard from './KpiCard';
import RecentNotesList from './RecentNotesList';
import UnpaidPaymentsTable from './UnpaidPaymentsTable';
import KidsBehaviorPanel from './KidsBehaviorPanel';
import AttendancePanel from './AttendancePanel';
import PendingRequestsList from './PendingRequestsList';
import UpcomingBirthdays from './UpcomingBirthdays';
import AnnouncementsPanel from './AnnouncementsPanel';
import TeacherSidebar from '@/components/members/TeacherSidebar';
import { AppRole, AttendanceRecentItem, KidBehaviorItem, NoteItem, RequestItem } from './types';
import { ATTENDANCE_UPDATED_EVENT, BEHAVIOR_UPDATED_EVENT, readBehaviorEvents, toDateKey } from '@/lib/attendanceState';
import { supabase } from '../../../lib/supabase';

const getRelativeTime = (isoDate: string): string => {
  const then = new Date(isoDate).getTime();
  if (Number.isNaN(then)) return 'Just now';

  const diffSeconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSeconds < 60) return 'Just now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} min ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  return 'Yesterday';
};

export default function DashboardPage({ onLogout }: { onLogout?: () => void }) {
  const [recentNotes, setRecentNotes] = useState<NoteItem[]>([]);
  const [recentNotesLoading, setRecentNotesLoading] = useState(true);
  const [behaviorMode, setBehaviorMode] = useState<'now' | 'month'>('now');
  const [kidsMembers, setKidsMembers] = useState<KidBehaviorItem[]>([]);
  const [kidsBehaviorEvents, setKidsBehaviorEvents] = useState<Array<{ kidId: string; createdAt: string; value: 'GOOD' | 'NEUTRAL' | 'BAD' }>>([]);
  const [todayCheckedIn, setTodayCheckedIn] = useState(0);
  const [todayTotalMembers, setTodayTotalMembers] = useState(0);
  const [todayRecentAttendance, setTodayRecentAttendance] = useState<AttendanceRecentItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<RequestItem[]>([]);
  const [currentRole, setCurrentRole] = useState<AppRole>('coach');
  const [currentName, setCurrentName] = useState('Professor');

  const isCoach = currentRole === 'coach';

  useEffect(() => {
    const loadProfileRole = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .maybeSingle();

      if (data?.role && ['admin', 'staff', 'coach'].includes(data.role)) {
        setCurrentRole(data.role as AppRole);
      }

      if (data?.full_name) {
        setCurrentName(data.full_name);
      }
    };

    loadProfileRole();
  }, []);

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

      const mappedPendingRequests: RequestItem[] = members
        .filter((member) => String((member.status || '')).trim().toLowerCase() === 'pending')
        .map((member) => {
          const createdAt = new Date(member.created_at || '');
          const createdAtMs = Number.isNaN(createdAt.getTime()) ? 0 : createdAt.getTime();
          const requestedAt = Number.isNaN(createdAt.getTime())
            ? 'Requested recently'
            : `Requested ${createdAt.toLocaleDateString('en-GB')}`;

          return {
            id: member.id,
            name: member.name,
            requestedAt,
            createdAtMs,
          };
        })
        .sort((a, b) => b.createdAtMs - a.createdAtMs)
        .map(({ id, name, requestedAt }) => ({ id, name, requestedAt }));

      setRecentNotes(mapped);
      setPendingRequests(mappedPendingRequests);
    } catch (error) {
      console.error('Error loading recent notes:', error);
      setRecentNotes([]);
      setPendingRequests([]);
    } finally {
      setRecentNotesLoading(false);
    }
  }, []);

  const fetchKidsBehavior = useCallback(async (mode: 'now' | 'month') => {
    try {
      const members = await getMembers();
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

      const now = new Date();
      const toKey = toDateKey(now);
      const fromDate = new Date(now);
      if (mode === 'now') {
        fromDate.setDate(fromDate.getDate() - 6);
      } else {
        fromDate.setDate(1);
      }
      const fromDateKey = toDateKey(fromDate);

      let dbEvents: Awaited<ReturnType<typeof getKidBehaviorEvents>> = [];
      try {
        dbEvents = await getKidBehaviorEvents({ fromDateKey, toDateKey: toKey });
      } catch (error) {
        console.error('dashboard behavior db fetch error', error);
      }

      const localEvents = readBehaviorEvents().filter(
        (event) => event.dateKey >= fromDateKey && event.dateKey <= toKey
      );

      const events = [
        ...dbEvents.map((event) => ({
          kid_id: event.kid_id,
          date: event.date,
          value: event.value,
          created_at: event.created_at || new Date(`${event.date}T12:00:00`).toISOString(),
        })),
        ...localEvents.map((event) => ({
          kid_id: event.kidId,
          date: event.dateKey,
          value: event.value,
          created_at: new Date(event.createdAt).toISOString(),
        })),
      ];

      console.log('dashboard behavior fetch', {
        fromDateKey,
        toDateKey: toKey,
        count: events.length,
        sample: events[0] || null,
      });

      const kidIds = new Set(realKids.map((kid) => kid.id));
      const dedupedByKidAndDate = new Map<string, { kidId: string; createdAt: string; value: 'GOOD' | 'NEUTRAL' | 'BAD' }>();

      events
        .filter((event) => kidIds.has(event.kid_id))
        .forEach((event) => {
          const createdAt = event.created_at || new Date(`${event.date}T12:00:00`).toISOString();
          const key = `${event.kid_id}:${event.date}`;
          const existing = dedupedByKidAndDate.get(key);

          if (!existing || new Date(createdAt).getTime() >= new Date(existing.createdAt).getTime()) {
            dedupedByKidAndDate.set(key, {
              kidId: event.kid_id,
              createdAt,
              value: event.value,
            });
          }
        });

      const mappedEvents = Array.from(dedupedByKidAndDate.values())
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setKidsMembers(realKids);
      setKidsBehaviorEvents(mappedEvents);
    } catch (error) {
      console.error('Error fetching kids behavior:', error);
      setKidsMembers([]);
      setKidsBehaviorEvents([]);
    }
  }, []);

  const fetchTodayAttendance = useCallback(async () => {
    try {
      const todayKey = toDateKey(new Date());
      const [members, checkedInIds] = await Promise.all([
        getMembers(),
        getAttendanceForDate(todayKey),
      ]);

      const memberById = new Map(members.map((member) => [member.id, member]));
      const recent = checkedInIds
        .map((memberId, index) => {
          const member = memberById.get(memberId);
          if (!member) return null;
          return {
            id: `${memberId}-${index}`,
            name: member.name,
            time: 'Today',
          };
        })
        .filter((item): item is AttendanceRecentItem => item !== null)
        .slice(0, 5);

      setTodayCheckedIn(checkedInIds.length);
      setTodayTotalMembers(members.length);
      setTodayRecentAttendance(recent);
    } catch (error) {
      console.error('Error fetching today attendance:', error);
      setTodayCheckedIn(0);
      setTodayTotalMembers(0);
      setTodayRecentAttendance([]);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    fetchTodayAttendance();
  }, [fetchTodayAttendance, loadDashboardData]);

  useEffect(() => {
    fetchKidsBehavior(behaviorMode);
  }, [behaviorMode, fetchKidsBehavior]);

  useEffect(() => {
    const handleFocus = () => {
      loadDashboardData();
      fetchKidsBehavior(behaviorMode);
      fetchTodayAttendance();
    };

    const handleBehaviorUpdated = () => {
      fetchKidsBehavior(behaviorMode);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadDashboardData();
        fetchKidsBehavior(behaviorMode);
        fetchTodayAttendance();
      }
    };

    const handleAttendanceUpdated = () => {
      fetchTodayAttendance();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener(BEHAVIOR_UPDATED_EVENT, handleBehaviorUpdated);
    window.addEventListener(ATTENDANCE_UPDATED_EVENT, handleAttendanceUpdated);
    document.addEventListener('visibilitychange', handleVisibility);

    const channel = supabase
      .channel('dashboard-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kid_behavior_events' },
        () => {
          fetchKidsBehavior(behaviorMode);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance' },
        () => {
          fetchTodayAttendance();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'members' },
        () => {
          loadDashboardData();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener(BEHAVIOR_UPDATED_EVENT, handleBehaviorUpdated);
      window.removeEventListener(ATTENDANCE_UPDATED_EVENT, handleAttendanceUpdated);
      document.removeEventListener('visibilitychange', handleVisibility);
      supabase.removeChannel(channel);
    };
  }, [behaviorMode, fetchKidsBehavior, fetchTodayAttendance, loadDashboardData]);

  return (
    <div className="flex min-h-screen bg-[#0b0b0b] text-zinc-100">
      <TeacherSidebar
        active="dashboard"
        role={currentRole}
        requestsCount={pendingRequests.length}
        onLogout={onLogout}
      />

      <main className="flex-1 p-6 lg:p-8">
        <Topbar />

        <header className="mb-6">
          <h1 className="text-4xl font-bold text-white">Dashboard</h1>
          <p className="mt-1 text-lg text-zinc-400">Welcome back, {currentName}</p>
        </header>

        {!isCoach ? (
          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((item) => (
              <KpiCard key={item.id} item={item} />
            ))}
          </section>
        ) : null}

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            <AnnouncementsPanel items={announcements} currentUserRole={currentRole} currentUserName={currentName} />
            <RecentNotesList notes={recentNotes} loading={recentNotesLoading} />
            {!isCoach ? <UnpaidPaymentsTable rows={unpaidPayments} /> : null}
          </div>

          <div className="space-y-4 lg:col-span-5">
            <KidsBehaviorPanel
              needsAttention={kidsMembers}
              greatBehavior={kidsMembers}
              behaviorEvents={kidsBehaviorEvents}
              mode={behaviorMode}
              onModeChange={setBehaviorMode}
            />
            <AttendancePanel checkedIn={todayCheckedIn} total={todayTotalMembers} recent={todayRecentAttendance} />
            {!isCoach ? <PendingRequestsList requests={pendingRequests} /> : null}
            {!isCoach ? <UpcomingBirthdays items={birthdays} /> : null}
          </div>
        </section>
      </main>
    </div>
  );
}
