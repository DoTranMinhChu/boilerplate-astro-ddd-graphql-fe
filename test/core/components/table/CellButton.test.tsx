// ddd-graphql-fe/src/core/components/table/CellButton.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@solidjs/testing-library';
import { CellButton } from '@core/components/table/CellButton';

describe('CellButton visible prop (Admin UI Polish, Task 1)', () => {
    it('renders normally when visible is omitted (defaults to true)', () => {
        const onClick = vi.fn();
        const { getByRole } = render(() => <CellButton onClick={onClick} icon="x" />);
        const el = getByRole('button');
        expect(el.className).not.toContain('invisible');
        el.click();
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('renders normally when visible is explicitly true', () => {
        const onClick = vi.fn();
        const { getByRole } = render(() => <CellButton visible={true} onClick={onClick} icon="x" />);
        const el = getByRole('button');
        expect(el.className).not.toContain('invisible');
        el.click();
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('renders an invisible, non-interactive placeholder when visible is false, same width class as the visible case', () => {
        const onClick = vi.fn();
        const { container: visibleContainer } = render(() => <CellButton visible={true} onClick={vi.fn()} icon="x" />);
        const { container: hiddenContainer } = render(() => <CellButton visible={false} onClick={onClick} icon="x" />);

        const visibleEl = visibleContainer.querySelector('button, div')!;
        const hiddenEl = hiddenContainer.querySelector('button, div')!;

        // Same size-affecting classes (h-8/min-w-8 for sm, from Button.tsx) — the whole point is
        // reserving identical layout space.
        expect(hiddenEl.className).toContain('h-8');
        expect(hiddenEl.className).toContain('min-w-8');
        expect(hiddenEl.className).toContain('invisible');
        expect(hiddenEl.className).toContain('pointer-events-none');

        // No click handler reachable — Button.tsx renders a plain non-interactive <div> (kind
        // 'badge') once onClick is null and there's no href, so there's nothing to dispatch a
        // click on in the first place; assert that directly instead of dispatching a click.
        expect(hiddenEl.tagName.toLowerCase()).toBe('div');
        expect(onClick).not.toHaveBeenCalled();
    });

    it('suppresses href navigation too when visible is false (a link-style CellButton)', () => {
        const { container } = render(() => <CellButton visible={false} href="/somewhere" icon="x" />);
        const el = container.querySelector('a, div')!;
        expect(el.tagName.toLowerCase()).toBe('div');
    });
});
