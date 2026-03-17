import * as XLSX from 'xlsx';
import { getMembers } from './database';
import { calculateMonthlyFee, Member } from './types';

const normalizeText = (value: string): string => {
  const withoutAccents = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'C');
  return withoutAccents.slice(0, 70);
};

const formatFee = (fee: number): string => {
  const numericFee = Number.isFinite(fee) ? fee : 0;
  return numericFee.toFixed(2).replace('.', ',');
};

const padColumn = (value: string, width: number): string => {
  return String(value || '').slice(0, width).padEnd(width, ' ');
};

const formatDdTxtRow = (columns: string[], widths: number[]): string => {
  const [iban, bank, amount, rcur, ref, date, name] = columns;
  return [
    padColumn(iban, widths[0]),
    padColumn(bank, widths[1]),
    padColumn(amount, widths[2]),
    padColumn(rcur, widths[3]),
    padColumn(ref, widths[4]),
    padColumn(date, widths[5]),
    name,
  ].join('');
};

const sanitizeIban = (iban?: string | null): string => {
  const ibanString = String(iban || '');
  return ibanString.replace(/\s+/g, '').padEnd(34, ' ');
};

const isEligibleDirectDebitMember = (member: Member): boolean => {
  return (
    String((member as any).payment_type || '').trim().toLowerCase() === 'direct debit' &&
    String((member as any).status || '').trim().toLowerCase() === 'active' &&
    Boolean((member as any).iban) &&
    typeof (member as any).fee === 'number' &&
    (member as any).fee > 0
  );
};

const resolveMemberFee = (member: Member): number => {
  const customFee = Number((member as any).custom_fee_amount || 0);
  if ((member as any).custom_fee && customFee > 0) {
    return customFee;
  }

  const persistedFee = Number((member as any).fee || 0);
  if (persistedFee > 0) {
    return persistedFee;
  }

  const calculated = calculateMonthlyFee((member as any).date_of_birth, (member as any).payment_type);
  if (calculated > 0) {
    return calculated;
  }

  const paymentType = String((member as any).payment_type || '').trim().toLowerCase();
  return paymentType === 'direct debit' ? 75 : 80;
};

const getMonthNamePt = (date: Date): string => {
  const monthNames = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return monthNames[date.getMonth()];
};

export const exportDDTxt = async (): Promise<void> => {
  const allMembers = await getMembers();
  const ddMembers = allMembers.filter(isEligibleDirectDebitMember);

  const rowColumns = ddMembers.map((member) => {
    const feeToUse = resolveMemberFee(member);

    const exportDate = new Date()
      .toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
      .replace(/\//g, '-');

    return [
      sanitizeIban((member as any).iban),
      'CGDIPTL',
      formatFee(feeToUse),
      'RCUR',
      (member as any).ref || '',
      exportDate,
      normalizeText((member as any).name || ''),
    ];
  });

  const ddColumnWidths = [0, 1, 2, 3, 4, 5].map((index) => {
    const maxLength = rowColumns.reduce((longest, columns) => {
      return Math.max(longest, String(columns[index] || '').length);
    }, 0);
    return maxLength + 2;
  });

  const rows = rowColumns.map((columns) => formatDdTxtRow(columns, ddColumnWidths));
  const fileContent = rows.join('\n');

  const today = new Date();
  const filename = `DD_${getMonthNamePt(today)}_GBCQ.txt`;

  const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

export const exportDDExcel = async (): Promise<void> => {
  const allMembers = await getMembers();
  const ddMembers = allMembers.filter(isEligibleDirectDebitMember);

  const excelData = ddMembers.map((member) => {
    const feeToUse = resolveMemberFee(member);

    const exportDate = new Date()
      .toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
      .replace(/\//g, '-');

    return [
      sanitizeIban((member as any).iban),
      'CGDIPTL',
      formatFee(feeToUse),
      'RCUR',
      (member as any).ref || '',
      exportDate,
      normalizeText((member as any).name || ''),
    ];
  });

  const worksheet = XLSX.utils.aoa_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'DD Export');

  const today = new Date();
  const filename = `DD_${getMonthNamePt(today)}_GBCQ.xlsx`;

  XLSX.writeFile(workbook, filename);
};
