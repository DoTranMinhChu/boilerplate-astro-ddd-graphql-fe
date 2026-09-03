// src/core/components/control/Textarea.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@solidjs/testing-library';
import { Textarea } from '@core/components/control/Textarea';

describe('Textarea width (Node Builder Inspector Polish, Task 8)', () => {
    it('the textarea element carries a full-width class', () => {
        const { container } = render(() => <Textarea value="" onChange={vi.fn()} fieldless />);
        const el = container.querySelector('textarea')!;
        expect(el.className).toMatch(/\bw-full\b/);
    });
});
