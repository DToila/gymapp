"use client";

import { useState, useEffect } from "react";
import MemberProfile from "./MemberProfile";
import GBLogo from "@/components/GBLogo";
import { Member, calculateMonthlyFee } from "../../lib/types";
import { createMember, updateMember as updateMemberDb, deleteMember, getMembers } from "../../lib/database";

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
}

interface TeacherDashboardProps {
  onLogout: () => void;
}

export default function TeacherDashboard({ onLogout }: TeacherDashboardProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
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
  });
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [quickSelection, setQuickSelection] = useState<{ [id: string]: boolean }>({});

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const data = await getMembers();
      // Convert database format to component format
      const formattedMembers: any[] = data.map(m => ({
        id: m.id,
        name: m.name,
        beltLevel: m.belt_level,
        status: m.status,
        phone: m.phone,
        email: m.email,
        paymentType: m.payment_type,
        monthlyFee: m.fee,
        familyDiscount: m.family_discount,
        attendance: {} // Will be loaded separately when needed
      }));
      setMembers(formattedMembers);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const openQuickModal = () => {
    const today = new Date().toISOString().split("T")[0];
    const sel: { [id: string]: boolean } = {};
    members.forEach((m: any) => {
      sel[m.id] = !!m.attendance?.[today];
    });
    setQuickSelection(sel);
    setShowQuickModal(true);
  };

  const updateMemberFee = (dateOfBirth: string, paymentType: string) => {
    const calculatedFee = calculateMonthlyFee(dateOfBirth, paymentType);
    setNewMember(prev => ({
      ...prev,
      fee: calculatedFee
    }));
  };

  // Utility function to normalize text (remove accents and special chars)
  const normalizeText = (text: string): string => {
    if (!text) return '';
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^\w\s]/g, '') // Remove special characters
      .substring(0, 70); // Max 70 chars
  };

  // Format fee as European format (comma decimal)
  const formatFee = (fee: number): string => {
    return (fee || 0).toFixed(2).replace('.', ',');
  };

  // Format date as DD-MM-AAAA
  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00Z');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}-${month}-${year}`;
  };

  // Export DD function
  const handleExportDD = async () => {
    try {
      // Get fresh data from database to ensure all fields are present
      const allMembers = await getMembers();

      // Filter: Active, Direct Debit, with IBAN and NIF
      const ddMembers = allMembers.filter(m =>
        m.status === 'Active' &&
        m.payment_type === 'Direct Debit' &&
        m.iban &&
        m.nif
      );

      // Build tab-separated rows
      const rows = ddMembers.map(m => {
        const columns = [
          m.iban || '',
          'CGDIPTL', // Fixed value as per DD standard
          formatFee(m.fee || 75), // Use member's fee or default to 75
          'RCUR', // Fixed value as per DD standard
          m.ref || '', // Student number
          formatDate(m.created_at), // DD-MM-AAAA format
          normalizeText(m.name), // Name without accents, max 70 chars
          m.nif || '' // NIF
        ];
        return columns.join('\t');
      });

      // Create file content (no header row, just data rows)
      const fileContent = rows.join('\n');

      // Generate filename: DD-AAAA-MM-DD.txt
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const filename = `DD-${year}-${month}-${day}.txt`;

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

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.name.trim()) return;

    try {
      const memberData = {
        name: newMember.name,
        belt_level: newMember.belt_level,
        status: newMember.status,
        phone: newMember.phone || undefined,
        email: newMember.email || undefined,
        payment_type: newMember.payment_type,
        fee: newMember.fee,
        family_discount: newMember.family_discount,
        date_of_birth: newMember.date_of_birth || undefined,
        iban: newMember.iban || undefined,
        nif: newMember.nif || undefined,
        ref: newMember.ref || undefined,
      };

      const createdMember = await createMember(memberData);

      // Convert to component format
      const newMemberFormatted: any = {
        id: createdMember.id,
        name: createdMember.name,
        beltLevel: createdMember.belt_level,
        status: createdMember.status,
        phone: createdMember.phone,
        email: createdMember.email,
        paymentType: createdMember.payment_type,
        monthlyFee: createdMember.fee,
        familyDiscount: createdMember.family_discount,
        dateOfBirth: createdMember.date_of_birth,
        attendance: {}
      };

      setMembers([...members, newMemberFormatted]);
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
      });
      setShowAddModal(false);
    } catch (error) {
      console.error('Error creating member:', error);
    }
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
        belt_level: updated.beltLevel,
        status: updated.status,
        phone: updated.phone || undefined,
        email: updated.email || undefined,
        payment_type: updated.paymentType,
        fee: updated.monthlyFee,
        family_discount: updated.familyDiscount,
      };

      await updateMemberDb(updated.id, updates);
      setMembers(members.map((m) => (m.id === updated.id ? updated : m)));
    } catch (error) {
      console.error('Error updating member:', error);
    }
  };

  // const todayStr = new Date().toISOString().split("T")[0];

  if (selectedMemberId) {
    const member = members.find((m) => m.id === selectedMemberId);
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
        if (!m.attendance) m.attendance = {};
        if (chosen) m.attendance[today] = true;
        else delete m.attendance[today];
        return { ...m };
      })
    );
    setShowQuickModal(false);
  };
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
      display: 'grid',
      gridTemplateColumns: '248px 1fr',
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#f0f0f0',
      fontFamily: '"Barlow", sans-serif'
    }}>
      {/* SIDEBAR */}
      <div style={{
        background: '#111111',
        borderRight: '1px solid #2a2a2a',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        overflow: 'hidden'
      }}>
        {/* Sidebar Header */}
        <div style={{
          padding: '22px 20px',
          borderBottom: '1px solid #2a2a2a'
        }}>
          <div style={{ marginBottom: '8px' }}>
            <GBLogo size={48} />
          </div>
          <div style={{
            fontFamily: '"Barlow Condensed", sans-serif',
            fontSize: '13px',
            fontWeight: 800,
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: '#f0f0f0',
            marginBottom: '4px'
          }}>
            Gracie Barra
          </div>
          <div style={{
            fontSize: '9px',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: '#555555'
          }}>
            Carnaxide & Queijas / GymApp
          </div>
        </div>

        {/* Nav Items */}
        <nav style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {['Dashboard', 'Membros', 'Presenças', 'Export DD', 'Definições'].map((item, idx) => (
            <div
              key={item}
              style={{
                padding: '10px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '13px',
                color: idx === 0 ? '#f0f0f0' : '#888888',
                cursor: 'pointer',
                borderLeft: idx === 0 ? '2px solid #CC0000' : '2px solid transparent',
                background: idx === 0 ? 'rgba(204,0,0,0.07)' : 'transparent',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (idx !== 0) {
                  (e.currentTarget as HTMLElement).style.color = '#f0f0f0';
                  (e.currentTarget as HTMLElement).style.background = '#1a1a1a';
                }
              }}
              onMouseLeave={(e) => {
                if (idx !== 0) {
                  (e.currentTarget as HTMLElement).style.color = '#888888';
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }
              }}
            >
              {item}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid #2a2a2a',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            background: '#CC0000',
            fontFamily: '"Barlow Condensed", sans-serif',
            fontWeight: 900,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            flexShrink: 0
          }}>
            P
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '12px', fontWeight: 500, color: '#f0f0f0' }}>Professor</div>
            <div style={{ fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: '#CC0000' }}>Admin</div>
          </div>
          <button
            onClick={onLogout}
            style={{
              background: 'none',
              border: '1px solid #2a2a2a',
              color: '#888888',
              fontSize: '10px',
              padding: '4px 8px',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '1px',
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
            Logout
          </button>
        </div>
      </div>

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
            <button
              onClick={handleExportDD}
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
              Export DD
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                padding: '9px 16px',
                fontFamily: '"Barlow Condensed", sans-serif',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '3px',
                textTransform: 'uppercase',
                border: '1px solid #CC0000',
                background: '#CC0000',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#990000'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#CC0000'}
            >
              + Add Member
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
                  {['Name', 'Belt', 'Email', 'Payment', 'Fee', 'Status', 'Actions'].map((col) => (
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
            <h3 style={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontSize: '20px',
              fontWeight: 900,
              color: '#f0f0f0',
              marginBottom: '24px'
            }}>
              ADD NEW MEMBER
            </h3>

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
                  onChange={(e) => {
                    setNewMember({ ...newMember, date_of_birth: e.target.value });
                    updateMemberFee(e.target.value, newMember.payment_type);
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
                    setNewMember({ ...newMember, payment_type: newPaymentType });
                    updateMemberFee(newMember.date_of_birth, newPaymentType);
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
                  <option>White Belt</option>
                  <option>Blue Belt</option>
                  <option>Purple Belt</option>
                  <option>Brown Belt</option>
                  <option>Black Belt</option>
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
                  Add Member
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
                <label
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 0',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(42,42,42,0.5)'
                  }}
                >
                  <span style={{ color: '#f0f0f0', fontSize: '13px' }}>{m.name}</span>
                  <input
                    type="checkbox"
                    checked={!!quickSelection[m.id]}
                    onChange={(e) => setQuickSelection({ ...quickSelection, [m.id]: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: '#CC0000' }}
                  />
                </label>
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
