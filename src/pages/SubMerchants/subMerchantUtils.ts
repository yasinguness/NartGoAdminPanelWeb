export const onlyDigits = (value: string) => value.replace(/\D/g, '');

export const normalizePhone = (value: string) => {
  const digits = onlyDigits(value);
  if (!digits) {
    return '';
  }
  if (digits.startsWith('90')) {
    return `+${digits.slice(0, 12)}`;
  }
  return `+${digits.slice(0, 12)}`;
};

export const normalizeIban = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 26)
    .replace(/(.{4})/g, '$1 ')
    .trim();

export const normalizeTaxLikeNumber = (value: string, maxLength = 11) =>
  onlyDigits(value).slice(0, maxLength);

export const cleanIban = (value: string) => value.replace(/\s+/g, '');

export const formatDateTime = (value?: string) => {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleString('tr-TR');
};

export const formatDate = (value?: string) => {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleDateString('tr-TR');
};
