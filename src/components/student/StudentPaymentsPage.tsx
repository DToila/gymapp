"use client";

import { useMemo } from 'react';
import StudentShell from './StudentShell';
import { useStudentMember } from './useStudentMember';

export default function StudentPaymentsPage() {
  const { member } = useStudentMember();

  const paidThrough = useMemo(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }, []);

  const history = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const rowDate = new Date(now.getFullYear(), now.getMonth() - index, 1);
      return {
        id: `${rowDate.getFullYear()}-${rowDate.getMonth()}`,
        month: rowDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
        amount: `€${(member?.fee || 0).toFixed(2)}`,
        status: index === 0 && member?.status === 'Unpaid' ? 'Por Pagar' : 'Pago',
      };
    });
  }, [member?.fee, member?.status]);

  const isPaid = member?.status !== 'Unpaid';

  return (
    <StudentShell ativo="payments" title="Pagamentos" subtitle="Payment status and history">
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#222] bg-[#121212] p-4 shadow-[0_8px_22px_rgba(0,0,0,0.35)] lg:col-span-1">
          <p className="mb-2 text-xl font-semibold text-zinc-100">Estado</p>
          <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${isPaid ? 'border-[#1f4d33] bg-[rgba(22,163,74,0.12)] text-green-300' : 'border-[#5b1f24] bg-[rgba(239,68,68,0.15)] text-rose-300'}`}>
            {isPaid ? 'Pago' : 'Por Pagar'}
          </div>
          <p className="mt-3 text-zinc-400">{isPaid ? `Pago through: ${paidThrough}` : `Valor due: €${(member?.fee || 0).toFixed(2)}`}</p>
        </div>

        <div className="rounded-2xl border border-[#222] bg-[#121212] p-4 shadow-[0_8px_22px_rgba(0,0,0,0.35)] lg:col-span-2">
          <p className="mb-3 text-xl font-semibold text-zinc-100">History</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="pb-2 font-medium">Month</th>
                  <th className="pb-2 font-medium">Valor</th>
                  <th className="pb-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id} className="border-t border-[#1f1f1f] text-zinc-200">
                    <td className="py-2.5">{row.month}</td>
                    <td className="py-2.5">{row.amount}</td>
                    <td className="py-2.5">
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${row.status === 'Pago' ? 'border-[#1f4d33] bg-[rgba(22,163,74,0.12)] text-green-300' : 'border-[#5b1f24] bg-[rgba(239,68,68,0.15)] text-rose-300'}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </StudentShell>
  );
}
