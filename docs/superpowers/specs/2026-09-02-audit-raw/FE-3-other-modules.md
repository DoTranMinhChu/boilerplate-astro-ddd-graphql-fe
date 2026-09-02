# FE Audit 3 — Business Modules (admin/agency/auth/codeConfig/customer/merchant/tenant/theme/unit) + Layouts + Pages

Repo: `D:\OTHER\node-source-base\ddd-graphql-fe` (read-only audit, no files edited)

## Summary

- **Core CRUD reuse is genuinely strong**: 14+ list/CRUD screens across admin, agency, merchant, tenant, unit all build on the same `generateDatatable` factory (`src/core/components/table/GeneratedDatatable.tsx`, backed by ~24 files under `src/core/components/table/**`). This is the opposite of the "N one-off tables" hypothesis — it's a rare case where the shared abstraction actually won.
- **Auth screens are the real duplication hotspot**: Login, Forgot-Password and Reset-Password are hand-copied per module (admin/agency/merchant/tenant, 4×) instead of reusing the pattern the codebase already proved out for Change-Password (`shared/components/password/ChangePasswordForm.tsx`, parametrized by `onSubmit`).
- **Concrete functional bug from that copy-paste**: both Agency's and Tenant's login pages wire "Forgot password" to `navigateToPage('merchantAuth.forgotPassword')` — a route that belongs to a different role entirely, and neither `agencyAuth` nor `tenantAuth` even has a `forgotPassword` route defined in `AppRoutes.tsx`.
- **226 lines of dead duplicate code**: `ResetPasswordAdminPage` and `ResetPasswordMerchantPage` are fully-built, never-routed duplicates of the live, already-generic `ResetPasswordPage` (`src/modules/auth/resetPassword.page.tsx`) that handles both admin and merchant via a `type` query param.
- **Layout shells duplicated 4×**: `AdminLayout`/`AgencyLayout`/`MerchantLayout`/`TenantLayout` each hand-roll the same auth-guard + `DashboardContext.Provider` + sidebar/header/main shell (~55-90 lines, ~85% identical), differing only in account type, sidebar menu constant, background color hex, and which extra context providers wrap it. The actual sidebar/header/breadcrumb components underneath are already properly shared (`src/layouts/dashboard/components/**`).
- **Detail-page shell duplicated**: `agencyDetail.page.tsx` and `tenantDetail.page.tsx` re-implement the same "back button + title + Tabs + info Card + account-list section" scaffold independently.
- **One genuine one-off list**: `tenant/pages/organization/activityLog.page.tsx` hand-rolls cursor pagination (`fetchPage`/`hasNext`/`cursor` signals) with raw `<select>` elements instead of the shared Datatable/pagination components used everywhere else.
- **No route-level code-splitting**: `AppRoutes.tsx` eagerly imports all ~58 page modules (including the very heavy CMS Node Builder editor, out of this audit's scope but pulled in transitively) into one bundle, mounted identically via `<App client:only="solid-js" />` on all 4 of `/admin`, `/agency`, `/merchant`, `/tenant`. An Agency user's browser downloads Admin's and Tenant's and the CMS editor's page code too — zero `lazy()` usage anywhere in the routing layer.
- Positive counter-example worth preserving as the template going forward: `ChangePasswordForm` (shared, parametrized by `onSubmit`) proves the team already knows how to deduplicate this exact shape of page — it just wasn't applied to Login/ForgotPassword/ResetPassword.

## Findings

### 1. Login pages duplicated 4× instead of one parametrized shared form (Critical)

**Files:**
- `src/modules/admin/pages/loginAdmin.page.tsx` (108 lines)
- `src/modules/agency/pages/login.page.tsx` (140 lines)
- `src/modules/merchant/auth/loginMerchant.page.tsx` (127 lines)
- `src/modules/tenant/pages/auth/login.page.tsx` (152 lines)

**Category:** duplication-reuse
**Severity:** Critical (caused a real routing bug — see Finding 2)
**Problem:** All four pages independently wire up `AuthLayout` + `generateForm` + `Input`/`InputPassword`/`Button`, with near-identical JSX structure (header block, `Form.Fieldset`, forgot-password link, `Form.Error`, submit button, footer). Agency's and Tenant's versions (lines 1-152) are close to a straight copy of each other, differing only in service call and a couple of extra fields (`code`). None of this was extracted into a shared `LoginForm` the way `ChangePasswordForm` was (compare `src/shared/components/password/ChangePasswordForm.tsx`, reused as a one-line wrapper by all 4 change-password pages, e.g. `src/modules/admin/pages/changePasswordAdmin.page.tsx:1-12`).
**Impact:** 4× the surface area for the same bug class; any UX fix (e.g. accessibility, rate-limit messaging, loading state) has to be applied 4 times and reliably drifts — as already happened (Finding 2). New role portals will keep re-copying this instead of composing a shared primitive.
**Suggested direction:** Extract a `LoginForm` component parametrized by `{ fields, onSubmit, forgotPasswordRoute, footerLabel }`, mirroring the `ChangePasswordForm` pattern already proven in this codebase.

### 2. Agency and Tenant "Forgot password" links point to the wrong (Merchant) portal — copy-paste bug, and the target routes don't even exist for those roles (Critical)

**Files:**
- `src/modules/agency/pages/login.page.tsx:112` — `onClick={() => navigateToPage('merchantAuth.forgotPassword')}`
- `src/modules/tenant/pages/auth/login.page.tsx:111` — `onClick={() => navigateToPage('merchantAuth.forgotPassword')}`
- Route table: `src/shared/common/app/AppRoutes.tsx:165-171` (`agencyAuth` routes = `{ login }` only, no `forgotPassword`) and `:116-123` (`tenantAuth` routes = `{ login, register }` only, no `forgotPassword`)

**Category:** duplication-reuse / organization (bug caused directly by copy-pasting the login page across modules without updating the route id)
**Severity:** Critical
**Problem:** An Agency or Tenant user who clicks "Forgot password" is sent to `merchantAuth.forgotPassword` (`ForgotPasswordMerchantPage`, `src/modules/merchant/auth/forgotPasswordMerchant.page.tsx`), which submits via `MerchantService.merchantForgotPassword`. An agency/tenant login (username+code) will never match a Merchant account, so the flow will silently look like it worked (the page always shows a generic "check your email" success state, see `forgotPasswordMerchant.page.tsx:39-54`) but no email is ever sent for that account. Neither `agencyAuth` nor `tenantAuth` has its own `forgotPassword` route registered at all — the correct fix isn't just changing the `navigateToPage` argument, a whole route+page pair is missing for both roles.
**Impact:** Real, live account-recovery dead-end for both Agency and Tenant users — a security/support-load issue, not just a cosmetic one.
**Suggested direction:** Add `agencyAuth.forgotPassword` and `tenantAuth.forgotPassword` routes (reusing `AgencyAccountService.agencyAccountForgotPassword`/`TenantAccountService`-equivalent if they exist, or building them from the same shared form suggested in Finding 1), and fix both `onClick` handlers to point at their own role's route.

### 3. `ResetPasswordAdminPage` and `ResetPasswordMerchantPage` are fully-built, never-routed dead code duplicating the live generic `ResetPasswordPage` (Important)

**Files:**
- `src/modules/admin/pages/resetPasswordAdmin.page.tsx` (113 lines, exports `ResetPasswordAdminPage`)
- `src/modules/merchant/auth/resetPasswordMerchant.page.tsx` (113 lines, exports `ResetPasswordMerchantPage`)
- Live route: `src/shared/common/app/AppRoutes.tsx:190` → `resetPassword: { path: '/reset-password', page: ResetPasswordPage }`, where `ResetPasswordPage` is `src/modules/auth/resetPassword.page.tsx` (155 lines) — already generic over `admin`/`merchant` via a `type` search param (lines 13, 20, 34-42, 50-63).

**Category:** duplication-reuse / organization
**Severity:** Important
**Problem:** `grep` across `src/` confirms `ResetPasswordAdminPage` and `ResetPasswordMerchantPage` are exported but never imported anywhere except their own file — not in `AppRoutes.tsx`, not from any other module. The team built the shared/generic version (`ResetPasswordPage`) and wired it up correctly, but left the two per-module originals in the tree, fully implemented and byte-for-byte structurally identical to each other (compare the two `Read`s above — same `Show`/`Show`/`Form` skeleton, same icon blocks, only i18n keys and service calls differ).
**Impact:** 226 lines of maintenance liability — a future edit is likely to land on one of the dead files (matching intuitive naming `resetPasswordAdmin.page.tsx`) and never take effect in production, wasting debugging time. Also inflates bundle size for no benefit since nothing tree-shakes an eagerly-imported-if-referenced page (though here it's not even imported, so it likely IS tree-shaken — but it's still dead source).
**Suggested direction:** Delete both dead files; if module-owned reset-password pages are ever desired for i18n/branding reasons, extend the existing generic `ResetPasswordPage`'s `type` union instead of hand-duplicating it a third time.

### 4. ForgotPassword and ResetPassword pages duplicated between Admin and Merchant, structurally identical (Important)

**Files:**
- `src/modules/admin/pages/forgotPasswordAdmin.page.tsx` (87 lines) vs `src/modules/merchant/auth/forgotPasswordMerchant.page.tsx` (87 lines)
- `src/modules/admin/pages/resetPasswordAdmin.page.tsx` (113 lines) vs `src/modules/merchant/auth/resetPasswordMerchant.page.tsx` (113 lines) — see also Finding 3 (the latter is additionally dead code)

**Category:** duplication-reuse
**Severity:** Important
**Problem:** Line-by-line near-identical: same layout blocks, same `Show`/success-state pattern, same icon choices (`heroicons-outline:envelope`, `heroicons-outline:lock-closed`, `heroicons-outline:check-circle`), differing only in the i18n key namespace (`admin.*` vs `merchant.*`) and the service method invoked (`AdminService.adminForgotPassword` vs `MerchantService.merchantForgotPassword`). This is exactly the shape `src/modules/auth/resetPassword.page.tsx` already generalized for reset (accepting a `type: 'admin' | 'merchant'` param) — the same generalization was never applied to forgot-password, and was applied to reset-password twice (once generically, once per-module as dead code).
**Impact:** Same drift risk as Finding 1; e.g. a future "add a resend-cooldown timer" feature will need to be implemented twice and will likely be implemented once and forgotten on the other.
**Suggested direction:** Generalize `ForgotPasswordAdminPage`/`ForgotPasswordMerchantPage` into one `type`-parametrized page (or a shared form component) the same way `ResetPasswordPage` already does; extend that same generic component's `type` union to cover Agency/Tenant too (see Finding 2) instead of adding two more per-module copies.

### 5. Four near-identical role layout shells instead of one parametrized layout (Important)

**Files:**
- `src/layouts/admin/AdminLayout.tsx:30-77` (`AdminLayoutInner`)
- `src/layouts/agency/AgencyLayout.tsx:28-74` (`AgencyLayoutInner`)
- `src/layouts/merchant/merchantLayout.tsx:16-63` (`MerchantLayout`)
- `src/layouts/tenant/TenantLayout.tsx:28-80` (`TenantLayoutInner`)

**Category:** organization / duplication-reuse
**Severity:** Important
**Problem:** All four implement the identical skeleton:
1. `useAccountByType(EAccountType.X)` + `createEffect` redirect-to-login-if-no-account guard.
2. `Show` fallback to a spinner while loading.
3. `DashboardContext.Provider` supplying `accountType`, `sidebarMenus`, `typeName`, `displayName`, `currentAuthAccount`.
4. The same `flex h-screen … <DashboardRootSidebar/> <DashboardMainSidebar/> <DashboardHeader/> <main>{children}</main>` shell, differing only in a hardcoded background hex (`#F6F8FA` / `#FDF8FF` / `#F5F0FF` / `#F0F7FF`) and one-off extras (Agency injects `<AgencyActingTenantBar/>`; Tenant additionally wraps `PermissionProvider`+`FeatureProvider`+`TenantRolesProvider` and calls 3 fetchers; Admin/Agency wrap only `PermissionProvider`).
The good news: the actual chrome underneath (`DashboardRootSidebar`, `DashboardMainSidebar`, `DashboardHeader`, `DashboardBreadcrumbs`, `DashboardAccount` — `src/layouts/dashboard/components/*.tsx`, 388 lines total) is already properly shared and driven off `DashboardContext`. It's only the outer wrapper that's copy-pasted 4×.
**Impact:** Every layout-level change (loading-state UX, error handling if account fetch fails, new provider needed for a 5th role) must be hand-applied in up to 4 files; already-visible drift exists (Tenant fetches permissions/features/roles proactively, Admin/Agency/Merchant don't — which may or may not be intentional per-role behavior, but it's indistinguishable from accidental omission given the copy-paste structure).
**Suggested direction:** One `RoleLayout` component taking `{ accountType, sidebarMenus, typeName, bgColor, extraProviders?, headerExtras? }`, with role-specific bits (Agency's acting-tenant bar, Tenant's extra fetchers) passed as render props/children rather than re-implementing the shell.

### 6. Agency/Tenant detail-page scaffold duplicated (Minor)

**Files:**
- `src/modules/agency/pages/agencyDetail.page.tsx` (73 lines)
- `src/modules/tenant/pages/tenantDetail.page.tsx` (88 lines)

**Category:** duplication-reuse
**Severity:** Minor
**Problem:** Both implement the same shape: `createResource` fetch by id from `searchParams`, `notifyResourceError`, a back-button + title header, a `Tabs` with an info-`Card` (2-4 label/value pairs) in the first tab, an embedded `*AccountSection` component, and a second "coming soon" placeholder tab. Structurally identical scaffolding, only the field labels and section component differ.
**Impact:** Low — only 2 instances, but a 3rd role's detail page (e.g. if Merchant ever gets one) would very likely be a 3rd copy given the pattern already repeats once.
**Suggested direction:** Extract a generic `EntityDetailShell` (back-button header + Tabs + info-grid Card) that both pages configure rather than re-render from scratch. Low priority relative to Findings 1-5.

### 7. `activityLog.page.tsx` hand-rolls cursor pagination instead of reusing the shared Datatable/pagination stack (Minor)

**File:** `src/modules/tenant/pages/organization/activityLog.page.tsx:29-72` (state: `items`/`loading`/`hasNext`/`cursor`; `fetchPage` function; raw `<select>` filter elements at lines 85-105; manual "Load more" button at lines 147-156)

**Category:** duplication-reuse
**Severity:** Minor
**Problem:** Every other list screen in these 9 modules (14 files, see Summary) uses `generateDatatable` for filtering, pagination, and rendering. This page instead manually manages a `createSignal` cursor/hasNext/items triple and issues raw `<select>`/`<option>` elements for its two filters (entity type, action), rather than `Datatable.Filter`/`Datatable.FilterField`/`Select` used everywhere else (e.g. `src/modules/admin/pages/manageAdmins.page.tsx:56-66`).
**Impact:** Minor UI inconsistency (native `<select>` vs the app's styled `Select` control) and a second, parallel pagination implementation to maintain. Functionally fine (it is a legitimate "timeline/load-more" UX rather than a table, so full Datatable reuse may not be a clean fit) — flagged as a smaller-severity organization note, not a bug.
**Suggested direction:** If a load-more timeline UX is intentionally different from the tabular Datatable, consider extracting just its cursor-pagination signal logic into a small shared `useCursorPagination` hook so future non-tabular lists (there will likely be more activity/log-style screens) don't reinvent it again; otherwise it's acceptable to leave as-is given the visual pattern (a vertical timeline, not a table) is genuinely different from the other 14 screens.

### 8. No route-level code-splitting — all 4 role portals ship one monolithic client bundle (Important)

**Files:**
- `src/shared/common/app/AppRoutes.tsx:1-58` — 58 eager `import { X } from '@/modules/...'` statements, zero `lazy()` calls (`grep -rn "lazy("` across `src/shared/common/app/*.tsx` and `src/shared/contexts/routes/*.tsx` returns nothing)
- `src/pages/admin/[...pages].astro`, `src/pages/agency/[...pages].astro`, `src/pages/merchant/[...pages].astro`, `src/pages/tenant/[...pages].astro` — all four are identical: `<GlobalLayout><App client:only="solid-js" /></GlobalLayout>`

**Category:** performance
**Severity:** Important
**Problem:** `App` renders `AppRoutes`, which statically imports every page component for every role (Admin's CRUD screens + Agency's + Merchant's + Tenant's + the entire CMS admin/Node Builder editor under `src/modules/cms/admin/**`, which alone is 100+ files) into a single JS graph. Because all four `[...pages].astro` entry points mount the exact same `<App client:only="solid-js">` island, a first-time visitor to `/agency/login` downloads the same bundle as a visitor to `/admin` — including Admin-only pages, Tenant-only pages, and the CMS Node Builder (GSAP-based drag/resize/property-panel editor), none of which an Agency user's routes ever render.
**Impact:** Inflated initial JS payload and parse/hydrate time on every role portal, most visibly on first paint of the lightweight public-facing role login pages (Agency/Tenant/Merchant login), which currently pull in the same bundle as the heaviest CMS admin screens.
**Suggested direction:** Wrap each role's route group (`adminDashboard`, `agencyDashboard`, `merchantDashboard`, `tenantDashboard`, and especially the `cms*` routes nested under `adminDashboard`) in `lazy(() => import(...))` per Solid Router's code-splitting support, so each role's Astro entry only pulls the modules it can actually navigate to. This is the single highest-leverage performance fix found in this audit's scope.

### 9. `merchant.i18n.ts`, per-module i18n namespacing is consistent (no finding — noted for completeness)

Not a defect: each module keeps its own `*.i18n.ts` (`admin.i18n.ts`, `agency.i18n.ts`, `merchant.i18n.ts`, `codeConfig.i18n.ts`, `unit.i18n.ts`, `tenant.auth-org.i18n.ts`, `tenant.staff.i18n.ts`) merged into shared dictionaries (`src/shared/i18n/dictionaries/{en,vi}.ts`). This is a reasonable, consistent pattern across all 9 modules and is called out only to record that the audit did check for i18n-layer duplication/inconsistency and found none worth flagging.

### 10. Pages layer composition is consistent across the 4 role areas (no finding — verified per task item 5)

`src/pages/{admin,agency,merchant,tenant}/[...pages].astro` are all structurally identical one-liners delegating entirely to the shared SPA (`App`/`AppRoutes`/`RoutesProvider`), with no per-page data-fetching happening in the Astro layer at all — all data-fetching lives in the module/service layer (`src/shared/services/**`), invoked from inside page components via `generateDatatable`/`createResource`. This is consistent across all 4 areas; the only routing-layer inconsistency found is the missing `forgotPassword` routes for `agencyAuth`/`tenantAuth` already covered in Finding 2. The `customer` module is architecturally different by design (documented in-file, `src/modules/customer/LoginForm.tsx:1-8`, as a standalone Astro island for public pages, intentionally outside the `client:only` SPA) — this is a deliberate, documented exception, not an inconsistency.
