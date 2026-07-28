export type LeadStatus =
  | 'Por contactar'
  | 'Contactado'
  | 'Aula agendada'
  | 'Aula realizada'
  | 'Aguarda decisao'
  | 'Inscrito'
  | 'Nao inscrito';

export type LeadContactSource =
  | 'Website'
  | 'Instagram'
  | 'Walk in'
  | 'Outros'
  | 'Alunos GBCQ'
  | 'WhatsApp'
  | 'Telefone';

export type LeadClassType = 'GBK' | 'GB1' | 'GB2';

export type NotEnrolledReasonCode =
  | 'Sem tempo'
  | 'Muito caro'
  | 'Sem interesse'
  | 'Escolheu outro ginasio'
  | 'Motivos de saude'
  | 'Outros';

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
  age?: number | null;
  trial_schedule_id?: string | null;
  trial_feedback?: string | null;
  trial_feedback_at?: string | null;
  trial_feedback_by?: string | null;
}

export const LEAD_SOURCES: LeadContactSource[] = [
  'Website',
  'Instagram',
  'Walk in',
  'Outros',
  'Alunos GBCQ',
  'WhatsApp',
  'Telefone',
];

export const LEAD_CLASS_TYPES: LeadClassType[] = ['GBK', 'GB1', 'GB2'];

export const LEAD_STATUSES: LeadStatus[] = [
  'Por contactar',
  'Contactado',
  'Aula agendada',
  'Aula realizada',
  'Aguarda decisao',
  'Inscrito',
  'Nao inscrito',
];

export const DECISION_WAIT_DAYS_DEFAULT = 3;

export const NOT_ENROLLED_REASONS: NotEnrolledReasonCode[] = [
  'Sem tempo',
  'Muito caro',
  'Sem interesse',
  'Escolheu outro ginasio',
  'Motivos de saude',
  'Outros',
];
