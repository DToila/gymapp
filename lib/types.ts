export interface Member {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  belt_level: string;
  status: 'Active' | 'Paused' | 'Unpaid';
  payment_type?: 'Direct Debit' | 'Cash';
  fee?: number;
  family_discount: boolean;
  date_of_birth?: string;
  iban?: string;
  nif?: string;
  ref?: string;
  created_at: string;
}

export interface Attendance {
  id: string;
  member_id: string;
  date: string;
  attended: boolean;
  created_at: string;
}

export interface Note {
  id: string;
  member_id: string;
  date: string;
  teacher_name: string;
  note_text: string;
  created_at: string;
}

export const calculateMonthlyFee = (dateOfBirth: string | undefined, paymentType: string | undefined): number => {
  if (!dateOfBirth || !paymentType) return 0;
  
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  if (age < 16) {
    return paymentType === 'Direct Debit' ? 65 : 70;
  } else {
    return paymentType === 'Direct Debit' ? 75 : 80;
  }
};