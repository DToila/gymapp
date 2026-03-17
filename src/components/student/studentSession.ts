export const STUDENT_SESSION_KEY = 'gymapp.studentId';

export const readStudentSessionId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(STUDENT_SESSION_KEY);
};

export const writeStudentSessionId = (studentId: string) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STUDENT_SESSION_KEY, studentId);
};

export const clearStudentSessionId = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STUDENT_SESSION_KEY);
};
