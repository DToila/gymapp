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
  { id: 'c1', day: 1, dayLabel: 'Seg', time: '07:00-08:00', room: 'GB1', level: 'Todos os níveis', type: 'Gi' },
  { id: 'c2', day: 1, dayLabel: 'Seg', time: '12:15-13:15', room: 'GB1', level: 'Todos os níveis', type: 'No-Gi' },
  { id: 'c3', day: 2, dayLabel: 'Ter', time: '19:30-20:30', room: 'GB2', level: 'Intermédio', type: 'Gi' },
  { id: 'c4', day: 3, dayLabel: 'Qua', time: '07:00-08:00', room: 'GB1', level: 'Todos os níveis', type: 'Gi' },
  { id: 'c5', day: 4, dayLabel: 'Qui', time: '18:30-19:30', room: 'GBK', level: 'Kids/Teens', type: 'Gi', notes: 'Bring gi' },
  { id: 'c6', day: 5, dayLabel: 'Sex', time: '13:15-13:45', room: 'GB1', level: 'Todos os níveis', type: 'Sparring' },
  { id: 'c7', day: 6, dayLabel: 'Sáb', time: '10:00-11:00', room: 'GB2', level: 'Todos os níveis', type: 'No-Gi' },
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
