"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createMember, getMembers } from '../../../lib/database';
import { getAgeFromDateOfBirth } from '../../../lib/types';
import { mockMembers, mockRequests } from './mockData';
import { AdultsFilters, KidsFilters, Member, MembersTab, QuickView } from './types';
import SearchBar from './SearchBar';
import MembersTabs from './MembersTabs';
import QuickViewsDropdown from './QuickViewsDropdown';
import { AdultsFiltersBar, KidsFiltersBar } from './FiltersBar';
import MembersTable from './MembersTable';
import RequestsList from './RequestsList';
import RowActionsMenu from './RowActionsMenu';
import TeacherSidebar from './TeacherSidebar';

const initialAdultsFilters: AdultsFilters = {
  status: 'all',
  belt: 'all',
  payment: 'all',
  sort: 'recent'
};

const initialKidsFilters: KidsFilters = {
  group: 'all',
  behavior: 'all',
  sort: 'recent'
};

interface MembersAddForm {
  name: string;
  belt_level: string;
  status: 'Active' | 'Paused' | 'Unpaid';
  phone: string;
  email: string;
  payment_type: 'Direct Debit' | 'Cash';
  fee: number;
  family_discount: boolean;
  date_of_birth: string;
  iban: string;
  nif: string;
  ref: string;
  custom_fee: boolean;
  custom_fee_amount: number;
}

function normalizeStatus(rawStatus: string | undefined): Member['status'] {
  const value = String(rawStatus || '').trim().toLowerCase();
  if (value === 'active') return 'Active';
  if (value === 'paused') return 'Paused';
  if (value === 'unpaid') return 'Unpaid';
  return 'Pending';
}

function toTitleBelt(rawBelt: string | undefined): string {
  const value = String(rawBelt || 'White').trim().replace(' Belt', '');
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function mapDbMember(member: any): Member {
  const status = normalizeStatus(member.status);
  return {
    id: member.id,
    name: member.name,
    email: member.email,
    phone: member.phone,
    belt: toTitleBelt(member.belt_level),
    status,
    paymentMethod: member.payment_type || undefined,
    fee: Number(member.fee || 0),
    amountDue: status === 'Unpaid' ? Number(member.fee || 0) : 0,
    nextPaymentDate: undefined,
    behaviorState: undefined,
    enrolledAt: (member.created_at || '').split('T')[0] || '',
    dateOfBirth: member.date_of_birth,
    lastAttendanceAt: undefined,
    requestStatus: status === 'Pending' ? 'Pending' : undefined,
    group: undefined
  };
}

function isKidsMember(member: Member): boolean {
  if (member.group || member.behaviorState) return true;
  const age = getAgeFromDateOfBirth(member.dateOfBirth);
  return age !== null && age < 16;
}

function isWithinNext7DaysBirthday(dateOfBirth?: string): boolean {
  if (!dateOfBirth) return false;
  const birth = new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) return false;
  const now = new Date();
  const thisYear = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
  const nextBirthday = thisYear < now ? new Date(now.getFullYear() + 1, birth.getMonth(), birth.getDate()) : thisYear;
  const diffDays = Math.ceil((nextBirthday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 7;
}

function isNewThisMonth(enrolledAt?: string): boolean {
  if (!enrolledAt) return false;
  const date = new Date(enrolledAt);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

function isInactive(lastAttendanceAt?: string): boolean {
  if (!lastAttendanceAt) return true;
  const last = new Date(lastAttendanceAt);
  if (Number.isNaN(last.getTime())) return true;
  const days = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
  return days > 30;
}

export default function MembersPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MembersTab>('adults');
  const [search, setSearch] = useState('');
  const [quickView, setQuickView] = useState<QuickView>('recent');
  const [adultsFilters, setAdultsFilters] = useState<AdultsFilters>(initialAdultsFilters);
  const [kidsFilters, setKidsFilters] = useState<KidsFilters>(initialKidsFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);
  const [newMember, setNewMember] = useState<MembersAddForm>({
    name: '',
    belt_level: 'White Belt',
    status: 'Active',
    phone: '',
    email: '',
    payment_type: 'Direct Debit',
    fee: 0,
    family_discount: false,
    date_of_birth: '',
    iban: '',
    nif: '',
    ref: '',
    custom_fee: false,
    custom_fee_amount: 0,
  });
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<Member[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await getMembers();
      const mapped = raw.map(mapDbMember);
      const pending = mapped.filter((m) => m.status === 'Pending');
      const nonPending = mapped.filter((m) => m.status !== 'Pending');

      setAllMembers(nonPending.length > 0 ? nonPending : mockMembers);
      setRequests(pending.length > 0 ? pending : mockRequests);
    } catch (error) {
      console.error('Error loading members page data:', error);
      setAllMembers(mockMembers);
      setRequests(mockRequests);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('openAddMember') === '1') {
      setShowAddModal(true);
      router.replace('/members');
    }
  }, [router]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, search, quickView, adultsFilters, kidsFilters, pageSize]);

  useEffect(() => {
    if (activeTab === 'adults') {
      if (quickView === 'unpaid') {
        setAdultsFilters((prev) => ({ ...prev, status: 'unpaid', sort: 'paymentDue' }));
      } else if (quickView === 'recent') {
        setAdultsFilters((prev) => ({ ...prev, status: 'all', sort: 'recent' }));
      }
    }

    if (activeTab === 'kids') {
      if (quickView === 'recent') {
        setKidsFilters((prev) => ({ ...prev, sort: 'recent' }));
      }
      if (quickView === 'inactive') {
        setKidsFilters((prev) => ({ ...prev, sort: 'attentionFirst' }));
      }
    }
  }, [quickView, activeTab]);

  const adultsSource = useMemo(() => allMembers.filter((member) => !isKidsMember(member)), [allMembers]);
  const kidsSource = useMemo(() => allMembers.filter((member) => isKidsMember(member)), [allMembers]);

  const filteredAdults = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = adultsSource
      .filter((member) => {
        if (!q) return true;
        return `${member.name} ${member.email || ''} ${member.phone || ''}`.toLowerCase().includes(q);
      })
      .filter((member) => {
        if (adultsFilters.status === 'all') return true;
        if (adultsFilters.status === 'active') return member.status === 'Active';
        if (adultsFilters.status === 'paused') return member.status === 'Paused';
        return member.status === 'Unpaid' || (member.amountDue || 0) > 0;
      })
      .filter((member) => adultsFilters.belt === 'all' || String(member.belt || '').toLowerCase() === adultsFilters.belt.toLowerCase())
      .filter((member) => adultsFilters.payment === 'all' || member.paymentMethod === adultsFilters.payment)
      .filter((member) => {
        if (quickView === 'unpaid') return (member.amountDue || 0) > 0 || member.status === 'Unpaid';
        if (quickView === 'birthdays') return isWithinNext7DaysBirthday(member.dateOfBirth);
        if (quickView === 'newThisMonth') return isNewThisMonth(member.enrolledAt);
        if (quickView === 'inactive') return isInactive(member.lastAttendanceAt);
        return true;
      });

    if (adultsFilters.sort === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (adultsFilters.sort === 'paymentDue') {
      result.sort((a, b) => (b.amountDue || 0) - (a.amountDue || 0));
    } else {
      result.sort((a, b) => new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime());
    }

    return result;
  }, [adultsSource, search, adultsFilters, quickView]);

  const filteredKids = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = kidsSource
      .filter((member) => {
        if (!q) return true;
        return `${member.name} ${member.email || ''} ${member.phone || ''}`.toLowerCase().includes(q);
      })
      .filter((member) => kidsFilters.group === 'all' || member.group === kidsFilters.group)
      .filter((member) => kidsFilters.behavior === 'all' || member.behaviorState === kidsFilters.behavior)
      .filter((member) => {
        if (quickView === 'birthdays') return isWithinNext7DaysBirthday(member.dateOfBirth);
        if (quickView === 'newThisMonth') return isNewThisMonth(member.enrolledAt);
        if (quickView === 'inactive') return isInactive(member.lastAttendanceAt);
        return true;
      });

    if (kidsFilters.sort === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (kidsFilters.sort === 'attentionFirst') {
      result.sort((a, b) => Number(a.behaviorState !== 'attention') - Number(b.behaviorState !== 'attention'));
    } else {
      result.sort((a, b) => new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime());
    }

    return result;
  }, [kidsSource, search, kidsFilters, quickView]);

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests
      .filter((member) => {
        if (!q) return true;
        return `${member.name} ${member.email || ''} ${member.phone || ''}`.toLowerCase().includes(q);
      })
      .sort((a, b) => new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime());
  }, [requests, search]);

  const currentRows = activeTab === 'adults' ? filteredAdults : activeTab === 'kids' ? filteredKids : filteredRequests;
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return currentRows.slice(start, start + pageSize);
  }, [currentRows, page, pageSize]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingMember) return;
    if (!newMember.name.trim()) return;

    setIsSubmittingMember(true);
    try {
      const payload: any = {
        name: newMember.name,
        belt_level: newMember.belt_level,
        status: newMember.status,
        created_at: new Date().toISOString(),
        phone: newMember.phone || undefined,
        email: newMember.email || undefined,
        payment_type: newMember.payment_type,
        fee: Number(newMember.fee || 0),
        family_discount: Boolean(newMember.family_discount),
        date_of_birth: newMember.date_of_birth || undefined,
        iban: newMember.iban || undefined,
        nif: newMember.nif || undefined,
        ref: newMember.ref || undefined,
        custom_fee: Boolean(newMember.custom_fee),
        custom_fee_amount: Number(newMember.custom_fee_amount || 0),
      };

      await createMember(payload);
      setShowAddModal(false);
      setNewMember({
        name: '',
        belt_level: 'White Belt',
        status: 'Active',
        phone: '',
        email: '',
        payment_type: 'Direct Debit',
        fee: 0,
        family_discount: false,
        date_of_birth: '',
        iban: '',
        nif: '',
        ref: '',
        custom_fee: false,
        custom_fee_amount: 0,
      });
      await load();
    } catch (error) {
      console.error('Error creating member from members page:', error);
      alert('Error creating member. Please try again.');
    } finally {
      setIsSubmittingMember(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f0f0f0', display: 'flex' }}>
      <TeacherSidebar active="members" requestsCount={filteredRequests.length} onAddMember={() => setShowAddModal(true)} />
      <div style={{ flex: 1, padding: '26px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', marginBottom: '14px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '30px', letterSpacing: '2px', fontFamily: '"Barlow Condensed", sans-serif' }}>Members</h1>
            <div style={{ color: '#868686', fontSize: '12px', marginTop: '4px' }}>Student management | BJJ/Gym</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setShowAddModal(true)} style={{ padding: '10px 12px', border: '1px solid #CC0000', background: '#CC0000', color: '#fff', cursor: 'pointer', fontSize: '12px', letterSpacing: '1px' }}>
              + Add member
            </button>
            <RowActionsMenu
              options={[
                { key: 'import', label: 'Import', onClick: () => {} },
                { key: 'export', label: 'Export', onClick: () => {} },
                { key: 'bulk', label: 'Bulk actions', onClick: () => {} }
              ]}
            />
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <SearchBar value={search} onDebouncedChange={setSearch} delay={300} />
        </div>

        <MembersTabs activeTab={activeTab} onChange={setActiveTab} />

        <div style={{ marginBottom: '12px' }}>
          <QuickViewsDropdown value={quickView} onChange={setQuickView} />
        </div>

        {activeTab === 'adults' && <AdultsFiltersBar value={adultsFilters} onChange={setAdultsFilters} />}
        {activeTab === 'kids' && <KidsFiltersBar value={kidsFilters} onChange={setKidsFilters} />}

        {activeTab === 'requests' ? (
          <RequestsList items={filteredRequests} search={search} />
        ) : (
          <MembersTable
            mode={activeTab}
            rows={paginatedRows}
            loading={loading}
            page={page}
            pageSize={pageSize}
            totalItems={currentRows.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onRowClick={(member) => router.push(`/members/${member.id}`)}
            onClearFilters={() => {
              setSearch('');
              setQuickView('recent');
              setAdultsFilters(initialAdultsFilters);
              setKidsFilters(initialKidsFilters);
            }}
          />
        )}
      </div>
      </div>

      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <form onSubmit={handleAddMember} style={{ width: '100%', maxWidth: '560px', maxHeight: '88vh', overflowY: 'auto', background: '#111111', border: '1px solid #2a2a2a', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '24px', letterSpacing: '2px' }}>Add New Member</div>
              <button type="button" onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#999', cursor: 'pointer', padding: '4px 8px' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <input placeholder="Name" value={newMember.name} onChange={(e) => setNewMember((p) => ({ ...p, name: e.target.value }))} style={{ gridColumn: '1 / -1', padding: '10px', background: '#0d0d0d', border: '1px solid #2a2a2a', color: '#f0f0f0' }} required />
              <input placeholder="Email" value={newMember.email} onChange={(e) => setNewMember((p) => ({ ...p, email: e.target.value }))} style={{ padding: '10px', background: '#0d0d0d', border: '1px solid #2a2a2a', color: '#f0f0f0' }} />
              <input placeholder="Phone" value={newMember.phone} onChange={(e) => setNewMember((p) => ({ ...p, phone: e.target.value }))} style={{ padding: '10px', background: '#0d0d0d', border: '1px solid #2a2a2a', color: '#f0f0f0' }} />
              <input placeholder="Date of birth (YYYY-MM-DD)" value={newMember.date_of_birth} onChange={(e) => setNewMember((p) => ({ ...p, date_of_birth: e.target.value }))} style={{ padding: '10px', background: '#0d0d0d', border: '1px solid #2a2a2a', color: '#f0f0f0' }} />
              <input placeholder="Student Ref" value={newMember.ref} onChange={(e) => setNewMember((p) => ({ ...p, ref: e.target.value }))} style={{ padding: '10px', background: '#0d0d0d', border: '1px solid #2a2a2a', color: '#f0f0f0' }} />
              <input placeholder="IBAN" value={newMember.iban} onChange={(e) => setNewMember((p) => ({ ...p, iban: e.target.value }))} style={{ padding: '10px', background: '#0d0d0d', border: '1px solid #2a2a2a', color: '#f0f0f0' }} />
              <input placeholder="NIF" value={newMember.nif} onChange={(e) => setNewMember((p) => ({ ...p, nif: e.target.value }))} style={{ padding: '10px', background: '#0d0d0d', border: '1px solid #2a2a2a', color: '#f0f0f0' }} />
              <input type="number" placeholder="Fee" value={newMember.fee} onChange={(e) => setNewMember((p) => ({ ...p, fee: Number(e.target.value || 0) }))} style={{ padding: '10px', background: '#0d0d0d', border: '1px solid #2a2a2a', color: '#f0f0f0' }} />
              <select value={newMember.belt_level} onChange={(e) => setNewMember((p) => ({ ...p, belt_level: e.target.value }))} style={{ padding: '10px', background: '#0d0d0d', border: '1px solid #2a2a2a', color: '#f0f0f0' }}>
                <option>White Belt</option>
                <option>Grey Belt</option>
                <option>Yellow Belt</option>
                <option>Orange Belt</option>
                <option>Green Belt</option>
                <option>Blue Belt</option>
                <option>Purple Belt</option>
                <option>Brown Belt</option>
                <option>Black Belt</option>
              </select>
              <select value={newMember.status} onChange={(e) => setNewMember((p) => ({ ...p, status: e.target.value as any }))} style={{ padding: '10px', background: '#0d0d0d', border: '1px solid #2a2a2a', color: '#f0f0f0' }}>
                <option value="Active">Active</option>
                <option value="Paused">Paused</option>
                <option value="Unpaid">Unpaid</option>
              </select>
              <select value={newMember.payment_type} onChange={(e) => setNewMember((p) => ({ ...p, payment_type: e.target.value as any }))} style={{ padding: '10px', background: '#0d0d0d', border: '1px solid #2a2a2a', color: '#f0f0f0' }}>
                <option value="Direct Debit">Direct Debit</option>
                <option value="Cash">Cash</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
              <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '10px 12px', border: '1px solid #2a2a2a', background: 'transparent', color: '#bbb', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={isSubmittingMember} style={{ padding: '10px 12px', border: '1px solid #CC0000', background: '#CC0000', color: '#fff', cursor: 'pointer' }}>{isSubmittingMember ? 'Saving...' : 'Save member'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
