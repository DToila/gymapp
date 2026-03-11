"use client";

import { useState, useEffect } from "react";
import MemberProfile from "./MemberProfile";
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
}

interface TeacherDashboardProps {
  onLogout: () => void;
}

export default function TeacherDashboard({ onLogout }: TeacherDashboardProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [_loading, setLoading] = useState(true);
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
    } finally {
      setLoading(false);
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
  const getStatusColor = (
    status: "Active" | "Paused" | "Unpaid"
  ): string => {
    switch (status) {
      case "Active":
        return "bg-green-600/20 text-green-400 border-green-600/30";
      case "Paused":
        return "bg-yellow-600/20 text-yellow-400 border-yellow-600/30";
      case "Unpaid":
        return "bg-red-600/20 text-red-400 border-red-600/30";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-dark-900 via-dark-800 to-dark-900">
      {/* Header */}
      <header className="border-b border-dark-700 bg-dark-800/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">GymApp</h1>
            <p className="text-dark-400 text-sm">Teacher Dashboard</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={openQuickModal}
              className="px-6 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-all duration-300"
            >
              Quick Attendance
            </button>
            <button
              onClick={onLogout}
              className="px-6 py-2 rounded-lg border border-dark-600 text-dark-200 hover:text-white hover:border-primary-600 transition-all duration-300 hover:bg-dark-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-lg border border-dark-700 bg-dark-800/50 p-6">
            <p className="text-dark-400 text-sm font-medium">Total Members</p>
            <p className="text-3xl font-bold text-white mt-2">{members.length}</p>
          </div>
          <div className="rounded-lg border border-dark-700 bg-dark-800/50 p-6">
            <p className="text-dark-400 text-sm font-medium">Active</p>
            <p className="text-3xl font-bold text-green-400 mt-2">
              {members.filter((m) => m.status === "Active").length}
            </p>
          </div>
          <div className="rounded-lg border border-dark-700 bg-dark-800/50 p-6">
            <p className="text-dark-400 text-sm font-medium">Paused</p>
            <p className="text-3xl font-bold text-yellow-400 mt-2">
              {members.filter((m) => m.status === "Paused").length}
            </p>
          </div>
          <div className="rounded-lg border border-dark-700 bg-dark-800/50 p-6">
            <p className="text-dark-400 text-sm font-medium">Unpaid</p>
            <p className="text-3xl font-bold text-red-400 mt-2">
              {members.filter((m) => m.status === "Unpaid").length}
            </p>
          </div>
        </div>

        {/* Members Section */}
        <div className="rounded-2xl border border-dark-700 bg-dark-800/50 backdrop-blur-sm">
          {/* Section Header */}
          <div className="border-b border-dark-700 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Members</h2>
              <p className="text-dark-400 text-sm">Manage your gym members</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-all duration-300 font-medium flex items-center space-x-2"
            >
              <span>+</span>
              <span>Add Member</span>
            </button>
          </div>

          {/* Members List */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-dark-300">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-dark-300">
                    Belt Level
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-dark-300">
                    Phone
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-dark-300">
                    Date of Birth
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-dark-300">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-dark-300">
                    Payment
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-dark-300">
                    Fee
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-dark-300">
                    Discount
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-dark-300">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-dark-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr
                    key={member.id}
                    className="border-b border-dark-700 hover:bg-dark-700/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-white">
                            {member.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </span>
                        </div>
                        <button
                          onClick={() => setSelectedMemberId(member.id)}
                          className="font-medium text-white hover:underline"
                        >
                          {member.name}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-dark-300">
                      {(member as any).beltLevel}
                    </td>
                    <td className="px-6 py-4 text-dark-300">
                      {(member as any).phone || "-"}
                    </td>
                    <td className="px-6 py-4 text-dark-300">
                      {(member as any).dateOfBirth ? new Date((member as any).dateOfBirth).toLocaleDateString('en-GB') : "-"}
                    </td>
                    <td className="px-6 py-4 text-dark-300">
                      {(member as any).email || "-"}
                    </td>
                    <td className="px-6 py-4 text-dark-300">
                      {(member as any).paymentType || "-"}
                    </td>
                    <td className="px-6 py-4 text-dark-300">
                      {(member as any).monthlyFee ? `$${(member as any).monthlyFee.toFixed(2)}` : "-"}
                    </td>
                    <td className="px-6 py-4 text-dark-300">
                      {(member as any).familyDiscount ? "Yes" : "No"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                          member.status
                        )}`}
                      >
                        {member.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="px-3 py-1 rounded text-sm bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-600/30 transition-all duration-300"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {members.length === 0 && (
              <div className="px-6 py-12 text-center">
                <p className="text-dark-400">No members yet. Add your first member to get started!</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-white mb-6">Add New Member</h3>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={newMember.name}
                  onChange={(e) =>
                    setNewMember({ ...newMember, name: e.target.value })
                  }
                  placeholder="Member name"
                  className="w-full px-4 py-2 rounded-lg border border-dark-600 bg-dark-700 text-white placeholder-dark-400 focus:outline-none focus:border-primary-500 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-200 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={newMember.phone}
                  onChange={(e) =>
                    setNewMember({ ...newMember, phone: e.target.value })
                  }
                  placeholder="(555) 123-4567"
                  className="w-full px-4 py-2 rounded-lg border border-dark-600 bg-dark-700 text-white placeholder-dark-400 focus:outline-none focus:border-primary-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-200 mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={newMember.date_of_birth}
                  onChange={(e) => {
                    setNewMember({ ...newMember, date_of_birth: e.target.value });
                    updateMemberFee(e.target.value, newMember.payment_type);
                  }}
                  className="w-full px-4 py-2 rounded-lg border border-dark-600 bg-dark-700 text-white focus:outline-none focus:border-primary-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-200 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={newMember.email}
                  onChange={(e) =>
                    setNewMember({ ...newMember, email: e.target.value })
                  }
                  placeholder="member@example.com"
                  className="w-full px-4 py-2 rounded-lg border border-dark-600 bg-dark-700 text-white placeholder-dark-400 focus:outline-none focus:border-primary-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-200 mb-2">
                  Payment Type
                </label>
                <select
                  value={newMember.payment_type}
                  onChange={(e) => {
                    const newPaymentType = e.target.value as "Direct Debit" | "Cash";
                    setNewMember({
                      ...newMember,
                      payment_type: newPaymentType,
                    });
                    updateMemberFee(newMember.date_of_birth, newPaymentType);
                  }}
                  className="w-full px-4 py-2 rounded-lg border border-dark-600 bg-dark-700 text-white focus:outline-none focus:border-primary-500 transition-all"
                >
                  <option>Direct Debit</option>
                  <option>Cash</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-200 mb-2">
                  Monthly Fee (€) - Calculated Automatically
                </label>
                <input
                  type="number"
                  value={newMember.fee}
                  readOnly
                  disabled
                  className="w-full px-4 py-2 rounded-lg border border-dark-600 bg-dark-700/50 text-white placeholder-dark-400 focus:outline-none cursor-not-allowed"
                />
                {newMember.fee > 0 && (
                  <p className="text-xs text-dark-400 mt-2">
                    {newMember.date_of_birth ? (
                      <>{new Date(newMember.date_of_birth).toLocaleDateString('en-GB')} • {newMember.payment_type}</>
                    ) : (
                      <>Select date of birth to calculate fee</>
                    )}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="familyDiscount"
                  type="checkbox"
                  checked={newMember.family_discount}
                  onChange={(e) =>
                    setNewMember({
                      ...newMember,
                      family_discount: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-primary-600 focus:ring-0"
                />
                <label
                  htmlFor="familyDiscount"
                  className="text-sm text-dark-300"
                >
                  Family discount
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-200 mb-2">
                  Belt Level
                </label>
                <select
                  value={newMember.belt_level}
                  onChange={(e) =>
                    setNewMember({ ...newMember, belt_level: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-dark-600 bg-dark-700 text-white focus:outline-none focus:border-primary-500 transition-all"
                >
                  <option>White Belt</option>
                  <option>Blue Belt</option>
                  <option>Purple Belt</option>
                  <option>Brown Belt</option>
                  <option>Black Belt</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-200 mb-2">
                  Status
                </label>
                <select
                  value={newMember.status}
                  onChange={(e) =>
                    setNewMember({
                      ...newMember,
                      status: e.target.value as
                        | "Active"
                        | "Paused"
                        | "Unpaid",
                    })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-dark-600 bg-dark-700 text-white focus:outline-none focus:border-primary-500 transition-all"
                >
                  <option>Active</option>
                  <option>Paused</option>
                  <option>Unpaid</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-dark-600 text-dark-200 hover:bg-dark-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-all font-medium"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8 max-w-lg w-full">
            <h3 className="text-2xl font-bold text-white mb-6">Today's Attendance</h3>
            <div className="max-h-80 overflow-y-auto mb-6">
              {members.map((m) => (
                <label
                  key={m.id}
                  className="flex items-center justify-between mb-2"
                >
                  <span className="text-white">{m.name}</span>
                  <input
                    type="checkbox"
                    checked={!!quickSelection[m.id]}
                    onChange={(e) =>
                      setQuickSelection({
                        ...quickSelection,
                        [m.id]: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-primary-600 focus:ring-0"
                  />
                </label>
              ))}
            </div>
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowQuickModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-dark-600 text-dark-200 hover:bg-dark-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleQuickSave}
                className="flex-1 px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-all font-medium"
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
