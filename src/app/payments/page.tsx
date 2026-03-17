'use client';

import { useState } from 'react';
import TeacherSidebar from '@/components/members/TeacherSidebar';
import { mockUnpaidPayments, mockPaymentHistory, mockDirectDebit, mockPaymentKpis } from '@/components/payments/mockData';
import UnpaidTab from '@/components/payments/UnpaidTab';
import DirectDebitTab from '@/components/payments/DirectDebitTab';
import HistoryTab from '@/components/payments/HistoryTab';

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'unpaid' | 'dd' | 'history'>('overview');
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);

  const handleMarkPaid = (_paymentId: string) => {
    setShowMarkPaidModal(true);
  };

  const handleSendReminder = (paymentId: string) => {
    console.log('Reminder sent for:', paymentId);
    // Would trigger email/SMS reminder
  };

  const handleMarkResolved = (recordId: string) => {
    console.log('Marked as resolved:', recordId);
  };

  return (
    <div className="flex h-screen bg-[#0b0b0b]">
      <TeacherSidebar active="payments" />

      <main className="ml-[260px] flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-[#222] bg-[#0d0d0d] px-8 py-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Payments</h1>
            <p className="mt-1 text-sm text-zinc-500">Daily operations: see unpaid, mark paid, view history</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            {/* KPI Cards */}
            {activeTab === 'overview' && (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-8">
                <article className="rounded-2xl border border-[#252525] bg-[#131313] p-4 shadow-[0_6px_20px_rgba(0,0,0,0.3)]">
                  <p className="text-xs text-zinc-500 uppercase tracking-wide">Unpaid Count</p>
                  <p className="mt-2 text-3xl font-bold text-white">{mockPaymentKpis.unpaidCount}</p>
                  <p className="mt-1 text-sm text-[#ef4444]">€{mockPaymentKpis.unpaidTotal}</p>
                </article>

                <article className="rounded-2xl border border-[#252525] bg-[#131313] p-4 shadow-[0_6px_20px_rgba(0,0,0,0.3)]">
                  <p className="text-xs text-zinc-500 uppercase tracking-wide">Due This Week</p>
                  <p className="mt-2 text-3xl font-bold text-white">{mockPaymentKpis.dueThisWeek}</p>
                </article>

                <article className="rounded-2xl border border-[#252525] bg-[#131313] p-4 shadow-[0_6px_20px_rgba(0,0,0,0.3)]">
                  <p className="text-xs text-zinc-500 uppercase tracking-wide">DD Failures</p>
                  <p className="mt-2 text-3xl font-bold text-white">{mockPaymentKpis.ddFailures}</p>
                </article>

                <article className="rounded-2xl border border-[#252525] bg-[#131313] p-4 shadow-[0_6px_20px_rgba(0,0,0,0.3)]">
                  <p className="text-xs text-zinc-500 uppercase tracking-wide">Collected This Month</p>
                  <p className="mt-2 text-3xl font-bold text-[#22c55e]">€{mockPaymentKpis.collectedThisMonth}</p>
                </article>
              </div>
            )}

            {/* Tabs */}
            <div className="mb-6 flex gap-2 border-b border-[#222]">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-3 font-medium transition ${
                  activeTab === 'overview'
                    ? 'border-b-2 border-[#c81d25] text-white'
                    : 'text-zinc-400 hover:text-zinc-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('unpaid')}
                className={`px-4 py-3 font-medium transition ${
                  activeTab === 'unpaid'
                    ? 'border-b-2 border-[#c81d25] text-white'
                    : 'text-zinc-400 hover:text-zinc-300'
                }`}
              >
                Unpaid
              </button>
              <button
                onClick={() => setActiveTab('dd')}
                className={`px-4 py-3 font-medium transition ${
                  activeTab === 'dd' ? 'border-b-2 border-[#c81d25] text-white' : 'text-zinc-400 hover:text-zinc-300'
                }`}
              >
                Direct Debit
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-3 font-medium transition ${
                  activeTab === 'history'
                    ? 'border-b-2 border-[#c81d25] text-white'
                    : 'text-zinc-400 hover:text-zinc-300'
                }`}
              >
                History
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                <div className="rounded-2xl border border-[#222] bg-[#121212] p-6">
                  <h3 className="font-semibold text-white mb-4">Top Overdue</h3>
                  <div className="space-y-3">
                    {mockUnpaidPayments
                      .filter((p) => p.overdueDays && p.overdueDays > 0)
                      .slice(0, 4)
                      .map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between pb-3 border-b border-[#1f1f1f]">
                          <div>
                            <p className="font-medium text-white">{payment.name}</p>
                            <p className="text-xs text-zinc-500">{payment.overdueDays} days overdue</p>
                          </div>
                          <p className="font-semibold text-[#ef4444]">€{payment.amount}</p>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#222] bg-[#121212] p-6">
                  <h3 className="font-semibold text-white mb-4">Recent Payments</h3>
                  <div className="space-y-3">
                    {mockPaymentHistory.slice(0, 4).map((record) => (
                      <div key={record.id} className="flex items-center justify-between pb-3 border-b border-[#1f1f1f]">
                        <div>
                          <p className="font-medium text-white">{record.name}</p>
                          <p className="text-xs text-zinc-500">{record.paidDate}</p>
                        </div>
                        <p className="font-semibold text-[#22c55e]">€{record.amount}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'unpaid' && (
              <UnpaidTab
                payments={mockUnpaidPayments}
                onMarkPaid={handleMarkPaid}
                onSendReminder={handleSendReminder}
              />
            )}

            {activeTab === 'dd' && (
              <DirectDebitTab records={mockDirectDebit} onMarkResolved={handleMarkResolved} />
            )}

            {activeTab === 'history' && <HistoryTab history={mockPaymentHistory} />}
          </div>
        </div>
      </main>

      {/* Mark Paid Modal */}
      {showMarkPaidModal && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50">
          <div className="bg-[#121212] border border-[#222] rounded-2xl min-w-[420px] p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6">Mark as Paid</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-2">Payment Method</label>
                <select className="w-full rounded-lg border border-[#222] bg-[#121212] px-3 py-2.5 text-white focus:border-[#c81d25] focus:outline-none transition">
                  <option>TPA Card</option>
                  <option>TPA MBWay</option>
                  <option>Cash</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-2">Amount</label>
                <input
                  type="number"
                  placeholder="€0.00"
                  className="w-full rounded-lg border border-[#222] bg-[#121212] px-3 py-2.5 text-white focus:border-[#c81d25] focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-2">Paid Date</label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-[#222] bg-[#121212] px-3 py-2.5 text-white focus:border-[#c81d25] focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-2">Paid Through</label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-[#222] bg-[#121212] px-3 py-2.5 text-white focus:border-[#c81d25] focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-2">Notes (optional)</label>
                <textarea
                  rows={2}
                  placeholder="Reference or additional notes..."
                  className="w-full rounded-lg border border-[#222] bg-[#121212] px-3 py-2.5 text-white placeholder-zinc-600 focus:border-[#c81d25] focus:outline-none transition"
                ></textarea>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[#222]">
                <button
                  onClick={() => setShowMarkPaidModal(false)}
                  className="flex-1 rounded-lg border border-[#222] px-4 py-2.5 font-semibold text-white hover:bg-[#0f0f0f] transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowMarkPaidModal(false);
                    // Would save payment
                  }}
                  className="flex-1 rounded-lg bg-[#c81d25] px-4 py-2.5 font-semibold text-white hover:bg-[#b01720] transition"
                >
                  Save Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
