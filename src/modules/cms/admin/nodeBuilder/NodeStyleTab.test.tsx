// src/modules/cms/admin/nodeBuilder/NodeStyleTab.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@solidjs/testing-library';
import { NodeStyleTab } from './NodeStyleTab';
import { FONT_FAMILIES } from '@core/components/control/editor/commands/font';

describe('NodeStyleTab font-family Select (Node Builder Inspector Polish, Task 5)', () => {
    it('sanity: the shared FONT_FAMILIES list is non-empty and includes a Serif entry', () => {
        // Basic check on the standalone list itself — kept as a cheap guard, but NOT the
        // regression protection for NodeStyleTab's wiring (see the test below for that).
        expect(FONT_FAMILIES.length).toBeGreaterThan(0);
        expect(FONT_FAMILIES.map((f) => f.title)).toContain('Serif');
    });

    it('renders the resolved font-family LABEL (not the raw value) when style.typography.fontFamily is set, proving the Select is genuinely wired with the correct value/label mapping', () => {
        // 'serif' is a real FONT_FAMILIES value that maps to the label 'Serif' (font.ts).
        const { container } = render(() => (
            <NodeStyleTab
                style={{ typography: { fontFamily: 'serif' } }}
                onChange={vi.fn()}
            />
        ));

        // DropdownSelect (the non-native Select mode used here) doesn't render native
        // <option> elements — it's a custom div-based popover. But once a value is
        // selected, it renders a visible "overlay" div showing the SELECTED item's
        // *label* text (DropdownSelect.tsx: `Show when={!props.multi && hasSelection()}`
        // renders `RenderedOption` for `selectedItems()[0]`, whose `item.label` is shown).
        //
        // Asserting the resolved label 'Serif' appears (not the raw value 'serif') proves:
        //  (a) the field is genuinely wired to the real `typography.fontFamily` value,
        //  (b) the `{value: f.value, label: f.title}` mapping is correct, not swapped
        //      (a swapped mapping would make no option's `value` equal 'serif', so no
        //      selection — and therefore no overlay/label — would render at all), and
        //  (c) it's a `Select`, not the old free-text `Input` (an `Input` bound to the
        //      same value would show the raw string 'serif' typed into a text box, never
        //      a resolved label from a lookup list).
        expect(container.textContent).toContain('Serif');
    });
});
