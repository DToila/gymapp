export type SidebarItemKey = 'dashboard' | 'members' | 'attendance' | 'payments' | 'requests' | 'definitions';

export interface NoteItem {
  id: string;
  name: string;
  audience: 'Kid' | 'Adult';
  preview: string;
  time: string;
}

export interface UnpaidPayment {
  id: string;
  name: string;
  amount: string;
  due: string;
}

export interface KidBehaviorItem {
  id: string;
  name: string;
  group: string;
}

export interface AttendanceRecentItem {
  id: string;
  name: string;
  time: string;
}

export interface RequestItem {
  id: string;
  name: string;
  requestedAt: string;
}

export interface BirthdayItem {
  id: string;
  name: string;
  dateLabel: string;
}

export interface KpiItem {
  id: string;
  value: string;
  label: string;
  accent?: 'danger' | 'warning' | 'success' | 'neutral';
}
