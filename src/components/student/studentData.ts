import { AnnouncementItem } from '../dashboard/types';

export interface ScheduleClass {
  id: string;
  day: number;
  dayLabel: string;
  time: string;
  room: 'GBK' | 'GB1' | 'GB2';
  level: string;
  type: 'Gi' | 'No-Gi' | 'Sparring';
  notes?: string;
}

export const studentSchedule: ScheduleClass[] = [
  // Segunda-feira
  { id: 'seg-1', day: 1, dayLabel: 'Seg', time: '07:00-08:00', room: 'GB1', level: 'Todos os níveis', type: 'Gi' },
  { id: 'seg-2', day: 1, dayLabel: 'Seg', time: '09:00-10:00', room: 'GBK', level: 'Kids', type: 'Gi' },
  { id: 'seg-3', day: 1, dayLabel: 'Seg', time: '12:15-13:15', room: 'GB1', level: 'Todos os níveis', type: 'Gi' },
  { id: 'seg-4', day: 1, dayLabel: 'Seg', time: '13:15-13:45', room: 'GB1', level: 'Todos os níveis', type: 'Sparring' },
  { id: 'seg-5', day: 1, dayLabel: 'Seg', time: '18:15-19:15', room: 'GB2', level: 'Todos os níveis', type: 'Gi' },
  { id: 'seg-6', day: 1, dayLabel: 'Seg', time: '19:15-20:15', room: 'GB1', level: 'Avançado', type: 'Gi' },
  { id: 'seg-7', day: 1, dayLabel: 'Seg', time: '20:15-21:15', room: 'GB2', level: 'Todos os níveis', type: 'No-Gi' },

  // Terça-feira
  { id: 'ter-1', day: 2, dayLabel: 'Ter', time: '07:00-08:00', room: 'GB1', level: 'Todos os níveis', type: 'Gi' },
  { id: 'ter-2', day: 2, dayLabel: 'Ter', time: '12:15-13:15', room: 'GB2', level: 'Todos os níveis', type: 'No-Gi' },
  { id: 'ter-3', day: 2, dayLabel: 'Ter', time: '17:30-18:15', room: 'GBK', level: 'Kids', type: 'Gi' },
  { id: 'ter-4', day: 2, dayLabel: 'Ter', time: '18:15-19:15', room: 'GB1', level: 'Iniciante', type: 'Gi' },
  { id: 'ter-5', day: 2, dayLabel: 'Ter', time: '19:15-20:15', room: 'GB2', level: 'Intermédio', type: 'Gi' },
  { id: 'ter-6', day: 2, dayLabel: 'Ter', time: '20:15-21:15', room: 'GB1', level: 'Todos os níveis', type: 'Gi' },

  // Quarta-feira
  { id: 'qua-1', day: 3, dayLabel: 'Qua', time: '07:00-08:00', room: 'GB1', level: 'Todos os níveis', type: 'Gi' },
  { id: 'qua-2', day: 3, dayLabel: 'Qua', time: '09:00-10:00', room: 'GBK', level: 'Kids', type: 'Gi' },
  { id: 'qua-3', day: 3, dayLabel: 'Qua', time: '12:15-13:15', room: 'GB1', level: 'Todos os níveis', type: 'Gi' },
  { id: 'qua-4', day: 3, dayLabel: 'Qua', time: '13:15-13:45', room: 'GB1', level: 'Todos os níveis', type: 'Sparring' },
  { id: 'qua-5', day: 3, dayLabel: 'Qua', time: '18:15-19:15', room: 'GB2', level: 'Todos os níveis', type: 'No-Gi' },
  { id: 'qua-6', day: 3, dayLabel: 'Qua', time: '19:15-20:15', room: 'GB1', level: 'Avançado', type: 'Gi' },
  { id: 'qua-7', day: 3, dayLabel: 'Qua', time: '20:15-21:15', room: 'GB2', level: 'Todos os níveis', type: 'Gi' },

  // Quinta-feira
  { id: 'qui-1', day: 4, dayLabel: 'Qui', time: '07:00-08:00', room: 'GB1', level: 'Todos os níveis', type: 'Gi' },
  { id: 'qui-2', day: 4, dayLabel: 'Qui', time: '12:15-13:15', room: 'GB2', level: 'Todos os níveis', type: 'No-Gi' },
  { id: 'qui-3', day: 4, dayLabel: 'Qui', time: '17:30-18:15', room: 'GBK', level: 'Kids/Teens', type: 'Gi', notes: 'Trazer kimono' },
  { id: 'qui-4', day: 4, dayLabel: 'Qui', time: '18:15-19:15', room: 'GB1', level: 'Iniciante', type: 'Gi' },
  { id: 'qui-5', day: 4, dayLabel: 'Qui', time: '19:15-20:15', room: 'GB2', level: 'Intermédio', type: 'Gi' },
  { id: 'qui-6', day: 4, dayLabel: 'Qui', time: '20:15-21:15', room: 'GB1', level: 'Todos os níveis', type: 'Gi' },

  // Sexta-feira
  { id: 'sex-1', day: 5, dayLabel: 'Sex', time: '07:00-08:00', room: 'GB1', level: 'Todos os níveis', type: 'Gi' },
  { id: 'sex-2', day: 5, dayLabel: 'Sex', time: '12:15-13:15', room: 'GB1', level: 'Todos os níveis', type: 'Gi' },
  { id: 'sex-3', day: 5, dayLabel: 'Sex', time: '13:15-13:45', room: 'GB1', level: 'Todos os níveis', type: 'Sparring' },
  { id: 'sex-4', day: 5, dayLabel: 'Sex', time: '18:15-19:15', room: 'GB2', level: 'Todos os níveis', type: 'No-Gi' },
  { id: 'sex-5', day: 5, dayLabel: 'Sex', time: '19:15-20:15', room: 'GB1', level: 'Todos os níveis', type: 'Gi' },

  // Sábado
  { id: 'sab-1', day: 6, dayLabel: 'Sáb', time: '09:00-10:00', room: 'GBK', level: 'Kids', type: 'Gi' },
  { id: 'sab-2', day: 6, dayLabel: 'Sáb', time: '10:00-11:00', room: 'GB1', level: 'Todos os níveis', type: 'Gi' },
  { id: 'sab-3', day: 6, dayLabel: 'Sáb', time: '10:00-11:00', room: 'GB2', level: 'Todos os níveis', type: 'No-Gi' },
  { id: 'sab-4', day: 6, dayLabel: 'Sáb', time: '11:00-11:30', room: 'GB1', level: 'Todos os níveis', type: 'Sparring' },
];

export const getTodayClasses = (): ScheduleClass[] => {
  const day = new Date().getDay();
  return studentSchedule.filter((item) => item.day === day);
};

export const audienceMatchesStudent = (item: AnnouncementItem, isKid: boolean): boolean => {
  if (item.audience === 'ALL') return true;
  if (item.audience === 'STAFF') return false;
  if (isKid) return item.audience === 'KIDS';
  return item.audience === 'ADULTS';
};
