'use client';

import { useState } from 'react';
import TeacherSidebar from '@/components/members/TeacherSidebar';
import { defaultAcademySettings, mockStaffMembers, defaultPricingRules } from '@/components/settings/mockData';
import { AcademySettings, PricingRules } from '@/components/settings/types';

export default function SettingsPage() {
  const [academySettings, setAcademySettings] = useState<AcademySettings>(defaultAcademySettings);
  const [pricingRules, setPricingRules] = useState<PricingRules>(defaultPricingRules);
  const [showInviteStaff, setShowInviteStaff] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'coach' | 'staff'>('coach');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleSaveAcademy = () => {
    console.log('Saving academy settings:', academySettings);
    setSaveMessage('Academy settings saved!');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleSavePricing = () => {
    console.log('Saving pricing rules:', pricingRules);
    setSaveMessage('Pricing rules saved!');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleInviteStaff = () => {
    if (inviteEmail) {
      console.log('Inviting staff:', inviteEmail, 'as', inviteRole);
      setSaveMessage(`Invitation sent to ${inviteEmail}!`);
      setShowInviteStaff(false);
      setInviteEmail('');
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  return (
    <div className="flex h-screen bg-[#0b0b0b]">
      <TeacherSidebar active="settings" />

      <main className="ml-[260px] flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-[#222] bg-[#0d0d0d] px-8 py-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Definições</h1>
            <p className="mt-1 text-sm text-zinc-500">Manage academy config, staff roles, and pricing rules</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-8 space-y-6 max-w-4xl">
            {/* Save Message */}
            {saveMessage && (
              <div className="rounded-2xl border border-[#22c55e]/50 bg-[#22c55e]/10 px-4 py-3 text-[#22c55e]">
                {saveMessage}
              </div>
            )}

            {/* Academy Section */}
            <div className="rounded-2xl border border-[#222] bg-[#121212] p-6">
              <h2 className="mb-4 text-xl font-semibold text-white">Academy</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-2">Academy Name</label>
                  <input
                    type="text"
                    value={academySettings.name}
                    onChange={(e) => setAcademySettings({ ...academySettings, name: e.target.value })}
                    className="w-full rounded-lg border border-[#222] bg-[#0f0f0f] px-3 py-2.5 text-white focus:border-[#c81d25] focus:outline-none transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-2">Address</label>
                    <input
                      type="text"
                      value={academySettings.address}
                      onChange={(e) => setAcademySettings({ ...academySettings, address: e.target.value })}
                      className="w-full rounded-lg border border-[#222] bg-[#0f0f0f] px-3 py-2.5 text-white focus:border-[#c81d25] focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-2">City</label>
                    <input
                      type="text"
                      value={academySettings.city}
                      onChange={(e) => setAcademySettings({ ...academySettings, city: e.target.value })}
                      className="w-full rounded-lg border border-[#222] bg-[#0f0f0f] px-3 py-2.5 text-white focus:border-[#c81d25] focus:outline-none transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-2">Phone</label>
                    <input
                      type="tel"
                      value={academySettings.phone}
                      onChange={(e) => setAcademySettings({ ...academySettings, phone: e.target.value })}
                      className="w-full rounded-lg border border-[#222] bg-[#0f0f0f] px-3 py-2.5 text-white focus:border-[#c81d25] focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-2">Email</label>
                    <input
                      type="email"
                      value={academySettings.email}
                      onChange={(e) => setAcademySettings({ ...academySettings, email: e.target.value })}
                      className="w-full rounded-lg border border-[#222] bg-[#0f0f0f] px-3 py-2.5 text-white focus:border-[#c81d25] focus:outline-none transition"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveAcademy}
                  className="rounded-lg bg-[#c81d25] px-6 py-2.5 font-semibold text-white hover:bg-[#b01720] transition mt-4"
                >
                  Save Academy Settings
                </button>
              </div>
            </div>

            {/* Staff/Roles Section */}
            <div className="rounded-2xl border border-[#222] bg-[#121212] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Staff & Roles</h2>
                <button
                  onClick={() => setShowInviteStaff(!showInviteStaff)}
                  className="rounded-lg bg-[#c81d25] px-4 py-2 font-semibold text-white hover:bg-[#b01720] transition text-sm"
                >
                  + Invite Staff
                </button>
              </div>

              {showInviteStaff && (
                <div className="mb-6 rounded-lg border border-[#222] bg-[#0f0f0f] p-4 space-y-3">
                  <div>
                    <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-2">Email</label>
                    <input
                      type="email"
                      placeholder="coach@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full rounded-lg border border-[#222] bg-[#121212] px-3 py-2.5 text-white focus:border-[#c81d25] focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-2">Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as any)}
                      className="w-full rounded-lg border border-[#222] bg-[#121212] px-3 py-2.5 text-white focus:border-[#c81d25] focus:outline-none transition"
                    >
                      <option value="coach">Coach</option>
                      <option value="admin">Admin</option>
                      <option value="staff">Staff</option>
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleInviteStaff}
                      className="flex-1 rounded-lg bg-[#c81d25] px-4 py-2 font-semibold text-white hover:bg-[#b01720] transition"
                    >
                      Send Invitation
                    </button>
                    <button
                      onClick={() => setShowInviteStaff(false)}
                      className="flex-1 rounded-lg border border-[#222] px-4 py-2 font-semibold text-white hover:bg-[#0f0f0f] transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {mockStaffMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between rounded-lg border border-[#1f1f1f] bg-[#0f0f0f] px-4 py-3">
                    <div>
                      <p className="font-medium text-white">{member.full_name}</p>
                      <p className="text-xs text-zinc-500">{member.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-[#c81d25]/20 text-[#c81d25] border border-[#c81d25]/30">
                        {member.role === 'admin' ? 'Admin' : member.role === 'coach' ? 'Coach' : 'Staff'}
                      </span>
                      <button className="text-zinc-400 hover:text-white transition">⋯</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing Rules Section */}
            <div className="rounded-2xl border border-[#222] bg-[#121212] p-6">
              <h2 className="mb-4 text-xl font-semibold text-white">Pricing Rules</h2>

              <div className="space-y-6">
                {/* Adult Pricing */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-300 mb-3 uppercase tracking-wide">Adult Prices</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-2">Direct Debit (€)</label>
                      <input
                        type="number"
                        value={pricingRules.adultDd}
                        onChange={(e) => setPricingRules({ ...pricingRules, adultDd: Number(e.target.value) })}
                        className="w-full rounded-lg border border-[#222] bg-[#0f0f0f] px-3 py-2.5 text-white focus:border-[#c81d25] focus:outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-2">Non-DD (€)</label>
                      <input
                        type="number"
                        value={pricingRules.adultNonDd}
                        onChange={(e) => setPricingRules({ ...pricingRules, adultNonDd: Number(e.target.value) })}
                        className="w-full rounded-lg border border-[#222] bg-[#0f0f0f] px-3 py-2.5 text-white focus:border-[#c81d25] focus:outline-none transition"
                      />
                    </div>
                  </div>
                </div>

                {/* Kids Pricing */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-300 mb-3 uppercase tracking-wide">Kids Prices</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-2">Direct Debit (€)</label>
                      <input
                        type="number"
                        value={pricingRules.kidsDd}
                        onChange={(e) => setPricingRules({ ...pricingRules, kidsDd: Number(e.target.value) })}
                        className="w-full rounded-lg border border-[#222] bg-[#0f0f0f] px-3 py-2.5 text-white focus:border-[#c81d25] focus:outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-2">Non-DD (€)</label>
                      <input
                        type="number"
                        value={pricingRules.kidsNonDd}
                        onChange={(e) => setPricingRules({ ...pricingRules, kidsNonDd: Number(e.target.value) })}
                        className="w-full rounded-lg border border-[#222] bg-[#0f0f0f] px-3 py-2.5 text-white focus:border-[#c81d25] focus:outline-none transition"
                      />
                    </div>
                  </div>
                </div>

                {/* Discounts */}
                <div className="border-t border-[#222] pt-6">
                  <h3 className="text-sm font-semibold text-zinc-300 mb-3 uppercase tracking-wide">Discounts</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-2">Family Discount (€)</label>
                      <input
                        type="number"
                        value={pricingRules.familyDiscount}
                        onChange={(e) => setPricingRules({ ...pricingRules, familyDiscount: Number(e.target.value) })}
                        className="w-full rounded-lg border border-[#222] bg-[#0f0f0f] px-3 py-2.5 text-white focus:border-[#c81d25] focus:outline-none transition"
                      />
                      <p className="mt-1 text-xs text-zinc-500">Applied per family member if 2+ members</p>
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-2">Annual Discount (%)</label>
                      <input
                        type="number"
                        value={pricingRules.annualDiscount}
                        onChange={(e) => setPricingRules({ ...pricingRules, annualDiscount: Number(e.target.value) })}
                        className="w-full rounded-lg border border-[#222] bg-[#0f0f0f] px-3 py-2.5 text-white focus:border-[#c81d25] focus:outline-none transition"
                      />
                      <p className="mt-1 text-xs text-zinc-500">Cannot combine with family discount</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-[#0f0f0f] border border-[#222] p-4">
                  <p className="text-xs text-zinc-400 mb-2">
                    <span className="font-semibold text-zinc-300">Rules:</span>
                  </p>
                  <ul className="text-xs text-zinc-400 space-y-1">
                    <li>• Family discount: 1 member = no discount, 2+ members = all get €{pricingRules.familyDiscount}</li>
                    <li>• Annual discount: 10% off non-DD monthly value</li>
                    <li>• Family and Annual discounts cannot be combined</li>
                    <li>• Billing month is calendar month (1st to last day)</li>
                  </ul>
                </div>

                <button
                  onClick={handleSavePricing}
                  className="rounded-lg bg-[#c81d25] px-6 py-2.5 font-semibold text-white hover:bg-[#b01720] transition"
                >
                  Save Pricing Rules
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
