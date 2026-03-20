'use client';

import { useRouter } from 'next/navigation';
import Panel from './Panel';
import { RequestItem } from './types';

export default function PendingRequestsList({ requests }: { requests: RequestItem[] }) {
  const router = useRouter();

  const handleApproveRequest = (requestId: string) => {
    alert(`Request ${requestId} approved`);
    // TODO: Implement actual approval logic when backend is ready
  };

  const handleRejectRequest = (requestId: string) => {
    alert(`Request ${requestId} rejected`);
    // TODO: Implement actual rejection logic when backend is ready
  };

  return (
    <Panel title="Pending Requests" icon={<span className="text-[#c81d25]">▣</span>} actionText="View all" onAction={() => router.push('/members')}>
      <ul className="space-y-2">
        {requests.map((request) => (
          <li key={request.id} className="flex items-center gap-3 border-b border-[#1f1f1f] py-2 last:border-b-0">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-zinc-700 text-xs text-white">{request.name.charAt(0)}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-zinc-200">{request.name}</p>
              <p className="text-xs text-zinc-500">{request.requestedAt}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleApproveRequest(request.id)}
                className="grid h-7 w-7 place-items-center rounded-md border border-[#1f3a26] bg-[#112018] text-[#22c55e]"
              >
                ✓
              </button>
              <button
                onClick={() => handleRejectRequest(request.id)}
                className="grid h-7 w-7 place-items-center rounded-md border border-[#3a1d1d] bg-[#221414] text-[#ef4444]"
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
