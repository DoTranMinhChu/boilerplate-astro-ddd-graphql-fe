# Group 4 (cross-repo contract hygiene) + Group 5 (dead-code sweep, BE remainder) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining 2 groups of the master BE+FE reuse/scalability audit
(`docs/superpowers/specs/2026-09-02-be-fe-reuse-audit-report.md`). Group 5's FE portion (7 dead
files) and BE portion of 4.1 (password-length constant) are ALREADY DONE as side effects of
Group 1 and Group 2 respectively — confirmed by re-reading the audit report and grepping current
source before writing this plan. What remains: 4 FE tasks (Group 4 items 4.2-4.5) and 4 BE tasks
(Group 5's BE remainder: 3 batched trivial deletions + 1 security-hardening research+wire task
for `sameTenant.guard.ts`).

**Architecture:** Two independent git worktrees, one per repo (`group4-contract-hygiene` in
`ddd-graphql-fe`, `group5-dead-code-sweep` in `ddd-graphql-be`), each processed as its own
sequential task chain (implementer → task review → next task), the two chains running
independently of each other. All 8 tasks are structurally independent of one another — no task
in this plan depends on another task's output.

**Tech Stack:** BE: TypeORM/Postgres, Express, code-first GraphQL (existing conventions only, no
new libraries). FE: Astro/SolidJS, existing `gengraph` codegen pipeline, GitHub Actions.

## Global Constraints

- Every deletion in this plan was independently re-verified (grep, full-file read) to have ZERO
  real external callers before this plan was written — see each task's "Confirmed dead" note.
  If an implementer's own verification disagrees (finds a real caller this plan missed), STOP
  and escalate rather than deleting — do not trust this plan's claim over what you find in the
  real source.
- Neither repo has ever been pushed to its real `origin` remote during this entire audit
  engagement (verified: both local `master` branches are many commits ahead of `origin/master`).
  Nothing in this plan pushes to `origin` either — the CI workflow file (Task FE-3) is written
  and committed locally like any other file, never triggered via an actual GitHub Actions run.
  Disclose this as a known verification limitation in that task's report, do not attempt to push.
- BE error code source of truth: `src/core/shared/enums/errorCode.enum.ts`. FE mirror:
  `src/shared/errors/errorCode.enum.ts` (hand-maintained by design, per its own header comment —
  no shared package between repos).
- Follow each repo's existing test/typecheck commands (BE: `npm test` = jest,
  `npx tsc --noEmit -p tsconfig.json` for typecheck, no whole-project typecheck npm script exists
  today; FE: `npm test` = vitest, `npx astro check`).

---

## Task BE-1: Delete 3 confirmed-dead artifacts + 1 trap method

**Repo/worktree:** `ddd-graphql-be`, `.worktrees/group5-dead-code-sweep`

**Files:**
- Delete: `src/core/infrastructure/cron/job.registry.ts`
- Delete: `src/core/infrastructure/database/graphQLLoader.ts`
- Modify: `src/core/shared/types/common.types.ts` (remove `DEFAULT_PAGINATION` export)
- Modify: `src/core/shared/types/global.d.ts` (remove the `Partial<T>` redeclaration only)
- Modify: `src/modules/globalSequence/domain/repositories/globalSequence.repository.ts` (remove
  `cleanupOldRows` method only)

**Confirmed dead (re-verify yourself before deleting, but this is what a repo-wide grep found
when this plan was written):**

1. **`job.registry.ts`** — a completely empty `JobRegistry: Record<string, JobHandler> = {}`
   object, zero entries, zero importers anywhere in `src/`. Superseded by `cron.loader.ts`'s glob
   auto-discovery of `src/**/*.job.ts` files (the real, actually-used mechanism).

2. **`graphQLLoader.ts`** (`export class GraphQLLoader`) — a Redis-backed generic
   `loadOne`/`loadOneByCondition` entity loader, zero importers anywhere in `src/`. Superseded by
   the real, actually-used `DataLoaderManager`.

3. **`DEFAULT_PAGINATION`** (in `common.types.ts`) — an exported const, zero importers anywhere
   in `src/` outside its own declaration.

4. **`global.d.ts`'s `Partial<T>` redeclaration** — lines look like:
   ```ts
   type Partial<T> = {
       [P in keyof T]?: T[P];
   };
   ```
   inside the same `declare global { ... }` block as two OTHER declarations
   (`__GRAPHQL_RESOLVERS__`, `__GQL_ENUMS__`) that ARE genuinely used elsewhere — remove ONLY the
   `Partial<T>` block, keep the `var` declarations. This redeclares TypeScript's own built-in
   `Partial<T>` utility type with an identical definition — a no-op that adds confusion with zero
   behavioral effect either way (proves it's genuinely inert, not merely "unused").

5. **`globalSequence.repository.ts`'s `cleanupOldRows()`** — NOT a simple "unused method", a
   **live data-corruption trap** if anyone ever wires it in following its own doc comment. Read
   `nextval()` right above it first: this table has exactly ONE row per `entityType` (the
   `ON CONFLICT ("entityType") DO UPDATE` upsert), and that row's `lastValue` counter increments
   forever via that same upsert — `createdAt` is set once, at first use, and never changes again.
   `cleanupOldRows` deletes rows by `createdAt < cutoff`, which for any long-lived `entityType`
   will ALWAYS be true eventually — deleting the row does not "free up old history", it destroys
   the entityType's running counter. The next `nextval()` call re-inserts a fresh row starting
   at `lastValue = 1`, silently reissuing sequence numbers that were already issued before the
   cleanup — a correctness-breaking bug, not a performance one. There is no "retention days" value
   that makes this safe; every row must persist for its entityType to keep counting correctly.
   **Do not attempt to "fix" this into a safe retention policy — delete it outright.** If a
   caller ever legitimately needs to reclaim space, the right primitive is archiving is a
   materially different design (e.g. moving to done in a completely different way, e.g. per-row
   consumption logging is a different table/data model), out of scope here.

**Interfaces:** None — nothing forward-depends on these deletions; no other task in this plan
touches BE code.

- [ ] **Step 1:** Read all 5 target locations in full. Independently re-confirm zero external
  callers for each of the first 3 (grep the exact export/class/const name repo-wide, excluding
  its own declaration file) and confirm the `global.d.ts`/`globalSequence.repository.ts` context
  matches what's described above (line numbers may have drifted).

- [ ] **Step 2:** Delete `job.registry.ts` and `graphQLLoader.ts` entirely (confirm neither is
  referenced in any `import` statement anywhere in `src/` — including type-only imports — before
  deleting).

- [ ] **Step 3:** Remove `DEFAULT_PAGINATION` from `common.types.ts`.

- [ ] **Step 4:** Remove only the `Partial<T>` block from `global.d.ts`'s `declare global {}`,
  keeping `__GRAPHQL_RESOLVERS__`/`__GQL_ENUMS__` untouched.

- [ ] **Step 5:** Remove `cleanupOldRows` from `globalSequence.repository.ts`, keeping `nextval`
  and `getCurrent` untouched. If its own JSDoc comment block sits directly above the method with
  no other content, remove the comment too (don't leave a dangling doc comment describing a
  method that no longer exists).

- [ ] **Step 6: Run tests + typecheck**

  Run `npm test` and `npx tsc --noEmit -p tsconfig.json`. Both must stay exactly as clean as
  before this change (this is pure deletion of dead code — any new failure means something was
  NOT actually dead; stop and report if so, do not force a workaround).

- [ ] **Step 7: Commit**

  ```bash
  git add -A
  git commit -m "chore(be): remove 3 dead artifacts (job.registry, GraphQLLoader, DEFAULT_PAGINATION) + a corruption-trap sequence-cleanup method"
  ```

---

## Task BE-2: Delete RBAC.service.ts's dead parallel permission engine

**Repo/worktree:** `ddd-graphql-be`, `.worktrees/group5-dead-code-sweep` (same worktree as BE-1 —
dispatch this AFTER BE-1's review is clean and merged into the worktree's branch, never in
parallel with it in the same worktree)

**Files:**
- Modify: `src/core/application/auth/RBAC.service.ts`

**Context:** This class has TWO independent authorization mechanisms bolted together. Only ONE
is real — every external caller of this file (`graphQLSchema.loader.ts`, `auth.middleware.ts`,
`restRouter.loader.ts`, `restAPI.decorators.ts`'s doc comment) calls exactly one method:
`rbacService.authorizeRoles(...)`. This is the LIVE path (role/scope check for `@GQLAuthorized`).

The OTHER mechanism — a `resource:action` permission matrix (`IPermissionRule`,
`registerPermission`, `can`, `assertCan`, `initializeDefaultPermissions`, the `permissions` Map
field) — has ZERO external callers anywhere in the codebase. It exists, populates itself with a
hardcoded set of Admin/Agency/Tenant rules in the constructor, and is never consulted by any real
request. This is the "unused parallel permission engine" — the real authorization decision for
every one of those same resources is actually made elsewhere (BE `@GQLPermission`decorator +
`accountPermission.service.ts`'s `resolvePermission`, the DB-backed permission system used
throughout the rest of the codebase). Confirm this independently: `rbacService\.can\(`,
`assertCan`, `registerPermission` should have zero hits anywhere outside this one file.

**Interfaces:** `authorizeRoles(account, required)` is called externally and MUST be preserved
byte-for-byte (do not refactor its logic as part of this cleanup — it's live, security-critical,
and out of scope). `hasRole`/`hasAnyRole` are called INTERNALLY by the live `authorizeRoles` (at
minimum: SUPER_ADMIN bypass check via `hasRole`, the "does account have any required role" check
via `hasAnyRole`) — these two helpers MUST be kept. Every other instance helper
(`hasAllRoles`, `hasMinimumRole`, `hasScope`, `assertScope`, `isTenantInternal`,
`isAgencyAssigned`, `isSameTenant`, `isSameAgency`, `isOwner`) is reachable ONLY from the dead
`can`/`initializeDefaultPermissions` call graph as of when this plan was written — verify this
for each one specifically (grep the method name across the whole file: every call site should be
inside `can`/`initializeDefaultPermissions`'s own bodies, none from `authorizeRoles` or from
outside the class) before deleting it. If you find ANY of these has a real external caller, or is
called from within `authorizeRoles` itself, keep it — this plan's analysis may have drifted.

- [ ] **Step 1:** Read the whole file. Re-derive the "live vs. dead" call graph yourself: for
  every method, find every call site (inside this file AND repo-wide) and classify it as
  reachable-from-`authorizeRoles` (keep) or reachable-only-from-`can`/`registerPermission`/
  `initializeDefaultPermissions` (dead, delete) or has-zero-callers-at-all (dead, delete).

- [ ] **Step 2:** Delete the dead ~110 lines: `IPermissionRule` interface, the `permissions` Map
  field, `registerPermission`, `can`, `assertCan`, `initializeDefaultPermissions` (and its call in
  the constructor), plus whichever of the listed helper methods your Step 1 analysis confirms are
  reachable only from that dead code. Keep `authorizeRoles`, `hasRole`, `hasAnyRole`, the
  `ROLE_HIERARCHY`/`ROLE_SCOPE_MAP` consts (used by `authorizeRoles`/`hasMinimumRole` — re-check
  whether `ROLE_HIERARCHY` is ALSO used only by the now-dead `hasMinimumRole`; if so it becomes
  dead too and should go with it), and the class scaffolding (singleton `getInstance`/constructor/
  export).

- [ ] **Step 3:** Update or remove any now-stale doc comments referencing the deleted
  "FINE-GRAINED PERMISSION"/"DEFAULT PERMISSIONS" sections.

- [ ] **Step 4: Run tests + typecheck**

  Run `npm test` and `npx tsc --noEmit -p tsconfig.json`. Both must stay clean. Additionally: if
  any existing test exercises `RBACService`/`rbacService` directly (grep `RBAC.service` under
  `test/`), read it first — if it tests any of the methods you're deleting, that test itself is
  dead-code coverage and should be removed alongside; if it tests `authorizeRoles`/`hasRole`/
  `hasAnyRole`, it must keep passing unchanged.

- [ ] **Step 5: Commit**

  ```bash
  git add -A
  git commit -m "chore(be): remove RBAC.service.ts's dead parallel resource:action permission engine (~110 lines, zero callers — the real permission system is @GQLPermission/accountPermission.service.ts)"
  ```

---

## Task BE-3: Research — map tenant-scoped cross-entity FK write paths lacking `assertRefsSameTenant`

**Repo/worktree:** `ddd-graphql-be`, `.worktrees/group5-dead-code-sweep` (same worktree, after
BE-2). This is a READ-ONLY research task — produce a findings document, make no code changes.

**Context:** `src/core/shared/utils/sameTenant.guard.ts` exports a real, well-formed,
already-tested-shape guard:

```ts
export async function assertRefsSameTenant(
    tenantId: string | undefined | null,
    refs: TenantRef[],
): Promise<void>
```

It checks that every FK-referenced record (by table name + id) belongs to the same `tenantId` as
the record being written, throwing `BadRequestException` (`EErrorCode.TENANT_CROSS_REFERENCE_DENIED`
— already defined) otherwise. It has ZERO callers anywhere in the codebase today. This is a real
security gap: any entity that has BOTH a `tenantId` column AND a foreign-key column pointing at
ANOTHER tenant-scoped entity can currently be created/updated linking to a DIFFERENT tenant's
record, with nothing stopping it (e.g., if `Page.themeId` pointed at a `Theme` row, nothing today
stops Tenant A's Page from pointing at Tenant B's private Theme — this is a HYPOTHETICAL example
for illustration, not a claim about real columns; your job is to find the REAL instances).

**Your task:** produce a findings document (you have no Write tool if you're an Explore-type
agent — if so, report your complete findings in your final message as structured markdown; the
controller will save it) covering:

1. **Enumerate every entity that has a `tenantId` column** (grep `@Column` +`tenantId` across
   `src/modules/*/domain/entities/*.entity.ts`, or search for `tenantId` more broadly if entities
   don't literally use that exact decorator pattern — confirm the real pattern first).

2. **For each such entity, enumerate its OTHER foreign-key-shaped columns** (columns ending in
   `Id` that reference another entity's primary key, excluding `id` itself, `agencyId`,
   `tenantId`, `createdBy`/`updatedBy`/audit columns, and simple scalar/enum columns) — for each,
   determine: does the REFERENCED entity ALSO carry a `tenantId` column (i.e., is this an
   FK between two tenant-scoped entities)? If yes, this is a candidate gap.

3. **For each candidate gap, check the resolver/service create+update path for that entity**: is
   there ALREADY some other mechanism preventing cross-tenant linking on that specific field (a
   manual check, a query that scopes the lookup by tenantId before accepting the FK, a DB
   constraint)? Report exactly what you find — don't assume a gap exists just because
   `assertRefsSameTenant` isn't called; some fields may already be protected a different way.

4. **Rank the genuine, currently-unprotected gaps by real-world severity** (data sensitivity,
   how easy the FK id is for a caller to guess/enumerate/obtain from another tenant, whether the
   create/update mutation already validates the FK exists at all vs. blindly trusting a
   client-supplied id).

5. For the highest-severity 3-6 gaps (this guard should be wired in surgically, not
   mechanically sprayed across every FK in the system — favor the genuinely exploitable ones),
   report: the exact entity, its create/update resolver or service method (file:line), the FK
   column name, the referenced entity/table name, and what `TenantRef` array + call site would
   look like to close it (following the existing `assertRefsSameTenant(tenantId, refs)` shape —
   you do not need to write the actual code, just identify precisely where it goes and what the
   `refs` array should contain).

Report back with your complete findings as structured markdown in your final message (do not try
to write a file if you don't have Write access) — the controller will use this to write Task
BE-4's brief.

---

## Task BE-4: Wire in `assertRefsSameTenant` at the confirmed cross-tenant FK gaps

**Repo/worktree:** `ddd-graphql-be`, `.worktrees/group5-dead-code-sweep` (same worktree, after
BE-3's findings are available)

**Files:** determined by BE-3's findings — will be filled in by the controller once BE-3
completes, from its reported entity/resolver/service list. Likely 3-6 resolver/service files,
each getting one `await assertRefsSameTenant(tenantId, [...])` call inserted into its existing
create/update method, before the write.

**Interfaces:**
- Consumes: `assertRefsSameTenant(tenantId: string | undefined | null, refs: TenantRef[]): Promise<void>`
  from `src/core/shared/utils/sameTenant.guard.ts` (already exists, do not modify its signature).
- Consumes: BE-3's findings document for the exact call sites and `refs` shape.

- [ ] **Step 1:** Read BE-3's findings in full (the controller will hand you the specific file,
  or paste the findings directly into your dispatch).

- [ ] **Step 2:** For each confirmed gap, read the actual current create/update method in full,
  then add the `assertRefsSameTenant` call in the right place: after basic input validation,
  before the actual DB write, using the record's own `tenantId` (the one being assigned/already
  set on the entity being created/updated — NOT the caller's `account.tenantId` if those can
  differ for a legitimate cross-tenant-acting role; check `buildScope`-style patterns elsewhere
  in this codebase for how tenant scoping is normally resolved in each resolver, and match that
  existing convention rather than inventing a new one).

- [ ] **Step 3:** Write a test per gap closed: construct two tenants' worth of fixture data,
  attempt to create/update the entity with an FK pointing at the OTHER tenant's record, confirm
  it now throws `TENANT_CROSS_REFERENCE_DENIED`; also confirm the SAME-tenant case still succeeds
  (regression guard — this guard must not break legitimate same-tenant writes).

- [ ] **Step 4: Run tests + typecheck**

  Run `npm test` and `npx tsc --noEmit -p tsconfig.json`. Both must stay clean.

- [ ] **Step 5: Commit**

  ```bash
  git add -A
  git commit -m "fix(be): wire in assertRefsSameTenant at confirmed cross-tenant FK write gaps"
  ```

---

## Task FE-1: Sync 13 missing error codes into FE's mirror

**Repo/worktree:** `ddd-graphql-fe`, `.worktrees/group4-contract-hygiene`

**Files:**
- Modify: `src/shared/errors/errorCode.enum.ts`
- Check: `src/shared/errors/errorActions.ts` (or wherever `EErrorCode` values are consumed in a
  lookup table — per this file's own header comment, that's its purpose) for whether it needs
  entries for the newly-added codes too (a switch/map that doesn't have a default/fallback case
  could otherwise silently mishandle these codes at runtime even though they now typecheck)

**Interfaces:** none — pure enum value addition, no other task depends on this.

**Exact diff needed** (computed by direct comparison against BE's real
`src/core/shared/enums/errorCode.enum.ts` when this plan was written — re-verify the diff
yourself before applying, in case either enum has changed since): FE is currently missing these
13 values that exist on BE (add them with the same string value as the key, matching this file's
existing `KEY = 'KEY'` convention, grouped under the comment-header sections that already exist
where sensible, or a new section if none fits):

```
COMPONENT_CYCLE
COMPONENT_IN_USE
PERMISSION_ACTION_DENIED
PERMISSION_CONTEXT_MISMATCH
PERMISSION_GRANT_NOT_OWNED
PERMISSION_GRANT_SCOPE_EXCEEDED
PERMISSION_RECORD_ACCESS_DENIED
PERMISSION_REQUIRED_SPECIFIC
PERMISSION_SELECT_ORG_REQUIRED
PERMISSION_TOKEN_WRONG_CONTEXT
RESOURCE_NOT_FOUND_NAMED
RESOURCE_NOT_FOUND_WITH_ID
TENANT_CROSS_REFERENCE_DENIED
```

(Re-verify against the BE source directly at `D:\OTHER\node-source-base\ddd-graphql-be\src\core\shared\enums\errorCode.enum.ts`
— read the real file, don't just trust this list, in case it has drifted since this plan was
written. Confirm there are zero FE-only codes that don't exist on BE either — as of writing there
were none, i.e. no reverse drift to clean up.)

- [ ] **Step 1:** Read both enum files in full. Confirm the current diff matches (or note any
  drift from) the 13 values listed above.

- [ ] **Step 2:** Add the 13 missing values to the FE enum, in fitting section groups (e.g. the
  `PERMISSION_*` ones alongside the existing "Permission / RBAC" section, `COMPONENT_*` and
  `RESOURCE_NOT_FOUND_*` and `TENANT_CROSS_REFERENCE_DENIED` wherever best fits the existing
  section structure — add a new section header comment if none of the existing ones fit).

- [ ] **Step 3:** Check whether anything consuming `EErrorCode` (e.g. `errorActions.ts`) has an
  exhaustive switch that the TS compiler would now flag as needing new cases, vs. one with a
  `default`/fallback that handles unknown codes gracefully already. If exhaustive-switch style,
  add appropriate handling for the new codes (reasonable default/generic message is fine — this
  isn't about writing bespoke UX copy for each, just not leaving a compiler error or a silent
  gap). If already has a graceful fallback, no change needed there — just confirm and note it in
  your report.

- [ ] **Step 4: Run tests + typecheck**

  Run `npx astro check` and `npm test`. Both must stay clean.

- [ ] **Step 5: Commit**

  ```bash
  git add -A
  git commit -m "chore(fe): sync 13 missing BE error codes into EErrorCode mirror"
  ```

---

## Task FE-2: Remove the dead `codegen` script

**Repo/worktree:** `ddd-graphql-fe`, `.worktrees/group4-contract-hygiene` (same worktree as FE-1
— dispatch after FE-1's review is clean)

**Files:**
- Modify: `package.json` (remove the `"codegen": "graphql-codegen"` script entry)
- Check: whether a `graphql-codegen`-config file (e.g. `codegen.yml`/`codegen.ts`) exists anywhere
  in the repo — if `npm run codegen` has never had a config file to work from (per the audit's
  own finding), there is nothing else to remove; if you DO find a config file, read it and report
  what you find before deciding whether it's also dead (do not delete a config file this plan
  didn't anticipate without understanding what it's for first)
- Check: whether the `@graphql-codegen/*` packages in `package.json` dependencies are used by
  ANYTHING else (the real pipeline is `npm run gengraph` → `scripts/generate-graph.mjs`, which
  uses the plain `graphql` package's `buildClientSchema`/`printSchema`/`getIntrospectionQuery` —
  NOT `@graphql-codegen/*`). If confirmed unused elsewhere, remove those dependencies too as part
  of this same cleanup (same root cause: a dead pipeline nobody removed alongside its unused
  deps); if anything else does import from `@graphql-codegen/*`, leave the dependency in place
  and just remove the misleading script entry.

**Interfaces:** none.

- [ ] **Step 1:** Confirm `npm run codegen` (`graphql-codegen`) has no config file anywhere in
  the repo root (check for `codegen.yml`, `codegen.ts`, `codegen.json`, or a `codegen` key inside
  `package.json` itself) — the audit's finding was that this script is installed but has never
  had anything to actually run against, making it silently no-op or error if ever invoked.

- [ ] **Step 2:** Remove the `"codegen"` script entry from `package.json`. If Step 1's dependency
  check confirms `@graphql-codegen/*` packages are unused elsewhere, remove them from
  `package.json` too and run the package manager's install/lock update.

- [ ] **Step 3: Run tests + typecheck**

  Run `npx astro check` and `npm test`. Both must stay clean (removing a script/unused dependency
  should have zero effect on either).

- [ ] **Step 4: Commit**

  ```bash
  git add -A
  git commit -m "chore(fe): remove dead graphql-codegen script (no config ever existed; real pipeline is gengraph)"
  ```

---

## Task FE-3: CI job — regenerate FE's GraphQL codegen against a live BE, fail on diff

**Repo/worktree:** `ddd-graphql-fe`, `.worktrees/group4-contract-hygiene` (same worktree, after
FE-2)

**Files:**
- Modify: `.github/workflows/ci.yml`

**Context:** `npm run gengraph` (`scripts/generate-graph.mjs`) fetches a LIVE GraphQL schema via
introspection from `process.env.BACKEND_URL/graphql` and regenerates
`src/shared/generated/{schema.graphql,typed-graphql.ts}` from it. Today this only ever runs
manually, by hand, against whichever BE a developer happens to have running locally — there is
no automated check that the checked-in generated files still match the real BE schema. Neither
this repo's nor the BE repo's existing CI workflow spins up a live Postgres/BE server today (both
are pure lint/build/test-only, no service containers) — this task introduces that pattern fresh,
so budget real effort for getting the sequencing right (Postgres ready → BE migrations run → BE
server actually accepting connections → THEN run gengraph → THEN diff).

Both repos share the same GitHub account/org today (`origin` remotes:
`https://github.com/DoTranMinhChu/boilerplate-express-ddd-graphql-be.git` and
`.../boilerplate-astro-ddd-graphql-fe.git`) — a second `actions/checkout` step can check out the
BE repo into a sibling directory using `repository: DoTranMinhChu/boilerplate-express-ddd-graphql-be`.

**Known, unavoidable verification limitation — disclose this explicitly in your report, do not
try to work around it:** this repo has never been pushed to its real `origin` remote during this
whole engagement (local `master` is many commits ahead of `origin/master`), and this task must
NOT push to `origin` either. This means the actual GitHub Actions YAML pipeline you write CANNOT
be triggered and observed running for real in this session. Compensate by validating every
individual SHELL COMMAND the workflow will run — the Postgres startup, BE migration command, BE
server startup + health-check wait, `npm run gengraph` invocation, and the final `git diff
--exit-code` check — by actually running that command sequence locally by hand against a real
locally-running BE dev server (following this project's known worktree-dev-server pattern:
override `PORT`/`DB_*` env vars, read the actual bound port from the log rather than assuming a
default). Report exactly what you ran locally and what it proved, then translate the
proven-correct command sequence into the workflow YAML as faithfully as possible. This is the
same kind of "prove the logic locally since the full pipeline can't be triggered" approach used
earlier in this project's audit for migration verification.

**Interfaces:** none.

- [ ] **Step 1:** Read the current `.github/workflows/ci.yml` in full (already shown above in
  this plan for reference, but re-read the real file — it may have changed). Read
  `scripts/generate-graph.mjs` in full to confirm exactly what env vars/inputs it needs
  (`BACKEND_URL` at minimum, confirm via the `.env`-reading logic at the top of that script) and
  what it writes (`src/shared/generated/schema.graphql`, and whatever else the rest of that
  script does after the introspection fetch — read past what's shown above, the whole file).

- [ ] **Step 2:** Read the BE repo's `package.json` and its DB migration command (check its
  `npm run` scripts for whatever runs TypeORM migrations — likely something like
  `typeorm migration:run` or a wrapped script) and its server-start command, to know exactly what
  the new CI job needs to invoke. Also check the BE repo's `.env.example` (or equivalent) for the
  minimal env vars a fresh CI Postgres + BE server needs (DB host/port/user/password/database
  name, JWT/encryption secrets — BE's OWN `ci.yml` already shows a working minimal env-var set for
  its jest tests; that's a proven-safe starting point for what a fresh BE instance needs to boot).

- [ ] **Step 3:** Prove the full command sequence locally by hand first (per the "known
  verification limitation" section above) against this project's actual local dev BE — do not
  skip this, it's the only real verification available. Report the exact commands run and their
  output.

- [ ] **Step 4:** Add a new job (or a new step within the existing job — your call, based on
  whether it's cleaner to run in parallel with or after the existing lint/build/test job; a
  separate job that only needs `src/shared/generated/**` and doesn't need the full lint/build/test
  pass first is probably cleaner and won't block fast feedback on unrelated PRs) to
  `.github/workflows/ci.yml`:
  1. A `postgres` service container (matching whatever version the BE project targets — check its
     `docker-compose.yml`/CI/`package.json` engines if any hint exists, else a reasonable current
     LTS Postgres version).
  2. Checkout THIS repo (already happens) + checkout the BE repo into a sibling directory (new
     `actions/checkout` step with `repository:` and a distinct `path:`).
  3. Install BE deps, run BE migrations against the service Postgres, start the BE server in the
     background, wait for it to actually accept connections (a simple retry-loop `curl` against
     its health/GraphQL endpoint — do not use a fixed `sleep` guess).
  4. Run `npm run gengraph` in THIS repo pointed at the now-running BE (`BACKEND_URL` env var).
  5. `git diff --exit-code -- src/shared/generated/` — fail the job if regenerating produced any
     difference from what's checked in (this is the actual point of the task: catch schema drift
     between the two repos before it reaches production).

- [ ] **Step 5:** Add a short comment block at the top of the new job explaining what it does and
  the verification limitation from the Context section above (so a future engineer who sees this
  job fail — or never run — for the first time understands it was never actually GitHub-run
  during authoring).

- [ ] **Step 6: Commit**

  ```bash
  git add -A
  git commit -m "ci(fe): add codegen-drift job (spins up a live BE + Postgres, regenerates schema, fails on diff)"
  ```

---

## Task FE-4: Update FE README's stale codegen section

**Repo/worktree:** `ddd-graphql-fe`, `.worktrees/group4-contract-hygiene` (same worktree, after
FE-3 — this task documents the state FE-2/FE-3 leave things in, so do it last)

**Files:**
- Modify: `README.md` (the "Codegen pipeline" section, currently starting around line 59)

**Context:** The audit found this section still describes a "minimal seed" schema — stale; the
real schema already covers the full CMS surface (confirmed: `schema.graphql` is large, covering
the entire CMS/permission/pagination surface built out across Groups 0-3 of this same audit).
This task is pure documentation — read the real current pipeline and describe it accurately,
including this plan's own changes (no more dead `codegen` script per FE-2; a new CI drift-check
per FE-3).

- [ ] **Step 1:** Read the current README's full "Codegen pipeline" section plus enough
  surrounding context to know what else references it (the "Kept: `src/core`" line spotted
  elsewhere in this file, for instance, mentions "codegen scripts" too — check if that needs a
  touch-up as well, but stay narrowly focused on factual accuracy, not a rewrite).

- [ ] **Step 2:** Rewrite the section to describe the REAL current pipeline accurately: `npm run
  gengraph` fetches a live schema via introspection from a running BE (`BACKEND_URL` from
  `.env`), writes `src/shared/generated/{schema.graphql,typed-graphql.ts}`, covering the full CMS
  schema surface (not a "minimal seed" — describe what's actually there at a high level: content
  entries/types, pages/nodes, forms, permissions, pagination, etc. — whatever top-level domains
  the real `schema.graphql` shows, don't invent specifics you haven't confirmed by reading the
  actual file). Mention that `npm run codegen`/`graphql-codegen` no longer exists (removed in
  FE-2, was dead) and that CI now has an automated drift check (added in FE-3) rather than only a
  manual step.

- [ ] **Step 3: Run tests + typecheck**

  Run `npx astro check` and `npm test` (docs-only change, should be a no-op, but confirm nothing
  else was accidentally touched).

- [ ] **Step 4: Commit**

  ```bash
  git add -A
  git commit -m "docs(fe): update stale Codegen pipeline README section (full schema, not a minimal seed; reflects FE-2/FE-3 changes)"
  ```
