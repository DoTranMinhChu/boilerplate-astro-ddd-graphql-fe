import { describe, it, expect } from 'vitest';
import { shouldShowBackToTop, scrollProgress } from './canvasScrollIndicator';

describe('canvasScrollIndicator (Canvas Editor v2, Task 19)', () => {
    it('shouldShowBackToTop is false below the threshold, true at/above it', () => {
        expect(shouldShowBackToTop(0)).toBe(false);
        expect(shouldShowBackToTop(399)).toBe(false);
        expect(shouldShowBackToTop(400)).toBe(true);
        expect(shouldShowBackToTop(1000)).toBe(true);
    });

    it('shouldShowBackToTop honors a custom threshold', () => {
        expect(shouldShowBackToTop(150, 200)).toBe(false);
        expect(shouldShowBackToTop(200, 200)).toBe(true);
    });

    it('scrollProgress returns 0 when content fits entirely (no scrollable overflow)', () => {
        expect(scrollProgress(0, 500, 500)).toBe(0);
    });

    it('scrollProgress returns a 0-1 fraction of how far scrolled', () => {
        // scrollHeight 1000, clientHeight 400 -> 600px of scrollable range; scrollTop 300 -> 0.5
        expect(scrollProgress(300, 1000, 400)).toBe(0.5);
        expect(scrollProgress(0, 1000, 400)).toBe(0);
        expect(scrollProgress(600, 1000, 400)).toBe(1);
    });
});
