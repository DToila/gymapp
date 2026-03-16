"use client";

import { useMemo, useState } from 'react';
import { Member } from './types';

interface RequestsListProps {
  items: Member[];
  search: string;
}

export default function RequestsList({ items, search }: RequestsListProps) {
  const [statuses, setStatuses] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      `${item.name} ${item.email || ''} ${item.phone || ''}`.toLowerCase().includes(q)
    );
  }, [items, search]);

  return (
    <div style={{ border: '1px solid #2a2a2a', background: '#101010' }}>
      {filtered.length === 0 ? (
        <div style={{ padding: '24px', color: '#888' }}>No requests found</div>
      ) : (
        filtered.map((req) => (
          <div key={req.id} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr auto', gap: '12px', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid #1a1a1a' }}>
            <div>
              <div style={{ color: '#f0f0f0', fontSize: '13px', fontWeight: 600 }}>{req.name}</div>
              <div style={{ color: '#888', fontSize: '12px' }}>{req.email || '-'} · {req.phone || '-'}</div>
            </div>
            <div style={{ color: '#999', fontSize: '12px' }}>{req.enrolledAt || '-'}</div>
            <select
              value={statuses[req.id] || req.requestStatus || 'Pending'}
              onChange={(e) => setStatuses((prev) => ({ ...prev, [req.id]: e.target.value }))}
              style={{ background: '#121212', color: '#f0f0f0', border: '1px solid #2a2a2a', padding: '7px 8px', fontSize: '12px' }}
            >
              <option>Pending</option>
              <option>In review</option>
              <option>Rejected</option>
            </select>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{ padding: '7px 9px', background: '#CC0000', border: '1px solid #CC0000', color: '#fff', fontSize: '11px', cursor: 'pointer' }}>
                Approve
              </button>
              <button style={{ padding: '7px 9px', background: 'transparent', border: '1px solid #663333', color: '#ff8d8d', fontSize: '11px', cursor: 'pointer' }}>
                Reject
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
