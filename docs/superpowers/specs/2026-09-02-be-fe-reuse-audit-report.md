# BE + FE Codebase Reuse & Scalability Audit — Master Report

**Date:** 2026-09-02 | **Design doc:** `2026-09-02-be-fe-reuse-audit-design.md` | **Raw reports:** `2026-09-02-audit-raw/`

8 parallel read-only audits (3 BE, 4 FE, 1 cross-repo API contract) covering all ~25 BE modules
and ~10 FE modules plus both core layers. This document is the synthesis + a prioritized
execution roadmap for Phase 2 (refactor). Nothing in this document has been implemented yet.

## How to read this

Findings are grouped by **what to do about them**, not by which audit found them (raw per-audit
findings with exact file:line references live in `2026-09-02-audit-raw/*.md`). Groups are ordered
by recommended execution priority.

---

## Group 0 — Real bugs found along the way (fix first, independent of the reuse refactor)

These aren't organization problems — they're live correctness/security defects the audits
surfaced as a side effect of reading the code closely. Each is small and independent; safe to
fix in parallel as a standalone "hotfix" batch before the bigger structural work.

| # | Bug | Where | Severity |
|---|-----|-------|----------|
| 0.1 | Nested `AND(OR(...))` permission scope rule silently drops the OR branch on **list** queries only (mutations check correctly) — over-grants data access | BE `permission/types/scope.types.ts:307-331` | Critical (security) |
| 0.2 | `AdminService`/`MerchantService.forgotPassword` leak account existence (enumeration oracle) on a public mutation; `CustomerService` already fixed the identical issue | BE `admin.service.ts:162-170`, `merchant.service.ts:219-227` | Critical (security) |
| 0.3 | Agency/Tenant login "Forgot password" links point at `merchantAuth.forgotPassword` (wrong role) — routes don't even exist for those roles | FE `agency/pages/login.page.tsx:112`, `tenant/pages/auth/login.page.tsx:111` | Critical (live account-recovery dead-end) |
| 0.4 | `setPermissions` (sole write path for all permission grants) is non-transactional — a crash mid-write can zero out an account's permissions | BE `accountPermission.service.ts:248-272` | Critical |
| 0.5 | Media/MediaSet mutations have **zero** `@GQLPermission` — any staff role can manage media regardless of granted bundle | BE `media.resolver.ts`, `mediaSet.resolver.ts` | Important (security) |
| 0.6 | `UNIT_MANAGE`/`STAFF_*`/`EMAIL_CONFIG_MANAGE` permissions are defined and shown in the grant UI but never enforced by their resolvers — permission grants for these are decorative | BE `unit.resolver.ts`, `tenantAccount.resolver.ts`, `agencyAccount.resolver.ts`, `emailConfig.resolver.ts` | Important |
| 0.7 | `FormEmbedNode` shows a Style tab and persists style edits, but never renders them — silent no-op | FE `modules/cms/node/primitives/FormEmbedNode.tsx` | Important |
| 0.8 | SSR GraphQL client cache has no invalidation path reachable from the server process — published content edits may never reappear on the public site until server restart | FE `core/api/graphql.ts:140-152` | Critical (production correctness) |
| 0.9 | `Taxonomy.key`/`Term` unique constraints aren't scoped to `deletedAt IS NULL` — delete-then-recreate with the same key crashes (same bug already fixed once on `ContentType.key`) | BE `taxonomy.entity.ts`, `term.entity.ts` | Important |
| 0.10 | `ResetPasswordAdminPage`/`ResetPasswordMerchantPage` — 226 lines of fully-built, never-routed dead code sitting next to the real generic page | FE `admin/pages/resetPasswordAdmin.page.tsx`, `merchant/auth/resetPasswordMerchant.page.tsx` | Minor (trap for future edits) |

---

## Group 1 — Flagship reuse restructure: FE `core/` vs `shared/`

The user's original ask. Verdict from the audit: **don't collapse `shared/` into `core/`** — that
would destroy the one pattern that already works (`core/` ships a generic default, `shared/`
supplies the app-specific override — e.g. `BaseTextConfig`→`TextConfig`, `BaseService`→`CrudService`)
and would import 22 files' worth of `core/`→`shared/` coupling into the merged tree.

**Target structure:**
1. `core/` = truly generic, framework-agnostic, business-blind primitives only. Add a lint rule
   (`no-restricted-imports`) banning `core/** → shared/**` and `core/** → modules/**`. Move the 22
   violating files (incl. 4 misplaced business hooks in `core/hooks`) out.
2. `shared/` = this app's cross-module glue **and** the formally-acknowledged per-domain service
   layer (`shared/services/<domain>` already covers this for 34 domains, only 8 of which have a
   matching `modules/<name>` — document this explicitly rather than leaving it implicit).
3. `modules/` = routed feature/page code only.
4. Collapse `shared/config` + `shared/configs` (accidental typo-split — `scopeFieldRegistry.ts`'s
   own header comment still says `config`, singular) into one folder.
5. Delete confirmed-dead files: `core/components/icons/{Icon.tsx,iconVariants.ts}` (byte-identical
   to, and shadowed by, the `shared/` copy that 96 files actually import), `core/helpers/{hash.ts,secret.ts}`,
   `core/components/map/{InputGPS.tsx,InputPolygon.tsx}`, `shared/hooks/useOrgRouteBase.ts`.

Full pairwise inventory (every `core/*` vs `shared/*` subfolder, what's dead, what's live, exact
import counts) is in `2026-09-02-audit-raw/FE-1-core-vs-shared.md`.

---

## Group 2 — High-leverage shared abstractions (kill the biggest duplication multipliers)

Each of these collapses N hand-copied implementations into 1, and — per the BE-1 audit's own
note — makes the shared path "the path of least resistance" so new modules stop re-diverging.

| # | What | Collapses | Where |
|---|------|-----------|-------|
| 2.1 | Give `BaseGraphQLResolver<T>` real CRUD helper methods (currently just a constructor) | ~20 BE resolver files hand-duplicating identical getOne/getAll/create/update/delete | BE `core/infrastructure/http/baseGraphql.resolver.ts` |
| 2.2 | `DefaultableConfigService<T>`/`Repository<T>` base (findAll/findDefault/createWithAutoDefault/setDefault/deleteWithReassignment) | Theme/HeaderPreset/FooterPreset near-byte-identical CRUD | BE `modules/{theme,headerPreset,footerPreset}` |
| 2.3 | Shared `cycleGuard.util.ts` (capped parent-walk cycle detection) | Node/Term/Component/MenuItem's 4 independently hand-copied implementations (the code's own comments admit the copying) | BE `modules/{node,taxonomy,component,menu}` |
| 2.4 | Shared `AccountCredentialService` (password policy, reset-token gen/verify) | ~5 copies across Admin/Merchant/Customer/AgencyAccount/TenantAccount, 10 duplicated `< 6` length checks — also the root cause of bug 0.2 | BE identity modules |
| 2.5 | Shared `LoginForm`/`ForgotPasswordForm` components, parametrized (mirroring the already-proven `ChangePasswordForm` pattern) | 4× duplicated Login pages, 2× duplicated ForgotPassword pages — also fixes bug 0.3 at the root instead of patching one line | FE `modules/{admin,agency,merchant,tenant}` |
| 2.6 | One `RoleLayout` component (`{accountType, sidebarMenus, typeName, bgColor, extraProviders?}`) | 4 near-identical layout shells (Admin/Agency/Merchant/Tenant), ~85% identical | FE `src/layouts/{admin,agency,merchant,tenant}` |
| 2.7 | Apply the already-proven `deletedAt IS NULL`-scoped partial unique index pattern wherever a soft-delete + unique-natural-key combination exists | `ContentType.key` (already fixed) → also needed for `Page.path`, `Component.key` (currently hard-delete workarounds), `Taxonomy.key`, `Term` (bug 0.9) | BE content modules |
| 2.8 | `UpdateXInput extends CreateXInput` convention everywhere (already the pattern for `Form`) | Node/Page/Media/MediaSet DTOs hand-duplicate every field between Create/Update input types | BE various modules |

---

## Group 3 — Performance / scale (the other half of the user's ask)

Ordered by "won't survive real traffic" severity first.

| # | What | Impact if unfixed | Where |
|---|------|--------------------|-------|
| 3.1 | **No caching anywhere in the render-critical path** — wire the existing (unused) Redis `cacheManager` into header/footer/theme/locale-settings reads | Up to 6+ uncached DB round trips on every single public page view | BE `page.resolver.ts` `resolveHeaderFooter`/`resolveTheme` |
| 3.2 | SSR GraphQL cache invalidation (root cause of bug 0.8) — `network-only` for SSR or a real invalidation hook, or short TTL | Published edits invisible on public site until process restart | FE `core/api/graphql.ts` |
| 3.3 | Cache `resolvePermission` (64 uncached call sites, runs before every permission-checked resolver) | Constant DB-round-trip tax on nearly the entire API surface | BE `accountPermission.service.ts:142-159` |
| 3.4 | Call `SearchIndexManager.initialize()` at boot (dead code — the GIN trigram indexes it creates never get created) | Search silently degrades to sequential scan as rows grow | BE `core/infrastructure/database/search-index.manager.ts` |
| 3.5 | `ComponentService.publishComponent`/`deleteComponentDefinition` — batch + transaction + parallelize (currently unbounded sequential per-instance, per-node processing) | O(instances × nodes) fully serialized; a 50-node component on 200 pages = 10,000+ sequential queries on one publish click | BE `component.service.ts:707-786` |
| 3.6 | Index `ContentEntry.data` access paths — composite `(contentTypeId, status, locale)`, plus `locale` alone | Hottest public-read query shape has no covering index | BE `contentEntry.entity.ts` |
| 3.7 | Lazy-load GSAP+ScrollTrigger (flagged independently by 2 separate audits) instead of static top-level import in `FrameNode`/`ImageNode`/`applyAnimationTimeline` | Full GSAP bundle ships on every public CMS page regardless of whether it animates anything | FE `modules/cms/node/{applyAnimationTimeline.ts,primitives/FrameNode.tsx,primitives/ImageNode.tsx}` |
| 3.8 | Route-level code-splitting (`lazy()` per role's route group) | All 4 role portals + the entire CMS Node Builder ship in one bundle; an Agency user downloads Admin+Tenant+CMS-editor code too | FE `shared/common/app/AppRoutes.tsx` |
| 3.9 | Parallelize `resolveCmsPageProps`'s sequential SSR waterfall (`Promise.all` the repeat-entry loop + hoist translations fetch) | N+3 to N+4 sequential round trips per public page view | FE `modules/cms/api/resolveCmsPageProps.ts:79-169` |
| 3.10 | `page_version` retention policy — unbounded full-tree JSON snapshot on every publish, no pruning anywhere | Multi-GB unbounded growth with no reclaim path | BE `page.service.ts:200-215` |
| 3.11 | Fix the canvas remount-on-every-keystroke defect — memoize `tree()` / give `<For>` a stable key | Typing in any Inspector field remounts the entire canvas DOM subtree | FE `modules/cms/admin/nodeBuilder/NodeBuilder.page.tsx:352,1833` |
| 3.12 | `cacheManager.deletePattern()` — replace blocking Redis `KEYS` with `SCAN` or a key index | O(total keyspace) blocking scan on every entity write, worsens as more modules/tenants share the instance | BE `core/infrastructure/cache/cacheManager.ts:113-124` |
| 3.13 | Astro image optimization (`astro:assets`, currently 0 usage — `AstroImage.astro` is dead code) — real `width`/`height`/`srcset` | Every device downloads full-resolution originals; no CLS protection | FE `modules/cms/node/primitives/{ImageNode,ContentDetailNode,CardListNode}.tsx` |
| 3.14 | CDN/HTTP caching or Vercel ISR for non-personalized public pages | Every page view re-runs the full SSR + GraphQL chain, no edge absorption | FE `astro.config.mjs` / `middleware.ts` |
| 3.15 | `FormSubmission`, `Menu`, and 4 preset modules bypass pagination entirely (unbounded `[Entity]` lists) — route through existing `findAllPagination` | `FormSubmission` can realistically reach millions of rows with zero cap | BE `form`, `menu`, `theme`, `headerPreset`, `footerPreset`, `artDirectionKit`, `siteSettings` |
| 3.16 | DB pool size configurable via env (hardcoded `max: 10`); cron queue batch+concurrency (currently 1 job/5s tick) | Both become hard scaling ceilings as module/tenant/job count grows | BE `config/database.config.ts`, `core/infrastructure/cron/cron.service.ts` |

---

## Group 4 — Cross-repo contract hygiene

| # | What | Where |
|---|------|-------|
| 4.1 | Consolidate password-minimum-length into one constant per repo (BE: 6, hardcoded 9x; FE: 8, declared twice + a 3rd inline `<6` bypass) — reconcile the actual value, then keep in sync deliberately | BE identity services, FE `core/helpers/string.ts` + `PasswordField.tsx` |
| 4.2 | Sync the 13 missing error codes into FE's `errorCode.enum.ts` mirror; consider a small sync script instead of manual mirroring | FE `shared/errors/errorCode.enum.ts` |
| 4.3 | Remove the dead `npm run codegen` (`graphql-codegen`, no config file exists) — the real pipeline is `npm run gengraph`; having both installed with only one working is actively misleading | FE `package.json` |
| 4.4 | Add a CI job that regenerates `shared/generated/*` against a live BE and fails on diff — currently only manual, never checked | FE `.github/workflows/ci.yml` |
| 4.5 | Update FE README's stale "Codegen pipeline" section (still describes a "minimal seed" schema; the real one already has the full CMS surface) | FE `README.md` |

---

## Group 5 — Dead code sweep (low-risk, do alongside whichever group touches that file)

BE: `RBAC.service.ts`'s unused parallel permission engine (~110 lines), `job.registry.ts`,
`GraphQLLoader`, `DEFAULT_PAGINATION` (unused export), global `Partial<T>` redeclaration,
`globalSequence.cleanupOldRows()` (dead **and** would corrupt live counters if ever wired up
naively — fix or delete, don't leave as a trap).
FE: the 7 dead files in Group 1, plus the 226 dead lines in bug 0.10.
Also wire in (don't delete) `sameTenant.guard.ts` — a real cross-tenant FK-leak guard with zero
callers, i.e. a security gap, not just dead code.

---

## Recommended execution order

1. **Group 0** (bug hotfix batch) — small, independent, mostly security-relevant. Do first regardless of anything else.
2. **Group 1** (FE core/shared restructure) — the flagship ask; do before Group 2 so new shared abstractions land in the right place the first time.
3. **Group 2** (shared abstractions) — highest duplication-reduction leverage; 2.5 also resolves bug 0.3 properly at the root.
4. **Group 3** (performance) — ordered internally by severity; 3.1-3.4 first (biggest "won't survive traffic" risks), rest as capacity allows.
5. **Group 4 + 5** — do opportunistically alongside whichever group already has a PR open touching that file; not worth a dedicated pass.

Each group should get its own spec → plan → implement → review cycle (same pattern as the CMS
Phase 0-8 work), not one giant PR — these touch live production auth/permission/rendering code
across two repos.
