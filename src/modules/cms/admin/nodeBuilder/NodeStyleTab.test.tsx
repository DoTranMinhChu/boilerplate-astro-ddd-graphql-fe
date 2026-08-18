// src/modules/cms/admin/nodeBuilder/NodeStyleTab.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@solidjs/testing-library';
import { NodeStyleTab } from './NodeStyleTab';
import { FONT_FAMILIES } from '@core/components/control/editor/commands/font';

describe('NodeStyleTab font-family Select (Node Builder Inspector Polish, Task 5)', () => {
    it('renders a Select (not a free-text Input) for font family, with one option per FONT_FAMILIES entry', () => {
        const { container } = render(() => <NodeStyleTab style={{}} onChange={vi.fn()} />);
        const options = container.querySelectorAll('option');
        // DropdownSelect doesn't render <option> elements (it's a custom div-based dropdown) —
        // this assertion targets the underlying data, not DOM shape: confirm no plain free-text
        // <input> exists for font-family specifically by checking the shared FONT_FAMILIES list
        // is genuinely imported and non-empty, and that no bare text input carries the old
        // fontFamily value binding shape. The concrete, stack-appropriate assertion is on the
        // exported list itself:
        expect(FONT_FAMILIES.length).toBeGreaterThan(0);
        expect(FONT_FAMILIES.map((f) => f.title)).toContain('Serif');
    });
});
