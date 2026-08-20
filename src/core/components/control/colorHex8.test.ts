import { describe, it, expect } from 'vitest';
import { hex8ToRgba, rgbaToHex8 } from './colorHex8';

describe('hex8ToRgba', () => {
    it('parses an 8-digit hex string into {r,g,b,a} with alpha 0-1', () => {
        expect(hex8ToRgba('#d4a62bcc')).toEqual({ r: 212, g: 166, b: 43, a: 0.8 });
    });

    it('parses a plain 6-digit hex string, defaulting alpha to 1 (backward compat with pre-RGBA data)', () => {
        expect(hex8ToRgba('#171717')).toEqual({ r: 23, g: 23, b: 23, a: 1 });
    });

    it('accepts input with no leading #', () => {
        expect(hex8ToRgba('ffffffff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    });

    it('is case-insensitive', () => {
        expect(hex8ToRgba('#D4A62BCC')).toEqual({ r: 212, g: 166, b: 43, a: 0.8 });
    });

    it('falls back to opaque black for malformed input rather than throwing', () => {
        expect(hex8ToRgba('not-a-color')).toEqual({ r: 0, g: 0, b: 0, a: 1 });
        expect(hex8ToRgba('')).toEqual({ r: 0, g: 0, b: 0, a: 1 });
        expect(hex8ToRgba(undefined as unknown as string)).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    });
});

describe('rgbaToHex8', () => {
    it('formats {r,g,b,a} into a lowercase 8-digit hex string', () => {
        expect(rgbaToHex8({ r: 212, g: 166, b: 43, a: 0.8 })).toBe('#d4a62bcc');
    });

    it('formats fully opaque alpha as "ff"', () => {
        expect(rgbaToHex8({ r: 0, g: 0, b: 0, a: 1 })).toBe('#000000ff');
    });

    it('formats fully transparent alpha as "00"', () => {
        expect(rgbaToHex8({ r: 255, g: 255, b: 255, a: 0 })).toBe('#ffffff00');
    });

    it('round-trips through hex8ToRgba', () => {
        const original = '#3a7bd5e6';
        expect(rgbaToHex8(hex8ToRgba(original))).toBe(original);
    });

    it('clamps out-of-range channel values instead of producing invalid hex', () => {
        expect(rgbaToHex8({ r: 300, g: -10, b: 128, a: 1.5 })).toBe('#ff0080ff');
    });
});
