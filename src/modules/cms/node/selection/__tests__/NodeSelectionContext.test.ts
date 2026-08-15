import { describe, it, expect } from 'vitest';
import { createRoot } from 'solid-js';
import { createNodeSelectionStore } from '../NodeSelectionContext';

// Test the underlying store factory directly (no need to mount a Solid component
// tree just to verify pure state-transition logic).
describe('createNodeSelectionStore', () => {
    it('select() replaces the whole selection with a single id and sets it as anchor', () => {
        createRoot((dispose) => {
            const sel = createNodeSelectionStore();
            sel.select('a');
            expect(sel.selectedIds().has('a')).toBe(true);
            expect(sel.selectedIds().size).toBe(1);

            sel.select('b');
            expect(sel.selectedIds().has('a')).toBe(false);
            expect(sel.selectedIds().has('b')).toBe(true);
            dispose();
        });
    });

    it('toggle() adds an id not yet selected, without clearing existing selection', () => {
        createRoot((dispose) => {
            const sel = createNodeSelectionStore();
            sel.select('a');
            sel.toggle('b');
            expect(sel.selectedIds()).toEqual(new Set(['a', 'b']));
            dispose();
        });
    });

    it('toggle() removes an id that is already selected', () => {
        createRoot((dispose) => {
            const sel = createNodeSelectionStore();
            sel.select('a');
            sel.toggle('a');
            expect(sel.selectedIds().size).toBe(0);
            dispose();
        });
    });

    it('selectRange() selects the contiguous slice between anchor and target in the given visible order', () => {
        createRoot((dispose) => {
            const sel = createNodeSelectionStore();
            const order = ['a', 'b', 'c', 'd', 'e'];
            sel.select('b'); // anchor = b
            sel.selectRange('d', order);
            expect(sel.selectedIds()).toEqual(new Set(['b', 'c', 'd']));
            dispose();
        });
    });

    it('selectRange() works backwards (target before anchor in visible order)', () => {
        createRoot((dispose) => {
            const sel = createNodeSelectionStore();
            const order = ['a', 'b', 'c', 'd', 'e'];
            sel.select('d');
            sel.selectRange('b', order);
            expect(sel.selectedIds()).toEqual(new Set(['b', 'c', 'd']));
            dispose();
        });
    });

    it('selectRange() with no prior anchor falls back to selecting just the target', () => {
        createRoot((dispose) => {
            const sel = createNodeSelectionStore();
            sel.selectRange('c', ['a', 'b', 'c', 'd']);
            expect(sel.selectedIds()).toEqual(new Set(['c']));
            dispose();
        });
    });

    it('clear() empties the selection', () => {
        createRoot((dispose) => {
            const sel = createNodeSelectionStore();
            sel.select('a');
            sel.toggle('b');
            sel.clear();
            expect(sel.selectedIds().size).toBe(0);
            dispose();
        });
    });

    it('remove() drops a single id from selection if present, no-op if absent', () => {
        createRoot((dispose) => {
            const sel = createNodeSelectionStore();
            sel.select('a');
            sel.toggle('b');
            sel.remove('a');
            expect(sel.selectedIds()).toEqual(new Set(['b']));
            sel.remove('nonexistent'); // no throw
            expect(sel.selectedIds()).toEqual(new Set(['b']));
            dispose();
        });
    });

    it('isSelected() reflects current membership', () => {
        createRoot((dispose) => {
            const sel = createNodeSelectionStore();
            sel.select('a');
            expect(sel.isSelected('a')).toBe(true);
            expect(sel.isSelected('z')).toBe(false);
            dispose();
        });
    });
});
