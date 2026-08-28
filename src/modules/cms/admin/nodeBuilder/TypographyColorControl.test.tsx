// src/modules/cms/admin/nodeBuilder/TypographyColorControl.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { TypographyColorControl } from './TypographyColorControl';
import { normalizeTypographyColor } from '@/modules/cms/node/node.types';

describe('TypographyColorControl', () => {
    it('shows the toggle OFF and hides all fields when value is unset', () => {
        const { getByText, queryByText } = render(() => <TypographyColorControl value={undefined} onChange={vi.fn()} />);
        expect(getByText('Bật màu chữ')).toBeTruthy();
        expect(queryByText('Kiểu tô màu chữ')).toBeNull();
    });

    it('turning the toggle ON writes a starter solid color', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => <TypographyColorControl value={undefined} onChange={onChange} />);
        fireEvent.click(getByText('Bật màu chữ'));
        expect(onChange).toHaveBeenCalledWith({ type: 'solid', value: '#171717ff' });
    });

    it('turning the toggle OFF clears the value to undefined', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => <TypographyColorControl value={{ type: 'solid', value: '#ffffffff' }} onChange={onChange} />);
        fireEvent.click(getByText('Bật màu chữ'));
        expect(onChange).toHaveBeenCalledWith(undefined);
    });

    it('solid mode shows a ColorControl bound to value.value', () => {
        const { getByDisplayValue } = render(() => (
            <TypographyColorControl value={{ type: 'solid', value: '#d4a62bff' }} onChange={vi.fn()} />
        ));
        expect(getByDisplayValue('#d4a62bff')).toBeTruthy();
    });

    it('image mode shows a URL text input bound to value.value', () => {
        const { getByDisplayValue, getByText } = render(() => (
            <TypographyColorControl value={{ type: 'image', value: 'https://example.com/a.jpg' }} onChange={vi.fn()} />
        ));
        expect(getByText('URL ảnh')).toBeTruthy();
        expect(getByDisplayValue('https://example.com/a.jpg')).toBeTruthy();
    });

    it('video mode shows a URL text input bound to value.value', () => {
        const { getByDisplayValue, getByText } = render(() => (
            <TypographyColorControl value={{ type: 'video', value: 'https://example.com/a.mp4' }} onChange={vi.fn()} />
        ));
        expect(getByText('URL video')).toBeTruthy();
        expect(getByDisplayValue('https://example.com/a.mp4')).toBeTruthy();
    });

    it('gradient mode shows a text input bound to value.value', () => {
        const { getByDisplayValue, getByText } = render(() => (
            <TypographyColorControl value={{ type: 'gradient', value: 'linear-gradient(90deg, #f00, #00f)' }} onChange={vi.fn()} />
        ));
        expect(getByText('Giá trị gradient (CSS)')).toBeTruthy();
        expect(getByDisplayValue('linear-gradient(90deg, #f00, #00f)')).toBeTruthy();
    });

    it('normalizes a legacy plain-string value (pre-union-type data) to solid mode instead of showing a broken/undefined type', () => {
        const { getByText, getByDisplayValue } = render(() => (
            <TypographyColorControl value={normalizeTypographyColor('#ffffff' as any)} onChange={vi.fn()} />
        ));
        expect(getByText('Màu đặc')).toBeTruthy(); // solid mode's label, confirms type resolved correctly
        expect(getByDisplayValue('#ffffff')).toBeTruthy();
    });

    it('typing a new URL in image mode calls onChange with the updated value, same type', () => {
        const onChange = vi.fn();
        const { getByDisplayValue } = render(() => (
            <TypographyColorControl value={{ type: 'image', value: 'https://example.com/a.jpg' }} onChange={onChange} />
        ));
        fireEvent.input(getByDisplayValue('https://example.com/a.jpg'), { target: { value: 'https://example.com/b.jpg' } });
        expect(onChange).toHaveBeenCalledWith({ type: 'image', value: 'https://example.com/b.jpg' });
    });

    // final-review fix (Important #4): hover styling is CSS-only (compileNodeStateCss delegates to
    // applyNodeStyle) — video mode requires a real <video> DOM element that TextNode.tsx only
    // ever reads off the BASE style, never `style().hover?.typography`, so "Video" in a hover
    // context was a silent no-op. `hideVideoOption` hides that dead option at its one call site
    // (NodeStyleTab.tsx's Hover section) without touching the main Chữ section, where video
    // genuinely works. The type Select is a DropdownSelect — its option list only mounts into
    // the DOM once opened (see NodeAnimationTab.test.tsx's identical "open via focus" pattern),
    // so these tests open it for real rather than asserting against a closed panel (which would
    // pass/fail identically regardless of the fix, since no options are mounted either way).
    it('hideVideoOption removes "Video" from the opened type Select dropdown', () => {
        const { getByText, queryByText } = render(() => (
            <TypographyColorControl value={{ type: 'solid', value: '#171717ff' }} onChange={vi.fn()} hideVideoOption />
        ));
        const typeLabel = getByText('Kiểu tô màu chữ');
        const typeInput = typeLabel.parentElement!.querySelector('input') as HTMLInputElement;
        expect(typeInput).toBeTruthy();
        fireEvent.focus(typeInput);
        // Sanity: the dropdown genuinely opened and rendered the other real options — proves
        // this isn't a false negative from querying a closed/unmounted panel.
        expect(getByText('Gradient')).toBeTruthy();
        expect(queryByText('Video')).toBeNull();
    });

    it('the default (hideVideoOption omitted/false) still includes "Video" in the opened dropdown — regression guard for the main Chữ section', () => {
        const { getByText } = render(() => (
            <TypographyColorControl value={{ type: 'solid', value: '#171717ff' }} onChange={vi.fn()} />
        ));
        const typeLabel = getByText('Kiểu tô màu chữ');
        const typeInput = typeLabel.parentElement!.querySelector('input') as HTMLInputElement;
        fireEvent.focus(typeInput);
        expect(getByText('Video')).toBeTruthy();
    });
});
