# BE + FE Codebase Reuse & Scalability Audit — Master Report

**Date:** 2026-09-02, updated 2026-09-04. Single source of truth for this initiative — the design
doc, raw per-audit findings, Group 0's implementation plan, and its completion report have all
been folded into this file and removed to keep the doc footprint minimal (git history still has
them if needed).

8 parallel read-only audits (3 BE, 4 FE, 1 cross-repo API contract) originally covered all ~25 BE
modules and ~10 FE modules plus both core layers. Findings are grouped by **what to do about
them**. Groups are ordered by recommended execution priority.

---

## Group 0 — Real bugs found along the way — ✅ DONE (merged to master on both repos)

**BE: 16 commits. FE: 9 commits.** All 10 original bugs below are fixed. The final whole-branch
review (5 rounds on BE, 2 on FE) additionally found and fixed an escalating chain of Critical
security issues that the Group 0 fixes themselves exposed — most severe: an unauthenticated
full-platform-takeover via a REST endpoint (self-register a public Merchant account → create a
SUPER_ADMIN with an attacker-chosen password). Every fix was live-verified against the real dev
DB with disposable throwaway accounts, never real data.

**Still open / disclosed follow-ups (not blockers):**
1. BE: a pre-existing route-registration-shadowing bug (`baseRest.controller.ts` — base
   controller's generic handler always wins over a subclass's stricter override) remains open;
   the Group 0 fixes close the actual exploit surface regardless of which handler wins, but the
   shadowing bug itself needs its own dedicated task.
2. BE: `agencyAccount.resolver.ts`'s `@GQLPermission(STAFF_*)` checks are unreachable in practice
   (Agency bypass fires first) — needs a product decision on whether per-agency-staff delegation
   is actually wanted.
3. BE: login mutations remain a weaker account-enumeration oracle than the `forgotPassword` flows
   this batch fixed — pre-existing, not introduced here.
4. BE: `generatePresignedUrl` still has no `MEDIA_MANAGE` gate — deliberate original scope call.
5. FE: no real browser click-through was performed (Playwright never connected this session) —
   verified via direct GraphQL/REST calls + automated tests instead.
6. FE: `/reset-password` mislabels agency/tenant users as "Merchant" post-reset (the credential
   itself resets correctly) — needs a coordinated BE+FE change, deferred.

---

## Codebase hygiene initiative (new, runs alongside Groups 1-5)

Three cross-cutting passes requested on top of the original roadmap:

- **H1 — Test file centralization. ✅ DONE (merged to master on both repos).** Moved every test
  file out of its colocated location into one top-level `test/` directory per repo, mirroring
  `src/`'s structure 1:1 (BE: 67 files; FE: 112 files). `vitest.config.ts`/`vitest.ssr.config.ts`
  (FE) and `jest.config.js` (BE) updated to discover tests there. Verified against exact
  pre-migration baselines both before and after (BE 67/67 suites, 582/582 tests; FE 107/107
  suites, 1109/1109 tests) plus a clean typecheck/`astro check`. Caught and fixed 2 real bugs the
  mechanical migration introduced: a non-`.test.ts` shared test helper (BE
  `sectionLibraryTestKit.ts`) whose relative imports the migration script doesn't scan; and 2 FE
  test files that `readFileSync` their own source sibling via a hand-built relative path (not a
  static `import`), which the script's import-rewriter can't see either.
- **H2 — Enum/type-safety sweep. ✅ DONE (merged to master on both repos).** Full read-only
  inventory of both codebases first (2 parallel research passes), then a 14-task implementation
  plan (5 BE tasks, 9 FE tasks), each with its own implementer + task review + fix loop, plus a
  final opus-model whole-branch review per repo (which each caught 3-4 additional cross-task
  Important findings no task-scoped review could see — e.g. BE's `ERepeatSource` missing a
  `LOCAL` member the repo's own seed data uses; FE's `EFieldType`/`EFilterValueSource` sweep
  missing 2 live registries and a duplicated option list) — both addressed in a follow-up fix
  commit and re-reviewed clean before merge. BE: added `EResolvedScopeType`,
  `EPasswordResetAccountType`, `ENodeLayoutMode`/`ERepeatSource`/`ERepeatMode`/
  `ERepeatCardinality`/`EFilterValueSource` + a unified `GenericDataSourceFilter` type (closing a
  real silent type-divergence bug between `page.service.ts` and `contentEntryUsage.service.ts`),
  4 header/footer preset variant enums, consolidated `ESort`/`EFilterOperator` usage. FE: promoted
  `Breakpoint` (highest blast-radius: 12+ files), deduped `IScopeRuleFE`/`MerchantOrgType`/theme
  color-token keys, unified the CMS filter/visibility operator vocabulary onto `EFilterOperator`
  (added a backward-compat read shim for legacy-spelled `VisibilityCondition.operator` values
  already live in saved Node data — a real data-safety judgment call, verified sound), applied
  the pre-existing `EFieldType`/`EMenuItemTargetType` enums, as-const'd the DataBinding/Repeat/
  Animation/Frame-behavior/CustomCode-isolation/Field-control/Visibility/Background-fill/
  Typography-role discriminants (several tasks expanded scope after each task's own repo-wide
  completeness re-sweep — a technique adopted mid-plan and applied by every later task).
  Disclosed backlog (Minor, none blocking): BE — `ESort`/`buildOrderBy`'s narrowing is inert
  because `IPaginationParams.sort` is `any` (fixing that breaks 2 existing callers, left alone);
  a pre-existing broken `package.json` `typecheck:scripts` script. FE — one breakpoint value cast
  and 2 `valueSource` literal sites not retrofitted for consistency; `SectionDataSource.mode`
  left as a partially-promoted union; the new operator-display backward-compat shim has no
  dedicated test.
- **H3 — Comment style cleanup. ✅ DONE (merged to master on both repos).** 2 parallel read-only
  audits first categorized every 10+ line comment block (131 in BE, 199 in FE) into
  narrative/redundant (shorten aggressively), design-doc-masquerading-as-comment (relocate/trim
  hardest), dense-technical-rationale (keep every fact, tighten only the prose), or fine-as-is.
  The ~75 worst, most concretely identified offenders across both repos were then rewritten in
  5 batches (2 BE, 3 FE), each with its own review pass checking two things: zero code touched
  (verified by an automated line-filter, not just eyeballing) and no load-bearing fact lost. Real
  losses were found and fixed at every layer — 3 in BE (a privilege-escalation safety
  justification, a permission-field semantic, a second hard-delete rationale), 4 in FE (a
  viewport-vs-layout-space rationale, a snapshot-ordering guarantee, a documented UX scope
  exclusion, an animation-timeline design rationale) — confirming the "keep the why, cut the
  narrative" distinction needs real verification, not just a mechanical trim. Net result: BE
  -693 lines, FE -906 lines of comment bloat, both merged clean with full test suites unchanged
  (comment-only diffs, confirmed via automated non-comment-line scans on every batch and on the
  final combined branch). Remaining ~255 blocks (mostly `NodeBuilder.page.tsx`/`FrameNode.tsx`
  "honorable mentions" flagged but not individually rewritten, and `vitest.config.ts`'s dense
  module-resolution rationale, deliberately left untouched given the risk of losing an
  interlocking empirically-derived fact) are disclosed backlog for a future pass, not a gap in
  this pass's stated scope (shorten the worst, most damaging offenders — not touch every comment
  in both codebases).

---

## Group 0 bug table (reference — see "Group 0" section above for status)

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

## Group 1 — Flagship reuse restructure: FE `core/` vs `shared/` — ✅ DONE (merged to master)

The user's original ask. Verdict from the audit: **don't collapse `shared/` into `core/`** — that
would destroy the one pattern that already works (`core/` ships a generic default, `shared/`
supplies the app-specific override — e.g. `BaseTextConfig`→`TextConfig`, `BaseService`→`CrudService`)
and would import 22 files' worth of `core/`→`shared/` coupling into the merged tree.

**Execution summary.** A fresh read-only audit before implementation found the real count had
drifted to 26 violations (not 22), and — more importantly — that most of them needed a fix other
than "move the file": 10 were 1-line import swaps or local-type decoupling, 2 needed
dependency-injection extraction (not a move, since `graphql.ts` has 5 core-internal dependents and
`Select.tsx` has 47 importers — moving either would have cascaded a *new* core→shared edge into
everything that imports it), and only 16 genuinely relocated. Executed as 10 tasks, each
implemented → reviewed → merged in sequence, riskiest first (the `Datatable`/`GeneratedDatatable`
cluster, 25+ importers, a real pre-existing circular import that had to survive the move intact).
Two review layers each caught a real defect no earlier layer saw: a task-level review caught the
`Datatable` move itself introducing a **brand-new** core→shared edge in a sibling file
(`DatatableContext.tsx`) — fixed by extracting 2 shared types to `core/` instead of importing them
back from `shared/`, closing the exact class of regression this whole initiative exists to
prevent; the final whole-branch review then found the new `no-restricted-imports` lint guard
(Task 10) never actually ran in CI, and that the "false positive" blocking the broader repo-wide
lint (`src/env.d.ts`'s `declare namespace` inside an already-`declare global` block) was in fact a
real compiler diagnostic hidden by `skipLibCheck`, not a false positive — a one-word fix let the
guard run repo-wide instead of scoped to just `core/`. Also added: test coverage for both DI
extractions (mirroring an existing pattern, since neither had any before this pass), a
`shared/services/<domain>` ↔ `modules/<name>` coverage table in `docs/PROJECT-CONTEXT.md`, and
deletion of 10 confirmed-dead files (one judgment call — a well-formed but fully superseded
`AccountPasswordDialog.tsx` chain — independently re-verified correct by a second reviewer before
merge). Final state: **zero** `core/**` → `shared/**`/`modules/**` violations, enforced in CI.

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

---

## Group 2 — High-leverage shared abstractions (kill the biggest duplication multipliers) — ✅ DONE (merged to master on both repos)

All 8 items (2.1-2.8) implemented, task-reviewed (2 fix-and-re-review rounds: Task 5's orphaned
methods + missing schema-collision regression test; Task 7's Critical presence-vs-in-flight guard
bug on Agency/Tenant auto-login), whole-branch reviewed on opus (0 Critical on both repos; BE 0
Important/7 Minor backlog; FE 1 Important — no live browser pass on the rewritten login pages,
Playwright MCP unavailable this session — 4 cheap Minor fixes applied, 9 Minor backlog), merged.
BE: 75/75 suites, 658/658 tests, tsc clean. FE: astro check 0 errors, 124/124 suites, 1210/1210
tests.

**Outstanding operational action (not code, cannot be done from this session):** run this
post-deploy sanity check on staging/prod after 2.7's migration
(`1788534207858-PartialUniqueIndexPageComponentRedirectForm`) has run, to confirm the 4 new
partial unique indexes exist and the 4 old plain ones are gone (failure mode is silent — a
`DROP INDEX IF EXISTS` name mismatch would leave Page.path's live bug unfixed with no error):
```sql
SELECT tablename, indexname, indexdef FROM pg_indexes
WHERE tablename IN ('page','cms_component','redirect','form') AND indexdef LIKE '%UNIQUE%';
```
Expect exactly one partial unique index per column, each with `WHERE ("deletedAt" IS NULL)`.



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
