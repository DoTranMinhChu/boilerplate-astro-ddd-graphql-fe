# Group 2: High-Leverage Shared Abstractions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to
> implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the biggest hand-duplicated code patterns across both repos into shared
abstractions, per the master audit report's Group 2. 6 BE tasks + 2 FE tasks, ordered low-risk
first. A full read-only re-audit (2026-09-04, post Group-1) found real landmines in every item —
this plan encodes them so implementers don't rediscover them the hard way.

**Architecture:** No new layers — extend each repo's existing base-class conventions
(`BaseService<T>`/`ABaseRepository<T>`/`BaseRestController<T>` on BE; the `ChangePasswordForm`
prop-injection pattern on FE). Where duplicated code has silently diverged in ways that look like
real bugs (Page.path's unworkaround-ed unique-index crash, Tenant/Media's Update DTOs not
actually being optional), fix the bug in its own reviewable commit — do not fold a behavior
change into a pure-refactor commit.

**Tech Stack:** TypeScript (both repos), TypeORM/GraphQL (BE), SolidJS (FE). No new dependencies.

## Global Constraints

- BE: full suite must stay green (baseline 67/67 suites, 582/582 tests); `npx tsc --noEmit`
  clean.
- FE: full suite must stay green (baseline 108/108 suites, 1122/1122 tests — this repo has
  documented pre-existing rotating post-teardown flakiness in a rotating set of unrelated files,
  plus occasional CPU-contention-related flakiness from other processes on this shared machine;
  rerun once if a failure looks unrelated to your task); `npx astro check` clean.
- Never change a GraphQL field's wire shape (name, nullability, type) as a side effect of an
  internal refactor — a resolver/DTO restructure must produce byte-identical schema output
  unless a task explicitly says otherwise (Tasks 3 and 8 below each carry one deliberate,
  separately-committed behavior fix — everything else is structure-only).
- Every new shared abstraction goes in the established location for its kind: BE services in
  `src/core/application/services/`, BE repository bases in `src/core/infrastructure/database/`,
  BE utils in `src/core/shared/utils/`; FE shared components in `src/shared/components/<domain>/`
  or `src/layouts/` as appropriate (per Group 1's now-enforced core/shared boundary — the new FE
  abstractions in this plan belong in `shared/`/`layouts/`, never `core/`, since they are
  inherently business-aware).
- Preserve every existing public method name on a refactored class as a thin wrapper unless a
  task explicitly says to rename — this keeps the blast radius of each task to the files it lists,
  not every caller across the codebase.
- Source citations (file:line) below come from a full read-only audit completed 2026-09-04;
  re-verify each one against the current file before editing — line numbers drift.

---

## Task 1 (BE): `DefaultableConfigService<T>`/`DefaultableRepository<T>` base

**Files:**
- Create: `src/core/application/services/defaultableConfig.service.ts`,
  `src/core/infrastructure/database/defaultableConfig.repository.ts`
- Modify: `src/modules/theme/application/services/theme.service.ts`,
  `src/modules/theme/infrastructure/persistence/theme.repository.ts`,
  `src/modules/headerPreset/application/services/headerPreset.service.ts`,
  `src/modules/headerPreset/infrastructure/persistence/headerPreset.repository.ts`,
  `src/modules/footerPreset/application/services/footerPreset.service.ts`,
  `src/modules/footerPreset/infrastructure/persistence/footerPreset.repository.ts`
- Test: extend/add coverage under `test/core/application/services/`,
  `test/modules/{theme,headerPreset,footerPreset}/`

**Interfaces:**
- Produces:
  ```ts
  export abstract class DefaultableConfigService<T extends BaseEntity & { isDefault: boolean }> extends BaseService<T> {
      constructor(protected readonly repo: DefaultableRepository<T>, entityName: string);
      async findAll(): Promise<T[]>;
      async findDefault(): Promise<T | null>;
      async createWithAutoDefault(data: DeepPartial<T>): Promise<T>;
      async setDefault(id: string): Promise<T>;
      async deleteWithReassignment(id: string): Promise<void>;
  }
  export abstract class DefaultableRepository<T extends BaseEntity & { isDefault: boolean }> extends ABaseRepository<T> {
      async findDefault(): Promise<T | null>;
  }
  ```
- Consumes: `BaseService<T>`, `ABaseRepository<T>` (existing).

- [ ] **Step 1**: read `theme.service.ts`, `headerPreset.service.ts`, `footerPreset.service.ts`,
  and their 3 repositories in full to confirm the exact current behavior of `findAll`/
  `findDefault`/`setDefault`/delete-with-reassignment (re-verify against the plan's citations,
  which may have drifted).

- [ ] **Step 2**: create `DefaultableRepository<T>` in
  `src/core/infrastructure/database/defaultableConfig.repository.ts` with `findDefault()`
  exactly matching the 3 existing repositories' identical body.

- [ ] **Step 3**: create `DefaultableConfigService<T>` in
  `src/core/application/services/defaultableConfig.service.ts` with `findAll`/`findDefault`/
  `createWithAutoDefault`/`setDefault`/`deleteWithReassignment` matching the 3 existing services'
  identical bodies exactly (byte-for-byte behavior, not just similar).

- [ ] **Step 4**: make `ThemeRepository`/`HeaderPresetRepository`/`FooterPresetRepository`
  extend `DefaultableRepository<T>`, removing their own now-redundant `findDefault()`.

- [ ] **Step 5**: make `ThemeService`/`HeaderPresetService`/`FooterPresetService` extend
  `DefaultableConfigService<T>`. Keep each service's existing public method names
  (`createTheme`/`createPreset`, `deleteTheme`/`deletePreset`, etc.) as thin wrappers calling the
  new base methods — **do not rename these**, since the 3 resolver files
  (`theme.resolver.ts`, `headerPreset.resolver.ts`, `footerPreset.resolver.ts`) call them by
  name and this task should not need to touch resolvers at all. `ThemeService.createTheme` keeps
  its extra `typography.scale` backfill step (call `super.createWithAutoDefault(...)` then patch
  the result, or override entirely — your call, whichever reads cleaner) — this is a legitimate
  isolated override, not something to eliminate.

- [ ] **Step 6: Run tests + typecheck**

  Run: `npm test -- test/modules/theme test/modules/headerPreset test/modules/footerPreset`
  then the full suite `npm test` (67/67 suites, 582/582 tests) and `npx tsc --noEmit`.

- [ ] **Step 7: Commit**

  ```bash
  git add -A
  git commit -m "refactor(be): extract DefaultableConfigService/Repository base from Theme/HeaderPreset/FooterPreset"
  ```

---

## Task 2 (BE): Shared `cycleGuard.util.ts` — TWO functions, not one

**Files:**
- Create: `src/core/shared/utils/cycleGuard.util.ts`
- Modify: `src/modules/node/application/services/node.service.ts`,
  `src/modules/taxonomy/application/services/term.service.ts`,
  `src/modules/menu/application/services/menuItem.service.ts`,
  `src/modules/component/application/services/component.service.ts`
- Test: extend coverage under `test/modules/{node,taxonomy,menu,component}/application/services/`
  if cycle-detection tests exist there already; add if not

**Interfaces:**
- Produces:
  ```ts
  export interface CycleGuardOptions {
      maxSteps?: number; // default 50
      onSelfReference: () => never;
      onCycle: () => never;
  }
  /** Linear parentId-chain walk — for Node/Term/MenuItem's shape. */
  export async function assertNoParentCycle<TId>(
      targetId: TId | undefined,
      candidateParentId: TId | undefined,
      getParentId: (id: TId) => Promise<TId | undefined>,
      options: CycleGuardOptions,
  ): Promise<void>;
  /** DFS over N-nested-ids-per-step — for Component's containment shape (NOT the same
   * algorithm as the linear walk above, despite the 4 modules' comments claiming they're all
   * "the same algorithm" — verified during audit that Component's is structurally a different
   * traversal, not a single-chain walk). */
  export async function assertNoContainmentCycle<TId>(
      rootId: TId,
      candidateId: TId,
      getContainedIds: (id: TId) => Promise<TId[]>,
      options: CycleGuardOptions & { maxDepth?: number },
      depth?: number,
  ): Promise<void>;
  ```

- [ ] **Step 1**: read all 4 current implementations in full — `node.service.ts`'s
  `assertNoCycle`, `term.service.ts`'s `assertNoCycle`, `menuItem.service.ts`'s `assertNoCycle`,
  `component.service.ts`'s `assertNoComponentCycle` — to confirm the plan's characterization
  (3 identical linear-chain walks + 1 genuinely different DFS) is still accurate, and to capture
  each one's EXACT error message text and `EErrorCode` (Component uses
  `EErrorCode.COMPONENT_CYCLE` deliberately, per its own comment, to avoid a translation-catalog
  collision — this must be preserved, not replaced with a generic message/code) and depth-cap
  constant (Term/MenuItem: 50, Node: `MAX_TREE_DEPTH + 5` = 35, Component: 20 — preserve each
  value per-call, do not unify them).

- [ ] **Step 2**: create `src/core/shared/utils/cycleGuard.util.ts` with both functions exactly
  as specified above.

- [ ] **Step 3**: update the 3 linear-walk call sites (Node's 2 call sites at create/move, Term's
  2 at create/update, MenuItem's 2 at create/update — 6 total) to call `assertNoParentCycle`,
  passing a `getParentId` closure over each module's own repository, and `onSelfReference`/
  `onCycle` callbacks that throw each module's EXACT original message/exception type (re-read
  each site's current throw before replacing it — do not paraphrase the message).

- [ ] **Step 4**: update Component's 1 call site (`insertComponentInstance`) to call
  `assertNoContainmentCycle`, passing a `getContainedIds` closure wrapping the existing
  `nodeRepository.findByCondition` + Set-dedup logic, preserving the `EErrorCode.COMPONENT_CYCLE`
  code and depth cap of 20.

- [ ] **Step 5**: delete each module's now-dead private `assertNoCycle`/
  `assertNoComponentCycle` method.

- [ ] **Step 6: Run tests + typecheck**

  Run: `npm test -- test/modules/node test/modules/taxonomy test/modules/menu test/modules/component`
  then the full suite `npm test` and `npx tsc --noEmit`. If no existing test currently exercises
  the cycle-rejection path for one of these 4 modules, add one (a create/update call that would
  create a cycle, asserting the specific exception type is thrown) — this behavior has never had
  direct regression coverage across all 4 modules in some cases; check first, don't blindly
  duplicate effort where coverage already exists.

- [ ] **Step 7: Commit**

  ```bash
  git add -A
  git commit -m "refactor(be): extract shared cycleGuard.util.ts (2 functions: linear-chain + containment-DFS)"
  ```

---

## Task 3 (BE): `UpdateXInput extends CreateXInput` convention rollout

**Files:**
- Modify (pure dedup, no behavior change — ~16 files):
  `src/modules/node/application/dto/node.dto.ts`,
  `src/modules/page/application/dto/page.dto.ts`,
  `src/modules/media/application/dto/media.dto.ts`,
  `src/modules/mediaSet/application/dto/mediaSet.dto.ts`,
  `src/modules/theme/application/dto/theme.dto.ts`,
  `src/modules/headerPreset/application/dto/headerPreset.dto.ts`,
  `src/modules/footerPreset/application/dto/footerPreset.dto.ts`,
  `src/modules/taxonomy/application/dto/taxonomy.dto.ts`,
  `src/modules/taxonomy/application/dto/term.dto.ts`,
  `src/modules/menu/application/dto/menu.dto.ts`,
  `src/modules/menu/application/dto/menuItem.dto.ts`,
  `src/modules/contentType/application/dto/contentType.dto.ts`,
  `src/modules/artDirectionKit/application/dto/artDirectionKit.dto.ts`,
  `src/modules/emailConfig/application/dto/emailConfig.dto.ts`,
  `src/modules/agency/application/dto/agency.dto.ts`,
  `src/modules/contentEntry/application/dto/contentEntry.dto.ts`
- Modify (dedup + a real, deliberate, separately-committed behavior fix):
  `src/modules/tenant/application/dto/tenant.dto.ts`
- Optional cosmetic-only, low priority (flip `extends` direction for naming consistency, no
  behavior change either way): `src/modules/unit/application/dto/unit.dto.ts`,
  `src/modules/codeConfig/application/dto/codeConfig.dto.ts` — do these ONLY if time permits
  after the rest, skip without concern if not.
- Test: full suite is the safety net (GraphQL schema shape must stay byte-identical for every
  file except `tenant.dto.ts`); no new tests needed for the pure-dedup files, but see Step 3 for
  `tenant.dto.ts`.

**Interfaces:** No new shared code — this is `class UpdateXInput extends CreateXInput { }` per
module, following `src/modules/form/application/dto/form.dto.ts`'s existing reference pattern
exactly. Re-declare only the fields that genuinely differ (an Update-only field, or a
Create-only immutable field like `pageId`/`taxonomyId`/`menuId`/`key`/`code` that Update must
NOT inherit as settable — use `Omit<CreateXInput, 'thatField'>` composition or re-declare the
type without it, matching whatever the codebase's existing correct examples
(Taxonomy/Term/MenuItem/ContentType, which already handle their one immutable field correctly)
do.

- [ ] **Step 1**: for each of the ~16 files in the first list, read the current Create/Update DTO
  pair in full, confirm which fields are genuinely Create-only (immutable after creation) vs
  which are fully shared, then rewrite `UpdateXInput` as `extends CreateXInput` with only the
  genuine differences re-declared. Work through them one at a time — don't batch-guess field
  lists from the plan's citations alone, since they may have drifted.

- [ ] **Step 2**: after each file's rewrite, spot-check that the GraphQL schema shape is
  unchanged — the easiest check is whether `npx tsc --noEmit` stays clean AND whether any
  resolver/test that constructs one of these input types still compiles; a real schema-shape
  diff tool isn't required for this task, but if the codebase has one (check for a committed
  schema snapshot or introspection test), use it.

- [ ] **Step 3**: `tenant.dto.ts` — do the SAME dedup as above, but ALSO fix a real bug found
  during audit: `UpdateTenantInput`'s `website`/`contactEmail`/`taxCode`/`isActivated`/
  `subscribedFeatures` fields are currently declared without `nullable: true`/`?` at all (i.e.
  as required as Create, which defeats the point of a partial update). Fix this as a SEPARATE
  commit from the dedup (Step 6 below has 2 commits for this reason) so a reviewer can evaluate
  the behavior change in isolation from the mechanical restructuring. Re-verify this claim
  against the current file before fixing — it may have already been caught by unrelated work.

- [ ] **Step 4**: `media.dto.ts` has the same "Update DTO's fields aren't actually optional"
  characteristic as Tenant (all 6 fields required in both Create and Update) — read it to
  confirm, and if still true, apply the same nullable-fix treatment as Tenant, in its own
  commit, not bundled with the mechanical dedup.

- [ ] **Step 5**: only if time permits, apply the cosmetic `extends` direction flip to
  `unit.dto.ts`/`codeConfig.dto.ts` (currently `CreateXInput extends UpdateXInput`, flip to match
  convention) — zero behavior change, purely for consistency; skip without concern if you're
  running low on time budget for this task.

- [ ] **Step 6: Run tests + typecheck + commit**

  Run the full suite (`npm test`, 67/67 suites, 582/582 tests) and `npx tsc --noEmit` after each
  logical chunk. Commit in this order:
  ```bash
  git add -A -- ':!src/modules/tenant/application/dto/tenant.dto.ts' ':!src/modules/media/application/dto/media.dto.ts'
  git commit -m "refactor(be): UpdateXInput extends CreateXInput convention rollout (14 modules, pure dedup)"
  git add -A -- src/modules/tenant/application/dto/tenant.dto.ts
  git commit -m "refactor(be): dedup Tenant DTOs + fix UpdateTenantInput fields not actually optional"
  git add -A -- src/modules/media/application/dto/media.dto.ts
  git commit -m "refactor(be): dedup Media DTOs + fix UpdateMediaInput fields not actually optional"
  ```
  (Adjust the exact `git add` scoping if you did the optional Step 5 cosmetic files too — commit
  those separately as well, clearly labeled cosmetic-only.)

---

## Task 4 (BE): Partial-unique-index pattern rollout

**Files:**
- Modify: `src/modules/page/domain/entities/page.entity.ts`,
  `src/modules/component/domain/entities/component.entity.ts`,
  `src/modules/page/domain/entities/redirect.entity.ts`,
  `src/modules/form/domain/entities/form.entity.ts`
- Create: one new migration file (pattern: mirror
  `src/core/infrastructure/database/migrations/1788352889408-PartialUniqueIndexTaxonomyTerm.ts`
  exactly — same drop-old/create-new-partial-index shape) covering all 4 entities' index changes
- Test: extend `test/modules/page/`, `test/modules/component/`, `test/modules/form/` entity/
  service tests to cover the specific bug this closes for `Page.path` (see Step 2)

**Interfaces:** No interface/type changes — this is a DB-index-only change (index definition on
existing columns), following the exact pattern already proven safe by the Taxonomy/Term
migration from Group 0.

**Explicitly OUT OF SCOPE for this task** (flagged during audit as needing a product decision,
not a mechanical follow-up): applying this same pattern to `Admin.username`, `Merchant.username`,
`Agency.code`, `Tenant.code`, `Customer.email`/`googleId` — whether "same username/code/email
reusable after account deletion" is desired UX or whether these should remain permanently unique
for audit reasons is a product call, not something to decide unilaterally in this pass. Do not
touch these 5 entities in this task.

- [ ] **Step 1**: read `component.service.ts`'s current hard-delete workaround code (2 sites:
  the rollback path and `deleteComponentDefinition`) to confirm it's still there and still shaped
  the way the audit found it — this task does NOT remove the workaround (that's a separate,
  higher-risk follow-up per the audit's own risk note), it only adds the DB-level partial index
  so a future task CAN safely remove the workaround. Leave `component.service.ts` itself
  untouched in this task.

- [ ] **Step 2**: `Page.path` is the highest-priority fix in this task — the audit found this is
  not just "missing the pattern" but an ACTIVE BUG: `page.service.ts`'s `assertPathAvailable`
  uses a soft-delete-excluding lookup, so it reports a path "available" right after a soft
  delete, then the actual `create()` call hits the raw (non-partial) unique index and throws an
  unhandled Postgres unique-violation instead of a friendly `ConflictException`. Re-verify this
  bug is still live by reading `page.service.ts`'s current `assertPathAvailable`/`createPage`
  methods. Add a regression test that reproduces it BEFORE the fix (soft-delete a page, then try
  to create a new page with the same path — confirm it currently throws an ugly raw error, not
  `ConflictException`), confirming the test fails pre-fix and passes post-fix.

- [ ] **Step 3**: add `@Index({ unique: true, where: '"deletedAt" IS NULL' })` to
  `PageEntity.path`, `ComponentDefinitionEntity.key`, `RedirectEntity.fromPath`,
  `FormEntity.key`, replacing whatever plain `@Index({ unique: true })` or `@Unique` decorator
  each currently has.

- [ ] **Step 4**: write the migration — drop each entity's old plain unique
  index/constraint (read the actual current index NAME from the DB or a prior migration for
  each, matching the precision the Taxonomy/Term migration used — don't guess index names),
  create the 4 new partial unique indexes. Follow the exact structure of
  `1788352889408-PartialUniqueIndexTaxonomyTerm.ts`.

- [ ] **Step 5: Run tests + typecheck**

  Run: `npm test -- test/modules/page test/modules/component test/modules/form` (confirm the
  new `Page.path` regression test now passes) then the full suite `npm test` (67/67 suites,
  582/582 tests + any new tests) and `npx tsc --noEmit`.

- [ ] **Step 6: Commit**

  ```bash
  git add -A
  git commit -m "fix(be): partial-unique-index rollout for Page.path/Component.key/Redirect.fromPath/Form.key

  Page.path was an active bug: soft-delete-excluding pre-check let assertPathAvailable
  report a path available right after a soft delete, then create() crashed on the raw
  Postgres unique-violation instead of throwing ConflictException."
  ```

---

## Task 5 (BE): `BaseGraphQLResolver<T>` real CRUD helper methods

**Files:**
- Modify: `src/core/infrastructure/http/baseGraphql.resolver.ts` (add protected helper methods,
  additive only — no existing behavior removed)
- Modify (opt-in refactor to USE the new helpers, reducing each method body to a 1-liner —
  start with the highest-value, lowest-risk subset, not all ~26): pick AT LEAST these 3 first —
  `src/modules/theme/infrastructure/http/graphql/theme.resolver.ts`,
  `src/modules/headerPreset/infrastructure/http/graphql/headerPreset.resolver.ts`,
  `src/modules/footerPreset/infrastructure/http/graphql/footerPreset.resolver.ts`
  (these 3 are confirmed byte-identical shape by the audit — do these first, then continue to as
  many of the other ~20-23 standard-CRUD-shaped resolvers as time allows in this same task,
  skipping any resolver whose CRUD methods have real bespoke logic beyond the standard skeleton
  — `node.resolver.ts`, `page.resolver.ts`, `component.resolver.ts`, `contentEntry.resolver.ts`,
  `accountPermission.resolver.ts` are explicitly NOT simple CRUD shape, leave them untouched in
  this task)
- Test: full suite is the primary safety net (this must not change GraphQL field names/args/
  nullability for ANY resolver touched)

**Interfaces:**
- Produces (additive to `BaseGraphQLResolver<T>`):
  ```ts
  protected async getOneImpl(id: string, fieldOptions?: GqlSelectOptions<T>): Promise<T | null>;
  protected async getAllImpl(input: GQLPaginationArgs, fieldOptions?: GqlSelectOptions<T>): Promise<...>;
  protected async createImpl(data: DeepPartial<T>, fieldOptions?: GqlSelectOptions<T>): Promise<T>;
  protected async updateImpl(id: string, data: DeepPartial<T>, fieldOptions?: GqlSelectOptions<T>): Promise<T>;
  protected async deleteImpl(id: string): Promise<boolean>;
  ```
  Read `BaseService<T>`'s actual current method signatures (`findOneByCondition`,
  `findAllPagination`, `create`, `updateById`, `softDeleteById`) before writing these — match
  the real signatures exactly, the plan's proposal above is illustrative, not a verbatim spec.

  **Important — do NOT decorate these helper methods with `@Query`/`@Mutation`.** The audit
  found that `@Query`/`@Mutation` bake a literal GraphQL field name into metadata at
  class-definition time, and `graphQLSchema.loader.ts` walks the JS prototype chain — a decorated
  method on the BASE class would be inherited under the SAME field name by every subclass,
  causing a schema collision. These helpers are plain protected methods; each subclass's own
  EXISTING, individually-decorated, individually-field-named `@Query`/`@Mutation` methods call
  them — this task only collapses method BODIES to one-liners, it does not touch how GraphQL
  fields get registered. (A separate, higher-risk factory-based auto-registration approach was
  considered and explicitly deferred — do not attempt it in this task.)

- [ ] **Step 1**: read `baseGraphql.resolver.ts`'s current (10-line) content, `BaseService<T>`'s
  real method signatures, and `theme.resolver.ts`/`headerPreset.resolver.ts`/
  `footerPreset.resolver.ts` in full to confirm the audit's "byte-identical shape" claim and
  capture the EXACT current behavior each `@Query`/`@Mutation` method needs to preserve
  (permission decorators, role checks, argument shapes — these stay on the subclass's own
  decorated method, only the BODY delegates to the new helper).

- [ ] **Step 2**: add the 5 protected helper methods to `BaseGraphQLResolver<T>`, matching
  `BaseService<T>`'s real signatures.

- [ ] **Step 3**: refactor Theme/HeaderPreset/FooterPreset resolvers' CRUD method bodies to call
  the new helpers — each `@Query`/`@Mutation`-decorated method keeps its own decorator, name,
  permission checks, and argument handling; only the body (previously a full `this.service.X(...)`
  call, now `return this.getAllImpl(...)` etc.) changes.

- [ ] **Step 4**: continue to as many of the other confirmed-standard-CRUD-shaped resolvers as
  time allows (from the audit's list: `contentType.resolver.ts`, `taxonomy.resolver.ts`,
  `term.resolver.ts`, `menu.resolver.ts`, `menuItem.resolver.ts`, `emailConfig.resolver.ts`,
  `codeConfig.resolver.ts`, `artDirectionKit.resolver.ts`, `media.resolver.ts`,
  `mediaSet.resolver.ts`, `redirect.resolver.ts`, `siteLocaleSettings.resolver.ts`,
  `activityLog.resolver.ts` (read-only, only needs `getOneImpl`/`getAllImpl`) — read each one
  first, confirm it really is standard-shape before touching it, skip any with real bespoke
  logic you find along the way even if the audit assumed it was standard-shape).

- [ ] **Step 5: Run tests + typecheck**

  Run the full suite (`npm test`, 67/67 suites, 582/582 tests) and `npx tsc --noEmit` after
  EVERY resolver you touch, not just at the end — this is the kind of change where a subtle
  behavior drift (e.g. dropping a permission check that was inline in the old body) would be
  easy to introduce silently. If you have any doubt about a specific resolver's refactor,
  leave it untouched and note it as a disclosed skip rather than guess.

- [ ] **Step 6: Commit**

  ```bash
  git add -A
  git commit -m "refactor(be): add BaseGraphQLResolver CRUD helper methods, adopt in N standard-shape resolvers"
  ```
  (fill in N with the actual count of resolvers you touched)

---

## Task 6 (BE): Shared `AccountCredentialService`

**Files:**
- Create: `src/core/application/services/accountCredential.service.ts` (also defines
  `MIN_PASSWORD_LENGTH = 6`, closing the master report's Group 4.1 finding)
- Modify: `src/modules/admin/application/services/admin.service.ts`,
  `src/modules/merchant/application/services/merchant.service.ts`,
  `src/modules/customer/application/services/customer.service.ts`,
  `src/modules/agencyAccount/application/services/agencyAccount.service.ts`,
  `src/modules/tenantAccount/application/services/tenantAccount.service.ts`,
  `src/modules/admin/infrastructure/persistence/admin.repository.ts`,
  `src/modules/admin/domain/repositories/admin.interface.repository.ts` (generalize
  `findByResetToken` as the shared repository contract other modules can also satisfy)
- Test: this touches live, pre-auth-reachable authentication/account-recovery mutations —
  extend `test/modules/{admin,merchant,customer,agencyAccount,tenantAccount}/application/services/`
  with explicit coverage for changePassword/forgotPassword/resetPasswordByToken through the new
  shared service, not just relying on existing tests continuing to pass

**Interfaces:**
- Produces:
  ```ts
  export const MIN_PASSWORD_LENGTH = 6;
  export interface ICredentialRepository<T> {
      findById(id: string): Promise<T | null>;
      findOneByCondition(options: FindOneOptions<T>): Promise<T | null>;
      updateById(id: string, data: DeepPartial<T>): Promise<T>;
  }
  export class AccountCredentialService<T extends { id: string; password: string }> {
      constructor(private readonly repo: ICredentialRepository<T>);
      assertPasswordPolicy(password: string): void;
      async changePassword(id: string, oldPassword: string, newPassword: string): Promise<void>;
      async resetPasswordAdmin(id: string, newPassword: string): Promise<void>;
      async issueResetToken(account: T, accountType: EPasswordResetAccountType, domain: string, emailConfigService: EmailConfigService): Promise<void>;
      async resetPasswordByToken(token: string, newPassword: string): Promise<void>;
  }
  ```
  Read each of the 5 services' CURRENT `changePassword`/`forgotPassword`/`resetPasswordByToken`
  implementations in FULL before writing the shared service — the signatures above are
  illustrative starting points, not a verbatim spec; match real current behavior exactly,
  especially the Group-0.2 security fix's silent-return + try/catch pattern in whatever becomes
  `issueResetToken` (re-read `admin.service.ts`'s/`merchant.service.ts`'s current
  `forgotPassword` to confirm this exact shape before extracting it — this is a previously-fixed
  Critical security bug, getting the extraction wrong would reintroduce an account-enumeration
  oracle).

  **Critical design constraint**: `accountType: EPasswordResetAccountType` must be an explicit
  parameter the CALLER supplies, never inferred inside the shared service. Confirmed during
  audit: `AgencyAccountService`/`TenantAccountService` deliberately pass `MERCHANT` (not
  `AGENCY`/`TENANT`, which don't even exist as enum members) because Agency/Tenant accounts
  authenticate through their linked Merchant's password — this is intentional design, not a bug
  to "fix" via the abstraction. Do not add any inference/mapping logic that would change this.

  Agency/Tenant's `changePassword`/`forgotPassword` need an extra indirection step (resolve the
  linked Merchant first, THEN delegate to an `AccountCredentialService` instance scoped to that
  Merchant) — this indirection is domain-specific glue that stays in
  `AgencyAccountService`/`TenantAccountService`, not something to absorb into the shared service
  itself.

- [ ] **Step 1**: read all 5 services' current `changePassword`/`resetPassword`/`forgotPassword`/
  `resetPasswordByToken` methods in FULL (not just the cited line ranges — read the surrounding
  context too, since these are security-sensitive flows). Note every place the 10 `< 6` length
  checks appear (confirmed at admin.service.ts:151,214,231; merchant.service.ts:207,269,289;
  customer.service.ts:41,130; agencyAccount.service.ts:112; tenantAccount.service.ts:116 — 
  re-verify against current line numbers). Note `AdminRepository`'s existing
  `findByResetToken(hashedToken)` method vs. Merchant/Customer's inline equivalent — decide
  whether to generalize Admin's dedicated method as the shared contract (recommended) or have
  the shared service do the lookup itself via `findOneByCondition`.

- [ ] **Step 2**: create `AccountCredentialService` with `MIN_PASSWORD_LENGTH`,
  `assertPasswordPolicy`, `changePassword`, `resetPasswordAdmin` (no old-password check variant,
  for admin-initiated resets), `issueResetToken` (the silent-return-safe, try/catch-wrapped
  email-send step — this is the security-critical part, get it byte-identical to the current
  Group-0.2-fixed behavior), `resetPasswordByToken` (sha256 hash the incoming token, look up via
  the repository contract, validate expiry, validate password policy, hash+persist+clear token
  fields).

- [ ] **Step 3**: refactor all 5 services to delegate to an internal `AccountCredentialService`
  instance, keeping every existing PUBLIC method name (`changePassword`, `forgotPassword`,
  `resetPasswordByToken`, `resetPassword`, `resetMerchantPassword`) as thin wrappers — the 5
  resolvers that call these methods need zero signature changes, keeping this task's blast
  radius to the 5 service files (+ the repository interface generalization) only.

- [ ] **Step 4**: add/extend tests specifically re-verifying the Group-0.2 security property
  survives the refactor: calling `forgotPassword`/`issueResetToken` for a NON-EXISTENT account
  must still silently succeed (no thrown `NotFoundException`, no distinguishable response/timing
  from a real account) — this is the exact account-enumeration-oracle bug Group 0 fixed; a
  regression here would be a real, live security bug, not just a test failure.

- [ ] **Step 5: Run tests + typecheck**

  Run: `npm test -- test/modules/admin test/modules/merchant test/modules/customer test/modules/agencyAccount test/modules/tenantAccount`
  then the full suite `npm test` (67/67 suites, 582/582 tests + any new tests) and
  `npx tsc --noEmit`.

- [ ] **Step 6: Commit**

  ```bash
  git add -A
  git commit -m "refactor(be): extract shared AccountCredentialService, add MIN_PASSWORD_LENGTH constant (closes Group 4.1)"
  ```

---

## Task 7 (FE): Shared `LoginForm`/`ForgotPasswordForm` components

**Files:**
- Create: `src/shared/components/auth/LoginForm.tsx`, `src/shared/components/auth/ForgotPasswordForm.tsx`
- Modify: `src/modules/admin/pages/loginAdmin.page.tsx`, `src/modules/agency/pages/login.page.tsx`,
  `src/modules/merchant/auth/loginMerchant.page.tsx`, `src/modules/tenant/pages/auth/login.page.tsx`,
  `src/modules/admin/pages/forgotPasswordAdmin.page.tsx`,
  `src/modules/agency/pages/forgotPasswordAgency.page.tsx`,
  `src/modules/merchant/auth/forgotPasswordMerchant.page.tsx`,
  `src/modules/tenant/pages/auth/forgotPasswordTenant.page.tsx`
- Optional (only if it doesn't expand scope too much — your call): extract the identical
  "already authenticated → redirect to dashboard" `createEffect` (present in all 4 login pages)
  into a small shared `useRedirectIfAuthenticated` hook in `src/shared/hooks/`.
- Test: extend/add coverage under `test/shared/components/auth/` and
  `test/modules/{admin,agency,merchant,tenant}/`

**Interfaces:**
- Produces (exact shapes — read `src/shared/components/password/ChangePasswordForm.tsx` FIRST as
  the reference minimal-prop-injection style before implementing either):
  ```ts
  interface LoginFormProps {
      title: string; heading: string; subtitle: string;
      usernameLabel: string; usernamePlaceholder: string; passwordLabel: string;
      submitLabel: string; forgotPasswordLabel: string; footerBrand: string;
      loginFailedError: string;
      hasOrgCode?: boolean; codeLabel?: string; codePlaceholder?: string;
      headerIcon?: string;
      onSubmit: (values: { code?: string; username: string; password: string }) => Promise<any>;
      onForgotPassword: () => void;
      autoLoginFromUrlToken?: {
          verify: (token: string) => Promise<{ name?: string }>;
          verifyingLabel: string;
          successToast: (name: string) => string;
          failureToast: string;
      };
      extraFooterContent?: () => JSX.Element;
  }
  interface ForgotPasswordFormProps {
      title: string; heading: string; subtitle: string;
      successMessage: string; successHint: string;
      loginFieldLabel: string; loginPlaceholder: string; loginRequiredError: string;
      submitLabel: string; backToLoginLabel: string; onBackToLogin: () => void;
      hasOrgCode?: boolean; codeFieldLabel?: string; codePlaceholder?: string; codeRequiredError?: string;
      onSubmit: (values: { code?: string; login: string }) => Promise<any>;
  }
  ```

  **Critical landmine #1 — do NOT unify the auth-commit call.** Admin/Agency/Tenant call
  `auth.setAuthData(type, data, token): void` (synchronous). Merchant calls a DIFFERENT method
  with a DIFFERENT, async signature: `await auth.setMerchantAuthData(res.merchant, res.token):
  Promise<void>`. `LoginForm` must NEVER call either directly — `onSubmit` is the caller's own
  page-level function that internally calls its own Service + the correct
  `setAuthData`/`setMerchantAuthData` variant. If you find yourself wanting to add an
  auth-commit call inside `LoginForm` itself, stop — that's the bug this note exists to prevent.

  **Critical landmine #2 — the Agency/Tenant auto-login-from-URL-token flow is
  security/UX-sensitive.** It reads a `?token=` URL param, calls
  `AgencyAccountService.agencyAccountGetMe`/`TenantAccountService.tenantAccountGetMe`, shows a
  loading spinner, and toasts success/failure. This sits exactly next to where bug 0.3 (fixed in
  Group 0) lived. Test BOTH the success path AND the invalid/expired-token failure path after
  extraction — not just the happy path.

  **`t()` typing constraint**: `t()` is a closed compile-time literal-key union over the VI
  dictionary — `LoginForm`/`ForgotPasswordForm` CANNOT compute a dynamic key like
  `` `${role}.login.title` `` and pass it to `t()`. Every copy string must be a plain string prop,
  pre-resolved by the calling page (e.g. `title={t('admin.login.title')}`), exactly like
  `ChangePasswordForm`'s existing `note?: string` prop. If a genuine need arises for a
  data-driven key, use the existing `tOrLiteral()` escape hatch, not a new mechanism.

- [ ] **Step 1**: read `ChangePasswordForm.tsx` in full as the reference pattern. Read all 4
  current Login pages and all 4 current ForgotPassword pages in full (re-verify the audit's
  finding that ALL 4 forgot-password pages now exist — Group 0 already added
  `forgotPasswordAgency.page.tsx`/`forgotPasswordTenant.page.tsx`, so this is 4×, not the
  original report's stale "2×" figure).

- [ ] **Step 2**: build `ForgotPasswordForm` first (the simpler, more uniform of the two) —
  extract the shared skeleton (icon header, `submitted` signal, ternary success/form branch,
  footer back-link) into the shared component per the prop shape above.

- [ ] **Step 3**: rewrite all 4 ForgotPassword pages as thin wrappers passing pre-resolved copy +
  their own `onSubmit`.

- [ ] **Step 4**: build `LoginForm`, carefully handling both landmines above. Start with
  Admin (simplest — no org code, no auto-login, no extra footer) to validate the base shape
  works, then Merchant (add `headerIcon`, `extraFooterContent`), then Agency and Tenant (add
  `hasOrgCode`, `autoLoginFromUrlToken`, and Tenant's own `extraFooterContent`).

- [ ] **Step 5**: rewrite all 4 Login pages as thin wrappers. Confirm each page's own
  `onSubmit` correctly calls ITS OWN service + auth-commit method — do not let this collapse
  into a shared implementation.

- [ ] **Step 6**: explicitly confirm `src/modules/customer/LoginForm.tsx` and its
  `ForgotPasswordForm.tsx` are LEFT UNTOUCHED — these are a deliberately different architecture
  (standalone public Astro islands, not part of the admin SPA) and out of scope for this task.

- [ ] **Step 7: Run tests + typecheck**

  Run: `npx astro check` (0 errors) then the full suite `npm test` (baseline 108/108 suites,
  1122/1122 tests). Manually re-verify (via test, not just reading code) that Merchant's
  `setMerchantAuthData` path and Admin/Agency/Tenant's `setAuthData` path both still fire
  correctly through the new `LoginForm`.

- [ ] **Step 8: Commit**

  ```bash
  git add -A
  git commit -m "refactor(fe): extract shared LoginForm/ForgotPasswordForm components (4 login pages, 4 forgot-password pages)"
  ```

---

## Task 8 (FE): One `RoleLayout` component — highest blast radius in this plan, do last, carefully

**Files:**
- Create: `src/layouts/RoleLayout.tsx`
- Modify: `src/layouts/admin/AdminLayout.tsx`, `src/layouts/agency/AgencyLayout.tsx`,
  `src/layouts/merchant/merchantLayout.tsx`, `src/layouts/tenant/TenantLayout.tsx`
- Test: extend/add coverage under `test/layouts/` if any exists, or create it — this is the
  highest-blast-radius task in the whole Group 2 plan (every authenticated page in every portal
  renders through one of these 4 files), test coverage matters more here than anywhere else in
  this plan

**Interfaces:**
- Produces (the master report's proposed `{accountType, sidebarMenus, typeName, bgColor,
  extraProviders?}` shape is confirmed directionally right but under-specified by 3 real props —
  use this expanded shape, not the report's original):
  ```ts
  interface RoleLayoutProps extends BaseProps {
      accountType: EAccountType;
      sidebarMenus: SidebarMenu<RoutePathsOf<typeof APP_ROUTES>>[];
      typeName: string;              // pre-resolved, e.g. t('layout.typeName.admin')
      displayNameFallback: string;   // e.g. 'Admin' — was hardcoded inline per-file, now explicit
      bgColor: string;
      loginRoute: DotNotationKeys<typeof APP_ROUTES>;  // e.g. 'adminAuth.login'
      extraProviders?: (props: { children: JSX.Element }) => JSX.Element;
      onAuthReady?: () => void;
      extraContent?: () => JSX.Element;
  }
  ```

  **Confirmed real per-role differences that must each map to one of the props above — do not
  silently drop any of these:**
  1. Provider stack: Merchant wraps ZERO providers (confirmed deliberate —
     `usePermission()` has a safe `FALLBACK_FULL_ACCESS` for out-of-tree calls, this is not a
     bug). Admin/Agency wrap 1 (`PermissionProvider`, never fetched). Tenant wraps 3, NESTED
     (`PermissionProvider` > `FeatureProvider` > `TenantRolesProvider`), all fetched together in
     one `createEffect`. → `extraProviders`.
  2. Agency renders `<AgencyActingTenantBar/>` directly inside `<main>`, before
     `{props.children}` — a real UI element (org-picker bar), not a provider. → `extraContent`.
  3. Only `AdminLayout` calls `switchMode(EAccountType.ADMIN, {accountId})`. Traced: nothing
     currently reads `useApp().appMode/tenantId/tenantCode` anywhere in the codebase, so this is
     inert today — but do NOT silently drop it as "clearly dead code"; carry it forward
     explicitly via `onAuthReady` so a future consumer isn't broken by this refactor. Tenant's
     `onAuthReady` fires its 3 fetch calls (`fetchPermissions`/`fetchFeatures`/
     `fetchTenantRoles`); Agency/Merchant omit `onAuthReady` entirely.

  **Two discrepancies found that need an explicit decision BEFORE parametrizing — do not
  silently normalize either one:**
  - Content wrapper class: `AdminLayout` uses `class="mx-auto"`; Agency/Merchant/Tenant all use
    `class="max-w-full mx-auto"`. 3-of-4 agreement suggests Admin is the accidental outlier, not
    an intentional variant — but this is a visual/product call, not a mechanical one. Pick
    `max-w-full mx-auto` as the `RoleLayout`'s single hardcoded value (matching the majority) and
    flag this specific decision explicitly in your task report/commit message as a disclosed,
    deliberate behavior change for Admin specifically (not a silent side effect) — if you're not
    confident this is right, report DONE_WITH_CONCERNS on this one point rather than guess
    silently.
  - `displayName` fallback strings (`'Admin'`, `'Agency'`, `'Merchant'`, `'Tenant'`) are
    hardcoded literals today, not run through `t()` (unlike `typeName`, which does use `t()`).
    Keep them as explicit literal props (`displayNameFallback`) rather than silently promoting
    them to i18n keys — that's a separate, larger decision (would need new dictionary entries)
    out of scope for this task.

- [ ] **Step 1**: read all 4 current layout files in FULL, plus
  `src/layouts/dashboard/DashboardContext.tsx` and the 5 shared dashboard shell components
  (`DashboardHeader`, `DashboardAccount`, `DashboardBreadcrumbs`, `DashboardRootSidebar`,
  `DashboardMainSidebar`) to confirm they're genuinely role-agnostic already (read via
  `useDashboard()`) and need NO changes — re-verify this rather than assuming.

- [ ] **Step 2**: read `src/shared/contexts/app/AppContext.tsx`/`AppProvider.tsx` to
  independently re-confirm `switchMode`'s current zero-consumer status before deciding how
  `onAuthReady` should carry it forward (a single boolean confirmation is enough — don't spend
  excessive time here, just don't skip the check).

- [ ] **Step 3**: build `RoleLayout.tsx` — the `Show(!isLoading() && account())` gate → 
  `DashboardContext.Provider` → the flex shell (`DashboardRootSidebar`/`DashboardMainSidebar`/
  `DashboardHeader`/`<main>`) → `extraContent?.()` then `{props.children}` inside `<main>`,
  wrapped by whatever `extraProviders` the caller supplies (or none, for Merchant).

- [ ] **Step 4**: rewrite `AdminLayout.tsx` as a thin `RoleLayout` wrapper — supply
  `extraProviders` (Permission only), `onAuthReady` (the `switchMode` call, carried forward
  explicitly).

- [ ] **Step 5**: rewrite `AgencyLayout.tsx` — supply `extraProviders` (Permission only),
  `extraContent` (`<AgencyActingTenantBar/>`), no `onAuthReady`.

- [ ] **Step 6**: rewrite `merchantLayout.tsx` — omit `extraProviders`/`onAuthReady`/
  `extraContent` entirely (all optional, all correctly absent for Merchant).

- [ ] **Step 7**: rewrite `TenantLayout.tsx` — supply the nested 3-provider `extraProviders`,
  `onAuthReady` (the 3 fetch calls together).

- [ ] **Step 8: Run tests + typecheck**

  Run: `npx astro check` (0 errors) then the full suite `npm test` (baseline 108/108 suites,
  1122/1122 tests). Given the blast radius, if this repo has any way to smoke-test real page
  renders (existing tests under `test/layouts/` or component tests that mount a layout), run
  those specifically and confirm each of the 4 role variants renders its correct provider stack
  and extra content — a copy/paste mistake here (e.g. accidentally giving Merchant a
  `PermissionProvider` it never had, or running Tenant's 3 fetches for Agency) is exactly the
  class of bug this task's own props exist to prevent, and it would be easy to introduce
  precisely because the 4 files look so similar.

- [ ] **Step 9: Commit**

  ```bash
  git add -A
  git commit -m "refactor(fe): extract shared RoleLayout component (Admin/Agency/Merchant/Tenant), preserve all 4 real per-role differences explicitly"
  ```

---

## Execution order

BE tasks (1-6) and FE tasks (7-8) touch disjoint repos — safe to run in parallel worktrees, one
`subagent-driven-development` pass per repo. Within BE: Tasks 1-2 are lowest risk, do first, any
order between them. Task 3 (DTO dedup) is next-lowest risk but touches the most files — do
before Tasks 4-6 so its 2 "split out the real bug" sub-commits (Tenant, Media) get resolved
early, not tangled with later riskier work. Task 4 (partial unique index) should follow Task 3,
since it's isolated and low-risk with one genuinely urgent fix (Page.path). Task 5 (resolver
helpers) and Task 6 (AccountCredentialService) are the two riskiest BE tasks — do them last, in
either order, each getting its own careful review given the audit's own risk flags (Task 5:
schema-registration-collision risk if the decorator-inheritance constraint is violated; Task 6:
auth-critical, must preserve the Group-0.2 security fix exactly).

Within FE: Task 7 (LoginForm/ForgotPasswordForm) before Task 8 (RoleLayout) — Task 8 is
explicitly the highest-blast-radius task in the entire Group 2 plan (every authenticated page,
not just 8 auth-adjacent pages) and should benefit from whatever lessons Task 7's review
surfaces about this repo's current component-extraction risk patterns.

Each task gets its own implementer → task-reviewer cycle, calibrated to its own risk level (Tasks
1-2, 7 can use lighter review; Tasks 3-4's "split the real bug into its own commit" sub-steps and
Tasks 5-6, 8 warrant the same rigor as Group 1's higher-risk tasks — verify every claim
empirically, not just by reading). After all tasks in a repo are done, run that repo's full test
suite + typecheck one final time, then a whole-branch review (most capable model available)
before merging to master, per the established pattern from every prior initiative in this
project.
