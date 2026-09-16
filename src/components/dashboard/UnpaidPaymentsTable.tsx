'use client';

import { useRouter } from 'next/navigation';
import Panel from './Panel';
import { UnpaidPayment } from './types';

export default function UnpaidPaymentsTable({ rows, totalCount }: { rows: UnpaidPayment[]; totalCount: number }) {
  const router = useRouter();
  const remaining = totalCount - rows.length;

  const handleSendReminder = (_memberId: string, name: string) => {
    alert(`Reminder sent to ${name}`);
    // TODO: Implement actual reminder logic when backend is ready
  };

  return (
    <Panel title="Por Pagar Pagamentos" icon={<span className="text-[#f59e0b]">▤</span>} actionText="Ver tudo" onAction={() => router.push('/payments')}>
      {/* Mobile card list */}
      <div className="space-y-2 sm:hidden">
        {rows.map((row) => (
          <div key={row.id} className="rounded-lg border border-[#1f1f1f] bg-[#141414] px-3 py-2.5">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-100">{row.name}</p>
                <p className="text-xs text-zinc-500">{row.due}</p>
              </div>
              <span className="shrink-0 text-base font-semibold text-white">{row.amount}</span>
            </div>
            <button
              onClick={() => handleSendReminder(row.id, row.name)}
              className="w-full rounded-md border border-[#c81d25] bg-[#251113] px-2.5 py-2 text-xs font-semibold text-[#fda4af] hover:bg-[#3a1418]"
            >
              Enviar lembrete
            </button>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="pb-2 font-medium">Nome</th>
              <th className="pb-2 font-medium">Valor</th>
              <th className="pb-2 font-medium">Due</th>
              <th className="pb-2 font-medium text-right">Ação</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-[#1f1f1f] text-zinc-200">
                <td className="py-2.5">{row.name}</td>
                <td className="py-2.5">{row.amount}</td>
                <td className="py-2.5">{row.due}</td>
                <td className="py-2.5 text-right">
                  <button
                    onClick={() => handleSendReminder(row.id, row.name)}
                    className="rounded-md border border-[#c81d25] bg-[#251113] px-2.5 py-1 text-xs text-[#fda4af] hover:bg-[#3a1418]"
                  >
                    Enviar lembrete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {remaining > 0 ? (
        <button className="mt-3 text-sm text-[#c81d25] hover:text-[#ef3a43]" onClick={() => router.push('/payments')}>
          + {remaining} more unpaid
        </button>
      ) : null}
    </Panel>
  );
}
