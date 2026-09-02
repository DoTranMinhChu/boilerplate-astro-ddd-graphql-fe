# ddd-graphql-be — Core Layer Reusability & Scalability Audit

Scope: `src/core/application/**`, `src/core/domain/**`, `src/core/infrastructure/**`, `src/core/shared/**`, `src/bootstrap/**`, `src/config/**`, spot-checked against `src/modules/page`, `src/modules/contentEntry`, `src/modules/emailConfig`, `src/modules/globalSequence`, `src/modules/accountPermission`, `src/modules/permission` and repo-wide greps across all ~29 modules.

## Summary

- **Baseline is genuinely good, not a rewrite candidate.** `BaseService<T>` / `ABaseRepository<T>` are mature (cursor+offset pagination, filter operators, auto search-index, tenant/agency scope merging), a centralized `safeResolve` wrapper in the GraphQL loader means zero resolver files hand-roll try/catch, and 32/35 services + 51/52 repositories actually extend the base classes. Most findings below are concrete exceptions to that baseline, not evidence of systemic rot.
- **Critical correctness/security bug in the permission system, not just a style issue**: `resolveRule`'s AND-containing-OR case in `src/modules/permission/types/scope.types.ts:307-331` silently drops the OR sub-condition instead of failing closed, over-granting access on **list** queries (mutations are unaffected because `recordMatchesRule` handles nesting correctly) — same rule, two different (and inconsistent) enforcement outcomes.
- **The single write path for all permission grants (`setPermissions`) is non-transactional and N+1** (`src/modules/accountPermission/application/services/accountPermission.service.ts:248-272`): delete-then-insert with no `.transaction()`, and per-row `deleteById` calls instead of the bulk `deleteWhere` the repository already exposes (and which has zero callers). A crash mid-write can zero out an account's permissions.
- **`resolvePermission` — the function every `@GQLPermission`-decorated resolver calls before its body runs (64 call sites / 16 resolver files) — is an uncached DB round trip**, despite `cacheManager` existing and being used for an equivalent purpose elsewhere in `base.service.ts`. This is a constant per-request tax across almost the entire schema.
- **`BaseGraphQLResolver<T>` is essentially empty** (`src/core/infrastructure/http/baseGraphql.resolver.ts:5-11` — just a constructor, no CRUD helpers), unlike `BaseRestController<T>` which has real CRUD wiring. Consequence: ~20 resolver files hand-duplicate the identical getOne/getAll/create/update/delete + `findAllPagination(input, fieldOptions)` pattern, verified by grep across `page`, `contentEntry`, `emailConfig`, `admin`, `agency`, `customer`, `tenant`, etc.
- **Real dead/abandoned code inside core itself**: `SearchIndexManager.initialize()` (the code that creates the GIN trigram indexes `@SearchIndex` promises) is never called anywhere — search on `Unit`/`Tenant` silently runs unindexed; a whole parallel RBAC permission engine (`RBAC.service.ts:282-393`, ~110 lines) is built but never invoked (real authorization goes through `authorizeRoles()` only); `GraphQLLoader` duplicates `DataLoaderManager`'s caching but isn't batched and has zero callers; `job.registry.ts`, `scopeCondition.util.ts`, and `sameTenant.guard.ts` (a cross-tenant FK-leak guard!) are all dead — all verified via repo-wide grep.
- **`cacheManager.deletePattern()` uses Redis `KEYS`** (`src/core/infrastructure/cache/cacheManager.ts:113-124`), an O(total-keyspace) blocking scan, fired on every entity write via `base.service.ts:46` — this gets worse, not better, as more modules/tenants add keys to the same Redis instance.
- **Under-adoption of good shared utilities**: `DataLoaderManager` is wired into every request context but has zero call sites in `src/modules`; `tenancyScope.util.ts`'s `applyTenancyScope`/`tenancyWhere` is used by only 3 of 9 modules that hand-roll the identical `account.tenantId`/`agencyId` filter injection instead.
- **Two independently-maintained Vietnamese-diacritics maps** (`slug.util.ts` vs `vietnameseSlug.util.ts`) and **three overlapping "normalize Vietnamese text" mechanisms** across migrations + `search-index.manager.ts` — same problem solved 2-3 times with drifting coverage.
- **Fixed DB pool size (`max: 10`, no env override)** and a **single-job-per-5-second-tick cron queue** (`cron.service.ts`) both become hard scaling ceilings as module count and background-job volume grow.

## Findings

### Critical

**1. Nested AND/OR scope rule silently over-grants access on list queries**
- File:line: `src/modules/permission/types/scope.types.ts:307-331` (the `else` branch ~320-326, `console.warn(...)` with no throw/deny)
- Category: organization (correctness bug in core permission-resolution logic, consumed by `graphQLPermission.handler.ts`)
- Severity: Critical
- Problem: When an `AND(...)` rule contains a nested `OR(...)` sub-rule, the OR branch is silently dropped from the merged filter instead of being represented or rejected — e.g. `AND(INCLUDE('unitId',['u1']), OR(INCLUDE('status',['A']), SELF(...)))` resolves to just `unitId IN ('u1')`, discarding the OR restriction entirely. `recordMatchesRule` (same file, ~373-374), used for single-record mutation checks, recurses through nested AND/OR correctly — so the *same configured rule* is enforced correctly on a mutation but too permissively on a list query.
- Impact: A privilege-escalation-adjacent data leak on any list query whose scope rule nests OR inside AND — a composition the module's own docstring (lines 83-95) presents as supported. This is the kind of bug that gets worse silently as more permission bundles are configured to use this composition.
- Suggested direction: Either implement proper nested AND/OR→SQL composition in `ABaseRepository.buildWhereConditions`/`IResolvedScope`, or fail closed (`return { type: 'DENY' }`) whenever a branch can't be represented as a flat filter — never silently widen the result set.

**2. `setPermissions` — the sole write path for the entire permission-grant system — is non-transactional and N+1**
- File:line: `src/modules/accountPermission/application/services/accountPermission.service.ts:248-272`; unused bulk-delete counterpart at `src/modules/accountPermission/infrastructure/persistence/accountPermission.repository.ts:15-17`
- Category: organization / performance
- Severity: Critical
- Problem: Existing rows are fetched, then deleted one-by-one via `Promise.all(existing.map(e => this.permRepo.deleteById(e.id)))` (each `deleteById` itself does a `findById` SELECT + DELETE — `base.abstract.repository.ts:646-649`), then new rows are `createMany`'d — three un-transacted phases, no `this.manager().transaction(...)` (a pattern already established elsewhere, e.g. `node.service.ts:137`). `AccountPermissionRepository.deleteWhere(where)` (a single bulk `DELETE`) already exists and has zero callers.
- Impact: A crash or a concurrent `setAccountPermissions` call between phases can leave an account with zero permissions (silent lockout) or duplicate rows; resetting 20 grants costs ~41 queries instead of 1-2. This is the single write path for every permission grant/revoke in the system, so any partial failure directly corrupts authorization state.
- Suggested direction: `await this.manager().transaction(trx => trx-scoped deleteWhere + createMany)`.

**3. `resolvePermission` is an uncached DB call on the hot path of nearly every permission-checked GraphQL operation**
- File:line: `src/modules/accountPermission/application/services/accountPermission.service.ts:142-159`, invoked from `src/core/infrastructure/http/graphQLPermission.handler.ts:71` before the body of every `@GQLPermission`-decorated resolver (64 call sites across 16 resolver files, verified by grep)
- Category: performance
- Severity: Critical
- Problem: `resolvePermission` issues `findOneByCondition({ where: { tenantId, tenantAccountId, permission } })` — a real DB round trip — every single call, with no caching layer, despite `cacheManager` (Redis-backed with TTL, memory fallback) already existing in core and being used for a conceptually identical purpose (`invalidateLoaderCache` in `base.service.ts:41`). Confirmed via grep: zero `cacheManager.get`/`.set` calls anywhere in `src/modules/accountPermission`.
- Impact: Nearly every list/detail/mutation call across the ~29-module API pays an extra synchronous DB round trip purely to re-derive a value that only changes when `setPermissions` runs. This is a constant multiplier on DB load and per-request latency that scales with total API traffic, not with how often permissions actually change.
- Suggested direction: Cache `resolvePermission`/`resolvePermissions` per `(tenantAccountId, permission)` in `cacheManager` with a short TTL; invalidate inside `setPermissions()`, mirroring the `invalidateLoaderCache`/`invalidateLoaderCacheAll` pattern already established in `base.service.ts`.

**4. `SearchIndexManager.initialize()` — the code that creates the `@SearchIndex` GIN trigram indexes — is never called**
- File:line: `src/core/infrastructure/database/search-index.manager.ts` (whole file — `initialize()` is dead); metadata consumed at `src/core/infrastructure/database/base.abstract.repository.ts:1002-1038`
- Category: performance
- Severity: Critical
- Problem: Repo-wide grep for `SearchIndexManager` returns only its own declaring file — nothing in `server.ts`/bootstrap ever calls `initialize()`. Meanwhile `ABaseRepository.buildSearchConditionsAsync` (base.abstract.repository.ts:995-1039) reads `@SearchIndex` metadata (applied to `Unit`/`Tenant` entities) and builds `public.lcu(alias) LIKE public.lcu(:param)` queries assuming a GIN trigram index exists to back them.
- Impact: Search on any `@SearchIndex`-decorated entity looks index-backed in application code but runs as a sequential scan against Postgres in reality — this degrades specifically as row counts grow, which is exactly when an index would have mattered, and any new module that adopts `@SearchIndex` (a documented, intended core pattern) inherits the same silent gap.
- Suggested direction: Call `SearchIndexManager.initialize(AppDataSource, entities)` once during server bootstrap (`src/server.ts` / `src/bootstrap`), or fold the DDL into a proper migration keyed off the same decorator metadata so it's guaranteed rather than best-effort at runtime.

### Important

**5. `BaseGraphQLResolver<T>` provides no CRUD helpers — ~20 resolvers hand-duplicate identical wiring**
- File:line: `src/core/infrastructure/http/baseGraphql.resolver.ts:5-11` (entire class body is just a constructor); representative duplication at `src/modules/page/infrastructure/http/graphql/redirect.resolver.ts:32-47`, `src/modules/emailConfig/infrastructure/http/graphql/emailConfig.resolver.ts:27-44`
- Category: organization / duplication-reuse
- Severity: Important
- Problem: Unlike `BaseRestController<T>` (which has real `create`/`getAll`/`getById`/`updateOne`/`deleteOne` endpoints), `BaseGraphQLResolver<T>` gives subclasses nothing beyond DI wiring. Grep for the literal call shape `findAllPagination(input, fieldOptions)` matches identically in 20 resolver files (`activityLog`, `admin`, `agency`, `agencyAccount`, `codeConfig`, `component`, `contentEntry`, `contentType`, `customer`, `emailConfig`, `form`, `mediaSet`, `merchant`, `page`, `redirect`, `taxonomy`, `term`, `tenant`, `tenantAccount`, `unit`), each repeating the same getOne/getAll/create/update/delete shape with only the entity name changed.
- Impact: With ~29 modules today and growing, each new CRUD module copy-pastes the same 5-method boilerplate; any cross-cutting change (e.g. a standard audit hook on every create) requires editing 20+ files by hand instead of one base class — the exact scaling cost a shared base class exists to avoid.
- Suggested direction: Add optional `getOne`/`getAll`/`create`/`update`/`delete` methods to `BaseGraphQLResolver<T>` taking the same `(args, fieldOptions, account)` shape already used everywhere, without removing subclasses' ability to hand-write non-standard queries (sitemap builders, etc.).

**6. Fixed Vietnamese-diacritics maps duplicated, and Vietnamese-text-normalization logic triplicated**
- File:line: `src/core/shared/utils/slug.util.ts:3-11` (`VN_CHAR_MAP`, lowercase-only) vs `src/core/shared/utils/vietnameseSlug.util.ts:9-29` (`VN_GROUPS`/`VN_CHAR_MAP`, upper+lowercase); separately, `src/core/infrastructure/database/migrations/1767244162025-AddHelperFunction.ts` (`normalize_vietnamese_text()`, incomplete — missing i/o/u/y/đ) vs `1767244162026-LCUFuntion.ts` (`public.lcu()`, proper `unaccent`-based) vs `search-index.manager.ts:14-20` re-creating `public.lcu()` idempotently at runtime
- Category: duplication-reuse
- Severity: Important
- Problem: Two hand-typed character tables solve the identical transliteration problem with already-drifted coverage (one has uppercase, the other doesn't); the DB layer separately has three overlapping "normalize Vietnamese text" mechanisms, one of which (`normalize_vietnamese_text`) is both incomplete and — per Critical Finding 4's context — entirely unreferenced by any entity/column.
- Impact: Any correction to Vietnamese-character coverage has to be made in 2+ places to stay correct everywhere; new contributors can't tell which normalizer is canonical, and slug generation vs filename generation can silently disagree on the same input today.
- Suggested direction: Extract one canonical diacritics map/normalizer shared by `slugify()` and `removeVietnameseTones()`; standardize DB-side normalization on `public.lcu()` only and delete the incomplete/unused `normalize_vietnamese_text`.

**7. Manual tenant/agency filter injection duplicated across resolvers instead of `tenancyScope.util.ts`**
- File:line: `src/modules/agencyAccount/infrastructure/http/graphql/agencyAccount.resolver.ts:41-56`, `src/modules/tenantAccount/infrastructure/http/graphql/tenantAccount.resolver.ts:37-65` (both hand-write `if (account.tenantId) _.set(input, 'filter.tenantId', account.tenantId)`); shared util at `src/core/shared/utils/tenancyScope.util.ts:24-38` (`applyTenancyScope`)
- Category: duplication-reuse
- Severity: Important
- Problem: 9 modules contain inline `account.tenantId`/`agencyId` scoping checks; only 3 (`activityLog`, `codeConfig`, `unit`) actually call the shared `applyTenancyScope`/`tenancyWhere`/`stampCreateTenancy` utilities core already provides for exactly this.
- Impact: A future fix to tenancy-scoping semantics (the util's own comments describe a planned "agency drill-down" behavior change) must be manually reapplied to 6+ hand-rolled copies and is easy to miss in at least one — this is precisely the drift class a shared utility is meant to prevent, and it's already not preventing it.
- Suggested direction: Replace the inline `_.set(...)` blocks with calls to `applyTenancyScope(input, account)` / `tenancyWhere(account)` / `stampCreateTenancy(data, account)`.

**8. `cacheManager.deletePattern()` uses blocking Redis `KEYS`, invoked on every entity write**
- File:line: `src/core/infrastructure/cache/cacheManager.ts:113-124`; called from `src/core/application/services/base.service.ts:46` (`invalidateLoaderCacheAll`, itself called from `updateManyByCondition`)
- Category: performance
- Severity: Important
- Problem: `deletePattern()` calls `this.redisClient.keys(pattern)` — an O(total keyspace) blocking scan of the entire Redis instance, not `SCAN` — every time a bulk update needs to invalidate an entity's DataLoader cache entries.
- Impact: On a shared Redis instance serving all ~29 modules and every tenant, a bulk update anywhere in the app blocks the single-threaded Redis event loop proportional to *total* key count across the whole system, not the entity being invalidated — a scaling cliff that gets strictly worse as more modules/entities/tenants add keys to the same instance.
- Suggested direction: Replace `KEYS` with cursor-based `SCAN`, or maintain a per-entity key index/set so invalidation cost is proportional to matching keys, not total keys.

**9. `job.registry.ts` and `RBAC.service.ts`'s permission engine are dead parallel systems inside core**
- File:line: `src/core/infrastructure/cron/job.registry.ts` (whole file — empty `JobRegistry` object, never imported/populated/read; verified by grep, real registration is `cronService.registerJob()` via `cron.loader.ts`'s glob scan); `src/core/application/auth/RBAC.service.ts:282-393` (`registerPermission`/`can`/`assertCan`/`initializeDefaultPermissions`, ~110 lines including hardcoded default rules; verified zero call sites for `.can(`/`.assertCan(` anywhere outside the file — real authorization is `authorizeRoles()` only)
- Category: organization
- Severity: Important
- Problem: Two competing "job registry" concepts exist in the cron subsystem, and a full resource:action permission engine with hardcoded default rules exists alongside the real `authorizeRoles()` path, already out of sync (it has zero awareness of `ERoleScrope.CUSTOMER`, added later).
- Impact: Both are traps for a future contributor: adding a job to the wrong (dead) registry silently does nothing; building on `RBAC.service.ts`'s `can()`/`assertCan()` believing it's the live authorization path produces checks that are never actually invoked.
- Suggested direction: Delete `job.registry.ts` outright. For `RBAC.service.ts`, either wire the resource:action engine in where genuinely needed and update it for `CUSTOMER`, or delete the dead ~110 lines and keep only `authorizeRoles()`.

**10. `GraphQLLoader` duplicates `DataLoaderManager`'s cache dance without batching, and is itself dead code**
- File:line: `src/core/infrastructure/database/graphQLLoader.ts` (whole file) vs `src/core/infrastructure/database/dataloader.manager.ts`
- Category: duplication-reuse
- Severity: Important
- Problem: `GraphQLLoader.loadOne/loadOneByCondition/loadManyByCondition` reimplements the same "check Redis cache → miss → query DB → write back" pattern `DataLoaderManager` already provides, but without per-request batching/coalescing — so if ever wired into a per-parent-row field resolver it would reproduce the exact N+1 problem `DataLoaderManager` exists to prevent. Confirmed dead via grep (zero callers).
- Impact: A second caching implementation to maintain, one that actively defeats the N+1-prevention purpose of the other, and looks like a legitimate lightweight alternative to a future developer who doesn't know both exist.
- Suggested direction: Delete `GraphQLLoader`; if a simpler non-batched convenience wrapper is genuinely wanted, build it on top of `DataLoaderManager` rather than re-deriving cache semantics.

**11. `sameTenant.guard.ts` — the cross-tenant FK-leak guard — has zero callers**
- File:line: `src/core/shared/utils/sameTenant.guard.ts:33-52` (`assertRefsSameTenant`)
- Category: duplication-reuse (unused shared utility, security-relevant)
- Severity: Important
- Problem: Grep confirms zero callers anywhere, including the tenant-scoped modules (`agencyAccount`, `tenantAccount`, `tenant`, `unit`) it was clearly written for. The function exists specifically to stop one tenant's record being FK-linked to another tenant's child record.
- Impact: The exact cross-tenant data-leak class this util defends against — a client-supplied FK on create/update pointing at a different tenant's row — is currently unguarded on every tenant-scoped module's mutation path, because the one utility built to prevent it was never actually wired in.
- Suggested direction: Audit tenant-scoped modules' create/update mutations for client-supplied FK fields and add `await assertRefsSameTenant(...)` where a cross-tenant reference is currently possible.

**12. `DataLoaderManager` is wired into every request context but has zero adoption in `src/modules`**
- File:line: `src/core/infrastructure/database/dataloader.manager.ts` (whole file); instantiated per-request at `src/core/infrastructure/http/middleware/auth.middleware.ts:53`; grep for `loaders.forEntity`/`loaders.forManyByForeignKey`/`ctx.loaders`/`context.loaders` across `src/modules` → 0 matches
- Category: performance / duplication-reuse
- Severity: Important
- Problem: A fully-implemented, Redis-backed, per-request-batched N+1-prevention loader is available on every resolver via `context.loaders` and is never called. Relation loading instead goes through TypeORM `relations` joins driven by GraphQL-selection-set translation (`sanitize()` in `base.abstract.repository.ts`), which covers direct joinable relations but not computed cross-entity field resolvers.
- Impact: The infrastructure is unverified by real usage — the first module that adds a true per-parent-row field resolver (a computed value not expressible as a TypeORM join) has no working example to copy from in the actual codebase, and is likely to reinvent an ad-hoc (probably N+1) solution instead, exactly the failure mode this class exists to prevent.
- Suggested direction: Either adopt it in an existing `@FieldResolver` that currently queries per-parent (audit for one), or explicitly document in core that joins are the primary pattern and the loader is reserved for field resolvers, with one concrete example wired up as a template.

**13. Fixed DB connection pool size with no environment override**
- File:line: `src/config/database.config.ts:45` (`max: 10`, `connectionTimeoutMillis: 10000`)
- Category: performance
- Severity: Important
- Problem: The pool size is a hardcoded literal shared across all GraphQL traffic, REST traffic, the cron poller's own `queryRunner` (every 5s), and per-request `applyActingTenant` lookups — with no `DB_POOL_MAX`-style env var to tune it per deployment.
- Impact: As module count and tenant traffic grow, 10 connections becomes a hard ceiling well before Postgres itself is the bottleneck; combined with the 10s connection timeout, concurrent request bursts will start failing with pool-exhaustion errors that look like DB problems but are actually a config ceiling.
- Suggested direction: Make pool size configurable via env, sized to expected concurrent request volume per deployment tier.

**14. Cron queue processes exactly one job per fixed 5-second tick, with no concurrency**
- File:line: `src/core/infrastructure/cron/cron.service.ts:66-103` (`processJobs()`)
- Category: performance
- Severity: Important
- Problem: Each poll tick fetches and fully awaits exactly one job before the next tick (gated by a fixed `setInterval`), for both system recurring crons and one-time jobs (e.g. imports) sharing a single FIFO queue.
- Impact: A backlog builds linearly as job volume grows — 50 pending jobs takes 50+ poll cycles (4+ minutes minimum) even if each job itself is fast; this scales as one more thing to be scared of every time a new module adds background jobs.
- Suggested direction: Batch-fetch N due jobs per tick and run them concurrently (bounded worker pool), or use `SELECT ... FOR UPDATE SKIP LOCKED` to process multiple rows per tick safely across cluster workers.

**15. `applyActingTenant` re-verifies agency↔tenant membership with an uncached DB query on every request**
- File:line: `src/core/infrastructure/http/middleware/auth.middleware.ts:125-145`
- Category: performance
- Severity: Important
- Problem: Every GraphQL/REST request from an agency-context caller with `x-acting-tenant-id` set triggers a fresh `SELECT 1 FROM "tenant" WHERE id=$1 AND agencyId=$2`, with no caching, even though this relationship changes rarely.
- Impact: Per-request tax on the hot auth path for every agency-context request, growing in aggregate cost with agency-managed tenant traffic — the same class of problem as Critical Finding 3, on the auth layer rather than the permission layer.
- Suggested direction: Cache the `(agencyId, tenantId) → valid` boolean in `cacheManager` with a short TTL, invalidated when the agency-tenant relationship changes.

**16. N+1 query pattern in dynamic/mixed-source node usage lookup, and in sitemap generation**
- File:line: `src/modules/contentEntry/application/services/contentEntryUsage.service.ts:152-165` and `:195-216` (per-node `findPublicList` calls inside a loop, despite the file's own comment at lines 84-86 showing this exact bug was already fixed for the `detail` branch); `src/modules/page/infrastructure/http/graphql/page.resolver.ts:217-323`, specifically `findDetailBinding` re-running a full published-pages scan per `(contentType × locale)` combination at lines 252-320
- Category: performance
- Severity: Important
- Problem: Both are node/content-heavy operations where one branch of a loop was hoisted out of per-row querying and a sibling branch (or a sibling call site) wasn't — the fix pattern exists in the same file but wasn't applied uniformly.
- Impact: `getContentEntryUsage` (a staff "where is this used" tool) and sitemap generation both degrade as content volume and content-type/locale count grow — exactly the "at scale" regime this audit is asked to flag, and made worse by the fact the fix pattern is already known and present elsewhere in the same files.
- Suggested direction: Group by effective query signature before the loop and issue one batched query per distinct signature (usage service); hoist the published-pages fetch out of the sitemap's per-locale loop (page resolver).

### Minor

**17. `authRateLimiter.ts` uses an in-memory `Map` despite its own comment saying to use `cacheManager`**
- File:line: `src/core/infrastructure/http/authRateLimiter.ts:21`
- Category: duplication-reuse
- Severity: Minor
- Problem: The file's own header comment says "for multi-instance deployments, swap the store for Redis (cacheManager is already available in core)" but the module-level `store` is a plain `Map`, unconditionally.
- Impact: Under the app's own supported cluster-mode deployment, each worker keeps an independent counter, so the effective brute-force-login/reset-token rate limit becomes `max × workerCount` — silently weaker than configured, and this gets worse (more effective bypass headroom) the more workers are added to scale up.
- Suggested direction: Back the limiter with `cacheManager` (already Redis-aware with memory fallback), consistent with the rest of the caching infrastructure.

**18. `filterMerge.ts` independently re-encodes the same `EFilterOperator` vocabulary as the base repository**
- File:line: `src/core/infrastructure/http/filterMerge.ts` (`normalize`/`toFilterValue`) vs `src/core/infrastructure/database/base.abstract.repository.ts` (`buildWhereConditions`/`applyOperator`, ~905-966)
- Category: duplication-reuse
- Severity: Minor
- Problem: Both files understand `$in`/`$nin`/`$eq`/`$ne`/`$gt`/... independently rather than sharing one operator table.
- Impact: A new filter operator added to the repository silently isn't recognized by scope-injected filter merging (falls into an untyped bucket, last-write-wins instead of proper set semantics) unless someone remembers to update both files.
- Suggested direction: Extract one shared operator-semantics module both files import from.

**19. `DEFAULT_PAGINATION` and duplicated `MAX_PAGINATION_LIMIT`-equivalent constants**
- File:line: `src/core/shared/types/common.types.ts` (`DEFAULT_PAGINATION` — zero references anywhere per grep; hardcoded duplicate default at `base.abstract.repository.ts:380`, `?? 10`, and `buildOrderBy`'s literal `{createdAt:'DESC'}` at ~1044); separately `src/modules/accountPermission/application/services/grantableResource.service.ts:30-31` locally redeclares `MAX_LIMIT = 200`, duplicating the exported `MAX_PAGINATION_LIMIT = 200`
- Category: organization / duplication-reuse
- Severity: Minor
- Problem: Core exports a "canonical default" constant that nothing actually reads, while the real defaults are hardcoded literals in two places in the repository, and at least one module re-derives the pagination ceiling under a different local name instead of importing it.
- Impact: Changing the platform-wide default page size or ceiling requires finding and editing hardcoded literals across multiple files rather than one constant — low risk today (values agree by coincidence) but a guaranteed future drift point.
- Suggested direction: Either have `findAllCursorByCondition`/`buildOrderBy` read from `DEFAULT_PAGINATION`, or delete the unused export; replace `grantableResource.service.ts`'s local `MAX_LIMIT` with an import of `MAX_PAGINATION_LIMIT`.

**20. `assertRefsSameTenant` performs sequential (not parallel) per-ref DB lookups**
- File:line: `src/core/shared/utils/sameTenant.guard.ts:38-53`
- Category: performance
- Severity: Minor
- Problem: Awaits one `AppDataSource.query(...)` per ref inside a `for` loop instead of `Promise.all`-ing them — moot today only because the function is unused (Finding 11), but relevant the moment it's wired in.
- Impact: For an entity with several tenant-scoped FKs, validation latency scales linearly with FK count instead of being one parallel round trip.
- Suggested direction: `Promise.all(refs.map(...))`, throwing on the first violation found in the results.

**21. `DataLoaderManager`'s cache-read step is N sequential Redis calls, not a batched `MGET`**
- File:line: `src/core/infrastructure/database/dataloader.manager.ts:52-63`
- Category: performance
- Severity: Minor
- Problem: Issues one `cacheManager.get()` per unique id via `Promise.all` — N round trips to Redis — instead of one `MGET`.
- Impact: For a batch of 50 parent rows needing 50 related ids, this is 50 Redis round trips per GraphQL request instead of 1, partially defeating the purpose of batching once this loader has real callers (see Finding 12 — currently latent, becomes real the moment it's adopted).
- Suggested direction: Add an `mget`-style batched read to `CacheManager` and use it here (and batch the cache writes after the DB fetch the same way).

**22. `mail.service.ts` hardcodes `rejectUnauthorized: false` for all SMTP TLS connections**
- File:line: `src/core/infrastructure/mail/mail.service.ts:57`
- Category: organization
- Severity: Minor
- Problem: `buildTransporter()` disables TLS certificate validation unconditionally, with no env-driven override, for every environment including production.
- Impact: Masks MITM risk on outbound mail (password resets, notifications) in every deployment, and looks like a debugging leftover rather than a deliberate, documented choice.
- Suggested direction: Gate behind an explicit env flag (e.g. `SMTP_ALLOW_SELF_SIGNED`) defaulting to `rejectUnauthorized: true`.

**23. Auth-check logic re-implemented three ways across REST loader, GraphQL loader, and an unused middleware helper**
- File:line: `src/core/infrastructure/http/restRouter.loader.ts:202-238` vs `src/core/infrastructure/http/graphQLSchema.loader.ts:407-460` vs `src/core/infrastructure/http/middleware/auth.middleware.ts` (`checkGraphQLAuthorization()`, exported but not the one actually used inline by the GraphQL loader)
- Category: organization
- Severity: Minor
- Problem: "Read `@Authorized`/`@GQLAuthorized` metadata → require a user → check required roles → call `rbacService.authorizeRoles`" is implemented independently in three places, and has already drifted slightly (REST's separate null-check middleware vs GraphQL's inline check vs the unused middleware variant).
- Impact: A future change to the auth-check sequence (e.g. one more pre-check) must be made correctly in 2-3 places by hand, and it's unclear from reading the code which of the three is "the" implementation.
- Suggested direction: Extract one `resolveAuthorization(instance, handlerName, user)` helper used by both the REST and GraphQL loaders; delete or wire in `checkGraphQLAuthorization` rather than leaving a third unused variant.

**24. Global `Partial<T>` redeclaration shadows the TypeScript stdlib type with an identical definition**
- File:line: `src/core/shared/types/global.d.ts:8-10`
- Category: organization
- Severity: Minor
- Problem: Declares a global `type Partial<T> = { [P in keyof T]?: T[P] }` — structurally identical to `lib.es5.d.ts`'s built-in `Partial<T>`.
- Impact: Purely confusing dead weight; signals to future contributors that something project-specific is happening with `Partial` when nothing is.
- Suggested direction: Remove; `Partial<T>` is already global.

**25. `GlobalSequenceRepository` lives outside the domain/infrastructure convention and is reached into cross-module without a service boundary**
- File:line: `src/modules/globalSequence/domain/repositories/globalSequence.repository.ts:1-6` (directly imports `AppDataSource`, doesn't extend `ABaseRepository`); reached into via `new GlobalSequenceRepository()` from a different module at `src/modules/codeConfig/application/services/codeConfig.service.ts:32`
- Category: organization
- Severity: Minor (flagged because it's a template risk, not because this one instance is high-impact)
- Problem: Declared under `domain/repositories/` (an infrastructure concern misplaced in the domain layer) and instantiated directly by another module's service rather than through a stable application-layer API — the only cross-module direct-repository-construction found in the audit.
- Impact: Breaks the DDD layering convention every other audited module follows; a second module needing sequence values is likely to copy this exact pattern (`new GlobalSequenceRepository()`) as "how it's done here," propagating the violation as more modules are added.
- Suggested direction: Move to `infrastructure/persistence/`, extend `ABaseRepository<GlobalSequenceEntity>` (keeping the custom atomic `nextval()` raw SQL on top), and expose a thin `GlobalSequenceService` for other modules to depend on instead of constructing the repository directly.

**26. `PageEntity.path`'s unique index isn't scoped to live rows, forcing a hard-delete workaround that breaks the soft-delete convention**
- File:line: `src/modules/page/domain/entities/page.entity.ts:19` (`@Index({unique:true}) path`, no `deletedAt` scoping); workaround at `src/modules/page/infrastructure/http/graphql/page.resolver.ts:356-375`
- Category: organization
- Severity: Minor (module-level instance of a pattern that will recur; not core code itself but stems from `BaseEntity`/`DeletionService` not offering a partial-unique-index helper)
- Problem: Because the plain unique index blocks path reuse even after a soft delete, `deletePage` hard-deletes instead of using `softDeleteById` (used by every comparable delete mutation elsewhere), and there's no `restorePage` mutation despite `BaseService.restoreById` existing generically.
- Impact: Deleted pages are unrecoverable, inconsistent with the rest of the codebase's soft-delete convention; the resolver's own comment says this same bug class has already hit `ComponentDefinitionEntity.key` — i.e. this is a recurring gap in how `core`'s soft-delete pattern interacts with unique constraints, not a one-off.
- Suggested direction: Since this will recur for any entity with a soft-delete + unique-natural-key combination, consider documenting (or providing a helper for) partial unique indexes (`WHERE "deletedAt" IS NULL`) as the standard pattern alongside `BaseEntity`/`DeletionService`, then apply it to `PageEntity.path`.

---

*Cross-cutting note: several of the "Important/Minor" duplication findings above are module-level instances of a single root cause — core provides the right primitive (`tenancyScope.util.ts`, `DataLoaderManager`, `MAX_PAGINATION_LIMIT`) but nothing enforces adoption (no lint rule, no code-review checklist item, no base-class default that would make the shared path the path of least resistance). As module count keeps growing, the fix with the best leverage is making the shared primitives the easy/default choice (e.g. via `BaseGraphQLResolver` CRUD helpers, Finding 5) rather than auditing each new module by hand after the fact.*
