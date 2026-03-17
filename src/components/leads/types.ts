export type LeadStatus = 'New' | 'Contacted' | 'Trial Booked' | 'Trial Attended' | 'Converted to Request' | 'Lost';
export type LeadSource = 'Email' | 'Walk-in' | 'WhatsApp' | 'Referral' | 'Social Media';
export type RequestStatus = 'Trial Pending' | 'Trial Done' | 'Accepted' | 'Rejected' | 'No-show';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  source: LeadSource;
  status: LeadStatus;
  owner?: string;
  lastContact?: string;
  nextFollowUp?: string;
  tags?: string[];
  notes?: string[];
  created_at?: string;
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
  leadsBySource: Record<LeadSource, number>;
}
