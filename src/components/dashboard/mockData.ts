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
  { id: 'a-1', tag: 'URGENT', title: 'Thursday class starts 30 minutes earlier this week.', audience: 'All', expiresAt: '12 Apr', pinned: true },
  { id: 'a-2', tag: 'EVENT', title: 'Kids belt graduation on Saturday at 10:00.', audience: 'Kids', expiresAt: '19 Apr', pinned: true },
  { id: 'a-3', tag: 'PAYMENTS', title: 'Monthly fees due by the 5th of each month.', audience: 'Adults', expiresAt: '05 May' },
  { id: 'a-4', tag: 'INFO', title: 'New water station available near the front desk.', audience: 'All', expiresAt: '30 Apr' },
  { id: 'a-5', tag: 'EVENT', title: 'Open mat this Sunday for all active members.', audience: 'Adults', expiresAt: '21 Apr' },
  { id: 'a-6', tag: 'PAYMENTS', title: 'Direct debit update required for expired IBANs.', audience: 'All', expiresAt: '28 Apr' },
  { id: 'a-7', tag: 'URGENT', title: 'Uniform policy will be strictly enforced from next week.', audience: 'Kids', expiresAt: '16 Apr' },
  { id: 'a-8', tag: 'INFO', title: 'Parking lot maintenance scheduled for Friday morning.', audience: 'All', expiresAt: '26 Apr' },
  { id: 'a-9', tag: 'EVENT', title: 'Competition prep workshop registration now open.', audience: 'Adults', expiresAt: '24 Apr' },
  { id: 'a-10', tag: 'PAYMENTS', title: 'Installment reminder emails sent every Monday.', audience: 'All', expiresAt: '06 May' },
  { id: 'a-11', tag: 'INFO', title: 'Reception desk closes at 20:30 on weekdays.', audience: 'All', expiresAt: '15 May' },
  { id: 'a-12', tag: 'URGENT', title: 'Bring mouthguards for all sparring sessions.', audience: 'Kids', expiresAt: '18 Apr' },
];
