// @vitest-environment jsdom
//
// This project's vitest.config.ts default is `environment: 'node'` (no DOM globals).
// Importing NodeContentTab.tsx transitively pulls in nodeTypeRegistry
// (@/modules/cms/node/nodeRegistry), which pulls in every primitive .tsx component down
// to NodeRenderer.tsx, whose Solid-compiled JSX calls `delegateEvents()` at module load
// time — that needs `window`. This pragma opts just this file into jsdom, the same
// per-file override nodeRegistry.test.ts/ContentEntryRepeaterInput.test.ts already use
// for the same reason (jsdom is present in node_modules; no config change, no new
// dependency).
//
// jsdom's `window` doesn't implement `matchMedia` (a well-known jsdom gap) — GSAP's
// ScrollTrigger plugin registers itself as a side effect when nodeRegistry.ts's
// primitive-component imports transitively load animation/presetRegistry.ts, and that
// registration calls `matchMedia` at MODULE-EVALUATION time. A plain top-level stub
// wouldn't help here: static ESM imports are hoisted above a file's own code, so
// NodeContentTab.tsx would already be evaluating before any stub assignment placed
// after a static `import` runs. Fixed the same way nodeRegistry.test.ts was: stub
// `matchMedia` first, then pull in `getAtPath`/`setAtPath` via a dynamic `import()`
// inside `beforeAll` — dynamic imports resolve at the point they're awaited, not
// hoisted, so ordering is guaranteed correct. Test bodies/assertions below are
// otherwise verbatim from the plan.
import { describe, it, expect, beforeAll } from 'vitest';

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

let getAtPath: typeof import('./NodeContentTab')['getAtPath'];
let setAtPath: typeof import('./NodeContentTab')['setAtPath'];

beforeAll(async () => {
    ({ getAtPath, setAtPath } = await import('./NodeContentTab'));
}, 30000);

describe('getAtPath/setAtPath (dot-path field keys)', () => {
    it('reads a flat key unchanged', () => {
        expect(getAtPath({ text: 'hello' }, 'text')).toBe('hello');
    });

    it('reads a nested dot-path', () => {
        expect(getAtPath({ content: { heading: 'Hi' } }, 'content.heading')).toBe('Hi');
    });

    it('returns undefined for a missing nested path without throwing', () => {
        expect(getAtPath({}, 'content.heading')).toBeUndefined();
        expect(getAtPath(undefined, 'content.heading')).toBeUndefined();
    });

    it('writes a flat key unchanged', () => {
        expect(setAtPath({ text: 'old' }, 'text', 'new')).toEqual({ text: 'new' });
    });

    it('writes a nested dot-path, creating intermediate objects and preserving siblings', () => {
        const result = setAtPath({ content: { heading: 'Hi', other: 'keep-me' } }, 'content.heading', 'Bye');
        expect(result).toEqual({ content: { heading: 'Bye', other: 'keep-me' } });
    });

    it('writes a nested dot-path from an empty props object', () => {
        expect(setAtPath(undefined, 'content.heading', 'Hi')).toEqual({ content: { heading: 'Hi' } });
    });
});
