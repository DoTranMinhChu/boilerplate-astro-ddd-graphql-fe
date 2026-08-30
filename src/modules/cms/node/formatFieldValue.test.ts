// src/modules/cms/node/formatFieldValue.test.ts
import { describe, it, expect } from 'vitest';
import { formatNumberValue, formatNumberFieldValue, isCurrencyKey } from './formatFieldValue';

describe('formatNumberValue', () => {
    it('groups thousands with "." (Vietnamese convention)', () => {
        expect(formatNumberValue(320000)).toBe('320.000');
        expect(formatNumberValue(1490000)).toBe('1.490.000');
    });

    it('handles small numbers with no grouping needed', () => {
        expect(formatNumberValue(45)).toBe('45');
        expect(formatNumberValue(0)).toBe('0');
    });

    it('falls back to raw String() for a non-numeric value instead of throwing', () => {
        expect(formatNumberValue('abc')).toBe('abc');
        expect(formatNumberValue(undefined)).toBe('undefined');
    });
});

describe('formatNumberFieldValue', () => {
    it('appends " ₫" when the field label reads as a price', () => {
        expect(formatNumberFieldValue(320000, 'Giá (VNĐ)')).toBe('320.000 ₫');
        expect(formatNumberFieldValue(199000, 'Price')).toBe('199.000 ₫');
    });

    it('does NOT append a currency suffix for a non-monetary NUMBER field', () => {
        expect(formatNumberFieldValue(45, 'Thời gian (phút)')).toBe('45');
        expect(formatNumberFieldValue(5, 'Số lượng trong kho')).toBe('5');
    });

    it('handles a missing label gracefully (no currency suffix)', () => {
        expect(formatNumberFieldValue(45, undefined)).toBe('45');
    });
});

describe('isCurrencyKey (CardListNode — no field-label fetch available, matches the field KEY instead)', () => {
    it('matches the exact "gia" key convention used by every price field built this session', () => {
        expect(isCurrencyKey('gia')).toBe(true);
    });

    it('does NOT false-positive on a camelCase key that merely contains "gia" as a substring', () => {
        expect(isCurrencyKey('thoiGian')).toBe(false);
    });

    it('matches "price"/"cost" substrings too', () => {
        expect(isCurrencyKey('unitPrice')).toBe(true);
        expect(isCurrencyKey('totalCost')).toBe(true);
    });

    it('handles a missing key gracefully', () => {
        expect(isCurrencyKey(undefined)).toBe(false);
    });
});
