import { describe, expect, it } from 'vitest';
import { checkCodeValid, checkEmailValid, normalizeString } from '@core/helpers/string';

describe('normalizeString', () => {
    it('strips Vietnamese diacritics', () => {
        expect(normalizeString('Đà Nẵng')).toBe('Da Nang');
        expect(normalizeString('Nguyễn Văn A')).toBe('Nguyen Van A');
    });

    it('returns empty string for undefined input', () => {
        expect(normalizeString(undefined)).toBe('');
    });
});

describe('checkEmailValid', () => {
    it('accepts well-formed emails', () => {
        expect(checkEmailValid('user@example.com')).toBe(true);
    });

    it('rejects malformed emails', () => {
        expect(checkEmailValid('not-an-email')).toBe(false);
    });
});

describe('checkCodeValid', () => {
    it('accepts alphanumeric codes with internal hyphens', () => {
        expect(checkCodeValid('tenant-01')).toBe(true);
    });

    it('rejects codes that are too short or start with a hyphen', () => {
        expect(checkCodeValid('-bad')).toBe(false);
    });
});
