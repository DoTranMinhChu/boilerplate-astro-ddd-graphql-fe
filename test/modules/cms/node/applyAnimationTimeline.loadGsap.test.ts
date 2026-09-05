// test/modules/cms/node/applyAnimationTimeline.loadGsap.test.ts
//
// Final whole-branch review Important I1: `loadGsap()` (applyAnimationTimeline.ts) used to cache
// a REJECTED dynamic-import promise forever in its module-level `gsapPromise` — nothing anywhere
// called `.catch()` on it, so once the chunk load failed once (e.g. a stale chunk reference
// during a rolling deploy), every future caller got back the exact same dead rejected promise,
// with no retry, for the lifetime of the page. Fixed by resetting `gsapPromise` to `undefined`
// inside a `.catch()` before re-throwing, so the CURRENT call still rejects exactly as before but
// the NEXT call starts a fresh dynamic `import()`.
//
// Deliberately a SEPARATE file from applyAnimationTimeline.test.ts: that file imports the REAL
// `gsap` package (for its `vi.spyOn(gsap, 'timeline')` assertions) and needs the module actually
// resolved at real-import time; this file needs the opposite — `gsap`/`gsap/ScrollTrigger`
// entirely faked via `vi.doMock` so their dynamic import can be made to reject on demand. Mixing
// the two styles in one file would mean the whole file's `gsap` resolution is governed by
// whichever mock wins, so they're kept apart.
//
// `vi.resetModules()` + a fresh dynamic `import('@modules/cms/node/applyAnimationTimeline')` per
// test is required so each test gets its OWN fresh `gsapPromise` module-level variable — reusing
// the module across tests would leak retry state between them.
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('loadGsap — retry after a rejected dynamic import', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('a rejected import is not cached forever: the NEXT call retries the dynamic import and can succeed', async () => {
        let shouldFail = true;
        const registerPlugin = vi.fn();

        // Real gsap's shape is `{ gsap: {...} }` / `{ ScrollTrigger: {...} }` — mirrored here so
        // loadGsap()'s own `gsapMod.gsap` / `stMod.ScrollTrigger` destructuring works unchanged.
        vi.doMock('gsap', () => {
            if (shouldFail) throw new Error('stale chunk reference (simulated failed dynamic import)');
            return { gsap: { registerPlugin } };
        });
        vi.doMock('gsap/ScrollTrigger', () => {
            if (shouldFail) throw new Error('stale chunk reference (simulated failed dynamic import)');
            return { ScrollTrigger: {} };
        });

        const { loadGsap } = await import('@modules/cms/node/applyAnimationTimeline');

        // First call: the dynamic import fails — must reject (unchanged behavior for the
        // CURRENT call, existing callers already handle a single rejection how they handle it).
        await expect(loadGsap()).rejects.toThrow();

        // If the rejected promise were still cached (the bug), this second call would return
        // that SAME dead promise and reject again WITHOUT ever re-invoking the dynamic import —
        // the flag flip below would have no effect and this assertion would fail.
        shouldFail = false;
        const gsap = await loadGsap();
        expect(gsap.registerPlugin).toBe(registerPlugin);
    });

    it('a successful import IS cached: a second call does not repeat the dynamic import work (memoization still holds on the happy path)', async () => {
        let importCount = 0;
        vi.doMock('gsap', () => {
            importCount++;
            return { gsap: { registerPlugin: vi.fn() } };
        });
        vi.doMock('gsap/ScrollTrigger', () => ({ ScrollTrigger: {} }));

        const { loadGsap } = await import('@modules/cms/node/applyAnimationTimeline');

        const first = await loadGsap();
        const second = await loadGsap();

        expect(first).toBe(second);
        expect(importCount).toBe(1);
    });
});
