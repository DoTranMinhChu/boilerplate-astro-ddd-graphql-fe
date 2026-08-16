import { describe, it, expect } from 'vitest';
import { normalizeRotation } from '../rotationMath';

describe('normalizeRotation', () => {
    it('leaves in-range values unchanged', () => {
        expect(normalizeRotation(90)).toBe(90);
        expect(normalizeRotation(-90)).toBe(-90);
        expect(normalizeRotation(180)).toBe(180);
        expect(normalizeRotation(-180)).toBe(-180);
        expect(normalizeRotation(0)).toBe(0);
    });
    it('wraps values above 180', () => {
        expect(normalizeRotation(270)).toBe(-90);
        expect(normalizeRotation(360)).toBe(0);
        expect(normalizeRotation(450)).toBe(90);
    });
    it('wraps values below -180', () => {
        expect(normalizeRotation(-270)).toBe(90);
        expect(normalizeRotation(-360)).toBe(0);
        expect(normalizeRotation(-450)).toBe(-90);
    });
});
