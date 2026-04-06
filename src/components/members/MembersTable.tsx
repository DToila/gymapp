"use client";

import { Member } from './types';
import RowActionsMenu from './RowActionsMenu';

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
  border: status === 'Ativo' ? '1px solid #1f4d33' : status === 'Paused' ? '1px solid #4a4a4a' : '1px solid #5b1f24',
  color: status === 'Ativo' ? '#86efac' : status === 'Paused' ? '#d4d4d4' : '#fda4af',
  background: status === 'Ativo' ? 'rgba(22,163,74,0.12)' : status === 'Paused' ? 'rgba(255,255,255,0.06)' : 'rgba(239,68,68,0.14)'
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

      {/* Mobile card layout */}
      <div className="sm:hidden">
        {loading ? (
          <div className="p-6 text-zinc-500 text-base text-center">A carregar...</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-zinc-500 text-base mb-4">Sem membros</div>
            <button onClick={onClearFilters} className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-2.5 text-base text-zinc-300">Limpar filtros</button>
          </div>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {rows.map((member) => (
              <div key={member.id} onClick={() => onRowClick(member)} className="p-5 hover:bg-[#0f0f0f] active:bg-[#0f0f0f] cursor-pointer transition-colors">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {member.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg font-bold text-white truncate leading-tight">{member.name}</p>
                      <p className="text-sm text-zinc-500 mt-0.5">
                        {mode === 'adults' ? (member.belt || 'White') : (member.group || 'Crianças')}
                      </p>
                    </div>
                  </div>
                  <span style={statusStyle(member.status)} className="shrink-0">
                    {member.status === 'Active' ? '● Ativo' : member.status === 'Paused' ? '● Pausado' : '● Por Pagar'}
                  </span>
                </div>
                {mode === 'adults' && (member.amountDue || 0) > 0 && (
                  <p className="text-sm text-red-400 font-semibold mt-2 ml-14">
                    🔒 Em falta: €{(member.amountDue || 0).toFixed(0)}
                  </p>
                )}
                {mode === 'kids' && (
                  <p className="text-sm text-zinc-400 mt-2 ml-14">
                    {(member.behaviorState ?? 'neutral') === 'good' ? '😀 Bom comportamento' : (member.behaviorState ?? 'neutral') === 'neutral' ? '😐 Neutro' : '😡 Precisa atenção'}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Desktop table layout */}
      <div className="hidden sm:block" style={{ maxHeight: '560px', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            {mode === 'adults' ? (
              <tr>
                <th style={tableHeaderCell}>Membro</th>
                <th style={tableHeaderCell}>Cinto</th>
                <th style={tableHeaderCell}>Estado</th>
                <th style={{ ...tableHeaderCell, textAlign: 'right' }}>Next payment / Valor due</th>
                <th style={{ ...tableHeaderCell, width: '70px' }}>Ações</th>
              </tr>
            ) : (
              <tr>
                <th style={tableHeaderCell}>Membro</th>
                <th style={tableHeaderCell}>Group</th>
                <th style={tableHeaderCell}>Comportamento</th>
                <th style={{ ...tableHeaderCell, width: '70px' }}>Ações</th>
              </tr>
            )}
          </thead>

          {loading ? (
            <SkeletonRows mode={mode} />
          ) : rows.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={mode === 'adults' ? 5 : 4} style={{ padding: '30px 16px', textAlign: 'center' }}>
                  <div style={{ color: '#888', marginBottom: '12px' }}>Não members found</div>
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
                            ? '● Ativo'
                            : member.status === 'Paused'
                              ? '● Pausado'
                              : `● Por Pagar €${(member.amountDue || 0).toFixed(0)}`}
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
                            { key: 'edit', label: 'Editar', onClick: () => {} },
                            { key: 'pause', label: member.status === 'Paused' ? 'Reactivate' : 'Pause', onClick: () => {} },
                            { key: 'remove', label: 'Remove', danger: true, onClick: () => {} }
                          ]}
                        />
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: '11px 12px', color: '#ddd', fontSize: '12px' }}>
                        <span style={{ border: '1px solid #2a2a2a', borderRadius: '8px', background: '#161616', padding: '4px 10px' }}>{member.group || 'Crianças 1'}</span>
                      </td>
                      <td style={{ padding: '11px 12px' }}>
                        <span style={behaviorStyle()}>
                          {(member.behaviorState ?? 'neutral') === 'good' ? '😀 Good' : (member.behaviorState ?? 'neutral') === 'neutral' ? '😐 Neutral' : '😡 Needs attention'}
                        </span>
                      </td>
                      <td style={{ padding: '11px 12px' }}>
                        <RowActionsMenu
                          options={[
                            { key: 'view', label: 'View profile', onClick: () => onRowClick(member) },
                            { key: 'behavior', label: 'Adicionar behavior note / Atualizar behavior', onClick: () => {} },
                            { key: 'edit', label: 'Editar', onClick: () => {} },
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderTop: '1px solid #1f1f1f', background: '#111111', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ color: '#888', fontSize: '14px' }}>
          {totalItems} resultados
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))} className="hidden sm:block" style={{ background: '#151515', color: '#f0f0f0', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '6px 8px', fontSize: '13px' }}>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span style={{ color: '#9a9a9a', fontSize: '13px' }}>
            {(totalItems === 0 ? 0 : ((page - 1) * pageSize + 1))}–{Math.min(page * pageSize, totalItems)} de {totalItems}
          </span>
          <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1} style={{ background: '#151515', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#f0f0f0', width: '36px', height: '36px', fontSize: '16px', cursor: 'pointer', opacity: page <= 1 ? 0.5 : 1 }}>
            ‹
          </button>
          <button onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages} style={{ background: '#151515', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#f0f0f0', width: '36px', height: '36px', fontSize: '16px', cursor: 'pointer', opacity: page >= totalPages ? 0.5 : 1 }}>
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
