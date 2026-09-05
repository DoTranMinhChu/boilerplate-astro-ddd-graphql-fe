// test/shared/common/app/AppRoutes.smoke.test.tsx
// @vitest-environment jsdom
//
// Task 11 (Group 3, item 3.8): route-level code-splitting smoke test.
//
// Proves the `lazy()` + `<Suspense>` wiring introduced in AppRoutes.tsx / App.tsx actually
// resolves end-to-end: navigating to a real admin route renders the real page component after
// its dynamic `import()` settles — not just that `astro check` accepts the types.
//
// Scoped to `/admin/login` (the `adminAuth` route group, `layout: None`) rather than an
// authenticated dashboard route: it needs only `RoutesContext` + `AuthContext` (both trivially
// faked below), sidestepping RoleLayout/AppContext/PermissionContext/dashboard-sidebar machinery
// that this task never touched and that is already covered by RoleLayout.test.tsx and each page's
// own test file. `RoutesProvider` (real) pulls in Auth/Brand/SystemConfig providers that issue
// real GraphQL calls on mount — out of scope here, so it's replaced with a trivial stand-in that
// supplies exactly the two contexts `LoginAdminPage` reads.
import { describe, it, expect, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { render, waitFor, screen, cleanup } from '@solidjs/testing-library';
import { Suspense } from 'solid-js';
import { RoutesContext } from '@shared/contexts/routes/RoutesContext';
import { AuthContext } from '@/shared/contexts/auth/AuthContext';

// LoginAdminPage's REAL `admin.service.ts` transitively evaluates the shared generated
// `typed-graphql.ts` (all entity fragments in one module) — a pre-existing circular dependency
// with `merchant.service.ts` unrelated to this task's lazy() conversion. Mocked out for exactly
// the same reason `test/modules/admin/pages/loginAdmin.page.test.tsx` already mocks it: this
// smoke test exists to prove `lazy()`/`<Suspense>` routing wiring, not the GraphQL service layer.
vi.mock('@/shared/services/admin/admin.service', () => ({
  AdminService: {
    loginAdmin: vi.fn(),
    adminForgotPassword: vi.fn(),
  },
}));

vi.mock('@/shared/contexts/routes/RoutesProvider', () => ({
  RoutesProvider: (props: { children: any }) => (
    <RoutesContext.Provider
      value={{
        pathname: '/admin/login',
        params: {},
        searchParams: {},
        setSearchParams: vi.fn(),
        navigate: vi.fn() as any,
        navigateToPage: vi.fn(),
      }}
    >
      <AuthContext.Provider
        value={{
          authAccount: () => null,
          getAccountByType: vi.fn().mockReturnValue(null),
          restoreAccount: vi.fn(),
          setAuthData: vi.fn(),
          refetchAuthAccount: vi.fn(),
          logout: vi.fn(),
          applyTokenForType: vi.fn(),
          accountType: () => null,
          isAdmin: () => false,
          isAgency: () => false,
          isTenant: () => false,
          isCustomer: () => false,
          isAnonymous: () => true,
          isMerchant: () => false,
          isMerchantInContext: () => false,
          merchantAssignments: () => null,
          setMerchantAuthData: vi.fn(),
          switchContext: vi.fn(),
          merchantBackToSelect: vi.fn(),
          switchActiveRole: vi.fn(),
          impersonateOpenTab: vi.fn(),
        }}
      >
        {props.children}
      </AuthContext.Provider>
    </RoutesContext.Provider>
  ),
}));

// jsdom doesn't implement IntersectionObserver/scrollIntoView — real primitives further down the
// real LoginForm/AuthLayout render tree use both (lazy image loading, FormMessage error scroll).
// Not under test here; same no-op stubs as test/modules/admin/pages/loginAdmin.page.test.tsx.
beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', vi.fn().mockImplementation(() => ({ observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() })));
  Element.prototype.scrollIntoView = vi.fn();
});
afterAll(() => {
  vi.unstubAllGlobals();
});
afterEach(() => {
  cleanup();
  window.history.pushState({}, '', '/');
});

describe('AppRoutes (route-level code-splitting smoke test)', () => {
  // Default 5000ms budget is comfortable in isolation (~4.4s) but this test does genuinely more
  // work than a typical unit test — a real dynamic import() of AppRoutes.tsx plus its full
  // LoginAdminPage/LoginForm/AuthLayout render chain — and can cross 5s under full-suite transform
  // contention (observed in practice). Explicit generous budget avoids that flakiness.
  it('resolves a lazy()-converted route through <Suspense> and renders the real page', async () => {
    window.history.pushState({}, '', '/admin/login');

    const { AppRoutes } = await import('@/shared/common/app/AppRoutes');

    render(() => (
      <Suspense fallback={<div data-testid="app-suspense-fallback" />}>
        <AppRoutes />
      </Suspense>
    ));

    // Literal, untranslated string passed directly as a prop by LoginAdminPage — a stable text
    // anchor regardless of i18n bundle content.
    await waitFor(() => expect(screen.getByText('Admin Portal')).toBeTruthy(), { timeout: 15000 });
  }, 20000);
});
