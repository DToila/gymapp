"use client";

import { useEffect, useMemo, useState } from 'react';
import { getAttendanceForMember } from '../../../lib/database';
import StudentShell from './StudentShell';
import { studentSchedule } from './studentData';
import { useStudentMember } from './useStudentMember';

const isScheduledFuture = (date: Date): boolean => {
  const day = date.getDay();
  return date > new Date() && studentSchedule.some((item) => item.day === day);
};

export default function StudentAttendancePage() {
  const { member } = useStudentMember();
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

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
      .catch((error) => console.error('Error loading student attendance page:', error));
  }, [member]);

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();

  const attendedList = useMemo(() => {
    return Object.keys(attendanceMap)
      .filter((date) => attendanceMap[date])
      .filter((date) => {
        const parsed = new Date(`${date}T12:00:00`);
        return parsed.getMonth() === selectedMonth && parsed.getFullYear() === selectedYear;
      })
      .sort((a, b) => b.localeCompare(a));
  }, [attendanceMap, selectedMonth, selectedYear]);

  return (
    <StudentShell active="attendance" title="Presenças" subtitle="Attendance history and schedule context">
      <section className="rounded-2xl border border-[#222] bg-[#121212] p-4 shadow-[0_8px_22px_rgba(0,0,0,0.35)]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button onClick={() => setViewMode('month')} className={`rounded-xl border px-3 py-1.5 text-sm ${viewMode === 'month' ? 'border-[#c81d25] bg-[rgba(200,29,37,0.2)] text-white' : 'border-[#2a2a2a] bg-[#171717] text-zinc-400'}`}>Mês</button>
            <button onClick={() => setViewMode('list')} className={`rounded-xl border px-3 py-1.5 text-sm ${viewMode === 'list' ? 'border-[#c81d25] bg-[rgba(200,29,37,0.2)] text-white' : 'border-[#2a2a2a] bg-[#171717] text-zinc-400'}`}>Lista</button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedMonth((prev) => (prev === 0 ? 11 : prev - 1))} className="rounded-xl border border-[#2a2a2a] bg-[#171717] px-3 py-1.5 text-zinc-300">‹</button>
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="rounded-xl border border-[#2a2a2a] bg-[#171717] px-3 py-1.5 text-sm text-zinc-200">
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i}>{new Date(selectedYear, i).toLocaleString('default', { month: 'long' })}</option>
              ))}
            </select>
            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="rounded-xl border border-[#2a2a2a] bg-[#171717] px-3 py-1.5 text-sm text-zinc-200">
              {[selectedYear - 1, selectedYear, selectedYear + 1].map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
            <button onClick={() => setSelectedMonth((prev) => (prev === 11 ? 0 : prev + 1))} className="rounded-xl border border-[#2a2a2a] bg-[#171717] px-3 py-1.5 text-zinc-300">›</button>
          </div>
        </div>

        {viewMode === 'month' ? (
          <>
            <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs text-zinc-500">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, index) => <div key={`e-${index}`} className="h-16" />)}
              {Array.from({ length: daysInMonth }, (_, index) => {
                const day = index + 1;
                const dateKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dateObj = new Date(`${dateKey}T12:00:00`);
                const attended = attendanceMap[dateKey];
                const futureScheduled = isScheduledFuture(dateObj);

                return (
                  <div key={dateKey} className="h-16 rounded-xl border border-[#202020] bg-[#111] p-2">
                    <p className="text-sm text-zinc-300">{day}</p>
                    <div className="mt-2 flex items-center justify-center">
                      {attended ? <span className="h-2.5 w-2.5 rounded-full bg-green-400" /> : futureScheduled ? <span className="h-2.5 w-2.5 rounded-full border border-zinc-500" /> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <ul className="space-y-2">
            {attendedList.length === 0 ? (
              <li className="rounded-xl border border-[#202020] bg-[#111] px-3 py-3 text-sm text-zinc-500">No attendance records this month.</li>
            ) : (
              attendedList.map((date) => (
                <li key={date} className="rounded-xl border border-[#202020] bg-[#111] px-3 py-2 text-sm text-zinc-200">
                  {new Date(`${date}T12:00:00`).toLocaleDateString('en-GB')}
                </li>
              ))
            )}
          </ul>
        )}
      </section>
    </StudentShell>
  );
}
