"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getKidBehaviorEvents, getMembers, upsertKidBehavior } from '../../../lib/database';
import { getAgeFromDateOfBirth } from '../../../lib/types';
import TeacherSidebar from '@/components/members/TeacherSidebar';
import {
  readBehaviorEvents,
  readAttendanceByDate,
  toDateKey,
  upsertBehaviorEvent,
  writeAttendanceByDate,
  writeBehaviorEvents,
} from '@/lib/attendanceState';

type AttendanceTab = 'adults' | 'kids';
type BehaviorValue = 'GOOD' | 'NEUTRAL' | 'BAD' | null;
type KidBehaviorByDate = Record<string, Record<string, BehaviorValue>>;

interface AttendancePerson {
  id: string;
  name: string;
  type: 'adult' | 'kid';
  group?: string;
  belt?: string;
}

const weekdayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const monthLabels = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const behaviorOptions: Array<{ value: Exclude<BehaviorValue, null>; emoji: string; label: string }> = [
  { value: 'GOOD', emoji: '😀', label: 'Good' },
  { value: 'NEUTRAL', emoji: '😐', label: 'Neutral' },
  { value: 'BAD', emoji: '😡', label: 'Bad' },
];

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
};

const getKidsGroup = (age: number | null): string => {
  if (age === null) return 'Kids';
  if (age <= 8) return 'Kids 1';
  if (age <= 12) return 'Kids 2';
  return 'Kids 3';
};

const getDateKey = (date: Date): string => {
  return toDateKey(date);
};

const parseDateKey = (dateKey: string): Date => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

const isToday = (dateKey: string): boolean => dateKey === getDateKey(new Date());

const formatDateLabel = (dateKey: string): string => {
  if (isToday(dateKey)) return 'Today';
  const date = parseDateKey(dateKey);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getMonthStart = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1);

const buildCalendarDays = (visibleMonth: Date): Array<{ key: string; label: number; inCurrentMonth: boolean }> => {
  const monthStart = getMonthStart(visibleMonth);
  const gridStart = new Date(monthStart);
  gridStart.setDate(1 - monthStart.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(gridStart);
    current.setDate(gridStart.getDate() + index);
    return {
      key: getDateKey(current),
      label: current.getDate(),
      inCurrentMonth: current.getMonth() === visibleMonth.getMonth(),
    };
  });
};

export default function AttendancePage() {
  const todayKey = useMemo(() => getDateKey(new Date()), []);
  const [activeTab, setActiveTab] = useState<AttendanceTab>('adults');
  const [search, setSearch] = useState('');
  const [people, setPeople] = useState<AttendancePerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [visibleMonth, setVisibleMonth] = useState(() => getMonthStart(new Date()));
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [attendanceByDate, setAttendanceByDate] = useState<Record<string, string[]>>({});
  const [kidBehaviorByDate, setKidBehaviorByDate] = useState<KidBehaviorByDate>({});
  const datePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const persisted = window.localStorage.getItem('attendance_active_tab');
    if (persisted === 'adults' || persisted === 'kids') {
      setActiveTab(persisted);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('attendance_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      setAttendanceByDate(readAttendanceByDate());
    } catch (error) {
      console.error('Error restoring attendance state from localStorage:', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    writeAttendanceByDate(attendanceByDate);
  }, [attendanceByDate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const loadMembers = async () => {
      setLoading(true);
      try {
        const members = await getMembers();
        const mapped: AttendancePerson[] = members
          .map((member) => {
            const age = getAgeFromDateOfBirth(member.date_of_birth);
            const isKid = age !== null && age < 16;
            return {
              id: member.id,
              name: member.name,
              type: (isKid ? 'kid' : 'adult') as AttendancePerson['type'],
              group: isKid ? getKidsGroup(age) : undefined,
              belt: isKid ? undefined : member.belt_level,
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name));

        setPeople(mapped);
      } catch (error) {
        console.error('Error loading attendance people:', error);
        setPeople([]);
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, []);

  const scopedPeople = useMemo(() => {
    const targetType: AttendancePerson['type'] = activeTab === 'kids' ? 'kid' : 'adult';
    return people.filter((person) => person.type === targetType);
  }, [activeTab, people]);

  const checkedInIds = useMemo(() => new Set(attendanceByDate[selectedDate] || []), [attendanceByDate, selectedDate]);

  const normalizedSearch = search.trim().toLowerCase();

  const leftList = useMemo(() => {
    return scopedPeople
      .filter((person) => !checkedInIds.has(person.id))
      .filter((person) => {
        if (!normalizedSearch) return true;
        return person.name.toLowerCase().includes(normalizedSearch);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [scopedPeople, checkedInIds, normalizedSearch]);

  const rightList = useMemo(() => {
    return scopedPeople
      .filter((person) => checkedInIds.has(person.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [scopedPeople, checkedInIds]);

  const selectDate = (dateKey: string) => {
    setSelectedDate(dateKey);
    setVisibleMonth(getMonthStart(parseDateKey(dateKey)));
    setIsDatePickerOpen(false);
  };

  const loadBehaviorForDate = useCallback(async (dateKey: string) => {
    const localEvents = readBehaviorEvents().filter((event) => event.dateKey === dateKey);
    const nextMap: Record<string, BehaviorValue> = {};

    localEvents.forEach((event) => {
      nextMap[event.kidId] = event.value;
    });

    try {
      const events = await getKidBehaviorEvents({ fromDateKey: dateKey, toDateKey: dateKey });
      events.forEach((event) => {
        nextMap[event.kid_id] = event.value;
      });
      console.log('[Attendance] behavior date load', { dateKey, eventsCount: events.length, sample: events[0] || null });
      setKidBehaviorByDate((prev) => ({
        ...prev,
        [dateKey]: {
          ...(prev[dateKey] ?? {}),
          ...nextMap,
        },
      }));
    } catch (error) {
      console.error('Error loading kid behavior for date:', dateKey, error);
      setKidBehaviorByDate((prev) => ({
        ...prev,
        [dateKey]: {
          ...(prev[dateKey] ?? {}),
          ...nextMap,
        },
      }));
    }
  }, []);

  useEffect(() => {
    loadBehaviorForDate(selectedDate);
  }, [selectedDate, loadBehaviorForDate]);

  const checkIn = (id: string) => {
    setAttendanceByDate((prev) => {
      const current = new Set(prev[selectedDate] || []);
      current.add(id);
      return { ...prev, [selectedDate]: Array.from(current) };
    });
  };

  const uncheckIn = (id: string) => {
    setAttendanceByDate((prev) => {
      const current = new Set(prev[selectedDate] || []);
      current.delete(id);
      return { ...prev, [selectedDate]: Array.from(current) };
    });
  };

  const setBehavior = (kidId: string, value: Exclude<BehaviorValue, null>) => {
    const dateKey = selectedDate;
    setKidBehaviorByDate((prev) => ({
      ...prev,
      [dateKey]: {
        ...(prev[dateKey] ?? {}),
        [kidId]: value,
      },
    }));

    console.log('emoji click', { kidId, dateKey, value });

    try {
      const nextBehaviorEvents = upsertBehaviorEvent(readBehaviorEvents(), { kidId, dateKey, value });
      writeBehaviorEvents(nextBehaviorEvents);
    } catch (error) {
      console.error('emoji local write error', error);
    }

    upsertKidBehavior({ kidId, dateKey, value })
      .then((data) => {
        console.log('emoji upsert ok', data);
      })
      .catch((error) => {
        console.error('emoji upsert error', error);
      });
  };

  const renderBehaviorSelector = (person: AttendancePerson, checkedIn: boolean) => {
    if (activeTab !== 'kids' || !checkedIn) return null;
    const dateKey = selectedDate;
    const selected = kidBehaviorByDate[dateKey]?.[person.id] ?? null;

    return (
      <div className="mr-2 flex items-center gap-1">
        {behaviorOptions.map((option) => {
          const isActive = selected === option.value;
          return (
            <button
              key={option.value}
              type="button"
              title={option.label}
              aria-label={option.label}
              onClick={(event) => {
                event.stopPropagation();
                setBehavior(person.id, option.value);
              }}
              className={`grid h-7 w-7 place-items-center rounded-md border text-[13px] transition ${
                isActive
                  ? 'border-[#c81d25] bg-[rgba(200,29,37,0.2)] shadow-[0_0_0_1px_rgba(200,29,37,0.2)]'
                  : 'border-[#2a2a2a] bg-[#161616] hover:border-[#3a3a3a]'
              }`}
            >
              {option.emoji}
            </button>
          );
        })}
      </div>
    );
  };

  const renderRow = (person: AttendancePerson, checkedIn: boolean) => {
    return (
      <button
        key={person.id}
        type="button"
        onClick={() => {
          if (!checkedIn) checkIn(person.id);
        }}
        className={`flex w-full items-center gap-3 border-b border-white/5 px-3 py-3 text-left transition ${
          checkedIn ? 'cursor-default' : 'cursor-pointer hover:bg-white/5'
        }`}
      >
        <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-[#2a2a2a] bg-[#1a1a1a] text-xs font-semibold text-zinc-200">
          {getInitials(person.name)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-zinc-100">{person.name}</div>
          <div className="truncate text-xs text-zinc-500">
            {person.type === 'kid' ? person.group || 'Kids' : person.belt || 'Adult'}
          </div>
        </div>

        {activeTab === 'kids' ? renderBehaviorSelector(person, checkedIn) : null}

        {checkedIn ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              uncheckIn(person.id);
            }}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-emerald-500/40 bg-emerald-500/20 text-emerald-300 transition hover:bg-emerald-500/30"
            aria-label={`Uncheck ${person.name}`}
            title="Uncheck"
          >
            ✓
          </button>
        ) : (
          <span className="text-base text-zinc-600">→</span>
        )}
      </button>
    );
  };

  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);

  return (
    <div className="flex min-h-screen bg-[linear-gradient(180deg,#0b0b0b_0%,#101010_100%)] text-zinc-100">
      <TeacherSidebar active="attendance" />

      <main className="flex-1 p-6 lg:p-8">
        <div className="mx-auto max-w-[1320px]">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <label className="flex w-full max-w-[500px] items-center gap-2 rounded-full border border-[#222] bg-[#121212] px-4 py-2.5 shadow-[0_6px_22px_rgba(0,0,0,0.28)]">
              <span className="text-zinc-500">⌕</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search..."
                className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 outline-none"
              />
            </label>

            <div className="flex flex-wrap items-center gap-3" ref={datePickerRef}>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDatePickerOpen((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#252525] bg-[#141414] px-4 py-2.5 text-sm font-medium text-zinc-200 shadow-[0_10px_20px_rgba(0,0,0,0.2)] transition hover:border-[rgba(200,29,37,0.45)] hover:text-white"
                >
                  <span>{formatDateLabel(selectedDate)}</span>
                  <span className="text-xs text-zinc-500">▾</span>
                </button>

                {isDatePickerOpen ? (
                  <div className="absolute right-0 top-[calc(100%+10px)] z-20 w-[300px] rounded-2xl border border-[#222] bg-[#121212] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-[#252525] bg-[#161616] text-zinc-300 transition hover:border-[#343434] hover:text-white"
                      >
                        ‹
                      </button>
                      <div className="text-sm font-semibold text-zinc-100">
                        {monthLabels[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
                      </div>
                      <button
                        type="button"
                        onClick={() => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-[#252525] bg-[#161616] text-zinc-300 transition hover:border-[#343434] hover:text-white"
                      >
                        ›
                      </button>
                    </div>

                    <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                      {weekdayLabels.map((label) => (
                        <div key={label} className="py-1">{label}</div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {calendarDays.map((day) => {
                        const isSelected = day.key === selectedDate;
                        const isCurrentDay = isToday(day.key);
                        return (
                          <button
                            key={day.key}
                            type="button"
                            onClick={() => selectDate(day.key)}
                            className={`h-9 rounded-lg border text-sm transition ${
                              isSelected
                                ? 'border-[#c81d25] bg-[rgba(200,29,37,0.22)] text-white'
                                : isCurrentDay
                                  ? 'border-[#7f1d1d] bg-[rgba(127,29,29,0.2)] text-zinc-100'
                                  : day.inCurrentMonth
                                    ? 'border-transparent bg-[#151515] text-zinc-300 hover:border-[#303030] hover:bg-[#191919]'
                                    : 'border-transparent bg-transparent text-zinc-600 hover:bg-[#141414]'
                            }`}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => selectDate(todayKey)}
                        className="rounded-lg border border-[#252525] bg-[#161616] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-300 transition hover:border-[rgba(200,29,37,0.45)] hover:text-white"
                      >
                        Today
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                className="rounded-xl border border-[#c81d25] bg-[#c81d25] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(200,29,37,0.28)] transition hover:bg-[#ab1820]"
              >
                Start Attendance
              </button>
            </div>
          </div>

          <header className="mb-5">
            <h1 className="text-4xl font-bold text-white">Attendance</h1>
            <p className="mt-1 text-lg text-zinc-400">Manage daily check-ins</p>
          </header>

          <section className="rounded-2xl border border-[#222] bg-[#111] p-4 shadow-[0_14px_38px_rgba(0,0,0,0.32)]">
            <div className="mb-4 inline-flex rounded-xl border border-[#252525] bg-[#141414] p-1">
              <button
                type="button"
                onClick={() => setActiveTab('adults')}
                className={`rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                  activeTab === 'adults'
                    ? 'border border-[#c81d25] bg-[rgba(200,29,37,0.2)] text-zinc-100'
                    : 'border border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Adults
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('kids')}
                className={`rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                  activeTab === 'kids'
                    ? 'border border-[#c81d25] bg-[rgba(200,29,37,0.2)] text-zinc-100'
                    : 'border border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Kids
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#222] bg-[#121212] p-3 shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
                <div className="mb-2 px-2 text-base font-semibold text-zinc-100">
                  Not checked in <span className="text-zinc-500">({leftList.length})</span>
                </div>
                <div className="overflow-hidden rounded-xl border border-[#1f1f1f] bg-[#101010]">
                  {loading ? (
                    <div className="px-3 py-8 text-center text-sm text-zinc-500">Loading members...</div>
                  ) : leftList.length === 0 ? (
                    <div className="px-3 py-8 text-center text-sm text-zinc-500">No members found in this list.</div>
                  ) : (
                    leftList.map((person) => renderRow(person, false))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-[#222] bg-[#121212] p-3 shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
                <div className="mb-2 px-2 text-base font-semibold text-zinc-100">
                  Checked in today <span className="text-zinc-500">({rightList.length})</span>
                </div>
                <div className="overflow-hidden rounded-xl border border-[#1f1f1f] bg-[#101010]">
                  {loading ? (
                    <div className="px-3 py-8 text-center text-sm text-zinc-500">Loading members...</div>
                  ) : rightList.length === 0 ? (
                    <div className="px-3 py-8 text-center text-sm text-zinc-500">Nobody checked in yet.</div>
                  ) : (
                    rightList.map((person) => renderRow(person, true))
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
