"use client";

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import TeacherSidebar from '@/components/members/TeacherSidebar';
import { officialSchedule, studentSchedule } from '@/components/student/studentData';
import {
  CoachProfile,
  ClassPlanRow,
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
type PlanMode = 'remote' | 'local';

interface LocalClassPlanDraft {
  topic: string;
  techniques: string;
  coach_primary_id: string;
  coach_secondary_id: string | null;
  updated_at: string;
}

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
const LOCAL_CLASS_PLAN_STORAGE_KEY = 'gymapp_schedule_class_plans_local_v1';

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
  const [planMode, setPlanMode] = useState<PlanMode>('remote');
  const [openSlotId, setOpenSlotId] = useState<string | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [plan, setPlan] = useState<ClassPlanRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingSlot, setEditingSlot] = useState<EditingSlot | null>(null);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [topic, setTopic] = useState('');
  const [techniques, setTechniques] = useState('');
  const [coachPrimaryId, setCoachPrimaryId] = useState('');
  const [coachSecondaryId, setCoachSecondaryId] = useState('');
  const [initialPlanSnapshot, setInitialPlanSnapshot] = useState('');
  const [toast, setToast] = useState<ToastState>(null);
  const [selectedMonday, setSelectedMonday] = useState<Date | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

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
      const dateKey = date.toISOString().split('T')[0];
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
    coachPrimaryId: coachPrimaryId || '',
    coachSecondaryId: coachSecondaryId || '',
  });

  const hasUnsavedChanges = initialPlanSnapshot !== '' && planSnapshot !== initialPlanSnapshot;

  const planExistsKey = (slotId: string, dateKey: string) => `${slotId}|${dateKey}`;

  const readLocalClassPlans = (): Record<string, LocalClassPlanDraft> => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem(LOCAL_CLASS_PLAN_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  };

  const writeLocalClassPlans = (data: Record<string, LocalClassPlanDraft>) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(LOCAL_CLASS_PLAN_STORAGE_KEY, JSON.stringify(data));
  };

  const loadLocalClassPlan = (slotCode: string, dateKey: string): ClassPlanRow | null => {
    const all = readLocalClassPlans();
    const key = `${slotCode}|${dateKey}`;
    const draft = all[key];
    if (!draft) return null;
    return {
      id: key,
      slot_id: slotCode,
      date: dateKey,
      topic: draft.topic,
      techniques: draft.techniques,
      coach_primary_id: draft.coach_primary_id,
      coach_secondary_id: draft.coach_secondary_id,
      updated_at: draft.updated_at,
      updated_by: null,
    };
  };

  const saveLocalClassPlan = (
    slotCode: string,
    dateKey: string,
    payload: { topic: string; techniques: string; coach_primary_id: string; coach_secondary_id: string | null }
  ) => {
    const all = readLocalClassPlans();
    all[`${slotCode}|${dateKey}`] = {
      topic: payload.topic,
      techniques: payload.techniques,
      coach_primary_id: payload.coach_primary_id,
      coach_secondary_id: payload.coach_secondary_id,
      updated_at: new Date().toISOString(),
    };
    writeLocalClassPlans(all);
  };

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
    if (planMode !== 'local') return;

    const localPlans = readLocalClassPlans();
    const next: Record<string, boolean> = {};

    officialSchedule.forEach((slot) => {
      const dayDate = weekDatesByDay[slot.dayOfWeek].dateKey;
      if (!dayDate) return;
      if (localPlans[`${slot.id}|${dayDate}`]) {
        next[planExistsKey(slot.id, dayDate)] = true;
      }
    });

    setPlanExistsMap(next);
  }, [planMode, weekDatesByDay]);

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

    if (planMode === 'local') return;

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
        const message = String(error?.message || error || '');
        if (/schema cache|schedule_slots|class_plans/i.test(message)) {
          setPlanMode('local');
          setToast({ type: 'error', message: 'Horário DB tables missing. Using local class-plan mode.' });
          return;
        }
        setToast({ type: 'error', message: 'Could not load schedule slots.' });
      });
  }, [planMode]);

  useEffect(() => {
    if (planMode !== 'remote') return;
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
        console.error('Erro loading plan indicators:', error);
      });
  }, [planMode, slotIdByCode, weekDatesByDay]);

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
      setOpenSlotId(null);
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
    setOpenSlotId(null);
    setIsLoadingPlan(false);
    setPlan(null);
    setError(null);
    setInitialPlanSnapshot('');
  }

  const fetchSlotAndPlan = async (slotCode: string, dateKey: string) => {
    setIsLoadingPlan(true);
    setError(null);
    setPlan(null);

    if (planMode === 'local') {
      const local = loadLocalClassPlan(slotCode, dateKey);
      console.log('FETCH_SLOT_START', slotCode);
      console.log('FETCH_SLOT_OK', { slotId: slotCode, slotCode, mode: 'local' });
      console.log('FETCH_PLAN_OK', local);
      const nextTopic = local?.topic || '';
      const nextTechniques = local?.techniques || '';
      const nextPrimary = local?.coach_primary_id || '';
      const nextSecondary = local?.coach_secondary_id || '';

      setPlan(local);
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
      setEditingSlot((prev) => {
        if (!prev || prev.slotCode !== slotCode || prev.dateKey !== dateKey) return prev;
        return { ...prev, slotDbId: slotCode };
      });
      setIsLoadingPlan(false);
      return;
    }

    let slotDbId: string | undefined = slotIdByCode[slotCode];
    console.log('FETCH_SLOT_START', slotCode);

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

      console.log('FETCH_SLOT_OK', { slotId: resolvedSlotId, slotCode });
      const existing = await getClassPlan(resolvedSlotId, dateKey);
      console.log('FETCH_PLAN_OK', existing);

      setPlan(existing);

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

      setEditingSlot((prev) => {
        if (!prev || prev.slotCode !== slotCode || prev.dateKey !== dateKey) return prev;
        return { ...prev, slotDbId: resolvedSlotId };
      });
    } catch (err: any) {
      console.error('FETCH_SLOT_ERR', err);
      const message = String(err?.message || 'Could not load class plan.');
      if (/schema cache|schedule_slots|class_plans/i.test(message)) {
        setPlanMode('local');
        const local = loadLocalClassPlan(slotCode, dateKey);
        const nextTopic = local?.topic || '';
        const nextTechniques = local?.techniques || '';
        const nextPrimary = local?.coach_primary_id || '';
        const nextSecondary = local?.coach_secondary_id || '';

        setPlan(local);
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
        setEditingSlot((prev) => {
          if (!prev || prev.slotCode !== slotCode || prev.dateKey !== dateKey) return prev;
          return { ...prev, slotDbId: slotCode };
        });
        setError(null);
        setToast({ type: 'error', message: 'Horário DB tables missing. Editing in local mode.' });
      } else {
        setPlan(null);
        setTopic('');
        setTechniques('');
        setCoachPrimaryId('');
        setCoachSecondaryId('');
        setInitialPlanSnapshot(
          JSON.stringify({ topic: '', techniques: '', coachPrimaryId: '', coachSecondaryId: '' })
        );
        setError(message);
      }
    } finally {
      setIsLoadingPlan(false);
    }
  };

  const openClassPlanEditor = async (
    item: (typeof studentSchedule)[number],
    dayKey: DayKey,
    dayLabel: string,
    anchorRect: DOMRect
  ) => {
    const dateKey = weekDatesByDay[dayKey].dateKey;

    console.log('SLOT_CLICK', {
      slotId: slotIdByCode[item.id] ?? null,
      slot: item,
      dateKey,
    });

    if (!slotIdByCode[item.id]) {
      console.log('SLOT_CLICK_SLOT_ID_UNDEFINED', { slotCode: item.id, slotId: slotIdByCode[item.id] });
    }

    setOpenSlotId(item.id);
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
      anchorRect,
    });

    await fetchSlotAndPlan(item.id, dateKey);
  };

  const saveClassPlan = async () => {
    if (!editingSlot) return;
    if (!coachPrimaryId) {
      setToast({ type: 'error', message: 'Primary coach is required.' });
      return;
    }

    if (planMode === 'local') {
      saveLocalClassPlan(editingSlot.slotCode, editingSlot.dateKey, {
        topic,
        techniques,
        coach_primary_id: coachPrimaryId,
        coach_secondary_id: coachSecondaryId || null,
      });

      setPlanExistsMap((prev) => ({
        ...prev,
        [planExistsKey(editingSlot.slotCode, editingSlot.dateKey)]: true,
      }));

      setToast({ type: 'success', message: 'Saved locally' });
      setEditingSlot(null);
      setOpenSlotId(null);
      setIsLoadingPlan(false);
      setError(null);
      setInitialPlanSnapshot('');
      return;
    }

    if (!editingSlot.slotDbId) {
      setError('Slot id is not ready yet. Please retry.');
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
      setOpenSlotId(null);
      setIsLoadingPlan(false);
      setPlan(saved);
      setError(null);
      setInitialPlanSnapshot('');
    } catch (error) {
      console.error('Erro saving class plan:', error);
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
          {planMode === 'local' ? (
            <p className="mt-1 text-xs text-amber-300">Local mode ativo (database table missing).</p>
          ) : null}
        </div>

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
          <>
            <div className="rounded-xl border border-[#242424] bg-[#151515] px-3 py-2 text-xs text-zinc-400">
              {plan ? 'Saved plan found for this class/date.' : 'Não saved plan yet for this class/date.'}
            </div>

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
                <label className="mb-1 block text-xs font-medium text-zinc-400">Professor (Primary)</label>
                <select
                  value={coachPrimaryId}
                  onChange={(event) => setCoachPrimaryId(event.target.value)}
                  className="w-full rounded-xl border border-[#2a2a2a] bg-[#141414] px-3 py-2 text-sm text-zinc-100 outline-none"
                >
                  <option value="">Select coach</option>
                  {coaches.map((coach) => (
                    <option key={coach.id} value={coach.id}>
                      {coach.full_name || 'Unnamed Professor'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">Professor (Secondary)</label>
                <select
                  value={coachSecondaryId}
                  onChange={(event) => setCoachSecondaryId(event.target.value)}
                  className="w-full rounded-xl border border-[#2a2a2a] bg-[#141414] px-3 py-2 text-sm text-zinc-100 outline-none"
                >
                  <option value="">None</option>
                  {coaches.map((coach) => (
                    <option key={coach.id} value={coach.id}>
                      {coach.full_name || 'Unnamed Professor'}
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
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveClassPlan}
                disabled={isSavingPlan || !coachPrimaryId || !openSlotId}
                className="rounded-xl border border-[#c81d25] bg-[#c81d25] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isSavingPlan ? 'Saving...' : 'Guardar'}
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
      <TeacherSidebar ativo="schedule" onLogout={() => router.push('/')} />

      <main className="flex-1 p-6 lg:p-8">
        <div className="mx-auto max-w-[1320px]">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <label className="flex w-full max-w-[500px] items-center gap-2 rounded-full border border-[#222] bg-[#121212] px-4 py-2.5 shadow-[0_6px_22px_rgba(0,0,0,0.28)]">
              <span className="text-zinc-500">⌕</span>
              <input
                placeholder="Pesquisar class..."
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
                Descarregar
              </button>
              <button
                type="button"
                onClick={openModal}
                className="rounded-xl border border-[#c81d25] bg-[#c81d25] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(200,29,37,0.28)] transition hover:bg-[#ab1820]"
              >
                Abrir full screen
              </button>
            </div>
          </div>

          <header className="mb-6">
            <h1 className="text-4xl font-bold text-white">Horário</h1>
            <p className="mt-1 text-lg text-zinc-400">Gracie Barra Carnaxide e Oeiras</p>
            
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const prevWeek = new Date(selectedMonday || new Date());
                  prevWeek.setDate(prevWeek.getDate() - 7);
                  setSelectedMonday(prevWeek);
                }}
                className="rounded-lg border border-[#2a2a2a] bg-[#161616] px-3 py-2 text-sm text-zinc-300 hover:border-[#3a3a3a] hover:text-white transition"
                title="Semana anterior"
              >
                ← Anterior
              </button>
              
              <button
                type="button"
                onClick={() => setSelectedMonday(null)}
                className="rounded-lg border border-[#2a2a2a] bg-[#161616] px-3 py-2 text-sm text-zinc-300 hover:border-[#3a3a3a] hover:text-white transition"
                title="Voltar à semana atual"
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
                className="rounded-lg border border-[#2a2a2a] bg-[#161616] px-3 py-2 text-sm text-zinc-300 hover:border-[#3a3a3a] hover:text-white transition"
                title="Próxima semana"
              >
                Próxima →
              </button>

              <div className="border-l border-[#2a2a2a] pl-3">
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
            </div>
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
                <div className="grid h-[60vh] place-items-center text-sm text-zinc-500">Horário image not found at /public/schedule.png</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
