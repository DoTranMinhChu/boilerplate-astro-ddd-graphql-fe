import { describe, it, expect } from 'vitest';
import { EFFECT_REGISTRY } from '@modules/cms/node/effectRegistry';

describe('EFFECT_REGISTRY', () => {
    it('has exactly 7 entries', () => {
        expect(EFFECT_REGISTRY.length).toBe(7);
    });

    it('every entry has a unique id', () => {
        const ids = EFFECT_REGISTRY.map((e) => e.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('every entry has a real iconify heroicons string', () => {
        for (const e of EFFECT_REGISTRY) {
            expect(e.icon).toMatch(/^heroicons-(outline|solid):/);
        }
    });

    it('every entry\'s defaults and preview keyframes have a valid AnimationProperty', () => {
        const validProps = ['opacity', 'x', 'y', 'scale', 'rotation'];
        for (const e of EFFECT_REGISTRY) {
            expect(validProps).toContain(e.defaults.property);
            expect(validProps).toContain(e.preview.property);
        }
    });

    it('the cardStagger entry keeps its stagger in defaults but drops it from preview', () => {
        const cardStagger = EFFECT_REGISTRY.find((e) => e.id === 'cardStagger')!;
        expect(cardStagger.defaults.stagger).toBe(0.08);
        expect(cardStagger.preview.stagger).toBeUndefined();
    });
});
