"use client";

import { useState, useEffect, useRef } from "react";
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

  useEffect(() => {
    loadMemberData();
  }, [member.id]);

  const loadMemberData = async () => {
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
  };

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
    <div className="min-h-screen bg-gradient-to-b from-dark-900 via-dark-800 to-dark-900 text-white">
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-dark-400">Loading member data...</p>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-6 py-6">
        <button
          onClick={onBack}
          className="text-primary-500 hover:text-primary-400 mb-4 inline-block"
        >
          ← Back
        </button>
        {/* profile header card */}
        <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 mb-6 flex items-center space-x-6">
          <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center text-2xl font-bold text-white">
            {data.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-1">{data.name}</h1>
            <div className="grid grid-cols-2 gap-4 text-sm text-dark-300">
              <div className="flex items-center space-x-2">
                <span>🥋</span>
                <span>{(data as any).beltLevel}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>📌</span>
                <span>{data.status}</span>
              </div>
              {data.phone && (
                <div className="flex items-center space-x-2">
                  <span>📞</span>
                  <span>{data.phone}</span>
                </div>
              )}
              {data.email && (
                <div className="flex items-center space-x-2">
                  <span>✉️</span>
                  <span>{data.email}</span>
                </div>
              )}
              {(data as any).paymentType && (
                <div className="flex items-center space-x-2">
                  <span>💳</span>
                  <span>{(data as any).paymentType}</span>
                </div>
              )}
              {(data as any).monthlyFee !== undefined && (
                <div className="flex items-center space-x-2">
                  <span>💲</span>
                  <span>${(data as any).monthlyFee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <span>👪</span>
                <span>{(data as any).familyDiscount ? "Yes" : "No"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Month selector with toggle */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-wrap gap-1 overflow-x-auto pb-2 flex-1">
            {months.map((m) => {
              const percent = getMonthAttendance(year, m);
              const { attended, total } = getMonthAttendanceCount(year, m);
              const displayValue = showPercentage ? `${percent}%` : `${attended}/${total}`;
              return (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(m)}
                  title={`${percent}% attendance`}
                  className={`relative flex flex-col items-center justify-center w-16 h-16 rounded-md text-sm font-medium transition-colors ${
                    selectedMonth === m
                      ? "bg-primary-500 text-white shadow-lg"
                      : "bg-dark-800 text-dark-300 hover:bg-dark-700"
                  }`}
                >
                  <div
                    className="absolute bottom-0 left-0 h-1 bg-green-400 transition-all"
                    style={{ width: `${percent}%` }}
                  />
                  <span>{new Date(year, m).toLocaleString("default", { month: "short" })}</span>
                  <span className="text-xs font-normal mt-1 opacity-75">
                    {displayValue}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <span className="text-sm text-dark-400">Days</span>
            <button
              onClick={() => setShowPercentage(!showPercentage)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                showPercentage ? 'bg-primary-600' : 'bg-dark-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showPercentage ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm text-dark-400">%</span>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[500px]">
          {/* Calendar Column */}
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold mb-3">
              {new Date(year, selectedMonth).toLocaleString("default", {
                month: "long",
              })}
            </h2>
            <div className="h-full bg-dark-800 border border-dark-700 rounded-2xl p-4 flex flex-col">
              <div className="grid grid-cols-7 gap-0.5 text-center text-xs flex-1">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
                  <div key={d} className="font-semibold py-1">
                    {d}
                  </div>
                ))}
                {Array.from({ length: getFirstDay(year, selectedMonth) }).map((_, i) => (
                  <div key={`empty-${i}`} className="py-1" />
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
                      className={`flex-1 rounded-md flex items-center justify-center min-h-0 ${
                        attended ? 'bg-green-500' : 'bg-dark-700'
                      } ${isToday ? 'ring-2 ring-primary-500' : ''}`}
                    >
                      <span className={`${attended ? 'text-dark-900' : 'text-dark-400'} text-xs`}>{day}</span>
                    </button>
                  );
                })}
                {/* Fill remaining cells to make 6 rows total */}
                {Array.from({ length: Math.max(0, 42 - getFirstDay(year, selectedMonth) - getDaysInMonth(year, selectedMonth)) }).map((_, i) => (
                  <div key={`fill-${i}`} className="flex-1 min-h-0" />
                ))}
              </div>
            </div>
          </div>

          {/* Comments Column */}
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold mb-3">Notes & Comments</h3>
            <div className="h-full bg-dark-800 border border-dark-700 rounded-2xl p-4 flex flex-col">
              <div className="h-[320px] overflow-y-auto mb-4">
                {comments.length === 0 ? (
                  <p className="text-dark-400 text-center py-8">No comments yet. Add the first note!</p>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment, index) => (
                      <div key={comment.id}>
                        <div className="space-y-2">
                          <div className="text-dark-300 text-sm font-medium">
                            {comment.timestamp.toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </div>
                          <div className="text-dark-400 text-xs">
                            {comment.teacherName}
                          </div>
                          <div className="text-dark-100 text-base leading-relaxed pl-2 border-l-2 border-dark-600">
                            {comment.message}
                          </div>
                        </div>
                        {index < comments.length - 1 && (
                          <div className="border-b border-dark-600 mt-4 opacity-30"></div>
                        )}
                      </div>
                    ))}
                    <div ref={commentsEndRef} />
                  </div>
                )}
              </div>
              <div className="flex space-x-2 flex-shrink-0">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendComment()}
                  placeholder="Add a note or comment..."
                  className="flex-1 px-3 py-2 rounded-lg border border-dark-600 bg-dark-700 text-white placeholder-dark-400 focus:outline-none focus:border-primary-500 text-sm"
                />
                <button
                  onClick={handleSendComment}
                  disabled={!newComment.trim()}
                  className="px-3 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
