export type MembersTab = 'adults' | 'kids' | 'requests';

export type MemberStatus = 'Active' | 'Paused' | 'Unpaid' | 'Pending';
export type PaymentMethod = 'Direct Debit' | 'Cash' | 'MBWay' | 'Other';
export type BehaviorState = 'good' | 'neutral' | 'attention';
export type KidsGroup = 'Kids 1' | 'Kids 2' | 'Teens';

export interface Member {
  id: string;
  name: string;
  avatarUrl?: string;
  email?: string;
  phone?: string;
  belt?: string;
  group?: KidsGroup;
  status: MemberStatus;
  paymentMethod?: PaymentMethod;
  fee: number;
  nextPaymentDate?: string;
  amountDue?: number;
  behaviorState?: BehaviorState;
  enrolledAt: string;
  dateOfBirth?: string;
  lastAttendanceAt?: string;
  requestStatus?: 'Pending' | 'In review' | 'Rejected';
}

export type QuickView = 'recent' | 'unpaid' | 'birthdays' | 'newThisMonth' | 'inactive';

export type AdultsSort = 'recent' | 'name' | 'paymentDue' | 'enrollmentDesc';
export type KidsSort = 'recent' | 'name' | 'attentionFirst';

export interface AdultsFilters {
  status: 'all' | 'active' | 'paused' | 'unpaid';
  belt: 'all' | 'White' | 'Blue' | 'Purple' | 'Brown' | 'Black';
  payment: 'all' | PaymentMethod;
  sort: AdultsSort;
}

export interface KidsFilters {
  group: 'all' | KidsGroup;
  behavior: 'all' | BehaviorState;
  sort: KidsSort;
}
