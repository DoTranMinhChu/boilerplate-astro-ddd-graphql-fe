// src/modules/cms/admin/nodeBuilder/EffectPicker.test.tsx
// @vitest-environment jsdom
//
// Property Inspector redesign, Phase 2 (Task 2). See EffectCard.test.tsx for why the
// `window.matchMedia` stub has to be installed from `vi.hoisted()` — EffectPicker pulls
// in EffectCard, which statically imports the real `applyAnimationTimeline.ts`, which
// registers GSAP's ScrollTrigger plugin at module-evaluation time.
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, getAllByRole } from '@solidjs/testing-library';
import { EffectPicker } from '@modules/cms/admin/nodeBuilder/EffectPicker';
import { EFFECT_REGISTRY } from '@/modules/cms/node/effectRegistry';
import { t } from '@/shared/i18n/t';

vi.hoisted(() => {
    if (typeof window !== 'undefined' && !window.matchMedia) {
        window.matchMedia = ((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
        })) as unknown as typeof window.matchMedia;
    }
});

describe('EffectPicker', () => {
    it('renders one card per registry entry', () => {
        const { container } = render(() => <EffectPicker onSelect={vi.fn()} />);
        const cards = getAllByRole(container, 'button');
        expect(cards.length).toBe(EFFECT_REGISTRY.length);
    });

    it("forwards the clicked effect's defaults to onSelect", () => {
        const onSelect = vi.fn();
        const { getByText } = render(() => <EffectPicker onSelect={onSelect} />);
        fireEvent.click(getByText(t('cms.node.animation.presetFadeUp')));
        const fadeUp = EFFECT_REGISTRY.find((e) => e.id === 'fadeUp')!;
        expect(onSelect).toHaveBeenCalledWith(fadeUp.defaults);
    });
});
