// @vitest-environment jsdom
//
// Deviation from the brief's verbatim test file text: jsdom's `window` doesn't
// implement `matchMedia` (a well-known jsdom gap, already hit and fixed the same way
// in nodeRegistry.test.ts / applyAnimationTimeline.test.ts) — AppRoutes.tsx transitively
// imports the CMS Node Builder pages, which import applyAnimationTimeline.ts, which calls
// `gsap.registerPlugin(ScrollTrigger)` at MODULE-EVALUATION time, and ScrollTrigger's
// registration calls `matchMedia` synchronously. A plain top-level stub placed before a
// static `import` wouldn't help: static ESM imports are hoisted above a file's own code, so
// AppRoutes.tsx would already be evaluating before any stub assignment placed after a static
// `import` runs. Fixed the same way those files were: stub `window.matchMedia` first, then
// pull in AppRoutes.tsx via a dynamic `import()` inside `beforeAll` — dynamic imports resolve
// at the point they're awaited, not hoisted, so ordering is guaranteed correct.
import { describe, it, expect, beforeAll } from 'vitest';
import type { APP_ROUTES as AppRoutesType } from './AppRoutes';

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

let APP_ROUTES: typeof AppRoutesType;

beforeAll(async () => {
    // AppRoutes.tsx transitively imports essentially every page module in the app
    // (Admin/Tenant/Merchant/Agency/CMS admin incl. the Node Builder) — the default
    // 10s hook timeout isn't enough for vite-node to transform that whole tree on a
    // cold run, so it's raised here rather than globally.
    ({ APP_ROUTES } = await import('./AppRoutes'));
}, 60000);

describe('APP_ROUTES — agency/tenant forgot-password routes', () => {
    it('agencyAuth has its own forgotPassword route (was missing entirely)', () => {
        expect(APP_ROUTES.agencyAuth.routes).toHaveProperty('forgotPassword');
    });

    it('tenantAuth has its own forgotPassword route (was missing entirely)', () => {
        expect(APP_ROUTES.tenantAuth.routes).toHaveProperty('forgotPassword');
    });
});
