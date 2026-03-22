"use client";

import { AdultsFilters, KidsFilters } from './types';

interface AdultsFiltersBarProps {
  value: AdultsFilters;
  onChange: (next: AdultsFilters) => void;
}

interface KidsFiltersBarProps {
  value: KidsFilters;
  onChange: (next: KidsFilters) => void;
}

const chipStyle = (ativo: boolean): React.CSSProperties => ({
  padding: '8px 12px',
  border: ativo ? '1px solid #CC0000' : '1px solid #2a2a2a',
  borderRadius: '12px',
  background: ativo ? 'rgba(204,0,0,0.18)' : '#151515',
  color: ativo ? '#f0f0f0' : '#9a9a9a',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer'
});

const selectStyle: React.CSSProperties = {
  background: '#151515',
  color: '#f0f0f0',
  border: '1px solid #2a2a2a',
  borderRadius: '10px',
  padding: '8px 12px',
  fontSize: '12px'
};

export function AdultsFiltersBar({ value, onChange }: AdultsFiltersBarProps) {
  const set = (patch: Partial<AdultsFilters>) => onChange({ ...value, ...patch });

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '12px', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: '6px' }}>
        {[
          { key: 'all', label: 'Todos' },
          { key: 'ativo', label: 'Ativo' },
          { key: 'pausado', label: 'Paused' },
          { key: 'unpaid', label: 'Por Pagar' }
        ].map((chip) => (
          <button key={chip.key} onClick={() => set({ status: chip.key as AdultsFilters['status'] })} style={chipStyle(value.status === chip.key)}>
            {chip.label}
          </button>
        ))}
      </div>

      <select value={value.belt} onChange={(e) => set({ belt: e.target.value as AdultsFilters['belt'] })} style={selectStyle}>
        <option value="all">Todos belts</option>
        <option value="White">White</option>
        <option value="Blue">Blue</option>
        <option value="Purple">Purple</option>
        <option value="Brown">Brown</option>
        <option value="Black">Black</option>
      </select>

      <select value={value.payment} onChange={(e) => set({ payment: e.target.value as AdultsFilters['payment'] })} style={selectStyle}>
        <option value="all">Todos payment methods</option>
        <option value="Débito Direto">Débito Direto</option>
        <option value="Dinheiro">Dinheiro</option>
        <option value="MBWay">MBWay</option>
        <option value="Other">Other</option>
      </select>

      <select value={value.sort} onChange={(e) => set({ sort: e.target.value as AdultsFilters['sort'] })} style={selectStyle}>
        <option value="recent">Recente</option>
        <option value="name">Nome A-Z</option>
        <option value="paymentDue">Payment due first</option>
        <option value="enrollmentDesc">Enrollment date (desc)</option>
      </select>
    </div>
  );
}

export function KidsFiltersBar({ value, onChange }: KidsFiltersBarProps) {
  const set = (patch: Partial<KidsFilters>) => onChange({ ...value, ...patch });

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '12px', alignItems: 'center' }}>
      <select value={value.group} onChange={(e) => set({ group: e.target.value as KidsFilters['group'] })} style={selectStyle}>
        <option value="all">Todos groups</option>
        <option value="Crianças 1">Crianças 1</option>
        <option value="Crianças 2">Crianças 2</option>
        <option value="Teens">Teens</option>
      </select>

      <div style={{ display: 'flex', gap: '6px' }}>
        {[
          { key: 'all', label: 'Todos' },
          { key: 'good', label: '😀 Good' },
          { key: 'neutral', label: '😐 Neutral' },
          { key: 'attention', label: '😡 Needs attention' }
        ].map((chip) => (
          <button key={chip.key} onClick={() => set({ behavior: chip.key as KidsFilters['behavior'] })} style={chipStyle(value.behavior === chip.key)}>
            {chip.label}
          </button>
        ))}
      </div>

      <select value={value.sort} onChange={(e) => set({ sort: e.target.value as KidsFilters['sort'] })} style={selectStyle}>
        <option value="recent">Recente</option>
        <option value="name">Nome A-Z</option>
        <option value="attentionFirst">Needs attention first</option>
      </select>
    </div>
  );
}
