import { Member } from './types';

export const mockMembers: Member[] = [
  {
    id: 'm-1',
    name: 'Joao Silva',
    email: 'joao@example.com',
    phone: '912345678',
    belt: 'White',
    status: 'Active',
    paymentMethod: 'Direct Debit',
    fee: 80,
    amountDue: 0,
    nextPaymentDate: '2026-03-28',
    enrolledAt: '2026-01-02',
    dateOfBirth: '1994-06-12',
    lastAttendanceAt: '2026-03-14'
  },
  {
    id: 'm-2',
    name: 'Miguel Pereira',
    email: 'miguel@example.com',
    phone: '913456789',
    belt: 'Blue',
    status: 'Unpaid',
    paymentMethod: 'Cash',
    fee: 80,
    amountDue: 80,
    nextPaymentDate: '2026-03-10',
    enrolledAt: '2025-11-12',
    dateOfBirth: '1990-02-19',
    lastAttendanceAt: '2026-01-10'
  },
  {
    id: 'm-3',
    name: 'Beatriz Costa',
    email: 'beatriz@example.com',
    phone: '914567891',
    group: 'Kids 1',
    behaviorState: 'good',
    status: 'Active',
    fee: 65,
    amountDue: 0,
    enrolledAt: '2026-02-01',
    dateOfBirth: '2015-09-30',
    lastAttendanceAt: '2026-03-15'
  },
  {
    id: 'm-4',
    name: 'Tiago Ramos',
    email: 'tiago@example.com',
    phone: '915678912',
    group: 'Teens',
    behaviorState: 'attention',
    status: 'Active',
    fee: 65,
    amountDue: 0,
    enrolledAt: '2026-01-20',
    dateOfBirth: '2011-07-18',
    lastAttendanceAt: '2026-02-01'
  }
];

export const mockRequests: Member[] = [
  {
    id: 'r-1',
    name: 'Ana Duarte',
    email: 'ana.duarte@gmail.com',
    phone: '916123456',
    status: 'Pending',
    requestStatus: 'Pending',
    fee: 0,
    enrolledAt: '2026-03-15',
    dateOfBirth: '2008-04-11'
  },
  {
    id: 'r-2',
    name: 'Rui Fernandes',
    email: 'rui.fernandes@gmail.com',
    phone: '917321654',
    status: 'Pending',
    requestStatus: 'In review',
    fee: 0,
    enrolledAt: '2026-03-14',
    dateOfBirth: '1999-11-02'
  }
];
