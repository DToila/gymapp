"use client";

import { useEffect, useState } from 'react';
import StudentShell from './StudentShell';
import { useStudentMember } from './useStudentMember';
import { updateMember } from '../../../lib/database';

export default function StudentProfilePage() {
  const { member, refresh } = useStudentMember();
  const [isSaving, setIsSaving] = useState(false);
  const [phone, setPhone] = useState(member?.phone || '');
  const [email, setEmail] = useState(member?.email || '');

  useEffect(() => {
    setPhone(member?.phone || '');
    setEmail(member?.email || '');
  }, [member?.phone, member?.email]);

  const handleSave = async () => {
    if (!member) return;
    setIsSaving(true);
    try {
      await updateMember(member.id, { phone, email });
      await refresh(member.id);
    } catch (error) {
      console.error('Error updating student profile:', error);
      alert('Could not update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <StudentShell active="profile" title="Perfil" subtitle="Manage your basic account information">
      <section className="rounded-2xl border border-[#222] bg-[#121212] p-4 shadow-[0_8px_22px_rgba(0,0,0,0.35)]">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-1 text-xs uppercase tracking-[0.12em] text-zinc-500">Name</p>
            <div className="rounded-xl border border-[#2a2a2a] bg-[#171717] px-3 py-2 text-zinc-100">{member?.name || '—'}</div>
          </div>
          <div>
            <p className="mb-1 text-xs uppercase tracking-[0.12em] text-zinc-500">Belt</p>
            <div className="rounded-xl border border-[#2a2a2a] bg-[#171717] px-3 py-2 text-zinc-100">{member?.belt_level || '—'}</div>
          </div>
          <div>
            <p className="mb-1 text-xs uppercase tracking-[0.12em] text-zinc-500">Email</p>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-[#2a2a2a] bg-[#171717] px-3 py-2 text-zinc-100 outline-none" />
          </div>
          <div>
            <p className="mb-1 text-xs uppercase tracking-[0.12em] text-zinc-500">Phone</p>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-xl border border-[#2a2a2a] bg-[#171717] px-3 py-2 text-zinc-100 outline-none" />
          </div>
          <div>
            <p className="mb-1 text-xs uppercase tracking-[0.12em] text-zinc-500">Membership status</p>
            <div className="rounded-xl border border-[#2a2a2a] bg-[#171717] px-3 py-2 text-zinc-100">{member?.status || '—'}</div>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-xl border border-[#c81d25] bg-[#c81d25] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {isSaving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </section>
    </StudentShell>
  );
}
