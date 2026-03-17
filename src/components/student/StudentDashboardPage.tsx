"use client";

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { announcements } from '../dashboard/mockData';
import StudentShell from './StudentShell';
import { audienceMatchesStudent, getTodayClasses, studentSchedule } from './studentData';
import { useStudentMember } from './useStudentMember';
import { getAttendanceForMember } from '../../../lib/database';
import { useEffect } from 'react';

export default function StudentDashboardPage() {
  const router = useRouter();
  const { member, isKid } = useStudentMember();
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({});
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');

  useEffect(() => {
    if (!member) return;
    getAttendanceForMember(member.id)
      .then((rows) => {
        const next: Record<string, boolean> = {};
        rows.forEach((row) => {
          next[row.date.split('T')[0]] = row.attended;
        });
        setAttendanceMap(next);
      })
      .catch((error) => console.error('Error loading student attendance:', error));
  }, [member]);

  const year = new Date().getFullYear();
  const daysInMonth = new Date(year, selectedMonth + 1, 0).getDate();
  const firstDay = new Date(year, selectedMonth, 1).getDay();
  const monthName = new Date(year, selectedMonth).toLocaleString('default', { month: 'long' });

  const attendanceCount = useMemo(() => {
    return Object.entries(attendanceMap).filter(([date, attended]) => {
      if (!attended) return false;
      const parsed = new Date(`${date}T12:00:00`);
      return parsed.getMonth() === selectedMonth;
    }).length;
  }, [attendanceMap, selectedMonth]);

  const lastAttendance = useMemo(() => {
    const dates = Object.keys(attendanceMap).filter((date) => attendanceMap[date]).sort((a, b) => b.localeCompare(a));
    return dates[0] || null;
  }, [attendanceMap]);

  const paidThrough = useMemo(() => {
    const now = new Date();
    now.setMonth(now.getMonth() + 1);
    return now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }, []);

  const studentAnnouncements = useMemo(() => {
    const nowKey = new Date().toISOString().split('T')[0];
    return announcements
      .filter((item) => item.expiresAt >= nowKey)
      .filter((item) => audienceMatchesStudent(item, isKid))
      .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || b.expiresAt.localeCompare(a.expiresAt));
  }, [isKid]);

  const todayClasses = getTodayClasses();
  const isPaid = member?.status !== 'Unpaid';

  const listRows = useMemo(() => {
    return Object.keys(attendanceMap)
      .filter((date) => attendanceMap[date])
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 12);
  }, [attendanceMap]);

  return (
    <StudentShell active="dashboard" title={member?.name || 'Aluno'} subtitle="Student area overview">
      <section className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-[#222] bg-[#121212] p-4 shadow-[0_8px_22px_rgba(0,0,0,0.35)]">
          <p className="mb-2 text-xl font-semibold text-zinc-100">Balance/Status</p>
          {isPaid ? (
            <>
              <div className="mb-2 inline-flex rounded-full border border-[#1f4d33] bg-[rgba(22,163,74,0.12)] px-3 py-1 text-xs font-semibold text-green-300">Paid</div>
              <p className="text-zinc-400">Paid through: {paidThrough}</p>
            </>
          ) : (
            <>
              <div className="mb-2 inline-flex rounded-full border border-[#5b1f24] bg-[rgba(239,68,68,0.15)] px-3 py-1 text-xs font-semibold text-rose-300">Unpaid</div>
              <p className="text-zinc-400">Amount due: €{(member?.fee || 0).toFixed(2)}</p>
              <button onClick={() => router.push('/student/payments')} className="mt-3 text-sm font-medium text-[#c81d25] hover:text-[#ef3a43]">View payments</button>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-[#222] bg-[#121212] p-4 shadow-[0_8px_22px_rgba(0,0,0,0.35)]">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xl font-semibold text-zinc-100">Horário</p>
            <div className="flex gap-2 text-xs">
              <button className="rounded-xl border border-[#2a2a2a] bg-[#171717] px-2 py-1 text-zinc-200">Hoje</button>
              <button onClick={() => router.push('/student/schedule')} className="rounded-xl border border-[#2a2a2a] bg-[#171717] px-2 py-1 text-zinc-400 hover:text-zinc-200">Ver semana</button>
            </div>
          </div>
          {todayClasses.length === 0 ? <p className="text-zinc-500">No classes today.</p> : (
            <ul className="space-y-2 text-sm text-zinc-300">
              {todayClasses.slice(0, 3).map((item) => (
                <li key={item.id} className="rounded-xl border border-[#202020] bg-[#111] px-3 py-2">{item.room} {item.time} • {item.level}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-[#222] bg-[#121212] p-4 shadow-[0_8px_22px_rgba(0,0,0,0.35)]">
          <p className="mb-2 text-xl font-semibold text-zinc-100">Presenças este mês</p>
          <p className="text-3xl font-bold text-white">{attendanceCount} treinos</p>
          <p className="mt-1 text-zinc-400">Último treino: {lastAttendance ? new Date(`${lastAttendance}T12:00:00`).toLocaleDateString('en-GB') : '—'}</p>
          <button onClick={() => router.push('/student/attendance')} className="mt-3 text-sm font-medium text-[#c81d25] hover:text-[#ef3a43]">Ver calendário</button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <div className="rounded-2xl border border-[#222] bg-[#121212] p-4 shadow-[0_8px_22px_rgba(0,0,0,0.35)]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-2xl font-semibold text-zinc-100">Calendário de Presenças</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setViewMode('month')} className={`rounded-xl border px-3 py-1.5 text-sm ${viewMode === 'month' ? 'border-[#c81d25] bg-[rgba(200,29,37,0.2)] text-white' : 'border-[#2a2a2a] bg-[#171717] text-zinc-400'}`}>Mês</button>
                <button onClick={() => setViewMode('list')} className={`rounded-xl border px-3 py-1.5 text-sm ${viewMode === 'list' ? 'border-[#c81d25] bg-[rgba(200,29,37,0.2)] text-white' : 'border-[#2a2a2a] bg-[#171717] text-zinc-400'}`}>Lista</button>
                <button onClick={() => setSelectedMonth((prev) => Math.max(0, prev - 1))} className="rounded-xl border border-[#2a2a2a] bg-[#171717] px-3 py-1.5 text-zinc-300">‹</button>
                <span className="text-zinc-300">{monthName} {year}</span>
                <button onClick={() => setSelectedMonth((prev) => Math.min(11, prev + 1))} className="rounded-xl border border-[#2a2a2a] bg-[#171717] px-3 py-1.5 text-zinc-300">›</button>
              </div>
            </div>

            {viewMode === 'month' ? (
              <>
                <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs text-zinc-500">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => <div key={d}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: firstDay }).map((_, index) => <div key={`empty-${index}`} className="h-16" />)}
                  {Array.from({ length: daysInMonth }, (_, index) => {
                    const day = index + 1;
                    const dateKey = `${year}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const attended = attendanceMap[dateKey];
                    const dateObj = new Date(`${dateKey}T12:00:00`);
                    const isFuture = dateObj > new Date();
                    const scheduled = [1, 2, 3, 4, 5, 6].includes(dateObj.getDay());

                    return (
                      <div key={dateKey} className="h-16 rounded-xl border border-[#202020] bg-[#111] p-2">
                        <p className="text-sm text-zinc-300">{day}</p>
                        <div className="mt-2 flex items-center justify-center">
                          {attended ? <span className="h-2.5 w-2.5 rounded-full bg-green-400" /> : isFuture && scheduled ? <span className="h-2.5 w-2.5 rounded-full border border-zinc-500" /> : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <ul className="space-y-2">
                {listRows.map((date) => (
                  <li key={date} className="rounded-xl border border-[#202020] bg-[#111] px-3 py-2 text-sm text-zinc-200">{new Date(`${date}T12:00:00`).toLocaleDateString('en-GB')}</li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex items-center gap-6 border-t border-[#1f1f1f] pt-3 text-sm text-zinc-400">
              <span>Treinos: {attendanceCount}</span>
              <span>Último treino: {lastAttendance ? new Date(`${lastAttendance}T12:00:00`).toLocaleDateString('en-GB') : '—'}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4 lg:col-span-4">
          <div className="rounded-2xl border border-[#222] bg-[#121212] p-4 shadow-[0_8px_22px_rgba(0,0,0,0.35)]">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xl font-semibold text-zinc-100">Horário</p>
              <button onClick={() => router.push('/student/schedule')} className="text-sm text-zinc-400 hover:text-zinc-200">Ver semana</button>
            </div>
            <ul className="space-y-2">
              {(todayClasses.length > 0 ? todayClasses : studentSchedule.slice(0, 3)).map((item) => (
                <li key={item.id} className="rounded-xl border border-[#202020] bg-[#111] px-3 py-2 text-sm text-zinc-300">
                  <p className="font-semibold text-zinc-100">{item.room} {item.time}</p>
                  <p>{item.level} {item.type === 'Sparring' ? <span className="ml-1 rounded-full border border-[#5b1f24] bg-[rgba(91,31,36,0.25)] px-1.5 py-0.5 text-[10px] text-rose-300">SPARRING</span> : null}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-[#222] bg-[#121212] p-4 shadow-[0_8px_22px_rgba(0,0,0,0.35)]">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xl font-semibold text-zinc-100">Anúncios</p>
              <button onClick={() => router.push('/student/announcements')} className="text-sm text-zinc-400 hover:text-zinc-200">Ver todos</button>
            </div>
            <ul className="space-y-2">
              {studentAnnouncements.slice(0, 3).map((item) => (
                <li key={item.id} className="rounded-xl border border-[#202020] bg-[#111] px-3 py-2">
                  <p className="truncate text-sm text-zinc-200">{item.pinned ? '📌 ' : ''}{item.title}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </StudentShell>
  );
}
