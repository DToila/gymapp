"use client";

import RowActionsMenu from './RowActionsMenu';
import { Member } from './types';

interface MembersTableProps {
  mode: 'adults' | 'kids';
  rows: Member[];
  loading: boolean;
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onRowClick: (member: Member) => void;
  onClearFilters: () => void;
}

const statusStyle = (status?: string): React.CSSProperties => ({
  display: 'inline-block',
  padding: '5px 10px',
  fontSize: '11px',
  borderRadius: '999px',
  letterSpacing: '0.2px',
  fontWeight: 600,
  border: status === 'Active' ? '1px solid #1f4d33' : status === 'Paused' ? '1px solid #4a4a4a' : '1px solid #5b1f24',
  color: status === 'Active' ? '#86efac' : status === 'Paused' ? '#d4d4d4' : '#fda4af',
  background: status === 'Active' ? 'rgba(22,163,74,0.12)' : status === 'Paused' ? 'rgba(255,255,255,0.06)' : 'rgba(239,68,68,0.14)'
});

const behaviorStyle = (): React.CSSProperties => ({
  display: 'inline-block',
  padding: '5px 10px',
  fontSize: '11px',
  borderRadius: '999px',
  border: '1px solid #2a2a2a',
  color: '#e0e0e0',
  background: '#161616'
});

const tableHeaderCell: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  background: '#141414',
  color: '#666666',
  fontSize: '10px',
  letterSpacing: '2px',
  textTransform: 'uppercase',
  textAlign: 'left',
  borderBottom: '1px solid #2a2a2a',
  padding: '10px 12px',
  zIndex: 2
};

function SkeletonRows({ mode }: { mode: 'adults' | 'kids' }) {
  const colSpan = mode === 'adults' ? 5 : 4;
  return (
    <tbody>
      {Array.from({ length: 6 }).map((_, idx) => (
        <tr key={idx}>
          <td colSpan={colSpan} style={{ padding: '12px', borderBottom: '1px solid #1f1f1f' }}>
            <div style={{ height: '14px', background: '#1d1d1d', borderRadius: '999px' }} />
          </td>
        </tr>
      ))}
    </tbody>
  );
}

function formatAmount(amount?: number) {
  const value = amount || 0;
  return value > 0 ? `€${value.toFixed(0)} due` : '€0';
}

export default function MembersTable({
  mode,
  rows,
  loading,
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  onClearFilters
}: MembersTableProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return (
    <div style={{ border: '1px solid #222222', borderRadius: '16px', background: '#121212', boxShadow: '0 12px 28px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
      <div style={{ maxHeight: '560px', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            {mode === 'adults' ? (
              <tr>
                <th style={tableHeaderCell}>Member</th>
                <th style={tableHeaderCell}>Belt</th>
                <th style={tableHeaderCell}>Status</th>
                <th style={{ ...tableHeaderCell, textAlign: 'right' }}>Next payment / Amount due</th>
                <th style={{ ...tableHeaderCell, width: '70px' }}>Actions</th>
              </tr>
            ) : (
              <tr>
                <th style={tableHeaderCell}>Member</th>
                <th style={tableHeaderCell}>Group</th>
                <th style={tableHeaderCell}>Behavior</th>
                <th style={{ ...tableHeaderCell, width: '70px' }}>Actions</th>
              </tr>
            )}
          </thead>

          {loading ? (
            <SkeletonRows mode={mode} />
          ) : rows.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={mode === 'adults' ? 5 : 4} style={{ padding: '30px 16px', textAlign: 'center' }}>
                  <div style={{ color: '#888', marginBottom: '12px' }}>No members found</div>
                  <button onClick={onClearFilters} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#f0f0f0', padding: '8px 12px', borderRadius: '10px', cursor: 'pointer' }}>
                    Clear filters
                  </button>
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody>
              {rows.map((member) => (
                <tr
                  key={member.id}
                  style={{ borderBottom: '1px solid #1f1f1f', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.03)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                >
                  <td style={{ padding: '11px 12px', color: '#f0f0f0', fontSize: '13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '999px', background: '#1e1e1e', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f0f0f0', fontSize: '11px', fontWeight: 700 }}>
                        {member.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <span
                        onClick={() => onRowClick(member)}
                        style={{ cursor: 'pointer', fontSize: '14px' }}
                      >
                        {member.name}
                      </span>
                    </div>
                  </td>

                  {mode === 'adults' ? (
                    <>
                      <td style={{ padding: '11px 12px', color: '#ddd', fontSize: '12px' }}>
                        <span style={{ border: '1px solid #2a2a2a', borderRadius: '8px', background: '#161616', padding: '4px 10px' }}>{member.belt || 'White'}</span>
                      </td>
                      <td style={{ padding: '11px 12px' }}>
                        <span style={statusStyle(member.status)}>
                          {member.status === 'Active'
                            ? '● Active'
                            : member.status === 'Paused'
                              ? '● Paused'
                              : `● Unpaid €${(member.amountDue || 0).toFixed(0)}`}
                        </span>
                      </td>
                      <td style={{ padding: '11px 12px', textAlign: 'right', fontSize: '12px' }}>
                        {(member.amountDue || 0) > 0 ? (
                          <div style={{ color: '#f87171', fontWeight: 600 }}>🔒 Due now {formatAmount(member.amountDue).replace(' due', '')}</div>
                        ) : (
                          <div style={{ color: '#a3a3a3' }}>{member.nextPaymentDate || '—'}</div>
                        )}
                      </td>
                      <td style={{ padding: '11px 12px' }}>
                        <RowActionsMenu
                          options={[
                            { key: 'view', label: 'View profile', onClick: () => onRowClick(member) },
                            { key: 'attendance', label: 'Mark attendance', onClick: () => {} },
                            { key: 'edit', label: 'Edit', onClick: () => {} },
                            { key: 'pause', label: member.status === 'Paused' ? 'Reactivate' : 'Pause', onClick: () => {} },
                            { key: 'remove', label: 'Remove', danger: true, onClick: () => {} }
                          ]}
                        />
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: '11px 12px', color: '#ddd', fontSize: '12px' }}>
                        <span style={{ border: '1px solid #2a2a2a', borderRadius: '8px', background: '#161616', padding: '4px 10px' }}>{member.group || 'Kids 1'}</span>
                      </td>
                      <td style={{ padding: '11px 12px' }}>
                        <span style={behaviorStyle()}>
                          {member.behaviorState === 'good' ? '😀 Good' : member.behaviorState === 'neutral' ? '😐 Neutral' : '😡 Needs attention'}
                        </span>
                      </td>
                      <td style={{ padding: '11px 12px' }}>
                        <RowActionsMenu
                          options={[
                            { key: 'view', label: 'View profile', onClick: () => onRowClick(member) },
                            { key: 'behavior', label: 'Add behavior note / Update behavior', onClick: () => {} },
                            { key: 'edit', label: 'Edit', onClick: () => {} },
                            { key: 'remove', label: 'Remove', danger: true, onClick: () => {} }
                          ]}
                        />
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderTop: '1px solid #1f1f1f', background: '#111111' }}>
        <div style={{ color: '#888', fontSize: '12px' }}>
          {totalItems} results
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#9a9a9a', fontSize: '12px' }}>Rows per page:</span>
          <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))} style={{ background: '#151515', color: '#f0f0f0', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '6px 8px', fontSize: '12px' }}>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span style={{ color: '#a3a3a3', fontSize: '12px' }}>
            {(totalItems === 0 ? 0 : ((page - 1) * pageSize + 1))}–{Math.min(page * pageSize, totalItems)} of {totalItems}
          </span>
          <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1} style={{ background: '#151515', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#f0f0f0', width: '30px', height: '30px', fontSize: '12px', cursor: 'pointer', opacity: page <= 1 ? 0.5 : 1 }}>
            ‹
          </button>
          <button onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages} style={{ background: '#151515', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#f0f0f0', width: '30px', height: '30px', fontSize: '12px', cursor: 'pointer', opacity: page >= totalPages ? 0.5 : 1 }}>
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
