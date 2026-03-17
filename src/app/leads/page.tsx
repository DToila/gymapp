'use client';

import { useState } from 'react';
import TeacherSidebar from '@/components/members/TeacherSidebar';
import { mockLeads, mockRequests, mockLeadStats } from '@/components/leads/mockData';
import LeadsTable from '@/components/leads/LeadsTable';
import RequestsTable from '@/components/leads/RequestsTable';
import StatsTab from '@/components/leads/StatsTab';
import { Lead, LeadRequest } from '@/components/leads/types';

export default function LeadsPage() {
  const [activeTab, setActiveTab] = useState<'leads' | 'requests' | 'stats'>('leads');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<LeadRequest | null>(null);

  const filteredLeads = mockLeads.filter(
    (lead) =>
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.includes(searchQuery)
  );

  const filteredRequests = mockRequests.filter(
    (req) =>
      req.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.phone.includes(searchQuery)
  );

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
            <button className="rounded-lg bg-[#c81d25] px-6 py-2.5 font-semibold text-white hover:bg-[#b01720] transition">
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
                  onRowClick={(lead) => setSelectedLead(lead)}
                  onAction={(leadId, action) => console.log('Lead action:', leadId, action)}
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

      {/* Selected Lead Drawer - Mock */}
      {selectedLead && (
        <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-black/50" onClick={() => setSelectedLead(null)}>
          <div
            className="bg-[#121212] border border-[#222] rounded-2xl min-w-[400px] max-h-[90vh] overflow-y-auto p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{selectedLead.name}</h2>
              <button
                onClick={() => setSelectedLead(null)}
                className="text-zinc-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide">Phone</p>
                <p className="text-white">{selectedLead.phone}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide">Email</p>
                <p className="text-white">{selectedLead.email || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide">Source</p>
                <p className="text-white">{selectedLead.source}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide">Status</p>
                <p className="text-white">{selectedLead.status}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide">Owner</p>
                <p className="text-white">{selectedLead.owner || 'Unassigned'}</p>
              </div>

              {selectedLead.notes && selectedLead.notes.length > 0 && (
                <div className="mt-6 pt-6 border-t border-[#222]">
                  <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Notes</p>
                  <div className="space-y-2">
                    {selectedLead.notes.map((note, idx) => (
                      <p key={idx} className="text-sm text-white">• {note}</p>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-[#222] flex gap-3">
                <button className="flex-1 rounded-lg bg-[#c81d25] px-4 py-2 font-semibold text-white hover:bg-[#b01720] transition">
                  Convert to Request
                </button>
                <button className="flex-1 rounded-lg border border-[#222] px-4 py-2 font-semibold text-white hover:bg-[#161616] transition">
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
