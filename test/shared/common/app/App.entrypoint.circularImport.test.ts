// @vitest-environment jsdom
//
// Regression guard for the AgencyAccountService/MerchantService circular-import class of bug (see
// `agencyAccount.service.ts`'s `buildAgencyAccountFragment` comment for the full history).
//
// `AppRoutes.smoke.test.tsx` imports `AppRoutes.tsx` directly, which only proves the cycle is safe
// for entry orders reachable from THAT file's own import list. It does NOT guard against a future
// eager, class-definition-time cross-service reference reached via something imported ABOVE
// `AppRoutes.tsx` in the real app — e.g. a future addition to `App.tsx` itself, or transitively via
// `AppProvider`/`MetaProvider`/`ModalProvider`/`ConfirmProvider`/`ToastProvider` — that happens to
// reach `merchant.service.ts` before `agencyAccount.service.ts`. That exact vector was proven to
// crash (pre-fix) despite `AppRoutes.smoke.test.tsx` passing, during the review of the task that
// introduced route-level code-splitting (Task 11, Group 3).
//
// This test therefore imports the REAL production entry point, `src/shared/common/app/App.tsx` —
// not `AppRoutes.tsx` — fresh, so its own real, top-to-bottom static import order (which reaches
// `AppProvider` and friends BEFORE `AppRoutes`) is exactly what gets exercised. `vi.resetModules()`
// forces a fresh module graph even if a future test-runner config change stops isolating module
// caches per file (Vitest's default `pool: 'threads'` already isolates per test file, but this
// makes the "fresh import" intent explicit and independent of that default).
//
// Deliberately does NOT render `<App/>` (no `render()` call): the crash this guards against
// happens at module-evaluation time — inside a `static` class field initializer, per the original
// stack trace's `Function.<static_initializer>` frame — not at component-render time. A bare
// `import()` already exercises every static class field across the whole transitive import graph,
// so it's sufficient (and much cheaper/less flaky) to assert on that alone rather than mounting the
// full app (real GraphQL-backed providers, `onMount` timers, etc. — all out of scope here and
// already covered elsewhere).
import { describe, it, expect, vi } from 'vitest';

describe('App.tsx entry point (circular-import regression guard)', () => {
  // Generous timeout: importing the real `App.tsx` fresh pulls in its full static import graph —
  // `AppProvider` and friends, plus `AppRoutes.tsx` and its ~54 `lazy()` factory definitions (the
  // factories themselves aren't awaited, but defining them still requires transforming this large
  // file) — genuinely more transform work than a typical unit test (observed ~5-6s standalone,
  // matching the same category of budget `AppRoutes.smoke.test.tsx` already needed for the same
  // reason).
  it('importing App.tsx fresh does not throw', async () => {
    vi.resetModules();
    await expect(import('@/shared/common/app/App')).resolves.toBeTruthy();
  }, 30000);
});
