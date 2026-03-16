"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createMember, getKidBehaviorEvents, getMembers } from '../../../lib/database';
import { calculateMonthlyFee, getAgeFromDateOfBirth, getBeltOptions } from '../../../lib/types';
import { mockMembers } from './mockData';
import { AdultsFilters, KidsFilters, Member, MembersTab, QuickView } from './types';
import SearchBar from './SearchBar';
import MembersTabs from './MembersTabs';
import QuickViewsDropdown from './QuickViewsDropdown';
import { AdultsFiltersBar, KidsFiltersBar } from './FiltersBar';
import MembersTable from './MembersTable';
import RequestsList from './RequestsList';
import RowActionsMenu from './RowActionsMenu';
import TeacherSidebar from './TeacherSidebar';
import AddMemberModal, { AddMemberFormData } from './AddMemberModal';
import { BEHAVIOR_UPDATED_EVENT, readBehaviorEvents, toDateKey } from '@/lib/attendanceState';

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

type MembersAddForm = AddMemberFormData;

function normalizeStatus(rawStatus: string | undefined): Member['status'] {
  const value = String(rawStatus || '').trim().toLowerCase();
  if (value === 'pending') return 'Pending';
  if (value === 'active') return 'Active';
  if (value === 'paused') return 'Paused';
  if (value === 'unpaid') return 'Unpaid';
  return 'Active';
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

function inferKidsGroup(member: Member): Member['group'] {
  if (member.group) return member.group;
  const age = getAgeFromDateOfBirth(member.dateOfBirth);
  if (age === null) return 'Kids 1';
  if (age <= 8) return 'Kids 1';
  if (age <= 12) return 'Kids 2';
  return 'Teens';
}

function deriveKidBehaviorState(hasBad: boolean, hasGood: boolean): NonNullable<Member['behaviorState']> {
  if (hasBad) return 'attention';
  if (hasGood) return 'good';
  return 'neutral';
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

  const updateNewMemberForDateOfBirth = (dateOfBirth: string) => {
    setNewMember((prev) => {
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await getMembers();
      const to = new Date();
      const from = new Date(to);
      from.setDate(from.getDate() - 29);
      const fromDateKey = toDateKey(from);
      const toDate = toDateKey(to);

      let behaviorEvents: Awaited<ReturnType<typeof getKidBehaviorEvents>> = [];
      try {
        behaviorEvents = await getKidBehaviorEvents({ fromDateKey, toDateKey: toDate });
      } catch (error) {
        console.error('Error loading 30-day kid behavior events for members page:', error);
      }

      const localBehaviorEvents = readBehaviorEvents().filter(
        (event) => event.dateKey >= fromDateKey && event.dateKey <= toDate
      );

      const mapped = raw.map(mapDbMember);

      const behaviorByKid = new Map<string, { hasBad: boolean; hasGood: boolean }>();
      behaviorEvents.forEach((event) => {
        const current = behaviorByKid.get(event.kid_id) || { hasBad: false, hasGood: false };
        if (event.value === 'BAD') current.hasBad = true;
        if (event.value === 'GOOD') current.hasGood = true;
        behaviorByKid.set(event.kid_id, current);
      });

      localBehaviorEvents.forEach((event) => {
        const current = behaviorByKid.get(event.kidId) || { hasBad: false, hasGood: false };
        if (event.value === 'BAD') current.hasBad = true;
        if (event.value === 'GOOD') current.hasGood = true;
        behaviorByKid.set(event.kidId, current);
      });

      const withBehavior = mapped.map((member) => {
        if (!isKidsMember(member)) return member;
        const summary = behaviorByKid.get(member.id);
        return {
          ...member,
          group: inferKidsGroup(member),
          behaviorState: deriveKidBehaviorState(Boolean(summary?.hasBad), Boolean(summary?.hasGood)),
        };
      });

      const pending = withBehavior.filter((m) => m.status === 'Pending');
      const nonPending = withBehavior.filter((m) => m.status !== 'Pending');

      setAllMembers(nonPending.length > 0 ? nonPending : mockMembers);
      setRequests(pending);
    } catch (error) {
      console.error('Error loading members page data:', error);
      setAllMembers(mockMembers);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleBehaviorUpdated = () => {
      load();
    };

    window.addEventListener(BEHAVIOR_UPDATED_EVENT, handleBehaviorUpdated);
    return () => window.removeEventListener(BEHAVIOR_UPDATED_EVENT, handleBehaviorUpdated);
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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0b0b0b 0%, #101010 100%)', color: '#f0f0f0', display: 'flex' }}>
      <TeacherSidebar active="members" requestsCount={filteredRequests.length} onAddMember={() => setShowAddModal(true)} />
      <div style={{ flex: 1, padding: '26px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', marginBottom: '18px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '280px', maxWidth: '520px' }}>
            <SearchBar value={search} onDebouncedChange={setSearch} delay={300} />
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button style={{ width: '38px', height: '38px', borderRadius: '10px', border: '1px solid #252525', background: '#141414', color: '#d4d4d4', cursor: 'pointer' }}>◌</button>
            <button style={{ width: '38px', height: '38px', borderRadius: '10px', border: '1px solid #252525', background: '#141414', color: '#d4d4d4', cursor: 'pointer' }}>🔔</button>
            <button style={{ width: '38px', height: '38px', borderRadius: '999px', border: '1px solid #252525', background: '#141414', color: '#fff', cursor: 'pointer' }}>P</button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', marginBottom: '14px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '42px', lineHeight: 1, fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700 }}>Members</h1>
            <div style={{ color: '#8a8a8a', fontSize: '22px', marginTop: '6px' }}>Student Management | BJJ/Gym</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setShowAddModal(true)} style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid #CC0000', background: '#CC0000', color: '#fff', cursor: 'pointer', fontSize: '12px', letterSpacing: '1px', boxShadow: '0 8px 16px rgba(204,0,0,0.25)' }}>
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

        <MembersTabs activeTab={activeTab} onChange={setActiveTab} />

        <div style={{ marginBottom: '14px' }}>
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

      <AddMemberModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddMember}
        newMember={newMember}
        setNewMember={setNewMember}
        beltOptions={addMemberBeltOptions}
        isSubmitting={isSubmittingMember}
        submitLabel={isSubmittingMember ? 'Saving...' : 'Save member'}
        onNameChange={(name) => {
          const nextNum = (allMembers.length + 1).toString().padStart(3, '0');
          setNewMember((prev) => ({ ...prev, name, ref: `GBCQ${nextNum}` }));
        }}
        onDateOfBirthChange={updateNewMemberForDateOfBirth}
        onPaymentTypeChange={(newPaymentType) => {
          setNewMember((prev) => ({
            ...prev,
            payment_type: newPaymentType,
            fee: calculateMonthlyFee(prev.date_of_birth, newPaymentType),
          }));
        }}
        studentNumberReadOnly
        studentNumberPlaceholder="Auto-generated (GBCQ###)"
        feeReadOnly
        feeLabel="Monthly Fee (€) - Auto-Calculated"
      />
    </div>
  );
}
