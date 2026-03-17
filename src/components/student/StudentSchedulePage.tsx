"use client";

import { useMemo, useState } from 'react';
import StudentShell from './StudentShell';
import { getTodayClasses, studentSchedule } from './studentData';

export default function StudentSchedulePage() {
  const [view, setView] = useState<'today' | 'week'>('today');

  const todayClasses = getTodayClasses();
  const weekGrouped = useMemo(() => {
    const labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return labels.map((label, day) => ({ label, rows: studentSchedule.filter((item) => item.day === day) }));
  }, []);

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
          <ul className="space-y-2">
            {(todayClasses.length ? todayClasses : studentSchedule.slice(0, 4)).map((item) => (
              <li key={item.id} className="rounded-xl border border-[#202020] bg-[#111] px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-zinc-100">{item.room} {item.time}</p>
                  <span className="rounded-full border border-[#2a2a2a] bg-[#161616] px-2 py-0.5 text-[10px] text-zinc-400">{item.type}</span>
                </div>
                <p className="text-sm text-zinc-400">{item.level}</p>
                {item.notes ? <p className="text-xs text-zinc-500">{item.notes}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {weekGrouped.map((day) => (
              <div key={day.label} className="rounded-xl border border-[#202020] bg-[#111] p-3">
                <p className="mb-2 text-sm font-semibold text-zinc-200">{day.label}</p>
                {day.rows.length === 0 ? (
                  <p className="text-xs text-zinc-500">No classes</p>
                ) : (
                  <ul className="space-y-2">
                    {day.rows.map((item) => (
                      <li key={item.id} className="rounded-lg border border-[#262626] bg-[#161616] px-2.5 py-2 text-xs text-zinc-300">
                        <p className="font-semibold text-zinc-100">{item.room} {item.time}</p>
                        <p>{item.level} • {item.type}</p>
                        {item.notes ? <p className="text-zinc-500">{item.notes}</p> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </StudentShell>
  );
}
