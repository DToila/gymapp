import { AcademySettings, StaffMember, PricingRules } from './types';

export const defaultAcademySettings: AcademySettings = {
  name: 'Gracie Barra Academia',
  address: 'Rua Exemplo, 123',
  city: 'Lisboa',
  phone: '+351 21 123 456',
  email: 'contato@graciebarrapt.com',
  primaryColor: '#c81d25',
};

export const mockStaffMembers: StaffMember[] = [
  {
    id: 'staff-1',
    email: 'ana@graciebarrapt.com',
    full_name: 'Professor Ana Silva',
    role: 'admin',
    added_at: '2026-01-15',
  },
  {
    id: 'staff-2',
    email: 'carlos@graciebarrapt.com',
    full_name: 'Professor Carlos',
    role: 'coach',
    added_at: '2026-01-15',
  },
  {
    id: 'staff-3',
    email: 'marina@graciebarrapt.com',
    full_name: 'Marina - Recepção',
    role: 'staff',
    added_at: '2026-02-01',
  },
];

export const defaultPricingRules: PricingRules = {
  adultDd: 75,
  adultNonDd: 80,
  kidsDd: 65,
  kidsNonDd: 70,
  familyDiscount: 5,
  annualDiscount: 10,
};
