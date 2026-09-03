// test/modules/cms/admin/nodeBuilder/NodeBuilder.page.searchQuery.test.ts
//
// Property Inspector Phase 4, Task 5 — a SOURCE-LEVEL guard for the one reactivity rule the
// tab builders in `NodeBuilder.page.tsx` must obey.
//
// Background: Task 4 changed `PropertyPanel`'s 4 tab props from `JSX.Element` to
// `(searchQuery: Accessor<string>) => JSX.Element`. `PropertyPanel` calls each builder inside a
// reactive JSX position (`<Tabs.Tab>{props.contentTab(searchQuery)}</Tabs.Tab>`, which `Tab.tsx`
// reads through a `<Show>` memo). Handing over the ACCESSOR keeps that memo from tracking the
// query, so the builder runs once per tab activation instead of once per keystroke. But that
// protection is only as good as how the builder BODY reads it: any read of `searchQuery()` in
// STATEMENT position inside a builder (`const q = searchQuery();`, or a
// `.filter(x => x.includes(searchQuery()))` computed before the `return`) is tracked by that same
// memo and re-introduces the whole-tab-remount bug — silently discarding every collapsed section,
// open picker and in-progress edit in the tab on each debounce tick.
//
// Rendering `NodeBuilder.page.tsx` itself to assert this is disproportionate (2300+ lines, a page
// component wired to routing, GraphQL resources, a canvas and ~20 child panels), and
// `PropertyPanel.test.tsx`'s own "does not remount the tab body" case only covers PropertyPanel's
// synthetic contract, not these real builders. So this guards the invariant where it actually
// lives: in the source text. Every `searchQuery()` call in the file must be the right-hand side of
// a `searchQuery={...}` JSX prop, which is the only position that is safe by construction.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// test/ mirrors src/ path-for-path, so the real source file lives at the same
// relative position one level up, under src/ instead of test/.
const SRC_DIR = path.dirname(fileURLToPath(import.meta.url)).replace(`${path.sep}test${path.sep}`, `${path.sep}src${path.sep}`);
const PAGE_PATH = path.join(SRC_DIR, 'NodeBuilder.page.tsx');

/** Strips `/* … *\/` block comments (which is how this file's JSX comments and its long
 * explanatory notes are written) so a code EXAMPLE inside a comment — this task's own note
 * quotes `const q = searchQuery()` as the thing NOT to do — can't be mistaken for real code. */
function stripBlockComments(source: string): string {
    return source.replace(/\/\*[\s\S]*?\*\//g, '');
}

describe('NodeBuilder.page.tsx — searchQuery is only ever read in a JSX prop position', () => {
    const code = stripBlockComments(readFileSync(PAGE_PATH, 'utf8'));

    it('every searchQuery() call is the value of a searchQuery={...} prop', () => {
        const PROP_PREFIX = 'searchQuery={';
        const offenders: string[] = [];
        let calls = 0;

        for (const match of code.matchAll(/searchQuery\s*\(\s*\)/g)) {
            calls++;
            const start = match.index!;
            const before = code.slice(Math.max(0, start - PROP_PREFIX.length), start);
            if (before !== PROP_PREFIX) {
                // Report the offending line, not just a byte offset.
                const line = code.slice(0, start).split('\n').length;
                offenders.push(`line ${line}: ...${code.slice(Math.max(0, start - 60), start + 20).trim()}`);
            }
        }

        expect(offenders).toEqual([]);
        // Sanity floor: the 4 builders forward the query to 9 child components between them
        // (NodeContainerLayoutTab, NodeContentSpacingSize, NodeVisibilityTab, NodeStyleTab,
        // NodeAnimationTab, NodeStyleEffectsTab, NodeAdvancedTab, NodeTransformTab,
        // NodeGridItemTab). If this drops, a forward was deleted rather than moved.
        expect(calls).toBeGreaterThanOrEqual(9);
    });

    it('no builder assigns searchQuery() to a local variable', () => {
        // Catches the specific shape the task brief calls out: a statement-position read at the
        // top of a builder body. The prop-position check above already subsumes this, but this
        // states the intent explicitly so a future edit fails with a readable message.
        expect(code).not.toMatch(/(?:const|let|var)\s+\w+\s*=\s*searchQuery\s*\(\s*\)/);
    });

    it('all 4 tab builders still receive searchQuery as an accessor parameter', () => {
        for (const tab of ['contentTab', 'styleTab', 'effectsTab', 'advancedTab']) {
            expect(code).toContain(`${tab}={(searchQuery) =>`);
        }
    });
});
