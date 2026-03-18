import { AnnouncementItem, AttendanceRecentItem, BirthdayItem, KidBehaviorItem, KpiItem, NoteItem, RequestItem, UnpaidPayment } from './types';

export const kpis: KpiItem[] = [
  { id: 'active', value: '168', label: 'Active Members', accent: 'neutral' },
  { id: 'unpaid', value: '€1,240', label: 'Unpaid (12 people)', accent: 'warning' },
  { id: 'kids-attention', value: '5', label: 'Kids - Needs Attention', accent: 'danger' },
  { id: 'pending-requests', value: '4', label: 'Pending Requests', accent: 'success' },
];

export const notes: NoteItem[] = [
  { id: '1', name: 'Miguel Araujo', audience: 'Kid', preview: 'Great effort in sparring today!', time: '2 min ago' },
  { id: '2', name: 'Pedro Gandaio', audience: 'Adult', preview: 'Reminder: belt exam next week.', time: '1h ago' },
  { id: '3', name: 'Joana Costa', audience: 'Kid', preview: 'Needs to focus more during drills.', time: '3h ago' },
  { id: '4', name: 'Laura Fernandes', audience: 'Adult', preview: 'Paid annual fee ✅', time: '5h ago' },
  { id: '5', name: 'Tomás Leitão', audience: 'Kid', preview: 'Late 3x this month.', time: 'Yesterday' },
];

export const unpaidPayments: UnpaidPayment[] = [
  { id: '1', name: 'Pedro Lopes', amount: '€80.00', due: '15 Apr' },
  { id: '2', name: 'Laura Santos', amount: '€80.00', due: '20 Apr' },
  { id: '3', name: 'Jorge Castro', amount: '€90.00', due: '18 Apr' },
  { id: '4', name: 'Mara Fabre', amount: '€80.00', due: '12 Apr' },
];

export const kidsNeedsAttention: KidBehaviorItem[] = [
  { id: '1', name: 'Miguel Araujo', group: 'Kids 1' },
  { id: '2', name: 'Joana Costa', group: 'Kids 2' },
  { id: '3', name: 'Tomás Leitão', group: 'Kids 1' },
  { id: '4', name: 'Sofia Martins', group: 'Kids 3' },
  { id: '5', name: 'Rui Mendes', group: 'Kids 2' },
];

export const kidsGreatBehavior: KidBehaviorItem[] = [
  { id: '1', name: 'Diana Silva', group: 'Kids 1' },
  { id: '2', name: 'Pedro Reis', group: 'Kids 2' },
  { id: '3', name: 'Inês Almeida', group: 'Kids 1' },
  { id: '4', name: 'Gonçalo Santos', group: 'Kids 3' },
  { id: '5', name: 'Leonor Faria', group: 'Kids 2' },
];

export const attendanceRecent: AttendanceRecentItem[] = [
  { id: '1', name: 'Miguel A.', time: '10:32' },
  { id: '2', name: 'Laura F.', time: '10:35' },
  { id: '3', name: 'Pedro G.', time: '10:20' },
  { id: '4', name: 'Joana C.', time: '10:18' },
  { id: '5', name: 'Rui M.', time: '10:14' },
];

export const requests: RequestItem[] = [
  { id: '1', name: 'Mara Souza', requestedAt: 'Requested 18/04/24' },
  { id: '2', name: 'Miguel Ferreira', requestedAt: 'Requested 18/04/24' },
  { id: '3', name: 'Ricardo Oliveira', requestedAt: 'Requested 17/04/24' },
  { id: '4', name: 'Caria Mendes', requestedAt: 'Requested 17/04/24' },
];

export const birthdays: BirthdayItem[] = [
  { id: '1', name: 'Miguel Araujo', dateLabel: 'Tomorrow' },
  { id: '2', name: 'Joana Costa', dateLabel: '29 Apr' },
  { id: '3', name: 'Pedro Reis', dateLabel: '26 Apr' },
];

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
