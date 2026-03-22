"use client";

import { useMemo, useState } from 'react';
import { Membro } from './types';

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
    <div style={{ border: '1px solid #222', background: '#121212', borderRadius: '16px', boxShadow: '0 10px 24px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
      {filtered.length === 0 ? (
        <div style={{ padding: '24px', color: '#888' }}>Não requests found</div>
      ) : (
        filtered.map((req) => (
          <div key={req.id} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr auto', gap: '12px', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid #1f1f1f' }}>
            <div>
              <div style={{ color: '#f0f0f0', fontSize: '13px', fontWeight: 600 }}>{req.name}</div>
              <div style={{ color: '#888', fontSize: '12px' }}>{req.email || '-'} · {req.phone || '-'}</div>
            </div>
            <div style={{ color: '#999', fontSize: '12px' }}>{req.enrolledAt || '-'}</div>
            <select
              value={statuses[req.id] || req.requestStatus || 'Pendente'}
              onChange={(e) => setStatuses((prev) => ({ ...prev, [req.id]: e.target.value }))}
              style={{ background: '#151515', color: '#f0f0f0', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '7px 10px', fontSize: '12px' }}
            >
              <option>Pendente</option>
              <option>In review</option>
              <option>Rejected</option>
            </select>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{ padding: '7px 10px', borderRadius: '10px', background: '#CC0000', border: '1px solid #CC0000', color: '#fff', fontSize: '11px', cursor: 'pointer' }}>
                Approve
              </button>
              <button style={{ padding: '7px 10px', borderRadius: '10px', background: 'transparent', border: '1px solid #663333', color: '#ff8d8d', fontSize: '11px', cursor: 'pointer' }}>
                Reject
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
