import { describe, it, expect } from 'vitest';
import { BREAKPOINT_WIDTHS, Breakpoint, isBreakpoint } from '@core/hooks/useBreakpoint';

describe('BREAKPOINT_WIDTHS (Canvas Editor v2, Task 20)', () => {
    it('matches the DEFAULT_CONFIG thresholds useBreakpoint() already uses', () => {
        expect(BREAKPOINT_WIDTHS.mobile).toBe(768);
        expect(BREAKPOINT_WIDTHS.tablet).toBe(1024);
    });
});

describe('isBreakpoint() (enum-typesafety-sweep, Task 6)', () => {
    it('accepts each of the 3 Breakpoint member values', () => {
        expect(isBreakpoint(Breakpoint.MOBILE)).toBe(true);
        expect(isBreakpoint(Breakpoint.TABLET)).toBe(true);
        expect(isBreakpoint(Breakpoint.DESKTOP)).toBe(true);
    });

    it('accepts the exact literal strings (values stay byte-identical)', () => {
        expect(isBreakpoint('mobile')).toBe(true);
        expect(isBreakpoint('tablet')).toBe(true);
        expect(isBreakpoint('desktop')).toBe(true);
    });

    it('rejects unrelated strings, non-strings, and null/undefined', () => {
        expect(isBreakpoint('phone')).toBe(false);
        expect(isBreakpoint('')).toBe(false);
        expect(isBreakpoint(123)).toBe(false);
        expect(isBreakpoint(null)).toBe(false);
        expect(isBreakpoint(undefined)).toBe(false);
        expect(isBreakpoint({})).toBe(false);
    });
});
