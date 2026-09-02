## Summary

- **The `core/` vs `shared/` split is not accidental clutter — it is a blurred boilerplate boundary.** This repo is `node-source-base`: `core/` reads as the reusable "starter-kit" layer (generic UI kit, generic API/service base classes, generic helpers) that this specific product was bootstrapped from, and `shared/` is where the actual product's business/domain glue (auth, tenant, agency, CMS, permissions, i18n) was built on top. The problem is that this boundary has been violated in both directions, so today neither folder is what its name promises.
- **Critical — `core/` depends on `shared/` in 22 files, including its own GraphQL client (`src/core/api/graphql.ts`).** A "generic, framework-agnostic" layer that imports `@/shared/i18n/locale`, `@/shared/errors/errorActions`, `@/shared/contexts/auth/AuthContext`, `@/shared/contexts/agency/agencyActingTenant`, etc. is not generic — it cannot be lifted out or reused without dragging this app's entire business layer with it. This is the single biggest architectural finding.
- **Critical — `core/hooks` contains business-specific hooks, not primitives.** `useFeatureFetcher.ts`, `usePermissionFetcher.ts`, `useTenantRolesFetcher.ts`, `useAccountByType.ts` are tenant/permission/feature/auth domain logic wired straight to `shared/contexts` and `shared/services`. `useAccountByType.ts` even still carries the header comment `// src/shared/hooks/useAccountByType.ts`, i.e. direct evidence it was written for `shared/hooks` and ended up in `core/hooks` instead.
- **Critical — exact duplicate, and the "core" copy is dead.** `src/core/components/icons/Icon.tsx` is byte-identical to `src/shared/components/icons/Icon.tsx`; `iconVariants.ts` in `shared/` is core's file plus ~26 app icon entries (explicitly documented in core's own comment as "add custom app specific icon variant, can override default ones"). In practice **every consumer in the whole codebase, including files inside `core/` itself, imports the `shared/` copy** — the `core/components/icons/*` files have zero importers and are pure dead weight.
- **Important — `shared/config` (singular) vs `shared/configs` (plural) is an accidental typo-split, not a deliberate design.** `scopeFieldRegistry.ts` physically lives in `shared/configs/` but its own header comment says `// src/shared/config/scopeFieldRegistry.ts` (singular) — the file was written assuming the singular folder and a second, plural folder was created instead. Both folders hold the same *kind* of thing (one static config module + its test); there is no functional reason for two directories.
- **Important — `src/modules/cms` has no `services` folder at all; its entire data layer (16 folders) lives under `shared/services/`** — `contentEntry`, `contentType`, `page`, `pageVersion`, `node`, `taxonomy`, `term`, `menu`, `redirect`, `artDirectionKit`, `footerPreset`, `headerPreset`, `form`, `brand`, `media`, `mediaSet`, `siteLocaleSettings`. This is the biggest single module/business-domain (CMS/page-builder) in the app, and none of its services are discoverable under `modules/cms/`. 8 more `shared/services/*` folders (`accountPermission`, `activityLog`, `agencyAccount`, `component`, `emailConfig`, `grantableResource`, `systemConfig`, `tenantAccount`, `tenantStaffSetting`) also have no matching `modules/*` folder — only 8 of the 34 `shared/services/*` folders line up 1:1 with a `modules/*` name.
- **Minor/dead-code — several `core/` files are orphaned.** `core/helpers/hash.ts` (`hashHmacSHA256`), `core/helpers/secret.ts` (`maskSecret`), `core/components/map/InputGPS.tsx`, `core/components/map/InputPolygon.tsx` and (per above) `core/components/icons/Icon.tsx` + `iconVariants.ts` have zero importers anywhere in `src/`. `shared/hooks/useOrgRouteBase.ts` (both the hook and its non-hook sibling `orgRouteBase()`) is also unused anywhere.
- **Minor — genuine, non-duplicative layering exists too and should be preserved as the model to generalize.** `core/services/base.service.ts` (generic urql query/mutation executor) → `shared/services/crud.service.ts` (extends it with this app's generated GraphQL fragments) is a clean base→extension pattern. Same for `core/components/config/BaseTextConfig.tsx` → `shared/common/config/TextConfig.tsx` (spreads the base, ready for app overrides — currently empty, but the mechanism is sound). These are NOT duplication; they are the "core = base template, shared = product's extension" pattern working as intended, and it's what makes the *other* findings look like drift rather than the plan.
- **Overall recommendation: don't collapse everything into `core/`.** A blanket merge would re-break the one pattern that already works (base/override) and would pull business/domain code into what should stay a generic, potentially-reusable layer. Instead: (1) enforce a strict one-way dependency rule, `core/` must never import from `shared/` or `modules/` — move the 22 offending core files/hooks out to `shared/` or the relevant `modules/<name>/services`; (2) delete the dead `core/components/icons/*` duplicate and point everything at one physical `Icon`/`iconVariants` location (keep the base/override split, just don't ship two copies of the base); (3) merge `shared/configs` into `shared/config` (rename, fix the stale header comment); (4) give CMS-domain services a home under `modules/cms/services/*` (or formally document that `shared/services/*` **is** the per-domain service layer and rename `modules/*` folders that only hold UI pages to something like `modules/*/pages`, so the two trees stop implying two different organizing principles); (5) sweep and delete the confirmed-dead files.

## Findings

### 1. Pair-by-pair inventory

#### `core/helpers` vs `shared/helpers`

`core/helpers` (19 files) — generic, framework-agnostic utilities:
| File | Purpose |
|---|---|
| `api.ts` | `apiRequestWithToast` wrapper + `getBackendUrl`/`api` object — generic REST/toast plumbing |
| `class.ts` | `mergeClass`/`joinClass`/`getCol` — CSS class-name helpers |
| `color.ts` | RGB/hex parsing, background/text color derivation |
| `config.client.ts` / `config.server.ts` | generic env-var accessors (client `window.config`/`import.meta.env`, server `process.env`) |
| `date.ts` | date-fns locale setup, `normalizeDate`, datetime formatting |
| `device.ts` | `checkMobile`/`checkMobileOrTablet` UA sniffing |
| `dom.ts` | `Dom` class — DOM query/measurement helpers |
| `hash.ts` | `hashHmacSHA256` — **dead, 0 importers** |
| `image.ts` | image upload constants (max size/quality/dimensions/accept) |
| `jwt.ts` | `decodeJwt`/`isTokenExpired` — generic JWT decode, no app knowledge |
| `number.ts` | `formatNumber`/`formatCurrency`/`parseStringToNumber`/`formatFileSize` |
| `qr.ts` | `generateQrDataUrl` |
| `ref.ts` | `mergeRef` — Solid ref-merging primitive |
| `resourceError.ts` | `notifyResourceError` for Solid `Resource` |
| `screen.ts` | `createScreen`/`createOnScreen` — viewport/visibility primitives |
| `secret.ts` | `maskSecret` — **dead, 0 importers** |
| `string.ts` (+ test) | length constants, string helpers |
| `util.ts` | `generateId`, `generatePassword`, `Util` class |

`shared/helpers` (3 files) — app-specific business glue:
| File | Purpose |
|---|---|
| `assets.ts` | app-branding asset loader (`APP_CODE`-based logo/bg switching), imports `core/helpers/config.*` |
| `scopeRule.helpers.ts` | permission "scope rule" type + `stripScopeRuleTypename` — tied to this app's permission/scope domain model |
| `token.helper.ts` | `TokenManager` — multi-account-type (admin/agency/tenant/merchant/customer) auth token storage across tabs, cookie sync for SSR |

**Overlap**: none genuine — `shared/helpers` is 100% app/business-specific and consumes `core/helpers` rather than duplicating it.
**Genuine difference**: confirmed — the two folders are doing different *kinds* of work (generic utility vs. domain glue), this pairing is healthy.

#### `core/hooks` vs `shared/hooks`

`core/hooks` (7 files):
| File | Purpose | Generic or business-specific? |
|---|---|---|
| `createDebounced.ts` | generic debounce primitive | Generic |
| `useBreakpoint.ts` (+test) | generic responsive breakpoint primitive, explicitly documented as depending on nothing else | Generic |
| `useAccountByType.ts` | fetch/restore an auth account of a given `EAccountType`, via `shared/contexts/auth/AuthContext` | **Business-specific** (misplaced — own comment says it belongs in `shared/hooks`) |
| `useFeatureFetcher.ts` | fetch tenant's `subscribedFeatures` via `shared/services/tenant` and `shared/contexts/feature` | **Business-specific** (misplaced) |
| `usePermissionFetcher.ts` | fetch account permissions via `shared/services/accountPermission` | **Business-specific** (misplaced) |
| `useTenantRolesFetcher.ts` | tenant business-role fetch stub | **Business-specific** (misplaced) |

`shared/hooks` (2 files):
| File | Purpose |
|---|---|
| `useIsAgencyView.ts` | reactive "is this the agency UI?" check off `DashboardContext` — used by `core/components/table/*` (see Finding 5.2) |
| `useOrgRouteBase.ts` | agency-vs-tenant route-prefix resolver — **dead, 0 importers anywhere** |

**Overlap**: none in content, but **misclassification**: 4 of 7 `core/hooks` files are the same *kind* of thing as `shared/hooks` (app business-domain data fetchers), just filed on the wrong side.

#### `core/config` vs `shared/config` vs `shared/configs`

`core/config`: `.oxlintrc.json` (lint config), `scalars.txt` (GraphQL codegen scalar list) — tooling config, not app code.
`shared/config`: `tenantBusinessRole.meta.ts` (+test) — metadata table for the Tenant "business role" domain feature.
`shared/configs`: `scopeFieldRegistry.ts` (+test) — registry mapping permission-scope field names to grantable-resource queries.

**Overlap**: `shared/config` and `shared/configs` hold the same *kind* of artifact (one static, domain-specific config module + colocated test) — this is a duplicate directory concept, not a duplicate of `core/config` (which is unrelated tooling config). See Finding 4 below for the typo-split verdict.

#### `core/services` vs `shared/services`

`core/services`: `base.service.ts` (generic urql query/mutation executor, `BaseService` abstract class), `restBase.service.ts` (generic REST base class with auth-header sync, file-type registry, download handling).
`shared/services`: `crud.service.ts` (single file at top level — extends `core/services/base.service.ts`'s `BaseService` with this app's generated `Admin`/`PageInfo`/`Seo` GraphQL fragments) **plus 34 per-business-module subfolders** (see Finding 2).

**Overlap**: none — `shared/services/crud.service.ts` is a legitimate one-level extension of `core`'s base class (adds app fragments), not a duplicate. The 34 subfolders are pure domain services with no `core/` counterpart at all (correctly so — CRUD entity services are inherently app-specific).

#### `core/types` vs `shared/types`

`core/types`: `authorizationCodePayload.ts`, `oauthError.ts` (OAuth-flow types — arguably app-specific despite being in `core/`), `env.d.ts`, `global.d.ts`, `jsx.d.ts`, `vite-env.d.ts` (build/ambient type declarations).
`shared/types`: single file `auth.type.ts` (`EAccountType`, `AuthAccountDTO` — this app's multi-account-type auth model).

**Overlap**: none direct, but `core/types/authorizationCodePayload.ts` and `oauthError.ts` are OAuth/auth-domain types sitting in `core/` next to build-tooling ambient declarations, while the sibling auth type (`auth.type.ts`) lives in `shared/types` — the auth type domain itself is split across both folders with no clear rule.

#### `core/components` vs `shared/components`

`core/components` (159 files) is a full generic UI kit: buttons, dialogs, disclosure/floating, forms, an entire rich-text `control/editor/*` subsystem, icons, map inputs, modal, pagination, stats, tabs, `table/*` (a generated-datatable system), toast, tooltip, and generic `utilities/*` (Avatar, Card, Loader, Skeleton, etc.) — plus a `config/Base*Config.tsx` set (see below).

`shared/components` (17 files) is business-specific composed components: `activityLog/*`, `agency/*` (agency-acting-tenant bar, tenant cell/filter/form field), `controls/Enabled*`, `dialog/AccountPasswordDialog.tsx`, `fields/*` (Code/Password/Username fields, CMS content-entry field renderer), `icons/*` (see below), `LocaleSwitcher.tsx`, `media/mediaSetViewer.tsx`, `password/ChangePasswordForm.tsx`.

**Overlap (genuine, and the most important one in this pair)**: `shared/components/icons/Icon.tsx` is byte-identical to `core/components/icons/Icon.tsx`; `iconVariants.ts` is core's content plus ~26 extra icon keys, with `shared/`'s own header comment: `// add custom app specific icon variant, can override default ones`. This is the intended base→override pattern, but it was implemented by **copy-pasting the whole file** into `shared/` instead of importing/extending `core/`'s icon set, leaving `core/components/icons/*` as dead duplicate code (see Finding 3).

**Genuine difference**: `core/components/config/{BaseConfig,BaseEventConfig,BaseIconConfig,BaseTextConfig}.tsx` are defaults; `shared/common/config/{EventConfig,IconConfig,MediaConfig,TextConfig}.tsx` (note: filed under `shared/common/config`, a *third* config-ish location, not `shared/config`/`shared/configs`) spread the base and are the intended override point — currently empty overrides, but the wiring is correct base→extension, not duplication.

---

### 2. `shared/services/<name>` vs `src/modules/<name>` mapping

`src/modules/*` (10 entries): `admin`, `agency`, `auth`, `cms`, `codeConfig`, `customer`, `merchant`, `tenant`, `theme`, `unit`.

`shared/services/*` (34 entries):

| shared/services/<name> | Matches a `modules/<name>`? |
|---|---|
| `admin` | Yes — `modules/admin` |
| `agency` | Yes — `modules/agency` |
| `codeConfig` | Yes — `modules/codeConfig` |
| `customer` | Yes — `modules/customer` |
| `merchant` | Yes — `modules/merchant` |
| `tenant` | Yes — `modules/tenant` |
| `theme` | Yes — `modules/theme` |
| `unit` | Yes — `modules/unit` |
| `accountPermission` | **No** |
| `activityLog` | **No** |
| `agencyAccount` | **No** (agency-adjacent but no own module) |
| `artDirectionKit` | **No** (CMS-domain, `modules/cms` has no services folder) |
| `brand` | **No** (CMS-domain) |
| `component` | **No** (CMS-domain, Widget/Component registry) |
| `contentEntry` | **No** (CMS-domain) |
| `contentType` | **No** (CMS-domain) |
| `emailConfig` | **No** |
| `footerPreset` | **No** (CMS-domain) |
| `form` | **No** (CMS-domain) |
| `grantableResource` | **No** |
| `headerPreset` | **No** (CMS-domain) |
| `media` | **No** (CMS-domain) |
| `mediaSet` | **No** (CMS-domain) |
| `menu` | **No** (CMS-domain) |
| `merchantInvitation` | **No** (merchant-adjacent but no own module) |
| `node` | **No** (CMS-domain, core of the Node Builder) |
| `page` | **No** (CMS-domain) |
| `pageVersion` | **No** (CMS-domain) |
| `redirect` | **No** (CMS-domain) |
| `siteLocaleSettings` | **No** (CMS-domain) |
| `systemConfig` | **No** |
| `taxonomy` | **No** (CMS-domain) |
| `tenantAccount` | **No** (tenant-adjacent but no own module) |
| `tenantStaffSetting` | **No** (tenant-adjacent but no own module) |
| `term` | **No** (CMS-domain) |

Only **8 of 34** (24%) line up 1:1 with a `modules/<name>` folder. 16 of the 26 non-matching folders are CMS-domain (`contentEntry`, `contentType`, `page`, `pageVersion`, `node`, `taxonomy`, `term`, `menu`, `redirect`, `artDirectionKit`, `footerPreset`, `headerPreset`, `form`, `brand`, `media`, `mediaSet`, `siteLocaleSettings` — 17 actually) and belong to `modules/cms`, which has zero `services/` subfolder of its own (it only has `admin/`, `api/`, `chrome/`, `node/` for UI/editor logic). The remaining ~9 (`accountPermission`, `activityLog`, `agencyAccount`, `component`, `emailConfig`, `grantableResource`, `systemConfig`, `tenantAccount`, `tenantStaffSetting`) are cross-cutting or module-adjacent concerns with no module home at all. Additionally, `modules/auth` has no services counterpart either (auth lives in `shared/contexts/auth/*` + `shared/types/auth.type.ts` + `shared/helpers/token.helper.ts`), which is defensible as cross-cutting infra but adds to the inconsistency.

- **Category**: organization
- **Severity**: Important
- **File/Folder**: `src/shared/services/*` (26 of 34 folders) vs `src/modules/cms` (no `services/` subfolder)
- **Problem**: The single largest business domain in the app (CMS/page-builder — page, node, content type/entry, taxonomy, term, menu, redirect, media, presets) has its entire service layer filed under `shared/services/`, invisible from `modules/cms/`, while smaller domains (`admin`, `agency`, `customer`, `merchant`, `tenant`, `theme`, `unit`) do have a same-named `shared/services/<name>` **and** a `modules/<name>` — but even those modules' services aren't inside their own module folder, they're one level up in `shared/services/<name>`, matched only by name convention.
- **Impact**: Developers cannot answer "where does CMS/page code live" by looking at `modules/`; the two trees encode two different, uncommunicated conventions (`modules/*` = pages/UI only, `shared/services/*` = actual per-domain data layer for *every* domain including ones with no module). New engineers will guess wrong and add a competing `modules/cms/services/*` folder, creating a third location.
- **Suggested direction**: Pick one rule and document it: either (a) `modules/<name>/services/*` becomes the real location and `shared/services/*` is retired (move all 34 folders in, including creating `modules/cms/services/*` for the 17 CMS ones and small "module-less" modules for the other 9 domains), or (b) formally rename `shared/services/*` to be the acknowledged per-domain service layer for the whole app and rename `modules/*` to `modules/*/pages` (or similar) to make clear it only holds routed UI, not services. Given `shared/services` already has 4x the entries and the correct per-domain granularity, (b) is less churn — but needs an explicit README/CLAUDE.md rule so `core/`'s "generic" and `modules/`'s "one place per domain" promises aren't both broken by the same drift again.

---

### 3. Usage sampling — dead / barely-used / live

| Symbol | Location | External importers (excl. self/test) | Verdict |
|---|---|---|---|
| `Icon` (component) | `src/core/components/icons/Icon.tsx` | 0 — everyone imports the `shared/` copy instead (96 importers of `shared/components/icons`) | **Dead duplicate** |
| `IconName` / variants | `src/core/components/icons/iconVariants.ts` | 0 | **Dead duplicate** |
| `hashHmacSHA256` | `src/core/helpers/hash.ts` | 0 | **Dead** |
| `maskSecret` | `src/core/helpers/secret.ts` | 0 | **Dead** |
| `InputGPS` | `src/core/components/map/InputGPS.tsx` | 0 | **Dead** (never imported by path anywhere) |
| `InputPolygon` | `src/core/components/map/InputPolygon.tsx` | 0 | **Dead** (never imported by path anywhere) |
| `useOrgRouteBase` / `orgRouteBase` | `src/shared/hooks/useOrgRouteBase.ts` | 0 | **Dead** |
| `generateQrDataUrl` | `src/core/helpers/qr.ts` | 1 (`core/components/utilities/QRCodeImage.tsx`) | Live, narrowly used |
| `createTooltip` | `src/core/components/tooltip/createTooltip.tsx` | 4 (`Button.tsx`, `InputFile.tsx`, both `Icon.tsx` copies) | Live |
| `useIsAgencyView` | `src/shared/hooks/useIsAgencyView.ts` | 5, including 3 files inside `core/components/table/*` and `modules/codeConfig` | Live, but see Finding 5.2 (core importing shared) |
| `RedirectService` | `src/shared/services/redirect/redirect.service.ts` | 2 (`modules/cms/admin/manageRedirects.page.tsx`, `modules/cms/api/resolveCmsPageProps.ts`) | Live |
| `stripScopeRuleTypename` etc. | `src/shared/helpers/scopeRule.helpers.ts` | 2 (`modules/tenant/pages/tenantAccount/staff/*`) | Live |
| `SCOPE_FIELD_REGISTRY` | `src/shared/configs/scopeFieldRegistry.ts` | 1 (`modules/tenant/pages/tenantAccount/staff/permRow.tsx`) | Live |
| `TENANT_BUSINESS_ROLE_META` | `src/shared/config/tenantBusinessRole.meta.ts` | 1 (`modules/tenant/pages/organization/manageTenantBusinessRoles.page.tsx`) | Live |

- **Category**: duplication-reuse
- **Severity**: Important
- **File**: `src/core/components/icons/Icon.tsx`, `src/core/components/icons/iconVariants.ts`, `src/core/helpers/hash.ts`, `src/core/helpers/secret.ts`, `src/core/components/map/InputGPS.tsx`, `src/core/components/map/InputPolygon.tsx`, `src/shared/hooks/useOrgRouteBase.ts`
- **Problem**: 7 confirmed-orphaned files (0 importers anywhere in `src/`) sitting inside the folder that's supposed to be the clean, canonical "one place for common reusable code."
- **Impact**: Anyone auditing or extending the icon system, GPS/polygon map inputs, hashing, or secret-masking will find two candidate locations and no signal which is real; time wasted, risk of editing the dead copy.
- **Suggested direction**: Delete `core/components/icons/Icon.tsx` + `iconVariants.ts` (keep only `shared/components/icons/*`, or invert it — make `core/` the single base file and have `shared/` re-export/extend it instead of copy-pasting, matching the `BaseTextConfig`→`TextConfig` pattern that already works correctly elsewhere). Delete `hash.ts`, `secret.ts`, `InputGPS.tsx`, `InputPolygon.tsx`, `useOrgRouteBase.ts` outright, or confirm with the team they're intentionally-unused scaffolding before removing.

---

### 4. `shared/config` vs `shared/configs`

- **File/Folder**: `src/shared/config/tenantBusinessRole.meta.ts` vs `src/shared/configs/scopeFieldRegistry.ts`
- **Category**: organization
- **Severity**: Important
- **Problem**: `scopeFieldRegistry.ts` physically lives at `src/shared/configs/scopeFieldRegistry.ts`, but its own file-path header comment reads `// src/shared/config/scopeFieldRegistry.ts` (singular, no "s") — direct textual evidence the author wrote/intended the file for the singular `shared/config/` folder that already existed (holding `tenantBusinessRole.meta.ts`), and it ended up in a separate, newly-created `shared/configs/` (plural) folder instead — almost certainly a typo/copy-paste slip rather than a deliberate second category. Both folders hold the exact same *kind* of artifact: one static TS config/registry module + a colocated `.test.ts`. There is no distinguishing purpose between them (e.g. it's not "editable JSON config" vs "TS registry" or "build-time" vs "runtime" — both are runtime TS modules consumed by `modules/tenant/pages/*`).
- **Impact**: A third, accidental "common config" location exists (on top of `core/config` and `shared/common/config`), for a codebase that already struggles with more than one "common" tree. Next config file added has a coin-flip of landing in `config` or `configs`.
- **Suggested direction**: Merge `shared/configs/scopeFieldRegistry.ts` (+test) into `shared/config/`, fix the stale header comment, delete the now-empty `shared/configs/` directory. Also reconcile with `shared/common/config/*` (Event/Icon/Media/TextConfig overrides) — three "config" folders under `shared/` for three different sub-kinds (domain registries, per-role metadata, base-config overrides) should either be consolidated into one `shared/config/` with clear subfolders, or explicitly named apart (e.g. `shared/config/` for domain data, `shared/overrides/` for the Base*Config override point) so the split is legible rather than incidental.

---

### 5. Boundary violations (core/ → shared/ dependency direction)

- **File**: `src/core/api/graphql.ts:17-18` (`import { getLocale } from '@/shared/i18n/locale'`, `import { getErrorAction } from '@/shared/errors/errorActions'`)
- **Category**: organization
- **Severity**: Critical
- **Problem**: The GraphQL client itself — arguably the single most "core" file in the entire codebase — reaches into `shared/i18n` and `shared/errors`, both app-specific.
- **Impact**: `core/` cannot be extracted, versioned, or reused as an actual starter kit (which its name and structure both imply it's meant to be) without also shipping this app's i18n dictionaries and error-code catalog. Any future "spin up a new app from `core/`" effort breaks immediately here.
- **Suggested direction**: Invert the dependency — have `core/api/graphql.ts` accept `getLocale`/`getErrorAction` as injectable callbacks/config (set once at app bootstrap from `shared/`), the same pattern already used correctly for `BaseConfig`/`baseConfig()` overrides.

- **File/Folder**: `src/core/hooks/{useAccountByType,useFeatureFetcher,usePermissionFetcher,useTenantRolesFetcher}.ts`; `src/core/components/table/{CellButtonDelete,CellButtonUpdate,DatatableButtonCreate}.tsx`, `GeneratedDatatable.tsx`, `Datatable.tsx`; `src/core/components/{control/IconRadioGroup,control/InspectorSection,control/Select,control/SpacingControl,dialog/MediaLightbox,map/InputGPS,map/InputPolygon,stats/StatCard,utilities/EnumBadge}.tsx`; `src/core/components/control/editor/{editor.i18n,TablePropertiesPanel,TableToolbar,Toolbar}.{ts,tsx}` — 22 files total
- **Category**: organization
- **Severity**: Critical
- **Problem**: 22 files under `src/core/**` import from `@/shared/**` (contexts, services, generated types, hooks, i18n, errors). This is on top of the 4 misplaced hooks discussed in Finding 1 and the icon duplication in Finding 3.
- **Impact**: `core/` is documented/expected (by folder name and by the user's stated goal) to be the single place for generic, reusable code; in practice it's already ~14% cross-contaminated by business logic and business-layer imports, meaning "everything organized like `core/`" cannot be achieved by simply moving `shared/` content into `core/` — `core/` needs its own cleanup first or the merge just inherits the coupling.
- **Suggested direction**: Add a lint rule (e.g. an ESLint/oxlint `no-restricted-imports` rule) forbidding `src/core/**` from importing `@/shared/**` or `@/modules/**`, then work through the 22 violations: move the 4 business hooks to `shared/hooks/` (or `modules/<domain>/hooks/`), move `useIsAgencyView`/`agencyActingTenant` usage out of the generic `Datatable`/`CellButton*` components (parametrize via props/context injection instead of a direct import), and push i18n/error-action wiring behind the same injectable-config pattern as `BaseConfig`. Enforcing this rule going forward is what will actually keep `core/` meaning "generic" after any reorg.

---

## Overall recommendation (expanded)

Given the evidence, the cleanest unified structure is **not** "dump `shared/` into `core/`." That would:
- destroy the one pattern in this codebase that's already correct (`core/` ships a generic default, `shared/` supplies the app-specific override/extension — see `BaseTextConfig`→`TextConfig`, `BaseService`→`CrudService`), and
- import 22+ files' worth of `core/`→`shared/` coupling into the merged tree with no forcing function to ever untangle it.

Recommended target structure:
1. **`core/` = truly generic, framework-agnostic, business-blind primitives only.** UI kit components, generic helpers, the base API/service classes, ambient types. Enforced by a lint rule banning `core/** → shared/**` and `core/** → modules/**` imports. Anything currently in `core/` that fails this test (the 22 files, the 4 hooks) moves out.
2. **`shared/` = this app's cross-module glue and per-domain service/data layer** — contexts, i18n, error handling, and (this is the important part) the per-business-domain `services/*` folders, formally acknowledged as the real "domain layer," not an ad-hoc leftover. Rename or document it as such rather than half-mirroring `modules/`.
3. **`modules/` = routed feature/page code only** (what's already true in practice for most modules) — stop implying it should also hold services; either grow it to include `services/` per domain (bigger migration, cleanest end state) or explicitly document that services live in `shared/services/<domain>` and `modules/<domain>` is UI-only.
4. **Kill the accidental third/fourth "config" locations** (`shared/config` + `shared/configs` + `shared/common/config`) down to one clearly-named home per sub-purpose (domain config data vs. base-config overrides).
5. **Delete the 7 confirmed-dead files** and the icon duplication, keeping only the base→override wiring pattern (no copy-pasted duplicate base files).

This keeps the genuinely-working parts of the design (base/override layering) while fixing the actual complaint: right now `core/` isn't the clean, self-contained "one place for common code" the user believes it is — it's already leaking business logic and depending on `shared/`, so the confusion isn't just "why does `shared/` also exist," it's "`core/` doesn't currently deserve to be the north star either."
