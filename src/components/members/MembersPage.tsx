"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createMember, getKidBehaviorEvents, getMembers } from '../../../lib/database';
import { calculateMonthlyFee, getAgeFromDateOfBirth, getBeltOptions } from '../../../lib/types';
import { mockMembers } from './mockData';
import { AdultsFilters, KidsFilters, MembersTab, QuickView } from './types';
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

function normalizeStatus(rawStatus: string | undefined): any {
  const value = String(rawStatus || '').trim().toLowerCase();
  if (value === 'pendente') return 'Pending';
  if (value === 'ativo') return 'Active';
  if (value === 'pausado') return 'Paused';
  if (value === 'unpaid') return 'Unpaid';
  if (value === 'pending') return 'Pending';
  return 'Active';
}

function toTitleBelt(rawBelt: string | undefined): string {
  const value = String(rawBelt || 'White').trim().replace(' Cinto', '');
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function mapDbMember(member: any): any {
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

function isKidsMember(member: any): boolean {
  if (member.group || member.behaviorState) return true;
  const age = getAgeFromDateOfBirth(member.dateOfBirth);
  return age !== null && age < 16;
}

function inferKidsGroup(member: any): any {
  if (member.group) return member.group;
  const age = getAgeFromDateOfBirth(member.dateOfBirth);
  if (age === null) return 'Crianças 1';
  if (age <= 8) return 'Crianças 1';
  if (age <= 12) return 'Crianças 2';
  return 'Teens';
}

function deriveKidBehaviorState(hasBad: boolean, hasGood: boolean): any {
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
  const formattedDate = new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
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
    belt_level: 'White Cinto',
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
    emergency_contact_name: '',
    emergency_contact_phone: '',
    address: '',
    postal_code: '',
    city: '',
    billing_name: '',
    billing_nif: '',
    source: '',
  });
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);

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
        console.error('Erro loading 30-day kid behavior events for members page:', error);
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

      const pendente = withBehavior.filter((m) => m.status === 'Pending');
      const nonPending = withBehavior.filter((m) => m.status !== 'Pending');

      setAllMembers(nonPending.length > 0 ? nonPending : mockMembers);
      setRequests(pendente);
    } catch (error) {
      console.error('Erro loading members page data:', error);
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
        emergency_contact_name: newMember.emergency_contact_name || undefined,
        emergency_contact_phone: newMember.emergency_contact_phone || undefined,
        address: newMember.address || undefined,
        postal_code: newMember.postal_code || undefined,
        city: newMember.city || undefined,
        billing_name: newMember.billing_name || undefined,
        billing_nif: newMember.billing_nif || undefined,
        source: newMember.source || undefined,
      };

      await createMember(payload);
      setShowAddModal(false);
      setNewMember({
        name: '',
        belt_level: 'White Cinto',
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
        emergency_contact_name: '',
        emergency_contact_phone: '',
        address: '',
        postal_code: '',
        city: '',
        billing_name: '',
        billing_nif: '',
        source: '',
      });
      await load();
    } catch (error) {
      console.error('Erro creating member from members page:', error);
      alert('Erro creating member. Please try again.');
    } finally {
      setIsSubmittingMember(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0b0b0b 0%, #101010 100%)', color: '#f0f0f0', display: 'flex' }}>
      <TeacherSidebar ativo="members" requestsCount={filteredRequests.length} onAddMember={() => setShowAddModal(true)} />
      <div className="flex-1 p-3 sm:p-5 lg:p-7">
      <div className="mx-auto max-w-[1280px]">
        {/* Hero */}
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium uppercase tracking-widest text-zinc-500 capitalize sm:text-xs">{formattedDate}</p>
            <h1 className="text-4xl font-black leading-tight text-white">
              Gestão de <span className="text-[#c81d25]">Membros</span>
            </h1>
            <p className="mt-1 text-sm text-zinc-500">Alunos BJJ/Gym</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 rounded-xl bg-[#c81d25] px-4 py-3 text-base font-semibold text-white hover:bg-[#a8141c] transition-colors sm:py-2.5 sm:text-sm">
              + Adicionar Membro
            </button>
            <RowActionsMenu
              options={[
                { key: 'import', label: 'Import', onClick: () => {} },
                { key: 'export', label: 'Export', onClick: () => {} },
                { key: 'bulk', label: 'Bulk actions', onClick: () => {} }
              ]}
            />
          </div>
        </header>

        {/* Search toolbar */}
        <div className="mb-4 flex w-full max-w-[520px]">
          <SearchBar value={search} onDebouncedChange={setSearch} delay={300} />
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
        submitLabel={isSubmittingMember ? 'Saving...' : 'Guardar member'}
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
        feeLabel="Taxa Mensal (€) - Auto-Calculated"
      />
    </div>
  );
}
