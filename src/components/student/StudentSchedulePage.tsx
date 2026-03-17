"use client";

import { useMemo, useState } from 'react';
import StudentShell from './StudentShell';
import { studentSchedule } from './studentData';

const dayOrder = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'] as const;

const dayMeta: Record<(typeof dayOrder)[number], { label: string; dayNumber: number }> = {
  SEG: { label: 'Seg', dayNumber: 1 },
  TER: { label: 'Ter', dayNumber: 2 },
  QUA: { label: 'Qua', dayNumber: 3 },
  QUI: { label: 'Qui', dayNumber: 4 },
  SEX: { label: 'Sex', dayNumber: 5 },
  'SÁB': { label: 'Sáb', dayNumber: 6 },
  DOM: { label: 'Dom', dayNumber: 0 },
};

const getStartMinutes = (timeRange: string) => {
  const [start] = timeRange.split('-');
  const [hour, minute] = start.split(':').map(Number);
  return hour * 60 + minute;
};

export default function StudentSchedulePage() {
  const [view, setView] = useState<'today' | 'week'>('today');

  const sortedSchedule = useMemo(() => {
    return [...studentSchedule].sort((a, b) => getStartMinutes(a.time) - getStartMinutes(b.time));
  }, []);

  const classesByDay = useMemo(() => {
    return dayOrder.reduce((acc, dayKey) => {
      const rows = sortedSchedule.filter((item) => item.day === dayMeta[dayKey].dayNumber);
      acc[dayKey] = rows;
      return acc;
    }, {} as Record<(typeof dayOrder)[number], typeof studentSchedule>);
  }, [sortedSchedule]);

  const todayDayKey = useMemo(() => {
    const todayNumber = new Date().getDay();
    return dayOrder.find((key) => dayMeta[key].dayNumber === todayNumber) || 'SEG';
  }, []);

  const renderDayCard = (dayKey: (typeof dayOrder)[number]) => {
    const rows = classesByDay[dayKey] || [];

    return (
      <article key={dayKey} className="h-full rounded-2xl border border-[#222] bg-[#121212] shadow-[0_10px_24px_rgba(0,0,0,0.34)]">
        <div className="sticky top-0 z-10 rounded-t-2xl border-b border-[#262626] bg-[#161616] px-3 py-2.5">
          <p className="text-sm font-semibold tracking-wide text-zinc-200">{dayMeta[dayKey].label}</p>
        </div>

        <div className="space-y-2 p-3">
          {rows.length === 0 ? (
            <p className="rounded-xl border border-[#262626] bg-[#161616] px-3 py-2 text-sm text-zinc-500">Sem aulas</p>
          ) : (
            rows.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-[#262626] bg-[#161616] px-3 py-2 transition hover:bg-white/5"
                title={`${item.level} • ${item.type}${item.notes ? ` • ${item.notes}` : ''}`}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="rounded-full border border-[#333] bg-[#111] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-zinc-300">
                    {item.room}
                  </span>
                  <span className="text-xs font-medium text-zinc-200">{item.time.replace('-', '–')}</span>
                </div>

                <p className="text-xs text-zinc-400">
                  {item.level} • {item.type}
                  {item.type === 'Sparring' ? (
                    <span className="ml-1 rounded-full border border-[#5b1f24] bg-[rgba(91,31,36,0.25)] px-1.5 py-0.5 text-[10px] text-rose-300">
                      Sparring
                    </span>
                  ) : null}
                </p>
              </div>
            ))
          )}
        </div>
      </article>
    );
  };

  return (
    <StudentShell
      active="schedule"
      title="Horário"
      subtitle="Gracie Barra Carnaxide e Oeiras"
      rightActions={
        <button className="rounded-xl border border-[#252525] bg-[#141414] px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-[#3a3a3a] hover:text-white">
          Download
        </button>
      }
    >
      <section className="rounded-2xl border border-[#222] bg-[#121212] p-4 shadow-[0_12px_28px_rgba(0,0,0,0.35)]">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-2xl font-semibold text-zinc-100">Horário</p>
          <div className="flex gap-2">
            <button onClick={() => setView('today')} className={`rounded-xl border px-3 py-1.5 text-sm ${view === 'today' ? 'border-[#c81d25] bg-[rgba(200,29,37,0.2)] text-white' : 'border-[#2a2a2a] bg-[#171717] text-zinc-400'}`}>Hoje</button>
            <button onClick={() => setView('week')} className={`rounded-xl border px-3 py-1.5 text-sm ${view === 'week' ? 'border-[#c81d25] bg-[rgba(200,29,37,0.2)] text-white' : 'border-[#2a2a2a] bg-[#171717] text-zinc-400'}`}>Ver semana</button>
          </div>
        </div>

        {view === 'today' ? (
          <div className="grid grid-cols-1 gap-4">
            {renderDayCard(todayDayKey)}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-7">
            {dayOrder.map((dayKey) => renderDayCard(dayKey))}
          </div>
        )}
      </section>
    </StudentShell>
  );
}
