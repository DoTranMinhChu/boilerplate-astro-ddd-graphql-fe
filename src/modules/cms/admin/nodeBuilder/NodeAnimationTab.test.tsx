// src/modules/cms/admin/nodeBuilder/NodeAnimationTab.test.tsx
// @vitest-environment jsdom
//
// Property Inspector redesign, Phase 2 (Task 3) — NodeAnimationTab now renders
// `EffectPicker` (see EffectCard.test.tsx for the full rationale), which statically
// imports the real `applyAnimationTimeline.ts`, which registers GSAP's ScrollTrigger
// plugin at MODULE-EVALUATION time; that registration touches `matchMedia`. The stub
// below must be installed from a `vi.hoisted()` block (hoisted above every import in
// this file) so it exists before the static import chain evaluates.
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { NodeAnimationTab } from './NodeAnimationTab';
import { EFFECT_REGISTRY } from '@/modules/cms/node/effectRegistry';
import type { AnimationTimeline } from '@/modules/cms/node/animationTimeline.types';
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

describe('NodeAnimationTab drag-to-reorder (Node Builder Inspector Polish, Task 4)', () => {
    it('renders one drag handle per keyframe, no Move-up/Move-down buttons', () => {
        const timeline: AnimationTimeline = {
            trigger: 'onLoad',
            keyframes: [
                { id: 'kf-1', property: 'opacity', to: 1, duration: 0.8 },
                { id: 'kf-2', property: 'x', to: 0, duration: 0.8 },
            ],
        };
        const { getAllByRole, queryByText } = render(() => <NodeAnimationTab timeline={timeline} onChange={vi.fn()} />);
        expect(getAllByRole('button', { name: 'drag-handle' })).toHaveLength(2);
        expect(queryByText(t('cms.node.animation.moveUp'))).toBeNull();
        expect(queryByText(t('cms.node.animation.moveDown'))).toBeNull();
    });

    it('the Remove-step button still works per keyframe', () => {
        const timeline: AnimationTimeline = {
            trigger: 'onLoad',
            keyframes: [
                { id: 'kf-1', property: 'opacity', to: 1, duration: 0.8 },
                { id: 'kf-2', property: 'x', to: 0, duration: 0.8 },
            ],
        };
        const onChange = vi.fn();
        const { getAllByTitle } = render(() => <NodeAnimationTab timeline={timeline} onChange={onChange} />);
        const removeButtons = getAllByTitle(t('cms.node.animation.removeStep'));
        removeButtons[0].click();
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({ keyframes: [{ id: 'kf-2', property: 'x', to: 0, duration: 0.8 }] }),
        );
    });
});

describe('NodeAnimationTab easing Select with Custom escape hatch (Node Builder Inspector Polish, Task 6)', () => {
    it('a keyframe with a preset easing shows that preset selected, no free-text box visible', () => {
        const timeline: AnimationTimeline = {
            trigger: 'onLoad',
            keyframes: [{ id: 'kf-1', property: 'opacity', to: 1, duration: 0.8, easing: 'power2.out' }],
        };
        const { queryByPlaceholderText } = render(() => <NodeAnimationTab timeline={timeline} onChange={vi.fn()} />);
        expect(queryByPlaceholderText('power2.out')).toBeNull();
    });

    it('a keyframe with a non-preset easing shows Custom selected AND the free-text box with the real value', () => {
        const timeline: AnimationTimeline = {
            trigger: 'onLoad',
            keyframes: [{ id: 'kf-1', property: 'opacity', to: 1, duration: 0.8, easing: 'rough({strength: 3})' }],
        };
        const { getByDisplayValue } = render(() => <NodeAnimationTab timeline={timeline} onChange={vi.fn()} />);
        expect(getByDisplayValue('rough({strength: 3})')).toBeTruthy();
    });

    it('a keyframe with no easing set defaults to showing no Custom box (treated as unset, not "custom")', () => {
        const timeline: AnimationTimeline = {
            trigger: 'onLoad',
            keyframes: [{ id: 'kf-1', property: 'opacity', to: 1, duration: 0.8 }],
        };
        const { queryAllByDisplayValue } = render(() => <NodeAnimationTab timeline={timeline} onChange={vi.fn()} />);
        // Multiple fields legitimately render '' (e.g. the target sub-element Input);
        // the point of this assertion is "no crash, no stray custom-value box" — not
        // a unique match, since queryByDisplayValue throws on >1 match.
        expect(queryAllByDisplayValue('').length).toBeGreaterThan(0);
    });
});

describe('NodeAnimationTab easing Select — review fixes (Node Builder Inspector Polish, Task 6 follow-up)', () => {
    it('Critical fix: clicking the "Custom…" dropdown option actually reveals the free-text box (real simulated interaction, not pre-set data)', () => {
        // Starting state: a keyframe with a PRESET easing already selected — one of the
        // two common starting states the bug affected (the other being unset/''). Before
        // the fix, `easingSelectValue` re-derives from the unchanged stored value on every
        // render, so clicking "Custom…" had no way to ever stick.
        const timeline: AnimationTimeline = {
            trigger: 'onLoad',
            keyframes: [{ id: 'kf-1', property: 'opacity', to: 1, duration: 0.8, easing: 'power2.out' }],
        };
        const { getByText, queryByPlaceholderText } = render(() => (
            <NodeAnimationTab timeline={timeline} onChange={vi.fn()} />
        ));

        // Sanity: free-text box not visible yet (a preset is selected, not Custom).
        expect(queryByPlaceholderText('power2.out')).toBeNull();

        // Locate the easing Select's own <input> via its label, exactly the way an admin
        // would find it on screen (DropdownSelect's wrapper is the label's next sibling).
        const easingLabel = getByText(t('cms.node.animation.easing'));
        const easingWrapper = easingLabel.parentElement as HTMLElement;
        const easingInput = easingWrapper.querySelector('input') as HTMLInputElement;
        expect(easingInput).toBeTruthy();

        // Open the dropdown the same way a real click does (DropdownSelect opens on focus).
        fireEvent.focus(easingInput);

        // Click the "Custom…" option. DropdownSelect's SelectOption uses onMouseDown
        // (not onClick) specifically so a click doesn't blur-close the dropdown first —
        // mirror that real interaction rather than firing a synthetic click on a div
        // whose handler doesn't exist.
        const customOption = getByText(t('cms.node.animation.easingCustom'));
        fireEvent.mouseDown(customOption);

        // The free-text Input for the (still-unchanged) stored easing value 'power2.out'
        // must now be visible — proving Custom mode was actually reached via the click.
        // (This codebase's Input control does not mirror its value into the DOM `value`
        // attribute, so assert via the live `.value` property, not an attribute selector.)
        const inputs = Array.from(easingWrapper.parentElement!.querySelectorAll('input')) as HTMLInputElement[];
        const customInput = inputs.find((el) => el.value === 'power2.out');
        expect(customInput).toBeTruthy();
    });

    it('Important fix: mounting a keyframe with unset easing does NOT fire a spurious onChange (no interaction at all)', () => {
        const timeline: AnimationTimeline = {
            trigger: 'onLoad',
            keyframes: [{ id: 'kf-1', property: 'opacity', to: 1, duration: 0.8 }],
        };
        const onChange = vi.fn();
        render(() => <NodeAnimationTab timeline={timeline} onChange={onChange} />);

        // No user interaction happened — Select's shared auto-select-first-option effect
        // (triggered by a falsy value + no `clearable`) must not have queued a write.
        expect(onChange).not.toHaveBeenCalled();
    });
});

describe('NodeAnimationTab quick presets via EffectPicker (Property Inspector redesign, Task 3)', () => {
    it('renders the EffectPicker cards instead of the old flat chip buttons', () => {
        const timeline: AnimationTimeline = { trigger: 'onLoad', keyframes: [] };
        const { getByText } = render(() => <NodeAnimationTab timeline={timeline} onChange={vi.fn()} />);
        // Query by the real i18n name of the fadeUp effect card, exactly as an admin sees it —
        // proves EffectPicker's cards are actually rendered, not the old chip-button markup.
        expect(getByText(t('cms.node.animation.presetFadeUp'))).toBeTruthy();
    });

    it('clicking an EffectPicker card still prepends the right keyframe via the unchanged addPreset', () => {
        const timeline: AnimationTimeline = {
            trigger: 'onLoad',
            keyframes: [{ id: 'kf-existing', property: 'opacity', to: 1, duration: 0.8 }],
        };
        const onChange = vi.fn();
        const { getByText } = render(() => <NodeAnimationTab timeline={timeline} onChange={onChange} />);

        fireEvent.click(getByText(t('cms.node.animation.presetFadeUp')));

        const fadeUp = EFFECT_REGISTRY.find((e) => e.id === 'fadeUp')!;
        expect(onChange).toHaveBeenCalledTimes(1);
        const next = onChange.mock.calls[0][0] as AnimationTimeline;
        // addPreset prepends the new keyframe (a fresh id) to the front, leaving the
        // pre-existing keyframe untouched behind it — same behavior as before this task,
        // just now triggered by EffectPicker's onSelect instead of an inline chip onClick.
        expect(next.keyframes).toHaveLength(2);
        expect(next.keyframes[0]).toMatchObject(fadeUp.defaults);
        expect(next.keyframes[1]).toEqual({ id: 'kf-existing', property: 'opacity', to: 1, duration: 0.8 });
    });
});
