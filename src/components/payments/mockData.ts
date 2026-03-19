import { PaymentRecord, PaymentHistory, DirectDebitRecord, PaymentKpi } from './types';

export const mockUnpaidPayments: PaymentRecord[] = [];

export const mockPaymentHistory: PaymentHistory[] = [];

export const mockDirectDebit: DirectDebitRecord[] = [];

export const mockPaymentKpis: PaymentKpi = {
  unpaidCount: 12,
  unpaidTotal: 850,
  dueThisWeek: 5,
  ddFailures: 1,
  collectedThisMonth: 2950,
};
