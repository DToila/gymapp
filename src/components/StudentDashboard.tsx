"use client";

import { useState, useEffect, useCallback } from "react";
import GBLogo from "@/components/GBLogo";
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
  status: "Ativo" | "Paused" | "Por Pagar";
  payment_type?: "Débito Direto" | "Dinheiro";
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
      console.error("Erro loading student data:", error);
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0a' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '3px solid #CC0000', borderTop: '3px solid transparent', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ color: '#555555' }}>A carregar your profile...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#ff6666', marginBottom: '16px' }}>Unable to load your profile</p>
          <button
            onClick={onLogout}
            style={{
              padding: '8px 24px',
              background: '#CC0000',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#990000'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#CC0000'}
          >
            Voltar to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f0f0f0', fontFamily: '"Barlow", sans-serif' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid #2a2a2a', background: 'rgba(17,17,17,0.8)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <GBLogo size={40} />
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#f0f0f0', fontFamily: '"Barlow Condensed", sans-serif', marginBottom: '4px' }}>GRACIE BARRA</h1>
              <p style={{ color: '#888888', fontSize: '12px' }}>Carnaxide & Queijas / Aluno Portal</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            style={{
              padding: '8px 24px',
              border: '1px solid #2a2a2a',
              background: 'transparent',
              color: '#888888',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '2px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#CC0000';
              e.currentTarget.style.color = '#CC0000';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#2a2a2a';
              e.currentTarget.style.color = '#888888';
            }}
          >
            Sair
          </button>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Perfil Card */}
        <div style={{ background: '#111111', border: '1px solid #2a2a2a', padding: '32px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 900, fontFamily: '"Barlow Condensed", sans-serif', color: '#f0f0f0', marginBottom: '8px', letterSpacing: '2px', textTransform: 'uppercase' }}>{student.name}</h2>
              <p style={{ color: '#555555', fontSize: '12px' }}>{student.email}</p>
            </div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'rgba(204,0,0,0.1)',
              border: '1px solid #CC0000'
            }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#CC0000', textTransform: 'uppercase' }}>{student.status}</span>
            </div>
          </div>

          {/* Perfil Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span>🥋</span>
              <div>
                <p style={{ color: '#555555', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px' }}>Cinto Level</p>
                <p style={{ fontWeight: 600, color: '#f0f0f0', fontSize: '14px' }}>{student.belt_level}</p>
              </div>
            </div>

            {student.payment_type && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>💳</span>
                <div>
                  <p style={{ color: '#555555', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px' }}>Tipo de Pagamento</p>
                  <p style={{ fontWeight: 600, color: '#f0f0f0', fontSize: '14px' }}>{student.payment_type}</p>
                </div>
              </div>
            )}

            {student.fee !== undefined && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>💲</span>
                <div>
                  <p style={{ color: '#555555', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px' }}>Taxa Mensal</p>
                  <p style={{ fontWeight: 600, color: '#f0f0f0', fontSize: '14px' }}>€{student.fee?.toFixed(2)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
          {/* Presenças Calendar */}
          <div style={{ background: '#111111', border: '1px solid #2a2a2a', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, fontFamily: '"Barlow Condensed", sans-serif', marginBottom: '24px', letterSpacing: '3px', textTransform: 'uppercase' }}>
              Presenças - {new Date(year, selectedMonth).toLocaleString("default", { month: "long", year: "numeric" })}
            </h3>

            {/* Month Selector */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '24px', paddingBottom: '8px' }}>
              {months.map((m) => {
                const percent = getMonthAttendance(year, m);
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
                      width: '56px',
                      height: '56px',
                      background: selectedMonth === m ? '#CC0000' : '#1a1a1a',
                      color: selectedMonth === m ? 'white' : '#555555',
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
                    <div style={{ position: 'absolute', bottom: 0, left: 0, height: '2px', background: '#CC0000', width: `${percent}%` }}></div>
                    <span>{new Date(year, m).toLocaleString("default", { month: "short" })}</span>
                    <span style={{ fontSize: '10px', marginTop: '4px' }}>{percent}%</span>
                  </button>
                );
              })}
            </div>

            {/* Calendar Grid */}
            <div style={{ background: '#1a1a1a', padding: '16px', marginBottom: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '16px' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} style={{ textAlign: 'center', color: '#555555', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>{d}</div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                {Array.from({ length: getFirstDay(year, selectedMonth) }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: getDaysInMonth(year, selectedMonth) }, (_, d) => {
                  const day = d + 1;
                  const dateStr = `${year}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isAttended = attendance[dateStr];
                  return (
                    <div
                      key={dateStr}
                      style={{
                        height: '48px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isAttended ? '#CC0000' : '#222222',
                        color: isAttended ? 'white' : '#555555',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'default'
                      }}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Presenças Percentage */}
            <div style={{ padding: '16px', background: 'rgba(204,0,0,0.1)', border: '1px solid #CC0000' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#888888', fontSize: '12px', fontWeight: 600 }}>Current Month Presenças</span>
                <span style={{ fontSize: '24px', fontWeight: 900, color: '#CC0000' }}>{currentMonthAttendance}%</span>
              </div>
            </div>
          </div>

          {/* Professor Notas */}
          <div style={{ background: '#111111', border: '1px solid #2a2a2a', padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, fontFamily: '"Barlow Condensed", sans-serif', marginBottom: '16px', letterSpacing: '2px', textTransform: 'uppercase' }}>TEACHER NOTES</h3>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {notes.length === 0 ? (
                <p style={{ color: '#555555', textAlign: 'center', paddingTop: '32px' }}>Não notes yet</p>
              ) : (
                notes.map((note, index) => (
                  <div key={note.id}>
                    <div>
                      <div style={{ color: '#888888', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>
                        {new Date(note.created_at).toLocaleDateString('en-GB')}
                      </div>
                      <div style={{ color: '#555555', fontSize: '10px', marginBottom: '8px' }}>
                        {note.teacher_name}
                      </div>
                      <div style={{ color: '#f0f0f0', fontSize: '12px', lineHeight: '1.5', paddingLeft: '12px', borderLeft: '2px solid #2a2a2a', marginBottom: '16px' }}>
                        {note.note_text}
                      </div>
                    </div>
                    {index < notes.length - 1 && (
                      <div style={{ borderBottom: '1px solid #2a2a2a', marginBottom: '16px', opacity: 0.3 }}></div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
