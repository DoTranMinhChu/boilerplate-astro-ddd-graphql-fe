// src/modules/cms/admin/nodeBuilder/TypographyColorControl.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { TypographyColorControl } from './TypographyColorControl';

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

    it('typing a new URL in image mode calls onChange with the updated value, same type', () => {
        const onChange = vi.fn();
        const { getByDisplayValue } = render(() => (
            <TypographyColorControl value={{ type: 'image', value: 'https://example.com/a.jpg' }} onChange={onChange} />
        ));
        fireEvent.input(getByDisplayValue('https://example.com/a.jpg'), { target: { value: 'https://example.com/b.jpg' } });
        expect(onChange).toHaveBeenCalledWith({ type: 'image', value: 'https://example.com/b.jpg' });
    });
});
