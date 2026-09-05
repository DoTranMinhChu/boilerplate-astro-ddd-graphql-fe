// src/modules/cms/admin/nodeBuilder/EffectCard.test.tsx
// @vitest-environment jsdom
//
// Property Inspector redesign, Phase 2 (Task 2) — EffectCard plays a REAL
// `applyAnimationTimeline()` GSAP preview on hover (not a CSS approximation), so this
// file exercises the real engine rather than mocking it.
//
// jsdom/matchMedia note: `applyAnimationTimeline.ts` calls
// `gsap.registerPlugin(ScrollTrigger)` at MODULE-EVALUATION time and ScrollTrigger's
// registration touches `matchMedia`. This codebase already hit that exact gap in
// `applyAnimationTimeline.test.ts`/`nodeRegistry.test.ts` and fixed it by stubbing
// `window.matchMedia` BEFORE the module is evaluated. A plain top-level assignment is
// not enough on its own for a STATIC import (ESM imports are hoisted above file body
// code), so the stub is installed from a `vi.hoisted()` block, which vitest hoists
// above every import in this file.
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@solidjs/testing-library';
import { gsap } from 'gsap';
import { EffectCard } from '@modules/cms/admin/nodeBuilder/EffectCard';
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

const fadeUp = EFFECT_REGISTRY.find((e) => e.id === 'fadeUp')!;

describe('EffectCard', () => {
    it('renders the effect name and description', () => {
        const { getByText } = render(() => <EffectCard effect={fadeUp} onSelect={vi.fn()} />);
        expect(getByText(t('cms.node.animation.presetFadeUp'))).toBeTruthy();
        expect(getByText(t('cms.node.animation.presetFadeUpDesc'))).toBeTruthy();
    });

    it('calls onSelect when clicked', () => {
        const onSelect = vi.fn();
        const { getByRole } = render(() => <EffectCard effect={fadeUp} onSelect={onSelect} />);
        fireEvent.click(getByRole('button'));
        expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('animates the demo element on hover using the real applyAnimationTimeline engine', async () => {
        const { container } = render(() => <EffectCard effect={fadeUp} onSelect={vi.fn()} />);
        const demo = container.querySelector('[data-testid="effect-card-demo"]') as HTMLElement;
        expect(demo).toBeTruthy();
        fireEvent.pointerEnter(demo.closest('[role="button"]')!);
        // fadeUp's preview keyframe is `{ property: 'y', from: 32, to: 0, duration: 0.8 }` —
        // real GSAP runs asynchronously (a tween, not a synchronous style write), so wait for
        // the timeline to actually move the demo element off its starting position.
        await waitFor(() => {
            expect(demo.style.transform).not.toBe('');
        });
    });

    it('cleans up the preview animation on pointer leave without throwing', () => {
        const { container } = render(() => <EffectCard effect={fadeUp} onSelect={vi.fn()} />);
        const trigger = container.querySelector('[role="button"]')!;
        fireEvent.pointerEnter(trigger);
        expect(() => fireEvent.pointerLeave(trigger)).not.toThrow();
    });

    it('rapid enter/leave/enter cycles neither throw nor leak a GSAP context', async () => {
        const { container } = render(() => <EffectCard effect={fadeUp} onSelect={vi.fn()} />);
        const trigger = container.querySelector('[role="button"]')!;
        const demo = container.querySelector('[data-testid="effect-card-demo"]') as HTMLElement;

        // Task 10 (perf/scale): `applyAnimationTimeline` is now async (lazy-loads gsap), so the
        // real tween this asserts on is no longer registered SYNCHRONOUSLY within the same tick
        // as `fireEvent.pointerEnter` — `EffectCard.tsx`'s own `generation` counter (not this
        // test) is what actually prevents a second, stacked `gsap.context()` from ever
        // surviving; these `waitFor`s just observe that eventual, settled state. Guards against
        // this whole assertion being vacuous: prove the leak detector can actually SEE a live
        // preview before asserting the absence of one. Two enters in a row with no intervening
        // leave (what a fast mouse really produces) must still SETTLE at exactly ONE tween
        // registered — a second, stacked gsap.context() would show up as 2.
        fireEvent.pointerEnter(trigger);
        await waitFor(() => expect(gsap.getTweensOf(demo).length).toBe(1));
        fireEvent.pointerEnter(trigger);
        await waitFor(() => expect(gsap.getTweensOf(demo).length).toBe(1));
        fireEvent.pointerLeave(trigger);

        // Simulate a user dragging the mouse fast across the grid: many enters without an
        // intervening leave, and many leaves, in quick succession.
        expect(() => {
            for (let i = 0; i < 5; i++) {
                fireEvent.pointerEnter(trigger);
                fireEvent.pointerEnter(trigger);
                fireEvent.pointerLeave(trigger);
            }
        }).not.toThrow();

        // Nothing left animating this element — a leaked gsap.context()/tween would still be
        // registered on GSAP's global timeline here. Every stale in-flight preview from the loop
        // above (there could be several) settles asynchronously and self-reverts on arrival
        // (`EffectCard.tsx`'s generation-mismatch guard), so this needs to be awaited too rather
        // than asserted synchronously right after the loop.
        await waitFor(() => {
            expect(gsap.getTweensOf(demo)).toHaveLength(0);
            // ...and ctx.revert() restored the inline style GSAP wrote.
            expect(demo.style.transform).toBe('');
        });
    });

    it('one final hover after the rapid cycles still animates (the card is not left inert)', async () => {
        const { container } = render(() => <EffectCard effect={fadeUp} onSelect={vi.fn()} />);
        const trigger = container.querySelector('[role="button"]')!;
        const demo = container.querySelector('[data-testid="effect-card-demo"]') as HTMLElement;
        for (let i = 0; i < 3; i++) {
            fireEvent.pointerEnter(trigger);
            fireEvent.pointerLeave(trigger);
        }
        fireEvent.pointerEnter(trigger);
        await waitFor(() => {
            expect(demo.style.transform).not.toBe('');
        });
        fireEvent.pointerLeave(trigger);
    });
});
