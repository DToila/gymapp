'use client';

import { useState } from 'react';
import TeacherSidebar from '@/components/members/TeacherSidebar';
import { mockLeads, mockRequests, mockLeadStats } from '@/components/leads/mockData';
import LeadsTable from '@/components/leads/LeadsTable';
import RequestsTable from '@/components/leads/RequestsTable';
import StatsTab from '@/components/leads/StatsTab';
import {
  Lead,
  LeadRequest,
  LEAD_CLASS_TYPES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  NOT_ENROLLED_REASONS,
} from '@/components/leads/types';

const emptyLead = (): Lead => ({
  id: `lead-${Date.now()}`,
  name: '',
  contact_source: 'Website',
  contact_date: new Date().toISOString().slice(0, 10),
  phone: '',
  email: '',
  class_type: 'GB1',
  notes: '',
  next_contact_date: '',
  followup_note: '',
  status: 'new',
  trial_date: '',
  enrolled: false,
  not_enrolled_reason: undefined,
  not_enrolled_reason_text: '',
});

const todayKey = () => new Date().toISOString().slice(0, 10);

const statusLabel = (status: Lead['status']) => {
  const labels: Record<Lead['status'], string> = {
    new: 'New',
    contacted: 'Contacted',
    trial_booked: 'Trial Booked',
    trial_done: 'Trial Done',
    lost: 'Lost',
    converted_to_request: 'Converted',
  };
  return labels[status];
};

const applyLeadStatusRules = (lead: Lead): Lead => {
  if (lead.enrolled) {
    return {
      ...lead,
      status: 'converted_to_request',
      not_enrolled_reason: undefined,
      not_enrolled_reason_text: '',
    };
  }

  if (!lead.enrolled && lead.not_enrolled_reason) {
    return { ...lead, status: 'lost' };
  }

  return lead;
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>(mockLeads);
  const [activeTab, setActiveTab] = useState<'leads' | 'requests' | 'stats'>('leads');
  const [searchQuery, setSearchQuery] = useState('');
  const [followupFilter, setFollowupFilter] = useState<'all' | 'overdue'>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isLeadDrawerOpen, setIsLeadDrawerOpen] = useState(false);
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [dedupeWarning, setDedupeWarning] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<LeadRequest | null>(null);

  const isOverdueFollowup = (lead: Lead) =>
    Boolean(lead.next_contact_date && lead.next_contact_date < todayKey());

  const filteredLeads = leads.filter((lead) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      lead.name.toLowerCase().includes(query) ||
      (lead.phone || '').toLowerCase().includes(query) ||
      (lead.email || '').toLowerCase().includes(query);

    const matchesFilter = followupFilter === 'all' ? true : isOverdueFollowup(lead);

    return matchesSearch && matchesFilter;
  });

  const filteredRequests = mockRequests.filter(
    (req) =>
      req.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.phone.includes(searchQuery)
  );

  const openNewLead = () => {
    setFormError(null);
    setDedupeWarning(null);
    setIsCreatingLead(true);
    setSelectedLead(emptyLead());
    setIsLeadDrawerOpen(true);
  };

  const openEditLead = (lead: Lead) => {
    setFormError(null);
    setDedupeWarning(null);
    setIsCreatingLead(false);
    setSelectedLead({ ...lead });
    setIsLeadDrawerOpen(true);
  };

  const closeLeadDrawer = () => {
    setIsLeadDrawerOpen(false);
    setSelectedLead(null);
    setIsCreatingLead(false);
    setFormError(null);
    setDedupeWarning(null);
  };

  const updateLeadField = <K extends keyof Lead>(field: K, value: Lead[K]) => {
    setSelectedLead((prev) => {
      if (!prev) return prev;
      const updated = applyLeadStatusRules({ ...prev, [field]: value });
      return updated;
    });
  };

  const checkDedupeWarning = (lead: Lead) => {
    const phone = (lead.phone || '').trim();
    const email = (lead.email || '').trim().toLowerCase();
    if (!phone && !email) {
      setDedupeWarning(null);
      return;
    }

    const duplicateLead = leads.find((item) => item.id !== lead.id && (item.phone === phone || (item.email || '').toLowerCase() === email));
    const duplicateRequest = mockRequests.find((item) => item.phone === phone || (item.email || '').toLowerCase() === email);

    if (duplicateLead || duplicateRequest) {
      setDedupeWarning('Possible duplicate found by phone/email in existing leads or requests.');
      return;
    }

    setDedupeWarning(null);
  };

  const saveLead = () => {
    if (!selectedLead) return;

    if (!selectedLead.name.trim()) {
      setFormError('Name is required.');
      return;
    }

    const normalized = applyLeadStatusRules({
      ...selectedLead,
      name: selectedLead.name.trim(),
      phone: (selectedLead.phone || '').trim(),
      email: (selectedLead.email || '').trim(),
      notes: selectedLead.notes?.trim() || '',
      followup_note: selectedLead.followup_note?.trim() || '',
      not_enrolled_reason_text: selectedLead.not_enrolled_reason_text?.trim() || '',
      next_contact_date: selectedLead.next_contact_date || '',
      trial_date: selectedLead.trial_date || '',
    });

    checkDedupeWarning(normalized);

    if (isCreatingLead) {
      setLeads((prev) => [normalized, ...prev]);
    } else {
      setLeads((prev) => prev.map((item) => (item.id === normalized.id ? normalized : item)));
    }

    closeLeadDrawer();
  };

  return (
    <div className="flex h-screen bg-[#0b0b0b]">
      <TeacherSidebar active="leads" />

      <main className="ml-[260px] flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-[#222] bg-[#0d0d0d] px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Leads</h1>
              <p className="mt-1 text-sm text-zinc-500">Manage first contact → trial → request → accepted</p>
            </div>
            <button onClick={openNewLead} className="rounded-xl bg-[#c81d25] px-6 py-2.5 font-semibold text-white hover:bg-[#b01720] transition">
              + New Lead
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            {/* Search and Filters */}
            <div className="mb-6 flex gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search leads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full border border-[#222] bg-[#121212] px-4 py-2.5 text-white placeholder-zinc-500 focus:border-[#c81d25] focus:outline-none transition"
                />
              </div>
              {activeTab === 'leads' ? (
                <select
                  value={followupFilter}
                  onChange={(e) => setFollowupFilter(e.target.value as 'all' | 'overdue')}
                  className="rounded-xl border border-[#222] bg-[#121212] px-4 py-2.5 text-sm text-white focus:border-[#c81d25] focus:outline-none"
                >
                  <option value="all">All follow-ups</option>
                  <option value="overdue">Overdue follow-ups</option>
                </select>
              ) : null}
            </div>

            {/* Tabs */}
            <div className="mb-6 flex gap-2 border-b border-[#222]">
              <button
                onClick={() => setActiveTab('leads')}
                className={`px-4 py-3 font-medium transition ${
                  activeTab === 'leads'
                    ? 'border-b-2 border-[#c81d25] text-white'
                    : 'text-zinc-400 hover:text-zinc-300'
                }`}
              >
                Leads
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`px-4 py-3 font-medium transition ${
                  activeTab === 'requests'
                    ? 'border-b-2 border-[#c81d25] text-white'
                    : 'text-zinc-400 hover:text-zinc-300'
                }`}
              >
                Requests
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`px-4 py-3 font-medium transition ${
                  activeTab === 'stats'
                    ? 'border-b-2 border-[#c81d25] text-white'
                    : 'text-zinc-400 hover:text-zinc-300'
                }`}
              >
                Stats
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'leads' && (
              <div className="rounded-2xl border border-[#222] bg-[#121212] overflow-hidden">
                <LeadsTable
                  leads={filteredLeads}
                  onRowClick={openEditLead}
                />
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="rounded-2xl border border-[#222] bg-[#121212] overflow-hidden">
                <RequestsTable
                  requests={filteredRequests}
                  onRowClick={(req) => setSelectedRequest(req)}
                />
              </div>
            )}

            {activeTab === 'stats' && <StatsTab stats={mockLeadStats} />}
          </div>
        </div>
      </main>

      {/* Lead Drawer */}
      {isLeadDrawerOpen && selectedLead && (
        <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-black/50" onClick={closeLeadDrawer}>
          <div
            className="bg-[#121212] border border-[#222] rounded-2xl min-w-[420px] max-w-[680px] w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{isCreatingLead ? 'New Lead' : selectedLead.name}</h2>
              <button
                onClick={closeLeadDrawer}
                className="text-zinc-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {formError ? (
                <div className="rounded-xl border border-[#ef4444]/40 bg-[#ef4444]/10 px-3 py-2 text-sm text-[#fca5a5]">{formError}</div>
              ) : null}
              {dedupeWarning ? (
                <div className="rounded-xl border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-3 py-2 text-sm text-[#fcd34d]">{dedupeWarning}</div>
              ) : null}

              <div className="rounded-2xl border border-[#222] bg-[#0f0f0f] p-4">
                <p className="mb-3 text-xs uppercase tracking-wide text-zinc-500">Contact</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs text-zinc-400">Name *</label>
                    <input
                      value={selectedLead.name}
                      onChange={(e) => updateLeadField('name', e.target.value)}
                      className="w-full rounded-xl border border-[#222] bg-[#121212] px-3 py-2 text-white focus:border-[#c81d25] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-zinc-400">Via de Contacto</label>
                    <select
                      value={selectedLead.contact_source}
                      onChange={(e) => updateLeadField('contact_source', e.target.value as Lead['contact_source'])}
                      className="w-full rounded-xl border border-[#222] bg-[#121212] px-3 py-2 text-white focus:border-[#c81d25] focus:outline-none"
                    >
                      {LEAD_SOURCES.map((source) => (
                        <option key={source} value={source}>{source}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-zinc-400">Data de Contacto</label>
                    <input
                      type="date"
                      value={selectedLead.contact_date}
                      onChange={(e) => updateLeadField('contact_date', e.target.value)}
                      className="w-full rounded-xl border border-[#222] bg-[#121212] px-3 py-2 text-white focus:border-[#c81d25] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-zinc-400">Número de Telefone</label>
                    <input
                      value={selectedLead.phone || ''}
                      onChange={(e) => updateLeadField('phone', e.target.value)}
                      className="w-full rounded-xl border border-[#222] bg-[#121212] px-3 py-2 text-white focus:border-[#c81d25] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-zinc-400">E-mail</label>
                    <input
                      type="email"
                      value={selectedLead.email || ''}
                      onChange={(e) => updateLeadField('email', e.target.value)}
                      className="w-full rounded-xl border border-[#222] bg-[#121212] px-3 py-2 text-white focus:border-[#c81d25] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#222] bg-[#0f0f0f] p-4">
                <p className="mb-3 text-xs uppercase tracking-wide text-zinc-500">Follow-up</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-zinc-400">DATA PRÓXIMO CONTACTO</label>
                    <input
                      type="date"
                      value={selectedLead.next_contact_date || ''}
                      onChange={(e) => updateLeadField('next_contact_date', e.target.value)}
                      className="w-full rounded-xl border border-[#222] bg-[#121212] px-3 py-2 text-white focus:border-[#c81d25] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-zinc-400">ESTADO</label>
                    <select
                      value={selectedLead.status}
                      onChange={(e) => updateLeadField('status', e.target.value as Lead['status'])}
                      disabled={selectedLead.enrolled || Boolean(selectedLead.not_enrolled_reason)}
                      className="w-full rounded-xl border border-[#222] bg-[#121212] px-3 py-2 text-white focus:border-[#c81d25] focus:outline-none disabled:opacity-60"
                    >
                      {LEAD_STATUSES.map((status) => (
                        <option key={status} value={status}>{statusLabel(status)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs text-zinc-400">FOLLOWUP</label>
                    <textarea
                      rows={3}
                      value={selectedLead.followup_note || ''}
                      onChange={(e) => updateLeadField('followup_note', e.target.value)}
                      className="w-full rounded-xl border border-[#222] bg-[#121212] px-3 py-2 text-white focus:border-[#c81d25] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#222] bg-[#0f0f0f] p-4">
                <p className="mb-3 text-xs uppercase tracking-wide text-zinc-500">Trial</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-zinc-400">Aula (idade)</label>
                    <select
                      value={selectedLead.class_type}
                      onChange={(e) => updateLeadField('class_type', e.target.value as Lead['class_type'])}
                      className="w-full rounded-xl border border-[#222] bg-[#121212] px-3 py-2 text-white focus:border-[#c81d25] focus:outline-none"
                    >
                      {LEAD_CLASS_TYPES.map((classType) => (
                        <option key={classType} value={classType}>{classType}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-zinc-400">DATA AULA EXPERIMENTAL</label>
                    <input
                      type="date"
                      value={selectedLead.trial_date || ''}
                      onChange={(e) => updateLeadField('trial_date', e.target.value)}
                      className="w-full rounded-xl border border-[#222] bg-[#121212] px-3 py-2 text-white focus:border-[#c81d25] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#222] bg-[#0f0f0f] p-4">
                <p className="mb-3 text-xs uppercase tracking-wide text-zinc-500">Notes</p>
                <textarea
                  rows={3}
                  value={selectedLead.notes || ''}
                  onChange={(e) => updateLeadField('notes', e.target.value)}
                  className="w-full rounded-xl border border-[#222] bg-[#121212] px-3 py-2 text-white focus:border-[#c81d25] focus:outline-none"
                  placeholder="Observações"
                />
              </div>

              <div className="rounded-2xl border border-[#222] bg-[#0f0f0f] p-4">
                <p className="mb-3 text-xs uppercase tracking-wide text-zinc-500">Result</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2 flex items-center gap-3">
                    <label className="text-xs text-zinc-400">INSCRITO S/N</label>
                    <button
                      type="button"
                      onClick={() => updateLeadField('enrolled', true)}
                      className={`rounded-xl border px-3 py-1.5 text-sm ${selectedLead.enrolled ? 'border-[#c81d25] bg-[#2a1113] text-white' : 'border-[#222] text-zinc-300'}`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => updateLeadField('enrolled', false)}
                      className={`rounded-xl border px-3 py-1.5 text-sm ${!selectedLead.enrolled ? 'border-[#c81d25] bg-[#2a1113] text-white' : 'border-[#222] text-zinc-300'}`}
                    >
                      No
                    </button>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-zinc-400">MOTIVO NÃO INSCRIÇÃO</label>
                    <select
                      value={selectedLead.not_enrolled_reason || ''}
                      onChange={(e) => updateLeadField('not_enrolled_reason', (e.target.value || undefined) as Lead['not_enrolled_reason'])}
                      disabled={selectedLead.enrolled}
                      className="w-full rounded-xl border border-[#222] bg-[#121212] px-3 py-2 text-white focus:border-[#c81d25] focus:outline-none disabled:opacity-60"
                    >
                      <option value="">Select reason</option>
                      {NOT_ENROLLED_REASONS.map((reason) => (
                        <option key={reason} value={reason}>{reason}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-zinc-400">Reason details (optional)</label>
                    <input
                      value={selectedLead.not_enrolled_reason_text || ''}
                      onChange={(e) => updateLeadField('not_enrolled_reason_text', e.target.value)}
                      disabled={selectedLead.enrolled}
                      className="w-full rounded-xl border border-[#222] bg-[#121212] px-3 py-2 text-white focus:border-[#c81d25] focus:outline-none disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-[#222] flex gap-3">
                <button onClick={saveLead} className="flex-1 rounded-xl bg-[#c81d25] px-4 py-2 font-semibold text-white hover:bg-[#b01720] transition">
                  Save Lead
                </button>
                <button onClick={closeLeadDrawer} className="flex-1 rounded-xl border border-[#222] px-4 py-2 font-semibold text-white hover:bg-[#161616] transition">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Request Drawer - Mock */}
      {selectedRequest && (
        <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-black/50" onClick={() => setSelectedRequest(null)}>
          <div
            className="bg-[#121212] border border-[#222] rounded-2xl min-w-[400px] max-h-[90vh] overflow-y-auto p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{selectedRequest.name}</h2>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-zinc-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide">Phone</p>
                <p className="text-white">{selectedRequest.phone}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide">Email</p>
                <p className="text-white">{selectedRequest.email || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide">Status</p>
                <p className="text-white">{selectedRequest.status}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide">Trial Date</p>
                <p className="text-white">{selectedRequest.trialDate || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide">Requested At</p>
                <p className="text-white">{selectedRequest.requestedAt}</p>
              </div>

              {selectedRequest.notes && (
                <div className="mt-6 pt-6 border-t border-[#222]">
                  <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Notes</p>
                  <p className="text-sm text-white">{selectedRequest.notes}</p>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-[#222] flex gap-3">
                <button className="flex-1 rounded-lg bg-[#22c55e] px-4 py-2 font-semibold text-white hover:bg-[#16a34a] transition">
                  Mark Trial Done
                </button>
                <button className="flex-1 rounded-lg border border-[#222] px-4 py-2 font-semibold text-white hover:bg-[#161616] transition">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
