# ddd-graphql-fe

A generic **Astro + SolidJS** frontend source base, using **urql** + **typed-graphql-builder**
for a fully typed GraphQL client, styled with **Tailwind CSS 4**.

This repo is the frontend half of a pair: it's built to consume the GraphQL API exposed by the
sibling backend, **`ddd-graphql-be`**, which models a multi-tenancy domain of
`Agency → Tenant → TenantAccount`, `Admin`, `Merchant` (a single SSO identity shared across
Agency/Tenant/Admin logins), `Customer`, plus generic supporting modules: `permission`,
`accountPermission`, `media`, `mediaSet`, `codeConfig`, `globalSequence`, `unit`, `emailConfig`.

It was extracted from a production frontend (`agribase-fe`) by stripping every
domain-specific module (cultivation logs, national traceability, IoT, lots, warehouses,
process chains, farmer portal, etc.) and keeping only the reusable platform: the API client,
auth/SSO flow, layout chrome, and the small set of modules named above.

## Layout / role convention

Four portals share one Astro app, distinguished by URL prefix and a SolidJS-router route table
(`src/shared/common/app/AppRoutes.tsx`):

- `/admin/*` → `src/layouts/admin` — platform operators (manage Admins, Agencies, Tenants, Merchants, system/email config, brands).
- `/agency/*` → `src/layouts/agency` — Agency staff, oversight over the Tenants they manage.
- `/tenant/*` → `src/layouts/tenant` — Tenant staff, day-to-day org admin (staff, roles, activity log, unit, codeConfig).
- `/merchant/*` → `src/layouts/merchant` — the shared Merchant identity's own portal (memberships, invitations).

All four wrap `src/layouts/dashboard` for the shared sidebar/header/breadcrumb chrome, and every
Astro page (`src/pages/**/[...pages].astro`) is a thin catch-all that mounts the single SolidJS
SPA (`src/shared/common/app/App.tsx`) — actual routing happens client-side via `AppRoutes.tsx`.
`src/layouts/GlobalLayout.astro` + `src/layouts/ConfigInjector.astro` provide the outer HTML
shell, SEO tags, and inject public runtime config into the page for the SPA to read.

`src/pages/index.astro` is a minimal public homepage placeholder (the original repo's
marketing "landing" module was domain-specific and was not carried over) — replace
`src/shared/common/app/HomePage.tsx` with real content for your product.

## Merchant SSO flow

Merchant is a single, identity-only login shared across Agency/Tenant/Admin org types:

1. **Login** at `/merchant/login` (or register/registerByInvite) — this only authenticates the
   Merchant identity, no organization context yet.
2. **Select workspace** at `/merchant/selectContext` (`MerchantSelectContextPage`) — lists every
   Agency and Tenant this Merchant is assigned to (`MerchantService.getMyAssignments`).
3. **Context-switch** — picking an org calls `AuthContext.switchContext(orgType, code)`
   (`src/shared/contexts/auth/AuthProvider.tsx`), which asks the backend for a token scoped to
   that org, then opens a new browser tab at `/agency/login?token=...` or `/tenant/login?token=...`.

`switchContext(orgType: 'AGENCY' | 'TENANT', code: string)` is a **single generic entry point** —
both call sites (`merchantSelectContext.page.tsx` and `merchantMembershipsPage.tsx`) use it, and
its backing GraphQL-call + redirect-path table lives in
`src/shared/services/merchant/merchantSwitchConfig.ts` (`MERCHANT_SWITCH_CONFIG`). Adding a new
org type later — e.g. a future Customer workspace — means adding one entry to that config object,
not writing a new hardcoded `merchantSwitchToX` method and rewiring every call site. The
per-org-type label/icon/color mapping shown in the select-context UI is likewise extracted into
config objects (`ORG_TYPE_CONFIG`, `TENANT_SOURCE_CONFIG`) near the top of
`merchantSelectContext.page.tsx`, rather than inline conditional JSX.

## Codegen pipeline

This project generates its GraphQL client code from a **live** backend schema via introspection
— there is no schema file checked into source control that codegen reads offline. The checked-in
`src/shared/generated/*` files are themselves generated output, not hand-maintained.

- `npm run gengraph` — runs `scripts/generate-graph.mjs`: introspects the GraphQL endpoint at
  `BACKEND_URL` (read from `.env`) and regenerates `src/shared/generated/schema.graphql` (the
  introspected SDL) and `src/shared/generated/typed-graphql.ts` (a typed-graphql-builder
  client), then applies a small post-generation patch (the `fn("name", selectFn)` overload,
  `@ts-nocheck`, and the `Mixed`/`JSON`/`JSONObject`/`Any` → `any` scalar overrides).
- `npm run genservicegraph` — runs `scripts/generate-service.mjs`, a related codegen step for
  service-layer scaffolding.
- `npm run gen:service` — `plop --plopfile=src/core/templates/service/service.plop.js`, an
  interactive generator that scaffolds a new `src/shared/services/<name>` CRUD service module.

There is no `codegen`/`graphql-codegen` script anymore — it was removed (it never had a config
file to run against, so it silently did nothing). The pipeline above has no dependency on
`@graphql-codegen/*` at all; it only uses the plain `graphql` package
(`buildClientSchema`/`getIntrospectionQuery`/`printSchema`) plus `typed-graphql-builder`.

**Important:** `npm run gengraph` / `npm run genservicegraph` need a running GraphQL server at
the URL configured via `BACKEND_URL`. After cloning this repo:

1. Clone and run the paired `ddd-graphql-be` backend locally.
2. Point this frontend's env at it (`.env`, see below).
3. Run `npm run gengraph` (and `npm run genservicegraph` if you're scaffolding new
   service-backed CRUD modules) to regenerate `src/shared/generated/*` against the real schema.

### Current state of `src/shared/generated/` — full CMS schema, generated from a real backend

The checked-in `schema.graphql` (~2,000 lines) and `typed-graphql.ts` (~10,000 lines) are a
genuine introspection snapshot of `ddd-graphql-be`'s current GraphQL schema — not a hand-authored
seed. The schema now covers the full CMS/platform surface built out across this project's
history, at a high level (read `src/shared/generated/schema.graphql` directly for the
authoritative current contract — this is not an exhaustive field list):

- Core multi-tenancy: `Agency`, `Tenant`, `TenantAccount`, `Admin`, `AgencyAccount`, `Merchant`,
  `Customer`.
- Page/site building: `Page`, `Node` (the CMS node-tree page builder), `HeaderPreset`/
  `FooterPreset`, `Redirect`, `Seo`, sitemap URLs, page versioning/translation, `Menu`/
  `MenuItem`.
- Content modeling: `ContentType`, `ContentEntry` (with field filters and related/backlink/
  mixed-feed queries), `ComponentDefinition`, `ArtDirectionKit`.
- Forms: `Form`, `FieldDefinition`, `FormSubmission`.
- Permissions: account permission scopes/summaries (`SetPermissionsInput` and friends).
- Supporting/platform modules: `Media`/`MediaSet`, `Taxonomy`/`Term`, `CodeConfig`,
  `EmailConfig`, `Unit`, `Theme`, `SiteLocaleSettings`.
- Pagination: a consistent cursor-based `Paginated<X>`/`<X>Edge`/`PageInfo` pattern applied
  across nearly every list query.

**As soon as the real backend schema changes**, re-run `npm run gengraph` against a running
`ddd-graphql-be` and commit the result — never hand-edit the generated files.

### CI drift detection

`.github/workflows/ci.yml` has a `graphql-codegen-drift` job (running in parallel with
`build-and-test`) that automates this staleness check instead of relying on someone remembering
to run `npm run gengraph` by hand: it spins up a throwaway Postgres plus a real `ddd-graphql-be`
build, regenerates the codegen against it, and fails the build if the checked-in
`src/shared/generated/*` files have drifted from the live backend schema. The comparison is
order-insensitive (normalized SDL, not a byte-for-byte `git diff`), because the backend's
introspected field/type order isn't stable across environments (see the job's own comment block
for why); a separate step also checks `typed-graphql.ts` for drift against the committed schema,
catching a `typed-graphql-builder` version bump or generator-logic edit that schema drift alone
wouldn't. This is a genuinely enforced CI gate now, not just a manual step a developer might
forget to run.

## SEO

- `public/robots.txt` disallows the authenticated portals (`/admin`, `/agency`, `/tenant`,
  `/merchant`) and points at the sitemap.
- `astro.config.mjs` configures `@astrojs/sitemap` with a `filter` that excludes any URL
  containing `/admin/`, `/agency/`, `/tenant/`, or `/merchant/`, so those portals never end up
  in `sitemap-index.xml` even if a page there is technically reachable.
- `astro.config.mjs` sets `site` from a `SITE_URL` env var (falls back to the placeholder
  `https://example.com`) — this feeds both the sitemap and canonical URL resolution.
- `src/core/components/astro/AstroSEO.astro` always emits a `<link rel="canonical">` tag: it
  uses an explicit `canonical`/`url` prop if given, otherwise falls back to the current request
  URL resolved against the configured `site`.
- `src/core/components/astro/AstroJsonLd.astro` is a small, generic JSON-LD helper — pass it any
  schema.org-shaped object and it renders a `<script type="application/ld+json">` tag. Used on
  `src/pages/index.astro` with a basic `Organization`/`WebSite` example (reads name/url from
  `APP_NAME` / `SITE_URL`).
- `src/pages/index.astro` passes an explicit `seo` prop (title, description, OG image, url) to
  `GlobalLayout` instead of relying only on its defaults.

## Setup

```bash
cp .env.example .env
# edit .env — at minimum BACKEND_URL to point at your ddd-graphql-be instance
npm install
npm run dev
```

Key env vars (see `.env.example`):

- `APP_NAME`, `PUBLIC_APP_CODE` — app identity used in SEO defaults and asset selection.
- `BACKEND_URL` — the GraphQL/REST backend base URL.
- `SITE_URL` — public origin for canonical URLs / sitemap (`astro.config.mjs`).
- `SEO_PUBLIC_PATH` — path under `public/` for favicon/social assets (see `public/seo/example`).
- `DEPLOY_TARGET` — `node` | `vercel` | `static`, selects the Astro adapter.

## Testing

`vitest` is set up with a minimal config (`vitest.config.ts`, matching the app's `@/`, `@core/`,
`@shared/` path aliases). Run tests with:

```bash
npm test
```

Current tests cover the generic, framework-agnostic logic that's cheapest to regress-test:

- `src/core/helpers/string.test.ts` — `normalizeString`, `checkEmailValid`, `checkCodeValid`.
- `src/shared/services/merchant/merchantSwitchConfig.test.ts` — the `MERCHANT_SWITCH_CONFIG`
  registry backing the Merchant SSO `switchContext` flow described above.

This is meant to establish the pattern, not be exhaustive — extend it as you add real domain
modules on top of this source base.

## CI

`.github/workflows/ci.yml` runs on push/PR: checkout, Node 20 + npm cache, `npm ci`,
`npm run build` (`astro check && astro build`), `npm test` (vitest).

## What was kept vs. removed

**Kept:** `src/core` (API client, urql/typed-graphql-builder setup, the `gen:service` scaffold
template, generic UI components/hooks/templates), layouts for admin/agency/tenant/merchant/dashboard/auth +
`GlobalLayout`/`ConfigInjector`, modules `admin`/`agency`/`tenant`/`merchant`/`auth`/`unit`/
`codeConfig` (pruned to their generic auth/account/staff/settings pages — domain subpages like
production, traceability, sync-config were removed), `src/shared` pruned to auth/permission/
brand/systemConfig/routes contexts, generic UI components, and the services listed above
(`accountPermission`, `activityLog`, `admin`, `agency`, `agencyAccount`, `brand`, `codeConfig`,
`customer`, `emailConfig`, `grantableResource`, `media`, `mediaSet`, `merchant`,
`merchantInvitation`, `systemConfig`, `tenant`, `tenantAccount`, `tenantStaffSetting`, `unit`).

**Removed:** every domain-specific module (agriProduct, assessment, cultivationLog(s),
dashboardFinancial/Warehouse, documenTemplate, factory, farm, farmer\*, iot, landing, logistics,
lot\*, nationalTraceability, pestCatalog, process\*, product, production\*, purchaseOrder,
qrCardTemplate, salesOrder, sampling, supplier, tenantPartnership, tenantStats, warehouse,
zaloMiniApp, zaloOA, deployment/control-plane infra) and their pages, layouts (`farmer`), route
entries, sidebar entries, and now-unused npm dependencies (`leaflet-draw`-adjacent QR/scan libs
`@zxing/browser`/`@zxing/library`, `docx-preview`, `marked`, `interactjs`). `leaflet`/
`leaflet-draw`/`ckeditor5`/`material-color-hash`/`qrcode` were kept because generic `src/core`
components (`InputGPS`, `InputPolygon`, `Editor`, `Avatar`, QR helpers) still use them.
