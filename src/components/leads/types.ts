export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'trial_booked'
  | 'trial_done'
  | 'lost'
  | 'converted_to_request';

export type LeadContactSource =
  | 'Website'
  | 'Instagram'
  | 'Walk-in'
  | 'Outros'
  | 'Alunos GBCQ'
  | 'WhatsApp'
  | 'Telefone';

export type LeadClassType = 'GBK' | 'GB1' | 'GB2';

export type NotEnrolledReasonCode =
  | 'No time'
  | 'Too expensive'
  | 'No interest'
  | 'Chose another gym'
  | 'Health reasons'
  | 'Outros';

export type RequestStatus = 'Trial Pending' | 'Trial Done' | 'Accepted' | 'Rejected' | 'No-show';

export interface Lead {
  id: string;
  name: string;
  contact_source: LeadContactSource;
  contact_date: string;
  phone?: string;
  email?: string;
  class_type: LeadClassType;
  notes?: string;
  next_contact_date?: string;
  followup_note?: string;
  status: LeadStatus;
  trial_date?: string;
  enrolled: boolean;
  not_enrolled_reason?: NotEnrolledReasonCode;
  not_enrolled_reason_text?: string;
}

export interface LeadRequest {
  id: string;
  name: string;
  email?: string;
  phone: string;
  status: RequestStatus;
  trialDate?: string;
  requestedAt?: string;
  notes?: string;
}

export interface LeadStats {
  leadsThisWeek: number;
  leadsThisMonth: number;
  conversionRate: string;
  noShowRate: string;
  avgTimeToConvert: string;
  leadsBySource: Partial<Record<LeadContactSource, number>>;
}

export const LEAD_SOURCES: LeadContactSource[] = [
  'Website',
  'Instagram',
  'Walk-in',
  'Outros',
  'Alunos GBCQ',
  'WhatsApp',
  'Telefone',
];

export const LEAD_CLASS_TYPES: LeadClassType[] = ['GBK', 'GB1', 'GB2'];

export const LEAD_STATUSES: LeadStatus[] = [
  'new',
  'contacted',
  'trial_booked',
  'trial_done',
  'lost',
  'converted_to_request',
];

export const NOT_ENROLLED_REASONS: NotEnrolledReasonCode[] = [
  'No time',
  'Too expensive',
  'No interest',
  'Chose another gym',
  'Health reasons',
  'Outros',
];
