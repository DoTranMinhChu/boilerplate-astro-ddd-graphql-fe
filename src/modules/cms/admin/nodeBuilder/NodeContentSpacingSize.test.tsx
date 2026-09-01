// src/modules/cms/admin/nodeBuilder/NodeContentSpacingSize.test.tsx
// @vitest-environment jsdom
//
// Property Inspector redesign, Task 5 — Spacing (margin + padding + gap) / Size
// (width/height/objectFit) / Position (image-only focalPoint) extracted out of
// NodeStyleTab.tsx into the "Nội dung" tab. The Size describe block below is
// RELOCATED verbatim-in-spirit from NodeStyleTab.test.tsx (those fields no longer
// live in that component), retargeted at the new component.
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { NodeContentSpacingSize } from './NodeContentSpacingSize';
import { t } from '@/shared/i18n/t';

describe('NodeContentSpacingSize — Spacing (margin is the genuinely NEW control)', () => {
    it('renders TWO box-model controls (margin + padding), not just padding', () => {
        const { getAllByPlaceholderText, getByText } = render(() => (
            <NodeContentSpacingSize style={{}} onChange={vi.fn()} />
        ));
        // SpacingControl renders one T/R/B/L quartet per instance (placeholder "T" on the
        // top box) — two quartets means margin AND padding are both present.
        expect(getAllByPlaceholderText('T').length).toBe(2);
        expect(getByText(t('cms.node.style.margin'))).toBeTruthy();
        expect(getByText(t('cms.node.style.padding'))).toBeTruthy();
    });

    it('typing into the margin control writes style.spacing.margin (NOT padding)', () => {
        const onChange = vi.fn();
        const { getAllByPlaceholderText } = render(() => (
            <NodeContentSpacingSize style={{}} onChange={onChange} />
        ));
        // Margin is rendered first (document order), padding second.
        fireEvent.input(getAllByPlaceholderText('T')[0], { target: { value: '16' } });
        expect(onChange).toHaveBeenLastCalledWith({ spacing: { margin: { t: 16 } } });
    });

    it('typing into the padding control writes style.spacing.padding, leaving an existing margin untouched', () => {
        const onChange = vi.fn();
        const { getAllByPlaceholderText } = render(() => (
            <NodeContentSpacingSize style={{ spacing: { margin: { t: 8 } } }} onChange={onChange} />
        ));
        fireEvent.input(getAllByPlaceholderText('T')[1], { target: { value: '12' } });
        expect(onChange).toHaveBeenLastCalledWith({ spacing: { margin: { t: 8 }, padding: { t: 12 } } });
    });

    it('reads an existing margin back out of style.spacing.margin', () => {
        const { getAllByPlaceholderText } = render(() => (
            <NodeContentSpacingSize style={{ spacing: { margin: { t: 24, b: 24 } } }} onChange={vi.fn()} />
        ));
        expect((getAllByPlaceholderText('T')[0] as HTMLInputElement).value).toBe('24');
    });

    it('typing a gap writes style.spacing.gap, leaving margin/padding untouched', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => (
            <NodeContentSpacingSize style={{ spacing: { padding: { t: 4 } } }} onChange={onChange} />
        ));
        const input = getByText(t('cms.node.style.gap')).parentElement!.querySelector('input')!;
        fireEvent.input(input, { target: { value: '10' } });
        expect(onChange).toHaveBeenLastCalledWith({ spacing: { padding: { t: 4 }, gap: 10 } });
    });
});

// Relocated from NodeStyleTab.test.tsx (No-code primitives upgrade, 2026-08-20) — these
// fields moved into this component in the Property Inspector redesign, Task 5.
describe('NodeContentSpacingSize — Size (width/height/objectFit) controls', () => {
    it('renders "Rộng (px)"/"Cao (px)" reading numeric px values back out of size.width/size.height', () => {
        const { getByText, getByDisplayValue } = render(() => (
            <NodeContentSpacingSize style={{ size: { width: '240px', height: '160px' } }} onChange={vi.fn()} />
        ));
        expect(getByText('Rộng (px)')).toBeTruthy();
        expect(getByText('Cao (px)')).toBeTruthy();
        expect(getByDisplayValue('240')).toBeTruthy();
        expect(getByDisplayValue('160')).toBeTruthy();
    });

    it('typing a height writes a "Npx" string into size.height, leaving size.width untouched', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => (
            <NodeContentSpacingSize style={{ size: { width: '100%' } }} onChange={onChange} />
        ));
        const input = getByText('Cao (px)').parentElement!.querySelector('input')!;
        fireEvent.input(input, { target: { value: '160' } });
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ size: { width: '100%', height: '160px' } }));
    });

    it('a non-"Npx" width (e.g. "100%") shows the px input empty rather than guessing a number', () => {
        const { getByText } = render(() => (
            <NodeContentSpacingSize style={{ size: { width: '100%' } }} onChange={vi.fn()} />
        ));
        const input = getByText('Rộng (px)').parentElement!.querySelector('input')! as HTMLInputElement;
        expect(input.value).toBe('');
    });

    it('shows the resolved objectFit LABEL when style.size.objectFit is set', () => {
        const { container } = render(() => (
            <NodeContentSpacingSize style={{ size: { objectFit: 'cover' } }} onChange={vi.fn()} />
        ));
        expect(container.textContent).toContain('Lấp đầy (cover)');
    });

    it('mounting with no explicit size.objectFit does NOT fire a spurious onChange', () => {
        const onChange = vi.fn();
        render(() => <NodeContentSpacingSize style={{}} onChange={onChange} />);
        expect(onChange).not.toHaveBeenCalled();
    });
});

describe('NodeContentSpacingSize — Position (focalPoint) is image-only', () => {
    it('does NOT render the focal-point fields when isImage is omitted', () => {
        const { queryByText } = render(() => <NodeContentSpacingSize style={{}} onChange={vi.fn()} />);
        expect(queryByText(t('cms.node.image.focalPointX'))).toBeNull();
    });

    it('does NOT render the focal-point fields when isImage is explicitly false', () => {
        const { queryByText } = render(() => (
            <NodeContentSpacingSize style={{}} onChange={vi.fn()} isImage={false} />
        ));
        expect(queryByText(t('cms.node.image.focalPointY'))).toBeNull();
    });

    it('renders and round-trips focalPoint X/Y when isImage is true', () => {
        const { getByText, getByDisplayValue } = render(() => (
            <NodeContentSpacingSize style={{ image: { focalPoint: { x: 30, y: 70 } } }} onChange={vi.fn()} isImage />
        ));
        expect(getByText(t('cms.node.image.focalPointX'))).toBeTruthy();
        expect(getByText(t('cms.node.image.focalPointY'))).toBeTruthy();
        expect(getByDisplayValue('30')).toBeTruthy();
        expect(getByDisplayValue('70')).toBeTruthy();
    });

    it('typing focalPoint X keeps the existing Y and any other image sub-fields (aspectRatio) untouched', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => (
            <NodeContentSpacingSize
                style={{ image: { aspectRatio: '16:9', focalPoint: { x: 50, y: 70 } } }}
                onChange={onChange}
                isImage
            />
        ));
        const input = getByText(t('cms.node.image.focalPointX')).parentElement!.querySelector('input')!;
        fireEvent.input(input, { target: { value: '25' } });
        expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
            image: { aspectRatio: '16:9', focalPoint: { x: 25, y: 70 } },
        }));
    });
});
