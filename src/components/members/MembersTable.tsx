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
  padding: '3px 8px',
  fontSize: '10px',
  letterSpacing: '1px',
  textTransform: 'uppercase',
  border: status === 'Active' ? '1px solid #CC0000' : status === 'Paused' ? '1px solid #777' : '1px solid #ff5555',
  color: status === 'Active' ? '#CC0000' : status === 'Paused' ? '#b0b0b0' : '#ff6666',
  background: status === 'Active' ? 'rgba(204,0,0,0.12)' : status === 'Paused' ? 'rgba(255,255,255,0.06)' : 'rgba(255,80,80,0.14)'
});

const behaviorStyle = (): React.CSSProperties => ({
  display: 'inline-block',
  padding: '3px 8px',
  fontSize: '11px',
  border: '1px solid #2a2a2a',
  color: '#e0e0e0',
  background: '#151515'
});

const tableHeaderCell: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  background: '#111111',
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
          <td colSpan={colSpan} style={{ padding: '12px', borderBottom: '1px solid #1b1b1b' }}>
            <div style={{ height: '14px', background: '#1b1b1b', borderRadius: '3px' }} />
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
    <div style={{ border: '1px solid #2a2a2a', background: '#101010' }}>
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
                  <button onClick={onClearFilters} style={{ background: '#121212', border: '1px solid #2a2a2a', color: '#f0f0f0', padding: '7px 10px', cursor: 'pointer' }}>
                    Clear filters
                  </button>
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody>
              {rows.map((member) => (
                <tr key={member.id} onClick={() => onRowClick(member)} style={{ borderBottom: '1px solid #1a1a1a', cursor: 'pointer' }}>
                  <td style={{ padding: '11px 12px', color: '#f0f0f0', fontSize: '13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '30px', height: '30px', background: '#1e1e1e', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CC0000', fontSize: '12px', fontWeight: 800 }}>
                        {member.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <span>{member.name}</span>
                    </div>
                  </td>

                  {mode === 'adults' ? (
                    <>
                      <td style={{ padding: '11px 12px', color: '#ddd', fontSize: '12px' }}>
                        <span style={{ border: '1px solid #2a2a2a', background: '#161616', padding: '3px 8px' }}>{member.belt || 'White'}</span>
                      </td>
                      <td style={{ padding: '11px 12px' }}>
                        <span style={statusStyle(member.status)}>{member.status}</span>
                      </td>
                      <td style={{ padding: '11px 12px', textAlign: 'right', color: (member.amountDue || 0) > 0 ? '#ff6d6d' : '#d6d6d6', fontSize: '12px' }}>
                        {formatAmount(member.amountDue)}
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
                        <span style={{ border: '1px solid #2a2a2a', background: '#161616', padding: '3px 8px' }}>{member.group || 'Kids 1'}</span>
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderTop: '1px solid #2a2a2a' }}>
        <div style={{ color: '#888', fontSize: '12px' }}>
          {totalItems} results
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))} style={{ background: '#121212', color: '#f0f0f0', border: '1px solid #2a2a2a', padding: '6px 8px', fontSize: '12px' }}>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1} style={{ background: '#121212', border: '1px solid #2a2a2a', color: '#f0f0f0', padding: '6px 8px', fontSize: '12px', cursor: 'pointer', opacity: page <= 1 ? 0.5 : 1 }}>
            Prev
          </button>
          <span style={{ color: '#aaa', fontSize: '12px' }}>Page {page} / {totalPages}</span>
          <button onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages} style={{ background: '#121212', border: '1px solid #2a2a2a', color: '#f0f0f0', padding: '6px 8px', fontSize: '12px', cursor: 'pointer', opacity: page >= totalPages ? 0.5 : 1 }}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
