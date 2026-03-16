"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getMembers } from '../../../lib/database';
import { getAgeFromDateOfBirth } from '../../../lib/types';
import { mockMembers, mockRequests } from './mockData';
import { AdultsFilters, KidsFilters, Member, MembersTab, QuickView } from './types';
import SearchBar from './SearchBar';
import MembersTabs from './MembersTabs';
import QuickViewsDropdown from './QuickViewsDropdown';
import { AdultsFiltersBar, KidsFiltersBar } from './FiltersBar';
import MembersTable from './MembersTable';
import RequestsList from './RequestsList';
import MemberDrawer from './MemberDrawer';
import RowActionsMenu from './RowActionsMenu';

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
  const [activeTab, setActiveTab] = useState<MembersTab>('adults');
  const [search, setSearch] = useState('');
  const [quickView, setQuickView] = useState<QuickView>('recent');
  const [adultsFilters, setAdultsFilters] = useState<AdultsFilters>(initialAdultsFilters);
  const [kidsFilters, setKidsFilters] = useState<KidsFilters>(initialKidsFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

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

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f0f0f0', padding: '26px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', marginBottom: '14px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '30px', letterSpacing: '2px', fontFamily: '"Barlow Condensed", sans-serif' }}>Members</h1>
            <div style={{ color: '#868686', fontSize: '12px', marginTop: '4px' }}>Student management | BJJ/Gym</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={{ padding: '10px 12px', border: '1px solid #CC0000', background: '#CC0000', color: '#fff', cursor: 'pointer', fontSize: '12px', letterSpacing: '1px' }}>
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
            onRowClick={setSelectedMember}
            onClearFilters={() => {
              setSearch('');
              setQuickView('recent');
              setAdultsFilters(initialAdultsFilters);
              setKidsFilters(initialKidsFilters);
            }}
          />
        )}
      </div>

      <MemberDrawer member={selectedMember} onClose={() => setSelectedMember(null)} />
    </div>
  );
}
