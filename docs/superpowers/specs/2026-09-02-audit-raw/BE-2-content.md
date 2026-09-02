# BE Audit: Content/CMS Modules — Organization, Reuse & Performance

Repo: `D:\OTHER\node-source-base\ddd-graphql-be`
Scope: `page, node, contentEntry, contentType, component, taxonomy, form, media, mediaSet, menu, artDirectionKit, headerPreset, footerPreset, theme, codeConfig, siteSettings` under `src/modules/`, cross-checked against `src/core/**`.

## Summary

- **No caching anywhere in the render-critical path.** A real Redis-backed `cacheManager` exists (`src/core/infrastructure/cache/cacheManager.ts`) but zero business module imports it directly. The public, unauthenticated page-render resolver (`PageResolver.resolvePage`) does up to 6 uncached DB round trips per page view just to resolve header/footer/theme (each does a `findById` + `findDefault` fallback), plus another uncached query for locale settings — this is the single biggest "won't survive real traffic" risk in the whole module set (`src/modules/page/infrastructure/http/graphql/page.resolver.ts:75-92,100-104,119-123`).
- **`ComponentService.publishComponent`/`deleteComponentDefinition` are the worst growth-risk hotspot.** Both fetch every instance of a component site-wide with no limit, then process each instance fully sequentially — clone (itself O(N) sequential per-node queries), N per-node tag/override `updateById` calls, then delete — no transaction, no batching, no concurrency cap (`src/modules/component/application/services/component.service.ts:707-786`, `319-321`, `826`). As the Section/Pattern Library (an actively-growing feature per project history) gets placed on more pages, one publish click gets slower linearly and unboundedly.
- **`page_version` grows forever.** Every `publishPage` inserts a full `{page, nodes[]}` JSON snapshot (up to 500 nodes' worth of jsonb) with no retention policy, cap, or cleanup job anywhere in the codebase (`src/modules/page/application/services/page.service.ts:200-215`, `pageVersion.service.ts` — confirmed via repo-wide grep for prune/archive/MAX_VERSION: zero matches).
- **The same "soft-delete breaks unique index" bug was found once, fixed once, and left unfixed twice more.** `ContentType.key` got the correct fix (a partial unique index scoped to `deletedAt IS NULL`); `Page.path` and `ComponentDefinitionEntity.key` instead got a workaround (hard-delete on the one call site that reproduced it); `Taxonomy.key` and `Term`'s `(taxonomyId, slug)` unique constraint got neither — they will hit the identical opaque unique-violation crash the moment an admin deletes-and-recreates a taxonomy/term with the same key/slug.
- **The same tree-cycle-detection algorithm is hand-copied three times** (Node, Term, Component all independently walk the parent chain with a capped sequential-query loop) — the code's own comments admit it ("cùng thuật toán với TermService.assertNoCycle") but no shared helper was ever extracted.
- **Preset-CRUD is duplicated near-byte-for-byte across Theme/HeaderPreset/FooterPreset** (`findAll`, `findDefault`, `isDefault` create/set/delete-with-reassignment logic), and 6 of the 16 modules (`theme, menu, artDirectionKit, headerPreset, footerPreset, siteSettings`) skip the shared `GQLPaginationArgs`/`PaginatedResponse` pagination infra entirely, returning fully unbounded `[Entity]` lists — including `FormSubmission`, which has no archiving and can realistically grow to millions of rows.
- **Two fully-built N+1-prevention subsystems sit completely unused.** `DataLoaderManager` (real dataloader-based batching, wired into every GraphQL request context) and `GraphQLLoader` (a second, simpler cache-through loader) have zero callers across all 16 modules — real engineering investment nobody reaches for. In practice this isn't currently biting (only one trivial `@FieldResolver` exists anywhere in these modules), but it means the safety net doesn't exist if one gets added later.
- **`ContentEntry.data` (the primary CMS content payload, dynamic per-ContentType JSONB) has zero index support** — no GIN index, no composite `(contentTypeId, status, locale)` index despite that being the hottest public-read query shape, and every `unique`/`autoGenerateFrom` field check does an unindexed `data->>'key'` scan on every save.
- **Permission-check coverage is inconsistent and has a real gap**: Media/MediaSet mutations (create/update/delete media) carry no `@GQLPermission` at all — any authenticated staff account can manage media regardless of assigned permission bundle — while sibling modules (Form, Menu, Page, ContentEntry) correctly gate the equivalent mutations.
- **The one generic "attach media to any entity" mechanism in the codebase is dead code.** `MediaEntity.ownerId/ownerType` + `MediaService.bindMediaToOwner` exist for exactly this purpose but have zero callers; `page`/`node`/`contentEntry` instead embed bare media ids/urls inside jsonb, so the weekly orphan-cleanup cron can't tell "genuinely orphaned" from "referenced inside a node's JSONB."
- **`src/core` provides strong, genuinely-reusable base classes** (`ABaseRepository`, `BaseService`, cursor+offset pagination, generic filter-operator parsing) that essentially all 16 modules correctly build on for basic CRUD — the duplication problems are concentrated in the layer just above that base (preset-specific business logic, tree/cycle helpers, uniqueness checks, permission wiring), not in CRUD boilerplate itself.

---

## Findings

### A. Core-layer consistency (`src/core/**` vs. the 16 modules)

**1. File:** `src/core/infrastructure/http/baseGraphql.resolver.ts:5-9`
**Category:** organization
**Severity:** Important
**Problem:** `BaseGraphQLResolver<T>` is essentially empty — it stores `service`/`entityName` in the constructor and provides no generic `getAll`/`getOne`/`create`/`update`/`delete` query/mutation methods. All 30+ resolver files (all 16 CMS modules included) extend it purely for the constructor convention; every actual query/mutation, including the identical `getAllX`/`getOneX`/`createX`/`updateX`/`deleteX` shape repeated across `theme.resolver.ts`, `headerPreset.resolver.ts`, `footerPreset.resolver.ts`, `artDirectionKit.resolver.ts`, is hand-written per module.
**Impact:** This is the root cause of finding A.5/B.1 below — because there's no generic resolver layer to share, every preset-shaped module re-derives the same boilerplate by hand, and nothing stops it from drifting.
**Suggested direction:** Add optional generic `getAll`/`getOne`/`create`/`update`/`delete` methods to `BaseGraphQLResolver` (or a `DefaultableConfigResolver` subclass, see A.5) that subclasses can call instead of re-writing.

**2. File:** `src/core/infrastructure/database/dataloader.manager.ts:25-172`, `src/core/infrastructure/database/graphQLLoader.ts:7-81`
**Category:** organization
**Severity:** Minor
**Problem:** Two separate, fully-built relation-batching/caching mechanisms exist — `DataLoaderManager` (real `dataloader`-based batching with Redis read-through, instantiated per-request and injected as `ctx.loaders` in `auth.middleware.ts:27,53,66`) and `GraphQLLoader` (a simpler, non-batching cache-through loader) — and neither has a single caller anywhere in `src/modules/**` (confirmed via `grep -r "ctx.loaders\|DataLoaderManager\|GraphQLLoader" src/modules` → 0 hits). Only one trivial `@FieldResolver` exists in the entire module set (`media.resolver.ts`, a computed field with no DB call), so there is currently no per-row N+1 pattern that these would fix.
**Impact:** Not biting today because relation-loading is instead solved by the `@GQLQuery()`/`GqlSelectOptions` "parse selection set → single joined query" mechanism (used by ~9 of 16 modules). But it means if a future `@FieldResolver` doing a per-parent DB call is added (as ad hoc code, since the safety net is unused and easy to forget exists), nothing catches the resulting N+1 in review by convention.
**Suggested direction:** Either wire `ctx.loaders` into new `@FieldResolver`s going forward and document it as the required pattern, or remove the unused subsystem to reduce surface area.

**3. File:** `src/core/shared/decorators/search-index.decorator.ts:16-42`, `src/core/infrastructure/database/base.abstract.repository.ts:1011-1039`
**Category:** organization / performance
**Severity:** Minor
**Problem:** `@SearchIndex` (which registers accent-insensitive, GIN-backed search columns for `ABaseRepository`'s `search`/`searchFields` pagination arg) is used by 0 of the 16 CMS modules — only `tenant`/`unit` (outside this scope) use it. Every CMS-module `search` call therefore either requires the resolver to pass `searchFields` explicitly, or hits the `console.warn` branch at `base.abstract.repository.ts:1011-1017` and silently applies no search filter; even when `searchFields` is passed, matching falls back to `ILIKE '%term%'` (leading wildcard, unindexed) instead of the `lcu()`-backed indexed path.
**Impact:** Admin-facing search (e.g. searching pages/content entries/components by name) degrades to full-table `ILIKE` scans as row counts grow, with no code-level signal that this is happening beyond a runtime console warning.
**Suggested direction:** Add `@SearchIndex()` to the obvious human-readable text columns on `page.internalName`, `contentType.label`, `component.label`, `theme.name`, etc.

**4. File:** `src/core/infrastructure/database/deletionPolicy.service.ts:44-233`, `src/core/shared/decorators/deletionPolicy.decorator.ts:27-42`
**Category:** organization
**Severity:** Important
**Problem:** A real transactional cascade-delete engine (`@DeletionPolicy`/`@CascadeChild`, RESTRICT/SET_NULL/CASCADE_SOFT/CASCADE_HARD) exists in core, but 0 of the 16 CMS modules declare it (only the `tenant` module, outside scope, uses it) despite obvious parent-child relationships: Page→Node tree, Taxonomy→Term, ContentType→ContentEntry, Menu→MenuItem, Component→its definition-page Node tree. Every one of these instead hand-rolls its own cascade in the application layer — `NodeService.deleteSubtree`'s own comment explicitly says why: *"không có FK cascade ở DB (parentId chỉ @Index, không @ForeignKey), nên xoá đệ quy phải tự làm ở application layer"* — i.e. the team is aware DB-level cascade doesn't exist and hand-writes the BFS-delete workaround instead of wiring up the engine core already built for exactly this.
**Impact:** Every CMS-module delete falls through core's "not declared" warning path (`deletionPolicy.service.ts:153-157`, a `logger.warn` on every single delete of these entities) — noisy in production logs — and cascade correctness for tree data depends entirely on each module's own hand-written recursive delete being bug-free (see the Node/Component subtree-delete bugs already found and fixed per module history), rather than one hardened, tested, generic mechanism.
**Suggested direction:** Migrate at least Page→Node and Taxonomy→Term to `@DeletionPolicy`/`@CascadeChild`, or explicitly document why the hand-rolled BFS approach is intentionally preferred for these specific trees (e.g. because the generic engine doesn't understand "auto-repoint `rootNodeId`" semantics).

**5. File:** `src/core/shared/dto/pagination.dto.ts:21-82`
**Category:** duplication-reuse
**Severity:** Important
**Problem:** `GQLPaginationArgs`/`PaginatedResponse()` (cursor+offset pagination, `MAX_PAGINATION_LIMIT=200` cap) is adopted by 9-10 of 16 modules but bypassed entirely by 6: `theme`, `menu`, `artDirectionKit`, `headerPreset`, `footerPreset`, `siteSettings` — each instead exposes a plain `getAllX(): [XEntity]` backed by an unbounded `findByCondition({order:...})` call (see B.2/E.5 for exact sites). `node`'s `getNodesByPage` is a reasonable exception (bounded by `MAX_NODES_PER_PAGE=500` at the write layer).
**Impact:** These 6 modules bypass the 200-row cap entirely — as the number of themes/header-footer presets/kits/menus grows (more tenants, more brand variants), these become fully unbounded admin-picker queries with no code-level backstop.
**Suggested direction:** Route these through `findAllPagination`/`PaginatedResponse` like the other 10 modules, or explicitly cap with `take: N` if pagination UI genuinely isn't needed for low-cardinality admin pickers.

**6. File:** `src/core/shared/utils/tenancyScope.util.ts:32-85`, `src/core/shared/utils/sameTenant.guard.ts:33-54`
**Category:** organization
**Severity:** Minor
**Problem:** `tenancyScope.util.ts` was explicitly written to replace ad-hoc `filter.tenantId` injection scattered across resolvers (per its own header comment), but only `codeConfig` among the 16 CMS modules uses it — and `codeConfig` is also the *only* one of the 16 that is tenant-scoped at all (`extends BaseWithTenantEntity`). Every other CMS module (`page`, `node`, `contentEntry`, `taxonomy`, `theme`, etc.) has no tenant column and no tenancy scoping whatsoever. `sameTenant.guard.ts` (cross-tenant FK-reference integrity check) has zero callers anywhere in `src/modules/**`.
**Impact:** If this system is meant to support multiple tenants/brands sharing one deployment (an explicit axis this audit was asked to consider — "more tenants" as a scaling dimension), only 1 of 16 CMS modules actually enforces tenant isolation; the rest assume single-tenant-per-deployment implicitly, with no guard rail (`sameTenant.guard.ts`) wired up anywhere to catch a foreign-key input (e.g. `contentEntry.contentTypeId`, `node.pageId`) that crosses a tenant boundary if one is ever introduced.
**Suggested direction:** If multi-tenancy is intended for the content domain, decide and document it explicitly (either "CMS content is deliberately single-tenant-per-deployment" or extend `BaseWithTenantEntity`/`tenancyScope.util.ts` to the rest of these 16 modules) rather than leaving it as an unstated asymmetry.

---

### B. Config/preset modules (`theme`, `headerPreset`, `footerPreset`, `artDirectionKit`, `codeConfig`, `siteSettings`)

**1. File:** `src/modules/headerPreset/application/services/headerPreset.service.ts:19-45`, `src/modules/footerPreset/application/services/footerPreset.service.ts:19-45`, `src/modules/theme/application/services/theme.service.ts:40-75`, plus repositories `headerPreset.repository.ts:10-12`, `footerPreset.repository.ts:10-12`, `theme.repository.ts:10-12`
**Category:** duplication-reuse
**Severity:** Important
**Problem:** `createPreset`/`createTheme` (auto-default-if-first), `setDefault` (2-step `updateManyByCondition({isDefault:true},{isDefault:false})` + `updateById(id,{isDefault:true})`), `deletePreset`/`deleteTheme` (reassign default to the next-oldest remaining row before soft-deleting), and `findDefault()` are hand-copied near-verbatim across all three modules:
```ts
// identical in headerPreset.service.ts:29-33, footerPreset.service.ts:29-33, theme.service.ts:59-63
async setDefault(id): Promise<X> {
    await this.xRepository.updateManyByCondition({ isDefault: true } as any, { isDefault: false } as any);
    return this.updateById(id, { isDefault: true } as any);
}
```
Resolvers repeat the same shape too (`headerPreset.resolver.ts:23-61`, `footerPreset.resolver.ts:23-61`, `theme.resolver.ts:23-61` — identical `getAllX`/`getOneX`/`createX`/`updateX`/`deleteX`/`setDefaultX`, same `STAFF_ROLES`/`ADMIN_ROLES` split, even the same comment wording).
**Impact:** A bug fix to this logic (e.g. the race condition in finding B.4) has to be found and applied 3 separate times; it's easy to fix one copy and miss the others, and every new preset-shaped module (this pattern is clearly still growing) means another hand-copied trio.
**Suggested direction:** Extract a `DefaultableConfigService<T>`/`DefaultableConfigRepository<T>` base (parallel to `BaseService`/`ABaseRepository`) owning `findAll(order)`, `findDefault()`, `createWithAutoDefault()`, `setDefault()`, `deleteWithDefaultReassignment()`.

**2. File:** `src/modules/artDirectionKit/application/services/artDirectionKit.service.ts:21-23`, `src/modules/headerPreset/application/services/headerPreset.service.ts:11-13`, `src/modules/footerPreset/application/services/footerPreset.service.ts:11-13`, `src/modules/theme/application/services/theme.service.ts:32-34`, `src/modules/menu/application/services/menu.service.ts:10-12`
**Category:** duplication-reuse / performance
**Severity:** Important
**Problem:** All five modules implement an identical unbounded `findAll()`: `return this.xRepository.findByCondition({ order: { createdAt: 'ASC' } as any });` — no `limit`/`take`, exposed as a plain `[XEntity]` (not `PaginatedX`) on the resolver (see A.5 for the shared-DTO angle).
**Impact:** Low risk today (few presets per deployment), but grows directly with "more tenants"/"more brand variants" — each of these returns every row's full jsonb blob (colors/typography/layout/motion for Theme, navLinks/animation/cta for HeaderPreset, etc.) in one response on every admin-picker load, with no cap.
**Suggested direction:** Route through `findAllPagination`/`PaginatedResponse`, or add an explicit sane `take` cap as a guard rail if these are deliberately kept as simple admin-picker lists.

**3. File:** `src/modules/headerPreset/domain/entities/headerPreset.entity.ts:24-26`, `src/modules/footerPreset/domain/entities/footerPreset.entity.ts:23-25`, `src/modules/theme/domain/entities/theme.entity.ts:66-68`
**Category:** performance
**Severity:** Important
**Problem:** `isDefault: boolean` is the column `findDefault()` queries (`WHERE isDefault = true`) — the single most frequently executed query in this module set, since it's called on essentially every public page render (see B.5) — yet none of the three entities has an `@Index` on it. No migration files exist for these tables (schema comes solely from `DB_SYNCHRONIZE`-driven entity decorators), so no index exists at the DB level either.
**Impact:** Invisible with a handful of rows today; becomes a full table scan on the hottest read path in this module set as the preset library grows.
**Suggested direction:** Add `@Index(['isDefault'])`, or better, a partial unique index enforcing "at most one true" (which also fixes B.4's race condition).

**4. File:** `src/modules/siteSettings/application/services/siteLocaleSettings.service.ts:17-21`; same race-shape in B.1's `setDefault()`
**Category:** organization (correctness)
**Severity:** Minor
**Problem:** `getSettings()` is a plain read-then-create with no transaction and no DB-level unique constraint to fall back on:
```ts
async getSettings(): Promise<SiteLocaleSettingsEntity> {
    const existing = await this.siteLocaleSettingsRepository.findOneByCondition({ where: {} });
    if (existing) return existing;
    return this.create({ enabledLocales: ['vi'], defaultLocale: 'vi' });
}
```
Two concurrent cold-start requests to the `@GQLPublic()` `getSiteLocaleSettings` query could both see `existing === null` and both insert a row, breaking the "true singleton" invariant the entity's own header comment claims. The `setDefault()` 2-step update (B.1) has the same non-atomicity: a concurrent `createPreset`/`setDefault` race can transiently leave 0 or 2 rows with `isDefault: true`.
**Impact:** Low-probability, but grows with admin concurrency (multiple editors, seed scripts running alongside live traffic).
**Suggested direction:** Add a DB-level partial unique index (`WHERE isDefault = true` per preset table; a genuine single-row constraint for `site_locale_settings`), and/or wrap these in a transaction with row locking.

**5. File:** `src/modules/page/infrastructure/http/graphql/page.resolver.ts:75-92` (`resolveHeaderFooter`, `resolveTheme`), called from `:100-104`, `:119-123`; plus `siteLocaleSettings.resolver.ts` (`getSiteLocaleSettings`, `@GQLPublic()`)
**Category:** performance
**Severity:** Critical
**Problem:** No module in this set (nor core, for these entities — see A.6) caches reads. Every public page render resolves header/footer/theme with up to 2 queries each (`findById` then `findDefault()` fallback if unset/dangling):
```ts
const resolveHeader = async () =>
    (page.headerPresetId ? await this.headerPresetService.findById(page.headerPresetId) : null)
        ?? this.headerPresetService.findDefault();
```
— i.e. up to 6 DB round trips just for chrome/theme on `pageResolver`/`previewPageResolver` (the `@GQLPublic()` query the FE catch-all route hits on every page view), plus another uncached query for locale settings, for data that changes maybe a few times a month.
**Impact:** This is a guaranteed multiplier on DB load directly proportional to raw page-view traffic, compounding with every other per-request cost in the render path (node-tree fetch, `findDetailBinding`, etc.) — the single biggest "won't survive real traffic" risk found in this whole audit.
**Suggested direction:** Cache `findDefault()`/`findById()` for these 4 config-blob modules with a short TTL (30-60s) or explicit invalidation on write via the `eventBus` hooks `BaseService` already fires (`<entity>.updated`) — the Redis `cacheManager` infra to do this already exists and is otherwise completely unused by business modules (see A.2/A.6).

**6. File:** `src/modules/component/application/services/component.service.ts:126-129` (`assertKeyAvailable`), `src/modules/component/domain/entities/component.entity.ts:20-23`
**Category:** duplication-reuse / correctness
**Severity:** Important
**Problem:** `ComponentDefinitionEntity.key` still uses a plain `@Index({ unique: true })` (no `deletedAt IS NULL` scoping). The exact same bug class was found live, root-caused, and *correctly fixed* one module over on `ContentTypeEntity.key` (`src/modules/contentType/domain/entities/contentType.entity.ts:14-26`, `@Index({ unique: true, where: '"deletedAt" IS NULL' })`, with a detailed comment explaining a plain unique index still counts soft-deleted rows). For Component (and, per Page's `deletePage` comment, `PageEntity.path` too — `page.entity.ts:19`), the team instead worked around it by hard-deleting at the one call site that reproduced the crash (`component.service.ts:807-815`'s comment explicitly names this same bug and explains the hard-delete workaround) — a narrower fix than the general one already proven to work for ContentType.
**Impact:** The fix only holds for the one call site that was patched; any other future code path that soft-deletes a `ComponentDefinitionEntity`/`PageEntity` (e.g. `restoreById`, which exists generically on `ABaseRepository` and is available to be called on these entities) reintroduces the exact same opaque unique-violation crash the workaround was meant to prevent.
**Suggested direction:** Apply the same partial-unique-index fix already proven on `ContentType.key` to `ComponentDefinitionEntity.key` and `PageEntity.path`, rather than relying on point-fix workarounds at individual call sites.

---

### C. Node / Page / Component (tree, versioning, component system)

**1. File:** `src/modules/page/domain/entities/pageVersion.entity.ts:13-32`, `src/modules/page/application/services/pageVersion.service.ts` (whole file), `src/modules/page/application/services/page.service.ts:200-215` (`publish`)
**Category:** performance
**Severity:** Important
**Problem:** Every `publishPage` inserts a new `page_version` row whose `snapshot` jsonb holds the entire `PageEntity` plus every `NodeEntity` of the page's tree (up to 500 nodes, each carrying 6+ jsonb columns — style/layout/props/dataBinding/repeat/visibilityRules/responsiveOverrides/animationRef/advanced):
```ts
await this.pageVersionRepository.create({ pageId: id, snapshot: { page: updated, nodes: nodesSnapshot }, publishedBy, label });
```
Confirmed via repo-wide grep (`prune|archive|MAX_VERSION`) — zero matches anywhere in `src/modules/page`. No hard/soft cap on version count per page, no scheduled cleanup. `listByPage()` (`pageVersion.service.ts:28-46`) does correctly `select` away the `snapshot` column for the list view (good optimization already present), but underlying storage cost is still unbounded.
**Impact:** A page published frequently (a normal CMS draft→publish cycle) accumulates one full-tree JSON snapshot per publish forever; hundreds of publishes across hundreds of pages → unbounded, multi-GB growth of `page_version` with no reclaim path short of manual DB intervention.
**Suggested direction:** Add a retention policy (keep last N versions per page, or prune versions older than X days) either inline in `publish()` after insert, or as a scheduled cron job (the `cron` infra already exists in core).

**2. File:** `src/modules/component/application/services/component.service.ts:707-786` (`publishComponent`), `:826` (`deleteComponentDefinition`), `:319-321`/`:299-355` (`cloneDefinitionIntoPage`)
**Category:** performance
**Severity:** Critical
**Problem:** `publishComponent` fetches every instance of a component site-wide with **no limit**:
```ts
const instanceRoots = await this.nodeService.findByCondition({ where: { componentDefinitionId: componentId } as any });
```
then processes each one **fully sequentially** in a `for` loop — clone (itself an O(N)-sequential-query subtree clone, see C.3), a per-node `updateById` for every cloned node's tag (`cloneDefinitionIntoPage:319-321`), a `deleteSubtree` of the old instance, plus 1-3 more conditional `updateById`/`findById` calls for order/layout restoration — with no transaction wrapping the loop and no batching. `deleteComponentDefinition` (`:826`) has the identical unbounded instance fetch.
**Impact:** Total DB round trips for one `publishComponent` call ≈ O(instances × nodes-per-definition), entirely serialized. A component with a 50-node definition placed on 200 pages is 10,000+ sequential awaited queries on a single publish click — and this is exactly the growth trajectory the project's own Phase 6 Section/Pattern Library work (23 curated Sections across many pages) points toward. No page/limit safety valve exists at all.
**Suggested direction:** Batch-fetch all descendants up front (already have `collectDescendantIds`), bulk-insert clones instead of one `create` per node, batch the tag/override updates (`UPDATE ... WHERE id IN (...)`), and parallelize independent instances (`Promise.all` with a concurrency cap) instead of a single serial loop.

**3. File:** `src/modules/node/application/services/node.service.ts:291-302` (`cloneNodeRecursive`), `:352-369` (`cloneNodeRecursiveWithIdMap`), `:37-47` (`getDepth`), `:51-64` (`assertNoCycle`), `:83-98` (`getSubtreeHeight`), `:206-224` (`collectDescendantIds`)
**Category:** performance
**Severity:** Important
**Problem:** Every recursive clone step does 2 sequential queries (sibling count + child fetch) plus 1 insert per node — genuinely O(N) sequential round trips for an N-node subtree, not batched or parallelized. Separately, `getDepth`/`assertNoCycle` walk the parent chain via one `findById` per ancestor level (up to `MAX_TREE_DEPTH+5`=35 sequential round trips), and `getSubtreeHeight`/`collectDescendantIds` do one query per tree *level* via BFS. `createNode`/`moveNode` each trigger 2-3 of these helpers, so a single node create/move in a deep tree can issue 30+ sequential DB round trips.
**Impact:** Currently bounded by `MAX_TREE_DEPTH=30`/`MAX_NODES_PER_PAGE=500` (real, enforced caps — not a false safety net), so not unbounded today, but every one of these is O(depth) or O(N) sequential round trips instead of O(1). Worth watching if either cap is ever raised, and already meaningfully slow for near-cap trees.
**Suggested direction:** A recursive CTE (`WITH RECURSIVE`) for ancestor-chain checks (depth/cycle) turns ~30 round trips into 1; batch-insert for subtree clones as in C.2.

**4. File:** `src/modules/page/application/services/page.service.ts:340-388` (`findDetailBinding`), `:297-302` (`findPublishedStaticPages`); resolver `src/modules/page/infrastructure/http/graphql/page.resolver.ts:186-193` (`getPublicDetailPathByContentType`, `@GQLPublic()`), `:217-323` (`getSitemapUrls`)
**Category:** performance
**Severity:** Important
**Problem:** `findDetailBinding` unconditionally fetches **all published pages** with no limit, and — when no legacy `Page.dataBinding` candidate exists (the documented common case post-migration) — does a `Promise.all` of `nodeService.findByPage(page.id)` for **every** STATIC_MODULAR/SPECIAL published page just to find one page whose node tree contains a matching `repeat` config:
```ts
const nodeCandidates = legacyCandidates.length ? [] : (await Promise.all(
    publishedPages.filter(...).map(async (page) => {
        const nodes = await this.nodeService.findByPage(page.id);
        ...
```
This runs from a **public, unauthenticated GraphQL query** called by the FE per Card-List/Table Node with `linkToDetail` — i.e. on every public page render that has a "related products"-style card list. `getSitemapUrls` compounds this further, calling `findDetailBinding` again per `(contentType × locale)` combination with no caching/dedup across the outer loop.
**Impact:** Cost grows linearly with total published-page count, on a hot public per-request path (not an admin batch job) — the second-worst render-path performance risk in this audit after B.5, and it compounds with it (the same page render already pays B.5's uncached header/footer/theme cost).
**Suggested direction:** Cache `findDetailBinding` results per `(contentTypeId, locale)` (they only change on publish/node-tree edit of relevant pages), or precompute/store the binding on publish instead of re-deriving it from a full page+node scan on every read.

**5. File:** `src/modules/node/application/services/node.service.ts:51-64` (`assertNoCycle`), `src/modules/taxonomy/application/services/term.service.ts:25-38` (`assertNoCycle`), `src/modules/component/application/services/component.service.ts:224-247` (`assertNoComponentCycle`), `src/modules/menu/application/services/menuItem.service.ts:24-37` (`assertNoCycle`)
**Category:** duplication-reuse
**Severity:** Important
**Problem:** Four modules independently implement the identical "walk up the parent chain via sequential `findById`, bail if the id reappears, cap at N iterations" cycle-detection algorithm. The code's own comments admit the duplication — `node.service.ts:50`: *"cùng thuật toán với TermService.assertNoCycle"*; `component.service.ts:220-221`: *"Cùng thuật toán capped-parent-walk với TermService.assertNoCycle/NodeService.assertNoCycle"*; `menuItem.service.ts:19-20`: *"Dịch 1-1 từ TermService.assertNoCycle"*. No shared helper (e.g. `assertNoCycle(id, candidateParentId, getParent)`) exists in `src/core`.
**Impact:** Four copies to keep in sync; a fix to the walk-limit/off-by-one logic in one (as has already happened per the comments) doesn't propagate to the other three.
**Suggested direction:** Extract to `src/core/shared/utils/cycleGuard.util.ts`, taking a generic parent-lookup function, and have all four call sites delegate to it.

**6. File:** `src/modules/page/application/services/page.service.ts:49-54` (`assertPathAvailable`) vs. `src/modules/contentEntry/application/services/contentEntry.service.ts:111-158` (`resolveUniqueFields`/`ensureUniqueValue`) vs. `src/modules/component/application/services/component.service.ts:126-129` (`assertKeyAvailable`) vs. `src/modules/contentType/application/services/contentType.service.ts:13-18`/`taxonomy.service.ts:13-18` (`assertKeyAvailable`) vs. `src/modules/taxonomy/application/services/term.service.ts:13-18` (`assertSlugAvailable`)
**Category:** duplication-reuse
**Severity:** Minor
**Problem:** At least 5 independent implementations of "check existence, throw `ConflictException`" exist across these modules, with real behavioral divergence: `ContentEntryService.ensureUniqueValue` auto-generates a unique value with a numeric-suffix retry loop (up to 50 attempts) and locale-scoping; `PageService`/`ComponentService`/`ContentTypeService`/`TaxonomyService`/`TermService` all just throw and require the admin to pick a different value manually — no auto-suffix, no shared helper.
**Impact:** Any future fix to uniqueness semantics (race-condition handling, locale-scoping, auto-suffix behavior) has to be applied in up to 5 separate places; behavior has already visibly diverged (only ContentEntry auto-generates).
**Suggested direction:** Extract a shared `assertUniqueOrGenerate(repository, field, candidate, scope, excludeId, { autoSuffix?: boolean })` helper used by all five.

**7. File:** `src/modules/contentEntry/application/services/contentEntry.service.ts:21-100` (`validateData`) vs. `src/core/shared/utils/fieldDataValidation.util.ts:13-44` (`validateFieldData`)
**Category:** duplication-reuse
**Severity:** Important
**Problem:** `fieldDataValidation.util.ts`'s own header comment states its purpose is to be the *single* shared implementation ("mirror ContentEntryService.validateData... tránh 2 bản copy lệch nhau" — "avoid 2 diverging copies"), used by `FormSubmissionService`. Despite that stated goal, it **is** a second, narrower copy (required + TEXT/RICHTEXT minLength/maxLength/pattern only, missing NUMBER/BOOLEAN/SELECT/TAXONOMY/RELATION/GALLERY/REPEATER handling that `ContentEntryService.validateData` has). Both files independently carry the identical `!= null` (loose-equality) fix for the same GraphQL-`null`-vs-`undefined` bug (`contentEntry.service.ts:32-39` vs. `fieldDataValidation.util.ts:20-26`) — i.e. the same bug was found and fixed twice, in two copies, instead of once.
**Impact:** Any future rule addition (new field type, new constraint) must be applied in both places or silently diverges between ContentEntry validation and Form/Booking `extraData` validation against the same `FieldDefinitionType[]` schema — which has already nearly happened once (the null-check bug).
**Suggested direction:** Have `ContentEntryService.validateData` delegate to (or be replaced by) `validateFieldData`, extended to cover the field types it's currently missing, with `unique` handled as a documented separate pass.

**8. File:** `src/modules/component/infrastructure/http/graphql/component.resolver.ts:44-58` (`getOneComponent`, `getAllComponent`) vs. `src/modules/contentType/infrastructure/http/graphql/contentType.resolver.ts:38-40` (`getAllContentType`)
**Category:** organization
**Severity:** Important
**Problem:** `getAllContentType` carries both `@GQLAuthorized(STAFF_ROLES)` and `@GQLPermission({ permission: CONTENT_TYPE_MANAGE, onForbidden: 'empty' })`. `getOneComponent`/`getAllComponent` carry only `@GQLAuthorized(STAFF_ROLES)` — no `@GQLPermission` at all, so any authenticated staff role (regardless of granted permission bundle) can list/read every reusable Component definition. Taxonomy has the same read-side gap but with an explicit code comment justifying it (editors need the taxonomy list to assign TAXONOMY-type fields); no equivalent justification exists for Component.
**Impact:** Inconsistent least-privilege enforcement — reading component definitions (which can embed arbitrary custom code/structure per the Phase 2 Custom-Code node work) is available to any staff role, unlike the analogous ContentType read.
**Suggested direction:** Add `@GQLPermission({ permission: COMPONENT_MANAGE, onForbidden: 'empty' })` to `getOneComponent`/`getAllComponent`, or document why component reads are intentionally staff-wide.

**9. File:** `src/modules/node/application/services/node.service.ts:194-198` (`reorder`)
**Category:** performance
**Severity:** Minor
**Problem:** `reorder()` issues one `UPDATE` per item in a sequential loop (`for (const item of items) { await this.nodeRepository.updateOneByCondition(...) }`), called on every drag-reorder in the canvas editor.
**Impact:** Bounded by sibling count (typically small), but is O(N) round trips instead of a single batched update; `PageVersionService.restore()` has the same shape at larger scale (recreates an entire tree one `createNode()` at a time, bounded by `MAX_NODES_PER_PAGE=500` but each call itself does 3-4 validation queries).
**Suggested direction:** Batch via a single `CASE WHEN id=... THEN ...` update or wrap in `Promise.all` inside a transaction.

**10. File:** `src/modules/node/domain/entities/node.entity.ts:14-23`
**Category:** performance
**Severity:** Minor
**Problem:** `pageId` and `parentId` each get an independent single-column `@Index()`, but the hottest child-lookup query shape filters on **both together** (e.g. `component.service.ts:277-280`, `node.service.ts:215-217`/`359-361`), forcing Postgres into a bitmap-AND across two indexes instead of one composite-index scan.
**Impact:** Minor at today's per-page node cap (500), but grows as total node count across all pages increases.
**Suggested direction:** Add `@Index(['pageId', 'parentId'])`.

---

### D. ContentEntry / ContentType

**1. File:** `src/modules/contentEntry/domain/entities/contentEntry.entity.ts:17-71`, `src/modules/contentEntry/infrastructure/persistence/contentEntry.repository.ts:53-105` (`applyFieldCondition`), `:115-126` (`existsByFieldValue`), `:198-249` (`findPublicList`/`countPublicList`)
**Category:** performance
**Severity:** Important
**Problem:** `ContentEntryEntity` has only independent single-column `@Index()`s on `contentTypeId`, `status`, `translationGroupId`, `viewCount` — **no index on `locale`**, and **no GIN/expression index on the `data` jsonb column at all**. Every dynamic-field filter/sort/uniqueness-check does `data->>'key'` (optionally `::numeric`-cast) with nothing to index against; `existsByFieldValue` (run on *every* create/update of any `unique`/`autoGenerateFrom` TEXT field) does `WHERE contentTypeId = X AND data->>'fieldKey' = Y AND locale = Z` with no composite index covering the shape, and the hottest public-read shape (`findPublicList`/`countPublicList`: `contentTypeId + status + locale`) has no composite index either — it relies on Postgres bitmap-ANDing 3 separate single-column indexes. This is a partially-acknowledged tradeoff (`fieldDefinition.dto.ts:32-34` explicitly notes dynamic field keys can't get static per-field indexes), but the locale/composite gaps are not discussed anywhere.
**Impact:** A Content Type with a large row count and a `unique` field (e.g. "SKU"/"email", checked on every save) does a sequential scan + jsonb-extract over every row of that content type on every write; the public entry-listing path (the most frequently hit query in the whole CMS at runtime) also can't use one covering index.
**Suggested direction:** Add `@Index()` on `locale` and a composite `(contentTypeId, status, locale)` index at minimum (cheap, doesn't require solving the dynamic-schema problem); consider a GIN index on `data` (`jsonb_path_ops`) for containment-style lookups, or materializing `unique`/`autoGenerateFrom` fields into a side lookup table keyed by `(contentTypeId, fieldKey, locale, value)` with a real unique index instead of JSONB scanning per uniqueness check.

**2. File:** `src/modules/contentEntry/application/services/contentEntry.service.ts:111-145` (`resolveUniqueFields`)
**Category:** performance
**Severity:** Minor
**Problem:** Iterates `fields` with a sequential `await this.contentEntryRepository.existsByFieldValue(...)` per TEXT field marked `unique`/`autoGenerateFrom` — N sequential existence-check queries per entry save instead of one batched query.
**Impact:** Low today (schemas typically have a handful of unique fields), grows linearly with schema richness.
**Suggested direction:** Batch into a single query keyed by `(fieldKey, value)` pairs where possible, or `Promise.all` the independent checks.

**3. File:** `src/modules/contentType/domain/entities/contentType.entity.ts` vs. `src/modules/taxonomy/domain/entities/taxonomy.entity.ts:11-14` vs. `src/modules/taxonomy/domain/entities/term.entity.ts:9`
**Category:** duplication-reuse / correctness
**Severity:** Important
**Problem:** (Cross-reference of C.6's finding, restated for this pairing) `ContentType.key` has the correct `deletedAt IS NULL`-scoped partial unique index; `Taxonomy.key` (`@Index({ unique: true })`) and `Term`'s `@Unique(['taxonomyId', 'slug'])` do not. `TaxonomyService.assertKeyAvailable`/`TermService.assertSlugAvailable` both correctly exclude soft-deleted rows at the app level (same as `ContentType`'s pre-fix code did), meaning the identical live bug ContentType already hit is fully reproducible here: delete a Taxonomy/Term, recreate one with the same key/slug, and it fails with a raw Postgres unique-violation despite the app-level check reporting the value as free.
**Impact:** A normal admin workflow (delete-then-recreate a taxonomy or term with the same name) will hit this the first time it's tried in Taxonomy/Term, exactly as it did for ContentType before that fix.
**Suggested direction:** Apply the same `where: '"deletedAt" IS NULL'` partial-index pattern to `TaxonomyEntity.key` and `TermEntity`'s `(taxonomyId, slug)` unique constraint.

**4. File:** `src/modules/contentType/application/services/contentType.service.ts:1-49`
**Category:** organization
**Severity:** Minor (positive/no-action note)
**Problem:** N/A — `ContentTypeService` is a clean, well-scoped example of module-specific validation (`assertUniqueFieldKeys`, REPEATER-nesting-depth guard) layered directly on `BaseService` with no unnecessary abstraction. Included for contrast with the modules above: not every module needs a shared base — this one's validation is genuinely unique to ContentType's schema-definition role.
**Impact:** None — informational.
**Suggested direction:** None.

---

### E. Form / Media / MediaSet / Menu

**1. File:** `src/modules/form/infrastructure/http/graphql/form.resolver.ts:76-81` (`getAllFormSubmission`), `src/modules/form/domain/entities/formSubmission.entity.ts:8-18`
**Category:** performance
**Severity:** Critical
**Problem:** `getAllFormSubmission(formId)` calls `formSubmissionService.findByCondition({ where: { formId }, order: { createdAt: 'DESC' } })` — fully unbounded, no pagination args at all, unlike every other list endpoint that has `findAllPagination` available. `FormSubmissionEntity` has only a single-column `@Index()` on `formId`, no composite `(formId, createdAt)` index for the `ORDER BY createdAt DESC` this exact query performs, and there is no archiving/TTL mechanism anywhere in the module.
**Impact:** A popular public form (contact/booking/newsletter) can accumulate unbounded rows over time. Every "view submissions" admin call does a full scan + in-memory sort of an ever-growing result set, and the GraphQL response payload itself is unbounded — the only list endpoint in these 16 modules with no cap of any kind (not even the informal `findByCondition` caps other modules at least bound by low cardinality).
**Suggested direction:** Route through `findAllPagination({ filter: { formId }, sort: { createdAt: 'DESC' } }, ...)`; add a composite `(formId, createdAt)` index; add a retention/archiving policy for old submissions.

**2. File:** `src/modules/media/domain/entities/media.entity.ts:37-45` (`ownerId`/`ownerType`), `src/modules/media/application/services/media.service.ts:77-82` (`bindMediaToOwner`)
**Category:** duplication-reuse
**Severity:** Important
**Problem:** `MediaEntity` has a purpose-built generic polymorphic-relation shape (`ownerId` indexed + `ownerType`, e.g. "User"/"Product") and a service method `bindMediaToOwner(fileIds, ownerId, ownerType)` meant to be the reusable "attach media to X" mechanism — but a repo-wide grep for `ownerType`/`ownerId` outside `media/` finds zero callers, and `bindMediaToOwner` has zero callers anywhere. `page`/`node`/`contentEntry` never reference `MediaEntity` at all — they embed raw media ids/urls inside their own jsonb fields instead (consistent with the previously-fixed Phase 8 bug: node fields storing a bare Media id instead of its url).
**Impact:** The one generic, reusable media-attachment mechanism in the system is dead code — every consuming module either doesn't formally track media ownership at all or would reinvent its own linking approach, and there's no single place to answer "what media does entity X use." More concretely, `MediaService.cleanOrphanedMedias`/`MediaManager`'s weekly cron only catches media with `ownerId IS NULL` — since nothing ever calls `bindMediaToOwner`, no media created via a form/page/node flow ever has `ownerId` set, so the orphan sweep can only ever act on the narrow presigned-upload flow's own rows, not the actual bulk of media referenced from JSONB — and can't distinguish "still referenced in a page's JSONB" from "truly orphaned," risking deletion of in-use media as content volume grows.
**Suggested direction:** Either wire `bindMediaToOwner` into the page/node/contentEntry save flows so the orphan sweep becomes trustworthy, or replace the orphan-check with a reference-scan against JSONB before deletion, and remove the dead polymorphic mechanism if it's being abandoned.

**3. File:** `src/modules/media/infrastructure/http/graphql/media.resolver.ts:20,30,44` (create/update/generatePresignedUrl), `src/modules/mediaSet/infrastructure/http/graphql/mediaSet.resolver.ts` (create/update/delete)
**Category:** organization (authorization gap)
**Severity:** Important
**Problem:** Media/MediaSet mutations carry only `@GQLAuthorized(Object.values(ERole))` (any authenticated staff role) — no `@GQLPermission` check — unlike Form/Menu/Page/ContentEntry, which all gate the equivalent mutations with both `@GQLAuthorized` and `@GQLPermission({ permission: ..._MANAGE })`. A dedicated `EPermission.MEDIA_MANAGE` already exists and is wired into a real permission bundle (`src/modules/permission/enums/permission.enum.ts`), it's just never referenced from either resolver.
**Impact:** Any authenticated staff account, regardless of assigned permission bundle, can currently create/update/delete media and media sets — the fine-grained permission model governing every sibling module is bypassed entirely here. As the RBAC/permission system is extended with narrower role bundles, this is a real authorization hole, not just a stylistic inconsistency.
**Suggested direction:** Add `@GQLPermission({ permission: EPermission.MEDIA_MANAGE, onForbidden: 'throw' })` to Media/MediaSet create/update/delete mutations.

**4. File:** `src/modules/mediaSet/domain/entities/mediaSet.entity.ts:14-19`
**Category:** performance
**Severity:** Important
**Problem:** `medias: MediaEntity[]` is `@OneToMany(..., { cascade: true, eager: true })` — every `MediaSet` load, including inside paginated list views (`getAllMediaSet`), eagerly LEFT JOINs and returns **all** of that set's media rows with no cap, regardless of whether the caller's GraphQL selection even asked for `medias`.
**Impact:** A media set used as a large photo gallery/album can grow to hundreds of images; paginating the MediaSet list still fully materializes every image row of every set on the page, inflating both the query result and the response payload unconditionally.
**Suggested direction:** Drop `eager: true` and let callers request `medias` explicitly via the `GqlSelectOptions`/`@GQLQuery()` mechanism already used elsewhere in this resolver; add a dedicated paginated field resolver for `medias` if large sets need to page internally.

**5. File:** `src/modules/menu/application/services/menu.service.ts:10-12`, `src/modules/menu/infrastructure/http/graphql/menu.resolver.ts:24-28`
**Category:** duplication-reuse / performance
**Severity:** Important
**Problem:** Same shape as B.2 — `MenuService.findAll()` is an unbounded `findByCondition({order:{createdAt:'ASC'}})` exposed as plain `[MenuEntity]`, while sibling modules Form and MediaSet both correctly use `findAllPagination`/`PaginatedResponse`.
**Impact:** As Menu count grows (multi-site/multi-brand), `getAllMenu` returns the entire table in one unbounded response with no way to page it.
**Suggested direction:** Switch to `findAllPagination` + `PaginatedResponse(MenuEntity)` matching Form/MediaSet, or document the assumption if menu count is provably small and bounded by business rule.

**6. File:** `src/modules/menu/application/services/menuItem.service.ts:45-59` (`findByMenu`)
**Category:** performance
**Severity:** Minor (positive finding, for contrast)
**Problem:** N/A — `findByMenu` fetches all `MenuItemEntity` rows for a menu in one flat query (tree assembled client-side from `parentId`), then batch-resolves the computed `pagePath` field for every `targetType=PAGE` item with a single `IN (...)` query against `PageRepository` — explicitly avoiding a per-item N+1 lookup. Included as a positive contrast to E.2 (Media has no equivalent batching because the resolution path it would need doesn't exist at all).
**Impact:** None — this is the correct pattern.
**Suggested direction:** None; hold up as the reference pattern for any future computed cross-module field.

**7. File:** `src/modules/media/infrastructure/http/controllers/media.controller.ts:18-43`, `src/modules/mediaSet/infrastructure/http/controllers/mediaSet.controller.ts:20-51`
**Category:** duplication-reuse
**Severity:** Minor
**Problem:** Both REST controllers extend `BaseRestController<T>` (which already implements generic `create`/`getAll`/`getById`/`updateOne`/`deleteOne`), yet each re-declares near-identical full method bodies purely to change the role list/cache TTL, and both bypass the base's `buildScope(user)`/safe query parsing in favor of passing raw query straight to `findAllPagination` — which does its own, differently-erroring JSON parsing (`BaseService.parseJsonObjectParam` throws on malformed JSON instead of the base controller's silent `{}` fallback).
**Impact:** Low today since neither entity has `tenantId`/`agencyId` scoping to lose, but it's copy-pasted boilerplate already showing behavioral drift on error handling for malformed `filter`/`sort` query strings.
**Suggested direction:** Override only what actually needs to change (role list/cache TTL) rather than re-implementing full method bodies; route through the same query-parsing path as the base controller.

**8. File:** `src/modules/media/application/dto/media.dto.ts:22-54`, `src/modules/mediaSet/application/dto/mediaSet.dto.ts`
**Category:** duplication-reuse
**Severity:** Minor
**Problem:** `CreateMediaInput`/`UpdateMediaInput` (and the MediaSet equivalents) are 100% field-for-field duplicated declarations instead of one extending the other — contrast `src/modules/form/application/dto/form.dto.ts:17-18`: `export class UpdateFormInput extends CreateFormInput {}`.
**Impact:** Trivial today; real drift risk as fields are added to only one of the pair (already the established pattern elsewhere in this codebase per Form's own convention).
**Suggested direction:** `UpdateMediaInput extends CreateMediaInput` (fields made optional as needed), matching Form's convention.

---

### F. Node/Page DTO-level duplication (minor, repo-wide pattern)

**1. File:** `src/modules/node/application/dto/node.dto.ts:4-36` vs. `src/modules/page/application/dto/page.dto.ts:12-52`
**Category:** duplication-reuse
**Severity:** Minor
**Problem:** Both modules independently declare `Create*Input` and a near-fully-duplicated `Update*Input` (Node: 12/12 fields duplicated verbatim minus `pageId`; Page: 14/15 fields duplicated verbatim) rather than deriving `Update*Input` from `Create*Input`. This mirrors E.8's Media/MediaSet finding — it's a repo-wide convention gap, not specific to Node/Page.
**Impact:** A field added to `NodeEntity`/`PageEntity` requires hand-updating both Input types with nothing enforcing they stay in sync.
**Suggested direction:** If the GraphQL-schema-builder framework in use (`@InputType`/`@Field` decorators) supports a `PartialType(CreateXInput)`-style derivation, use it for every `Update*Input` across the codebase rather than hand-copying field lists — this would resolve C's Node/Page instance, E.8's Media instance, and any other module with the same pattern in one change.
