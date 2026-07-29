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
  | 'Telefone'
  | 'Site Wix';

export type LeadClassType = 'GBK' | 'GB1' | 'GB2';

export type HeardFromOption =
  | 'Website'
  | 'Social Media'
  | 'Outras academias GB'
  | 'Alunos GBCQ'
  | 'Visibilidade Rua'
  | 'Flyer'
  | 'Outro';

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
  nif?: string | null;
  sexo?: 'M' | 'F' | null;
  morada?: string | null;
  codigo_postal?: string | null;
  contacto_emergencia?: string | null;
  como_soube?: HeardFromOption | null;
  nome_pai?: string | null;
  nome_mae?: string | null;
  mensagem_inicial?: string | null;
}

export const LEAD_SOURCES: LeadContactSource[] = [
  'Website',
  'Instagram',
  'Walk in',
  'Outros',
  'Alunos GBCQ',
  'WhatsApp',
  'Telefone',
  'Site Wix',
];

export const LEAD_CLASS_TYPES: LeadClassType[] = ['GBK', 'GB1', 'GB2'];

export const HEARD_FROM_OPTIONS: HeardFromOption[] = [
  'Website',
  'Social Media',
  'Outras academias GB',
  'Alunos GBCQ',
  'Visibilidade Rua',
  'Flyer',
  'Outro',
];

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
