import { describe, it, expect } from 'vitest';
import { shouldShowBackToTop, scrollProgress, scrollThumbTopStyle } from '@modules/cms/admin/nodeBuilder/canvasScrollIndicator';

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

    it('scrollThumbTopStyle sits at the very top of the track when progress is 0', () => {
        expect(scrollThumbTopStyle(0, 40)).toBe('calc((100% - 40px) * 0)');
    });

    it('scrollThumbTopStyle sits flush with the track bottom (accounting for its own height) when progress is 1', () => {
        // top = 100% - 40px, so top + thumbHeight (40px) = 100% exactly — no overflow past the track.
        expect(scrollThumbTopStyle(1, 40)).toBe('calc((100% - 40px) * 1)');
    });

    it('scrollThumbTopStyle scales proportionally at a mid-range progress', () => {
        expect(scrollThumbTopStyle(0.5, 40)).toBe('calc((100% - 40px) * 0.5)');
    });

    it('scrollThumbTopStyle clamps out-of-range progress into 0-1', () => {
        expect(scrollThumbTopStyle(-0.2, 40)).toBe('calc((100% - 40px) * 0)');
        expect(scrollThumbTopStyle(1.2, 40)).toBe('calc((100% - 40px) * 1)');
    });
});
