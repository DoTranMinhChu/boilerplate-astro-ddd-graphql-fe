// src/modules/cms/admin/nodeBuilder/NodeStyleEffectsTab.test.tsx
// @vitest-environment jsdom
//
// Property Inspector redesign, Task 7: the Transform (CSS translate/rotate/scale), Hover and
// Image art-direction sections moved OUT of NodeStyleTab.tsx (the "Kiểu dáng" tab) into
// NodeStyleEffectsTab.tsx (the "Hiệu ứng" tab). The Transform/Hover describe blocks below are
// the ones NodeStyleTab.test.tsx used to own, relocated verbatim in intent (same fixtures,
// same assertions) and re-pointed at the new component, plus the Image-section assertion from
// that file's Task 5 focal-point block. NodeStyleTab.test.tsx keeps matching NEGATIVE
// assertions so the split can't silently regress into a double-render.
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { NodeStyleEffectsTab } from '@modules/cms/admin/nodeBuilder/NodeStyleEffectsTab';
import { t } from '@/shared/i18n/t';
import type { ThemeDTO } from '@/shared/services/theme/theme.service';

// Same minimal ThemeDTO fixture NodeStyleTab.test.tsx uses (all 15 ThemeColorSet semantic
// keys) — ColorTokenOrCustom.tsx only ever reads `activeTheme.colors.light`.
const mockTheme: ThemeDTO = {
    id: 'theme-1',
    name: 'Mock Theme',
    isDefault: true,
    createdAt: '2026-08-27T00:00:00.000Z',
    updatedAt: '2026-08-27T00:00:00.000Z',
    colors: {
        light: {
            background: '#ffffff', surface: '#f5f5f5', surfaceMuted: '#e5e5e5',
            foreground: '#171717', foregroundMuted: '#737373', border: '#d4d4d4',
            primary: '#1d4ed8', onPrimary: '#ffffff',
            secondary: '#7c3aed', onSecondary: '#ffffff',
            accent: '#f59e0b', onAccent: '#171717',
            success: '#16a34a', warning: '#ca8a04', danger: '#dc2626',
        },
    },
};

describe('NodeStyleEffectsTab — Transform (rotate/scale/translate) controls (moved from NodeStyleTab, Task 7)', () => {
    // Note: "Dịch ngang (px)"/"Dịch dọc (px)" labels also appear in the Hover section below
    // (a deliberately separate translateX/Y pair scoped to `style.hover.transform`) — every
    // query here uses `getAllByText(...)[0]`, the Transform section's copy, since Transform is
    // this component's FIRST section and Hover comes after it (same relative document order
    // the two sections had inside NodeStyleTab).
    it('renders and round-trips translateX/translateY', () => {
        const { getAllByText, getByDisplayValue } = render(() => (
            <NodeStyleEffectsTab style={{ transform: { translateX: 10, translateY: -6 } }} onChange={vi.fn()} />
        ));
        expect(getAllByText('Dịch ngang (px)')[0]).toBeTruthy();
        expect(getAllByText('Dịch dọc (px)')[0]).toBeTruthy();
        expect(getByDisplayValue('10')).toBeTruthy();
        expect(getByDisplayValue('-6')).toBeTruthy();
    });

    it('typing translateY writes it into transform.translateY, leaving transform.rotate untouched', () => {
        const onChange = vi.fn();
        const { getAllByText } = render(() => <NodeStyleEffectsTab style={{ transform: { rotate: 5 } }} onChange={onChange} />);
        const input = getAllByText('Dịch dọc (px)')[0].parentElement!.querySelector('input')!;
        fireEvent.input(input, { target: { value: '-6' } });
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ transform: { rotate: 5, translateY: -6 } }));
    });

    // NEW (Task 7): the brief's own required extra assertion — the exact patch SHAPE a
    // Transform field writes when the node has no prior `transform` at all. Guards the
    // `set('transform', { ...style().transform, translateX: v })` spread specifically: a
    // regression that wrote the value at the StyleObject root (`{ translateX: 12 }`) or
    // clobbered sibling style keys would pass the two tests above but fail this one.
    it('typing translateX on a node with no prior transform writes exactly { transform: { translateX } }, preserving unrelated style keys', () => {
        const onChange = vi.fn();
        const { getByText, getAllByText } = render(() => (
            <NodeStyleEffectsTab style={{ overflow: 'hidden' }} onChange={onChange} />
        ));
        // The Transform section's own translateX field is behind the advanced disclosure
        // (Task 5) and collapsed by default since `transform` is unset here — expand it first
        // so index [0] is the Transform section's copy, not the Hover section's own translateX.
        fireEvent.click(getByText('Nâng cao'));
        const input = getAllByText('Dịch ngang (px)')[0].parentElement!.querySelector('input')!;
        fireEvent.input(input, { target: { value: '12' } });
        expect(onChange).toHaveBeenCalledWith({ overflow: 'hidden', transform: { translateX: 12 } });
    });

    it('typing a rotate value writes it into transform.rotate, leaving transform.scaleX untouched', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => (
            <NodeStyleEffectsTab style={{ transform: { scaleX: 1.5 } }} onChange={onChange} />
        ));
        const input = getByText(t('cms.node.style.rotate')).parentElement!.querySelector('input')!;
        fireEvent.input(input, { target: { value: '45' } });
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ transform: { scaleX: 1.5, rotate: 45 } }));
    });
});

describe('NodeStyleEffectsTab — Hover section (moved from NodeStyleTab, Task 7)', () => {
    it('defaults the hover scope Select to "Khi hover chính khối này" (self) when style.hover is unset', () => {
        const { container } = render(() => <NodeStyleEffectsTab style={{}} onChange={vi.fn()} />);
        expect(container.textContent).toContain('Khi hover chính khối này');
    });

    it('mounting with no explicit hover scope does NOT fire a spurious onChange (scope defaults to a truthy "self")', () => {
        const onChange = vi.fn();
        render(() => <NodeStyleEffectsTab style={{}} onChange={onChange} />);
        expect(onChange).not.toHaveBeenCalled();
    });

    it('shows the resolved "parent" scope label when style.hover.scope is "parent"', () => {
        const { container } = render(() => <NodeStyleEffectsTab style={{ hover: { scope: 'parent' } }} onChange={vi.fn()} />);
        expect(container.textContent).toContain('Khi hover khối cha');
    });

    it('adjusting the hover grayscale slider writes into hover.effects.grayscale without touching hover.scope', () => {
        const onChange = vi.fn();
        const { getAllByText } = render(() => <NodeStyleEffectsTab style={{ hover: { scope: 'parent' } }} onChange={onChange} />);
        // In NodeStyleTab this label appeared twice (its Effects section + Hover); here the
        // Hover slider is the only "Đen trắng (%)" control, but the query is kept in the same
        // last-in-document-order shape so it stays correct if a sibling section is ever added.
        const labels = getAllByText('Đen trắng (%)');
        const hoverSlider = labels[labels.length - 1].parentElement!.querySelector('input[type="range"]') as HTMLInputElement;
        fireEvent.input(hoverSlider, { target: { value: '0' } });
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ hover: { scope: 'parent', effects: { grayscale: 0 } } }));
    });

    it('typing a hover translateY writes into hover.transform.translateY', () => {
        const onChange = vi.fn();
        const { getAllByText } = render(() => <NodeStyleEffectsTab style={{}} onChange={onChange} />);
        // Two "Dịch dọc (px)" fields exist (Transform section + Hover section) — the Hover one
        // is last in document order.
        const labels = getAllByText('Dịch dọc (px)');
        const hoverInput = labels[labels.length - 1].parentElement!.querySelector('input')!;
        fireEvent.input(hoverInput, { target: { value: '-6' } });
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ hover: { transform: { translateY: -6 } } }));
    });

    it('turning the hover Background toggle ON writes a starter hover.background object', () => {
        const onChange = vi.fn();
        const { getAllByText } = render(() => <NodeStyleEffectsTab style={{}} onChange={onChange} />);
        // Hover's background/border toggles deliberately reuse the main sections' i18n keys
        // ('Bật nền'/'Bật viền'); in THIS component they are the only copies.
        fireEvent.click(getAllByText(t('cms.node.style.backgroundEnabled'))[0]);
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ hover: { background: { type: 'color', value: '#ffffffff' } } }));
    });

    it('passes activeTheme down to the hover color controls (token picker renders real theme tokens)', () => {
        const { getByText } = render(() => (
            <NodeStyleEffectsTab
                style={{ hover: { typography: { color: { type: 'solid', value: '#111111ff' } } } }}
                onChange={vi.fn()}
                activeTheme={mockTheme}
            />
        ));
        const tokenLabel = getByText(t('cms.node.style.colorToken'));
        const tokenInput = tokenLabel.parentElement!.querySelector('input')!;
        fireEvent.focus(tokenInput);
        expect(getByText('primary')).toBeTruthy();
    });
});

describe('NodeStyleEffectsTab — hover presets (Task 4, Phase 2)', () => {
    it('renders 5 hover preset buttons', () => {
        const { getByText, getAllByText } = render(() => <NodeStyleEffectsTab style={{}} onChange={vi.fn()} />);
        expect(getByText('Nhấc nhẹ')).toBeTruthy();
        // "Phóng to nhẹ" is also the Transform section's own "grow" preset label (Task 5), so it
        // now appears twice on the page.
        expect(getAllByText('Phóng to nhẹ').length).toBe(2);
        expect(getByText('Đổi màu nền')).toBeTruthy();
        expect(getByText('Viền sáng')).toBeTruthy();
        expect(getByText('Đen trắng nhẹ')).toBeTruthy();
    });

    it('clicking the "lift" preset sets hover.transform.translateY to -4, preserving other hover fields', () => {
        const onChange = vi.fn();
        const existingStyle = { hover: { scope: 'parent' as const } };
        const { getByText } = render(() => <NodeStyleEffectsTab style={existingStyle} onChange={onChange} />);
        fireEvent.click(getByText('Nhấc nhẹ'));
        expect(onChange).toHaveBeenCalledWith({ hover: { scope: 'parent', transform: { translateY: -4 } } });
    });

    it('clicking the "grow" preset sets hover.transform.scaleX/scaleY to 1.03', () => {
        const onChange = vi.fn();
        const { getAllByText } = render(() => <NodeStyleEffectsTab style={{}} onChange={onChange} />);
        // "Phóng to nhẹ" is now shared with the Transform section's own "grow" preset (Task 5) —
        // Transform renders first in the document, so the Hover section's copy is last.
        const grow = getAllByText('Phóng to nhẹ');
        fireEvent.click(grow[grow.length - 1]);
        expect(onChange).toHaveBeenCalledWith({ hover: { transform: { scaleX: 1.03, scaleY: 1.03 } } });
    });

    it('renders scaleX/scaleY number inputs for hover.transform, alongside the existing translateX/translateY', () => {
        const { getByText, getAllByText } = render(() => <NodeStyleEffectsTab style={{}} onChange={vi.fn()} />);
        // Transform section's own scaleX/Y inputs are gated behind its advanced disclosure
        // (Task 5) and collapsed by default when transform is unset — expand it so both copies
        // are present, matching this test's original pre-Task-5 assumption.
        fireEvent.click(getByText('Nâng cao'));
        // translateX/translateY labels are shared with the main Transform section above, so
        // there are 2 of each on the page (main + hover) — scaleX/scaleY previously had none in
        // the Hover section, so after this change there should be exactly 2 of each too (main +
        // the newly-added hover pair).
        expect(getAllByText('Tỉ lệ ngang').length).toBe(2);
        expect(getAllByText('Tỉ lệ dọc').length).toBe(2);
    });
});

describe('NodeStyleEffectsTab — transform presets + advanced disclosure (Task 5, Phase 2)', () => {
    it('renders 3 transform preset buttons', () => {
        const { getByText, getAllByText } = render(() => <NodeStyleEffectsTab style={{}} onChange={vi.fn()} />);
        expect(getByText('Xoay nhẹ')).toBeTruthy();
        // "Phóng to nhẹ" is also the Hover section's own "grow" preset label (Task 4) — both
        // legitimately reuse the same VI text for the same visual idea ("slightly enlarge"), so
        // this must count 2 rather than getByText, which throws on multiple matches.
        expect(getAllByText('Phóng to nhẹ').length).toBe(2);
        expect(getByText('Đặt lại')).toBeTruthy();
    });

    it('clicking "Xoay nhẹ" on a node with no existing transform sets transform.rotate to -3', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => <NodeStyleEffectsTab style={{}} onChange={onChange} />);
        fireEvent.click(getByText('Xoay nhẹ'));
        expect(onChange).toHaveBeenCalledWith({ transform: { rotate: -3 } });
    });

    // Merge-vs-replace decision (see task-5-report.md for the full write-up): transform presets
    // MERGE onto any existing `style().transform`, mirroring Task 4's hover-preset precedent,
    // because all 5 transform sub-fields describe ONE combined visual transform that a user may
    // be building up incrementally (e.g. having already dragged the element via translateX/Y on
    // the canvas) — a wholesale replace would silently discard that. Only the explicit "Đặt lại"
    // (reset) preset is a deliberate full clear.
    it('clicking "Xoay nhẹ" while transform.translateX is already set merges rotate in without clearing translateX', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => (
            <NodeStyleEffectsTab style={{ transform: { translateX: 20 } }} onChange={onChange} />
        ));
        fireEvent.click(getByText('Xoay nhẹ'));
        expect(onChange).toHaveBeenCalledWith({ transform: { translateX: 20, rotate: -3 } });
    });

    it('clicking "Phóng to nhẹ" (transform preset) merges scaleX/scaleY onto an existing rotate value', () => {
        const onChange = vi.fn();
        const { getAllByText } = render(() => (
            <NodeStyleEffectsTab style={{ transform: { rotate: 10 } }} onChange={onChange} />
        ));
        // The Transform section renders before Hover, so its copy of "Phóng to nhẹ" is first.
        fireEvent.click(getAllByText('Phóng to nhẹ')[0]);
        expect(onChange).toHaveBeenCalledWith({ transform: { rotate: 10, scaleX: 1.05, scaleY: 1.05 } });
    });

    it('clicking "Đặt lại" (transform preset) clears the whole transform object, preserving sibling style keys', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => (
            <NodeStyleEffectsTab style={{ overflow: 'hidden', transform: { rotate: 10, translateX: 5 } }} onChange={onChange} />
        ));
        fireEvent.click(getByText('Đặt lại'));
        expect(onChange).toHaveBeenCalledWith({ overflow: 'hidden', transform: undefined });
    });

    // The Hover section (Task 4) unconditionally renders its own translateX/Y transform pair, so
    // "Dịch ngang (px)" always has at least 1 match — the Transform section's OWN copy is the
    // one gated by the advanced disclosure, so these assert the total count (1 collapsed, 2
    // expanded) rather than presence/absence.
    it('the transform section numeric inputs are collapsed by default when transform is unset', () => {
        const { getAllByText } = render(() => <NodeStyleEffectsTab style={{}} onChange={vi.fn()} />);
        expect(getAllByText('Dịch ngang (px)').length).toBe(1);
    });

    it('the transform section numeric inputs are expanded by default when transform already has a value', () => {
        const { getAllByText } = render(() => (
            <NodeStyleEffectsTab style={{ transform: { rotate: 10 } }} onChange={vi.fn()} />
        ));
        expect(getAllByText('Dịch ngang (px)').length).toBe(2);
    });

    it('clicking "Nâng cao" toggles the transform section numeric inputs visible', () => {
        const { getByText, getAllByText } = render(() => <NodeStyleEffectsTab style={{}} onChange={vi.fn()} />);
        expect(getAllByText('Dịch ngang (px)').length).toBe(1);
        fireEvent.click(getByText('Nâng cao'));
        expect(getAllByText('Dịch ngang (px)').length).toBe(2);
    });
});

describe('NodeStyleEffectsTab — Image art-direction section (moved from NodeStyleTab, Task 7)', () => {
    it('renders nothing image-related unless isImage is set', () => {
        const { queryByText } = render(() => (
            <NodeStyleEffectsTab style={{ image: { aspectRatio: '16:9' } }} onChange={vi.fn()} />
        ));
        expect(queryByText(t('cms.node.image.aspectRatio'))).toBeNull();
        expect(queryByText(t('cms.node.image.treatment'))).toBeNull();
    });

    // Relocated from NodeStyleTab.test.tsx's Task 5 block — focalPoint left for
    // NodeContentSpacingSize ("Nội dung" tab); the rest of the art-direction group came here.
    it('does NOT render the focal-point fields, but keeps the rest of the Image section', () => {
        const { queryByText, getByText } = render(() => (
            <NodeStyleEffectsTab style={{ image: { focalPoint: { x: 30, y: 70 } } }} onChange={vi.fn()} isImage />
        ));
        expect(queryByText(t('cms.node.image.focalPointX'))).toBeNull();
        expect(queryByText(t('cms.node.image.focalPointY'))).toBeNull();
        expect(getByText(t('cms.node.image.aspectRatio'))).toBeTruthy();
        expect(getByText(t('cms.node.image.treatment'))).toBeTruthy();
        expect(getByText(t('cms.node.image.overlayGradient'))).toBeTruthy();
        expect(getByText(t('cms.node.image.mask'))).toBeTruthy();
        expect(getByText(t('cms.node.image.revealOnScroll'))).toBeTruthy();
    });

    it('shows the duotone color pair only when image.treatment is "duotone"', () => {
        const { queryByText } = render(() => (
            <NodeStyleEffectsTab style={{ image: { treatment: 'grayscale' } }} onChange={vi.fn()} isImage />
        ));
        expect(queryByText(t('cms.node.image.duotoneFrom'))).toBeNull();

        const { getByText } = render(() => (
            <NodeStyleEffectsTab style={{ image: { treatment: 'duotone' } }} onChange={vi.fn()} isImage />
        ));
        expect(getByText(t('cms.node.image.duotoneFrom'))).toBeTruthy();
        expect(getByText(t('cms.node.image.duotoneTo'))).toBeTruthy();
    });

    it('typing an overlay gradient writes it into image.overlayGradient, leaving image.aspectRatio untouched', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => (
            <NodeStyleEffectsTab style={{ image: { aspectRatio: '16:9' } }} onChange={onChange} isImage />
        ));
        const input = getByText(t('cms.node.image.overlayGradient')).parentElement!.querySelector('input')!;
        fireEvent.input(input, { target: { value: 'linear-gradient(180deg, transparent, #000)' } });
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
            image: { aspectRatio: '16:9', overlayGradient: 'linear-gradient(180deg, transparent, #000)' },
        }));
    });

    it('toggling "reveal on scroll" writes image.revealOnScroll without dropping sibling image fields', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => (
            <NodeStyleEffectsTab style={{ image: { mask: 'circle' } }} onChange={onChange} isImage />
        ));
        fireEvent.click(getByText(t('cms.node.image.revealOnScroll')));
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ image: { mask: 'circle', revealOnScroll: true } }));
    });
});

// Property Inspector redesign, Task 5 (Phase 3) — extends Phase 1 Task 9's per-section
// modified indicator + reset (NodeStyleTab.test.tsx precedent) to this tab's own 3 sections:
// Transform, Hover, Image. Each `isModified` is a plain presence check on that section's own
// StyleObject sub-key; each `onReset` clears only that sub-key, leaving sibling style keys
// (including the OTHER 2 sections' own sub-keys) untouched.
describe('NodeStyleEffectsTab — per-section modified indicator + reset (Property Inspector redesign, Task 5, Phase 3)', () => {
    const RESET_LABEL = t('cms.node.transform.resetButton');

    it('none of Transform/Hover/Image show a modified dot when style is empty', () => {
        const { container } = render(() => <NodeStyleEffectsTab style={{}} onChange={vi.fn()} isImage />);
        expect(container.querySelectorAll('[aria-label="modified"]').length).toBe(0);
    });

    it('Transform section shows a modified dot + reset button when transform is set, and reset clears ONLY transform', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => (
            <NodeStyleEffectsTab style={{ transform: { rotate: 5 }, hover: { scope: 'parent' } }} onChange={onChange} />
        ));
        const section = getByText(t('cms.node.style.transform')).closest('.border-b') as HTMLElement;
        expect(section.querySelector('[aria-label="modified"]')).toBeTruthy();
        fireEvent.click(section.querySelector(`[title="${RESET_LABEL}"]`)!);
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
            transform: undefined,
            hover: { scope: 'parent' },
        }));
    });

    it('Hover section shows a modified dot + reset button when hover is set, and reset clears ONLY hover', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => (
            <NodeStyleEffectsTab style={{ hover: { scope: 'parent' }, transform: { rotate: 5 } }} onChange={onChange} />
        ));
        const section = getByText(t('cms.node.style.hover')).closest('.border-b') as HTMLElement;
        expect(section.querySelector('[aria-label="modified"]')).toBeTruthy();
        fireEvent.click(section.querySelector(`[title="${RESET_LABEL}"]`)!);
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
            hover: undefined,
            transform: { rotate: 5 },
        }));
    });

    it('Image section shows a modified dot + reset button when image is set, and reset clears ONLY image', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => (
            <NodeStyleEffectsTab style={{ image: { aspectRatio: '16:9' }, transform: { rotate: 5 } }} onChange={onChange} isImage />
        ));
        const section = getByText(t('cms.node.image.title')).closest('.border-b') as HTMLElement;
        expect(section.querySelector('[aria-label="modified"]')).toBeTruthy();
        fireEvent.click(section.querySelector(`[title="${RESET_LABEL}"]`)!);
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
            image: undefined,
            transform: { rotate: 5 },
        }));
    });
});

/** Property Inspector Phase 4, Task 5 — `searchQuery` is threaded into all three
 * `InspectorSection`s this file renders (Transform / Hover / Image). `isImage` is set so the
 * Image section is actually mounted and therefore actually exercised by the filter. */
describe('NodeStyleEffectsTab — searchQuery threading (Phase 4, Task 5)', () => {
    it('hides all three sections when the query matches no title', () => {
        const { container } = render(() => (
            <NodeStyleEffectsTab style={{}} onChange={vi.fn()} isImage searchQuery="zzz-khong-ton-tai" />
        ));
        expect(container.textContent).toBe('');
    });

    it('keeps only the Image section when the query is its title', () => {
        const { container } = render(() => (
            <NodeStyleEffectsTab style={{}} onChange={vi.fn()} isImage searchQuery={t('cms.node.image.title')} />
        ));
        expect(container.textContent).toContain(t('cms.node.image.aspectRatio'));
        expect(container.textContent).not.toContain(t('cms.node.style.transform'));
        expect(container.textContent).not.toContain(t('cms.node.style.hover'));
    });

    it('renders every section again when the query is empty', () => {
        const { container } = render(() => (
            <NodeStyleEffectsTab style={{}} onChange={vi.fn()} isImage searchQuery="" />
        ));
        expect(container.textContent).toContain(t('cms.node.style.transform'));
        expect(container.textContent).toContain(t('cms.node.style.hover'));
        expect(container.textContent).toContain(t('cms.node.image.aspectRatio'));
    });
});
