"use client";

import { useState, useEffect, useCallback } from "react";
import { getAttendanceForMember, getNotesForMember } from "../../lib/database";

interface StudentDashboardProps {
  studentId: string;
  onLogout: () => void;
}

interface StudentData {
  id: string;
  name: string;
  email?: string;
  belt_level: string;
  status: "Active" | "Paused" | "Unpaid";
  payment_type?: "Direct Debit" | "Cash";
  fee?: number;
  family_discount: boolean;
  date_of_birth?: string;
}

interface Note {
  id: string;
  member_id: string;
  date: string;
  teacher_name: string;
  note_text: string;
  created_at: string;
}

export default function StudentDashboard({ studentId, onLogout }: StudentDashboardProps) {
  const [student, setStudent] = useState<StudentData | null>(null);
  const [attendance, setAttendance] = useState<{ [date: string]: boolean }>({});
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());

  const loadStudentData = useCallback(async () => {
    try {
      setLoading(true);

      // Load student profile from Supabase using the studentId
      // For now, we'll fetch all members and find by ID
      // In production, you'd query by ID directly
      const { data: members } = await (await import("../../lib/supabase")).supabase.from("members").select("*").eq("id", studentId);

      if (members && members.length > 0) {
        setStudent(members[0]);

        // Load attendance data
        const attendanceData = await getAttendanceForMember(studentId);
        const attendanceMapLocal: { [date: string]: boolean } = {};
        attendanceData.forEach(att => {
          attendanceMapLocal[att.date] = att.attended;
        });
        setAttendance(attendanceMapLocal);

        // Load notes
        const notesData = await getNotesForMember(studentId);
        setNotes(notesData);
      }
    } catch (error) {
      console.error("Error loading student data:", error);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadStudentData();
  }, [loadStudentData]);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDay = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const getMonthAttendance = (year: number, month: number) => {
    const days = getDaysInMonth(year, month);
    let attended = 0;
    for (let d = 1; d <= days; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (attendance[dateStr]) attended++;
    }
    return days === 0 ? 0 : Math.round((attended / days) * 100);
  };

  const year = new Date().getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => i);
  const currentMonthAttendance = getMonthAttendance(year, selectedMonth);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-dark-900 via-dark-800 to-dark-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-dark-400">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-dark-900 via-dark-800 to-dark-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Unable to load your profile</p>
          <button
            onClick={onLogout}
            className="px-6 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-dark-900 via-dark-800 to-dark-900 text-white">
      {/* Header */}
      <header className="border-b border-dark-700 bg-dark-800/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">GymApp</h1>
            <p className="text-dark-400 text-sm">Student Portal</p>
          </div>
          <button
            onClick={onLogout}
            className="px-6 py-2 rounded-lg border border-dark-600 text-dark-200 hover:text-white hover:border-primary-600 transition-all duration-300 hover:bg-dark-700"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Profile Card */}
        <div className="rounded-2xl border border-dark-700 bg-dark-800/50 backdrop-blur-sm p-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">{student.name}</h2>
              <p className="text-dark-400 text-sm">{student.email}</p>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-primary-600/20 border border-primary-600/30">
                <span className="text-sm font-semibold text-primary-400">{student.status}</span>
              </div>
            </div>
          </div>

          {/* Profile Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <span>🥋</span>
              <div>
                <p className="text-dark-400 text-xs">Belt Level</p>
                <p className="font-semibold text-white">{student.belt_level}</p>
              </div>
            </div>

            {student.payment_type && (
              <div className="flex items-center space-x-2">
                <span>💳</span>
                <div>
                  <p className="text-dark-400 text-xs">Payment Type</p>
                  <p className="font-semibold text-white">{student.payment_type}</p>
                </div>
              </div>
            )}

            {student.fee !== undefined && (
              <div className="flex items-center space-x-2">
                <span>💲</span>
                <div>
                  <p className="text-dark-400 text-xs">Monthly Fee</p>
                  <p className="font-semibold text-white">€{student.fee}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Attendance Calendar */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-dark-700 bg-dark-800/50 backdrop-blur-sm p-6">
              <h3 className="text-xl font-bold mb-6">Attendance - {new Date(year, selectedMonth).toLocaleString("default", { month: "long", year: "numeric" })}</h3>

              {/* Month Selector */}
              <div className="flex flex-wrap gap-1 overflow-x-auto mb-6 pb-2">
                {months.map((m) => {
                  const percent = getMonthAttendance(year, m);
                  return (
                    <button
                      key={m}
                      onClick={() => setSelectedMonth(m)}
                      title={`${percent}% attendance`}
                      className={`relative flex flex-col items-center justify-center w-14 h-14 rounded-md text-xs font-medium transition-colors ${
                        selectedMonth === m
                          ? "bg-primary-500 text-white shadow-lg"
                          : "bg-dark-700 text-dark-300 hover:bg-dark-600"
                      }`}
                    >
                      <div
                        className="absolute bottom-0 left-0 h-1 bg-green-400 transition-all"
                        style={{ width: `${percent}%` }}
                      />
                      <span>{new Date(year, m).toLocaleString("default", { month: "short" })}</span>
                      <span className="text-xs font-normal opacity-75">{percent}%</span>
                    </button>
                  );
                })}
              </div>

              {/* Calendar Grid */}
              <div className="bg-dark-700/50 rounded-lg p-4">
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold mb-4">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d} className="text-dark-400">{d}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: getFirstDay(year, selectedMonth) }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-12" />
                  ))}
                  {Array.from({ length: getDaysInMonth(year, selectedMonth) }, (_, d) => {
                    const day = d + 1;
                    const dateStr = `${year}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isAttended = attendance[dateStr];
                    return (
                      <div
                        key={dateStr}
                        className={`h-12 rounded-md flex items-center justify-center text-sm font-medium ${
                          isAttended ? 'bg-green-500 text-dark-900' : 'bg-dark-600 text-dark-400'
                        }`}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Attendance Percentage */}
              <div className="mt-6 p-4 rounded-lg bg-primary-600/10 border border-primary-600/20">
                <div className="flex items-center justify-between">
                  <span className="text-dark-300">Current Month Attendance</span>
                  <span className="text-2xl font-bold text-primary-400">{currentMonthAttendance}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Teacher Notes */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-dark-700 bg-dark-800/50 backdrop-blur-sm p-6 h-full flex flex-col">
              <h3 className="text-lg font-bold mb-4">Teacher Notes</h3>

              <div className="flex-1 overflow-y-auto space-y-4">
                {notes.length === 0 ? (
                  <p className="text-dark-400 text-center py-8">No notes yet</p>
                ) : (
                  notes.map((note) => (
                    <div key={note.id} className="space-y-1">
                      <div className="text-dark-300 text-xs font-medium">
                        {new Date(note.created_at).toLocaleDateString('en-GB')}
                      </div>
                      <div className="text-dark-400 text-xs">
                        {note.teacher_name}
                      </div>
                      <div className="text-dark-100 text-sm leading-relaxed pl-2 border-l-2 border-dark-600">
                        {note.note_text}
                      </div>
                      {notes.indexOf(note) < notes.length - 1 && (
                        <div className="border-b border-dark-600 mt-3 opacity-30"></div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
