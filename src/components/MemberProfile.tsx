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
  const profileFieldStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 0 8px',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid #2a2a2a',
    color: '#f0f0f0',
    fontSize: '14px',
    fontFamily: '"Barlow", sans-serif'
  };
  const profileLabelStyle: React.CSSProperties = {
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '2px',
    textTransform: 'uppercase',
    color: '#555555',
    marginBottom: '6px'
  };
  const profileValueStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#f0f0f0',
    wordBreak: 'break-word'
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f0f0f0', fontFamily: '"Barlow", sans-serif', padding: '24px' }}>
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '3px solid #CC0000', borderTop: '3px solid transparent', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }}></div>
            <p style={{ color: '#555555' }}>Loading member data...</p>
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <button
            onClick={onBack}
            style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#888', fontSize: '14px', fontWeight: 600, marginBottom: '24px', cursor: 'pointer', paddingBottom: '12px', padding: '8px 12px', borderRadius: '4px' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#444';
              e.currentTarget.style.color = '#aaa';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#2a2a2a';
              e.currentTarget.style.color = '#888';
            }}
          >
            ← Back
          </button>

          {/* Profile Header Card */}
          <div style={{ background: '#111111', border: '1px solid #2a2a2a', padding: '24px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#222222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 900, color: '#CC0000', flexShrink: 0, border: '2px solid #CC0000' }}>
              {profileInitials}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => handleEditFieldChange('name', e.target.value)}
                      style={{
                        ...profileFieldStyle,
                        fontSize: '24px',
                        fontWeight: 900,
                        fontFamily: '"Barlow Condensed", sans-serif',
                        letterSpacing: '2px',
                        textTransform: 'uppercase',
                        padding: '4px 0 8px'
                      }}
                    />
                  ) : (
                    <h1 style={{ fontSize: '28px', fontWeight: 900, fontFamily: '"Barlow Condensed", sans-serif', marginBottom: 0, letterSpacing: '2px', textTransform: 'uppercase' }}>{data.name}</h1>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleEditCancel}
                        disabled={isSaving}
                        style={{
                          padding: '8px 12px',
                          background: 'transparent',
                          border: '1px solid #2a2a2a',
                          color: '#888888',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: isSaving ? 'not-allowed' : 'pointer',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          opacity: isSaving ? 0.6 : 1
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleEditSave}
                        disabled={isSaving}
                        style={{
                          padding: '8px 14px',
                          background: '#CC0000',
                          border: '1px solid #CC0000',
                          color: '#ffffff',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: isSaving ? 'not-allowed' : 'pointer',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          opacity: isSaving ? 0.7 : 1
                        }}
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      style={{
                        padding: '8px 14px',
                        background: 'transparent',
                        border: '1px solid #CC0000',
                        color: '#CC0000',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                      }}
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', columnGap: '36px', rowGap: '24px' }}>
                <div>
                  <div style={profileLabelStyle}>Email</div>
                  {isEditing ? (
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => handleEditFieldChange('email', e.target.value)}
                      style={profileFieldStyle}
                    />
                  ) : (
                    <div style={profileValueStyle}>{data.email || 'N/A'}</div>
                  )}
                </div>
                <div>
                  <div style={profileLabelStyle}>Phone</div>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => handleEditFieldChange('phone', e.target.value)}
                      style={profileFieldStyle}
                    />
                  ) : (
                    <div style={profileValueStyle}>{data.phone || 'N/A'}</div>
                  )}
                </div>
                <div>
                  <div style={profileLabelStyle}>Date of Birth</div>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editForm.date_of_birth}
                      onChange={(e) => handleEditDateOfBirthChange(e.target.value)}
                      style={profileFieldStyle}
                    />
                  ) : (
                    <div style={profileValueStyle}>{data.date_of_birth || 'N/A'}</div>
                  )}
                </div>
                <div>
                  <div style={profileLabelStyle}>Belt Level</div>
                  {isEditing ? (
                    <select
                      value={editForm.belt_level}
                      onChange={(e) => handleEditFieldChange('belt_level', e.target.value)}
                      style={profileFieldStyle}
                    >
                      {editBeltOptions.map((beltOption) => (
                        <option key={beltOption} value={beltOption}>{beltOption}</option>
                      ))}
                    </select>
                  ) : (
                    <div style={profileValueStyle}>{data.beltLevel || data.belt_level || 'N/A'}</div>
                  )}
                </div>
                <div>
                  <div style={profileLabelStyle}>Status</div>
                  {isEditing ? (
                    <select
                      value={editForm.status}
                      onChange={(e) => handleEditFieldChange('status', e.target.value as MemberEditForm['status'])}
                      style={profileFieldStyle}
                    >
                      <option>Active</option>
                      <option>Paused</option>
                      <option>Unpaid</option>
                    </select>
                  ) : (
                    <div style={profileValueStyle}>{data.status}</div>
                  )}
                </div>
                <div>
                  <div style={profileLabelStyle}>Payment Type</div>
                  {isEditing ? (
                    <select
                      value={editForm.payment_type}
                      onChange={(e) => handleEditPaymentTypeChange(e.target.value as MemberEditForm['payment_type'])}
                      style={profileFieldStyle}
                    >
                      <option>Direct Debit</option>
                      <option>Cash</option>
                    </select>
                  ) : (
                    <div style={profileValueStyle}>{data.paymentType || data.payment_type || 'N/A'}</div>
                  )}
                </div>
                <div>
                  <div style={profileLabelStyle}>Monthly Fee</div>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.fee}
                      onChange={(e) => handleEditFieldChange('fee', e.target.value)}
                      style={profileFieldStyle}
                    />
                  ) : (
                    <div style={profileValueStyle}>€{(data.monthlyFee ?? data.fee ?? 0).toFixed(2)}</div>
                  )}
                </div>
                <div>
                  <div style={profileLabelStyle}>IBAN</div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.iban}
                      onChange={(e) => handleEditFieldChange('iban', e.target.value)}
                      style={profileFieldStyle}
                    />
                  ) : (
                    <div style={profileValueStyle}>{data.iban || 'N/A'}</div>
                  )}
                </div>
                <div>
                  <div style={profileLabelStyle}>NIF</div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.nif}
                      onChange={(e) => handleEditFieldChange('nif', e.target.value)}
                      style={profileFieldStyle}
                    />
                  ) : (
                    <div style={profileValueStyle}>{data.nif || 'N/A'}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            {isPendingMember && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(10, 10, 10, 0.7)',
                backdropFilter: 'blur(4px)',
                zIndex: 10,
              }} />
            )}

          {/* Month Selector with Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', gap: '20px' }}>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', flex: 1, paddingBottom: '8px' }}>
              {months.map((m) => {
                const percent = getMonthAttendance(year, m);
                const { attended, total } = getMonthAttendanceCount(year, m);
                const displayValue = showPercentage ? `${percent}%` : `${attended}/${total}`;
                return (
                  <button
                    key={m}
                    onClick={() => setSelectedMonth(m)}
                    title={`${percent}% attendance`}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '64px',
                      height: '64px',
                      background: selectedMonth === m ? '#CC0000' : '#1a1a1a',
                      color: selectedMonth === m ? 'white' : '#888888',
                      border: '1px solid #2a2a2a',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                      if (selectedMonth !== m) {
                        e.currentTarget.style.background = '#222222';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedMonth !== m) {
                        e.currentTarget.style.background = '#1a1a1a';
                      }
                    }}
                  >
                    <div style={{ position: 'absolute', bottom: 0, left: 0, height: '2px', background: '#CC0000', width: `${percent}%`, transition: 'all 0.2s' }}></div>
                    <span>{new Date(year, m).toLocaleString("default", { month: "short" })}</span>
                    <span style={{ fontSize: '10px', fontWeight: 'normal', marginTop: '4px', opacity: 0.75 }}>{displayValue}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <span style={{ fontSize: '12px', color: '#888888' }}>Days</span>
              <button
                onClick={() => setShowPercentage(!showPercentage)}
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  height: '24px',
                  width: '44px',
                  alignItems: 'center',
                  borderRadius: '12px',
                  background: showPercentage ? '#CC0000' : '#333333',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <span style={{
                  display: 'inline-block',
                  height: '16px',
                  width: '16px',
                  borderRadius: '50%',
                  background: 'white',
                  transition: 'transform 0.2s',
                  transform: showPercentage ? 'translateX(24px)' : 'translateX(4px)'
                }} />
              </button>
              <span style={{ fontSize: '12px', color: '#888888' }}>%</span>
            </div>
          </div>

          {/* Two-Column Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', height: '500px' }}>
            {/* Calendar Column */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 800, fontFamily: '"Barlow Condensed", sans-serif', marginBottom: '12px', color: '#f0f0f0', letterSpacing: '2px', textTransform: 'uppercase' }}>
                {new Date(year, selectedMonth).toLocaleString("default", { month: "long", year: 'numeric' })}
              </h2>
              <div style={{ flex: 1, background: '#111111', border: '1px solid #2a2a2a', padding: '16px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', flex: 1 }}>
                  {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
                    <div key={d} style={{ fontWeight: 700, fontSize: '11px', textAlign: 'center', color: '#555555', padding: '4px', textTransform: 'uppercase' }}>
                      {d}
                    </div>
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
                        style={{
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: attended ? '#CC0000' : '#1a1a1a',
                          border: isToday ? '2px solid #CC0000' : '1px solid #2a2a2a',
                          color: attended ? 'white' : '#555555',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          if (!attended) {
                            e.currentTarget.style.background = '#222222';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!attended) {
                            e.currentTarget.style.background = '#1a1a1a';
                          }
                        }}
                      >
                        {day}
                        {dayMood && (
                          <span style={{
                            position: 'absolute',
                            right: '4px',
                            bottom: '2px',
                            fontSize: '11px',
                            lineHeight: 1
                          }}>
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
            </div>

            {/* Comments Column */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, fontFamily: '"Barlow Condensed", sans-serif', marginBottom: '12px', color: '#f0f0f0', letterSpacing: '2px', textTransform: 'uppercase' }}>NOTES & COMMENTS</h3>
              <div style={{ flex: 1, background: '#111111', border: '1px solid #2a2a2a', padding: '16px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ height: '320px', overflowY: 'auto', marginBottom: '16px' }}>
                  {comments.length === 0 ? (
                    <p style={{ color: '#555555', textAlign: 'center', paddingTop: '32px' }}>No comments yet. Add the first note!</p>
                  ) : (
                    <div>
                      {comments.map((comment, index) => (
                        <div key={comment.id}>
                          <div>
                            <div style={{ color: '#888888', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                              {comment.timestamp.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                            <div style={{ color: '#555555', fontSize: '11px', marginBottom: '8px' }}>
                              {comment.teacherName}
                            </div>
                            <div style={{ color: '#f0f0f0', fontSize: '13px', lineHeight: '1.5', paddingLeft: '12px', borderLeft: '2px solid #2a2a2a', marginBottom: '16px' }}>
                              {comment.message}
                            </div>
                          </div>
                          {index < comments.length - 1 && (
                            <div style={{ borderBottom: '1px solid #2a2a2a', marginBottom: '16px', opacity: 0.3 }}></div>
                          )}
                        </div>
                      ))}
                      <div ref={commentsEndRef} />
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendComment()}
                    placeholder="Add a note or comment..."
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: '#1a1a1a',
                      border: '1px solid #2a2a2a',
                      color: '#f0f0f0',
                      fontSize: '13px',
                      fontFamily: '"Barlow", sans-serif'
                    }}
                  />
                  <button
                    onClick={handleSendComment}
                    disabled={!newComment.trim()}
                    style={{
                      padding: '8px 16px',
                      background: '#CC0000',
                      border: 'none',
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: newComment.trim() ? 'pointer' : 'not-allowed',
                      opacity: newComment.trim() ? 1 : 0.5,
                      textTransform: 'uppercase',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (newComment.trim()) {
                        e.currentTarget.style.background = '#990000';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (newComment.trim()) {
                        e.currentTarget.style.background = '#CC0000';
                      }
                    }}
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
