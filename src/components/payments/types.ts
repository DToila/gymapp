export interface PaymentRecord {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  overdueDays?: number;
  method: 'DD' | 'TPA' | 'Cash' | 'Other';
  status: 'Unpaid' | 'Paid' | 'Overdue' | 'Failed';
  memberId: string;
}

export interface PaymentHistory {
  id: string;
  name: string;
  amount: number;
  method: 'DD' | 'TPA Card' | 'TPA MBWay' | 'Cash' | 'Other';
  paidDate: string;
  reference?: string;
  notes?: string;
}

export interface DirectDebitRecord {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  status: 'Pending' | 'Failed' | 'Returned';
  batchId?: string;
}

export interface PaymentKpi {
  unpaidCount: number;
  unpaidTotal: number;
  dueThisWeek: number;
  ddFailures: number;
  collectedThisMonth: number;
}
