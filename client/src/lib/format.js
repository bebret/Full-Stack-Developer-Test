export const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export function monthName(month) {
  return MONTH_NAMES[Number(month) - 1] ?? String(month);
}

export function formatNumber(value) {
  return new Intl.NumberFormat('id-ID').format(Number(value) || 0);
}

export function toDateTimeLocal(value) {
  if (!value) return '';
  return String(value).slice(0, 16).replace(' ', 'T');
}

export function fromDateTimeLocal(value) {
  if (!value) return '';
  const normalized = String(value).replace('T', ' ');
  return normalized.length === 16 ? `${normalized}:00` : normalized;
}

export function displayValue(value) {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}
