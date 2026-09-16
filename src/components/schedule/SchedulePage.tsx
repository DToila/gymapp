"use client";

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import TeacherSidebar from '@/components/members/TeacherSidebar';
import { officialSchedule, studentSchedule } from '@/components/student/studentData';
import ClassLogPanel from './ClassLogPanel';
import {
  CoachProfile,
  ClassLogRow,
  ensureScheduleSlots,
  getClassLog,
  getClassLogsForSlotsAndDates,
  getCoachProfiles,
  upsertClassLog,
} from '../../../lib/database';
import { supabase } from '../../../lib/supabase';

type AppRole = 'admin' | 'staff' | 'coach';

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
}

function dayNumberToKey(n: number): DayKey | null {
  return ([null, 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'] as const)[n] ?? null;
}

function parseStartMinutes(t: string): number {
  const [hh, mm] = t.replace(/\s/g, '').split('-')[0].split(':').map(Number);
  return (hh || 0) * 60 + (mm || 0);
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// toISOString() converts to UTC, which shifts the calendar date backwards for
// timezones ahead of UTC (e.g. WEST) when the Date represents local midnight.
function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const parseAttendees = (value: string): string[] | null => {
  const attendees = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  return attendees.length > 0 ? attendees : null
}

export default function SchedulePage() {
  const router = useRouter();
  const [scheduleView, setScheduleView] = useState<'image' | 'grid'>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageMissing, setImageMissing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [currentRole, setCurrentRole] = useState<AppRole>('coach');
  const [slotIdByCode, setSlotIdByCode] = useState<Record<string, string>>({});
  const [planExistsMap, setPlanExistsMap] = useState<Record<string, boolean>>({});
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [plan, setPlan] = useState<ClassLogRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingSlot, setEditingSlot] = useState<EditingSlot | null>(null);
  const [editorMode, setEditorMode] = useState<'view' | 'edit'>('edit');
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [topic, setTopic] = useState('');
  const [techniques, setTechniques] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [attendeesText, setAttendeesText] = useState('');
  const [initialPlanSnapshot, setInitialPlanSnapshot] = useState('');
  const [toast, setToast] = useState<ToastState>(null);
  const [selectedMonday, setSelectedMonday] = useState<Date | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState<DayKey>(() => dayNumberToKey(new Date().getDay()) || 'SEG');
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  // Guards against a slower earlier fetchSlotAndPlan call overwriting the
  // form with the wrong slot's content when the coach clicks a second slot
  // before the first one's request resolves — only the request whose token
  // still matches the latest one issued is allowed to apply its result.
  const planRequestRef = useRef(0);

  const getWeekMonday = (date: Date): Date => {
    const d = new Date(date);
    const currentDay = d.getDay();
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + mondayOffset);
    return d;
  };

  const weekDatesByDay = useMemo(() => {
    const referenceDate = selectedMonday || new Date();
    const monday = getWeekMonday(referenceDate);

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
      const dateKey = toLocalDateKey(date);
      const dateLabel = date.toLocaleDateString('pt-PT', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
      });
      result[day.key] = { dateKey, dateLabel };
    });

    return result;
  }, [selectedMonday]);

  const planSnapshot = JSON.stringify({
    topic: topic || '',
    techniques: techniques || '',
    teacherId: teacherId || '',
    attendeesText: attendeesText || '',
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
    getCoachProfiles().then(setCoaches).catch(() => setCoaches([]));
  }, []);

  useEffect(() => {
    const loadProfileRole = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const role = data?.role === 'admin' || data?.role === 'staff' || data?.role === 'coach' ? data.role : null;
      const metadataRole = [user.user_metadata, user.app_metadata]
        .map((metadata) => (metadata && typeof metadata === 'object' ? (metadata as { role?: unknown }).role : null))
        .find((value) => value === 'admin' || value === 'staff' || value === 'coach');

      setCurrentRole((role || metadataRole || 'coach') as AppRole);
    };

    loadProfileRole();
  }, []);

  useEffect(() => {
    const slotRows = officialSchedule.map((slot) => ({
      code: slot.id,
      day_of_week: slot.dayOfWeek,
      start_time: slot.startTime,
      end_time: slot.endTime,
      program: slot.program,
      kids_group: slot.kidsGroup || null,
      gi_type: slot.giType,
      tags: slot.tags || null,
      default_coach_id: null,
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
        console.error('Erro ensuring schedule slots:', error);
        const message = String(error?.message || error || 'Erro desconhecido.');
        setToast({ type: 'error', message: `Could not load schedule from the database: ${message}` });
      });
  }, []);

  useEffect(() => {
    if (Object.keys(slotIdByCode).length === 0) return;

    const slotIds = Object.values(slotIdByCode);
    const dateKeys = DAY_ORDER.map((day) => weekDatesByDay[day.key].dateKey);

    getClassLogsForSlotsAndDates(slotIds, dateKeys)
      .then((rows) => {
        const next: Record<string, boolean> = {};
        rows.forEach((row) => {
          next[planExistsKey(row.schedule_id, row.date)] = true;
        });
        setPlanExistsMap(next);
      })
      .catch((error) => {
        console.error('Erro loading plan indicators:', error);
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
      if (event.key !== 'Escape') return;

      if (hasUnsavedChanges) {
        const shouldClose = window.confirm('You have unsaved changes. Fechar anyway?');
        if (!shouldClose) return;
      }

      setEditingSlot(null);
      setEditorMode('edit');
      setIsLoadingPlan(false);
      setPlan(null);
      setError(null);
      setInitialPlanSnapshot('');
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [editingSlot, hasUnsavedChanges]);

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

  function attemptCloseEditor() {
    if (hasUnsavedChanges) {
      const shouldClose = window.confirm('You have unsaved changes. Fechar anyway?');
      if (!shouldClose) return;
    }

    setEditingSlot(null);
    setEditorMode('edit');
    setIsLoadingPlan(false);
    setPlan(null);
    setError(null);
    setInitialPlanSnapshot('');
  }

  const fetchSlotAndPlan = async (slotCode: string, dateKey: string) => {
    const requestToken = ++planRequestRef.current;
    setIsLoadingPlan(true);
    setError(null);
    setPlan(null);

    let slotDbId: string | undefined = slotIdByCode[slotCode];

    try {
      if (!slotDbId) {
        const sourceSlot = officialSchedule.find((slot) => slot.id === slotCode);
        if (!sourceSlot) {
          throw new Error('Slot definition not found.');
        }

        const rows = await ensureScheduleSlots([
          {
            code: sourceSlot.id,
            day_of_week: sourceSlot.dayOfWeek,
            start_time: sourceSlot.startTime,
            end_time: sourceSlot.endTime,
            program: sourceSlot.program,
            kids_group: sourceSlot.kidsGroup || null,
            gi_type: sourceSlot.giType,
            tags: sourceSlot.tags || null,
            default_coach_id: null,
          },
        ]);

        const found = rows.find((row) => row.code === slotCode);
        slotDbId = found?.id;

        if (!slotDbId) {
          throw new Error('Could not resolve slot id.');
        }

        setSlotIdByCode((prev) => ({
          ...prev,
          [slotCode]: slotDbId as string,
        }));
      }

      const resolvedSlotId = slotDbId;
      const existing = await getClassLog(resolvedSlotId, dateKey);

      // A newer call to fetchSlotAndPlan started while this one was still
      // awaiting the database — its result belongs to a slot the coach has
      // already navigated away from, so don't let it overwrite the form.
      if (planRequestRef.current !== requestToken) return;

      setPlan(existing);

      const nextTopic = existing?.topic || '';
      const nextTechniques = existing?.content || '';
      const nextTeacher = existing?.teacher_id || '';
      const nextAttendees = existing?.attendees?.join(', ') || '';

      setTopic(nextTopic);
      setTechniques(nextTechniques);
      setTeacherId(nextTeacher);
      setAttendeesText(nextAttendees);
      setInitialPlanSnapshot(
        JSON.stringify({
          topic: nextTopic,
          techniques: nextTechniques,
          teacherId: nextTeacher,
          attendeesText: nextAttendees,
        })
      );
      setEditorMode(existing ? 'view' : 'edit');

      setEditingSlot((prev) => {
        if (!prev || prev.slotCode !== slotCode || prev.dateKey !== dateKey) return prev;
        return { ...prev, slotDbId: resolvedSlotId };
      });
    } catch (err: any) {
      console.error('FETCH_SLOT_ERR', err);
      if (planRequestRef.current !== requestToken) return;
      const message = String(err?.message || 'Could not load class log from the database.');
      setPlan(null);
      setTopic('');
      setTechniques('');
      setTeacherId('');
      setAttendeesText('');
      setInitialPlanSnapshot(
        JSON.stringify({ topic: '', techniques: '', teacherId: '', attendeesText: '' })
      );
      setError(message);
      setEditorMode('edit');
    } finally {
      if (planRequestRef.current !== requestToken) return;
      setIsLoadingPlan(false);
    }
  };

  const openClassPlanEditor = async (
    item: (typeof studentSchedule)[number],
    dayKey: DayKey,
    dayLabel: string
  ) => {
    const dateKey = weekDatesByDay[dayKey].dateKey;

    setIsLoadingPlan(true);
    setError(null);
    setPlan(null);

    setEditingSlot({
      slotCode: item.id,
      slotDbId: slotIdByCode[item.id] || item.id,
      dayKey,
      dayLabel,
      dateKey,
      timeRange: item.time.replace('-', '–'),
      className: `${item.room} • ${item.level}`,
    });

    await fetchSlotAndPlan(item.id, dateKey);
  };

  const saveClassPlan = async () => {
    if (!editingSlot) return;
    const content = techniques.trim() || topic.trim();
    const attendees = parseAttendees(attendeesText);

    if (!content) {
      setToast({ type: 'error', message: 'Class content is required.' });
      return;
    }

    if (!editingSlot.slotDbId) {
      setToast({ type: 'error', message: 'Slot id is not ready yet. Please retry.' });
      return;
    }

    setIsSavingPlan(true);
    try {
      const saved = await upsertClassLog(editingSlot.slotDbId, editingSlot.dateKey, {
        topic,
        content,
        teacher_id: teacherId || null,
        teacher_name: teacherId ? coaches.find((coach) => coach.id === teacherId)?.full_name || null : null,
        attendees,
      });

      setPlanExistsMap((prev) => ({
        ...prev,
        [planExistsKey(saved.schedule_id, saved.date)]: true,
      }));

      setToast({ type: 'success', message: 'Saved' });
      setIsLoadingPlan(false);
      setPlan(saved);
      setError(null);
      setEditorMode('view');
      setInitialPlanSnapshot(
        JSON.stringify({
          topic,
          techniques: content,
          teacherId: teacherId || '',
          attendeesText,
        })
      );
    } catch (error: any) {
      console.error('Erro saving class plan:', error);
      const message = String(error?.message || 'Unknown error.');
      setToast({ type: 'error', message: `Could not save to the database: ${message}` });
    } finally {
      setIsSavingPlan(false);
    }
  };

  const renderClassPlanForm = () => {
    if (!editingSlot) return null;

    const dateLabel = weekDatesByDay[editingSlot.dayKey].dateLabel;
    const canEditLogs = currentRole === 'admin' || currentRole === 'staff' || currentRole === 'coach';

    return (
      <div className="space-y-3">
        {isLoadingPlan ? (
          <div className="rounded-xl border border-[#242424] bg-[#151515] px-3 py-4 text-sm text-zinc-300">
            <div className="flex items-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent" />
              <span>A carregar...</span>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-[#5b1f24] bg-[#2a1214] px-3 py-3 text-sm text-rose-300">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => {
                if (!editingSlot) return;
                fetchSlotAndPlan(editingSlot.slotCode, editingSlot.dateKey);
              }}
              className="mt-2 rounded-lg border border-[#7a2a31] bg-[#3a1619] px-3 py-1.5 text-xs font-semibold text-rose-200"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <ClassLogPanel
              title="Class Log"
              subtitle={`${dateLabel} • ${editingSlot.timeRange} • ${editingSlot.className}`}
              log={plan}
              mode={editorMode}
              canEdit={canEditLogs}
              showAttendees
              coaches={coaches}
              topic={topic}
              content={techniques}
              teacherId={teacherId}
              attendeesText={attendeesText}
              isSaving={isSavingPlan}
              onChangeTopic={setTopic}
              onChangeContent={setTechniques}
              onChangeTeacher={setTeacherId}
              onChangeAttendees={setAttendeesText}
              onEdit={() => {
                if (!plan) return;
                setTopic(plan.topic || '');
                setTechniques(plan.content || '');
                setTeacherId(plan.teacher_id || '');
                setAttendeesText(plan.attendees?.join(', ') || '');
                setEditorMode('edit');
              }}
              onSave={saveClassPlan}
              onCancel={attemptCloseEditor}
              onClose={attemptCloseEditor}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#0b0b0b] text-zinc-100">
      <TeacherSidebar ativo="schedule" onLogout={() => router.push('/')} />

      <main className="flex-1 min-w-0 p-3 pt-16 sm:p-5 sm:pt-16 lg:p-7">
        <div className="mx-auto max-w-[1320px]">
          {/* Hero */}
          <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-1 text-sm font-medium uppercase tracking-widest text-zinc-500 capitalize sm:text-xs">
                {new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <h1 className="text-4xl font-black leading-tight text-white">
                Horário <span className="text-[#c81d25]">Semanal</span>
              </h1>
              <p className="mt-1 text-sm text-zinc-500">Gracie Barra Carnaxide &amp; Queijas</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const prevWeek = new Date(selectedMonday || new Date());
                  prevWeek.setDate(prevWeek.getDate() - 7);
                  setSelectedMonday(prevWeek);
                }}
                className="rounded-lg border border-[#2a2a2a] bg-[#161616] px-3 py-2.5 text-sm text-zinc-300 hover:border-[#3a3a3a] hover:text-white transition"
              >
                ← Anterior
              </button>
              <button
                type="button"
                onClick={() => setSelectedMonday(null)}
                className="rounded-lg border border-[#2a2a2a] bg-[#161616] px-3 py-2.5 text-sm text-zinc-300 hover:border-[#3a3a3a] hover:text-white transition"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextWeek = new Date(selectedMonday || new Date());
                  nextWeek.setDate(nextWeek.getDate() + 7);
                  setSelectedMonday(nextWeek);
                }}
                className="rounded-lg border border-[#2a2a2a] bg-[#161616] px-3 py-2.5 text-sm text-zinc-300 hover:border-[#3a3a3a] hover:text-white transition"
              >
                Próxima →
              </button>
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
                Descarregar
              </button>
              <button
                type="button"
                onClick={openModal}
                className="rounded-xl bg-[#c81d25] px-4 py-3 text-base font-semibold text-white hover:bg-[#a8141c] transition-colors sm:py-2.5 sm:text-sm"
              >
                Full screen
              </button>
            </div>
          </header>

          {/* Week range label */}
          <div className="mb-5">
            <p className="text-sm text-zinc-400">
              Semana de{' '}
              <span className="font-semibold text-zinc-200">
                {(() => {
                  const monday = selectedMonday || new Date();
                  const sunday = new Date(monday);
                  sunday.setDate(monday.getDate() + 6);
                  return `${monday.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })} a ${sunday.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
                })()}
              </span>
            </p>
          </div>

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
              <>
                {/* Mobile (<sm): one day at a time, navigated via horizontal tabs */}
                <div className="sm:hidden">
                  <div className="mb-3 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {DAY_ORDER.map(({ key, label }) => {
                      const isActive = selectedDayKey === key;
                      const dateLabel = weekDatesByDay[key].dateKey
                        ? new Date(`${weekDatesByDay[key].dateKey}T12:00:00`).getDate()
                        : '';
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSelectedDayKey(key)}
                          className={`shrink-0 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                            isActive
                              ? 'border-[#c81d25] bg-[#c81d25] text-white'
                              : 'border-[#2a2a2a] bg-[#161616] text-zinc-400'
                          }`}
                        >
                          {label} {dateLabel}
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-2">
                    {(classesByDay[selectedDayKey] || []).length === 0 ? (
                      <p className="rounded-xl border border-[#262626] bg-[#121212] px-3 py-3 text-sm text-zinc-500">Sem aulas</p>
                    ) : (
                      (classesByDay[selectedDayKey] || []).map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          className="relative flex w-full items-center gap-3 rounded-xl border border-[#262626] bg-[#161616] px-3 py-3 text-left transition active:bg-white/5"
                          onClick={() => {
                            const dayMeta = DAY_ORDER.find((d) => d.key === selectedDayKey)!;
                            openClassPlanEditor(item, selectedDayKey, dayMeta.label);
                          }}
                        >
                          {planExistsMap[
                            planExistsKey(slotIdByCode[item.id] || item.id, weekDatesByDay[selectedDayKey].dateKey)
                          ] ? (
                            <span className="absolute right-3 top-3 inline-block h-2 w-2 rounded-full bg-[#c81d25]" />
                          ) : null}
                          <span className="shrink-0 rounded-full border border-[#333] bg-[#111] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-zinc-300">
                            {item.room}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-zinc-100">
                              {item.level} • {item.type}
                            </span>
                            {item.type === 'Sparring' ? (
                              <span className="mt-1 inline-block rounded-full border border-[#5b1f24] bg-[rgba(91,31,36,0.25)] px-1.5 py-0.5 text-[10px] text-rose-300">
                                Sparring
                              </span>
                            ) : null}
                          </span>
                          <span className="shrink-0 text-sm font-medium text-zinc-200">{item.time.replace('-', '–')}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* sm and up: full weekly grid */}
                <div className="hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-7">
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
                                onClick={() => {
                                  openClassPlanEditor(item, key, label);
                                }}
                              >
                                {planExistsMap[
                                  planExistsKey(slotIdByCode[item.id] || item.id, weekDatesByDay[key].dateKey)
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
              </>
            ) : (
              <>
                <div className="rounded-xl border border-[#232323] bg-[#161616] p-3 lg:p-4">
                  {imageMissing ? (
                    <div className="grid min-h-[360px] place-items-center rounded-lg border border-dashed border-[#333] text-sm text-zinc-500">
                      Horário image not found at /public/schedule.png
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
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 px-4 py-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              attemptCloseEditor();
            }
          }}
        >
          <div className="max-h-[80vh] w-full max-w-[700px] overflow-y-auto rounded-2xl border border-[#2a2a2a] bg-[#121212] p-5 shadow-[0_22px_56px_rgba(0,0,0,0.65)] sm:p-6">
            {renderClassPlanForm()}
          </div>
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
                <div className="grid h-[60vh] place-items-center text-sm text-zinc-500">Horário image not found at /public/schedule.png</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
