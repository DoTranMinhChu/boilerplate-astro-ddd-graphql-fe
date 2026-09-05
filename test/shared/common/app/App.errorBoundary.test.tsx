// test/shared/common/app/App.errorBoundary.test.tsx
// @vitest-environment jsdom
//
// Final whole-branch review Important I2: Task 11 (Group 3, item 3.8) converted all 54 route
// imports in AppRoutes.tsx to lazy() — SolidJS's `lazy()` re-throws a failed dynamic import
// during render. Before this fix, App.tsx wrapped `<AppRoutes/>` in `<Suspense>` only, with no
// `<ErrorBoundary>` above it — meaning one failed route chunk (e.g. a stale chunk URL after a
// rolling deploy) would crash the ENTIRE admin SPA with no recovery UI, for the whole lifetime of
// that session.
//
// A full render-time dynamic-import-FAILURE test (making one of the 54 real `lazy()` factories
// actually reject and asserting App.tsx recovers) was judged impractical to simulate cleanly:
// `lazy()`'s rejection surfaces through solid-js's own internal resource/Suspense machinery,
// several layers removed from anything a test can directly control, and every existing lazy-route
// test in this codebase (AppRoutes.smoke.test.tsx, App.entrypoint.circularImport.test.ts) only
// ever exercises the SUCCESS path for exactly that reason. Instead, this test targets the actual
// mechanism ErrorBoundary/Suspense composition relies on: SolidJS makes no distinction between "a
// lazy() factory's promise rejected" and "a component threw synchronously during render" — both
// are plain thrown values that propagate up past Suspense (which only pauses for a pending
// promise, it does not catch errors) to the nearest ErrorBoundary ancestor. So replacing the real
// `<AppRoutes/>` with a component that throws synchronously during render is a faithful
// substitute for "this specific route chunk's lazy() factory rejected" — same catch path, same
// fallback, without needing to fake webpack/Vite chunk-loading internals.
//
// `./AppRoutes` is mocked via the `@/shared/common/app/AppRoutes` alias (resolves to the SAME
// file App.tsx's own relative `'./AppRoutes'` import resolves to — vi.mock matches by resolved
// module id, not literal specifier text, the same technique AppRoutes.smoke.test.tsx already
// uses for RoutesProvider) so this test never touches the real 54-route tree or its own heavy
// dependencies (RoutesProvider pulls in Auth/Brand/SystemConfig providers that issue real GraphQL
// calls on mount — explicitly out of scope here, same as that file's own note).
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, waitFor, screen, cleanup } from '@solidjs/testing-library';

vi.mock('@/shared/common/app/AppRoutes', () => ({
  AppRoutes: () => {
    throw new Error('simulated failed route chunk load');
  },
}));

// `ModalProvider` (rendered unconditionally by App.tsx, sibling to `<AppRoutes/>`) calls
// `Dom.getRoot('modals')` eagerly at component-body-evaluation time (not inside onMount) — it
// portals into a `#root`/`#app` element that must already exist in the document, or it throws
// its own unrelated "Root not found!" error before this test's real assertion ever runs.
beforeEach(() => {
  const root = document.createElement('div');
  root.id = 'root';
  document.body.appendChild(root);
});
afterEach(() => {
  cleanup();
  document.getElementById('root')?.remove();
});

describe('App (route-level ErrorBoundary — final whole-branch review Important I2)', () => {
  it('catches a thrown error from the route tree and renders the reload fallback instead of crashing the whole app', async () => {
    const { App } = await import('@/shared/common/app/App');

    render(() => <App />);

    // App.tsx gates its real content behind an `isClientReady()` signal flipped by a
    // `setTimeout` inside `onMount` — wait past that before the route tree (and thus the
    // simulated failure) ever mounts.
    await waitFor(() => expect(screen.getByText('Đã xảy ra lỗi khi tải trang.')).toBeTruthy(), { timeout: 5000 });

    // The fallback's whole point is recovery: a real page reload re-fetches the current chunk
    // manifest, which is the actual fix for the stale-chunk case this guards against.
    const reloadButton = screen.getByText('Tải lại trang');
    expect(reloadButton.tagName).toBe('BUTTON');
  }, 10000);
});
