'use client';

import { DirectDebitRecord } from './types';

interface DirectDebitTabProps {
  records: DirectDebitRecord[];
  onMarkResolved: (recordId: string) => void;
}

export default function DirectDebitTab({ records, onMarkResolved }: DirectDebitTabProps) {
  const pendingRecords = records.filter((r) => r.status === 'Pendente');
  const failedRecords = records.filter((r) => r.status === 'Falhado' || r.status === 'Returned');

  return (
    <div className="space-y-6">
      {/* Pendente / To Export */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Pendente Export</h3>
        {pendingRecords.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-[#222] bg-[#121212]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#222]">
                  <th className="px-4 py-3 text-left font-semibold text-zinc-300">Nome</th>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-300">Valor</th>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-300">Data de Vencimento</th>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-300">Batch</th>
                  <th className="px-4 py-3 text-right font-semibold text-zinc-300">Ação</th>
                </tr>
              </thead>
              <tbody>
                {pendingRecords.map((record) => (
                  <tr key={record.id} className="border-b border-[#0f0f0f] hover:bg-[#0f0f0f] transition">
                    <td className="px-4 py-3 font-medium text-white">{record.name}</td>
                    <td className="px-4 py-3 text-white">€{record.amount}</td>
                    <td className="px-4 py-3 text-zinc-400">{record.dueDate}</td>
                    <td className="px-4 py-3 text-zinc-400">{record.batchId}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-xs px-3 py-1.5 rounded-lg border border-[#222] text-zinc-300 hover:bg-[#161616] transition">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-zinc-400">Não pendente exports</p>
        )}
      </div>

      <div className="border-b border-[#222]"></div>

      {/* Falhado / Returned */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Falhado / Returned</h3>
        {failedRecords.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-[#222] bg-[#121212]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#222]">
                  <th className="px-4 py-3 text-left font-semibold text-zinc-300">Nome</th>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-300">Valor</th>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-300">Estado</th>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-300">Data</th>
                  <th className="px-4 py-3 text-right font-semibold text-zinc-300">Ação</th>
                </tr>
              </thead>
              <tbody>
                {failedRecords.map((record) => (
                  <tr key={record.id} className="border-b border-[#0f0f0f] hover:bg-[#0f0f0f] transition">
                    <td className="px-4 py-3 font-medium text-white">{record.name}</td>
                    <td className="px-4 py-3 text-white">€{record.amount}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30">
                        {record.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{record.dueDate}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onMarkResolved(record.id)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-[#22c55e] text-white hover:bg-[#16a34a] transition"
                      >
                        Resolved
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-zinc-400">Não failed or returned payments</p>
        )}
      </div>
    </div>
  );
}
