# Group 3 — Performance / Scale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to
> implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the 16 performance/scalability items from the master audit report's Group 3 —
BE render-path caching, permission-check caching, boot-time search-index sync, DB indexing, safe
Redis pattern-deletion, configurable pool/cron scaling, O(1)-per-instance Component publish/delete,
bounded `page_version` retention, and FE-side lazy-loading, route code-splitting, SSR waterfall
parallelization, a canvas-remount defect, image loading hygiene, and public-page HTTP caching.

**Architecture:** No new architectural layers — every task extends an EXISTING pattern already
established in Groups 0-2 (the `cacheManager` singleton, `DefaultableConfigService`,
`this.manager().transaction()`, `BaseService.findAllPagination`, Solid's `createMemo`/`lazy()`,
the SSR `network-only` request-policy fix). This group is entirely about USING infrastructure that
already exists but sits unwired, plus 2 genuine algorithmic fixes (3.5's O(instances×nodes) publish,
3.11's canvas remount).

**Tech Stack:** Same as the rest of the codebase — BE: TypeORM/Postgres, the hand-rolled
`@GQLPermission`/`@Query`/`@Mutation` decorator system, Redis via `cacheManager`, node-cron-style
polling via `cron.service.ts`. FE: Astro SSR + SolidJS islands, urql, GSAP, `@solidjs/router`.

## Global Constraints

- **Item 3.2 is DROPPED — do not implement.** Verified already fully fixed by Group 0 (FE commits
  `09d5d09`, `1fd8132`, `5c782de` — SSR `network-only` request policy, both at the `GraphQL` and
  `BaseService` layers). Confirmed via git log and by reading the current code; existing tests
  (`test/core/api/graphql.ssr.test.ts`, `test/core/services/base.service.ssr.test.ts`) already lock
  this in. No task for it in this plan.
- **Item 3.15's original module list is corrected.** Drop `siteSettings` from scope entirely — it's
  a true singleton (`getSiteLocaleSettings` returns exactly one row), nothing to paginate. Downgrade
  Theme/HeaderPreset/FooterPreset/ArtDirectionKit/Menu from "convert to real pagination" to "add a
  defensive `take` cap only" — confirmed via the FE's own code/comments that these are deliberately
  small, non-paginated catalogs (see Task 9's brief for the full evidence trail). Only
  `FormSubmission` gets a real pagination conversion, and it is FE-breaking, so it is its own
  2-repo pair of tasks (Task 9 BE, Task 16 FE).
- **Every task that adds caching MUST preserve existing test behavior exactly** — 3 separate test-
  pollution/mock-assumption hazards were found during research (see each task's brief). Do not
  "fix" a test that breaks under a caching change without first confirming whether the break
  reveals a real bug in the cache design, per this plan's own research.
- **Never wrap a whole loop of independently-processed items (e.g. multiple Component instances) in
  one shared DB transaction** where an existing test asserts per-item failure isolation. Task 8
  documents the specific test that locks this in for `publishComponent`.
- **All new BE migrations**: follow the exact `up()`/`down()` symmetry and `IF EXISTS`/
  `IF NOT EXISTS` safety-net pattern established in
  `1788352889408-PartialUniqueIndexTaxonomyTerm.ts` and
  `1788534207858-PartialUniqueIndexPageComponentRedirectForm.ts`. Task 6's migration additionally
  needs `transaction = false` + `CONCURRENTLY` (justified in its brief) — a deliberate, disclosed
  deviation from the precedent, not a stylistic choice to imitate elsewhere without the same
  justification.
- **Full research is written up in 3 documents — every task brief below points to the exact
  section, and the research contains complete proposed code, not just a sketch. Read the cited
  section before writing any code:**
  - `D:\OTHER\node-source-base\ddd-graphql-be\.superpowers\sdd\group3-research-be-cache-db.md`
    (items 3.1, 3.3, 3.4, 3.6, 3.12, 3.16)
  - `D:\OTHER\node-source-base\ddd-graphql-be\.superpowers\sdd\group3-research-be-heavy.md`
    (items 3.5, 3.10, 3.15-BE)
  - `D:\OTHER\node-source-base\ddd-graphql-fe\.superpowers\sdd\group3-research-fe.md`
    (items 3.7, 3.8, 3.9, 3.11, 3.13, 3.14, 3.15-FE)
- **Playwright MCP was unavailable during research (this session).** No task in this plan strictly
  requires live-browser verification to be considered done — every task has either existing test
  coverage or a concretely-designed new unit/integration test proving the mechanism directly.
  Where a live-browser check would add real extra confidence, the task's brief flags it as
  desirable-but-not-blocking, matching the precedent set in Groups 0/2 for the same MCP gap.

---

## Execution order

BE tasks (1-9) and FE tasks (10-16) touch disjoint repos — safe to run in parallel worktrees, one
`subagent-driven-development` pass per repo, exactly as Group 2 did.

**Within BE**: Tasks 1-6 (3.1, 3.3, 3.4, 3.6, 3.12, 3.16) are all independent, additive, low-blast-
radius caching/config/index changes — do these first, any order, though 3.12 (Task 5) is worth doing
before 3.1/3.3 land in practice since both add new `cacheManager.deletePattern`/pattern-based
invalidation call sites that benefit from the non-blocking `SCAN` fix being in place first (not a
hard dependency — `deletePattern`'s external signature never changes — just a sensible sequencing
nicety). Task 7 (3.5, Component publish/delete) and Task 8 (3.10, page_version retention) are
independent of 1-6 and of each other. Task 9 (3.15-BE, FormSubmission pagination) should be **last**
among BE tasks, since Task 16 (its FE counterpart) depends on Task 9's exact resolver signature
landing first — coordinate: finish Task 9, confirm its final query/arg shape, THEN dispatch Task 16.

**Within FE**: Tasks 10-14 (3.7, 3.8, 3.9, 3.11, 3.13) are independent of each other — any order.
Task 15 (3.14, Cache-Control header) is independent too. Task 16 (3.15-FE, FormSubmission
pagination UI) must wait for BE Task 9 to land and its exact resolver shape to be confirmed (per
the note above) — sequence it last.

Each task gets its own implementer -> task-reviewer cycle. Given this group's items are mostly
smaller/lower-risk than Group 2's shared-abstraction extractions, most tasks can use lighter review
— but Task 7 (3.5, the O(instances×nodes) Component rewrite, touches a test with a documented
failure-isolation invariant) and Task 8's migration correctness deserve the same rigor as Group 2's
higher-risk tasks (empirically verify claims, don't just read). After all tasks in a repo are done,
run that repo's full test suite + typecheck one final time, then a whole-branch review (most capable
model available) before merging to master — same closing pattern as every prior Group in this
project.

---

## Task 1 (BE, item 3.1): Render-path caching — header/footer/theme/locale-settings

**Files:**
- Modify: `src/modules/page/infrastructure/http/graphql/page.resolver.ts`
  (`resolveHeaderFooter`/`resolveTheme`/`resolvePage`)
- Modify: `src/core/application/services/defaultableConfig.service.ts` (`findDefault`,
  `createWithAutoDefault`, `setDefault`, `deleteWithReassignment`)
- Modify: `src/modules/siteSettings/infrastructure/http/graphql/siteLocaleSettings.resolver.ts`
  (`getSiteLocaleSettings`, `updateSiteLocaleSettings`)
- Test: extend `test/modules/page/infrastructure/http/graphql/page.resolver.test.ts`,
  `test/core/application/services/defaultableConfig.service.test.ts`; create
  `test/modules/siteSettings/infrastructure/http/graphql/siteLocaleSettings.resolver.test.ts` (none
  exists today)

**Interfaces:**
- Read the FULL "3.1" section of `group3-research-be-cache-db.md` first — it contains the complete
  proposed code for all three call sites (`cachedFindById` helper + threading a `useCache: boolean`
  param through `resolveHeaderFooter`/`resolveTheme`/`resolvePage`; `DefaultableConfigService`'s
  cached `findDefault` + invalidation in its 3 write methods; the resolver-layer cache for
  `getSiteLocaleSettings`/`updateSiteLocaleSettings`).
- **Critical, non-obvious constraint, verified by research — do NOT cache
  `SiteLocaleSettingsService.getSettings()` at the SERVICE layer.** Its existing test file
  (`siteLocaleSettings.service.test.ts`) has 9 tests sharing one fixed row id
  (`'settings-1'`) across different content per test; a service-layer cache would leak state between
  tests via the singleton `cacheManager`'s in-memory Map (only reset per Jest file, not per test),
  breaking a `toBe(existing)` reference-equality assertion and giving several tests stale content.
  Cache in the RESOLVER instead (`getSiteLocaleSettings`/`updateSiteLocaleSettings`), which has no
  existing test file to collide with.
- Cache key convention: reuse the EXACT `dl:<EntityClassName>:<id>` shape `BaseService` already
  invalidates on every write (see the research doc's "Cross-cutting discovery" section) — this
  means header/footer/theme by-id lookups get invalidation "for free," no new invalidation code
  needed for that part.
- TTL: 60 seconds for all render-path caches in this task (short, bounds staleness after an edit —
  see the research doc's tie-in to the FE's Group-0 SSR-cache fix for the reasoning).
- `resolvePage`'s new `useCache` derivation: `const useCache = !preview;` — admin preview must NEVER
  see a stale header/footer/theme.

- [ ] **Step 1**: Read `page.resolver.ts`'s current `resolveHeaderFooter`/`resolveTheme`/
  `resolvePage` in full, `defaultableConfig.service.ts` in full, and
  `siteLocaleSettings.resolver.ts`/`siteLocaleSettings.service.ts` in full, to confirm current line
  numbers and exact behavior match the research doc's citations (they may have drifted slightly
  since the research was written).

- [ ] **Step 2**: Implement the `cachedFindById` helper + `useCache`-threaded
  `resolveHeaderFooter`/`resolveTheme`/`resolvePage` in `page.resolver.ts`, per the research doc's
  complete code.

- [ ] **Step 3**: Implement `DefaultableConfigService`'s cached `findDefault` + cache-clearing in
  `createWithAutoDefault`/`setDefault`/`deleteWithReassignment`, per the research doc's complete
  code.

- [ ] **Step 4**: Implement the resolver-layer cache for `getSiteLocaleSettings`/
  `updateSiteLocaleSettings`, per the research doc's complete code.

- [ ] **Step 5**: Add the new tests described in the research doc's "Verification" subsection for
  3.1 — a repeat-call cache-hit test in `page.resolver.test.ts` (using a FRESH theme id, not one of
  the 3 existing tests' ids, to avoid a singleton-cache collision), cache-hit + invalidation tests in
  `defaultableConfig.service.test.ts`, and a new `siteLocaleSettings.resolver.test.ts` covering
  cache hit/miss + invalidation-on-update.

- [ ] **Step 6: Run tests + typecheck**

  Run the full suite (`npm test`) and `npx tsc --noEmit`. No live DB/Redis needed — `cacheManager`
  never calls `.connect()` in the Jest environment, so every `get/set/delete` deterministically
  exercises the real in-memory Map fallback (confirmed in research). Confirm the 3 existing test
  files listed above still pass UNCHANGED in their pre-existing assertions.

- [ ] **Step 7: Commit**

  ```bash
  git add -A
  git commit -m "perf(be): cache render-critical-path reads (header/footer/theme/locale-settings)"
  ```

---

## Task 2 (BE, item 3.3): Cache `resolvePermission`

**Files:**
- Modify: `src/modules/accountPermission/application/services/accountPermission.service.ts`
  (`resolvePermission`, `setPermissions`)
- Test: extend `test/modules/accountPermission/application/services/accountPermission.service.test.ts`

**Interfaces:**
- Read the FULL "3.3" section of `group3-research-be-cache-db.md` — complete proposed code for the
  cached `resolvePermission` (including caching the DENY-because-no-row case) and the one-line
  invalidation added to `setPermissions`.
- Cache key: `perm:<tenantId>:<tenantAccountId>:<permission>`. TTL: 30 seconds (shorter than Task
  1's 60s — this gates the whole API surface, a permission revoke must take effect fast).
- Invalidation: `cacheManager.deletePattern(`perm:${tenantId}:${tenantAccountId}:*`)` at the end of
  `setPermissions`, confirmed the sole write path to `AccountPermissionEntity` via grep.

- [ ] **Step 1**: Read `accountPermission.service.ts`'s current `resolvePermission`/`setPermissions`
  in full, confirm current line numbers.

- [ ] **Step 2**: Implement the cached `resolvePermission` + `setPermissions`'s invalidation call,
  per the research doc's complete code.

- [ ] **Step 3**: Add the 3 new tests from the research doc's "Verification" subsection: cache-hit
  on repeat calls, DENY-because-no-row also cached, `setPermissions` triggers
  `cacheManager.deletePattern` with the exact pattern (spy-based assertion).

- [ ] **Step 4: Run tests + typecheck**

  Run `npm test -- accountPermission` then the full suite, and `npx tsc --noEmit`. Confirm the 4
  existing `setPermissions` tests still pass unchanged.

- [ ] **Step 5: Commit**

  ```bash
  git add -A
  git commit -m "perf(be): cache resolvePermission (30s TTL, invalidated on setPermissions)"
  ```

---

## Task 3 (BE, item 3.4): Wire `SearchIndexManager.initialize()` into boot

**Files:**
- Modify: `src/server.ts` (`initializeServices()`)
- Test: create `test/core/infrastructure/database/search-index.manager.test.ts` (none exists today)

**Interfaces:**
- Read the FULL "3.4" section of `group3-research-be-cache-db.md` — complete proposed boot-wiring
  code and the reasoning for awaited-but-non-fatal (try/catch, log-and-continue).
- `SearchIndexManager.initialize(dataSource, entities)` already exists and is fully implemented
  (`src/core/infrastructure/database/search-index.manager.ts`) — this task ONLY wires it into boot
  and adds test coverage for the class, it does not change `search-index.manager.ts` itself unless
  a bug is found while reading it (report any such finding, don't silently "fix" scope creep).

- [ ] **Step 1**: Read `search-index.manager.ts` in full and `server.ts`'s `initializeServices()` in
  full, confirm `SearchIndexManager` really has zero call sites anywhere in `src/` today (grep to
  re-verify).

- [ ] **Step 2**: Add the boot-wiring call in `server.ts`, per the research doc's complete code —
  awaited, wrapped in try/catch, non-fatal on failure, placed right after `initializeDatabase()`
  and before cache init.

- [ ] **Step 3**: Write `test/core/infrastructure/database/search-index.manager.test.ts` per the
  research doc's described test design: a fake `DataSource.createQueryRunner()` stub, 2 dummy
  entity classes registered via the REAL `@SearchIndex()` decorator (one decorated, one not),
  asserting extension/function SQL runs first, only the decorated entity's index SQL runs, a
  per-index query rejection doesn't stop the loop, and `release()` is always called.

- [ ] **Step 4: Run tests + typecheck**

  Run the new test file, then the full suite, and `npx tsc --noEmit`.

- [ ] **Step 5: Commit**

  ```bash
  git add -A
  git commit -m "fix(be): wire SearchIndexManager.initialize() into boot (was dead code)"
  ```

---

## Task 4 (BE, item 3.6): Index `ContentEntry`'s hot query columns

**Files:**
- Modify: `src/modules/contentEntry/domain/entities/contentEntry.entity.ts`
- Create: a new migration file under `src/core/infrastructure/database/migrations/`
- Test: a new pure-metadata unit test (see Step 3)

**Interfaces:**
- Read the FULL "3.6" section of `group3-research-be-cache-db.md` — complete proposed `@Index`
  decorator additions and the complete migration file content, including the `transaction = false`
  + `CONCURRENTLY` deviation and its justification (content_entry is the hottest public-read table
  in the system, per the confirmed query-site audit in that section).
- Composite index: `('contentTypeId', 'status', 'locale')`, explicitly named
  `IDX_content_entry_type_status_locale`. Standalone index: `('locale')`, named
  `IDX_content_entry_locale` — flagged in research as lower-confidence (no confirmed hot query
  filters by `locale` alone today, only a staff-only generic-filter admin listing) — implement it
  anyway per the audit's original ask, but note this in your task report as a "confirm still
  wanted" item, not a load-bearing fix.

- [ ] **Step 1**: Read `contentEntry.entity.ts` in full and `contentEntry.repository.ts`'s query
  methods (`existsByFieldValue`/`findByFieldValueAny`/`findPublicList`/`countPublicList`) to confirm
  the column-order justification still holds against current code.

- [ ] **Step 2**: Add the two `@Index` decorators to `contentEntry.entity.ts`, per the research
  doc's complete code.

- [ ] **Step 3**: Create the migration file (name it
  `<timestamp>-IndexContentEntryTypeStatusLocale.ts`, timestamp = current time in the same format as
  the two precedent migrations), with `transaction = false` and both indexes created/dropped via
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS`/`DROP INDEX CONCURRENTLY IF EXISTS`, per the research
  doc's complete code.

- [ ] **Step 4**: Write a pure-unit test (no DB needed) asserting
  `getMetadataArgsStorage().indices` contains both new index entries with the correct `columns`
  arrays for `ContentEntryEntity` — decorator metadata is populated at module-import time.

- [ ] **Step 5: Run tests + typecheck**

  Run the new test, then the full suite, and `npx tsc --noEmit`. If a disposable/staging Postgres is
  reachable, also run `npm run migration:run` then `npm run migration:revert` to confirm the
  migration applies and reverses cleanly; if no live DB is reachable, note this in your report
  (matches the precedent set by Group 2 Task 4's migration, which shipped without live-DB
  confirmation, backed by `IF EXISTS`/`IF NOT EXISTS` safety nets).

- [ ] **Step 6: Commit**

  ```bash
  git add -A
  git commit -m "perf(be): index ContentEntry(contentTypeId,status,locale) + locale (hottest public-read path)"
  ```

---

## Task 5 (BE, item 3.12): `cacheManager.deletePattern()` — replace blocking KEYS with SCAN

**Files:**
- Modify: `src/core/infrastructure/cache/cacheManager.ts` (`deletePattern`)
- Test: create `test/core/infrastructure/cache/cacheManager.test.ts` (none exists today)

**Interfaces:**
- Read the FULL "3.12" section of `group3-research-be-cache-db.md` — complete proposed
  `SCAN`-cursor-based replacement, preserving the exact external signature
  (`deletePattern(pattern: string): Promise<void>`) and the try/catch/logging/in-memory-fallback
  shape byte-for-byte.
- Uses `redisClient.scanIterator({MATCH: pattern, COUNT: 100})` (confirmed available in the
  installed `redis@^4.6.12` client) with 500-key `DEL` batching.

- [ ] **Step 1**: Read `cacheManager.ts`'s current `deletePattern` in full, confirm line numbers
  and the class's constructor/singleton shape (needed for the test's fake-client injection
  approach).

- [ ] **Step 2**: Implement the `SCAN`-based replacement, per the research doc's complete code.

- [ ] **Step 3**: Write `test/core/infrastructure/cache/cacheManager.test.ts` per the research
  doc's described test design — a fake `redisClient` with `scanIterator` as an async generator and
  `del: jest.fn()`, forcing `isRedisReady = true`; assert `del` called with yielded keys and `keys()`
  never called; also test the in-memory-fallback branch (matching-key deletion from `memoryCache`).

- [ ] **Step 4: Run tests + typecheck**

  Run the new test, then the full suite, and `npx tsc --noEmit`. Confirm the ONE existing call site
  (`base.service.ts`'s `invalidateLoaderCacheAll`) still works — its own existing coverage (if any)
  should pass unchanged since the external signature didn't change.

- [ ] **Step 5: Commit**

  ```bash
  git add -A
  git commit -m "perf(be): cacheManager.deletePattern uses non-blocking SCAN instead of blocking KEYS"
  ```

---

## Task 6 (BE, item 3.16): Configurable DB pool size + cron batch/concurrency

**Files:**
- Modify: `src/config/database.config.ts` (pool `max`)
- Modify: `src/core/infrastructure/cron/cron.service.ts` (`processJobs`)
- Modify: `.env.example` (document the 3 new env vars)
- Test: create `test/config/database.config.test.ts`; extend/create cron service tests

**Interfaces:**
- Read the FULL "3.16" section of `group3-research-be-cache-db.md` — complete proposed code for
  both the pool-size env read and the batched+bounded-concurrency `processJobs` rewrite, including
  why the existing `SKIP LOCKED` locking mechanism already makes this safe (no new correctness risk
  from increasing batch size).
- New env vars, all with defaults matching current behavior exactly: `DB_POOL_MAX` (default `10`),
  `CRON_BATCH_SIZE` (default `5`), `CRON_CONCURRENCY` (default `3`).
- **No `*.job.ts` files exist in this codebase yet** (confirmed by research) — this task changes
  the polling/claiming mechanics only; it does not need to reason about real job handler behavior
  beyond what `executeJobLogic` already does (unchanged by this task).

- [ ] **Step 1**: Read `database.config.ts`'s pool config and `cron.service.ts`'s full
  `processJobs`/`executeJobLogic`/`resetStuckJobs` to confirm current line numbers and behavior.

- [ ] **Step 2**: Change `database.config.ts`'s hardcoded `max: 10` to
  `max: parseInt(process.env.DB_POOL_MAX || '10', 10)`.

- [ ] **Step 3**: Rewrite `cron.service.ts`'s `processJobs` to batch-select (`take: BATCH_SIZE`)
  and process with bounded concurrency (`CONCURRENCY`), per the research doc's complete code.

- [ ] **Step 4**: Add `DB_POOL_MAX=10`, `CRON_BATCH_SIZE=5`, `CRON_CONCURRENCY=3` to `.env.example`,
  matching the existing `REQUEST_TIMEOUT_MS=30000`-style formatting.

- [ ] **Step 5**: Write `test/config/database.config.test.ts` (set `process.env.DB_POOL_MAX` before
  a fresh `require` via `jest.resetModules()`, assert `AppDataSource.options.extra.max`) and extend
  cron service tests: mock `createQueryRunner()` returning N fake `PENDING` jobs, assert `find`
  called with `take: BATCH_SIZE` + lock options, assert `executeJobLogic` invoked for all N jobs but
  never with concurrency greater than `CRON_CONCURRENCY` (track a running-count high-water-mark in
  a fake slow handler).

- [ ] **Step 6: Run tests + typecheck**

  Run both new/extended test files, then the full suite, and `npx tsc --noEmit`.

- [ ] **Step 7: Commit**

  ```bash
  git add -A
  git commit -m "perf(be): env-configurable DB pool size + batched/bounded-concurrency cron polling"
  ```

---

## Task 7 (BE, item 3.5): O(1)-per-instance `ComponentService.publishComponent`/`deleteComponentDefinition`

**Files:**
- Modify: `src/modules/node/application/services/node.service.ts` (add `getSubtreeFlat`,
  `buildClonePlan`, `getDescendantIdsForRoots`, `assertNodeBulkDeleteSafe`, `bulkHardDeleteByIds`,
  `bulkUpdateByIds`, `swapSubtree`; rewrite `deleteSubtree` to use `bulkHardDeleteByIds`; delete the
  now-unused `deleteIfExists`)
- Modify: `src/modules/component/application/services/component.service.ts`
  (`publishComponent`, `deleteComponentDefinition`, add `detachComponentInstancesBatch`)
- Test: `test/modules/component/application/services/component.service.test.ts` (rewrite the fakes,
  keep assertions), `test/modules/node/application/services/node.service.test.ts` (add coverage for
  the new primitives)

**Interfaces:**
- Read the FULL "3.5" section of `group3-research-be-heavy.md` — this is the largest, most
  algorithmically involved task in this plan. The research doc contains complete proposed code for
  every new method and both rewritten `ComponentService` methods. Read it in full before starting,
  including the "Critical constraint discovered mid-research" subsection.
- **Non-negotiable constraint**: `test/modules/component/application/services/component.service.test.ts:795-844`
  ("does not destroy an instance when its replacement clone fails mid-loop") asserts per-instance
  failure isolation — instance N's failure must NOT roll back instance N-1's already-committed
  work. This RULES OUT wrapping the whole `publishComponent` instance loop in one transaction. Each
  instance keeps its own transaction (via the new `swapSubtree` method); only each INSTANCE's own
  work becomes O(1) statements instead of O(nodes).
- **Do NOT parallelize multiple instances' writes with `Promise.all` in this task.** Ship the
  sequential-per-instance version (still turns O(instances×nodes) into O(instances) — the real
  fix). The research doc explains why bounded concurrency is a separate, later, opt-in improvement
  (tied to Task 6's pool-size fix landing first) — do not add it here.
- **Do NOT touch `Page`/`ComponentDefinition` hard-delete logic** (`rollbackPartialComponent`,
  `deleteComponentDefinition`'s own `Page`/`ComponentDefinition` deletion calls) — that's a
  deliberately separate, already-flagged-safe-to-remove-later workaround from Group 2 Task 4, out
  of scope here. This task only changes how `NodeEntity` rows are bulk-written/deleted.
- `NodeEntity` has no `@DeletionPolicy` and no entity has a `@ManyToOne` into it (verified) — this
  is what makes bulk SQL delete/update safe to bypass `DeletionService`'s per-row cascade scan.
  `assertNodeBulkDeleteSafe()` (in the research doc's code) is a runtime guard that THROWS if either
  fact ever stops being true in the future — implement it exactly as specified, do not skip it as
  "unnecessary."

- [ ] **Step 1**: Read `component.service.ts`'s `publishComponent` (638-714),
  `deleteComponentDefinition` (733-764), `detachComponentInstance` (718-724),
  `cloneDefinitionIntoPage` (250-306), `resolveDefinitionRoot` (221-242) in full, and
  `node.service.ts`'s `cloneSubtreeWithIdMap`/`cloneNodeRecursiveWithIdMap` (325-368),
  `deleteSubtree`/`collectDescendantIds`/`deleteIfExists` (216-268), `getSubtreeNodeIds` (374-379)
  in full. Confirm current line numbers against the research doc's citations.

- [ ] **Step 2**: Add the 7 new `NodeService` primitives (`getSubtreeFlat`, `buildClonePlan`,
  `getDescendantIdsForRoots`, `assertNodeBulkDeleteSafe`, `bulkHardDeleteByIds`, `bulkUpdateByIds`,
  `swapSubtree`), per the research doc's complete code.

- [ ] **Step 3**: Rewrite `NodeService.deleteSubtree` to use `bulkHardDeleteByIds`; delete the now-
  unused `deleteIfExists`. Confirm the other 3 callers of `deleteSubtree`
  (`node.resolver.ts:49`, `pageVersion.service.ts:133,152`, `rollbackPartialComponent`) still
  compile and behave equivalently (same signature, same effective behavior — bulk delete instead of
  N sequential deletes).

- [ ] **Step 4**: Rewrite `ComponentService.publishComponent` to read the definition subtree once
  (`getSubtreeFlat`) then loop instances calling `swapSubtree` per instance (own transaction each),
  with `mutateRows` applying propSchema overrides / order / layout restoration, and
  `repointPageRootIfMatches` handling the root-node-of-page case — per the research doc's complete
  code.

- [ ] **Step 5**: Rewrite `ComponentService.deleteComponentDefinition` to batch the detach loop via
  a new `detachComponentInstancesBatch` helper (one combined BFS + one chunked bulk UPDATE) — per
  the research doc's complete code. Leave `detachComponentInstance` (single-instance) unchanged,
  still used by `rollbackPartialComponent`.

- [ ] **Step 6**: Rewrite `component.service.test.ts`'s `fakeNodeService`/`fakeNodeRepository`
  fakes to implement the new methods (`getSubtreeFlat`, `swapSubtree`, `getDescendantIdsForRoots`,
  `bulkUpdateByIds`), moving the mid-loop-failure test's injection point from
  `cloneSubtreeWithIdMap`'s 2nd call to `swapSubtree`'s 2nd call. Every existing assertion in
  `describe('ComponentService.publishComponent', ...)` and
  `describe('ComponentService.deleteComponentDefinition', ...)` should still hold — this is a
  mechanical fake-rewrite, not a behavior change; if any assertion genuinely needs to change,
  explain why in your report rather than silently adjusting it.

- [ ] **Step 7**: Add the new test from the research doc's "Verification" subsection: seed a
  component with N instances, assert `swapSubtree` is called exactly once per instance and that
  `cloneSubtreeWithIdMap`/per-node `updateById` are NOT called at all from `publishComponent`
  anymore (proves the O(1)-per-instance property, not just "still works").

- [ ] **Step 8**: Add coverage in `node.service.test.ts` for the 7 new primitives (at minimum:
  `getSubtreeFlat` returns root-first level-order; `buildClonePlan` is pure/no DB I/O and produces
  correct parent/child id remapping; `assertNodeBulkDeleteSafe` does not throw today;
  `bulkHardDeleteByIds`/`bulkUpdateByIds` chunk correctly for >1000 ids).

- [ ] **Step 9: Run tests + typecheck**

  Run `npm test -- component node` then the full suite (baseline before this task — confirm via
  `git log`/the progress ledger — should be unaffected by earlier BE tasks in this plan since they
  touch different files), and `npx tsc --noEmit`. Given this is the highest-risk task in the BE
  half of this plan, re-run once more after a short pause to rule out flakiness before reporting
  DONE.

- [ ] **Step 10: Commit**

  ```bash
  git add -A
  git commit -m "perf(be): O(1)-per-instance ComponentService publish/delete (was O(instances*nodes))"
  ```

---

## Task 8 (BE, item 3.10): `page_version` retention policy

**Files:**
- Modify: `src/modules/page/application/services/pageVersion.service.ts` (export
  `PAGE_VERSION_RETENTION_COUNT`)
- Modify: `src/modules/page/application/services/page.service.ts` (`publish`, add
  `pruneOldPageVersions`)
- Create: `src/modules/page/application/jobs/pageVersionRetention.job.ts` (first `*.job.ts` file in
  this codebase — auto-discovered by the existing `cron.loader.ts` glob, no other wiring needed)
- Test: extend `test/modules/page/application/services/page.service.test.ts`; create a test for the
  new cron job

**Interfaces:**
- Read the FULL "3.10" section of `group3-research-be-heavy.md` — complete proposed code for the
  retention constant, `pruneOldPageVersions`, the `publish()` call-site change, and the full cron
  job file.
- Retention policy: keep the most recent 30 `PageVersion` rows per `pageId`; prune on every publish
  (cheap, per-page) AND via a nightly cron sweep (backstop + one-time backfill for pre-existing
  bloat — same idempotent query, no separate migration needed).
- **This task depends on the `ICronJobDefinition` interface/`cron.loader.ts` glob discovery
  mechanism** (already fully wired at boot, confirmed by research) — do not add any new wiring
  beyond creating the `*.job.ts` file itself; it will be auto-discovered.
- Cron schedule: `'0 3 * * *'` (nightly at 3am).

- [ ] **Step 1**: Read `page.service.ts`'s current `publish()` (190-205) and
  `pageVersion.entity.ts`/`pageVersion.service.ts` in full to confirm current line numbers and
  shape.

- [ ] **Step 2**: Export `PAGE_VERSION_RETENTION_COUNT = 30` from `pageVersion.service.ts`.

- [ ] **Step 3**: Add `pruneOldPageVersions` to `page.service.ts` and call it at the end of
  `publish()`, AFTER the new version write (never risk losing the version just created) — per the
  research doc's complete code.

- [ ] **Step 4**: Create `src/modules/page/application/jobs/pageVersionRetention.job.ts` per the
  research doc's complete code — the nightly whole-table sweep using `ROW_NUMBER() OVER (PARTITION
  BY "pageId" ...)`.

- [ ] **Step 5**: Extend `page.service.test.ts`'s `fakePageVersionRepo` mock (currently just
  `create: jest.fn(...)`) to also expose a `createQueryBuilder` mock chain
  (`delete/where/andWhere/execute`), since `pruneOldPageVersions` now calls it unconditionally after
  every `publish()`. Add a new test asserting `pruneOldPageVersions` runs AFTER
  `pageVersionRepository.create` (ordering) and that the `keep` param equals
  `PAGE_VERSION_RETENTION_COUNT`.

- [ ] **Step 6**: Add a test for the new cron job's handler (mock `PageVersionRepository`'s
  `createQueryBuilder` chain, assert the `keep` param and that `delete()` is called).

- [ ] **Step 7: Run tests + typecheck**

  Run `npm test -- page` then the full suite, and `npx tsc --noEmit`. No DB-integration test harness
  exists in this codebase (confirmed by research) — if a live dev DB is reachable, also do a manual
  check: seed >30 versions for one page, call `publish`, confirm row count settles at 30 (matches
  the "live-verified against the real dev DB" precedent from Group 0). If no live DB is reachable,
  note this in your report.

- [ ] **Step 8: Commit**

  ```bash
  git add -A
  git commit -m "perf(be): bounded page_version retention (30/page, pruned on publish + nightly sweep)"
  ```

---

## Task 9 (BE, item 3.15-BE): `FormSubmission` real pagination + defensive caps on small catalogs

**Files:**
- Modify: `src/modules/form/infrastructure/http/graphql/form.resolver.ts` (`getAllFormSubmission`)
- Modify: `src/core/application/services/defaultableConfig.service.ts` (`findAll`, add `take` cap)
- Modify: `src/modules/menu/application/services/menu.service.ts` (`findAll`, add `take` cap)
- Modify: `src/modules/artDirectionKit/application/services/artDirectionKit.service.ts` (`findAll`,
  add `take` cap)
- Test: new resolver-level test for `getAllFormSubmission`; extend the 3 capped-`findAll` services'
  tests

**Interfaces:**
- Read the FULL "3.15" section of `group3-research-be-heavy.md` — complete proposed code for the
  `getAllFormSubmission` resolver conversion to `PaginatedResponse(FormSubmissionEntity)`, and the
  `take: 500` defensive-cap addition to the 3 small-catalog services.
- **`siteSettings` is explicitly OUT of scope for this task** — see Global Constraints; it's a true
  singleton, nothing to change.
- **`formId` must stay a mandatory, server-enforced scalar resolver argument** — never move it into
  the client-supplied `input.filter` object directly; the resolver body injects it into the filter
  server-side (`filter: { ...(input.filter ?? {}), formId }`) so a staff caller can never bypass the
  per-form scoping by omitting it.
- **This is the one item in this plan with a confirmed FE-breaking wire-shape change** — coordinate
  with Task 16 (FE). Do not consider this task done for the purposes of unblocking Task 16 until
  the final resolver signature (query name, arg shape, return type) is confirmed stable — communicate
  this explicitly in your task report so the controller can hand the exact shape to Task 16's
  implementer.

- [ ] **Step 1**: Read `form.resolver.ts`'s current `getAllFormSubmission` in full, confirm current
  line numbers. Read `defaultableConfig.service.ts`'s `findAll`, `menu.service.ts`'s `findAll`, and
  `artDirectionKit.service.ts`'s `findAll` in full.

- [ ] **Step 2**: Convert `getAllFormSubmission` to return `PaginatedResponse(FormSubmissionEntity)`,
  with `formId` as a mandatory scalar arg injected server-side into the filter, per the research
  doc's complete code. `FormSubmissionService` already extends `BaseService<FormSubmissionEntity>`
  — `findAllPagination` is inherited for free, no service change needed for FormSubmission.

- [ ] **Step 3**: Add `take: 500` to `DefaultableConfigService.findAll`, `MenuService.findAll`, and
  `ArtDirectionKitService.findAll` — a one-line, non-breaking safety net (not a real pagination
  conversion), per the research doc's reasoning.

- [ ] **Step 4**: Write a resolver-level test for `getAllFormSubmission` asserting `formId` is
  ALWAYS injected into the filter server-side (test that a client-supplied `input.filter.formId`
  different from the scalar arg is overridden, not merged in a way that could leak) and that
  `findAllPagination` is called (not the old `findByCondition`).

- [ ] **Step 5**: Add a test per capped service asserting `take: 500` is passed to the underlying
  `findByCondition` call (mock-based, no need to seed 500 real rows).

- [ ] **Step 6: Run tests + typecheck**

  Run `npm test -- form menu artDirectionKit defaultableConfig` then the full suite, and
  `npx tsc --noEmit`.

- [ ] **Step 7: Commit**

  ```bash
  git add -A
  git commit -m "perf(be): paginate getAllFormSubmission (was unbounded); defensive take-caps on small catalogs"
  ```

  **After this commit, report the final `getAllFormSubmission` GraphQL shape (query name, args,
  return type) explicitly** — Task 16 (FE) needs it verbatim.

---

## Task 10 (FE, item 3.7): Lazy-load GSAP + ScrollTrigger

**Files:**
- Modify: `src/modules/cms/node/applyAnimationTimeline.ts` (add `loadGsap`, make
  `applyAnimationTimeline` async)
- Modify: `src/modules/cms/node/useNodeAnimation.ts` (await the now-async function)
- Modify: `src/modules/cms/node/primitives/FrameNode.tsx` (remove its own direct top-level `gsap`
  import, route through the shared `loadGsap`)
- Test: `test/modules/cms/node/applyAnimationTimeline.test.ts`,
  `test/modules/cms/node/primitives/FrameNode.test.tsx` (both need updating for the new async shape,
  not just re-running)

**Interfaces:**
- Read the FULL "3.7" section of `group3-research-fe.md` — complete proposed code for
  `loadGsap`/the async `applyAnimationTimeline`/`useNodeAnimation`'s await-with-unmount-guard/
  `FrameNode.tsx`'s 4 call-site conversions.
- **Correction to the audit's original file list, confirmed by research**: GSAP has TWO independent
  top-level imports — `applyAnimationTimeline.ts` (used transitively by 9 primitives via
  `use:nodeAnimation`) AND `FrameNode.tsx`'s own separate direct import (accordion/carousel
  behavior, unrelated to the animation-timeline pipeline). Both must be fixed; fixing only one
  leaves gsap in the bundle via the other path. `ImageNode.tsx` has NO direct gsap import — it's
  fully covered by fixing `applyAnimationTimeline.ts` alone, do not modify it.
- `loadGsap()` is a cached module-promise loader — both `applyAnimationTimeline.ts` and
  `FrameNode.tsx` share the SAME loader (`FrameNode.tsx` imports it FROM
  `applyAnimationTimeline.ts`), so gsap loads and registers ScrollTrigger only once regardless of
  which path triggers it first.
- The `prefers-reduced-motion` branch in `applyAnimationTimeline` must stay fully synchronous and
  NEVER call `loadGsap()` — reduced-motion users should download zero gsap bytes for this pipeline.

- [ ] **Step 1**: Read `applyAnimationTimeline.ts`, `useNodeAnimation.ts`, and `FrameNode.tsx` in
  full to confirm current shape matches the research doc's citations.

- [ ] **Step 2**: Implement `loadGsap` + the async `applyAnimationTimeline` in
  `applyAnimationTimeline.ts`, per the research doc's complete code — preserving the
  `prefers-reduced-motion` branch's synchronous, gsap-free behavior exactly.

- [ ] **Step 3**: Update `useNodeAnimation.ts` to await the now-async `applyAnimationTimeline`, with
  the unmount-race guard (`cancelled` flag) from the research doc's complete code.

- [ ] **Step 4**: Update `FrameNode.tsx` — remove its own `import { gsap } from 'gsap';`, import
  `loadGsap` from `../applyAnimationTimeline`, prefetch on mount for both the carousel and accordion
  branches, and route all 4 existing `gsap.to`/`gsap.killTweensOf` call sites through
  `loadGsap().then((gsap) => ...)`, per the research doc's complete code.

- [ ] **Step 5**: Update `applyAnimationTimeline.test.ts` and `FrameNode.test.tsx` for the new async
  shape — every call site that previously called `applyAnimationTimeline(...)` synchronously and
  immediately asserted on gsap state now needs `await`/`vi.waitFor(...)`. Both files already stub
  `matchMedia` + dynamic-import the module in `beforeAll` to work around gsap's module-eval-time
  `registerPlugin` touching jsdom — this should get SIMPLER under the fix (no module-eval-time gsap
  side effect left, since `registerPlugin` now runs inside `loadGsap()`'s `.then()`), not harder —
  if it doesn't simplify, treat that as a sign something is still importing gsap eagerly.

- [ ] **Step 6: Run tests + typecheck**

  Run `npx astro check` and `npm test` (full suite, both vitest projects). Then run `npm run build`
  and confirm a separate `gsap-*.js` chunk is emitted (grep `dist/client/**/*.js` or the build's own
  chunk-listing output) — Vite always code-splits a bare `import()`, this should be automatic, but
  confirm it actually happened rather than assuming.

- [ ] **Step 7: Commit**

  ```bash
  git add -A
  git commit -m "perf(fe): lazy-load GSAP+ScrollTrigger (applyAnimationTimeline + FrameNode's own direct usage)"
  ```

---

## Task 11 (FE, item 3.8): Route-level code-splitting

**Files:**
- Modify: `src/shared/common/app/AppRoutes.tsx` (all ~69 page/layout imports -> `lazy()`)
- Modify: `App.tsx` (wrap `<AppRoutes/>` in `<Suspense>`)
- Test: a new smoke test mounting `<AppRoutes/>` (optional per research, recommended)

**Interfaces:**
- Read the FULL "3.8" section of `group3-research-fe.md` — complete conversion pattern for both
  named-export pages (`.then((m) => ({ default: m.X }))`) and the one default-export page
  (`TenantDetailPage`), plus the `<Suspense>` wrapping needed in `App.tsx`.
- All 4 role portal routes are `client:only="solid-js"` (confirmed by research — never SSR'd), so
  this conversion has NO SSR/hydration-mismatch concerns to reason about.
- `APP_ROUTES`'s object literal and `AppRoutes()`'s render function body are UNCHANGED — `lazy()`
  only swaps what each `const XyzPage`/`const XyzLayout` identifier points to. This should touch
  exactly `AppRoutes.tsx` + `App.tsx`, no changes needed in the ~69 page/layout source files
  themselves.
- Leave `None`/`HomePage`/`ResetPasswordPage` (the public/auth group) as static imports — tiny,
  already on the critical first-paint path, lazy-loading them adds a waterfall hop for no benefit
  (per research's explicit recommendation).
- Reuse the existing `Suspense`/spinner visual style already established in
  `DashboardHeader.tsx`/`DashboardMainSidebar.tsx` for the new `<Suspense fallback={...}>` in
  `App.tsx`, for visual consistency.

- [ ] **Step 1**: Read `AppRoutes.tsx` in full (all 69 imports + the `APP_ROUTES` object + the
  `AppRoutes()` function) and `App.tsx` in full, confirm current shape.

- [ ] **Step 2**: Convert all ~69 static imports to `lazy()`, per the research doc's pattern —
  double-check each named-export mapping (`.then((m) => ({ default: m.ExportName }))`) is correct
  for that specific file (a typo here fails silently at runtime without `astro check` catching an
  export that genuinely exists but under a different casing/name — verify each one against the
  actual export in its source file, don't guess from the identifier name).

- [ ] **Step 3**: Wrap `<AppRoutes/>` in `<Suspense fallback={...}>` inside `App.tsx`, matching the
  research doc's suggested markup and reusing this codebase's existing spinner style.

- [ ] **Step 4**: (Recommended, per research) Add a smoke test mounting `<AppRoutes/>` inside
  `<Suspense>` + a router context, asserting the default admin route eventually renders — proves
  `lazy()` resolution + `Suspense` wiring works end-to-end for at least one path through all 69
  conversions.

- [ ] **Step 5: Run tests + typecheck**

  Run `npx astro check` (this is the PRIMARY safety net for a wrong export-name mapping — the
  `Routes` type requires `(props: BaseProps) => JSX.Element`, so a broken lazy factory fails to
  typecheck) and the full `npm test`. Then run `npm run build` and inspect the emitted
  `dist/client/_astro/*.js` chunk list — confirm multiple page-scoped chunks exist instead of one
  monolithic bundle (a live network-tab confirmation that an Agency user's browser doesn't download
  Admin/Tenant/CMS-editor JS is desirable but not required — Playwright MCP was unavailable during
  research; note in your report if it's still unavailable).

- [ ] **Step 6: Commit**

  ```bash
  git add -A
  git commit -m "perf(fe): route-level code-splitting via lazy() for all role-portal pages/layouts"
  ```

---

## Task 12 (FE, item 3.9): Parallelize `resolveCmsPageProps`'s SSR waterfall

**Files:**
- Modify: `src/modules/cms/api/resolveCmsPageProps.ts`
- Test: extend `test/modules/cms/api/resolveCmsPageProps.test.ts`

**Interfaces:**
- Read the FULL "3.9" section of `group3-research-fe.md` — complete proposed rewrite of the
  function, including exact reasoning for what CAN vs CANNOT be parallelized.
- Parallelize: the node-tree fetch (`NodeService.getNodesByPage`) with the translations fetch
  (`PageService.getPageTranslations`) via one `Promise.all` — both depend only on `resolved` (the
  root `pageResolver`/`previewPageResolver` call), never on each other. ALSO parallelize the
  repeat-entry loop's per-node `fetchRepeatEntries` calls via `Promise.all`.
- Do NOT parallelize the content-type fetch (`ContentTypeService.getOneContentType`) with anything
  — it has a REAL, unavoidable sequential dependency on the repeat-entry loop's own output
  (`pageEntry.contentTypeId`). Keep it sequential, after the loop.
- **Disclosed, deliberate behavior change**: parallelizing the repeat-entry loop means a
  NOT_FOUND-triggering node no longer short-circuits later nodes' fetches — on the 404 path, other
  nodes' fetches now also run (and get discarded) before the function returns `null`. This trades a
  small amount of extra query cost on the rarer 404 path for materially lower latency on the far
  more common 200 path. This is intentional, not a bug — do not try to preserve the old early-exit
  behavior.

- [ ] **Step 1**: Read `resolveCmsPageProps.ts` in full, confirm current line numbers (drifted to
  80-171 per research, from the audit's stale 79-169 citation) and the exact 5-step sequential
  structure described in the research doc.

- [ ] **Step 2**: Rewrite the function per the research doc's complete proposed code — parallelize
  steps 2+5 (node-tree + translations), parallelize the repeat-entry loop's per-node fetches, keep
  the content-type fetch sequential after the loop.

- [ ] **Step 3**: Confirm the existing `resolveCmsPageProps.test.ts` (214 lines) passes UNCHANGED —
  research confirmed no test asserts call *order*, only args/results, so this should require no
  test-assertion edits, only potentially updated mock setups if a mock's call-count expectations
  were order-sensitive (verify, don't assume).

- [ ] **Step 4**: Add the 2 new tests from the research doc's "Verification" subsection: (a) mock
  `NodeService.getNodesByPage`/`PageService.getPageTranslations` with controllable delays, assert
  both were in flight concurrently (not sequential); (b) a case with 2 single-entry nodes where the
  FIRST triggers NOT_FOUND with 0 results and the SECOND is a normal fetch — assert
  `fetchRepeatEntries` was called for BOTH nodes (documents the disclosed 404-path trade-off
  explicitly, doesn't just hope nobody notices the behavior changed).

- [ ] **Step 5: Run tests + typecheck**

  Run `npx astro check` and the full `npm test`.

- [ ] **Step 6: Commit**

  ```bash
  git add -A
  git commit -m "perf(fe): parallelize resolveCmsPageProps's SSR waterfall (node-tree+translations, repeat-entry loop)"
  ```

---

## Task 13 (FE, item 3.11): Fix canvas remount-on-every-keystroke defect

**Files:**
- Modify: `src/modules/cms/node/buildNodeTree.ts` (add `buildNodeTreeMemo`, additive — do not
  modify the existing `buildNodeTree` export, which has 17 other consumers)
- Modify: `src/modules/cms/admin/nodeBuilder/NodeBuilder.page.tsx` (swap `tree()`'s implementation)
- Test: a new test for `buildNodeTreeMemo` using a REAL Solid store (client vitest project)

**Interfaces:**
- Read the FULL "3.11" section of `group3-research-fe.md` in full — this is the most subtle FE task
  in this plan. It contains a proof (not just an assertion) that a naive reference-based
  `createMemo` wrap is WRONG for this codebase's Solid store semantics, and the complete correct
  `buildNodeTreeMemo` implementation using deep-value comparison instead.
- **Do not attempt the "obvious" fix** (`const tree = createMemo(() => buildNodeTree(nodes));`) —
  research proves this is INCORRECT: Solid's store mutates nested containers (`props`, `style`,
  `layout`, etc.) IN PLACE, so a reference-equality check on any container field can never detect a
  real edit, meaning the memo would report "unchanged" for genuinely-changed data and the canvas
  would go SILENTLY STALE — worse than the current bug. This was verified against
  `node_modules/solid-js/store/dist/store.js`'s actual `setProperty`/`updatePath` source, not
  guessed — if you're tempted to simplify away from the deep-comparison approach, re-read that
  proof first.
- `buildNodeTreeMemo(flat, cache)` is ADDITIVE — the existing `buildNodeTree` function stays
  untouched (used by 17 other consumers including the public-site `NodeRenderer.tsx` pipeline, which
  has no remount problem since public pages never live-edit). Only `NodeBuilder.page.tsx`'s admin
  canvas switches to the new memoized version.
- The `cache: Map<string, NodeTree>` must be created ONCE per `NodeBuilder.page.tsx` component
  instance (e.g. `const nodeTreeCache = new Map<string, NodeTree>();` in the component body), NOT
  module-level — a module-level cache would leak state between multiple component instances (e.g.
  in tests, or if the Node Builder is ever mounted twice).

- [ ] **Step 1**: Read `NodeBuilder.page.tsx`'s current `tree` definition (confirm it's still at
  line ~278, a plain function not `createMemo`) and the `<For each={tree()}>` usage (confirm ~line
  1569), and `buildNodeTree.ts`'s current `attach()` implementation in full.

- [ ] **Step 2**: Read `node_modules/solid-js/store/dist/store.js`'s `setProperty`/`updatePath`
  yourself to independently confirm the research doc's claim (nested store writes mutate containers
  in place, never replacing them) — this is the load-bearing correctness argument for the whole
  task, verify it rather than trusting the research doc alone.

- [ ] **Step 3**: Implement `buildNodeTreeMemo` in `buildNodeTree.ts`, per the research doc's
  complete code — deep-value comparison via `JSON.stringify` on each node's own fields (excluding
  `children`), reference-list comparison for the resolved `children` array, cache-entry pruning for
  ids no longer present.

- [ ] **Step 4**: In `NodeBuilder.page.tsx`, add the component-scoped `nodeTreeCache` and swap
  `const tree = () => buildNodeTree(nodes);` for
  `const tree = createMemo(() => buildNodeTreeMemo(nodes, nodeTreeCache));`. The `<For each={tree()}>`
  usage itself is UNCHANGED (Solid's `<For>` already keys by referential identity — this fix is
  entirely about not manufacturing new references for unchanged data, not about the `<For>` call
  site).

- [ ] **Step 5**: Write the new test per the research doc's described design: a REAL
  `createStore<NodeDTO[]>([...])` (in a `.test.ts` file under the client vitest project, matching
  the "need real Proxy behavior" reasoning `detachFromStore.test.ts` already establishes for the
  same store-aliasing concern), call `buildNodeTreeMemo` twice with a leaf mutation via `setNodes`
  between calls, assert: (1) the edited node + its ancestors got NEW identities and reflect the new
  value; (2) every untouched sibling subtree kept the EXACT SAME object reference across both calls.

- [ ] **Step 6**: Confirm `test/modules/cms/node/buildNodeTree.test.ts` (existing, 5 tests) still
  passes unchanged — it covers the untouched `buildNodeTree` function.

- [ ] **Step 7: Run tests + typecheck**

  Run `npx astro check` and the full `npm test`. A live-browser "does typing in the Inspector avoid
  a visible canvas flicker" check is desirable but not required to merge — the unit test proves the
  mechanism directly (per research). Note in your report whether Playwright MCP was available this
  time; if so, do the live check as extra confidence, if not, proceed on the unit test alone.

- [ ] **Step 8: Commit**

  ```bash
  git add -A
  git commit -m "fix(fe): canvas no longer remounts on every keystroke (deep-value-memoized node tree)"
  ```

---

## Task 14 (FE, item 3.13): Image `loading="lazy"` + delete dead `AstroImage.astro`

**Files:**
- Modify: `src/modules/cms/node/primitives/CardListNode.tsx` (3 `<img>` tags, lines 38/77/116)
- Modify: `src/modules/cms/node/primitives/ContentDetailNode.tsx` (2 `<img>` tags, lines 306/374)
- Delete: `src/core/components/astro/AstroImage.astro`
- Test: extend/add attribute assertions for the 2 modified primitives' existing test files

**Interfaces:**
- Read the FULL "3.13" section of `group3-research-fe.md` — includes the full reasoning for why a
  real `astro:assets` integration is NOT achievable for this codebase's architecture (Astro-only
  APIs unusable inside Solid islands; most images resolved dynamically inside Solid's own render
  tree; no intrinsic-dimension data on the `Media` GraphQL type even for a width/height-attribute
  fallback) — **do not attempt an `astro:assets` integration in this task**, it is explicitly
  descoped per that research.
- `ImageNode.tsx` ALREADY has `loading="lazy"` — confirmed by research, no change needed there.
- `AstroImage.astro` has ZERO usages anywhere (confirmed via grep in research) — safe to delete as
  dead code, cross-referenced with Group 5's dead-code sweep scope (this task does the deletion now
  rather than waiting for Group 5, since it's directly adjacent to this item).
- The CLS gap the audit originally worried about is ALREADY largely mitigated for the 5 `<img>`
  sites in this task via existing Tailwind aspect-ratio utility classes (confirmed by research) —
  the real, actionable gap closed by this task is missing `loading="lazy"` only.

- [ ] **Step 1**: Read `CardListNode.tsx` and `ContentDetailNode.tsx` in full, confirm the 5
  `<img>` tags' current line numbers and that none has `loading="lazy"` yet.

- [ ] **Step 2**: Add `loading="lazy"` to all 5 `<img>` tags.

- [ ] **Step 3**: Confirm `AstroImage.astro` has zero usages via a fresh grep (`grep -rn
  "AstroImage" src`), then delete the file.

- [ ] **Step 4**: Locate the existing test files covering `CardListNode`/`ContentDetailNode` (verify
  exact names — not confirmed during research) and add a simple attribute assertion per component
  (render, then assert each rendered `<img>`'s `loading` attribute equals `'lazy'`).

- [ ] **Step 5: Run tests + typecheck**

  Run `npx astro check` (confirms no lingering import of the deleted `AstroImage.astro` anywhere)
  and the full `npm test`. No Playwright/visual verification needed (well-understood browser
  attribute behavior).

- [ ] **Step 6: Commit**

  ```bash
  git add -A
  git commit -m "perf(fe): add loading=lazy to remaining CMS image primitives; delete dead AstroImage.astro"
  ```

---

## Task 15 (FE, item 3.14): `Cache-Control` header for non-personalized public pages

**Files:**
- Create: `src/modules/cms/api/resolveCacheControlHeader.ts`
- Modify: `src/pages/index.astro`, `src/pages/[...path].astro` (set the header on the success path)
- Test: create `test/modules/cms/api/resolveCacheControlHeader.test.ts`

**Interfaces:**
- Read the FULL "3.14" section of `group3-research-fe.md` — includes the confirmed-via-Dockerfile
  finding that this project's REAL deployment target is a self-hosted Node container (`DEPLOY_TARGET=node`,
  `node ./dist/server/entry.mjs`), NOT Vercel, even though `@astrojs/vercel` is present as a
  configurable (currently dormant) adapter option — so this task implements a standard,
  deploy-target-agnostic `Cache-Control` header, NOT anything Vercel-ISR-specific.
- `resolveCacheControlHeader()` is a pure function (`'public, max-age=60,
  stale-while-revalidate=300'`) — the exact header value the research doc settled on, with the
  60s/300s reasoning tied to Group 0's SSR `network-only` fix (every request already re-fetches
  fresh app-layer data; this header adds a bounded HTTP-layer staleness window purely to absorb
  repeat-request load at an edge/proxy layer in front of the real deployment).
- Set the header ONLY on the success path in both `.astro` files (not on 404/redirect responses —
  avoids an intermediary caching a stale 404/redirect past its useful life).
- The entire public CMS surface is exactly these 2 files (confirmed by research) — do NOT add this
  logic to `middleware.ts` (research explicitly evaluated and rejected that approach — see its
  reasoning: hostname-vs-path-prefix signal drift, middleware running for every request including
  health checks/sitemap/auth pages, and this 2-file scoped approach can never accidentally cache a
  future authenticated route).

- [ ] **Step 1**: Read `src/pages/index.astro` and `src/pages/[...path].astro` in full to confirm
  their current frontmatter structure (the success/404/redirect branching).

- [ ] **Step 2**: Create `resolveCacheControlHeader.ts` per the research doc's complete code
  (including its doc comment explaining the deployment-target reasoning).

- [ ] **Step 3**: Set `Astro.response.headers.set('Cache-Control', resolveCacheControlHeader())` on
  the success path in both `.astro` files, per the research doc's proposed frontmatter structure.

- [ ] **Step 4**: Write `test/modules/cms/api/resolveCacheControlHeader.test.ts` — a trivial pure-
  function unit test asserting the exact returned string.

- [ ] **Step 5: Run tests + typecheck**

  Run `npx astro check` and the full `npm test`. Verifying the header is present on a REAL HTTP
  response needs either a new integration-test category (spin up the built Node server, `fetch()` a
  real request) or a manual `curl -I` check against a running dev/preview server — the unit test
  above is the minimum bar for this task; if time allows, add the integration-test category as a
  valuable new addition (flagged by research as a stretch goal, not required), otherwise do a
  manual `curl -I` check and report the result.

- [ ] **Step 6: Commit**

  ```bash
  git add -A
  git commit -m "perf(fe): Cache-Control header on public CMS pages (public, max-age=60, swr=300)"
  ```

---

## Task 16 (FE, item 3.15-FE): `FormSubmissionsPanel` real pagination

**Files:**
- Modify: `src/shared/services/form/form.service.ts` (`getAllFormSubmission`)
- Modify: `src/modules/cms/admin/FormSubmissionsPanel.tsx` (pagination UI + CSV export behavior)
- Test: extend/create tests for both files

**Interfaces:**
- **This task depends on BE Task 9 being complete** — do not start until the controller confirms
  Task 9's final `getAllFormSubmission` resolver shape (query name, args, return type) is stable.
  Read the FULL "3.15" section of `group3-research-fe.md`'s FE-consumer analysis first — it
  documents the CURRENT flat-array shape and the exact `getAllForm` pattern (same file) to mirror
  for the new paginated shape.
- Rewrite `FormService.getAllFormSubmission` from a flat-array-returning query to the same
  `edges`/`pageInfo` cursor pattern `FormService.getAllForm` (same file, lines 64-75) already uses
  — read that method as your template, then adapt it for `getAllFormSubmission`'s new BE shape
  (confirmed exact shape from BE Task 9's report).
- `FormSubmissionsPanel.tsx` currently: loads ALL submissions in one `createResource` call, renders
  a non-virtualized `<table>`, and its CSV export (`handleExportCsv`) builds the CSV client-side
  from the already-loaded in-memory array. This task must decide and implement one of: (a) real
  pagination/infinite-scroll UI for the table (simplest, most consistent with the new paginated
  query), or (b) keep "load everything for display" but loop pages to rebuild the CSV export
  specifically. Use your judgment on which fits this codebase's existing Datatable/pagination UI
  conventions best (check how other paginated admin lists in this codebase — e.g. wherever
  `getAllForm`'s consumer renders — handle their UI, and follow that established pattern rather than
  inventing a new one). Document your choice and reasoning in your task report.
- The panel's own comment ("BE trả mảng thẳng, không phân trang") is now STALE once this task lands
  — update or remove it.

- [ ] **Step 1**: Confirm BE Task 9's final resolver shape is available (from its task report).
  Read `form.service.ts`'s current `getAllFormSubmission` AND `getAllForm` in full, and
  `FormSubmissionsPanel.tsx` in full (including `handleExportCsv`).

- [ ] **Step 2**: Rewrite `FormService.getAllFormSubmission` to the `edges`/`pageInfo` pattern,
  mirroring `getAllForm`'s query-building approach, matching BE Task 9's confirmed exact shape.

- [ ] **Step 3**: Rework `FormSubmissionsPanel.tsx` for the new paginated data shape — implement
  your chosen approach (real pagination UI, or a page-looping CSV-export path, or both) per Step 1's
  interface guidance. Update/remove the now-stale "BE trả mảng thẳng" comment.

- [ ] **Step 4**: Update/add tests for both files — the FE service's query-building test, and the
  panel's rendering/pagination-interaction/CSV-export test(s), adapted for the new data shape.

- [ ] **Step 5: Run tests + typecheck**

  Run `npx astro check` and the full `npm test`.

- [ ] **Step 6: Commit**

  ```bash
  git add -A
  git commit -m "perf(fe): FormSubmissionsPanel real pagination (matches BE getAllFormSubmission conversion)"
  ```
