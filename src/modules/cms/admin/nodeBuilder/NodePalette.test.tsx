// @vitest-environment jsdom
//
// NodePalette.tsx imports NODE_TYPE_META from nodeRegistry.ts, which transitively evaluates
// every primitive .tsx component down to NodeRenderer.tsx — same jsdom `matchMedia` gap +
// dynamic-import-inside-beforeAll fix already used by nodeRegistry.test.ts/FrameNode.test.tsx et
// al. (GSAP's ScrollTrigger plugin registers itself at module-evaluation time, reading
// `matchMedia`, which jsdom's `window` doesn't implement).
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';

if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
}

let NodePalette: typeof import('./NodePalette')['NodePalette'];
let ENodeType: typeof import('@/modules/cms/node/node.constants')['ENodeType'];
let RETIRED_NODE_TYPES: typeof import('@/modules/cms/node/node.constants')['RETIRED_NODE_TYPES'];

beforeAll(async () => {
    ({ NodePalette } = await import('./NodePalette'));
    ({ ENodeType, RETIRED_NODE_TYPES } = await import('@/modules/cms/node/node.constants'));
}, 30000);

describe('NodePalette — excludes retired node types (roadmap close-out, 2026-08-24)', () => {
    it('renders exactly one button per non-retired ENodeType, and no button for any RETIRED_NODE_TYPES member', () => {
        const { container } = render(() => <NodePalette onAdd={vi.fn()} />);
        const buttons = container.querySelectorAll('button');
        const expectedCount = Object.values(ENodeType).filter((t) => !RETIRED_NODE_TYPES.has(t)).length;
        expect(buttons.length).toBe(expectedCount);
    });

    it('still offers the true primitives (Frame/Text/Image/Button) and the 3 accepted-utility types (Table/CardList/ContentDetail)', () => {
        const onAdd = vi.fn();
        const { container } = render(() => <NodePalette onAdd={onAdd} />);
        const buttons = Array.from(container.querySelectorAll('button'));
        expect(buttons.length).toBeGreaterThan(0);
        // Clicking every rendered button must never fire onAdd with a retired type -- the
        // strongest guarantee that RETIRED_NODE_TYPES actually governs what's clickable, not
        // just what's counted.
        buttons.forEach((b) => fireEvent.click(b));
        const addedTypes = onAdd.mock.calls.map((call) => call[0]);
        expect(addedTypes.length).toBe(buttons.length);
        for (const type of addedTypes) {
            expect(RETIRED_NODE_TYPES.has(type)).toBe(false);
        }
        expect(addedTypes).toEqual(expect.arrayContaining([
            ENodeType.FRAME, ENodeType.TEXT, ENodeType.IMAGE, ENodeType.BUTTON,
            ENodeType.TABLE, ENodeType.CARD_LIST, ENodeType.CONTENT_DETAIL,
        ]));
    });

    it('excludes every one of the 13 roadmap-retired types by name (regression guard against a future edit narrowing RETIRED_NODE_TYPES by accident)', () => {
        const onAdd = vi.fn();
        render(() => <NodePalette onAdd={onAdd} />);
        const retired = [
            ENodeType.MEDIA_HERO, ENodeType.INTRO_RAIL, ENodeType.SPOTLIGHT_LIST, ENodeType.STAT_METRICS,
            ENodeType.TIMELINE_LIST, ENodeType.PROCESS_STEPS, ENodeType.CONTACT_COLUMNS, ENodeType.ACCORDION_LIST,
            ENodeType.INQUIRY_FORM, ENodeType.PROJECT_SHOWCASE, ENodeType.LOGO_GRID, ENodeType.FEATURED_ENTRY,
            ENodeType.MIXED_FEED,
        ];
        expect(retired.every((t) => RETIRED_NODE_TYPES.has(t))).toBe(true);
        expect(RETIRED_NODE_TYPES.size).toBe(retired.length);
    });
});
