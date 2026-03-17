import { AnnouncementItem } from '../dashboard/types';

export type DayOfWeekKey = 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM';
export type ScheduleProgram = 'GB1' | 'GB2' | 'GBK';
export type KidsGroup = 'MC' | 'PC1' | 'PC2' | 'Juniors';
export type GiType = 'GI' | 'NOGI';
export type ScheduleTag = 'SPARRING';

export interface OfficialScheduleClass {
  id: string;
  dayOfWeek: DayOfWeekKey;
  startTime: string;
  endTime: string;
  program: ScheduleProgram;
  kidsGroup?: KidsGroup;
  giType: GiType;
  tags?: ScheduleTag[];
}

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

export const officialSchedule: OfficialScheduleClass[] = [
  { id: 'seg-1', dayOfWeek: 'SEG', startTime: '07:00', endTime: '08:00', program: 'GB1', giType: 'GI' },
  { id: 'seg-2', dayOfWeek: 'SEG', startTime: '12:15', endTime: '13:15', program: 'GB1', giType: 'GI' },
  { id: 'seg-3', dayOfWeek: 'SEG', startTime: '13:15', endTime: '13:45', program: 'GB1', giType: 'GI', tags: ['SPARRING'] },
  { id: 'seg-4', dayOfWeek: 'SEG', startTime: '18:15', endTime: '19:15', program: 'GBK', kidsGroup: 'PC1', giType: 'GI' },
  { id: 'seg-5', dayOfWeek: 'SEG', startTime: '19:15', endTime: '20:15', program: 'GB1', giType: 'GI' },
  { id: 'seg-6', dayOfWeek: 'SEG', startTime: '20:15', endTime: '21:15', program: 'GB2', giType: 'GI' },

  { id: 'ter-1', dayOfWeek: 'TER', startTime: '07:00', endTime: '08:00', program: 'GB1', giType: 'GI' },
  { id: 'ter-2', dayOfWeek: 'TER', startTime: '12:15', endTime: '13:15', program: 'GB2', giType: 'GI' },
  { id: 'ter-3', dayOfWeek: 'TER', startTime: '17:30', endTime: '18:15', program: 'GBK', kidsGroup: 'MC', giType: 'GI' },
  { id: 'ter-4', dayOfWeek: 'TER', startTime: '18:15', endTime: '19:15', program: 'GBK', kidsGroup: 'PC2', giType: 'GI' },
  { id: 'ter-5', dayOfWeek: 'TER', startTime: '19:15', endTime: '20:15', program: 'GB2', giType: 'NOGI' },
  { id: 'ter-6', dayOfWeek: 'TER', startTime: '20:15', endTime: '21:15', program: 'GB1', giType: 'GI' },

  { id: 'qua-1', dayOfWeek: 'QUA', startTime: '07:00', endTime: '08:00', program: 'GB1', giType: 'GI' },
  { id: 'qua-2', dayOfWeek: 'QUA', startTime: '12:15', endTime: '13:15', program: 'GB1', giType: 'GI' },
  { id: 'qua-3', dayOfWeek: 'QUA', startTime: '13:15', endTime: '13:45', program: 'GB1', giType: 'GI', tags: ['SPARRING'] },
  { id: 'qua-4', dayOfWeek: 'QUA', startTime: '18:15', endTime: '19:15', program: 'GBK', kidsGroup: 'PC1', giType: 'GI' },
  { id: 'qua-5', dayOfWeek: 'QUA', startTime: '19:15', endTime: '20:15', program: 'GB1', giType: 'GI' },
  { id: 'qua-6', dayOfWeek: 'QUA', startTime: '20:15', endTime: '21:15', program: 'GB2', giType: 'GI' },

  { id: 'qui-1', dayOfWeek: 'QUI', startTime: '07:00', endTime: '08:00', program: 'GB1', giType: 'GI' },
  { id: 'qui-2', dayOfWeek: 'QUI', startTime: '12:15', endTime: '13:15', program: 'GB2', giType: 'NOGI' },
  { id: 'qui-3', dayOfWeek: 'QUI', startTime: '17:30', endTime: '18:15', program: 'GBK', kidsGroup: 'MC', giType: 'GI' },
  { id: 'qui-4', dayOfWeek: 'QUI', startTime: '18:15', endTime: '19:15', program: 'GBK', kidsGroup: 'PC2', giType: 'GI' },
  { id: 'qui-5', dayOfWeek: 'QUI', startTime: '19:15', endTime: '20:15', program: 'GB2', giType: 'GI' },
  { id: 'qui-6', dayOfWeek: 'QUI', startTime: '20:15', endTime: '21:15', program: 'GB1', giType: 'GI' },

  { id: 'sex-1', dayOfWeek: 'SEX', startTime: '07:00', endTime: '08:00', program: 'GB1', giType: 'GI' },
  { id: 'sex-2', dayOfWeek: 'SEX', startTime: '12:15', endTime: '13:15', program: 'GB1', giType: 'GI' },
  { id: 'sex-3', dayOfWeek: 'SEX', startTime: '13:15', endTime: '13:45', program: 'GB1', giType: 'GI', tags: ['SPARRING'] },
  { id: 'sex-4', dayOfWeek: 'SEX', startTime: '18:15', endTime: '19:15', program: 'GBK', kidsGroup: 'PC1', giType: 'GI' },
  { id: 'sex-5', dayOfWeek: 'SEX', startTime: '19:15', endTime: '20:15', program: 'GB1', giType: 'GI' },

  { id: 'sab-1', dayOfWeek: 'SAB', startTime: '10:00', endTime: '11:00', program: 'GB1', giType: 'GI' },
  { id: 'sab-2', dayOfWeek: 'SAB', startTime: '10:00', endTime: '11:00', program: 'GB2', giType: 'GI' },
  { id: 'sab-3', dayOfWeek: 'SAB', startTime: '11:00', endTime: '11:30', program: 'GB1', giType: 'GI', tags: ['SPARRING'] },
];

const dayKeyToLegacy: Record<DayOfWeekKey, { day: number; dayLabel: string }> = {
  SEG: { day: 1, dayLabel: 'Seg' },
  TER: { day: 2, dayLabel: 'Ter' },
  QUA: { day: 3, dayLabel: 'Qua' },
  QUI: { day: 4, dayLabel: 'Qui' },
  SEX: { day: 5, dayLabel: 'Sex' },
  SAB: { day: 6, dayLabel: 'Sáb' },
  DOM: { day: 0, dayLabel: 'Dom' },
};

export const studentSchedule: ScheduleClass[] = officialSchedule.map((item) => {
  const legacyDay = dayKeyToLegacy[item.dayOfWeek];
  const kidsLabel = item.kidsGroup ? `Kids (${item.kidsGroup})` : 'Todos os níveis';
  const isSparring = Boolean(item.tags?.includes('SPARRING'));

  return {
    id: item.id,
    day: legacyDay.day,
    dayLabel: legacyDay.dayLabel,
    time: `${item.startTime}-${item.endTime}`,
    room: item.program,
    level: item.program === 'GBK' ? kidsLabel : 'Todos os níveis',
    type: isSparring ? 'Sparring' : item.giType === 'NOGI' ? 'No-Gi' : 'Gi',
    notes: item.program === 'GBK' ? `Turma Kids ${item.kidsGroup || ''}`.trim() : undefined,
  };
});

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
