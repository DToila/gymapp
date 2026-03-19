import { AnnouncementItem, AttendanceRecentItem, BirthdayItem, KidBehaviorItem, KpiItem, NoteItem, RequestItem, UnpaidPayment } from './types';

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

export const announcements: AnnouncementItem[] = [
  { id: 'a-1', tag: 'URGENT', title: 'Thursday class starts 30 minutes earlier this week.', audience: 'ALL', expiresAt: '2026-04-12', pinned: true, ackRequired: true, createdAt: '2026-03-10T09:00:00.000Z', approvalStatus: 'approved' },
  { id: 'a-2', tag: 'EVENT', title: 'Kids belt graduation on Saturday at 10:00.', audience: 'KIDS', kidsGroup: 'Kids 2', expiresAt: '2026-04-19', pinned: true, createdAt: '2026-03-11T12:30:00.000Z', approvalStatus: 'approved' },
  { id: 'a-3', tag: 'PAYMENTS', title: 'Monthly fees due by the 5th of each month.', audience: 'ADULTS', expiresAt: '2026-05-05', createdAt: '2026-03-11T16:20:00.000Z', approvalStatus: 'approved' },
  { id: 'a-4', tag: 'INFO', title: 'New water station available near the front desk.', audience: 'ALL', expiresAt: '2026-04-30', createdAt: '2026-03-12T08:15:00.000Z', approvalStatus: 'approved' },
  { id: 'a-5', tag: 'EVENT', title: 'Open mat this Sunday for all active members.', audience: 'ADULTS', expiresAt: '2026-04-21', createdAt: '2026-03-12T14:00:00.000Z', approvalStatus: 'approved' },
  { id: 'a-6', tag: 'PAYMENTS', title: 'Direct debit update required for expired IBANs.', audience: 'ALL', expiresAt: '2026-04-28', createdAt: '2026-03-13T09:10:00.000Z', approvalStatus: 'approved' },
  { id: 'a-7', tag: 'URGENT', title: 'Uniform policy will be strictly enforced from next week.', audience: 'KIDS', kidsGroup: 'Kids 1', expiresAt: '2026-04-16', ackRequired: true, createdAt: '2026-03-13T17:40:00.000Z', approvalStatus: 'approved' },
  { id: 'a-8', tag: 'INFO', title: 'Parking lot maintenance scheduled for Friday morning.', audience: 'ALL', expiresAt: '2026-04-26', createdAt: '2026-03-14T10:30:00.000Z', approvalStatus: 'approved' },
  { id: 'a-9', tag: 'EVENT', title: 'Competition prep workshop registration now open.', audience: 'ADULTS', expiresAt: '2026-04-24', createdAt: '2026-03-14T15:55:00.000Z', approvalStatus: 'approved' },
  { id: 'a-10', tag: 'PAYMENTS', title: 'Installment reminder emails sent every Monday.', audience: 'ALL', expiresAt: '2026-05-06', createdAt: '2026-03-15T11:45:00.000Z', approvalStatus: 'approved' },
  { id: 'a-11', tag: 'INFO', title: 'Reception desk closes at 20:30 on weekdays.', audience: 'STAFF', expiresAt: '2026-05-15', createdAt: '2026-03-15T18:00:00.000Z', approvalStatus: 'approved' },
  { id: 'a-12', tag: 'URGENT', title: 'Bring mouthguards for all sparring sessions.', audience: 'KIDS', kidsGroup: 'Teens', expiresAt: '2026-04-18', ackRequired: true, createdAt: '2026-03-16T08:30:00.000Z', approvalStatus: 'approved' },
];
