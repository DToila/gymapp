"use client";

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import TeacherSidebar from '@/components/members/TeacherSidebar';
import { officialSchedule, studentSchedule } from '@/components/student/studentData';
import {
  CoachProfile,
  ensureScheduleSlots,
  getClassPlan,
  getClassPlansForSlotsAndDates,
  getCoachProfiles,
  upsertClassPlan,
} from '../../../lib/database';

const DAY_ORDER = [
  { key: 'SEG', label: 'Seg' },
  { key: 'TER', label: 'Ter' },
  { key: 'QUA', label: 'Qua' },
  { key: 'QUI', label: 'Qui' },
  { key: 'SEX', label: 'Sex' },
  { key: 'SAB', label: 'Sáb' },
  { key: 'DOM', label: 'Dom' },
] as const;

type DayKey = (typeof DAY_ORDER)[number]['key'];
type ToastState = { type: 'success' | 'error'; message: string } | null;

interface EditingSlot {
  slotCode: string;
  slotDbId: string;
  dayKey: DayKey;
  dayLabel: string;
  dateKey: string;
  timeRange: string;
  className: string;
  anchorRect: DOMRect;
}

function dayNumberToKey(n: number): DayKey | null {
  return ([null, 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'] as const)[n] ?? null;
}

function parseStartMinutes(t: string): number {
  const [hh, mm] = t.replace(/\s/g, '').split('-')[0].split(':').map(Number);
  return (hh || 0) * 60 + (mm || 0);
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function SchedulePage() {
  const router = useRouter();
  const [scheduleView, setScheduleView] = useState<'image' | 'grid'>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageMissing, setImageMissing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [slotIdByCode, setSlotIdByCode] = useState<Record<string, string>>({});
  const [planExistsMap, setPlanExistsMap] = useState<Record<string, boolean>>({});
  const [editingSlot, setEditingSlot] = useState<EditingSlot | null>(null);
  const [isEditorLoading, setIsEditorLoading] = useState(false);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [topic, setTopic] = useState('');
  const [techniques, setTechniques] = useState('');
  const [coachPrimaryId, setCoachPrimaryId] = useState('');
  const [coachSecondaryId, setCoachSecondaryId] = useState('');
  const [initialPlanSnapshot, setInitialPlanSnapshot] = useState('');
  const [toast, setToast] = useState<ToastState>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const weekDatesByDay = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay();
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(now.getDate() + mondayOffset);

    const result: Record<DayKey, { dateKey: string; dateLabel: string }> = {
      SEG: { dateKey: '', dateLabel: '' },
      TER: { dateKey: '', dateLabel: '' },
      QUA: { dateKey: '', dateLabel: '' },
      QUI: { dateKey: '', dateLabel: '' },
      SEX: { dateKey: '', dateLabel: '' },
      SAB: { dateKey: '', dateLabel: '' },
      DOM: { dateKey: '', dateLabel: '' },
    };

    DAY_ORDER.forEach((day, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      const dateKey = date.toISOString().split('T')[0];
      const dateLabel = date.toLocaleDateString('pt-PT', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
      });
      result[day.key] = { dateKey, dateLabel };
    });

    return result;
  }, []);

  const planSnapshot = JSON.stringify({
    topic: topic || '',
    techniques: techniques || '',
    coachPrimaryId: coachPrimaryId || '',
    coachSecondaryId: coachSecondaryId || '',
  });

  const hasUnsavedChanges = initialPlanSnapshot !== '' && planSnapshot !== initialPlanSnapshot;

  const planExistsKey = (slotId: string, dateKey: string) => `${slotId}|${dateKey}`;

  useEffect(() => {
    if (!isModalOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsModalOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  useEffect(() => {
    const updateDeviceMode = () => setIsMobile(window.innerWidth < 768);
    updateDeviceMode();
    window.addEventListener('resize', updateDeviceMode);
    return () => window.removeEventListener('resize', updateDeviceMode);
  }, []);

  useEffect(() => {
    getCoachProfiles().then(setCoaches).catch(() => setCoaches([]));
  }, []);

  useEffect(() => {
    const slotRows = officialSchedule.map((slot) => ({
      code: slot.id,
      day_of_week: slot.dayOfWeek,
      start_time: slot.startTime,
      end_time: slot.endTime,
      program: slot.program,
      class_label: slot.program === 'GBK' ? `KIDS ${slot.kidsGroup || ''}`.trim() : slot.program,
    }));

    ensureScheduleSlots(slotRows)
      .then((rows) => {
        const nextMap: Record<string, string> = {};
        rows.forEach((row) => {
          nextMap[row.code] = row.id;
        });
        setSlotIdByCode(nextMap);
      })
      .catch((error) => {
        console.error('Error ensuring schedule slots:', error);
        setToast({ type: 'error', message: 'Could not load schedule slots.' });
      });
  }, []);

  useEffect(() => {
    if (Object.keys(slotIdByCode).length === 0) return;

    const slotIds = Object.values(slotIdByCode);
    const dateKeys = DAY_ORDER.map((day) => weekDatesByDay[day.key].dateKey);

    getClassPlansForSlotsAndDates(slotIds, dateKeys)
      .then((rows) => {
        const next: Record<string, boolean> = {};
        rows.forEach((row) => {
          next[planExistsKey(row.slot_id, row.date)] = true;
        });
        setPlanExistsMap(next);
      })
      .catch((error) => {
        console.error('Error loading plan indicators:', error);
      });
  }, [slotIdByCode, weekDatesByDay]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!editingSlot) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        attemptCloseEditor();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [editingSlot, attemptCloseEditor]);

  const openModal = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setIsModalOpen(true);
  };

  const handleZoom = (delta: number) => {
    setZoom((prev) => clamp(Number((prev + delta).toFixed(2)), 1, 3));
  };

  const onMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    dragStartRef.current = { x: event.clientX - pan.x, y: event.clientY - pan.y };
  };

  const onMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current) return;
    setPan({
      x: event.clientX - dragStartRef.current.x,
      y: event.clientY - dragStartRef.current.y,
    });
  };

  const onMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const classesByDay = useMemo(() => {
    const byDay: Record<DayKey, typeof studentSchedule> = {
      SEG: [], TER: [], QUA: [], QUI: [], SEX: [], SAB: [], DOM: [],
    };
    for (const item of studentSchedule) {
      const key = typeof item.day === 'number' ? dayNumberToKey(item.day) : null;
      if (key) byDay[key].push(item);
    }
    for (const { key } of DAY_ORDER) {
      byDay[key].sort((a, b) => parseStartMinutes(a.time) - parseStartMinutes(b.time));
    }
    return byDay;
  }, []);

  const attemptCloseEditor = useCallback(() => {
    if (hasUnsavedChanges) {
      const shouldClose = window.confirm('You have unsaved changes. Close anyway?');
      if (!shouldClose) return;
    }

    setEditingSlot(null);
    setIsEditorLoading(false);
    setInitialPlanSnapshot('');
  }, [hasUnsavedChanges]);

  const openClassPlanEditor = async (
    item: (typeof studentSchedule)[number],
    dayKey: DayKey,
    dayLabel: string,
    anchorRect: DOMRect
  ) => {
    const slotDbId = slotIdByCode[item.id];
    if (!slotDbId) {
      setToast({ type: 'error', message: 'Slot is still loading. Try again.' });
      return;
    }

    const dateKey = weekDatesByDay[dayKey].dateKey;
    setEditingSlot({
      slotCode: item.id,
      slotDbId,
      dayKey,
      dayLabel,
      dateKey,
      timeRange: item.time.replace('-', '–'),
      className: `${item.room} • ${item.level}`,
      anchorRect,
    });

    setIsEditorLoading(true);
    try {
      const existing = await getClassPlan(slotDbId, dateKey);
      const nextTopic = existing?.topic || '';
      const nextTechniques = existing?.techniques || '';
      const nextPrimary = existing?.coach_primary_id || '';
      const nextSecondary = existing?.coach_secondary_id || '';

      setTopic(nextTopic);
      setTechniques(nextTechniques);
      setCoachPrimaryId(nextPrimary);
      setCoachSecondaryId(nextSecondary);
      setInitialPlanSnapshot(
        JSON.stringify({
          topic: nextTopic,
          techniques: nextTechniques,
          coachPrimaryId: nextPrimary,
          coachSecondaryId: nextSecondary,
        })
      );
    } catch (error) {
      console.error('Error loading class plan:', error);
      setTopic('');
      setTechniques('');
      setCoachPrimaryId('');
      setCoachSecondaryId('');
      setInitialPlanSnapshot(
        JSON.stringify({ topic: '', techniques: '', coachPrimaryId: '', coachSecondaryId: '' })
      );
      setToast({ type: 'error', message: 'Could not load class plan.' });
    } finally {
      setIsEditorLoading(false);
    }
  };

  const saveClassPlan = async () => {
    if (!editingSlot) return;
    if (!coachPrimaryId) {
      setToast({ type: 'error', message: 'Primary coach is required.' });
      return;
    }

    setIsSavingPlan(true);
    try {
      const saved = await upsertClassPlan(editingSlot.slotDbId, editingSlot.dateKey, {
        topic,
        techniques,
        coach_primary_id: coachPrimaryId,
        coach_secondary_id: coachSecondaryId || null,
      });

      setPlanExistsMap((prev) => ({
        ...prev,
        [planExistsKey(saved.slot_id, saved.date)]: true,
      }));

      setToast({ type: 'success', message: 'Saved' });
      setEditingSlot(null);
      setInitialPlanSnapshot('');
    } catch (error) {
      console.error('Error saving class plan:', error);
      setToast({ type: 'error', message: 'Could not save class plan.' });
    } finally {
      setIsSavingPlan(false);
    }
  };

  const renderClassPlanForm = () => {
    if (!editingSlot) return null;

    const dateLabel = weekDatesByDay[editingSlot.dayKey].dateLabel;

    return (
      <div className="space-y-3">
        <div>
          <p className="text-base font-semibold text-zinc-100">Class Plan</p>
          <p className="mt-0.5 text-xs text-zinc-400">
            {dateLabel} • {editingSlot.timeRange} • {editingSlot.className}
          </p>
        </div>

        {isEditorLoading ? (
          <div className="rounded-xl border border-[#242424] bg-[#151515] px-3 py-4 text-sm text-zinc-400">Loading...</div>
        ) : (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">Topic</label>
              <input
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="Weekly topic / class focus…"
                className="w-full rounded-xl border border-[#2a2a2a] bg-[#141414] px-3 py-2 text-sm text-zinc-100 outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">Techniques / Plan</label>
              <textarea
                value={techniques}
                onChange={(event) => setTechniques(event.target.value)}
                placeholder="Techniques to cover (e.g. knee cut pass > crossface > finish)…"
                rows={4}
                className="w-full rounded-xl border border-[#2a2a2a] bg-[#141414] px-3 py-2 text-sm text-zinc-100 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">Coach (Primary)</label>
                <select
                  value={coachPrimaryId}
                  onChange={(event) => setCoachPrimaryId(event.target.value)}
                  className="w-full rounded-xl border border-[#2a2a2a] bg-[#141414] px-3 py-2 text-sm text-zinc-100 outline-none"
                >
                  <option value="">Select coach</option>
                  {coaches.map((coach) => (
                    <option key={coach.id} value={coach.id}>
                      {coach.full_name || 'Unnamed Coach'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">Coach (Secondary)</label>
                <select
                  value={coachSecondaryId}
                  onChange={(event) => setCoachSecondaryId(event.target.value)}
                  className="w-full rounded-xl border border-[#2a2a2a] bg-[#141414] px-3 py-2 text-sm text-zinc-100 outline-none"
                >
                  <option value="">None</option>
                  {coaches.map((coach) => (
                    <option key={coach.id} value={coach.id}>
                      {coach.full_name || 'Unnamed Coach'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={attemptCloseEditor}
                className="rounded-xl border border-[#2b2b2b] bg-[#151515] px-3 py-2 text-sm text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveClassPlan}
                disabled={isSavingPlan || !coachPrimaryId}
                className="rounded-xl border border-[#c81d25] bg-[#c81d25] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isSavingPlan ? 'Saving...' : 'Save'}
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  const desktopPopoverStyle: React.CSSProperties = useMemo(() => {
    if (!editingSlot) return {};
    const width = 380;
    const left = clamp(
      editingSlot.anchorRect.left + editingSlot.anchorRect.width / 2 - width / 2,
      12,
      window.innerWidth - width - 12
    );
    const top = clamp(editingSlot.anchorRect.bottom + 12, 12, window.innerHeight - 430);

    return {
      position: 'fixed',
      left,
      top,
      width,
      zIndex: 130,
    };
  }, [editingSlot]);

  return (
    <div className="flex min-h-screen bg-[#0b0b0b] text-zinc-100">
      <TeacherSidebar active="schedule" onLogout={() => router.push('/')} />

      <main className="flex-1 p-6 lg:p-8">
        <div className="mx-auto max-w-[1320px]">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <label className="flex w-full max-w-[500px] items-center gap-2 rounded-full border border-[#222] bg-[#121212] px-4 py-2.5 shadow-[0_6px_22px_rgba(0,0,0,0.28)]">
              <span className="text-zinc-500">⌕</span>
              <input
                placeholder="Search class..."
                className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 outline-none"
              />
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = '/schedule.png';
                  link.download = 'schedule.png';
                  link.click();
                }}
                className="rounded-xl border border-[#252525] bg-[#141414] px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-[#3a3a3a] hover:text-white"
              >
                Download
              </button>
              <button
                type="button"
                onClick={openModal}
                className="rounded-xl border border-[#c81d25] bg-[#c81d25] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(200,29,37,0.28)] transition hover:bg-[#ab1820]"
              >
                Open full screen
              </button>
            </div>
          </div>

          <header className="mb-6">
            <h1 className="text-4xl font-bold text-white">Horário</h1>
            <p className="mt-1 text-lg text-zinc-400">Gracie Barra Carnaxide e Oeiras</p>
          </header>

          <section className="rounded-2xl border border-[#222] bg-[#121212] p-4 shadow-[0_12px_28px_rgba(0,0,0,0.35)] lg:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setScheduleView('grid')}
                  className={`rounded-xl border px-3 py-1.5 text-sm ${scheduleView === 'grid' ? 'border-[#c81d25] bg-[rgba(200,29,37,0.2)] text-white' : 'border-[#2a2a2a] bg-[#171717] text-zinc-400'}`}
                >
                  Grade semanal
                </button>
                <button
                  onClick={() => setScheduleView('image')}
                  className={`rounded-xl border px-3 py-1.5 text-sm ${scheduleView === 'image' ? 'border-[#c81d25] bg-[rgba(200,29,37,0.2)] text-white' : 'border-[#2a2a2a] bg-[#171717] text-zinc-400'}`}
                >
                  Imagem
                </button>
              </div>
              <select className="rounded-lg border border-[#2a2a2a] bg-[#161616] px-3 py-2 text-xs text-zinc-200 outline-none">
                <option>Current schedule</option>
              </select>
            </div>

            {scheduleView === 'grid' ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-7">
                {DAY_ORDER.map(({ key, label }) => {
                  const rows = classesByDay[key] || [];
                  return (
                    <article key={key} className="h-full rounded-2xl border border-[#222] bg-[#161616] shadow-[0_10px_24px_rgba(0,0,0,0.34)]">
                      <div className="sticky top-0 z-10 rounded-t-2xl border-b border-[#262626] bg-[#1a1a1a] px-3 py-2.5">
                        <p className="text-sm font-semibold tracking-wide text-zinc-200">{label}</p>
                      </div>
                      <div className="space-y-2 p-3">
                        {rows.length === 0 ? (
                          <p className="rounded-xl border border-[#262626] bg-[#121212] px-3 py-2 text-sm text-zinc-500">Sem aulas</p>
                        ) : (
                          rows.map((item) => (
                            <button
                              type="button"
                              key={item.id}
                              className="relative w-full rounded-xl border border-[#262626] bg-[#121212] px-3 py-2 text-left transition hover:bg-white/5"
                              title={`${item.level} • ${item.type}${item.notes ? ` • ${item.notes}` : ''}`}
                              onClick={(event) => {
                                const rect = (event.currentTarget as HTMLButtonElement).getBoundingClientRect();
                                openClassPlanEditor(item, key, label, rect);
                              }}
                            >
                              {slotIdByCode[item.id] &&
                              planExistsMap[
                                planExistsKey(slotIdByCode[item.id], weekDatesByDay[key].dateKey)
                              ] ? (
                                <span className="absolute right-2 top-2 inline-block h-2 w-2 rounded-full bg-[#c81d25]" />
                              ) : null}
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
                            </button>
                          ))
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-[#232323] bg-[#161616] p-3 lg:p-4">
                  {imageMissing ? (
                    <div className="grid min-h-[360px] place-items-center rounded-lg border border-dashed border-[#333] text-sm text-zinc-500">
                      Schedule image not found at /public/schedule.png
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={openModal}
                      className="w-full overflow-hidden rounded-lg border border-[#222] bg-[#0f0f0f]"
                    >
                      <div className="relative mx-auto aspect-[4/3] w-full max-w-5xl">
                        <Image
                          src="/schedule.png"
                          alt="Academy schedule"
                          fill
                          priority
                          sizes="(max-width: 1024px) 100vw, 900px"
                          className="object-contain"
                          onError={() => setImageMissing(true)}
                        />
                      </div>
                    </button>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[#20303f] bg-[rgba(32,48,63,0.35)] px-2.5 py-1 text-[11px] font-semibold text-sky-300">GBK</span>
                    <span className="rounded-full border border-[#3f2f20] bg-[rgba(63,47,32,0.35)] px-2.5 py-1 text-[11px] font-semibold text-orange-300">GB1</span>
                    <span className="rounded-full border border-[#2f3f20] bg-[rgba(47,63,32,0.35)] px-2.5 py-1 text-[11px] font-semibold text-lime-300">GB2</span>
                  </div>
                  <button type="button" onClick={openModal} className="text-sm font-medium text-[#c81d25] hover:text-[#ef3a43]">
                    View full size
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </main>

      {editingSlot ? (
        <div
          className="fixed inset-0 z-[120]"
          onMouseDown={(event) => {
            if (!popoverRef.current) return;
            const target = event.target as Node;
            if (!popoverRef.current.contains(target)) {
              attemptCloseEditor();
            }
          }}
        >
          {isMobile ? (
            <div className="fixed inset-x-0 bottom-0 z-[130] rounded-t-2xl border border-[#2a2a2a] bg-[#121212] p-4 shadow-[0_-16px_36px_rgba(0,0,0,0.55)]" ref={popoverRef}>
              {renderClassPlanForm()}
            </div>
          ) : (
            <div style={desktopPopoverStyle} ref={popoverRef}>
              <div className="relative rounded-2xl border border-[#2a2a2a] bg-[#121212] p-4 shadow-[0_20px_44px_rgba(0,0,0,0.58)]">
                <span
                  className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-[#2a2a2a] bg-[#121212]"
                  aria-hidden
                />
                {renderClassPlanForm()}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-5 right-5 z-[140]">
          <div
            className={`rounded-xl border px-3 py-2 text-sm shadow-[0_12px_28px_rgba(0,0,0,0.4)] ${
              toast.type === 'success'
                ? 'border-[#1f4d33] bg-[#112117] text-green-300'
                : 'border-[#5b1f24] bg-[#2a1214] text-rose-300'
            }`}
          >
            {toast.message}
          </div>
        </div>
      ) : null}

      {isModalOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 py-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsModalOpen(false);
            }
          }}
        >
          <div className="w-full max-w-6xl rounded-2xl border border-[#2a2a2a] bg-[#121212] shadow-[0_22px_56px_rgba(0,0,0,0.65)]">
            <div className="flex items-center justify-between border-b border-[#202020] px-4 py-3">
              <p className="text-sm font-semibold text-zinc-200">Horário — Full size</p>
              <div className="flex items-center gap-2">
                <button onClick={() => handleZoom(-0.25)} className="rounded-md border border-[#2a2a2a] bg-[#171717] px-2 py-1 text-xs text-zinc-300">-</button>
                <span className="w-14 text-center text-xs text-zinc-400">{Math.round(zoom * 100)}%</span>
                <button onClick={() => handleZoom(0.25)} className="rounded-md border border-[#2a2a2a] bg-[#171717] px-2 py-1 text-xs text-zinc-300">+</button>
                <button
                  onClick={() => {
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                  }}
                  className="rounded-md border border-[#2a2a2a] bg-[#171717] px-2 py-1 text-xs text-zinc-300"
                >
                  Reset
                </button>
                <button onClick={() => setIsModalOpen(false)} className="rounded-md border border-[#2a2a2a] bg-[#171717] px-2.5 py-1 text-xs text-zinc-300">✕</button>
              </div>
            </div>

            <div
              className="relative max-h-[78vh] overflow-hidden bg-[#0f0f0f]"
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            >
              {!imageMissing ? (
                <div
                  className="relative h-[78vh] w-full"
                  style={{
                    cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                  }}
                >
                  <Image
                    src="/schedule.png"
                    alt="Academy schedule full size"
                    fill
                    priority
                    sizes="100vw"
                    className="object-contain select-none"
                    style={{
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                      transformOrigin: 'center center',
                      transition: isDragging ? 'none' : 'transform 120ms ease',
                    }}
                    draggable={false}
                    onError={() => setImageMissing(true)}
                  />
                </div>
              ) : (
                <div className="grid h-[60vh] place-items-center text-sm text-zinc-500">Schedule image not found at /public/schedule.png</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
