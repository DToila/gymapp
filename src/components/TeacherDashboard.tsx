"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import MemberProfile from "./MemberProfile";
import TeacherSidebar from "@/components/members/TeacherSidebar";
import { Member, calculateMonthlyFee, getBeltOptions } from "../../lib/types";
import { createMember, updateMember as updateMemberDb, deleteMember, getMembers } from "../../lib/database";
import { supabase } from "../../lib/supabase";
import * as XLSX from 'xlsx';

interface NewMemberForm {
  name: string;
  belt_level: string;
  status: "Active" | "Paused" | "Unpaid";
  phone: string;
  email: string;
  payment_type: "Direct Debit" | "Cash";
  fee: number;
  family_discount: boolean;
  date_of_birth: string;
  iban: string;
  nif: string;
  ref: string;
  custom_fee: boolean;
  custom_fee_amount: number;
}

interface TeacherDashboardProps {
  onLogout: () => void;
}

type MoodOption = "happy" | "neutral" | "sad";

const MOOD_OPTIONS: Array<{ value: MoodOption; icon: string; label: string }> = [
  { value: "happy", icon: "😊", label: "Happy" },
  { value: "neutral", icon: "😐", label: "Neutral" },
  { value: "sad", icon: "☹️", label: "Sad" },
];

export default function TeacherDashboard({ onLogout }: TeacherDashboardProps) {
  const openAddHandledRef = useRef(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingMembers, setPendingMembers] = useState<Member[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [enrollmentTimestamp, setEnrollmentTimestamp] = useState<string>(new Date().toISOString());
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);
  const [newMember, setNewMember] = useState<NewMemberForm>({
    name: "",
    belt_level: "White Belt",
    status: "Active",
    phone: "",
    email: "",
    payment_type: "Direct Debit",
    fee: 0,
    family_discount: false,
    date_of_birth: "",
    iban: "",
    nif: "",
    ref: "",
    custom_fee: false,
    custom_fee_amount: 0,
  });
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [quickSelection, setQuickSelection] = useState<{ [id: string]: boolean }>({});
  const [under16MoodByMemberId, setUnder16MoodByMemberId] = useState<{ [id: string]: MoodOption }>({});
  const [acceptingPendingMemberId, setAcceptingPendingMemberId] = useState<string | null>(null);
  const [acceptForm, setAcceptForm] = useState<{ belt_level: string; payment_type: "Direct Debit" | "Cash"; fee: string }>({
    belt_level: "White Belt",
    payment_type: "Direct Debit",
    fee: "0",
  });

  const mapMemberForDashboard = (m: Member) => ({
    id: m.id,
    name: m.name,
    belt_level: (m as any).belt_level,
    beltLevel: (m as any).belt_level,
    status: (m as any).status,
    created_at: m.created_at,
    phone: (m as any).phone,
    email: (m as any).email,
    payment_type: (m as any).payment_type,
    paymentType: (m as any).payment_type,
    fee: (m as any).fee,
    monthlyFee: (m as any).fee,
    family_discount: (m as any).family_discount,
    familyDiscount: (m as any).family_discount,
    date_of_birth: (m as any).date_of_birth,
    iban: (m as any).iban,
    nif: (m as any).nif,
    ref: (m as any).ref,
    custom_fee: (m as any).custom_fee,
    custom_fee_amount: (m as any).custom_fee_amount,
    attendance_mood: (m as any).attendance_mood || {},
    attendance: {}
  });

  const loadMembers = useCallback(async () => {
    try {
      const data = await getMembers();
      const nonPendingMembers = data.filter(
        (member) => String((member as any).status || '').trim().toLowerCase() !== 'pending'
      );
      const formattedMembers: any[] = nonPendingMembers.map(mapMemberForDashboard);
      setMembers(formattedMembers);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  }, []);

  const loadPendingMembers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const pendingFormatted: any[] = (data || []).map((member) => mapMemberForDashboard(member as Member));
      setPendingMembers(pendingFormatted);
    } catch (error) {
      console.error('Error loading pending members:', error);
    }
  }, []);

  const loadDashboardData = useCallback(async () => {
    await Promise.all([loadMembers(), loadPendingMembers()]);
  }, [loadMembers, loadPendingMembers]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    if (openAddHandledRef.current) return;
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('openAddMember') === '1') {
      openAddHandledRef.current = true;
      setEnrollmentTimestamp(new Date().toISOString());
      setShowAddModal(true);
    }
  }, []);

  const openQuickModal = () => {
    const today = new Date().toISOString().split("T")[0];
    const sel: { [id: string]: boolean } = {};
    const moodSel: { [id: string]: MoodOption } = {};
    members.forEach((m: any) => {
      sel[m.id] = !!m.attendance?.[today];
      const todayMood = m.attendance_mood?.[today] as MoodOption | undefined;
      if (todayMood) {
        moodSel[m.id] = todayMood;
        sel[m.id] = true;
      }
    });
    setQuickSelection(sel);
    setUnder16MoodByMemberId(moodSel);
    setShowQuickModal(true);
  };

  const updateNewMemberForDateOfBirth = (dateOfBirth: string) => {
    setNewMember(prev => {
      const beltOptions = getBeltOptions(dateOfBirth, prev.belt_level);
      const nextBeltLevel = beltOptions.includes(prev.belt_level) ? prev.belt_level : beltOptions[0];
      return {
        ...prev,
        date_of_birth: dateOfBirth,
        fee: calculateMonthlyFee(dateOfBirth, prev.payment_type),
        belt_level: nextBeltLevel,
      };
    });
  };

  const addMemberBeltOptions = getBeltOptions(newMember.date_of_birth, newMember.belt_level);

  // Utility function to normalize text - remove Portuguese accents and special chars
  const normalizeText = (text: string): string => {
    if (!text) return '';
    const accentMap: { [key: string]: string } = {
      'ã': 'a', 'á': 'a', 'à': 'a', 'â': 'a',
      'é': 'e', 'ê': 'e',
      'í': 'i',
      'ó': 'o', 'ô': 'o', 'õ': 'o',
      'ú': 'u',
      'ç': 'c',
      'ñ': 'n',
      'Ã': 'A', 'Á': 'A', 'À': 'A', 'Â': 'A',
      'É': 'E', 'Ê': 'E',
      'Í': 'I',
      'Ó': 'O', 'Ô': 'O', 'Õ': 'O',
      'Ú': 'U',
      'Ç': 'C',
      'Ñ': 'N'
    };
    let result = '';
    for (const char of text) {
      result += accentMap[char] || char;
    }
    return result
      .replace(/[^\w\s]/g, '') // Remove remaining special characters
      .substring(0, 70); // Max 70 chars
  };

  // Format fee as European format (comma decimal)
  const formatFee = (fee: number): string => {
    return (fee || 0).toFixed(2).replace('.', ',');
  };

  const padColumn = (value: string, width: number): string => {
    return String(value || '').slice(0, width).padEnd(width, ' ');
  };

  const formatDdTxtRow = (columns: string[], widths: number[]): string => {
    const [iban, bank, amount, rcur, ref, date, name] = columns;
    return [
      padColumn(iban, widths[0]),
      padColumn(bank, widths[1]),
      padColumn(amount, widths[2]),
      padColumn(rcur, widths[3]),
      padColumn(ref, widths[4]),
      padColumn(date, widths[5]),
      name,
    ].join('');
  };

  const formatDateFromIso = (isoDate?: string | null): string => {
    const raw = typeof isoDate === 'string' ? isoDate.trim() : '';
    const datePart = raw.split('T')[0] || '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      const [year, month, day] = datePart.split('-');
      return `${day}-${month}-${year}`;
    }

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear());
    return `${day}-${month}-${year}`;
  };

  const formatEnrollmentDate = (createdAt?: string | null): string => {
    return formatDateFromIso(createdAt);
  };

  const sanitizeIban = (iban?: string | null): string => {
    const ibanString = String(iban || '');
    return ibanString.replace(/\s+/g, '').padEnd(34, ' ');
  };

  const isEligibleDirectDebitMember = (member: Member): boolean => {
    return (
      String(member.payment_type || '').trim().toLowerCase() === 'direct debit' &&
      String(member.status || '').trim().toLowerCase() === 'active' &&
      Boolean(member.iban) &&
      typeof member.fee === 'number' &&
      member.fee > 0
    );
  };

  // Export DD function
  const handleExportDD = async () => {
    try {
      // Get fresh data from database to ensure all fields are present
      const members = await getMembers();
      console.log('member data:', JSON.stringify(members[0]));

      // Filter: Active, Direct Debit, with IBAN and NIF, and must have a fee > 0
      const ddMembers = members.filter(isEligibleDirectDebitMember);
      console.log('DD members found:', ddMembers.length);

      // Build tab-separated rows (7 columns: IBAN, CGDIPTL, VALOR, RCUR, REF, DATA, NOME)
      const rowColumns = ddMembers.map(m => {
        const feeToUse = (m as any).custom_fee_amount && (m as any).custom_fee ? (m as any).custom_fee_amount : (m.fee || 75);
        const exportDate = new Date().toLocaleDateString('pt-PT', {day:'2-digit', month:'2-digit', year:'numeric'}).replace(/\//g,'-');
        if (ddMembers[0]?.id === m.id) {
          console.log('DD date debug:', { created_at: m.created_at, exportDate });
        }
        return [
          sanitizeIban(m.iban),
          'CGDIPTL', // Fixed value as per DD standard
          formatFee(feeToUse), // Use custom fee if set, otherwise use member's fee
          'RCUR', // Fixed value as per DD standard
          m.ref || '', // Student number
          exportDate, // DD-MM-AAAA (registration date)
          normalizeText(m.name) // Name without accents, max 70 chars
        ];
      });

      const ddColumnWidths = [0, 1, 2, 3, 4, 5].map(index => {
        const maxLength = rowColumns.reduce((longest, columns) => {
          return Math.max(longest, String(columns[index] || '').length);
        }, 0);
        return maxLength + 2;
      });

      const rows = rowColumns.map(columns => formatDdTxtRow(columns, ddColumnWidths));

      // Create file content (no header row, just data rows)
      const fileContent = rows.join('\n');

      // Generate filename: DD_MMMM_GBCQ.txt where MMMM is Portuguese month name
      const today = new Date();
      const monthNames = ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
      const monthName = monthNames[today.getMonth()];
      const filename = `DD_${monthName}_GBCQ.txt`;

      // Create blob and download
      const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Error exporting DD file:', error);
      alert('Error exporting DD file. Please try again.');
    }
  };

  // Export DD to Excel
  const handleExportDDExcel = async () => {
    try {
      // Get fresh data from database to ensure all fields are present
      const allMembers = await getMembers();

      // Filter: Active, Direct Debit, with IBAN and NIF, and must have a fee > 0
      const ddMembers = allMembers.filter(isEligibleDirectDebitMember);
      console.log('DD Excel export filtered members count:', ddMembers.length);

      // Build data for Excel - 7 columns: IBAN, CGDIPTL, VALOR, RCUR, REF, DATA, NOME (no headers)
      const excelData = ddMembers.map(m => {
        const feeToUse = (m as any).custom_fee_amount && (m as any).custom_fee ? (m as any).custom_fee_amount : (m.fee || 75);
        const exportDate = new Date().toLocaleDateString('pt-PT', {day:'2-digit', month:'2-digit', year:'numeric'}).replace(/\//g,'-');
        return [
          sanitizeIban(m.iban),
          'CGDIPTL', // Fixed value as per DD standard
          formatFee(feeToUse), // Use custom fee if set, otherwise use member's fee
          'RCUR', // Fixed value as per DD standard
          m.ref || '', // Student number
          exportDate, // DD-MM-AAAA (registration date)
          normalizeText(m.name) // Name without accents, max 70 chars
        ];
      });

      // Create worksheet from array of arrays (no header row)
      const worksheet = XLSX.utils.aoa_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'DD Export');

      // Generate filename: DD_MMMM_GBCQ.xlsx where MMMM is Portuguese month name
      const today = new Date();
      const monthNames = [
        'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      const monthName = monthNames[today.getMonth()];
      const filename = `DD_${monthName}_GBCQ.xlsx`;

      // Generate and download Excel file
      XLSX.writeFile(workbook, filename);
    } catch (error) {
      console.error('Error exporting DD Excel file:', error);
      alert('Error exporting DD Excel file. Please try again.');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingMember) return;
    if (!newMember.name.trim()) {
      console.error('Add member blocked: name is required.');
      return;
    }

    setIsSubmittingMember(true);
    try {
      const memberData = {
        name: newMember.name,
        belt_level: newMember.belt_level,
        status: newMember.status,
        created_at: enrollmentTimestamp,
        phone: newMember.phone || undefined,
        email: newMember.email || undefined,
        payment_type: newMember.payment_type,
        fee: newMember.fee,
        family_discount: newMember.family_discount,
        date_of_birth: newMember.date_of_birth || undefined,
        iban: newMember.iban || undefined,
        nif: newMember.nif || undefined,
        ref: newMember.ref || undefined,
        custom_fee: newMember.custom_fee || undefined,
        custom_fee_amount: newMember.custom_fee_amount || undefined,
      };

      const createdMember = await createMember(memberData);

      // Convert to component format
      const newMemberFormatted: any = {
        id: createdMember.id,
        name: createdMember.name,
        belt_level: createdMember.belt_level,
        beltLevel: createdMember.belt_level,
        status: createdMember.status,
        phone: createdMember.phone,
        email: createdMember.email,
        payment_type: createdMember.payment_type,
        paymentType: createdMember.payment_type,
        fee: createdMember.fee,
        monthlyFee: createdMember.fee,
        family_discount: createdMember.family_discount,
        familyDiscount: createdMember.family_discount,
        dateOfBirth: createdMember.date_of_birth,
        date_of_birth: createdMember.date_of_birth,
        created_at: createdMember.created_at,
        iban: createdMember.iban,
        nif: createdMember.nif,
        ref: createdMember.ref,
        custom_fee: createdMember.custom_fee,
        custom_fee_amount: createdMember.custom_fee_amount,
        attendance: {}
      };

      setMembers((prev) => [...prev, newMemberFormatted]);
      setNewMember({
        name: "",
        belt_level: "White Belt",
        status: "Active",
        phone: "",
        email: "",
        payment_type: "Direct Debit",
        fee: 0,
        family_discount: false,
        date_of_birth: "",
        iban: "",
        nif: "",
        ref: "",
        custom_fee: false,
        custom_fee_amount: 0,
      });
      setEnrollmentTimestamp(new Date().toISOString());
      setShowAddModal(false);
    } catch (error) {
      console.error('Error creating member in handleAddMember:', error);
    } finally {
      setIsSubmittingMember(false);
    }
  };

  const handleAddMemberButtonClick = () => {
    console.log('Add Member submit button clicked');
  };

  const handleRemoveMember = async (id: string) => {
    try {
      await deleteMember(id);
      setMembers(members.filter((member) => member.id !== id));
    } catch (error) {
      console.error('Error deleting member:', error);
    }
  };

  const updateMember = async (updated: any) => {
    try {
      const updates = {
        name: updated.name,
        belt_level: updated.belt_level || updated.beltLevel,
        status: updated.status,
        phone: updated.phone || undefined,
        email: updated.email || undefined,
        payment_type: updated.payment_type || updated.paymentType,
        fee: updated.fee ?? updated.monthlyFee,
        family_discount: updated.family_discount ?? updated.familyDiscount ?? false,
        date_of_birth: updated.date_of_birth || updated.dateOfBirth || undefined,
        iban: updated.iban || undefined,
        nif: updated.nif || undefined,
        ref: updated.ref || undefined,
        custom_fee: updated.custom_fee ?? undefined,
        custom_fee_amount: updated.custom_fee_amount ?? undefined,
      };

      await updateMemberDb(updated.id, updates);
      await loadDashboardData();
    } catch (error) {
      console.error('Error updating member:', error);
      throw error;
    }
  };

  const openAcceptPendingForm = (member: any) => {
    const nextPaymentType = member.payment_type === 'Cash' ? 'Cash' : 'Direct Debit';
    setAcceptingPendingMemberId(member.id);
    setAcceptForm({
      belt_level: member.belt_level || 'White Belt',
      payment_type: nextPaymentType,
      fee: String(member.fee ?? calculateMonthlyFee(member.date_of_birth, nextPaymentType) ?? 0),
    });
  };

  const confirmAcceptPendingMember = async (memberId: string) => {
    try {
      const parsedFee = Number.parseFloat(acceptForm.fee);
      const safeFee = Number.isFinite(parsedFee) ? parsedFee : 0;

      await updateMemberDb(memberId, {
        status: 'active' as any,
        belt_level: acceptForm.belt_level,
        payment_type: acceptForm.payment_type,
        fee: safeFee,
      } as any);

      setAcceptingPendingMemberId(null);
      await loadDashboardData();
    } catch (error) {
      console.error('Error accepting pending member:', error);
    }
  };

  const markPendingMemberAsUnknown = async (memberId: string) => {
    const expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

    try {
      const { error } = await supabase
        .from('members')
        .update({ status: 'unknown', unknown_expiry_at: expiresAt } as any)
        .eq('id', memberId);

      if (error) {
        const fallback = await supabase
          .from('members')
          .update({ status: 'unknown' } as any)
          .eq('id', memberId);
        if (fallback.error) throw fallback.error;
      }

      setAcceptingPendingMemberId(null);
      await loadDashboardData();
    } catch (error) {
      console.error('Error marking member as unknown:', error);
    }
  };

  const rejectPendingMember = async (memberId: string) => {
    try {
      await deleteMember(memberId);
      setAcceptingPendingMemberId(null);
      await loadDashboardData();
    } catch (error) {
      console.error('Error rejecting pending member:', error);
    }
  };

  // const todayStr = new Date().toISOString().split("T")[0];

  if (selectedMemberId) {
    const member = [...members, ...pendingMembers].find((m) => m.id === selectedMemberId);
    if (member) {
      return (
        <MemberProfile
          member={member}
          onBack={() => setSelectedMemberId(null)}
          onUpdate={updateMember}
        />
      );
    }
  }

  const handleQuickSave = () => {
    const today = new Date().toISOString().split("T")[0];
    setMembers((prev) =>
      prev.map((m: any) => {
        const chosen = quickSelection[m.id];
        const selectedMood = under16MoodByMemberId[m.id];
        if (!m.attendance) m.attendance = {};
        if (chosen || selectedMood) m.attendance[today] = true;
        else delete m.attendance[today];

        if (isUnder16Member(m as Member)) {
          if (!m.attendance_mood) m.attendance_mood = {};
          if (selectedMood) m.attendance_mood[today] = selectedMood;
          else delete m.attendance_mood[today];
        }

        return { ...m };
      })
    );
    setShowQuickModal(false);
  };

  const setMoodForToday = (memberId: string, mood: MoodOption) => {
    const today = new Date().toISOString().split("T")[0];

    setUnder16MoodByMemberId((prev) => ({ ...prev, [memberId]: mood }));
    setQuickSelection((prev) => ({ ...prev, [memberId]: true }));

    setMembers((prev) =>
      prev.map((member: any) => {
        if (member.id !== memberId) return member;
        const nextMoodByDate = { ...(member.attendance_mood || {}), [today]: mood };
        const nextAttendance = { ...(member.attendance || {}), [today]: true };
        return { ...member, attendance_mood: nextMoodByDate, attendance: nextAttendance };
      })
    );
  };

  const getAgeFromDateOfBirth = (dateOfBirth?: string): number | null => {
    if (!dateOfBirth) return null;
    const birthDate = new Date(dateOfBirth);
    if (Number.isNaN(birthDate.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age -= 1;
    }

    return age;
  };

  const isUnder16Member = (member: Member): boolean => {
    const age = getAgeFromDateOfBirth(member.date_of_birth);
    return age !== null && age < 16;
  };

  const under16Members = members.filter(isUnder16Member);

  const renderMoodSelector = (memberId: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      {MOOD_OPTIONS.map((option) => {
        const isSelected = under16MoodByMemberId[memberId] === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-label={option.label}
            title={option.label}
            onClick={(e) => {
              e.stopPropagation();
              setMoodForToday(memberId, option.value);
            }}
            style={{
              width: '28px',
              height: '28px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isSelected ? 'rgba(204,0,0,0.18)' : '#1a1a1a',
              border: isSelected ? '1px solid #CC0000' : '1px solid #2a2a2a',
              cursor: 'pointer',
              fontSize: '14px',
              lineHeight: 1,
              borderRadius: '4px',
              transition: 'all 0.2s'
            }}
          >
            {option.icon}
          </button>
        );
      })}
    </div>
  );

  const getBeltColor = (belt: string): string => {
    switch (belt) {
      case "White Belt": return "#888888";
      case "Blue Belt": return "#2596BE";
      case "Purple Belt": return "#7D3C98";
      case "Brown Belt": return "#8B4513";
      case "Black Belt": return "#000000";
      default: return "#888888";
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#f0f0f0',
      fontFamily: '"Barlow", sans-serif'
    }}>
      {/* SIDEBAR */}
      <TeacherSidebar active="dashboard" requestsCount={pendingMembers.length} onLogout={onLogout} onExportTxt={handleExportDD} onExportExcel={handleExportDDExcel} onAddMember={() => {
        setEnrollmentTimestamp(new Date().toISOString());
        setShowAddModal(true);
      }} />

      {/* MAIN CONTENT */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Topbar */}
        <div style={{
          padding: '22px 40px',
          borderBottom: '1px solid #2a2a2a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontSize: '26px',
              fontWeight: 900,
              letterSpacing: '5px',
              textTransform: 'uppercase',
              color: '#f0f0f0',
              marginBottom: '4px'
            }}>
              MEMBROS
            </div>
            <div style={{
              fontSize: '10px',
              color: '#888888',
              letterSpacing: '2px',
              textTransform: 'uppercase'
            }}>
              Gestão de alunos · GB Carnaxide & Queijas
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={openQuickModal}
              style={{
                padding: '9px 16px',
                fontFamily: '"Barlow Condensed", sans-serif',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '3px',
                textTransform: 'uppercase',
                border: '1px solid #2a2a2a',
                background: 'transparent',
                color: '#888888',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#f0f0f0';
                e.currentTarget.style.borderColor = '#f0f0f0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#888888';
                e.currentTarget.style.borderColor = '#2a2a2a';
              }}
            >
              Quick Attendance
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Stats Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '14px',
            padding: '36px 40px 0'
          }}>
            {[
              { label: 'Total Members', value: members.length, color: '#f0f0f0' },
              { label: 'Active', value: members.filter((m) => m.status === "Active").length, color: '#f0f0f0' },
              { label: 'Paused', value: members.filter((m) => m.status === "Paused").length, color: '#f0f0f0' },
              { label: 'Unpaid', value: members.filter((m) => m.status === "Unpaid").length, color: '#f0f0f0' }
            ].map((stat, idx) => (
              <div
                key={idx}
                style={{
                  background: '#111111',
                  border: '1px solid #2a2a2a',
                  padding: '22px',
                  position: 'relative'
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '2px',
                  background: '#CC0000'
                }} />
                <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#555555', marginBottom: '8px' }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: stat.color }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Members Section */}
          <div style={{ padding: '24px 40px 40px' }}>
            {pendingMembers.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  marginBottom: '14px',
                  fontFamily: '"Barlow Condensed", sans-serif',
                  fontSize: '16px',
                  fontWeight: 800,
                  letterSpacing: '4px',
                  textTransform: 'uppercase',
                  color: '#f0f0f0'
                }}>
                  NOVOS PEDIDOS
                </div>

                <div style={{ border: '1px solid #2a2a2a', background: '#111111' }}>
                  {pendingMembers.map((member: any) => (
                    <div key={member.id} style={{ padding: '14px 16px', borderBottom: '1px solid #1b1b1b' }}>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1.2fr 1fr 1fr 0.8fr auto',
                        gap: '12px',
                        alignItems: 'center'
                      }}>
                        <div
                          onClick={() => setSelectedMemberId(member.id)}
                          style={{ color: '#f0f0f0', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          {member.name}
                        </div>
                        <div style={{ color: '#888888', fontSize: '12px' }}>{member.email || '-'}</div>
                        <div style={{ color: '#888888', fontSize: '12px' }}>{member.phone || '-'}</div>
                        <div style={{ color: '#AAAAAA', fontSize: '12px' }}>{formatEnrollmentDate(member.date_of_birth)}</div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => openAcceptPendingForm(member)}
                            style={{
                              padding: '6px 10px',
                              background: '#CC0000',
                              border: '1px solid #CC0000',
                              color: '#fff',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => markPendingMemberAsUnknown(member.id)}
                            style={{
                              padding: '6px 10px',
                              background: 'transparent',
                              border: '1px solid #444',
                              color: '#ccc',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Unknown
                          </button>
                          <button
                            onClick={() => rejectPendingMember(member.id)}
                            style={{
                              padding: '6px 10px',
                              background: 'transparent',
                              border: '1px solid #553333',
                              color: '#ff8a8a',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      </div>

                      {acceptingPendingMemberId === member.id && (
                        <div style={{
                          marginTop: '12px',
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 0.8fr auto auto',
                          gap: '8px',
                          alignItems: 'end'
                        }}>
                          <div>
                            <div style={{ fontSize: '10px', color: '#777', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Belt</div>
                            <select
                              value={acceptForm.belt_level}
                              onChange={(e) => setAcceptForm((prev) => ({ ...prev, belt_level: e.target.value }))}
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                background: '#1a1a1a',
                                border: '1px solid #2a2a2a',
                                color: '#f0f0f0',
                                fontSize: '12px'
                              }}
                            >
                              {getBeltOptions(member.date_of_birth, acceptForm.belt_level).map((beltOption) => (
                                <option key={beltOption} value={beltOption}>{beltOption}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <div style={{ fontSize: '10px', color: '#777', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Payment</div>
                            <select
                              value={acceptForm.payment_type}
                              onChange={(e) => setAcceptForm((prev) => ({ ...prev, payment_type: e.target.value as "Direct Debit" | "Cash" }))}
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                background: '#1a1a1a',
                                border: '1px solid #2a2a2a',
                                color: '#f0f0f0',
                                fontSize: '12px'
                              }}
                            >
                              <option value="Direct Debit">Direct Debit</option>
                              <option value="Cash">Cash</option>
                            </select>
                          </div>

                          <div>
                            <div style={{ fontSize: '10px', color: '#777', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Fee</div>
                            <input
                              type="number"
                              step="0.01"
                              value={acceptForm.fee}
                              onChange={(e) => setAcceptForm((prev) => ({ ...prev, fee: e.target.value }))}
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                background: '#1a1a1a',
                                border: '1px solid #2a2a2a',
                                color: '#f0f0f0',
                                fontSize: '12px'
                              }}
                            />
                          </div>

                          <button
                            onClick={() => confirmAcceptPendingMember(member.id)}
                            style={{
                              padding: '8px 10px',
                              background: '#CC0000',
                              border: '1px solid #CC0000',
                              color: '#fff',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Confirm
                          </button>

                          <button
                            onClick={() => setAcceptingPendingMemberId(null)}
                            style={{
                              padding: '8px 10px',
                              background: 'transparent',
                              border: '1px solid #444',
                              color: '#bbb',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontSize: '16px',
                fontWeight: 800,
                letterSpacing: '4px',
                textTransform: 'uppercase',
                color: '#f0f0f0'
              }}>
                TODOS OS MEMBROS
              </div>
              <input
                type="text"
                placeholder="Search members..."
                style={{
                  background: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  color: '#f0f0f0',
                  padding: '9px 16px',
                  fontSize: '13px',
                  width: '220px',
                  fontFamily: '"Barlow", sans-serif'
                }}
              />
            </div>

            {/* Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                  {['Name', 'Belt', 'Email', 'Enrolled', 'Payment', 'Fee', 'Status', 'Actions'].map((col) => (
                    <th
                      key={col}
                      style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        letterSpacing: '3px',
                        textTransform: 'uppercase',
                        color: '#555555',
                        padding: '10px 16px',
                        borderBottom: '1px solid #2a2a2a',
                        textAlign: 'left'
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr
                    key={member.id}
                    style={{
                      borderBottom: '1px solid #161616',
                      transition: 'background 0.2s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#131313'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    onClick={() => setSelectedMemberId(member.id)}
                  >
                    <td style={{ padding: '13px 16px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          background: '#222222',
                          border: '1px solid #2a2a2a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: '"Barlow Condensed", sans-serif',
                          fontWeight: 900,
                          fontSize: '13px',
                          color: '#CC0000',
                          flexShrink: 0
                        }}>
                          {member.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
                        </div>
                        <div style={{ color: '#f0f0f0', fontSize: '13px' }}>{member.name}</div>
                      </div>
                    </td>
                    <td style={{ padding: '13px 16px', verticalAlign: 'middle', fontSize: '13px', color: '#f0f0f0' }}>
                      <div style={{
                        display: 'inline-block',
                        background: getBeltColor((member as any).beltLevel),
                        color: 'white',
                        padding: '4px 8px',
                        fontSize: '11px',
                        borderRadius: '3px'
                      }}>
                        {(member as any).beltLevel}
                      </div>
                    </td>
                    <td style={{ padding: '13px 16px', verticalAlign: 'middle', fontSize: '13px', color: '#888888' }}>
                      {(member as any).email || "-"}
                    </td>
                    <td style={{ padding: '13px 16px', verticalAlign: 'middle', fontSize: '13px', color: '#AAAAAA' }}>
                      {formatEnrollmentDate((member as any).created_at)}
                    </td>
                    <td style={{ padding: '13px 16px', verticalAlign: 'middle', fontSize: '13px', color: '#888888' }}>
                      {(member as any).paymentType || "-"}
                    </td>
                    <td style={{ padding: '13px 16px', verticalAlign: 'middle', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '16px', color: '#f0f0f0', fontWeight: 900 }}>
                      €{(member as any).monthlyFee ? (member as any).monthlyFee.toFixed(2) : "0.00"}
                    </td>
                    <td style={{ padding: '13px 16px', verticalAlign: 'middle' }}>
                      <div style={{
                        display: 'inline-block',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '4px 8px',
                        borderRadius: '3px',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        color: member.status === 'Active' ? '#CC0000' : member.status === 'Paused' ? '#888888' : '#ff4444',
                        background: member.status === 'Active' ? 'rgba(204,0,0,0.15)' : member.status === 'Paused' ? 'rgba(255,255,255,0.05)' : 'rgba(255,50,50,0.1)',
                        border: member.status === 'Active' ? '1px solid #CC0000' : member.status === 'Paused' ? '1px solid #444444' : '1px solid #ff4444'
                      }}>
                        {member.status}
                      </div>
                    </td>
                    <td style={{ padding: '13px 16px', verticalAlign: 'middle', textAlign: 'right' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveMember(member.id);
                        }}
                        style={{
                          background: 'rgba(255, 107, 107, 0.1)',
                          border: '1px solid rgba(255, 107, 107, 0.3)',
                          color: '#FF6B6B',
                          padding: '4px 8px',
                          fontSize: '11px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 107, 107, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 107, 107, 0.1)';
                        }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {members.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: '#555555' }}>
                No members yet. Add your first member to get started!
              </div>
            )}

            <div style={{ marginTop: '32px' }}>
              <div style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontSize: '16px',
                fontWeight: 800,
                letterSpacing: '4px',
                textTransform: 'uppercase',
                color: '#f0f0f0',
                marginBottom: '12px'
              }}>
                UNDER 16 MEMBERS
              </div>

              <div style={{
                border: '1px solid #2a2a2a',
                background: '#111111'
              }}>
                {under16Members.length === 0 ? (
                  <div style={{ padding: '16px', fontSize: '12px', color: '#888888' }}>
                    No under 16 members found.
                  </div>
                ) : (
                  under16Members.map((member) => (
                    <div
                      key={member.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderBottom: '1px solid #1b1b1b'
                      }}
                    >
                      <span style={{ color: '#f0f0f0', fontSize: '13px' }}>{member.name}</span>
                      {renderMoodSelector(member.id)}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50
        }}>
          <div style={{
            background: '#111111',
            border: '1px solid #2a2a2a',
            padding: '32px',
            maxWidth: '400px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '24px'
            }}>
              <h3 style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontSize: '20px',
                fontWeight: 900,
                color: '#f0f0f0',
                margin: 0
              }}>
                ADD NEW MEMBER
              </h3>
              <div style={{
                fontSize: '10px',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                color: '#555555',
                fontFamily: '"Barlow Condensed", sans-serif',
                textAlign: 'right',
                marginTop: '2px'
              }}>
                Enrollment: {new Date().toLocaleDateString('pt-PT', {day:'2-digit', month:'2-digit', year:'numeric'}).replace(/\//g,'-')}
              </div>
            </div>

            <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#888888', marginBottom: '6px' }}>
                  Name
                </label>
                <input
                  type="text"
                  value={newMember.name}
                  onChange={(e) => {
                    const nextNum = (members.length + 1).toString().padStart(3, '0');
                    setNewMember({ ...newMember, name: e.target.value, ref: `GBCQ${nextNum}` });
                  }}
                  placeholder="Member name"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#1a1a1a',
                    border: '1px solid #2a2a2a',
                    color: '#f0f0f0',
                    fontSize: '13px',
                    fontFamily: '"Barlow", sans-serif'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#888888', marginBottom: '6px' }}>
                  Student Number
                </label>
                <input
                  type="text"
                  value={newMember.ref}
                  readOnly
                  disabled
                  placeholder="Auto-generated (GBCQ###)"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#0a0a0a',
                    border: '1px solid #2a2a2a',
                    color: '#888888',
                    fontSize: '13px',
                    fontFamily: '"Barlow", sans-serif',
                    opacity: 0.6,
                    cursor: 'not-allowed'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#888888', marginBottom: '6px' }}>
                  IBAN
                </label>
                <input
                  type="text"
                  value={newMember.iban}
                  onChange={(e) => setNewMember({ ...newMember, iban: e.target.value })}
                  placeholder="PT50 0002 0123 1234 5678 9015"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#1a1a1a',
                    border: '1px solid #2a2a2a',
                    color: '#f0f0f0',
                    fontSize: '13px',
                    fontFamily: '"Barlow", sans-serif'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#888888', marginBottom: '6px' }}>
                  NIF
                </label>
                <input
                  type="text"
                  value={newMember.nif}
                  onChange={(e) => setNewMember({ ...newMember, nif: e.target.value })}
                  placeholder="Portuguese tax ID"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#1a1a1a',
                    border: '1px solid #2a2a2a',
                    color: '#f0f0f0',
                    fontSize: '13px',
                    fontFamily: '"Barlow", sans-serif'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#888888', marginBottom: '6px' }}>
                  Phone
                </label>
                <input
                  type="tel"
                  value={newMember.phone}
                  onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#1a1a1a',
                    border: '1px solid #2a2a2a',
                    color: '#f0f0f0',
                    fontSize: '13px',
                    fontFamily: '"Barlow", sans-serif'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#888888', marginBottom: '6px' }}>
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={newMember.date_of_birth}
                  onChange={(e) => updateNewMemberForDateOfBirth(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#1a1a1a',
                    border: '1px solid #2a2a2a',
                    color: '#f0f0f0',
                    fontSize: '13px',
                    fontFamily: '"Barlow", sans-serif'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#888888', marginBottom: '6px' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  placeholder="member@example.com"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#1a1a1a',
                    border: '1px solid #2a2a2a',
                    color: '#f0f0f0',
                    fontSize: '13px',
                    fontFamily: '"Barlow", sans-serif'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#888888', marginBottom: '6px' }}>
                  Payment Type
                </label>
                <select
                  value={newMember.payment_type}
                  onChange={(e) => {
                    const newPaymentType = e.target.value as "Direct Debit" | "Cash";
                    setNewMember(prev => ({
                      ...prev,
                      payment_type: newPaymentType,
                      fee: calculateMonthlyFee(prev.date_of_birth, newPaymentType),
                    }));
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#1a1a1a',
                    border: '1px solid #2a2a2a',
                    color: '#f0f0f0',
                    fontSize: '13px',
                    fontFamily: '"Barlow", sans-serif'
                  }}
                >
                  <option>Direct Debit</option>
                  <option>Cash</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#888888', marginBottom: '6px' }}>
                  Monthly Fee (€) - Auto-Calculated
                </label>
                <input
                  type="number"
                  value={newMember.fee}
                  readOnly
                  disabled
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#0a0a0a',
                    border: '1px solid #2a2a2a',
                    color: '#888888',
                    fontSize: '13px',
                    fontFamily: '"Barlow", sans-serif',
                    opacity: 0.6
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  id="familyDiscount"
                  type="checkbox"
                  checked={newMember.family_discount}
                  onChange={(e) => setNewMember({ ...newMember, family_discount: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: '#CC0000' }}
                />
                <label htmlFor="familyDiscount" style={{ fontSize: '12px', color: '#888888' }}>
                  Family discount
                </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  id="customFee"
                  type="checkbox"
                  checked={newMember.custom_fee}
                  onChange={(e) => setNewMember({ ...newMember, custom_fee: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: '#CC0000' }}
                />
                <label htmlFor="customFee" style={{ fontSize: '12px', color: '#888888' }}>
                  Custom Fee
                </label>
              </div>

              {newMember.custom_fee && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#888888', marginBottom: '6px' }}>
                    Custom Fee Amount (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newMember.custom_fee_amount}
                    onChange={(e) => setNewMember({ ...newMember, custom_fee_amount: parseFloat(e.target.value) || 0 })}
                    placeholder="Enter custom fee amount"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: '#1a1a1a',
                      border: '1px solid #2a2a2a',
                      color: '#f0f0f0',
                      fontSize: '13px',
                      fontFamily: '"Barlow", sans-serif'
                    }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#888888', marginBottom: '6px' }}>
                  Belt Level
                </label>
                <select
                  value={newMember.belt_level}
                  onChange={(e) => setNewMember({ ...newMember, belt_level: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#1a1a1a',
                    border: '1px solid #2a2a2a',
                    color: '#f0f0f0',
                    fontSize: '13px',
                    fontFamily: '"Barlow", sans-serif'
                  }}
                >
                  {addMemberBeltOptions.map((beltOption) => (
                    <option key={beltOption} value={beltOption}>{beltOption}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#888888', marginBottom: '6px' }}>
                  Status
                </label>
                <select
                  value={newMember.status}
                  onChange={(e) => setNewMember({ ...newMember, status: e.target.value as "Active" | "Paused" | "Unpaid" })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#1a1a1a',
                    border: '1px solid #2a2a2a',
                    color: '#f0f0f0',
                    fontSize: '13px',
                    fontFamily: '"Barlow", sans-serif'
                  }}
                >
                  <option>Active</option>
                  <option>Paused</option>
                  <option>Unpaid</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: 'transparent',
                    border: '1px solid #2a2a2a',
                    color: '#888888',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#f0f0f0';
                    e.currentTarget.style.color = '#f0f0f0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#2a2a2a';
                    e.currentTarget.style.color = '#888888';
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleAddMemberButtonClick}
                  disabled={isSubmittingMember}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: '#CC0000',
                    border: '1px solid #CC0000',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    opacity: isSubmittingMember ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#990000'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#CC0000'}
                >
                  {isSubmittingMember ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Attendance Modal */}
      {showQuickModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50
        }}>
          <div style={{
            background: '#111111',
            border: '1px solid #2a2a2a',
            padding: '32px',
            maxWidth: '450px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h3 style={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontSize: '20px',
              fontWeight: 900,
              color: '#f0f0f0',
              marginBottom: '24px'
            }}>
              TODAY'S ATTENDANCE
            </h3>

            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '24px' }}>
              {members.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 0',
                    borderBottom: '1px solid rgba(42,42,42,0.5)'
                  }}
                >
                  <span style={{ color: '#f0f0f0', fontSize: '13px' }}>{m.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {isUnder16Member(m) && renderMoodSelector(m.id)}
                    <input
                      type="checkbox"
                      checked={!!quickSelection[m.id]}
                      onChange={(e) => setQuickSelection({ ...quickSelection, [m.id]: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: '#CC0000' }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowQuickModal(false)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: 'transparent',
                  border: '1px solid #2a2a2a',
                  color: '#888888',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#f0f0f0';
                  e.currentTarget.style.color = '#f0f0f0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#2a2a2a';
                  e.currentTarget.style.color = '#888888';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleQuickSave}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: '#CC0000',
                  border: '1px solid #CC0000',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#990000'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#CC0000'}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
