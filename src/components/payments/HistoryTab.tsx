'use client';

import { PaymentHistory } from './types';

interface HistoryTabProps {
  history: PaymentHistory[];
}

export default function HistoryTab({ history }: HistoryTabProps) {
  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <input
          type="date"
          className="rounded-lg border border-[#222] bg-[#121212] px-3 py-2 text-white focus:border-[#c81d25] focus:outline-none transition"
        />
        <input
          type="date"
          className="rounded-lg border border-[#222] bg-[#121212] px-3 py-2 text-white focus:border-[#c81d25] focus:outline-none transition"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-[#222] bg-[#121212]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#222]">
              <th className="px-4 py-3 text-left font-semibold text-zinc-300">Nome</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-300">Valor</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-300">Método</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-300">Pago Data</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-300">Referência</th>
            </tr>
          </thead>
          <tbody>
            {history.map((record) => (
              <tr key={record.id} className="border-b border-[#0f0f0f] hover:bg-[#0f0f0f] transition">
                <td className="px-4 py-3 font-medium text-white">{record.name}</td>
                <td className="px-4 py-3 text-white">€{record.amount}</td>
                <td className="px-4 py-3 text-zinc-400">{record.method}</td>
                <td className="px-4 py-3 text-zinc-400">{record.paidDate}</td>
                <td className="px-4 py-3 text-zinc-400">{record.reference || record.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
