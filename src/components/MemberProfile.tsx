"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Member, calculateMonthlyFee, getBeltOptions, getAgeFromDateOfBirth } from "../../lib/types";
import { getAttendanceForMember, getNotesForMember, createNote, setAttendance, getKidBehaviorEvents, upsertKidBehavior, deleteKidBehaviorForDate } from "../../lib/database";
import {
  ATTENDANCE_UPDATED_EVENT,
  BEHAVIOR_UPDATED_EVENT,
  readBehaviorEvents,
  readAttendanceByDate,
  removeBehaviorEvent,
  setMemberAttendanceForDate,
  upsertBehaviorEvent,
  writeBehaviorEvents,
  writeAttendanceByDate,
  toDateKey,
} from "@/lib/attendanceState";

interface Comment {
  id: string;
  teacherName: string;
  timestamp: Date;
  message: string;
}

interface MemberEditForm {
  name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  belt_level: string;
  payment_type: 'Débito Direto' | 'Dinheiro';
  fee: string;
  status: 'Active' | 'Paused' | 'Unpaid';
  iban: string;
  nif: string;
}

interface MemberProfileProps {
  member: MemberDetail;
  onBack: () => void;
  onUpdate: (updatedMember: MemberDetail) => Promise<void> | void;
}

type BehaviorValue = 'GOOD' | 'NEUTRAL' | 'BAD' | null;

const BEHAVIOR_EMOJIS: Record<'GOOD' | 'NEUTRAL' | 'BAD', string> = {
  GOOD: "😀",
  NEUTRAL: "😐",
  BAD: "😡",
};

// Because Membro is defined in TeacherDashboard, we can re-declare necessary parts here to avoid circular import.
interface MemberDetail extends Member {
  beltLevel?: string;
  paymentType?: 'Débito Direto' | 'Dinheiro';
  monthlyFee?: number;
  familyDiscount?: boolean;
  attendance?: { [date: string]: boolean };
}

const createEditForm = (member: MemberDetail): MemberEditForm => ({
  name: member.name || '',
  email: member.email || '',
  phone: member.phone || '',
  date_of_birth: member.date_of_birth || '',
  belt_level: member.beltLevel || member.belt_level || 'White Cinto',
  payment_type: (member.paymentType || member.payment_type || 'Débito Direto') as 'Débito Direto' | 'Dinheiro',
  fee: String(member.monthlyFee ?? member.fee ?? 0),
  status: member.status,
  iban: member.iban || '',
  nif: member.nif || '',
});

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'Ativo': return 'border-green-800 bg-green-900/30 text-green-400';
    case 'Paused': return 'border-[#444] bg-[#1e1e1e] text-[#888]';
    case 'Por Pagar': return 'border-red-800 bg-red-900/20 text-red-400';
    default: return 'border-[#444] bg-[#1e1e1e] text-[#888]';
  }
}

function mergeAttendanceMapForMember(memberId: string, baseMap: { [date: string]: boolean }, attendanceByDate: Record<string, string[]>): { [date: string]: boolean } {
  // Start with Supabase data (baseMap is the source of truth)
  const nextMap = { ...baseMap };

  // Layer localStorage data on top, but only for dates that have entries
  Object.entries(attendanceByDate).forEach(([dateKey, memberIds]) => {
    const isAttended = memberIds.includes(memberId);
    // If database says attended, trust it. Only use localStorage if database is empty
    if (!nextMap.hasOwnProperty(dateKey)) {
      nextMap[dateKey] = isAttended;
    }
  });

  return nextMap;
}

const normalizeDateKey = (value: string): string => value.split('T')[0];

export default function MemberProfile({ member, onBack, onUpdate }: MemberProfileProps) {
  const [data, setData] = useState<MemberDetail>({ ...member });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState<MemberEditForm>(() => createEditForm(member));
  const [attendanceMap, setAttendanceMap] = useState<{ [date: string]: boolean }>({});
  const [behaviorMap, setBehaviorMap] = useState<{ [date: string]: BehaviorValue }>({});
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [showPercentage, setShowPercentage] = useState<boolean>(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [emojiPickerDate, setEmojiPickerDate] = useState<string | null>(null);
  const [reportFromDate, setReportFromDate] = useState<string>('');
  const [reportToDate, setReportToDate] = useState<string>('');
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const isPendingMember = (data.status as unknown as string) === 'pendente';
  void commentsEndRef;

  const age = data.date_of_birth ? getAgeFromDateOfBirth(data.date_of_birth) : null;
  const isKid = age !== null && age < 16;

  useEffect(() => {
    const nextData = { ...member };
    setData(nextData);
    setEditForm(createEditForm(nextData));
    setIsEditing(false);
  }, [member]);

  const readLocalBehaviorMap = useCallback((): { [date: string]: BehaviorValue } => {
    const nextMap: { [date: string]: BehaviorValue } = {};

    readBehaviorEvents()
      .filter((event) => event.kidId === member.id)
      .forEach((event) => {
        nextMap[event.dateKey] = event.value;
      });

    return nextMap;
  }, [member.id]);

  const loadKidBehaviorMap = useCallback(async (): Promise<{ [date: string]: BehaviorValue }> => {
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const endOfYear = new Date(today.getFullYear(), 11, 31);
    const startKey = toDateKey(startOfYear);
    const endKey = toDateKey(endOfYear);

    const events = await getKidBehaviorEvents({ fromDateKey: startKey, toDateKey: endKey });
    const nextMap: { [date: string]: BehaviorValue } = {
      ...readLocalBehaviorMap(),
    };

    events
      .filter((event) => event.kid_id === member.id)
      .forEach((event) => {
        const normalizedDateKey = normalizeDateKey(event.date);
        nextMap[normalizedDateKey] = event.value;
      });

    return nextMap;
  }, [member.id, readLocalBehaviorMap]);

  const loadMemberData = useCallback(async () => {
    try {
      setLoading(true);

      // Load attendance
      const attendanceData = await getAttendanceForMember(member.id);
      const attendanceMapLocal: { [date: string]: boolean } = {};
      attendanceData.forEach(att => {
        attendanceMapLocal[normalizeDateKey(att.date)] = att.attended;
      });
      setAttendanceMap(mergeAttendanceMapForMember(member.id, attendanceMapLocal, readAttendanceByDate()));

      // Load kid behavior if this is a kid
      if (isKid) {
        try {
          setBehaviorMap(await loadKidBehaviorMap());
        } catch (error) {
          console.error('Erro loading kid behavior events:', error);
          setBehaviorMap(readLocalBehaviorMap());
        }
      } else {
        setBehaviorMap({});
      }

      // Load notes
      const notesData = await getNotesForMember(member.id);
      const formattedComments: Comment[] = notesData.map(note => ({
        id: note.id,
        teacherName: note.teacher_name,
        timestamp: new Date(note.created_at),
        message: note.note_text
      }));
      setComments(formattedComments);

    } catch (error) {
      console.error('Erro loading member data:', error);
    } finally {
      setLoading(false);
    }
  }, [isKid, loadKidBehaviorMap, member.id, readLocalBehaviorMap]);

  useEffect(() => {
    loadMemberData();
  }, [loadMemberData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleAttendanceUpdated = () => {
      // Reload from database to ensure sync with attendance page
      loadMemberData();
    };

    window.addEventListener(ATTENDANCE_UPDATED_EVENT, handleAttendanceUpdated);
    return () => window.removeEventListener(ATTENDANCE_UPDATED_EVENT, handleAttendanceUpdated);
  }, [loadMemberData]);

  useEffect(() => {
    if (typeof window === 'undefined' || !isKid) return;

    const handleBehaviorUpdated = () => {
      const localMap = readLocalBehaviorMap();
      setBehaviorMap(localMap);

      loadKidBehaviorMap()
        .then((nextMap) => setBehaviorMap(nextMap))
        .catch(() => setBehaviorMap(localMap));
    };

    window.addEventListener(BEHAVIOR_UPDATED_EVENT, handleBehaviorUpdated);
    return () => window.removeEventListener(BEHAVIOR_UPDATED_EVENT, handleBehaviorUpdated);
  }, [isKid, loadKidBehaviorMap, readLocalBehaviorMap]);



  // Auto-scroll to bottom when new comments are added
  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  const toggleDate = async (date: string) => {
    const currentAttended = attendanceMap[date] || false;
    const newAttended = !currentAttended;

    // Atualizar UI immediately (optimistic update)
    setAttendanceMap(prev => ({
      ...prev,
      [date]: newAttended
    }));

    try {
      // Guardar to database
      await setAttendance(member.id, date, newAttended);
      const nextAttendanceByDate = setMemberAttendanceForDate(readAttendanceByDate(), date, member.id, newAttended);
      writeAttendanceByDate(nextAttendanceByDate);

      const updated = { ...data, attendance: { ...attendanceMap, [date]: newAttended } };
      setData(updated);

      if (isKid && !newAttended) {
        const nextEvents = removeBehaviorEvent(readBehaviorEvents(), member.id, date);
        writeBehaviorEvents(nextEvents);
        setBehaviorMap((prev) => {
          const next = { ...prev };
          delete next[date];
          return next;
        });
        setEmojiPickerDate(null);

        try {
          await deleteKidBehaviorForDate({ kidId: member.id, dateKey: date });
        } catch (error) {
          console.error('Erro clearing behavior for date:', error);
        }
      }

      // For kids, if marking as attended for first time, show emoji picker
      if (isKid && newAttended && !behaviorMap[date]) {
        setEmojiPickerDate(date);
      }

      // Reload data in background without loading state
      setTimeout(() => {
        loadMemberData().catch(() => {
          // Silently fail, keep the optimistic update
        });
      }, 200);
    } catch (error) {
      console.error('Erro updating attendance:', error);
      // Revert the optimistic update on error
      setAttendanceMap(prev => ({
        ...prev,
        [date]: currentAttended
      }));
    }
  };

  const handleBehaviorSelect = async (date: string, behavior: 'GOOD' | 'NEUTRAL' | 'BAD', event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    try {
      const nextEvents = upsertBehaviorEvent(readBehaviorEvents(), {
        kidId: member.id,
        dateKey: date,
        value: behavior,
      });
      writeBehaviorEvents(nextEvents);

      setBehaviorMap(prev => ({
        ...prev,
        [date]: behavior
      }));

      await upsertKidBehavior({ kidId: member.id, dateKey: date, value: behavior });
      setEmojiPickerDate(null);
    } catch (error) {
      console.error('Erro setting behavior:', error);
    }
  };

  const handleCalendarDayClick = (date: string) => {
    toggleDate(date);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Don't close if clicking inside the picker or emoji buttons
      if (emojiPickerRef.current && emojiPickerRef.current.contains(e.target as Node)) {
        return;
      }
      setEmojiPickerDate(null);
    };
    
    if (emojiPickerDate) {
      // Use click instead of mousedown to allow button onClick handlers to fire first
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
    
    return undefined;
  }, [emojiPickerDate]);

  const year = new Date().getFullYear();

  const months = Array.from({ length: 12 }, (_, i) => i);

  const getMonthAttendance = (year: number, month: number) => {
    const days = getDaysInMonth(year, month);
    let attended = 0;
    for (let d = 1; d <= days; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (attendanceMap[dateStr]) attended++;
    }
    return days === 0 ? 0 : Math.round((attended / days) * 100);
  };

  const getMonthAttendanceCount = (year: number, month: number) => {
    const days = getDaysInMonth(year, month);
    let attended = 0;
    for (let d = 1; d <= days; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (attendanceMap[dateStr]) attended++;
    }
    return { attended, total: days };
  };

  const handleSendComment = async () => {
    if (!newComment.trim()) return;

    try {
      const noteData = {
        member_id: member.id,
        date: new Date().toISOString().split('T')[0],
        teacher_name: "Professor Silva", // In a real app, this would come from auth
        note_text: newComment.trim(),
      };

      const createdNote = await createNote(noteData);

      const comment: Comment = {
        id: createdNote.id,
        teacherName: createdNote.teacher_name,
        timestamp: new Date(createdNote.created_at),
        message: createdNote.note_text,
      };

      setComments([...comments, comment]);
      setNewComment("");
    } catch (error) {
      console.error('Erro creating note:', error);
    }
  };

  const handleEditFieldChange = <K extends keyof MemberEditForm>(field: K, value: MemberEditForm[K]) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleEditDateOfBirthChange = (dateOfBirth: string) => {
    setEditForm(prev => {
      const beltOptions = getBeltOptions(dateOfBirth, prev.belt_level);
      return {
        ...prev,
        date_of_birth: dateOfBirth,
        belt_level: beltOptions.includes(prev.belt_level) ? prev.belt_level : beltOptions[0],
        fee: String(calculateMonthlyFee(dateOfBirth, prev.payment_type)),
      };
    });
  };

  const handleEditPaymentTypeChange = (paymentType: MemberEditForm['payment_type']) => {
    setEditForm(prev => ({
      ...prev,
      payment_type: paymentType,
      fee: String(calculateMonthlyFee(prev.date_of_birth, paymentType)),
    }));
  };

  const handleEditCancel = () => {
    setEditForm(createEditForm(data));
    setIsEditing(false);
  };

  const handleEditSave = async () => {
    if (!editForm.name.trim()) {
      console.error('Membro profile save blocked: name is required.');
      return;
    }

    const parsedFee = Number.parseFloat(editForm.fee);
    const nextFee = Number.isFinite(parsedFee) ? parsedFee : 0;
    const updatedMember: MemberDetail = {
      ...data,
      name: editForm.name.trim(),
      email: editForm.email.trim() || undefined,
      phone: editForm.phone.trim() || undefined,
      date_of_birth: editForm.date_of_birth || undefined,
      belt_level: editForm.belt_level,
      beltLevel: editForm.belt_level,
      payment_type: editForm.payment_type,
      paymentType: editForm.payment_type,
      fee: nextFee,
      monthlyFee: nextFee,
      status: editForm.status,
      iban: editForm.iban.trim() || undefined,
      nif: editForm.nif.trim() || undefined,
    };

    setIsSaving(true);
    try {
      await onUpdate(updatedMember);
      setData(updatedMember);
      setEditForm(createEditForm(updatedMember));
      setIsEditing(false);
    } catch (error) {
      console.error('Erro saving member profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDay = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const calculateGraduationStats = () => {
    const createdDate = data.created_at ? new Date(data.created_at) : new Date();
    const today = new Date();
    
    // Define date ranges
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(today.getDate() - 90);

    const fromDate = reportFromDate ? new Date(reportFromDate) : createdDate;
    const toDate = reportToDate ? new Date(reportToDate) : today;

    const isDateInRange = (dateKey: string, start: Date, end: Date): boolean => {
      const [year, month, day] = dateKey.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      // Set both to start of day for comparison
      const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      return date >= startDay && date <= endDay;
    };

    let totalAttendance = 0;
    let last30DaysAttendance = 0;
    let last90DaysAttendance = 0;
    let customRangeAttendance = 0;

    let totalDaysSinceJoining = 0;
    let customRangeDays = 0;

    Object.entries(attendanceMap).forEach(([dateKey, attended]) => {
      if (attended !== true) return;

      totalAttendance++;

      if (isDateInRange(dateKey, thirtyDaysAgo, today)) {
        last30DaysAttendance++;
      }

      if (isDateInRange(dateKey, ninetyDaysAgo, today)) {
        last90DaysAttendance++;
      }

      if (isDateInRange(dateKey, fromDate, toDate)) {
        customRangeAttendance++;
      }
    });

    // Calculate total days since joining
    totalDaysSinceJoining = Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Calculate custom range days
    customRangeDays = Math.floor((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const totalPercentage = totalDaysSinceJoining > 0 ? Math.round((totalAttendance / totalDaysSinceJoining) * 100) : 0;
    const customRangePercentage = customRangeDays > 0 ? Math.round((customRangeAttendance / customRangeDays) * 100) : 0;

    return {
      totalAttendance,
      last30DaysAttendance,
      last90DaysAttendance,
      totalDaysSinceJoining,
      totalPercentage,
      customRangeAttendance,
      customRangePercentage,
      customRangeDays,
      createdDate,
    };
  };

  const profileName = isEditing ? editForm.name : data.name;
  const editBeltOptions = getBeltOptions(editForm.date_of_birth, editForm.belt_level);
  const profileInitials = profileName.trim()
    ? profileName.split(' ').filter(Boolean).map((namePart) => namePart[0]).join('').toUpperCase()
    : '?';

  const inputCls = "w-full px-0 py-1.5 bg-transparent border-0 border-b border-[#2a2a2a] text-[#f0f0f0] text-sm focus:outline-none focus:border-[#c81d25] transition-colors";
  const selectCls = inputCls + " cursor-pointer";

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white p-6" style={{ fontFamily: '"Barlow", sans-serif' }}>
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full border-[3px] border-[#c81d25] border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-[#555]">A carregar member data...</p>
          </div>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto">

          {/* Top bar: Voltar + Editar/Guardar/Cancelar */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#252525] bg-[#141414] text-sm font-semibold text-[#888] hover:text-[#ccc] hover:border-[#444] transition-colors cursor-pointer"
            >
              ← Voltar
            </button>
            {isEditing ? (
              <div className="flex gap-2">
                <button
                  onClick={handleEditCancel}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl border border-[#252525] bg-[#141414] text-[#888] text-xs font-bold uppercase tracking-widest hover:text-[#ccc] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-[#c81d25] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#a81520] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isSaving ? 'Saving...' : 'Guardar'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 rounded-xl border border-[#c81d25] text-[#c81d25] text-xs font-bold uppercase tracking-widest hover:bg-[#c81d25] hover:text-white transition-colors cursor-pointer"
              >
                Editar Membro
              </button>
            )}
          </div>

          {/* Summary Card */}
          <div className="rounded-2xl border border-[#222] bg-[#121212] p-6 mb-6">
            <div className="flex items-start gap-5">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-full bg-[#1a1a1a] border-2 border-[#c81d25] flex items-center justify-center text-xl font-black text-[#c81d25] shrink-0">
                {profileInitials}
              </div>
              <div className="flex-1 min-w-0">
                {/* Nome + badges */}
                <div className="mb-5">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => handleEditFieldChange('name', e.target.value)}
                      className={inputCls + " text-2xl font-black uppercase tracking-widest"}
                      style={{ fontFamily: '"Barlow Condensed", sans-serif' }}
                    />
                  ) : (
                    <h1 className="text-3xl font-black uppercase tracking-widest mb-2" style={{ fontFamily: '"Barlow Condensed", sans-serif' }}>
                      {data.name}
                    </h1>
                  )}
                  {!isEditing && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="rounded-full px-3 py-0.5 text-[11px] font-bold border border-[#c81d25]/40 bg-[rgba(200,29,37,0.15)] text-[#ef4444]">
                        {data.beltLevel || data.belt_level || 'Não Cinto'}
                      </span>
                      <span className={`rounded-full px-3 py-0.5 text-[11px] font-bold border ${statusBadgeClass(data.status)}`}>
                        {data.status}
                      </span>
                    </div>
                  )}
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-[#555] mb-1">Email</div>
                    {isEditing ? (
                      <input type="email" value={editForm.email} onChange={(e) => handleEditFieldChange('email', e.target.value)} className={inputCls} />
                    ) : (
                      <div className="text-sm text-[#f0f0f0] break-words">{data.email || 'N/A'}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-[#555] mb-1">Telemóvel</div>
                    {isEditing ? (
                      <input type="tel" value={editForm.phone} onChange={(e) => handleEditFieldChange('phone', e.target.value)} className={inputCls} />
                    ) : (
                      <div className="text-sm text-[#f0f0f0]">{data.phone || 'N/A'}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-[#555] mb-1">Data of Birth</div>
                    {isEditing ? (
                      <input type="date" value={editForm.date_of_birth} onChange={(e) => handleEditDateOfBirthChange(e.target.value)} className={inputCls} />
                    ) : (
                      <div className="text-sm text-[#f0f0f0]">{data.date_of_birth || 'N/A'}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-[#555] mb-1">Cinto Level</div>
                    {isEditing ? (
                      <select value={editForm.belt_level} onChange={(e) => handleEditFieldChange('belt_level', e.target.value)} className={selectCls}>
                        {editBeltOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <div className="text-sm text-[#f0f0f0]">{data.beltLevel || data.belt_level || 'N/A'}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-[#555] mb-1">Estado</div>
                    {isEditing ? (
                      <select value={editForm.status} onChange={(e) => handleEditFieldChange('status', e.target.value as MemberEditForm['status'])} className={selectCls}>
                        <option>Ativo</option>
                        <option>Paused</option>
                        <option>Por Pagar</option>
                      </select>
                    ) : (
                      <div className="text-sm text-[#f0f0f0]">{data.status}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-[#555] mb-1">Tipo de Pagamento</div>
                    {isEditing ? (
                      <select value={editForm.payment_type} onChange={(e) => handleEditPaymentTypeChange(e.target.value as MemberEditForm['payment_type'])} className={selectCls}>
                        <option>Débito Direto</option>
                        <option>Dinheiro</option>
                      </select>
                    ) : (
                      <div className="text-sm text-[#f0f0f0]">{data.paymentType || data.payment_type || 'N/A'}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-[#555] mb-1">Taxa Mensal</div>
                    {isEditing ? (
                      <input type="number" step="0.01" value={editForm.fee} onChange={(e) => handleEditFieldChange('fee', e.target.value)} className={inputCls} />
                    ) : (
                      <div className="text-sm text-[#f0f0f0]">€{(data.monthlyFee ?? data.fee ?? 0).toFixed(2)}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-[#555] mb-1">IBAN</div>
                    {isEditing ? (
                      <input type="text" value={editForm.iban} onChange={(e) => handleEditFieldChange('iban', e.target.value)} className={inputCls} />
                    ) : (
                      <div className="text-sm text-[#f0f0f0]">{data.iban || 'N/A'}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-[#555] mb-1">NIF</div>
                    {isEditing ? (
                      <input type="text" value={editForm.nif} onChange={(e) => handleEditFieldChange('nif', e.target.value)} className={inputCls} />
                    ) : (
                      <div className="text-sm text-[#f0f0f0]">{data.nif || 'N/A'}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pendente notice (no blur) */}
          {isPendingMember && (
            <div className="mb-4 rounded-xl border border-[#c81d25]/20 bg-[#c81d25]/5 px-4 py-3 text-sm text-[#888] text-center">
              This member&apos;s registration is pendente approval.
            </div>
          )}

          {/* Month selector + Days/% toggle */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex gap-2 overflow-x-auto flex-1 pb-1" style={{ scrollbarWidth: 'none' }}>
              {months.map((m) => {
                const percent = getMonthAttendance(year, m);
                const { attended, total } = getMonthAttendanceCount(year, m);
                const displayValue = showPercentage ? `${percent}%` : `${attended}/${total}`;
                const monthName = new Date(year, m).toLocaleString("default", { month: "short" });
                const ativo = selectedMonth === m;
                return (
                  <button
                    key={m}
                    onClick={() => setSelectedMonth(m)}
                    title={`${percent}% attendance`}
                    className={`relative flex flex-col items-center justify-center w-16 h-16 rounded-xl border shrink-0 text-xs font-bold transition-colors overflow-hidden cursor-pointer ${
                      ativo
                        ? 'bg-[#c81d25] border-[#c81d25] text-white'
                        : 'bg-[#141414] border-[#252525] text-[#888] hover:bg-[#1a1a1a] hover:text-[#aaa]'
                    }`}
                  >
                    {!ativo && (
                      <div className="absolute bottom-0 left-0 h-[2px] bg-[#c81d25]" style={{ width: `${percent}%` }} />
                    )}
                    <span>{monthName}</span>
                    <span className="text-[10px] mt-0.5 font-normal opacity-75">{displayValue}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-[#666]">Days</span>
              <button
                onClick={() => setShowPercentage(!showPercentage)}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer border-0"
                style={{ background: showPercentage ? '#c81d25' : '#333' }}
              >
                <span
                  className="inline-block h-4 w-4 rounded-full bg-white transition-transform"
                  style={{ transform: showPercentage ? 'translateX(24px)' : 'translateX(4px)' }}
                />
              </button>
              <span className="text-xs text-[#666]">%</span>
            </div>
          </div>

          {/* Two-column: Calendar + Notas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Calendar card */}
            <div className="rounded-2xl border border-[#222] bg-[#121212] p-5 relative">
              <h2 className="text-sm font-black uppercase tracking-widest text-[#f0f0f0] mb-4" style={{ fontFamily: '"Barlow Condensed", sans-serif' }}>
                {new Date(year, selectedMonth).toLocaleString("default", { month: "long", year: 'numeric' })}
              </h2>
              <div className="grid grid-cols-7 gap-1 relative">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
                  <div key={d} className="text-[10px] font-bold text-[#444] text-center py-1 uppercase">{d}</div>
                ))}
                {Array.from({ length: getFirstDay(year, selectedMonth) }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: getDaysInMonth(year, selectedMonth) }, (_, d) => {
                  const day = d + 1;
                  const dateStr = `${year}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const attended = attendanceMap[dateStr];
                  const dayBehavior = behaviorMap[dateStr];
                  const isToday = dateStr === new Date().toISOString().split('T')[0];

                  // Determine square color based on behavior (for kids) or attendance (for adults)
                  let squareClass = '';
                  let shouldShowEmoji = false;

                  if (isKid && dayBehavior) {
                    shouldShowEmoji = true;
                    if (dayBehavior === 'GOOD') {
                      squareClass = 'bg-green-600/40 border-green-500 text-green-400';
                    } else if (dayBehavior === 'BAD') {
                      squareClass = 'bg-red-600/40 border-red-500 text-red-400';
                    } else {
                      squareClass = 'bg-zinc-600/40 border-zinc-500 text-zinc-400';
                    }
                  } else if (isKid && attended) {
                    shouldShowEmoji = true;
                    squareClass = 'bg-zinc-600/40 border-zinc-500 text-zinc-400';
                  } else if (!isKid && attended) {
                    squareClass = 'bg-white/20 border-white/40 text-white';
                  } else if (isToday) {
                    squareClass = 'bg-[#141414] border-[#c81d25]/50 text-[#888] hover:bg-[#1e1e1e]';
                  } else {
                    squareClass = 'bg-[#141414] border-[#1e1e1e] text-[#555] hover:bg-[#1a1a1a] hover:text-[#888]';
                  }

                  return (
                    <div key={dateStr} className="relative">
                      <button
                        onClick={() => handleCalendarDayClick(dateStr)}
                        onMouseEnter={() => {
                          if (isKid && attended) {
                            setEmojiPickerDate(dateStr);
                          }
                        }}
                        className={`relative flex items-center justify-center w-full aspect-square rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${squareClass}`}
                      >
                        {day}
                        {shouldShowEmoji && dayBehavior && (
                          <span className="absolute right-0.5 bottom-0.5 text-[14px] leading-none">
                            {BEHAVIOR_EMOJIS[dayBehavior]}
                          </span>
                        )}
                      </button>

                      {/* Emoji Picker Popup */}
                      {isKid && emojiPickerDate === dateStr && (
                        <div
                          ref={emojiPickerRef}
                          className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 z-50 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-2 flex gap-1 shadow-lg"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {(['GOOD', 'NEUTRAL', 'BAD'] as const).map((behavior) => (
                            <button
                              key={behavior}
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleBehaviorSelect(dateStr, behavior, e);
                              }}
                              className="w-8 h-8 rounded text-lg hover:bg-[#2a2a2a] transition-colors flex items-center justify-center cursor-pointer"
                              title={behavior}
                              type="button"
                            >
                              {BEHAVIOR_EMOJIS[behavior]}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {Array.from({ length: Math.max(0, 42 - getFirstDay(year, selectedMonth) - getDaysInMonth(year, selectedMonth)) }).map((_, i) => (
                  <div key={`fill-${i}`} />
                ))}
              </div>
            </div>

            {/* Notas card */}
            <div className="rounded-2xl border border-[#222] bg-[#121212] p-5 flex flex-col" style={{ minHeight: '400px' }}>
              <h3 className="text-sm font-black uppercase tracking-widest text-[#f0f0f0] mb-4 shrink-0" style={{ fontFamily: '"Barlow Condensed", sans-serif' }}>
                Notas &amp; Comments
              </h3>
              <div className="flex-1 overflow-y-auto mb-4" style={{ maxHeight: '320px' }}>
                {comments.length === 0 ? (
                  <p className="text-[#555] text-sm text-center pt-8">Não comments yet. Adicionar the first note!</p>
                ) : (
                  <div className="space-y-4">
                    {[...comments].reverse().map((comment) => (
                      <div key={comment.id} className="border-l-2 border-[#2a2a2a] pl-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-[#1a1a1a] border border-[#2a2a2a] text-[#888]">
                            {comment.teacherName}
                          </span>
                          <span className="text-[11px] text-[#444]">
                            {comment.timestamp.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <p className="text-sm text-[#ccc] leading-relaxed">{comment.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendComment()}
                  placeholder="Adicionar a note or comment..."
                  className="flex-1 px-3 py-2 rounded-xl border border-[#2a2a2a] bg-[#161616] text-sm text-[#f0f0f0] placeholder-[#444] focus:outline-none focus:border-[#c81d25]/50 transition-colors"
                  style={{ fontFamily: '"Barlow", sans-serif' }}
                />
                <button
                  onClick={handleSendComment}
                  disabled={!newComment.trim()}
                  className="px-4 py-2 rounded-xl bg-[#c81d25] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#a81520] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>

          {/* Graduation Report Section */}
          <div className="rounded-2xl border border-[#222] bg-[#121212] p-5 mt-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-[#f0f0f0] mb-5" style={{ fontFamily: '"Barlow Condensed", sans-serif' }}>
              Graduation Report
            </h3>

            {/* Data Range Filter */}
            <div className="mb-6 p-4 rounded-xl border border-[#252525] bg-[#141414]">
              <div className="mb-3">
                <label className="text-[9px] font-bold uppercase tracking-widest text-[#555] block mb-2">Custom Data Range (Optional)</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <input
                      type="date"
                      value={reportFromDate}
                      onChange={(e) => setReportFromDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] text-sm text-[#f0f0f0] focus:outline-none focus:border-[#c81d25]/50 transition-colors"
                      placeholder="From date"
                    />
                    <div className="text-[9px] text-[#555] mt-1">From</div>
                  </div>
                  <div className="flex-1">
                    <input
                      type="date"
                      value={reportToDate}
                      onChange={(e) => setReportToDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] text-sm text-[#f0f0f0] focus:outline-none focus:border-[#c81d25]/50 transition-colors"
                      placeholder="To date"
                    />
                    <div className="text-[9px] text-[#555] mt-1">To</div>
                  </div>
                  <button
                    onClick={() => {
                      setReportFromDate('');
                      setReportToDate('');
                    }}
                    className="px-4 py-2 rounded-lg border border-[#2a2a2a] bg-transparent text-xs font-bold uppercase tracking-widest text-[#666] hover:text-[#999] hover:border-[#3a3a3a] transition-colors cursor-pointer h-10 self-center sm:self-end"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* Statistics Grid */}
            {(() => {
              const stats = calculateGraduationStats();
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total attendance */}
                  <div className="rounded-xl border border-[#252525] bg-[#0a0a0a] p-4">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-[#555] mb-3">Total Presenças</div>
                    <div className="text-3xl font-black text-[#f0f0f0] mb-1">
                      {stats.totalAttendance}
                    </div>
                    <div className="text-[11px] text-[#888]">
                      since {stats.createdDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </div>
                  </div>

                  {/* 30 days attendance */}
                  <div className="rounded-xl border border-[#252525] bg-[#0a0a0a] p-4">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-[#555] mb-3">Last 30 Days</div>
                    <div className="text-3xl font-black text-[#f0f0f0] mb-1">
                      {stats.last30DaysAttendance}
                    </div>
                    <div className="text-[11px] text-[#888]">days attended</div>
                  </div>

                  {/* 90 days attendance */}
                  <div className="rounded-xl border border-[#252525] bg-[#0a0a0a] p-4">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-[#555] mb-3">Last 90 Days</div>
                    <div className="text-3xl font-black text-[#f0f0f0] mb-1">
                      {stats.last90DaysAttendance}
                    </div>
                    <div className="text-[11px] text-[#888]">days attended</div>
                  </div>

                  {/* Presenças percentage */}
                  <div className="rounded-xl border border-[#252525] bg-[#0a0a0a] p-4">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-[#555] mb-3">Total Percentage</div>
                    <div className="flex items-baseline gap-2">
                      <div className="text-3xl font-black text-[#c81d25]">
                        {stats.totalPercentage}%
                      </div>
                    </div>
                    <div className="text-[11px] text-[#888]">
                      {stats.totalAttendance} of {stats.totalDaysSinceJoining} days
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Custom Range Stats */}
            {(reportFromDate || reportToDate) && (() => {
              const stats = calculateGraduationStats();
              const fromDisplay = reportFromDate ? new Date(reportFromDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '—';
              const toDisplay = reportToDate ? new Date(reportToDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '—';
              return (
                <div className="mt-6 p-4 rounded-xl border border-[#c81d25]/20 bg-[#c81d25]/5">
                  <div className="text-[9px] font-bold uppercase tracking-widest text-[#c81d25] mb-3">Custom Range Results ({fromDisplay} to {toDisplay})</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <div className="text-2xl font-black text-[#f0f0f0]">{stats.customRangeAttendance}</div>
                      <div className="text-[10px] text-[#888]">days attended</div>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-[#f0f0f0]">{stats.customRangeDays}</div>
                      <div className="text-[10px] text-[#888]">total days</div>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-[#c81d25]">{stats.customRangePercentage}%</div>
                      <div className="text-[10px] text-[#888]">percentage</div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

        </div>
      )}
    </div>
  );
}

