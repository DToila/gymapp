import { AcademySettings, PricingRules } from './types';

export const defaultAcademySettings: AcademySettings = {
  name: 'Gracie Barra Academia',
  address: 'Rua Exemplo, 123',
  city: 'Lisboa',
  phone: '+351 21 123 456',
  email: 'contato@graciebarrapt.com',
  primaryColor: '#c81d25',
};

export const defaultPricingRules: PricingRules = {
  adultDd: 75,
  adultNonDd: 80,
  kidsDd: 65,
  kidsNonDd: 70,
  familyDiscount: 5,
  annualDiscount: 10,
};
