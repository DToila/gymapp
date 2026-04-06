"use client";

import { useState, useEffect, useCallback } from 'react';
import { PaymentMonthOverride, PaymentMonthStatus, PaymentRow, getMonthOverridesForMember, setMonthOverride } from '@/lib/payments';

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const STATUS_LABELS: Record<PaymentMonthStatus, string> = {
  Skip: 'Skip',
  Ferias: 'Férias',
  Oferta: 'Oferta',
  Exit: 'Saiu',
};

const STATUS_COLORS: Record<PaymentMonthStatus, { bg: string; text: string; border: string }> = {
  Skip:   { bg: '#1a1a2e', text: '#6666aa', border: '#333366' },
  Ferias: { bg: '#1a2e1a', text: '#66aa66', border: '#336633' },
  Oferta: { bg: '#2e2a1a', text: '#aaaa44', border: '#666633' },
  Exit:   { bg: '#2e1a1a', text: '#aa4444', border: '#663333' },
};

interface MonthCell {
  month: string;       // YYYY-MM
  year: number;
  monthIndex: number;  // 0-11
  payment: PaymentRow | null;
  override: PaymentMonthOverride | null;
}

interface MemberRow {
  id: string;
  name: string;
  fee: number;
  cells: MonthCell[];
}

interface MonthlyGridTabProps {
  members: Array<{ id: string; name: string; fee?: number }>;
  payments: PaymentRow[];
  currentMonth: string; // YYYY-MM
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  background: '#111',
  border: '1px solid #2a2a2a',
  color: '#f0f0f0',
  fontSize: '12px',
  fontFamily: '"Barlow", sans-serif',
};

const cellBase: React.CSSProperties = {
  width: '60px',
  minWidth: '60px',
  height: '42px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '11px',
  cursor: 'pointer',
  border: '1px solid #222',
  transition: 'opacity 0.15s',
  position: 'relative',
};

export default function MonthlyGridTab({ members, payments, currentMonth }: MonthlyGridTabProps) {
  const [search, setSearch] = useState('');
  const [year, setYear] = useState(() => Number(currentMonth.split('-')[0]));
  const [overridesByMember, setOverridesByMember] = useState<Record<string, PaymentMonthOverride[]>>({});
  const [popover, setPopover] = useState<{ memberId: string; month: string } | null>(null);
  const [popoverNote, setPopoverNote] = useState('');
  const [saving, setSaving] = useState(false);

  const months = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, '0');
    return `${year}-${m}`;
  });

  const paymentsByMemberMonth = payments.reduce<Record<string, PaymentRow>>((acc, p) => {
    acc[`${p.member_id}__${p.payment_month}`] = p;
    return acc;
  }, {});

  // Lazy-load overrides for visible members
  const loadOverrides = useCallback(async (memberIds: string[]) => {
    const toLoad = memberIds.filter((id) => !(id in overridesByMember));
    if (toLoad.length === 0) return;

    const results = await Promise.all(toLoad.map((id) => getMonthOverridesForMember(id)));
    setOverridesByMember((prev) => {
      const next = { ...prev };
      toLoad.forEach((id, i) => { next[id] = results[i]; });
      return next;
    });
  }, [overridesByMember]);

  const filtered = members.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const ids = filtered.map((m) => m.id);
    if (ids.length > 0) loadOverrides(ids);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, year, members.length]);

  const buildRows = (): MemberRow[] =>
    filtered.map((m) => ({
      id: m.id,
      name: m.name,
      fee: m.fee ?? 0,
      cells: months.map((month) => {
        const [y, mo] = month.split('-').map(Number);
        return {
          month,
          year: y,
          monthIndex: mo - 1,
          payment: paymentsByMemberMonth[`${m.id}__${month}`] ?? null,
          override: (overridesByMember[m.id] ?? []).find((o) => o.month === month) ?? null,
        };
      }),
    }));

  const handleCellClick = (memberId: string, month: string, existing: PaymentMonthOverride | null) => {
    setPopover({ memberId, month });
    setPopoverNote(existing?.note ?? '');
  };

  const handleSetStatus = async (status: PaymentMonthStatus | null) => {
    if (!popover) return;
    setSaving(true);
    try {
      await setMonthOverride({ memberId: popover.memberId, month: popover.month, status, note: popoverNote || null });
      // Update local state
      setOverridesByMember((prev) => {
        const arr = (prev[popover.memberId] ?? []).filter((o) => o.month !== popover.month);
        if (status !== null) {
          arr.push({ id: '', member_id: popover.memberId, month: popover.month, status, note: popoverNote || null, created_at: new Date().toISOString(), created_by: null });
        }
        return { ...prev, [popover.memberId]: arr };
      });
      setPopover(null);
    } catch (e) {
      console.error('Erro setting month override:', e);
    } finally {
      setSaving(false);
    }
  };

  const rows = buildRows();
  const todayMonth = currentMonth;

  return (
    <div style={{ fontFamily: '"Barlow", sans-serif' }}>
      {/* Controlos */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Pesquisar membro..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, maxWidth: '260px' }}
        />
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button
            onClick={() => setYear((y) => y - 1)}
            style={{ padding: '6px 10px', background: '#111', border: '1px solid #2a2a2a', color: '#888', cursor: 'pointer', fontSize: '13px' }}
          >
            ‹
          </button>
          <span style={{ color: '#f0f0f0', fontWeight: 700, fontSize: '14px', minWidth: '40px', textAlign: 'center' }}>{year}</span>
          <button
            onClick={() => setYear((y) => y + 1)}
            style={{ padding: '6px 10px', background: '#111', border: '1px solid #2a2a2a', color: '#888', cursor: 'pointer', fontSize: '13px' }}
          >
            ›
          </button>
        </div>
        <div style={{ fontSize: '11px', color: '#555', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ color: '#66aa66' }}>■ Pago</span>
          <span style={{ color: '#6666aa' }}>■ Skip</span>
          <span style={{ color: '#66aa66', opacity: 0.7 }}>■ Férias</span>
          <span style={{ color: '#aaaa44' }}>■ Oferta</span>
          <span style={{ color: '#aa4444' }}>■ Saiu</span>
          <span style={{ color: '#cc0000' }}>■ Em falta</span>
        </div>
      </div>

      {/* Grid */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: '900px', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px 12px', color: '#555', fontSize: '11px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', width: '200px', position: 'sticky', left: 0, background: '#0b0b0b' }}>
                Membro
              </th>
              {months.map((month, i) => {
                const isToday = month === todayMonth;
                return (
                  <th
                    key={month}
                    style={{
                      padding: '6px 2px',
                      color: isToday ? '#CC0000' : '#555',
                      fontSize: '11px',
                      fontWeight: isToday ? 800 : 600,
                      textTransform: 'uppercase',
                      textAlign: 'center',
                      width: '62px',
                      borderBottom: isToday ? '2px solid #CC0000' : '1px solid #1a1a1a',
                    }}
                  >
                    {MONTH_NAMES[i]}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={13} style={{ textAlign: 'center', padding: '32px', color: '#555', fontSize: '13px' }}>
                  Nenhum membro encontrado
                </td>
              </tr>
            )}
            {rows.map((row, ri) => (
              <tr key={row.id} style={{ borderBottom: '1px solid #141414', background: ri % 2 === 0 ? '#0b0b0b' : '#0d0d0d' }}>
                {/* Nome */}
                <td style={{ padding: '4px 12px', color: '#f0f0f0', fontSize: '13px', fontWeight: 500, position: 'sticky', left: 0, background: ri % 2 === 0 ? '#0b0b0b' : '#0d0d0d', whiteSpace: 'nowrap', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {row.name}
                </td>
                {row.cells.map((cell) => {
                  const isPast = cell.month < todayMonth;
                  const isFuture = cell.month > todayMonth;

                  if (cell.override) {
                    const colors = STATUS_COLORS[cell.override.status];
                    return (
                      <td key={cell.month} style={{ padding: '2px' }}>
                        <div
                          onClick={() => handleCellClick(row.id, cell.month, cell.override)}
                          title={cell.override.note ?? STATUS_LABELS[cell.override.status]}
                          style={{ ...cellBase, background: colors.bg, borderColor: colors.border, color: colors.text }}
                        >
                          <span style={{ fontSize: '10px', fontWeight: 700 }}>{STATUS_LABELS[cell.override.status]}</span>
                        </div>
                      </td>
                    );
                  }

                  if (cell.payment && !isFuture) {
                    return (
                      <td key={cell.month} style={{ padding: '2px' }}>
                        <div
                          onClick={() => handleCellClick(row.id, cell.month, null)}
                          title={`Pago: €${cell.payment.amount} (${cell.payment.method})`}
                          style={{ ...cellBase, background: '#0d2010', borderColor: '#1a4020', color: '#55cc77' }}
                        >
                          <span style={{ fontSize: '11px', fontWeight: 700 }}>€{cell.payment.amount}</span>
                          <span style={{ fontSize: '9px', color: '#447755', marginTop: '1px' }}>{cell.payment.method}</span>
                        </div>
                      </td>
                    );
                  }

                  if (isFuture) {
                    return (
                      <td key={cell.month} style={{ padding: '2px' }}>
                        <div style={{ ...cellBase, background: 'transparent', borderColor: '#181818', color: '#333', cursor: 'default' }}>
                          <span>—</span>
                        </div>
                      </td>
                    );
                  }

                  // Passado sem pagamento e sem override = em falta
                  return (
                    <td key={cell.month} style={{ padding: '2px' }}>
                      <div
                        onClick={() => handleCellClick(row.id, cell.month, null)}
                        title="Em falta — clique para marcar estado"
                        style={{ ...cellBase, background: isPast ? '#1f0a0a' : 'transparent', borderColor: isPast ? '#4a1a1a' : '#222', color: isPast ? '#cc4444' : '#444' }}
                      >
                        <span style={{ fontSize: '11px' }}>{isPast ? '✗' : '—'}</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Popover para definir estado */}
      {popover && (
        <>
          <div onClick={() => setPopover(null)} style={{ position: 'fixed', inset: 0, zIndex: 100 }} />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#111',
            border: '1px solid #2a2a2a',
            padding: '20px',
            zIndex: 101,
            width: '280px',
          }}>
            <div style={{ fontSize: '11px', color: '#555', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>Estado do mês</div>
            <div style={{ fontSize: '13px', color: '#f0f0f0', fontWeight: 600, marginBottom: '14px' }}>
              {popover.month}
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '4px' }}>Nota (opcional)</label>
              <input
                type="text"
                value={popoverNote}
                onChange={(e) => setPopoverNote(e.target.value)}
                placeholder="ex: DD falhou, pagou por TB"
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
              {(Object.keys(STATUS_LABELS) as PaymentMonthStatus[]).map((s) => {
                const colors = STATUS_COLORS[s];
                return (
                  <button
                    key={s}
                    onClick={() => handleSetStatus(s)}
                    disabled={saving}
                    style={{
                      padding: '8px 12px',
                      background: colors.bg,
                      border: `1px solid ${colors.border}`,
                      color: colors.text,
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                );
              })}
              <button
                onClick={() => handleSetStatus(null)}
                disabled={saving}
                style={{ padding: '8px 12px', background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888', fontSize: '12px', cursor: 'pointer', textAlign: 'left' }}
              >
                Remover estado
              </button>
            </div>

            <button
              onClick={() => setPopover(null)}
              style={{ width: '100%', padding: '7px', background: 'transparent', border: '1px solid #2a2a2a', color: '#666', fontSize: '12px', cursor: 'pointer' }}
            >
              Cancelar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
