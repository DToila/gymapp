'use client';

import { useRouter } from 'next/navigation';
import Panel from './Panel';
import { UnpaidPayment } from './types';

export default function UnpaidPaymentsTable({ rows }: { rows: UnpaidPayment[] }) {
  const router = useRouter();

  const handleSendReminder = (_memberId: string, name: string) => {
    alert(`Reminder sent to ${name}`);
    // TODO: Implement actual reminder logic when backend is ready
  };

  return (
    <Panel title="Unpaid Payments" icon={<span className="text-[#f59e0b]">▤</span>} actionText="View all" onAction={() => router.push('/payments')}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">Amount</th>
              <th className="pb-2 font-medium">Due</th>
              <th className="pb-2 font-medium text-right">Action</th>
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
                    Send reminder
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="mt-3 text-sm text-[#c81d25] hover:text-[#ef3a43]" onClick={() => router.push('/payments')}>
        + 8 more unpaid
      </button>
    </Panel>
  );
}
