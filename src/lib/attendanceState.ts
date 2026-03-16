export type BehaviorValue = 'GOOD' | 'NEUTRAL' | 'BAD' | null;

export interface BehaviorEvent {
  kidId: string;
  dateKey: string;
  value: 'GOOD' | 'NEUTRAL' | 'BAD';
  createdAt: number;
  coachId?: string;
}

export const ATTENDANCE_STORAGE_KEY = 'gymapp.attendanceByDate';
export const BEHAVIOR_EVENTS_STORAGE_KEY = 'gymapp.behaviorEvents';
export const ATTENDANCE_UPDATED_EVENT = 'attendance-updated';
export const BEHAVIOR_UPDATED_EVENT = 'behavior-updated';

const LEGACY_ATTENDANCE_STORAGE_KEY = 'attendance_by_date';
const LEGACY_BEHAVIOR_MAP_STORAGE_KEY = 'attendance_kid_behavior_by_date';

export const toDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isBehaviorValue = (value: unknown): value is 'GOOD' | 'NEUTRAL' | 'BAD' => value === 'GOOD' || value === 'NEUTRAL' || value === 'BAD';

const dispatchAttendanceUpdated = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(ATTENDANCE_UPDATED_EVENT));
};

const dispatchBehaviorUpdated = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(BEHAVIOR_UPDATED_EVENT));
};

export const readAttendanceByDate = (): Record<string, string[]> => {
  if (typeof window === 'undefined') return {};

  try {
    const current = window.localStorage.getItem(ATTENDANCE_STORAGE_KEY);
    if (current) {
      const parsed = JSON.parse(current) as Record<string, string[]>;
      return parsed && typeof parsed === 'object' ? parsed : {};
    }

    const legacy = window.localStorage.getItem(LEGACY_ATTENDANCE_STORAGE_KEY);
    if (!legacy) return {};
    const parsed = JSON.parse(legacy) as Record<string, string[]>;
    const migrated = parsed && typeof parsed === 'object' ? parsed : {};
    window.localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return {};
  }
};

export const writeAttendanceByDate = (attendanceByDate: Record<string, string[]>) => {
  if (typeof window === 'undefined') return;

  const nextRaw = JSON.stringify(attendanceByDate);
  const currentRaw = window.localStorage.getItem(ATTENDANCE_STORAGE_KEY);
  if (currentRaw === nextRaw) return;

  window.localStorage.setItem(ATTENDANCE_STORAGE_KEY, nextRaw);
  dispatchAttendanceUpdated();
};

export const setMemberAttendanceForDate = (
  attendanceByDate: Record<string, string[]>,
  dateKey: string,
  memberId: string,
  attended: boolean
): Record<string, string[]> => {
  const current = new Set(attendanceByDate[dateKey] || []);

  if (attended) {
    current.add(memberId);
  } else {
    current.delete(memberId);
  }

  return {
    ...attendanceByDate,
    [dateKey]: Array.from(current),
  };
};

const migrateLegacyBehaviorMap = (): BehaviorEvent[] => {
  if (typeof window === 'undefined') return [];

  try {
    const legacyRaw = window.localStorage.getItem(LEGACY_BEHAVIOR_MAP_STORAGE_KEY);
    if (!legacyRaw) return [];
    const parsed = JSON.parse(legacyRaw) as Record<string, Record<string, BehaviorValue>>;
    if (!parsed || typeof parsed !== 'object') return [];

    const migrated: BehaviorEvent[] = [];
    Object.entries(parsed).forEach(([dateKey, kidMap]) => {
      Object.entries(kidMap || {}).forEach(([kidId, value]) => {
        if (!isBehaviorValue(value)) return;
        migrated.push({
          kidId,
          dateKey,
          value,
          createdAt: new Date(`${dateKey}T12:00:00`).getTime(),
        });
      });
    });
    return migrated;
  } catch {
    return [];
  }
};

export const readBehaviorEvents = (): BehaviorEvent[] => {
  if (typeof window === 'undefined') return [];

  try {
    const current = window.localStorage.getItem(BEHAVIOR_EVENTS_STORAGE_KEY);
    if (current) {
      const parsed = JSON.parse(current) as BehaviorEvent[];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((event) => Boolean(event?.kidId) && Boolean(event?.dateKey) && isBehaviorValue(event?.value) && Number.isFinite(event?.createdAt));
    }

    const migrated = migrateLegacyBehaviorMap();
    if (migrated.length > 0) {
      window.localStorage.setItem(BEHAVIOR_EVENTS_STORAGE_KEY, JSON.stringify(migrated));
    }
    return migrated;
  } catch {
    return [];
  }
};

export const writeBehaviorEvents = (events: BehaviorEvent[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(BEHAVIOR_EVENTS_STORAGE_KEY, JSON.stringify(events));
  dispatchBehaviorUpdated();
};

export const upsertBehaviorEvent = (
  events: BehaviorEvent[],
  payload: { kidId: string; dateKey: string; value: 'GOOD' | 'NEUTRAL' | 'BAD'; coachId?: string }
): BehaviorEvent[] => {
  const next = [...events];
  const index = next.findIndex((event) => event.kidId === payload.kidId && event.dateKey === payload.dateKey);
  const createdAt = Date.now();

  if (index >= 0) {
    next[index] = { ...next[index], value: payload.value, createdAt, coachId: payload.coachId };
    return next;
  }

  next.push({ kidId: payload.kidId, dateKey: payload.dateKey, value: payload.value, createdAt, coachId: payload.coachId });
  return next;
};

export const removeBehaviorEvent = (events: BehaviorEvent[], kidId: string, dateKey: string): BehaviorEvent[] => {
  return events.filter((event) => !(event.kidId === kidId && event.dateKey === dateKey));
};
