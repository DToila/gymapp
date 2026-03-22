import { AttendanceRecentItem, BirthdayItem, KidBehaviorItem, KpiItem, NoteItem, RequestItem, UnpaidPayment } from './types';

export const kpis: KpiItem[] = [
  { id: 'active', value: '168', label: 'Active Members', accent: 'neutral' },
  { id: 'unpaid', value: '€1,240', label: 'Unpaid (12 people)', accent: 'warning' },
  { id: 'kids-attention', value: '5', label: 'Kids - Needs Attention', accent: 'danger' },
  { id: 'pending-requests', value: '4', label: 'Pending Requests', accent: 'success' },
];

export const notes: NoteItem[] = [];

export const unpaidPayments: UnpaidPayment[] = [];

export const kidsNeedsAttention: KidBehaviorItem[] = [];

export const kidsGreatBehavior: KidBehaviorItem[] = [];

export const attendanceRecent: AttendanceRecentItem[] = [];

export const requests: RequestItem[] = [];

export const birthdays: BirthdayItem[] = [];
