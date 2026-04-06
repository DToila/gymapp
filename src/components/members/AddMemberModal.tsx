import React from 'react';
import { MEMBER_SOURCE_OPTIONS, MemberSource } from '../../../lib/types';

export interface AddMemberFormData {
  name: string;
  belt_level: string;
  status: 'Active' | 'Paused' | 'Unpaid';
  phone: string;
  email: string;
  payment_type: 'Direct Debit' | 'Cash';
  fee: number;
  family_discount: boolean;
  date_of_birth: string;
  iban: string;
  nif: string;
  ref: string;
  custom_fee: boolean;
  custom_fee_amount: number;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  address: string;
  postal_code: string;
  city: string;
  billing_name: string;
  billing_nif: string;
  source: MemberSource | '';
}

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  newMember: AddMemberFormData;
  setNewMember: React.Dispatch<React.SetStateAction<AddMemberFormData>>;
  beltOptions: string[];
  isSubmitting: boolean;
  submitLabel: string;
  onNameChange?: (name: string) => void;
  onDateOfBirthChange?: (dateOfBirth: string) => void;
  onPaymentTypeChange?: (paymentType: 'Direct Debit' | 'Cash') => void;
  onSubmitButtonClick?: () => void;
  studentNumberReadOnly?: boolean;
  studentNumberPlaceholder?: string;
  feeReadOnly?: boolean;
  feeLabel?: string;
}

const inputCls = 'w-full rounded-xl border border-[#222] bg-[#1a1a1a] px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-[#c81d25] focus:outline-none transition';
const labelCls = 'mb-1.5 block text-xs font-medium text-zinc-400';
const sectionCls = 'border-t border-[#1f1f1f] pt-4';
const sectionTitleCls = 'mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500';

export default function AddMemberModal({
  isOpen,
  onClose,
  onSubmit,
  newMember,
  setNewMember,
  beltOptions,
  isSubmitting,
  submitLabel,
  onNameChange,
  onDateOfBirthChange,
  onPaymentTypeChange,
  onSubmitButtonClick,
  studentNumberReadOnly = false,
  studentNumberPlaceholder = 'Referência do aluno',
  feeReadOnly = false,
  feeLabel = 'Taxa Mensal (€)'
}: AddMemberModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#222] bg-[#121212] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Novo Membro</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Inscrição: {new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg border border-[#2a2a2a] text-zinc-400 transition hover:border-[#444] hover:text-white"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Dados principais */}
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Nome *</label>
              <input
                type="text"
                value={newMember.name}
                onChange={(e) => {
                  if (onNameChange) { onNameChange(e.target.value); return; }
                  setNewMember((prev) => ({ ...prev, name: e.target.value }));
                }}
                placeholder="Nome completo"
                className={inputCls}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Data de Nascimento</label>
                <input
                  type="date"
                  value={newMember.date_of_birth}
                  onChange={(e) => {
                    if (onDateOfBirthChange) { onDateOfBirthChange(e.target.value); return; }
                    setNewMember((prev) => ({ ...prev, date_of_birth: e.target.value }));
                  }}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Nº Aluno</label>
                <input
                  type="text"
                  value={newMember.ref}
                  onChange={(e) => setNewMember((prev) => ({ ...prev, ref: e.target.value }))}
                  readOnly={studentNumberReadOnly}
                  disabled={studentNumberReadOnly}
                  placeholder={studentNumberPlaceholder}
                  className={`${inputCls} ${studentNumberReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Telemóvel</label>
                <input
                  type="tel"
                  value={newMember.phone}
                  onChange={(e) => setNewMember((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="9XX XXX XXX"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>NIF</label>
                <input
                  type="text"
                  value={newMember.nif}
                  onChange={(e) => setNewMember((prev) => ({ ...prev, nif: e.target.value }))}
                  placeholder="NIF português"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Como chegou</label>
                <select
                  value={newMember.source}
                  onChange={(e) => setNewMember((prev) => ({ ...prev, source: e.target.value as MemberSource | '' }))}
                  className={inputCls}
                >
                  <option value="">-- Fonte --</option>
                  {MEMBER_SOURCE_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Inscrição */}
          <div className={sectionCls}>
            <p className={sectionTitleCls}>Inscrição</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Cinto</label>
                  <select
                    value={newMember.belt_level}
                    onChange={(e) => setNewMember((prev) => ({ ...prev, belt_level: e.target.value }))}
                    className={inputCls}
                  >
                    {beltOptions.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Estado</label>
                  <select
                    value={newMember.status}
                    onChange={(e) => setNewMember((prev) => ({ ...prev, status: e.target.value as 'Active' | 'Paused' | 'Unpaid' }))}
                    className={inputCls}
                  >
                    <option value="Active">Ativo</option>
                    <option value="Paused">Pausado</option>
                    <option value="Unpaid">Por Pagar</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Tipo de Pagamento</label>
                  <select
                    value={newMember.payment_type}
                    onChange={(e) => {
                      const v = e.target.value as 'Direct Debit' | 'Cash';
                      if (onPaymentTypeChange) { onPaymentTypeChange(v); return; }
                      setNewMember((prev) => ({ ...prev, payment_type: v }));
                    }}
                    className={inputCls}
                  >
                    <option value="Direct Debit">Débito Direto</option>
                    <option value="Cash">Dinheiro</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>{feeLabel}</label>
                  <input
                    type="number"
                    value={newMember.fee}
                    onChange={(e) => setNewMember((prev) => ({ ...prev, fee: Number(e.target.value || 0) }))}
                    readOnly={feeReadOnly}
                    disabled={feeReadOnly}
                    className={`${inputCls} ${feeReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>IBAN</label>
                <input
                  type="text"
                  value={newMember.iban}
                  onChange={(e) => setNewMember((prev) => ({ ...prev, iban: e.target.value }))}
                  placeholder="PT50 0002 0123 1234 5678 9015"
                  className={inputCls}
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newMember.family_discount}
                    onChange={(e) => setNewMember((prev) => ({ ...prev, family_discount: e.target.checked }))}
                    className="h-4 w-4 rounded accent-[#c81d25]"
                  />
                  <span className="text-xs text-zinc-400">Desconto familiar</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newMember.custom_fee}
                    onChange={(e) => setNewMember((prev) => ({ ...prev, custom_fee: e.target.checked }))}
                    className="h-4 w-4 rounded accent-[#c81d25]"
                  />
                  <span className="text-xs text-zinc-400">Taxa personalizada</span>
                </label>
              </div>

              {newMember.custom_fee && (
                <div>
                  <label className={labelCls}>Valor personalizado (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newMember.custom_fee_amount}
                    onChange={(e) => setNewMember((prev) => ({ ...prev, custom_fee_amount: Number(e.target.value || 0) }))}
                    placeholder="0.00"
                    className={inputCls}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Contacto de Emergência */}
          <div className={sectionCls}>
            <p className={sectionTitleCls}>Contacto de Emergência</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Nome</label>
                <input
                  type="text"
                  value={newMember.emergency_contact_name}
                  onChange={(e) => setNewMember((prev) => ({ ...prev, emergency_contact_name: e.target.value }))}
                  placeholder="Nome do contacto"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Telemóvel</label>
                <input
                  type="tel"
                  value={newMember.emergency_contact_phone}
                  onChange={(e) => setNewMember((prev) => ({ ...prev, emergency_contact_phone: e.target.value }))}
                  placeholder="9XX XXX XXX"
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Morada */}
          <div className={sectionCls}>
            <p className={sectionTitleCls}>Morada</p>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Rua / Endereço</label>
                <input
                  type="text"
                  value={newMember.address}
                  onChange={(e) => setNewMember((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="Rua Exemplo, nº 1, 2ºDto"
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-3">
                <div>
                  <label className={labelCls}>Código Postal</label>
                  <input
                    type="text"
                    value={newMember.postal_code}
                    onChange={(e) => setNewMember((prev) => ({ ...prev, postal_code: e.target.value }))}
                    placeholder="2790-000"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Localidade</label>
                  <input
                    type="text"
                    value={newMember.city}
                    onChange={(e) => setNewMember((prev) => ({ ...prev, city: e.target.value }))}
                    placeholder="Queijas"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Faturação */}
          <div className={sectionCls}>
            <p className={sectionTitleCls}>Faturação</p>
            <p className="mb-3 text-xs text-zinc-600">Preencher apenas se diferente do membro (ex: pais de crianças)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Nome Faturação</label>
                <input
                  type="text"
                  value={newMember.billing_name}
                  onChange={(e) => setNewMember((prev) => ({ ...prev, billing_name: e.target.value }))}
                  placeholder="Nome para a fatura"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>NIF Faturação</label>
                <input
                  type="text"
                  value={newMember.billing_nif}
                  onChange={(e) => setNewMember((prev) => ({ ...prev, billing_nif: e.target.value }))}
                  placeholder="NIF do responsável"
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-[#2a2a2a] bg-transparent py-2.5 text-sm text-zinc-400 transition hover:border-[#444] hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              onClick={onSubmitButtonClick}
              disabled={isSubmitting}
              className="flex-1 rounded-xl bg-[#c81d25] py-2.5 text-sm font-semibold text-white transition hover:bg-[#a8141c] disabled:opacity-50"
            >
              {isSubmitting ? 'A guardar...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
