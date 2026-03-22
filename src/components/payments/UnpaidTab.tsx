'use client';

import { useState } from 'react';
import { PaymentRecord } from './types';

interface UnpaidTabProps {
  payments: PaymentRecord[];
  onMarkPaid: (paymentId: string) => void;
  onSendReminder: (paymentId: string) => void;
}

export default function UnpaidTab({ payments, onMarkPaid, onSendReminder }: UnpaidTabProps) {
  const [filterOverdue, setFilterOverdue] = useState<number | null>(null);
  const [filterMethod, setFilterMethod] = useState<string | null>(null);

  const filteredPayments = payments.filter((p) => {
    if (filterOverdue !== null && (p.overdueDays || 0) < filterOverdue) return false;
    if (filterMethod && p.method !== filterMethod) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <select
          value={filterOverdue ?? ''}
          onChange={(e) => setFilterOverdue(e.target.value ? parseInt(e.target.value) : null)}
          className="rounded-lg border border-[#222] bg-[#121212] px-3 py-2 text-white focus:border-[#c81d25] focus:outline-none transition"
        >
          <option value="">Todos Vencido Days</option>
          <option value="30">Vencido 30+ days</option>
          <option value="60">Vencido 60+ days</option>
        </select>

        <select
          value={filterMethod ?? ''}
          onChange={(e) => setFilterMethod(e.target.value || null)}
          className="rounded-lg border border-[#222] bg-[#121212] px-3 py-2 text-white focus:border-[#c81d25] focus:outline-none transition"
        >
          <option value="">Todos Methods</option>
          <option value="DD">Débito Direto</option>
          <option value="TPA">Transferência</option>
          <option value="Dinheiro">Dinheiro</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-[#222] bg-[#121212]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#222]">
              <th className="px-4 py-3 text-left font-semibold text-zinc-300">Nome</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-300">Valor</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-300">Data de Vencimento</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-300">Vencido (days)</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-300">Método</th>
              <th className="px-4 py-3 text-right font-semibold text-zinc-300">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.map((payment) => (
              <tr key={payment.id} className="border-b border-[#0f0f0f] hover:bg-[#0f0f0f] transition">
                <td className="px-4 py-3 font-medium text-white">{payment.name}</td>
                <td className="px-4 py-3 text-white">€{payment.amount}</td>
                <td className="px-4 py-3 text-zinc-400">{payment.dueDate}</td>
                <td className="px-4 py-3">
                  {payment.overdueDays ? (
                    <span className="text-[#ef4444]">{payment.overdueDays} days</span>
                  ) : (
                    <span className="text-zinc-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-400">{payment.method}</td>
                <td className="px-4 py-3 text-right flex gap-2 justify-end">
                  <button
                    onClick={() => onMarkPaid(payment.id)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-[#c81d25] text-white hover:bg-[#b01720] transition"
                  >
                    Mark Pago
                  </button>
                  <button
                    onClick={() => onSendReminder(payment.id)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-[#222] text-zinc-300 hover:bg-[#161616] transition"
                  >
                    Lembrar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
