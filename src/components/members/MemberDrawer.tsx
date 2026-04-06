"use client";

import { useState } from 'react';

interface MemberDrawerProps {
  member: any | null;
  onClose: () => void;
}

function InfoRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
      <span style={{ color: '#555', fontSize: '11px', flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#bbb', fontSize: '12px', textAlign: 'right', wordBreak: mono ? 'break-all' : 'normal', fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</span>
    </div>
  );
}

const behaviorLabel: Record<string, string> = {
  good: '😀 Good',
  neutral: '😐 Neutral',
  attention: '😡 Needs attention'
};

export default function MemberDrawer({ member, onClose }: MemberDrawerProps) {
  const [showInfo, setShowInfo] = useState(false);

  if (!member) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50 }} />
      <aside style={{
        position: 'fixed',
        right: 0,
        top: 0,
        bottom: 0,
        width: '420px',
        maxWidth: '95vw',
        background: '#0f0f0f',
        borderLeft: '1px solid #2a2a2a',
        zIndex: 60,
        padding: '18px',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#777', letterSpacing: '2px', textTransform: 'uppercase' }}>Membro Perfil</div>
            <div style={{ fontSize: '22px', color: '#f0f0f0', fontWeight: 800 }}>{member.name}</div>
            <div style={{ color: '#888', fontSize: '12px' }}>
              {(member as any).belt_level || (member as any).group || '-'} · {member.status}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid #2a2a2a', color: '#999', cursor: 'pointer', height: '28px', width: '28px' }}>×</button>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {['Mark attendance', 'Editar', member.status === 'Paused' ? 'Reactivate' : 'Pause'].map((action) => (
            <button key={action} style={{
              padding: '7px 10px',
              background: action === 'Editar' ? '#CC0000' : '#121212',
              border: action === 'Editar' ? '1px solid #CC0000' : '1px solid #2a2a2a',
              color: '#f0f0f0',
              fontSize: '12px',
              cursor: 'pointer'
            }}>
              {action}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowInfo((prev) => !prev)}
          style={{ width: '100%', textAlign: 'left', background: '#111111', border: '1px solid #2a2a2a', color: '#f0f0f0', padding: '10px', marginBottom: '10px', cursor: 'pointer' }}
        >
          Info {showInfo ? '▲' : '▼'}
        </button>

        {showInfo && (
          <div style={{ border: '1px solid #2a2a2a', background: '#111111', padding: '12px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <InfoRow label="Email" value={member.email} />
            <InfoRow label="Telemóvel" value={member.phone} />
            <InfoRow label="Data Nasc." value={member.date_of_birth} />
            <InfoRow label="Fonte" value={(member as any).source} />
            <InfoRow label="Tipo Pagamento" value={(member as any).payment_type} />
            <InfoRow label="Mensalidade" value={member.fee != null ? `€${Number(member.fee).toFixed(2)}` : undefined} />
            <InfoRow label="IBAN" value={(member as any).iban} mono />
            <InfoRow label="NIF" value={(member as any).nif} mono />
            {((member as any).billing_name || (member as any).billing_nif) && (
              <div style={{ borderTop: '1px solid #1e1e1e', paddingTop: '6px', marginTop: '2px' }}>
                <div style={{ fontSize: '10px', color: '#444', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>Faturação</div>
                <InfoRow label="Nome" value={(member as any).billing_name} />
                <InfoRow label="NIF" value={(member as any).billing_nif} mono />
              </div>
            )}
            {((member as any).emergency_contact_name || (member as any).emergency_contact_phone) && (
              <div style={{ borderTop: '1px solid #1e1e1e', paddingTop: '6px', marginTop: '2px' }}>
                <div style={{ fontSize: '10px', color: '#444', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>Emergência</div>
                <InfoRow label="Nome" value={(member as any).emergency_contact_name} />
                <InfoRow label="Tlm." value={(member as any).emergency_contact_phone} />
              </div>
            )}
            {((member as any).address || (member as any).city) && (
              <div style={{ borderTop: '1px solid #1e1e1e', paddingTop: '6px', marginTop: '2px' }}>
                <div style={{ fontSize: '10px', color: '#444', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>Morada</div>
                <InfoRow label="Rua" value={(member as any).address} />
                <InfoRow label="Cód. Postal" value={(member as any).postal_code} />
                <InfoRow label="Localidade" value={(member as any).city} />
              </div>
            )}
            <div style={{ borderTop: '1px solid #1e1e1e', paddingTop: '6px', marginTop: '2px' }}>
              <InfoRow label="Inscrito em" value={(member as any).created_at ? new Date((member as any).created_at).toLocaleDateString('pt-PT') : undefined} />
            </div>
          </div>
        )}

        {!!member.behaviorState && (
          <div style={{ border: '1px solid #2a2a2a', background: '#111111', padding: '12px' }}>
            <div style={{ color: '#f0f0f0', fontSize: '12px', marginBottom: '6px' }}>Comportamento history</div>
            <div style={{ color: '#888', fontSize: '12px', marginBottom: '8px' }}>{behaviorLabel[member.behaviorState]}</div>
            <button style={{ padding: '7px 10px', border: '1px solid #2a2a2a', background: '#121212', color: '#f0f0f0', fontSize: '12px', cursor: 'pointer' }}>
              Adicionar behavior note
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
