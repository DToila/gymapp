export interface AcademySettings {
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  logo?: string;
  primaryColor?: string;
}

export interface StaffMember {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'coach' | 'staff';
  added_at: string;
}

export interface PricingRules {
  adultDd: number;
  adultNonDd: number;
  kidsDd: number;
  kidsNonDd: number;
  familyDiscount: number;
  annualDiscount: number;
}
