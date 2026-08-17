import { describe, it, expect } from 'vitest';
import { BREAKPOINT_WIDTHS } from './useBreakpoint';

describe('BREAKPOINT_WIDTHS (Canvas Editor v2, Task 20)', () => {
    it('matches the DEFAULT_CONFIG thresholds useBreakpoint() already uses', () => {
        expect(BREAKPOINT_WIDTHS.mobile).toBe(768);
        expect(BREAKPOINT_WIDTHS.tablet).toBe(1024);
    });
});
