export type SidebarItemKey = 'dashboard' | 'members' | 'attendance' | 'leads' | 'payments' | 'settings';

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

export type AnnouncementTag = 'URGENT' | 'INFO' | 'EVENT' | 'PAYMENTS';
export type AnnouncementAudience = 'ALL' | 'ADULTS' | 'KIDS' | 'STAFF';
export type KidsGroup = 'Kids 1' | 'Kids 2' | 'Teens';
export type AppRole = 'coach' | 'staff' | 'admin';
export type AnnouncementApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface AnnouncementItem {
  id: string;
  tag: AnnouncementTag;
  title: string;
  details?: string;
  audience: AnnouncementAudience;
  kidsGroup?: KidsGroup | null;
  expiresAt: string;
  pinned?: boolean;
  ackRequired?: boolean;
  createdAt?: string;
  createdBy?: string;
  createdById?: string;
  approvalStatus: AnnouncementApprovalStatus;
  approvedBy?: string | null;
  approvedById?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
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
