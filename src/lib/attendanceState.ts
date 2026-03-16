export type BehaviorValue = 'GOOD' | 'NEUTRAL' | 'BAD' | null;

export const ATTENDANCE_STORAGE_KEY = 'attendance_by_date';
export const KID_BEHAVIOR_STORAGE_KEY = 'attendance_kid_behavior_by_date';

export const toDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};
