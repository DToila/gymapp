import React from 'react';

export interface AddMemberFormData {
  name: string;
  belt_level: string;
  status: 'Ativo' | 'Paused' | 'Por Pagar';
  phone: string;
  email: string;
  payment_type: 'Débito Direto' | 'Dinheiro';
  fee: number;
  family_discount: boolean;
  date_of_birth: string;
  iban: string;
  nif: string;
  ref: string;
  custom_fee: boolean;
  custom_fee_amount: number;
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
  onPaymentTypeChange?: (paymentType: 'Débito Direto' | 'Dinheiro') => void;
  onSubmitButtonClick?: () => void;
  studentNumberReadOnly?: boolean;
  studentNumberPlaceholder?: string;
  feeReadOnly?: boolean;
  feeLabel?: string;
}

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
  studentNumberPlaceholder = 'Aluno reference',
  feeReadOnly = false,
  feeLabel = 'Taxa Mensal (€)'
}: AddMemberModalProps) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50
    }}>
      <div style={{
        background: '#111111',
        border: '1px solid #2a2a2a',
        padding: '32px',
        maxWidth: '400px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px'
        }}>
          <h3 style={{
            fontFamily: '"Barlow Condensed", sans-serif',
            fontSize: '20px',
            fontWeight: 900,
            color: '#f0f0f0',
            margin: 0
          }}>
            ADD NEW MEMBER
          </h3>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <div style={{
              fontSize: '10px',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              color: '#555555',
              fontFamily: '"Barlow Condensed", sans-serif',
              textAlign: 'right',
              marginTop: '2px'
            }}>
              Enrollment: {new Date().toLocaleDateString('pt-PT', {day:'2-digit', month:'2-digit', year:'numeric'}).replace(/\//g,'-')}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar add member form"
              style={{
                background: 'transparent',
                border: '1px solid #2a2a2a',
                color: '#888888',
                width: '24px',
                height: '24px',
                lineHeight: '22px',
                textAlign: 'center',
                fontSize: '13px',
                cursor: 'pointer',
                padding: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#f0f0f0';
                e.currentTarget.style.color = '#f0f0f0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#2a2a2a';
                e.currentTarget.style.color = '#888888';
              }}
            >
              X
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#888888', marginBottom: '6px' }}>
              Nome
            </label>
            <input
              type="text"
              value={newMember.name}
              onChange={(e) => {
                if (onNameChange) {
                  onNameChange(e.target.value);
                  return;
                }
                setNewMember((prev) => ({ ...prev, name: e.target.value }));
              }}
              placeholder="Membro name"
              style={{
                width: '100%',
                padding: '8px 12px',
                background: '#1a1a1a',
                border: '1px solid #2a2a2a',
                color: '#f0f0f0',
                fontSize: '13px',
                fontFamily: '"Barlow", sans-serif'
              }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#888888', marginBottom: '6px' }}>
              Aluno Number
            </label>
            <input
              type="text"
              value={newMember.ref}
              onChange={(e) => setNewMember((prev) => ({ ...prev, ref: e.target.value }))}
              readOnly={studentNumberReadOnly}
              disabled={studentNumberReadOnly}
              placeholder={studentNumberPlaceholder}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: studentNumberReadOnly ? '#0a0a0a' : '#1a1a1a',
                border: '1px solid #2a2a2a',
                color: '#888888',
                fontSize: '13px',
                fontFamily: '"Barlow", sans-serif',
                opacity: studentNumberReadOnly ? 0.6 : 1,
                cursor: studentNumberReadOnly ? 'not-allowed' : 'text'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#888888', marginBottom: '6px' }}>
              IBAN
            </label>
            <input
              type="text"
              value={newMember.iban}
              onChange={(e) => setNewMember((prev) => ({ ...prev, iban: e.target.value }))}
              placeholder="PT50 0002 0123 1234 5678 9015"
              style={{
                width: '100%',
                padding: '8px 12px',
                background: '#1a1a1a',
                border: '1px solid #2a2a2a',
                color: '#f0f0f0',
                fontSize: '13px',
                fontFamily: '"Barlow", sans-serif'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#888888', marginBottom: '6px' }}>
              NIF
            </label>
            <input
              type="text"
              value={newMember.nif}
              onChange={(e) => setNewMember((prev) => ({ ...prev, nif: e.target.value }))}
              placeholder="Portuguese tax ID"
              style={{
                width: '100%',
                padding: '8px 12px',
                background: '#1a1a1a',
                border: '1px solid #2a2a2a',
                color: '#f0f0f0',
                fontSize: '13px',
                fontFamily: '"Barlow", sans-serif'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#888888', marginBottom: '6px' }}>
              Telemóvel
            </label>
            <input
              type="tel"
              value={newMember.phone}
              onChange={(e) => setNewMember((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="(555) 123-4567"
              style={{
                width: '100%',
                padding: '8px 12px',
                background: '#1a1a1a',
                border: '1px solid #2a2a2a',
                color: '#f0f0f0',
                fontSize: '13px',
                fontFamily: '"Barlow", sans-serif'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#888888', marginBottom: '6px' }}>
              Data of Birth
            </label>
            <input
              type="date"
              value={newMember.date_of_birth}
              onChange={(e) => {
                if (onDateOfBirthChange) {
                  onDateOfBirthChange(e.target.value);
                  return;
                }
                setNewMember((prev) => ({ ...prev, date_of_birth: e.target.value }));
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: '#1a1a1a',
                border: '1px solid #2a2a2a',
                color: '#f0f0f0',
                fontSize: '13px',
                fontFamily: '"Barlow", sans-serif'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#888888', marginBottom: '6px' }}>
              Email
            </label>
            <input
              type="email"
              value={newMember.email}
              onChange={(e) => setNewMember((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="member@example.com"
              style={{
                width: '100%',
                padding: '8px 12px',
                background: '#1a1a1a',
                border: '1px solid #2a2a2a',
                color: '#f0f0f0',
                fontSize: '13px',
                fontFamily: '"Barlow", sans-serif'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#888888', marginBottom: '6px' }}>
              Tipo de Pagamento
            </label>
            <select
              value={newMember.payment_type}
              onChange={(e) => {
                const value = e.target.value as 'Débito Direto' | 'Dinheiro';
                if (onPaymentTypeChange) {
                  onPaymentTypeChange(value);
                  return;
                }
                setNewMember((prev) => ({ ...prev, payment_type: value }));
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: '#1a1a1a',
                border: '1px solid #2a2a2a',
                color: '#f0f0f0',
                fontSize: '13px',
                fontFamily: '"Barlow", sans-serif'
              }}
            >
              <option value="Débito Direto">Débito Direto</option>
              <option value="Dinheiro">Dinheiro</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#888888', marginBottom: '6px' }}>
              {feeLabel}
            </label>
            <input
              type="number"
              value={newMember.fee}
              onChange={(e) => setNewMember((prev) => ({ ...prev, fee: Number(e.target.value || 0) }))}
              readOnly={feeReadOnly}
              disabled={feeReadOnly}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: feeReadOnly ? '#0a0a0a' : '#1a1a1a',
                border: '1px solid #2a2a2a',
                color: '#888888',
                fontSize: '13px',
                fontFamily: '"Barlow", sans-serif',
                opacity: feeReadOnly ? 0.6 : 1
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              id="familyDiscount"
              type="checkbox"
              checked={newMember.family_discount}
              onChange={(e) => setNewMember((prev) => ({ ...prev, family_discount: e.target.checked }))}
              style={{ width: '16px', height: '16px', accentColor: '#CC0000' }}
            />
            <label htmlFor="familyDiscount" style={{ fontSize: '12px', color: '#888888' }}>
              Family discount
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              id="customFee"
              type="checkbox"
              checked={newMember.custom_fee}
              onChange={(e) => setNewMember((prev) => ({ ...prev, custom_fee: e.target.checked }))}
              style={{ width: '16px', height: '16px', accentColor: '#CC0000' }}
            />
            <label htmlFor="customFee" style={{ fontSize: '12px', color: '#888888' }}>
              Custom fee
            </label>
          </div>

          {newMember.custom_fee && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#888888', marginBottom: '6px' }}>
                Custom Fee Valor (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={newMember.custom_fee_amount}
                onChange={(e) => setNewMember((prev) => ({ ...prev, custom_fee_amount: Number(e.target.value || 0) }))}
                placeholder="Enter custom fee amount"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  color: '#f0f0f0',
                  fontSize: '13px',
                  fontFamily: '"Barlow", sans-serif'
                }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#888888', marginBottom: '6px' }}>
              Cinto Level
            </label>
            <select
              value={newMember.belt_level}
              onChange={(e) => setNewMember((prev) => ({ ...prev, belt_level: e.target.value }))}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: '#1a1a1a',
                border: '1px solid #2a2a2a',
                color: '#f0f0f0',
                fontSize: '13px',
                fontFamily: '"Barlow", sans-serif'
              }}
            >
              {beltOptions.map((beltOption) => (
                <option key={beltOption} value={beltOption}>{beltOption}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#888888', marginBottom: '6px' }}>
              Estado
            </label>
            <select
              value={newMember.status}
              onChange={(e) => setNewMember((prev) => ({ ...prev, status: e.target.value as 'Ativo' | 'Paused' | 'Por Pagar' }))}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: '#1a1a1a',
                border: '1px solid #2a2a2a',
                color: '#f0f0f0',
                fontSize: '13px',
                fontFamily: '"Barlow", sans-serif'
              }}
            >
              <option value="Ativo">Ativo</option>
              <option value="Paused">Paused</option>
              <option value="Por Pagar">Por Pagar</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: 'transparent',
                border: '1px solid #2a2a2a',
                color: '#888888',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#f0f0f0';
                e.currentTarget.style.color = '#f0f0f0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#2a2a2a';
                e.currentTarget.style.color = '#888888';
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              onClick={onSubmitButtonClick}
              disabled={isSubmitting}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: '#CC0000',
                border: '1px solid #CC0000',
                color: 'white',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                opacity: isSubmitting ? 0.7 : 1
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#990000'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#CC0000'}
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
