import type { FormData } from '../types';

const collapseWhitespace = (value: string) => value.trim().replace(/\s+/g, ' ');

export const normalizeName = (value: string) => {
  const collapsed = collapseWhitespace(value);
  return collapsed.length > 0 ? collapsed : '';
};

export const normalizeEmail = (value: string) => {
  const collapsed = collapseWhitespace(value);
  return collapsed.length > 0 ? collapsed.toLowerCase() : '';
};

export const normalizePhoneToE164 = (value: string) => {
  const digits = value.replace(/\D+/g, '');
  if (!digits) {
    return '';
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  return `+${digits}`;
};

export const sanitizeFormData = (data: FormData): FormData => ({
  ...data,
  name: normalizeName(data.name),
  email: normalizeEmail(data.email),
  phone: normalizePhoneToE164(data.phone),
});
