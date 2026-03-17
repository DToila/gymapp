'use client';

import { LeadStats } from './types';

interface StatsTabProps {
  stats: LeadStats;
}

export default function StatsTab({ stats }: StatsTabProps) {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <article className="rounded-2xl border border-[#252525] bg-[#131313] p-4 shadow-[0_6px_20px_rgba(0,0,0,0.3)]">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Leads This Week</p>
          <p className="mt-2 text-3xl font-bold text-white">{stats.leadsThisWeek}</p>
        </article>

        <article className="rounded-2xl border border-[#252525] bg-[#131313] p-4 shadow-[0_6px_20px_rgba(0,0,0,0.3)]">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Leads This Month</p>
          <p className="mt-2 text-3xl font-bold text-white">{stats.leadsThisMonth}</p>
        </article>

        <article className="rounded-2xl border border-[#252525] bg-[#131313] p-4 shadow-[0_6px_20px_rgba(0,0,0,0.3)]">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Conversion Rate</p>
          <p className="mt-2 text-3xl font-bold text-[#22c55e]">{stats.conversionRate}</p>
        </article>

        <article className="rounded-2xl border border-[#252525] bg-[#131313] p-4 shadow-[0_6px_20px_rgba(0,0,0,0.3)]">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">No-Show Rate</p>
          <p className="mt-2 text-3xl font-bold text-[#ef4444]">{stats.noShowRate}</p>
        </article>

        <article className="rounded-2xl border border-[#252525] bg-[#131313] p-4 shadow-[0_6px_20px_rgba(0,0,0,0.3)]">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Avg Time to Convert</p>
          <p className="mt-2 text-3xl font-bold text-white">{stats.avgTimeToConvert}</p>
        </article>
      </div>

      {/* Leads by Source */}
      <div className="rounded-2xl border border-[#252525] bg-[#131313] p-6 shadow-[0_6px_20px_rgba(0,0,0,0.3)]">
        <h3 className="text-lg font-semibold text-white mb-4">Leads by Source</h3>
        <div className="space-y-3">
          {Object.entries(stats.leadsBySource).map(([source, count]) => (
            <div key={source} className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-2 h-2 rounded-full bg-[#c81d25]"></div>
                <p className="text-zinc-300">{source}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 rounded-full bg-[#222] flex-1 min-w-32">
                  <div
                    className="h-full rounded-full bg-[#c81d25]"
                    style={{ width: `${(count / 18) * 100}%` }}
                  ></div>
                </div>
                <p className="text-white font-semibold min-w-10 text-right">{count}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
