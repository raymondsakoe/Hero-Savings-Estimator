import { describe, expect, it } from 'vitest';
import { normalizeEmail, normalizeName, normalizePhoneToE164, sanitizeFormData } from './sanitize';

const baseFormData = {
  heroRole: 'Police Officer' as const,
  homePrice: 300000,
  downPaymentPercent: 5,
  name: '',
  email: '',
  phone: '',
  wantsText: true,
  tcpaConsent: true,
};

describe('sanitize utilities', () => {
  describe('normalizeName', () => {
    it('collapses extra whitespace and preserves casing', () => {
      expect(normalizeName('  Mary   Ann  ')).toBe('Mary Ann');
    });

    it('returns empty string for all-whitespace input', () => {
      expect(normalizeName('    ')).toBe('');
    });
  });

  describe('normalizeEmail', () => {
    it('lowercases and trims valid emails', () => {
      expect(normalizeEmail('  USER@Example.COM ')).toBe('user@example.com');
    });

    it('returns empty string for invalid emails', () => {
      expect(normalizeEmail('invalid-email')).toBe('');
    });
  });

  describe('normalizePhoneToE164', () => {
    it('returns +1 prefix for 10 digit numbers', () => {
      expect(normalizePhoneToE164('(555) 123-4567')).toBe('+15551234567');
    });

    it('preserves leading 1 for 11 digit north american numbers', () => {
      expect(normalizePhoneToE164('1-555-123-4567')).toBe('+15551234567');
    });

    it('returns empty string for numbers shorter than 10 digits', () => {
      expect(normalizePhoneToE164('5551234')).toBe('');
    });

    it('returns empty string for numbers longer than 15 digits', () => {
      expect(normalizePhoneToE164('1234567890123456')).toBe('');
    });
  });

  describe('sanitizeFormData', () => {
    it('normalizes name, email, and phone fields', () => {
      const data = sanitizeFormData({
        ...baseFormData,
        name: '  PRINCE  ',
        email: '  USER@Example.COM ',
        phone: '(555) 123-4567',
      });

      expect(data.name).toBe('PRINCE');
      expect(data.email).toBe('user@example.com');
      expect(data.phone).toBe('+15551234567');
    });

    it('drops invalid contact info while keeping other fields intact', () => {
      const data = sanitizeFormData({
        ...baseFormData,
        heroRole: 'Teacher / Educator',
        homePrice: 450000,
        downPaymentPercent: 10,
        name: '   ',
        email: 'bad-email',
        phone: '555',
      });

      expect(data.name).toBe('');
      expect(data.email).toBe('');
      expect(data.phone).toBe('');
      expect(data.heroRole).toBe('Teacher / Educator');
      expect(data.homePrice).toBe(450000);
      expect(data.downPaymentPercent).toBe(10);
    });
  });
});
