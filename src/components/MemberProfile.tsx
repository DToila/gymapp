"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Member } from "../../lib/types";
import { getAttendanceForMember, getNotesForMember, createNote, setAttendance } from "../../lib/database";

interface Comment {
  id: string;
  teacherName: string;
  timestamp: Date;
  message: string;
}

interface MemberProfileProps {
  member: MemberDetail;
  onBack: () => void;
  onUpdate: (updatedMember: MemberDetail) => void;
}

// Because Member is defined in TeacherDashboard, we can re-declare necessary parts here to avoid circular import.
interface MemberDetail extends Member {}

export default function MemberProfile({ member, onBack, onUpdate }: MemberProfileProps) {
  const [data, setData] = useState<MemberDetail>({ ...member });
  const [attendanceMap, setAttendanceMap] = useState<{ [date: string]: boolean }>({});
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [showPercentage, setShowPercentage] = useState<boolean>(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setData({ ...member });
  }, [member]);

  const loadMemberData = useCallback(async () => {
    try {
      setLoading(true);

      // Load attendance
      const attendanceData = await getAttendanceForMember(member.id);
      const attendanceMapLocal: { [date: string]: boolean } = {};
      attendanceData.forEach(att => {
        attendanceMapLocal[att.date] = att.attended;
      });
      setAttendanceMap(attendanceMapLocal);

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

      // Update the member data for the parent component
      const updated = { ...data, attendance: { ...attendanceMap, [date]: newAttended } };
      setData(updated);
      onUpdate(updated);
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

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDay = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
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
              {data.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '28px', fontWeight: 900, fontFamily: '"Barlow Condensed", sans-serif', marginBottom: '12px', letterSpacing: '2px', textTransform: 'uppercase' }}>{data.name}</h1>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px', color: '#888888' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🥋</span>
                  <span>{(data as any).beltLevel || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📌</span>
                  <span>{data.status}</span>
                </div>
                {data.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📞</span>
                    <span>{data.phone}</span>
                  </div>
                )}
                {data.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>✉️</span>
                    <span>{data.email}</span>
                  </div>
                )}
                {(data as any).paymentType && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>💳</span>
                    <span>{(data as any).paymentType}</span>
                  </div>
                )}
                {(data as any).monthlyFee !== undefined && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>💲</span>
                    <span>€{(data as any).monthlyFee.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

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
                    const isToday = dateStr === new Date().toISOString().split('T')[0];
                    return (
                      <button
                        key={dateStr}
                        onClick={() => toggleDate(dateStr)}
                        style={{
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
