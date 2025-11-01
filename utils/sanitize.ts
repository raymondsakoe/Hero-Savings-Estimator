import type { FormData } from '../types';

const collapseWhitespace = (value: string) => value.trim().replace(/\s+/g, ' ');

const isLikelyValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const normalizeName = (value: string) => {
  const collapsed = collapseWhitespace(value);
  return collapsed.length > 0 ? collapsed : '';
};

export const normalizeEmail = (value: string) => {
  const collapsed = collapseWhitespace(value);
  if (!collapsed.length) {
    return '';
  }

  const lowered = collapsed.toLowerCase();
  return isLikelyValidEmail(lowered) ? lowered : '';
};

export const normalizePhoneToE164 = (value: string) => {
  const digits = value.replace(/\D+/g, '');
  if (!digits || digits.length < 10) {
    return '';
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length > 11 && digits.length <= 15) {
    return `+${digits}`;
  }
  return '';
};

export const sanitizeFormData = (data: FormData): FormData => ({
  ...data,
  name: normalizeName(data.name),
  email: normalizeEmail(data.email),
  phone: normalizePhoneToE164(data.phone),
});
