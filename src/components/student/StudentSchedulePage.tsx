"use client";

import { useEffect, useMemo, useState } from 'react';
import StudentShell from './StudentShell';
import { studentSchedule } from './studentData';
import ClassLogPanel from '../schedule/ClassLogPanel';
import { ClassLogRow, getClassLogsForSlotsAndDates, getScheduleSlotsByCodes } from '../../../lib/database';

const dayOrder = [
  { key: 'SEG', label: 'Seg' },
  { key: 'TER', label: 'Ter' },
  { key: 'QUA', label: 'Qua' },
  { key: 'QUI', label: 'Qui' },
  { key: 'SEX', label: 'Sex' },
  { key: 'SAB', label: 'Sáb' },
  { key: 'DOM', label: 'Dom' },
] as const;

type DayKey = (typeof dayOrder)[number]['key'];

type ScheduleViewItem = {
  id: string;
  day: string | number;
  time: string;
  room: 'GBK' | 'GB1' | 'GB2';
  level: string;
  type: 'Gi' | 'Não-Gi' | 'Sparring';
  notes?: string;
};

function normalizeDayKey(day: string): DayKey | null {
  const d = day.trim().toUpperCase();
  if (d === 'SÁB' || d === 'SAB' || d === 'SABADO' || d === 'SÁBADO') return 'SAB';
  if (d === 'SEGUNDA' || d === 'SEG') return 'SEG';
  if (d === 'TERCA' || d === 'TERÇA' || d === 'TER') return 'TER';
  if (d === 'QUARTA' || d === 'QUA') return 'QUA';
  if (d === 'QUINTA' || d === 'QUI') return 'QUI';
  if (d === 'SEXTA' || d === 'SEX') return 'SEX';
  if (d === 'DOMINGO' || d === 'DOM') return 'DOM';
  if (d === 'SEG-SEX') return null;
  return (['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'] as const).includes(d as DayKey)
    ? (d as DayKey)
    : null;
}

function dayNumberToKey(day: number): DayKey | null {
  if (day === 1) return 'SEG';
  if (day === 2) return 'TER';
  if (day === 3) return 'QUA';
  if (day === 4) return 'QUI';
  if (day === 5) return 'SEX';
  if (day === 6) return 'SAB';
  if (day === 0) return 'DOM';
  return null;
}

function parseStartMinutes(timeRange: string): number {
  const m = (timeRange || '').replace(/\s/g, '').split('-')[0] || '00:00';
  const [hh, mm] = m.split(':').map(Number);
  const safeHour = Number.isFinite(hh) ? hh : 0;
  const safeMinute = Number.isFinite(mm) ? mm : 0;
  return safeHour * 60 + safeMinute;
}

function getWeekMonday(date: Date): Date {
  const d = new Date(date);
  const currentDay = d.getDay();
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + mondayOffset);
  return d;
}

export default function StudentSchedulePage() {
  const [view, setView] = useState<'today' | 'week'>('today');
  const [slotIdByCode, setSlotIdByCode] = useState<Record<string, string>>({});
  const [classLogsByKey, setClassLogsByKey] = useState<Record<string, ClassLogRow>>({});
  const [selectedClassLog, setSelectedClassLog] = useState<{
    dayKey: DayKey;
    dateKey: string;
    timeRange: string;
    className: string;
    log: ClassLogRow | null;
  } | null>(null);

  const scheduleItems = useMemo(() => studentSchedule as ScheduleViewItem[], []);

  const weekDatesByDay = useMemo(() => {
    const monday = getWeekMonday(new Date());
    const result: Record<DayKey, { dateKey: string; dateLabel: string }> = {
      SEG: { dateKey: '', dateLabel: '' },
      TER: { dateKey: '', dateLabel: '' },
      QUA: { dateKey: '', dateLabel: '' },
      QUI: { dateKey: '', dateLabel: '' },
      SEX: { dateKey: '', dateLabel: '' },
      SAB: { dateKey: '', dateLabel: '' },
      DOM: { dateKey: '', dateLabel: '' },
    };

    dayOrder.forEach((day, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      result[day.key] = {
        dateKey: date.toISOString().split('T')[0],
        dateLabel: date.toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit', month: '2-digit' }),
      };
    });

    return result;
  }, []);

  useEffect(() => {
    const loadLogs = async () => {
      const slots = await getScheduleSlotsByCodes(scheduleItems.map((item) => item.id));
      const nextSlotIdByCode: Record<string, string> = {};
      slots.forEach((slot) => {
        nextSlotIdByCode[slot.code] = slot.id;
      });
      setSlotIdByCode(nextSlotIdByCode);

      const slotIds = Object.values(nextSlotIdByCode);
      const dateKeys = dayOrder.map((day) => weekDatesByDay[day.key].dateKey);
      const logs = await getClassLogsForSlotsAndDates(slotIds, dateKeys);
      const nextLogsByKey: Record<string, ClassLogRow> = {};
      logs.forEach((log) => {
        nextLogsByKey[`${log.schedule_id}|${log.date}`] = log;
      });
      setClassLogsByKey(nextLogsByKey);
    };

    loadLogs().catch((error) => console.error('Erro loading student schedule logs:', error));
  }, [scheduleItems, weekDatesByDay]);

  const classesByDay = useMemo(() => {
    const byDay: Record<DayKey, ScheduleViewItem[]> = {
      SEG: [],
      TER: [],
      QUA: [],
      QUI: [],
      SEX: [],
      SAB: [],
      DOM: [],
    };

    for (const item of scheduleItems) {
      const dayKey =
        typeof item.day === 'number'
          ? dayNumberToKey(item.day)
          : normalizeDayKey(String(item.day));

      if (dayKey) {
        byDay[dayKey].push(item);
      }
    }

    for (const day of dayOrder) {
      byDay[day.key].sort((a, b) => parseStartMinutes(a.time) - parseStartMinutes(b.time));
    }

    return byDay;
  }, [scheduleItems]);

  const todayDayKey = useMemo(() => {
    return dayNumberToKey(new Date().getDay()) || 'SEG';
  }, []);

  const renderDayCard = (dayKey: DayKey, label: string) => {
    const rows = classesByDay[dayKey] || [];

    return (
      <article key={dayKey} className="h-full rounded-2xl border border-[#222] bg-[#121212] shadow-[0_10px_24px_rgba(0,0,0,0.34)]">
        <div className="sticky top-0 z-10 rounded-t-2xl border-b border-[#262626] bg-[#161616] px-3 py-2.5">
          <p className="text-sm font-semibold tracking-wide text-zinc-200">{label}</p>
        </div>

        <div className="space-y-2 p-3">
          {rows.length === 0 ? (
            <p className="rounded-xl border border-[#262626] bg-[#161616] px-3 py-2 text-sm text-zinc-500">Sem aulas</p>
          ) : (
            rows.map((item) => {
              const dateKey = weekDatesByDay[dayKey].dateKey;
              const slotId = slotIdByCode[item.id];
              const log = classLogsByKey[slotId ? `${slotId}|${dateKey}` : ''] || null;

              return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedClassLog({ dayKey, dateKey, timeRange: item.time, className: `${item.room} • ${item.level}`, log })}
                className="w-full rounded-xl border border-[#262626] bg-[#161616] px-3 py-2 text-left transition hover:bg-white/5"
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
                <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                  <span className="rounded-full border border-[#2a2a2a] bg-[#111] px-2 py-0.5 text-zinc-400">Log</span>
                  <span className="text-zinc-300">{log?.content ? `${log.content.slice(0, 72)}${log.content.length > 72 ? '…' : ''}` : 'Sem log ainda'}</span>
                </div>
              </button>
              );
            })
          )}
        </div>
      </article>
    );
  };

  return (
    <StudentShell
      ativo="schedule"
      title="Horário"
      subtitle="Gracie Barra Carnaxide e Oeiras"
      rightActions={
        <button className="rounded-xl border border-[#252525] bg-[#141414] px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-[#3a3a3a] hover:text-white">
          Descarregar
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
            {renderDayCard(todayDayKey, dayOrder.find((d) => d.key === todayDayKey)?.label || 'Seg')}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-7">
            {dayOrder.map((day) => renderDayCard(day.key, day.label))}
          </div>
        )}
      </section>

      {selectedClassLog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl">
            <ClassLogPanel
              title="Class Log"
              subtitle={`${dayOrder.find((day) => day.key === selectedClassLog.dayKey)?.label || ''} • ${selectedClassLog.dateKey} • ${selectedClassLog.timeRange} • ${selectedClassLog.className}`}
              log={selectedClassLog.log}
              mode="view"
              canEdit={false}
              showAttendees={false}
              coaches={[]}
              topic=""
              content=""
              teacherId=""
              attendeesText=""
              onChangeTopic={() => {}}
              onChangeContent={() => {}}
              onChangeTeacher={() => {}}
              onChangeAttendees={() => {}}
              onEdit={() => {}}
              onSave={() => {}}
              onCancel={() => setSelectedClassLog(null)}
            />
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedClassLog(null)}
                className="rounded-xl border border-[#2b2b2b] bg-[#151515] px-4 py-2 text-sm text-zinc-300"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </StudentShell>
  );
}
