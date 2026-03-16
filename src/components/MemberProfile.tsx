"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Member, calculateMonthlyFee, getBeltOptions } from "../../lib/types";
import { getAttendanceForMember, getNotesForMember, createNote, setAttendance } from "../../lib/database";

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
  payment_type: 'Direct Debit' | 'Cash';
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

type MoodOption = "happy" | "neutral" | "sad";

const MOOD_ICONS: Record<MoodOption, string> = {
  happy: "😊",
  neutral: "😐",
  sad: "☹️",
};

// Because Member is defined in TeacherDashboard, we can re-declare necessary parts here to avoid circular import.
interface MemberDetail extends Member {
  beltLevel?: string;
  paymentType?: 'Direct Debit' | 'Cash';
  monthlyFee?: number;
  familyDiscount?: boolean;
  attendance?: { [date: string]: boolean };
  attendance_mood?: { [date: string]: MoodOption };
}

const createEditForm = (member: MemberDetail): MemberEditForm => ({
  name: member.name || '',
  email: member.email || '',
  phone: member.phone || '',
  date_of_birth: member.date_of_birth || '',
  belt_level: member.beltLevel || member.belt_level || 'White Belt',
  payment_type: (member.paymentType || member.payment_type || 'Direct Debit') as 'Direct Debit' | 'Cash',
  fee: String(member.monthlyFee ?? member.fee ?? 0),
  status: member.status,
  iban: member.iban || '',
  nif: member.nif || '',
});

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'Active': return 'border-green-800 bg-green-900/30 text-green-400';
    case 'Paused': return 'border-[#444] bg-[#1e1e1e] text-[#888]';
    case 'Unpaid': return 'border-red-800 bg-red-900/20 text-red-400';
    default: return 'border-[#444] bg-[#1e1e1e] text-[#888]';
  }
}

export default function MemberProfile({ member, onBack, onUpdate }: MemberProfileProps) {
  const [data, setData] = useState<MemberDetail>({ ...member });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState<MemberEditForm>(() => createEditForm(member));
  const [attendanceMap, setAttendanceMap] = useState<{ [date: string]: boolean }>({});
  const [attendanceMoodMap, setAttendanceMoodMap] = useState<{ [date: string]: MoodOption }>({});
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [showPercentage, setShowPercentage] = useState<boolean>(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const isPendingMember = (data.status as unknown as string) === 'pending';
  void commentsEndRef;

  useEffect(() => {
    const nextData = { ...member };
    setData(nextData);
    setEditForm(createEditForm(nextData));
    setAttendanceMoodMap(nextData.attendance_mood || {});
    setIsEditing(false);
  }, [member]);

  const loadMemberData = useCallback(async () => {
    try {
      setLoading(true);

      // Load attendance
      const attendanceData = await getAttendanceForMember(member.id);
      const attendanceMapLocal: { [date: string]: boolean } = {};
      const moodMapLocal: { [date: string]: MoodOption } = {};
      attendanceData.forEach(att => {
        attendanceMapLocal[att.date] = att.attended;
        const mood = (att as any).mood as MoodOption | undefined;
        if (mood) {
          moodMapLocal[att.date] = mood;
        }
      });
      setAttendanceMap(attendanceMapLocal);
      setAttendanceMoodMap((prev) => ({ ...prev, ...moodMapLocal }));

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
      console.error('Error loading member data:', error);
    } finally {
      setLoading(false);
    }
  }, [member.id]);

  useEffect(() => {
    loadMemberData();
  }, [loadMemberData]);



  // Auto-scroll to bottom when new comments are added
  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  const toggleDate = async (date: string) => {
    const currentAttended = attendanceMap[date] || false;
    const newAttended = !currentAttended;

    try {
      await setAttendance(member.id, date, newAttended);
      setAttendanceMap(prev => ({
        ...prev,
        [date]: newAttended
      }));

      const updated = { ...data, attendance: { ...attendanceMap, [date]: newAttended } };
      setData(updated);
    } catch (error) {
      console.error('Error updating attendance:', error);
    }
  };

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
        teacher_name: "Coach Silva", // In a real app, this would come from auth
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
      console.error('Error creating note:', error);
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
      console.error('Member profile save blocked: name is required.');
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
      console.error('Error saving member profile:', error);
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
            <p className="text-[#555]">Loading member data...</p>
          </div>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto">

          {/* Top bar: Back + Edit/Save/Cancel */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#252525] bg-[#141414] text-sm font-semibold text-[#888] hover:text-[#ccc] hover:border-[#444] transition-colors cursor-pointer"
            >
              ← Back
            </button>
            {isEditing ? (
              <div className="flex gap-2">
                <button
                  onClick={handleEditCancel}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl border border-[#252525] bg-[#141414] text-[#888] text-xs font-bold uppercase tracking-widest hover:text-[#ccc] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-[#c81d25] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#a81520] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 rounded-xl border border-[#c81d25] text-[#c81d25] text-xs font-bold uppercase tracking-widest hover:bg-[#c81d25] hover:text-white transition-colors cursor-pointer"
              >
                Edit Member
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
                {/* Name + badges */}
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
                        {data.beltLevel || data.belt_level || 'No Belt'}
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
                    <div className="text-[9px] font-bold uppercase tracking-widest text-[#555] mb-1">Phone</div>
                    {isEditing ? (
                      <input type="tel" value={editForm.phone} onChange={(e) => handleEditFieldChange('phone', e.target.value)} className={inputCls} />
                    ) : (
                      <div className="text-sm text-[#f0f0f0]">{data.phone || 'N/A'}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-[#555] mb-1">Date of Birth</div>
                    {isEditing ? (
                      <input type="date" value={editForm.date_of_birth} onChange={(e) => handleEditDateOfBirthChange(e.target.value)} className={inputCls} />
                    ) : (
                      <div className="text-sm text-[#f0f0f0]">{data.date_of_birth || 'N/A'}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-[#555] mb-1">Belt Level</div>
                    {isEditing ? (
                      <select value={editForm.belt_level} onChange={(e) => handleEditFieldChange('belt_level', e.target.value)} className={selectCls}>
                        {editBeltOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <div className="text-sm text-[#f0f0f0]">{data.beltLevel || data.belt_level || 'N/A'}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-[#555] mb-1">Status</div>
                    {isEditing ? (
                      <select value={editForm.status} onChange={(e) => handleEditFieldChange('status', e.target.value as MemberEditForm['status'])} className={selectCls}>
                        <option>Active</option>
                        <option>Paused</option>
                        <option>Unpaid</option>
                      </select>
                    ) : (
                      <div className="text-sm text-[#f0f0f0]">{data.status}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-[#555] mb-1">Payment Type</div>
                    {isEditing ? (
                      <select value={editForm.payment_type} onChange={(e) => handleEditPaymentTypeChange(e.target.value as MemberEditForm['payment_type'])} className={selectCls}>
                        <option>Direct Debit</option>
                        <option>Cash</option>
                      </select>
                    ) : (
                      <div className="text-sm text-[#f0f0f0]">{data.paymentType || data.payment_type || 'N/A'}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-[#555] mb-1">Monthly Fee</div>
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

          {/* Pending notice (no blur) */}
          {isPendingMember && (
            <div className="mb-4 rounded-xl border border-[#c81d25]/20 bg-[#c81d25]/5 px-4 py-3 text-sm text-[#888] text-center">
              This member&apos;s registration is pending approval.
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
                const active = selectedMonth === m;
                return (
                  <button
                    key={m}
                    onClick={() => setSelectedMonth(m)}
                    title={`${percent}% attendance`}
                    className={`relative flex flex-col items-center justify-center w-16 h-16 rounded-xl border shrink-0 text-xs font-bold transition-colors overflow-hidden cursor-pointer ${
                      active
                        ? 'bg-[#c81d25] border-[#c81d25] text-white'
                        : 'bg-[#141414] border-[#252525] text-[#888] hover:bg-[#1a1a1a] hover:text-[#aaa]'
                    }`}
                  >
                    {!active && (
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

          {/* Two-column: Calendar + Notes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Calendar card */}
            <div className="rounded-2xl border border-[#222] bg-[#121212] p-5">
              <h2 className="text-sm font-black uppercase tracking-widest text-[#f0f0f0] mb-4" style={{ fontFamily: '"Barlow Condensed", sans-serif' }}>
                {new Date(year, selectedMonth).toLocaleString("default", { month: "long", year: 'numeric' })}
              </h2>
              <div className="grid grid-cols-7 gap-1">
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
                  const dayMood = attendanceMoodMap[dateStr];
                  const isToday = dateStr === new Date().toISOString().split('T')[0];
                  return (
                    <button
                      key={dateStr}
                      onClick={() => toggleDate(dateStr)}
                      className={`relative flex items-center justify-center w-full aspect-square rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${
                        attended
                          ? 'bg-[#c81d25] text-white border-[#c81d25]'
                          : isToday
                          ? 'bg-[#141414] border-[#c81d25]/50 text-[#888] hover:bg-[#1e1e1e]'
                          : 'bg-[#141414] border-[#1e1e1e] text-[#555] hover:bg-[#1a1a1a] hover:text-[#888]'
                      }`}
                    >
                      {day}
                      {dayMood && (
                        <span className="absolute right-0.5 bottom-0.5 text-[9px] leading-none">
                          {MOOD_ICONS[dayMood]}
                        </span>
                      )}
                    </button>
                  );
                })}
                {Array.from({ length: Math.max(0, 42 - getFirstDay(year, selectedMonth) - getDaysInMonth(year, selectedMonth)) }).map((_, i) => (
                  <div key={`fill-${i}`} />
                ))}
              </div>
            </div>

            {/* Notes card */}
            <div className="rounded-2xl border border-[#222] bg-[#121212] p-5 flex flex-col" style={{ minHeight: '400px' }}>
              <h3 className="text-sm font-black uppercase tracking-widest text-[#f0f0f0] mb-4 shrink-0" style={{ fontFamily: '"Barlow Condensed", sans-serif' }}>
                Notes &amp; Comments
              </h3>
              <div className="flex-1 overflow-y-auto mb-4" style={{ maxHeight: '320px' }}>
                {comments.length === 0 ? (
                  <p className="text-[#555] text-sm text-center pt-8">No comments yet. Add the first note!</p>
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
                  placeholder="Add a note or comment..."
                  className="flex-1 px-3 py-2 rounded-xl border border-[#2a2a2a] bg-[#161616] text-sm text-[#f0f0f0] placeholder-[#444] focus:outline-none focus:border-[#c81d25]/50 transition-colors"
                  style={{ fontFamily: '"Barlow", sans-serif' }}
                />
                <button
                  onClick={handleSendComment}
                  disabled={!newComment.trim()}
                  className="px-4 py-2 rounded-xl bg-[#c81d25] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#a81520] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
