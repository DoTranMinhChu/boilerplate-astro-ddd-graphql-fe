# Enum/Type-Safety Sweep (H2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to
> implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert repeated string-literal discriminants into shared enums / `as const` unions
across both repos, closing real bug-risk gaps (enum exists but bypassed, same concept spelled
two ways, byte-identical types hand-copied into 2-4 files) surfaced by a full read-only inventory
of both codebases.

**Architecture:** No new infra — extend each repo's own existing convention.
- **BE** (`ddd-graphql-be`): real TS `enum` under `src/**/enums/*.enum.ts`, `RegisterEnum()`'d
  into the GraphQL schema where the field is exposed over GraphQL.
- **FE** (`ddd-graphql-fe`): `as const` object + derived union + `isX()` type guard, matching
  `ENodeType`/`SECTION_CATEGORIES` — **not** real TS `enum` — for any value that is FE-local or
  serializes into a jsonb column. Where a real generated TS `enum` already exists in
  `src/shared/generated/typed-graphql.ts` (BE-GraphQL-enum-backed), the fix is "use the enum
  that already exists," not inventing a parallel type.

**Tech Stack:** TypeScript (both repos), Jest (BE), Vitest (FE). No new dependencies.

## Global Constraints

- Every task must leave the full test suite green: BE `npm test` (baseline: 67/67 suites,
  582/582 tests), FE `npm test` (baseline: 107/107 suites, 1109/1109 tests — 2 known
  pre-existing post-teardown "Uncaught Exception" errors from `iconify-icon`/gsap timers are
  NOT a regression signal, already present before this plan; only a suite/test COUNT regression
  or a genuine assertion failure counts as broken).
- BE also gets `npx tsc --noEmit` clean; FE also gets `npx astro check` clean (0 errors — the
  handful of pre-existing `ts(6133)` unused-var warnings are not regressions to fix here).
- Never change a field's wire value (enum member's underlying `string` value) — only the TS-side
  representation. A GraphQL-exposed BE enum's member values must byte-match the existing DB/wire
  strings exactly (e.g. `EResolvedScopeType.ALLOW = 'ALLOW'`, not a renamed value).
- Where a finding says "enum/union already exists, just import and use it" — do NOT create a
  second type. Where a finding says "declared 2-3 times independently" — pick the existing
  canonical/most-imported declaration as the keeper, delete the others, redirect their imports.
- Do not touch: one-off strings, i18n/UI copy, GraphQL field names, file paths, anything in
  `test/` (both repos already centralized their tests there — see the H1 initiative in
  `docs/superpowers/specs/2026-09-02-be-fe-reuse-audit-report.md`).
- Every new `as const`/enum gets a real name (not `Foo2` or `FooNew`) and, where it replaces a
  duplicated local type, is exported from ONE canonical file that every consumer imports from.
- Source citations below (file:line) come from a full read-only codebase inventory completed
  2026-09-03; re-verify each one against the current file before editing — line numbers drift.

---

## Task 1 (BE): Core infra — dedupe/apply existing enums

**Files:**
- Modify: `src/modules/permission/types/scope.types.ts` (add `EResolvedScopeType`, retype
  `IResolvedScope.type`)
- Modify: `src/modules/accountPermission/application/services/accountPermission.service.ts`,
  `src/modules/accountPermission/application/services/grantableResource.service.ts`,
  `src/core/infrastructure/http/graphQLPermission.handler.ts` (consume the new enum)
- Modify: `src/core/infrastructure/database/base.abstract.repository.ts`,
  `src/modules/contentEntry/infrastructure/persistence/contentEntry.repository.ts`,
  `src/modules/contentEntry/application/services/contentEntryUsage.service.ts`,
  `src/modules/contentEntry/application/services/contentEntry.service.ts`,
  `src/modules/contentEntry/infrastructure/http/graphql/contentEntry.resolver.ts` (replace local
  `'ASC' | 'DESC'` unions with the existing `ESort` enum, narrowed)
  - `src/core/shared/types/common.types.ts:31` already has `EFilterOperator.EQUALS = '$eq'`
- Modify: `src/modules/contentEntry/infrastructure/http/graphql/contentEntry.resolver.ts` (2
  sites), `src/modules/contentEntry/application/services/contentEntryUsage.service.ts` (1 site)
  — replace hardcoded `'$eq'` fallback with `EFilterOperator.EQUALS`
- Modify: `src/server.ts`, `src/config/database.config.ts`,
  `src/core/infrastructure/cron/cron.loader.ts` — replace raw `process.env.NODE_ENV === '...'`
  comparisons with `envConfig.isDev`/`envConfig.isProd` (already exported from
  `src/config/env.config.ts`)
- Modify: `src/core/application/services/importJobQueue.service.ts` — promote
  `ImportJobStatus` from a bare `type` to a real registered enum
  `EImportJobStatus { PENDING='pending', PROCESSING='processing', DONE='done', FAILED='failed' }`
- Modify: `src/core/infrastructure/http/controllers/importJob.controller.ts` (consumes the enum)
- Test: extend the existing test files covering each touched service (see Step-by-step)

**Interfaces:**
- Produces: `EResolvedScopeType` (`ALLOW`, `DENY`, `FILTER`) exported from `scope.types.ts`,
  alongside the existing `EScopeRuleType`.
- Produces: `EImportJobStatus` exported from `importJobQueue.service.ts` (or a co-located
  `enums/importJob.enum.ts` if that matches this module's existing file layout — check first).
- Consumes: existing `ESort` (`src/core/shared/types/common.types.ts:6-13`), existing
  `EFilterOperator` (`src/core/shared/types/common.types.ts`), existing `envConfig.isDev/isProd`
  (`src/config/env.config.ts:59-60`).

- [ ] **Step 1: `EResolvedScopeType`**

  In `src/modules/permission/types/scope.types.ts`, next to the existing `EScopeRuleType`
  declaration, add:
  ```ts
  export enum EResolvedScopeType {
      ALLOW = 'ALLOW',
      DENY = 'DENY',
      FILTER = 'FILTER',
  }
  ```
  Retype `IResolvedScope`'s discriminant (currently `{ type: 'ALLOW' } | { type: 'DENY' } | { type: 'FILTER', where, rule }`
  around line 214-218) to use `EResolvedScopeType.ALLOW` / `.DENY` / `.FILTER` as the literal
  values instead of bare string literals — the discriminated union shape itself (which fields
  each branch carries) does not change, only the literal type of `type`. Update every
  `_resolve()` branch that returns one of these (search the file for `type: 'ALLOW'`,
  `type: 'DENY'`, `type: 'FILTER'` — every construction site, not just declarations) to use the
  enum member.

- [ ] **Step 2: Consume `EResolvedScopeType` at every call site**

  In `accountPermission.service.ts`, `grantableResource.service.ts`, and
  `graphQLPermission.handler.ts`, find every `.type === 'ALLOW'` / `'DENY'` / `'FILTER'`
  comparison (the inventory found these at `accountPermission.service.ts:108,115,207`,
  `grantableResource.service.ts:58,68,101`, `graphQLPermission.handler.ts:73,81,109,152` —
  re-verify current line numbers, this file may have moved since) and replace the string literal
  with `EResolvedScopeType.ALLOW` etc. Import the enum in each file.

- [ ] **Step 3: Run BE tests covering permission resolution**

  Run: `npm test -- test/modules/permission test/modules/accountPermission test/core/infrastructure/http/graphQLPermission.handler.test.ts`
  Expected: all pass, unchanged count (this is a pure type-level change — enum member values
  equal the original string literals byte-for-byte, so runtime behavior is identical).

- [ ] **Step 4: Commit**

  ```bash
  git add -A
  git commit -m "refactor(be): add EResolvedScopeType, replace scope-resolution string literals"
  ```

- [ ] **Step 5: `ESort` consolidation**

  `ESort` already exists at `src/core/shared/types/common.types.ts:6-13`
  (`ASC|ASC_NULLS_FIRST|ASC_NULLS_LAST|DESC|DESC_NULLS_FIRST|DESC_NULLS_LAST`). In
  `base.abstract.repository.ts` (lines ~387,440,695,705,1042 per the inventory — re-verify),
  replace every local `'ASC' | 'DESC'` type annotation with `ESort.ASC | ESort.DESC` narrowed,
  e.g. change:
  ```ts
  sortDirection?: 'ASC' | 'DESC'
  ```
  to:
  ```ts
  sortDirection?: ESort.ASC | ESort.DESC
  ```
  and fix the redundant `Record<string, ESort | 'ASC' | 'DESC'>` at line ~1042 to just
  `Record<string, ESort>`. Do the same in `contentEntry.repository.ts:184`,
  `contentEntryUsage.service.ts:128`, `contentEntry.service.ts:321`,
  `contentEntry.resolver.ts:61`. Every caller that currently passes the literal string `'ASC'`
  or `'DESC'` keeps working unchanged (enum member value equals the string).

- [ ] **Step 6: `$eq` → `EFilterOperator.EQUALS`**

  In `contentEntry.resolver.ts` (2 sites) and `contentEntryUsage.service.ts` (1 site), replace
  the hardcoded `'$eq'` fallback/default with `EFilterOperator.EQUALS`. Import
  `EFilterOperator` from `src/core/shared/types/common.types.ts` if not already imported in that
  file.

- [ ] **Step 7: `NODE_ENV` → `envConfig.isDev`/`isProd`**

  In `src/server.ts:46`, `src/config/database.config.ts:74,86`,
  `src/core/infrastructure/cron/cron.loader.ts:11`, replace
  `process.env.NODE_ENV === 'development'` with `envConfig.isDev` and
  `process.env.NODE_ENV === 'production'` with `envConfig.isProd` (import `envConfig` from
  `src/config/env.config.ts` in each file if not already present). Re-read each site first —
  make sure the boolean polarity matches (don't flip a `!==` into the wrong boolean).

- [ ] **Step 8: `EImportJobStatus`**

  In `src/core/application/services/importJobQueue.service.ts`, replace:
  ```ts
  export type ImportJobStatus = 'pending' | 'processing' | 'done' | 'failed';
  ```
  with:
  ```ts
  export enum EImportJobStatus {
      PENDING = 'pending',
      PROCESSING = 'processing',
      DONE = 'done',
      FAILED = 'failed',
  }
  ```
  Update every `.status = 'pending'` / `'processing'` / `'done'` / `'failed'` assignment in the
  same file (lines ~77,95,112,130 per the inventory) to the enum member. Update
  `importJob.controller.ts`'s comparisons (lines ~77,82) to use the enum. Leave the parallel SSE
  `event.type` (`'progress'|'done'|'error'`) as-is — it's a distinct wire-event vocabulary, not
  the same field (the inventory explicitly flagged these as different concepts, not a bug).

- [ ] **Step 9: Run full BE suite + typecheck**

  Run: `npm test` — expected 67/67 suites, 582/582 tests (same counts as baseline).
  Run: `npx tsc --noEmit` — expected clean.

- [ ] **Step 10: Commit**

  ```bash
  git add -A
  git commit -m "refactor(be): consolidate ESort/EFilterOperator usage, envConfig booleans, EImportJobStatus enum"
  ```

---

## Task 2 (BE): `EPasswordResetAccountType`

**Files:**
- Modify: `src/core/infrastructure/mail/mail.service.ts` (declare enum, retype
  `sendPasswordResetEmail`'s `accountType` param)
- Modify: `src/modules/admin/application/services/admin.service.ts:196`,
  `src/modules/agencyAccount/application/services/agencyAccount.service.ts:156`,
  `src/modules/tenantAccount/application/services/tenantAccount.service.ts:153`,
  `src/modules/merchant/application/services/merchant.service.ts:245`,
  `src/modules/customer/application/services/customer.service.ts:114` (pass the enum member
  instead of the raw string)
- Test: whichever of `test/modules/{admin,agencyAccount,tenantAccount,merchant,customer}/...`
  cover each service's `forgotPassword`/reset flow

**Interfaces:**
- Produces: `enum EPasswordResetAccountType { ADMIN = 'admin', MERCHANT = 'merchant', CUSTOMER = 'customer' }`
  exported from `mail.service.ts`. **Naming note (deliberate):** name it exactly
  `EPasswordResetAccountType`, NOT `EAccountType` — a real, differently-spelled `ERoleScrope`
  (`ADMIN|MERCHANT|AGENCY|TENANT|CUSTOMER`, uppercase) already exists for a different purpose
  (auth scope, not reset-email routing); a same-named or confusingly-similar type invites a
  future bug where someone tries to convert one into the other. Do not add any conversion helper
  between the two — they model different things (reset-email routing has only 3 values because
  Agency/Tenant accounts route through `'merchant'`, since they authenticate via a shared
  Merchant identity; this is existing, correct behavior — see `agencyAccount.service.ts:156` /
  `tenantAccount.service.ts:153` both already passing `'merchant'`).

- [ ] **Step 1: Declare the enum**

  In `mail.service.ts`, above `sendPasswordResetEmail`, add:
  ```ts
  export enum EPasswordResetAccountType {
      ADMIN = 'admin',
      MERCHANT = 'merchant',
      CUSTOMER = 'customer',
  }
  ```
  Retype the method's `accountType: 'admin' | 'merchant' | 'customer'` parameter to
  `accountType: EPasswordResetAccountType`.

- [ ] **Step 2: Update the 5 call sites**

  In each of the 5 files listed above, import `EPasswordResetAccountType` from
  `mail.service.ts` and replace the raw string argument
  (`'admin'`/`'merchant'`/`'merchant'`/`'merchant'`/`'customer'` respectively) with
  `EPasswordResetAccountType.ADMIN` / `.MERCHANT` / `.CUSTOMER`.

- [ ] **Step 3: Run tests**

  Run: `npm test -- test/modules/admin test/modules/agencyAccount test/modules/tenantAccount test/modules/merchant test/modules/customer`
  Expected: all pass, unchanged count.

- [ ] **Step 4: Commit**

  ```bash
  git add -A
  git commit -m "refactor(be): add EPasswordResetAccountType, replace 5 forgotPassword call sites"
  ```

---

## Task 3 (BE): CMS repeat/data-binding enum cluster + shared filter type

**Files:**
- Modify: `src/modules/node/domain/entities/node.entity.ts` (declare `ENodeLayoutMode`)
- Modify: `src/modules/node/application/dto/node.dto.ts`,
  `src/modules/page/application/services/page.service.ts`,
  `src/modules/component/application/services/component.service.ts` (consume
  `ENodeLayoutMode`)
- Modify: `src/modules/node/application/services/transformGroup2DataSourceToRepeat.ts`
  (declare `ERepeatSource`, `ERepeatMode`, `ERepeatCardinality`, `EFilterValueSource`, and a
  shared `GenericDataSourceFilter` type — or place these in a shared
  `src/modules/node/domain/types/repeat.types.ts` if that fits this module's existing file
  layout better; check first)
- Modify: `src/modules/contentEntry/application/services/contentEntryUsage.service.ts`,
  `src/modules/page/application/services/page.service.ts` (consume all 4 new enums; replace
  both files' independently-declared, DIVERGENT inline filter-entry shapes with the one shared
  `GenericDataSourceFilter` type)
- Test: `test/modules/node`, `test/modules/page`, `test/modules/contentEntry` service tests

**Interfaces:**
- Produces:
  ```ts
  export enum ENodeLayoutMode { FLOW = 'flow', FREE = 'free' }
  export enum ERepeatSource { OWN = 'own', RELATED = 'related', BACKLINK = 'backlink', MIXED = 'mixed' }
  export enum ERepeatMode { MANUAL = 'manual', DYNAMIC = 'dynamic' }
  export enum ERepeatCardinality { ONE = 'one', MANY = 'many' }
  export enum EFilterValueSource { STATIC = 'static', PATH_PARAM = 'pathParam', QUERY_PARAM = 'queryParam' }
  export interface GenericDataSourceFilter {
      field: string;
      valueSource: EFilterValueSource;
      paramName?: string;
      staticValue?: string;
      operator?: string;
  }
  ```
  `GenericDataSourceFilter` is the UNION of both files' previously-divergent shapes (union of
  all fields from both `page.service.ts`'s `{field?, valueSource?, paramName?}` and
  `contentEntryUsage.service.ts`'s `{field, valueSource, staticValue?, operator?}` — this is a
  real bug fix, not just a rename: `page.service.ts` was silently missing `staticValue`/
  `operator` support. **Read both files' current filter-handling logic in full before writing
  the shared type** — if `page.service.ts`'s logic genuinely doesn't handle `staticValue`/
  `operator` cases (it may only support `pathParam`), that's fine (the field can be optional and
  simply unused there), but do NOT silently drop functionality `contentEntryUsage.service.ts`
  currently has.

- [ ] **Step 1: Read both filter-handling implementations in full**

  Read `page.service.ts`'s repeat-filter resolution logic (around line 352-371) and
  `contentEntryUsage.service.ts`'s (around line 127-158) in their entirety — not just the cited
  lines — to understand exactly what each currently does with `valueSource`/`staticValue`/
  `operator`, so the shared type change doesn't accidentally change behavior in either.

- [ ] **Step 2: Declare `ENodeLayoutMode`, update 4 call sites**

  Add the enum to `node.entity.ts` near the `layoutMode` column declaration. Update
  `node.dto.ts` (lines ~10,26), `page.service.ts` (line ~117), `component.service.ts` (lines
  ~431,456,728) to use `ENodeLayoutMode.FLOW`/`.FREE` instead of `'flow'`/`'free'` literals.

- [ ] **Step 3: Declare `ERepeatSource`, `ERepeatMode`, `ERepeatCardinality`,
  `EFilterValueSource`, `GenericDataSourceFilter`**

  Place all 5 in `transformGroup2DataSourceToRepeat.ts` (or a new
  `src/modules/node/domain/types/repeat.types.ts` if you find an existing types-file convention
  for this module — check `src/modules/node/domain/` for a similar file first, e.g. an existing
  `node.types.ts`, and prefer adding there if one exists rather than creating a new file).

- [ ] **Step 4: Update every consumer**

  `transformGroup2DataSourceToRepeat.ts` (lines ~16-18,38-46,40,64,65,66 — re-verify), replace
  its own literal usages with the enums it just declared. Then update
  `contentEntryUsage.service.ts` (lines ~140,152,154,157,158,195,222,237 — re-verify) and
  `page.service.ts` (lines ~352,368-371,369 — re-verify) to import and use `ERepeatSource`,
  `ERepeatMode`, `ERepeatCardinality`, `EFilterValueSource`, and replace both files' local inline
  filter-entry type with the shared `GenericDataSourceFilter`.

  **Do not touch** the retired node-type name literals in this same file
  (`'featured-entry'`/`'project-showcase'`/`'logo-grid'`/`'mixed-feed'`, lines ~16-18) — these
  are an intentional backward-compatibility list for `PageVersionService.restore()`, already
  documented as a deliberate exception, out of scope for this task.

- [ ] **Step 5: Run tests**

  Run: `npm test -- test/modules/node test/modules/page test/modules/contentEntry`
  Expected: all pass, unchanged count. If `page.service.ts`'s filter logic changes behavior
  because the shared type now exposes `staticValue`/`operator` where it didn't before, that's
  only acceptable if it's inert (the field exists on the type but isn't read by that file's
  logic) — flag in your report if you find `page.service.ts` needs an actual logic change to
  stay behavior-identical, don't silently add new runtime behavior as a side effect of a type
  change.

- [ ] **Step 6: Commit**

  ```bash
  git add -A
  git commit -m "refactor(be): enum the node-layout/repeat/filter-source discriminants, unify the divergent filter-entry type"
  ```

---

## Task 4 (BE): Header/Footer preset variant enums

**Files:**
- Modify: `src/modules/headerPreset/domain/entities/headerPreset.entity.ts`,
  `src/modules/headerPreset/application/dto/headerPreset.dto.ts`
- Modify: `src/modules/footerPreset/domain/entities/footerPreset.entity.ts`,
  `src/modules/footerPreset/application/dto/footerPreset.dto.ts`
- Test: `test/modules/headerPreset`, `test/modules/footerPreset` entity tests

**Interfaces:**
- Produces (in `headerPreset.entity.ts`):
  ```ts
  export enum EHeaderBgVariant { SOLID = 'solid', TRANSPARENT_OVERLAY = 'transparent-overlay', BLUR = 'blur' }
  export enum EHeaderLayoutVariant { LOGO_LEFT = 'logo-left', CENTERED = 'centered', SPLIT = 'split' }
  export enum ECtaVariant { PRIMARY = 'primary', SECONDARY = 'secondary' }
  ```
- Produces (in `footerPreset.entity.ts`):
  ```ts
  export enum EFooterVariant { DEFAULT = 'default', MINIMAL = 'minimal', CENTERED = 'centered', SPLIT_CTA = 'split-cta' }
  ```

- [ ] **Step 1: Header enums** — declare all 3 in `headerPreset.entity.ts` next to the fields
  they type (lines ~56,60,66 per the inventory), retype the entity's `bgVariant`,
  `layoutVariant`, and the nested `cta.variant` fields to use them. Update
  `headerPreset.dto.ts` (lines ~11-13,25-27) — both Create and Update DTOs — to use the same
  enums.

- [ ] **Step 2: Footer enum** — same treatment for `EFooterVariant` in `footerPreset.entity.ts`
  (line ~74) and `footerPreset.dto.ts` (lines ~16,31).

- [ ] **Step 3: Run tests**

  Run: `npm test -- test/modules/headerPreset test/modules/footerPreset`
  Expected: all pass, unchanged count. These fields are BE-inert pass-through values (rendered
  only on FE) — this is a pure type-safety change with zero behavior difference.

- [ ] **Step 4: Commit**

  ```bash
  git add -A
  git commit -m "refactor(be): enum header/footer preset variant fields"
  ```

---

## Task 5 (BE): `ContentVisibilityRuleType.operator` → `EFilterOperator`

**Files:**
- Modify: `src/modules/contentType/application/dto/contentVisibilityRule.dto.ts:11`
- Test: whichever test covers `ContentVisibilityRuleType`/`contentType` DTOs, if any exist —
  otherwise this is a type-only change with no test to update.

**Interfaces:**
- Consumes: existing `EFilterOperator` (`src/core/shared/types/common.types.ts`).

- [ ] **Step 1**: retype `operator: string` to `operator: EFilterOperator` — the field's own
  doc comment already says "same operator set as `EFilterOperator`," this closes the gap
  between the comment and the actual type.

- [ ] **Step 2: Run typecheck**

  Run: `npx tsc --noEmit` — this may surface call sites that construct a
  `ContentVisibilityRuleType` with a string not in `EFilterOperator`'s member set; if so, fix
  those call sites to use the enum member (do not widen the type back to `string` to make the
  error go away).

- [ ] **Step 3: Commit**

  ```bash
  git add -A
  git commit -m "refactor(be): type ContentVisibilityRuleType.operator as EFilterOperator"
  ```

---

## Task 6 (FE): `Breakpoint` promotion (foundational — do carefully, biggest blast radius)

**Files:**
- Modify: `src/core/hooks/useBreakpoint.ts` (promote `Breakpoint` from a bare `type` to an
  `as const` object + derived union + `isBreakpoint()` guard)
- Modify (import-only changes, no logic changes): every file the inventory found reusing the
  type — `src/modules/cms/node/buildLayoutPatch.ts`, `applyNodeStyle.ts`, `applyNodeLayout.ts`,
  `mergeResponsiveOverride.ts`, `compileNodeStateCss.ts`, `applyNodeBackgroundAnimation.ts`,
  `node.types.ts`, `commands/nodeCommands.ts`, `ResponsiveNodeTree.tsx`,
  `primitives/CardListNode.tsx`, `admin/nodeBuilder/NodeBuilder.page.tsx`,
  `admin/nodeBuilder/{NodeVisibilityTab,NodeStyleTab,NodeStyleEffectsTab,NodeBuilderToolbar}.tsx`,
  `admin/previewCmsPage.page.tsx`
- Test: `test/core/hooks/useBreakpoint.test.ts` if it exists (check first — create one if it
  doesn't, covering the new `isBreakpoint()` guard), plus every `test/**` file that already
  covers a file in the list above (run the full suite regardless, see Step 4).

**Interfaces:**
- Produces:
  ```ts
  export const Breakpoint = { MOBILE: 'mobile', TABLET: 'tablet', DESKTOP: 'desktop' } as const;
  export type Breakpoint = (typeof Breakpoint)[keyof typeof Breakpoint];
  export function isBreakpoint(value: unknown): value is Breakpoint {
      return typeof value === 'string' && (Object.values(Breakpoint) as string[]).includes(value);
  }
  ```
  matching the exact shape of the existing `ELayoutMode` pattern in this codebase — read
  `src/modules/cms/node/node.constants.ts`'s `ELayoutMode` declaration first and mirror its
  style exactly (naming of the guard function, export order, comment style).

- [ ] **Step 1: Read the current declaration and every real comparison site**

  Read `useBreakpoint.ts` in full. Then, for EACH file in the Files list above, read the exact
  lines the inventory cited (they're listed in
  `docs/superpowers/specs/2026-09-02-be-fe-reuse-audit-report.md`'s H2 section — check there
  first for the full file:line list captured during the audit) to confirm the literal spelling
  used (`'mobile'`/`'tablet'`/`'desktop'`, all lowercase, per the inventory's own confirmation —
  no spelling drift was found). Since `Breakpoint`'s member VALUES don't change (only the type
  declaration mechanism), a plain `type Breakpoint = 'mobile'|'tablet'|'desktop'` consumer stays
  source-compatible with the new `as const`-derived type as long as you keep exporting a type
  named `Breakpoint` with the same 3 literal members — most consumer files may need ZERO changes
  beyond re-verifying they still typecheck. Do not blindly rewrite every consumer file's literal
  comparisons (`bp === 'desktop'`) into `bp === Breakpoint.DESKTOP` unless it's cheap to do in
  that file already — prioritize NodeBuilder.page.tsx's own literals only if time/risk budget
  allows; the enum-typed underlying value is the real fix, call-site spelling is a bonus.

- [ ] **Step 2: Promote the declaration**

  In `useBreakpoint.ts`, replace:
  ```ts
  export type Breakpoint = 'mobile' | 'tablet' | 'desktop';
  ```
  with the `as const` + derived-type + guard pattern shown in Interfaces above. Keep the hook's
  own runtime logic (whatever currently produces a `Breakpoint` value from a media query) using
  the new `Breakpoint.MOBILE`/`.TABLET`/`.DESKTOP` constants instead of raw string literals at
  its own assignment sites.

- [ ] **Step 3: Typecheck-fix ripple**

  Run: `npx astro check`. Every consumer file that only ever consumed the exported `Breakpoint`
  TYPE (not the removed literal syntax) should need no changes. Fix any error astro check
  surfaces — these will be real, since the type is structurally the same union of 3 string
  literals.

- [ ] **Step 4: Run full FE suite**

  Run: `npm test`
  Expected: 107/107 suites, 1109/1109 tests (same baseline). This touches enough files that if
  anything is going to break from an oversight, it'll show up here.

- [ ] **Step 5: Commit**

  ```bash
  git add -A
  git commit -m "refactor(fe): promote Breakpoint to as-const object + derived union + guard"
  ```

---

## Task 7 (FE): `shared/` dedup — `IScopeRuleFE`/`EScopeRuleType` + `MerchantOrgType`

**Files:**
- Modify: `src/shared/helpers/scopeRule.helpers.ts` (retype `IScopeRuleFE.type` to
  `EScopeRuleType` instead of a fresh string-literal union)
- Modify: `src/shared/contexts/permission/PermissionContext.tsx` (DELETE its independent
  duplicate of `IScopeRuleFE`; import the canonical one from `scopeRule.helpers.ts` instead)
- Modify: `src/modules/tenant/pages/tenantAccount/staff/permRow.tsx`,
  `permissionModal.tsx` (no import-path change expected — already import from
  `scopeRule.helpers.ts` per the inventory; re-verify)
- Modify: `src/shared/contexts/auth/AuthContext.tsx:33` (replace inline
  `'AGENCY' | 'TENANT'` with imported `MerchantOrgType`)
- Modify: `src/modules/merchant/auth/merchantSelectContext.page.tsx:18` (delete its local
  `type OrgType = 'AGENCY' | 'TENANT'`, import `MerchantOrgType` from
  `src/shared/services/merchant/merchantSwitchConfig.ts` instead, rename local usages from
  `OrgType` to `MerchantOrgType`)
- Test: any `test/shared/**`/`test/modules/merchant/**` file covering these

**Interfaces:**
- Consumes: `EScopeRuleType` (`src/shared/generated/typed-graphql.ts:5978-5992`, values
  `ALLOW_ALL, DENY_ALL, INCLUDE, EXCLUDE, SELF, OR, AND` — already generated, do not hand-edit
  this generated file), `MerchantOrgType` (`src/shared/services/merchant/merchantSwitchConfig.ts:14`).

- [ ] **Step 1: `IScopeRuleFE`**

  In `scopeRule.helpers.ts`, read the current `IScopeRuleFE` declaration in full. Retype its
  `type` discriminant field on each union branch from the bare string literal
  (`'ALLOW_ALL'`/`'DENY_ALL'`/etc.) to `EScopeRuleType.ALLOW_ALL` / `.DENY_ALL` / etc. Import
  `EScopeRuleType` from `src/shared/generated/typed-graphql.ts`.

- [ ] **Step 2: Delete the duplicate in `PermissionContext.tsx`**

  Delete `PermissionContext.tsx`'s own independent `IScopeRuleFE`-shaped type declaration
  (lines ~11-17). Import `IScopeRuleFE` from `scopeRule.helpers.ts` instead. Update every
  literal comparison in this file (lines ~84,110,117-118,133,160-167 per the inventory) to use
  the `EScopeRuleType` enum members instead of bare strings.

- [ ] **Step 3: Update `permRow.tsx`/`permissionModal.tsx` literal comparisons**

  These already import the type correctly — just update their literal comparisons (lines
  ~27,31-33,49,106 in `permRow.tsx`; ~72,83 in `permissionModal.tsx`) to use
  `EScopeRuleType.X` instead of the bare string.

- [ ] **Step 4: `MerchantOrgType` dedup**

  In `AuthContext.tsx:33`, import `MerchantOrgType` from
  `src/shared/services/merchant/merchantSwitchConfig.ts` and use it in place of the inline
  `'AGENCY' | 'TENANT'` union. In `merchantSelectContext.page.tsx:18`, delete the local `type
  OrgType = 'AGENCY' | 'TENANT'` declaration, import `MerchantOrgType` instead, and rename the
  3 local usages (lines ~136,181,184) plus update `merchantMembershipsPage.tsx`'s 2 usages
  (lines ~58,72) if those also reference the deleted local type — re-check imports there.

- [ ] **Step 5: Run tests + typecheck**

  Run: `npx astro check` then `npm test` — expected 107/107 suites, 1109/1109 tests.

- [ ] **Step 6: Commit**

  ```bash
  git add -A
  git commit -m "refactor(fe): dedupe IScopeRuleFE onto EScopeRuleType, dedupe MerchantOrgType"
  ```

---

## Task 8 (FE): Theme color token keys — single source of truth

**Files:**
- Modify: `src/modules/theme/theme.types.ts` (add `THEME_COLOR_TOKEN_KEYS`, derive
  `ThemeColorSet` from it instead of hand-listing 15 keys)
- Modify: `src/modules/cms/admin/nodeBuilder/ColorTokenOrCustom.tsx`,
  `src/modules/theme/resolveThemeCssVars.ts`, `src/modules/cms/admin/manageThemes.page.tsx`
  (delete each file's own byte-identical `COLOR_KEYS`/`COLOR_FIELDS` array; import
  `THEME_COLOR_TOKEN_KEYS` instead)
- Test: `test/modules/theme/**`

**Interfaces:**
- Produces:
  ```ts
  export const THEME_COLOR_TOKEN_KEYS = [
      'background', 'surface', 'surfaceMuted', 'foreground', 'foregroundMuted', 'border',
      'primary', 'onPrimary', 'secondary', 'onSecondary', 'accent', 'onAccent',
      'success', 'warning', 'danger',
  ] as const;
  export type ThemeColorSet = Record<(typeof THEME_COLOR_TOKEN_KEYS)[number], string>;
  ```
  Read `theme.types.ts`'s current `ThemeColorSet` declaration first to copy the exact 15 keys in
  their existing order (the list above is from the inventory — cross-check against the live
  file before committing, since a transcription slip here would be a real regression across 3
  consumer files).

- [ ] **Step 1: Add `THEME_COLOR_TOKEN_KEYS`, derive `ThemeColorSet`**

  In `theme.types.ts`, read the current `ThemeColorSet` interface (lines ~10-17) verbatim, then
  replace it with the `as const` array + derived `Record` type shown above, using the exact same
  15 key names in the exact same order as the current interface.

- [ ] **Step 2: Redirect the 3 duplicate arrays**

  In `ColorTokenOrCustom.tsx` (lines ~4-8), `resolveThemeCssVars.ts` (lines ~4-8), and
  `manageThemes.page.tsx` (lines ~26-30), delete each file's own hand-typed
  `COLOR_KEYS`/`COLOR_FIELDS` array and import `THEME_COLOR_TOKEN_KEYS` from `theme.types.ts` in
  its place (rename local usages of `COLOR_KEYS`/`COLOR_FIELDS` to `THEME_COLOR_TOKEN_KEYS`, or
  keep a local `const COLOR_KEYS = THEME_COLOR_TOKEN_KEYS;` alias in each file if that's a
  smaller diff — your call).

- [ ] **Step 3: Run tests + typecheck**

  Run: `npx astro check` then `npm test -- test/modules/theme`
  Then the full suite: `npm test` — expected 107/107 suites, 1109/1109 tests.

- [ ] **Step 4: Commit**

  ```bash
  git add -A
  git commit -m "refactor(fe): single-source THEME_COLOR_TOKEN_KEYS, delete 3 duplicate copies"
  ```

---

## Task 9 (FE): Filter/visibility operator unification (`EFilterOperator`) — highest-value FE task

**Files:**
- Modify: `src/modules/cms/cms.types.ts:42` (retype the 8-member inline operator union to use
  `EFilterOperator`)
- Modify: `src/modules/cms/admin/GenericFilterListInput.tsx`,
  `src/modules/cms/admin/FormVisibilityRulesInput.tsx`,
  `src/modules/cms/admin/ContentVisibilityRulesInput.tsx`,
  `src/modules/cms/admin/nodeBuilder/NodeDataSourceTab.tsx` (replace each file's own
  independently hand-typed 6-member option list with one derived from `EFilterOperator`)
- Modify: `src/modules/cms/api/genericDataSource.ts:30` (use `EFilterOperator.EQUALS` instead
  of `'$eq'`)
- Modify: `src/modules/cms/node/primitives/FormEmbedNode.tsx` (retype
  `FormFieldVisibilityRule.operator` from loose `string` to `EFilterOperator`, update its
  switch statement)
- Modify: `src/modules/cms/node/node.types.ts` (retype `VisibilityCondition.operator`, and
  update `evaluateVisibilityRules.ts`'s switch to match — see the unification note below)
- Modify: `src/modules/cms/node/evaluateVisibilityRules.ts`
- Test: `test/modules/cms/**` covering any of the above

**Interfaces:**
- Consumes: `EFilterOperator` (`src/core/api/types.ts:5-21`, 15 members:
  `$eq/$ne/$gt/$gte/$lt/$lte/$in/$nin/$like/$ilike/$sw/$ew/$between/$null/$notNull`).
- Produces: `export const CMS_FILTER_OPERATOR_OPTIONS: Array<{ value: EFilterOperator; label: string }>`
  — a canonical option list for form/dropdown UIs, exported from `src/modules/cms/cms.types.ts`,
  built once from `EFilterOperator`, with each of the 4 currently-duplicated option lists
  filtered/mapped from it as needed (some UIs may need only a subset of the 15 members — read
  each of the 4 files' current option list to see exactly which subset it exposes, and keep
  each file exposing that SAME subset from `CMS_FILTER_OPERATOR_OPTIONS`, not silently expanding
  every dropdown to all 15 operators).
- **Operator spelling unification** (the inventory's §3.7 finding): `VisibilityCondition`
  (`node.types.ts`) currently uses bare names (`'eq'|'neq'|'gt'|'gte'|'lt'|'lte'|'contains'`)
  while `FormEmbedNode`'s `FormFieldVisibilityRule` uses `$`-prefixed Mongo-style names
  (`'$eq'|'$ne'|'$gt'|'$gte'|'$lt'|'$lte'|'$in'`). Standardize BOTH on `EFilterOperator`'s
  `$`-prefixed spelling (it's the pre-existing real enum, matches the BE's own `EFilterOperator`
  wire convention, and is the one already correctly used by `DatatableSideFilter.tsx`). This
  means `evaluateVisibilityRules.ts`'s switch needs its case labels changed from `'eq'` to
  `EFilterOperator.EQUALS` etc., AND `'neq'` becomes `EFilterOperator.NOT_EQUALS` (verify the
  exact member name in `EFilterOperator`'s declaration — the inventory notes the BE side calls
  this `$ne`, i.e. `NOT_EQUALS` or similar; read the enum declaration to get the exact member
  name right rather than guessing), AND `'contains'` — check whether `EFilterOperator` has an
  equivalent member (likely `$like` or `$ilike`) and pick the semantically closest one, noting
  your choice in the commit message since this is the one case without an exact 1:1 name match.

- [ ] **Step 1: Read `EFilterOperator`'s full declaration**

  Read `src/core/api/types.ts:5-21` in full to get every member's exact name and value. This is
  the ground truth for every subsequent step — do not guess member names.

- [ ] **Step 2: `cms.types.ts`'s inline union**

  Retype the 8-member union at `cms.types.ts:42` to reference `EFilterOperator` members
  (`EFilterOperator.EQUALS | EFilterOperator.NOT_EQUALS | ...` for whichever 8 of the 15 members
  it currently lists) rather than a fresh literal union. If it's meant to allow all 15, just use
  `EFilterOperator` directly instead of a narrowed union — read the field's actual usage first
  to tell which is correct (does anything reject an operator not in its narrower 8-member list
  today? If so, keep the narrowing, just express it via enum members instead of bare strings).

- [ ] **Step 3: Build `CMS_FILTER_OPERATOR_OPTIONS`, redirect the 4 duplicated lists**

  Add `CMS_FILTER_OPERATOR_OPTIONS` to `cms.types.ts` (or a new small
  `src/modules/cms/cmsFilterOperator.constants.ts` if `cms.types.ts` is meant to be types-only —
  check the file's existing content style first). Read each of
  `GenericFilterListInput.tsx`/`FormVisibilityRulesInput.tsx`/`ContentVisibilityRulesInput.tsx`/
  `NodeDataSourceTab.tsx`'s current option list (all reportedly 6 members, but re-verify each
  individually — they may not be identical to each other) and replace with a
  filter/map over `CMS_FILTER_OPERATOR_OPTIONS` that reproduces the exact same visible dropdown
  options as before (same members, same order, same labels).

- [ ] **Step 4: `genericDataSource.ts`'s fallback**

  Replace `f.operator || '$eq'` with `f.operator || EFilterOperator.EQUALS`.

- [ ] **Step 5: `FormEmbedNode.tsx`**

  Retype `FormFieldVisibilityRule.operator` from `operator?: string` to
  `operator?: EFilterOperator`. Update its switch statement's case labels from raw `'$eq'` etc.
  to `EFilterOperator.EQUALS` etc. (the values are identical, so this is a type-only change).

- [ ] **Step 6: `VisibilityCondition`/`evaluateVisibilityRules.ts` unification**

  Retype `node.types.ts`'s `VisibilityCondition.operator` from bare `string` to
  `EFilterOperator`. Update `evaluateVisibilityRules.ts`'s switch (lines ~20-29) to use
  `EFilterOperator` members per the mapping worked out in Step 1's Interfaces note. Update
  `NodeVisibilityTab.tsx` (the admin UI authoring these conditions — lines ~37,83-88,100,107,
  134,149,174,210 per the inventory) to construct/compare using the enum members instead of the
  old bare-name strings (`'eq'` → `EFilterOperator.EQUALS`, etc.) — **this is the one call site
  where the actual data shape stored in a Node's `style`/`visibilityRules` JSONB could change
  value** (from `'eq'` to `'$eq'`) if any already-saved page has a `VisibilityCondition` with
  the OLD bare-name operator persisted. Before changing the stored value, check whether existing
  Node data in a real dev DB could have `operator: 'eq'` already saved (grep
  `docs/superpowers/specs/*.md`/any migration scripts for a hint, or note this as a
  DONE_WITH_CONCERNS item for the controller to verify against a real dev DB before this ships)
  — if such data exists, `evaluateVisibilityRules.ts` needs a backward-compatible read path
  (accept both the old bare name and the new `$`-prefixed value) rather than a hard cutover, at
  least until a data migration handles it. Flag this explicitly in your task report regardless
  of which way you resolve it.

- [ ] **Step 7: Run tests + typecheck**

  Run: `npx astro check` then `npm test -- test/modules/cms`
  Then the full suite: `npm test` — expected 107/107 suites, 1109/1109 tests.

- [ ] **Step 8: Commit**

  ```bash
  git add -A
  git commit -m "refactor(fe): unify CMS filter/visibility operator strings onto EFilterOperator"
  ```

---

## Task 10 (FE): `EFieldType` — use the enum that already exists

**Files:**
- Modify: `src/shared/components/fields/contentEntryFieldRenderer.tsx`,
  `src/modules/cms/node/primitives/ContentDetailNode.tsx`,
  `src/modules/cms/admin/manageContentEntries.page.tsx`,
  `src/modules/cms/admin/ContentEntryRepeaterInput.tsx`,
  `src/modules/cms/admin/FieldDefinitionArrayInput.tsx`,
  `src/modules/cms/admin/nodeBuilder/NodeBuilder.page.tsx`
- Test: `test/shared/components/fields/**`, `test/modules/cms/**` covering the above

**Interfaces:**
- Consumes: `EFieldType` (`src/shared/generated/typed-graphql.ts:4347` — 13 members:
  `TEXT, RICHTEXT, NUMBER, BOOLEAN, DATE, SELECT, IMAGE, GALLERY, VIDEO, LINK, RELATION,
  TAXONOMY, REPEATER`). This is a pure substitution task — no new type, `FieldDefinitionDTO.type`
  is already correctly typed as `EFieldType` end to end; only these 6 files compare against bare
  string literals instead of the enum member.

- [ ] **Step 1**: in each of the 6 files, replace every `'TEXT'`/`'RICHTEXT'`/`'RELATION'`/etc.
  string-literal comparison/case-label with `EFieldType.TEXT`/`.RICHTEXT`/`.RELATION`/etc.
  (import `EFieldType` from `src/shared/generated/typed-graphql.ts` in each file that doesn't
  already have it). `contentEntryFieldRenderer.tsx` has an 11-case switch (lines ~32-58) — do
  all 11 cases, not a subset. `ContentDetailNode.tsx` has 10 occurrences across lines
  ~74,76,238,279-280,382,407,410,415,418,421 — re-verify each is really an `EFieldType`
  comparison (not an unrelated string) before changing it.

- [ ] **Step 2: Run tests + typecheck**

  Run: `npx astro check` then `npm test` — expected 107/107 suites, 1109/1109 tests. Since
  `EFieldType` member values equal the original string literals, this should be a pure
  type-safety change with zero behavior difference — any test failure means a literal was
  mistyped or a non-`EFieldType` string was accidentally changed.

- [ ] **Step 3: Commit**

  ```bash
  git add -A
  git commit -m "refactor(fe): use existing EFieldType enum instead of raw string literals (6 files)"
  ```

---

## Task 11 (FE): `EMenuItemTargetType` consistency fix

**Files:**
- Modify: `src/modules/cms/chrome/menuTree.ts:35-44`
- Test: any `test/modules/cms/chrome/**` covering menu rendering

**Interfaces:**
- Consumes: `EMenuItemTargetType` (`src/shared/generated/typed-graphql.ts:3971` — `PAGE, URL,
  ANCHOR, NONE`), already used correctly in `MenuTreeEditor.tsx`.

- [ ] **Step 1**: replace `menuTree.ts`'s `case 'PAGE':`/`'URL':`/`'ANCHOR':` (and add a case
  for `NONE` if the switch doesn't already have one — check whether the current switch has a
  `default` that silently handles `NONE`, and if so keep that behavior, just express the
  existing 3 cases via the enum) with `EMenuItemTargetType.PAGE`/`.URL`/`.ANCHOR`. Import the
  enum from `typed-graphql.ts`.

- [ ] **Step 2: Run tests**

  Run: `npm test -- test/modules/cms` then the full suite `npm test`.

- [ ] **Step 3: Commit**

  ```bash
  git add -A
  git commit -m "refactor(fe): use EMenuItemTargetType enum in menuTree.ts renderer"
  ```

---

## Task 12 (FE): DataBinding/Repeat as-const cluster

**Files:**
- Modify: `src/modules/cms/node/node.types.ts` (declare `EDataBindingMode`, `ERepeatSource`,
  `ERepeatCardinality`, `ERepeatPaginationMode`, `ERepeatOnNotFound`, all as `as const` objects
  next to the interfaces they type)
- Modify: `src/modules/cms/node/nodeDataBinding.ts`,
  `src/modules/cms/node/resolveRenderableChildren.ts`,
  `src/modules/cms/node/resolveBindableLocalItemFields.ts`,
  `src/modules/cms/node/resolveBindableContentType.ts`,
  `src/modules/cms/node/primitives/FrameNode.tsx`,
  `src/modules/cms/node/primitives/TableNode.tsx`,
  `src/modules/cms/node/primitives/CardListNode.tsx`,
  `src/modules/cms/node/primitives/PaginationControl.tsx`,
  `src/modules/cms/admin/nodeBuilder/NodeDataSourceTab.tsx`,
  `src/modules/cms/admin/nodeBuilder/NodeBuilder.page.tsx`,
  `src/modules/cms/api/resolveCmsPageProps.ts`
- Test: `test/modules/cms/node/**`, `test/modules/cms/api/**`

**Interfaces:**
- Produces (all in `node.types.ts`, matching the `ENodeType`/`ELayoutMode` `as const` pattern —
  note the FE convention keeps the `E`-prefix even for `as const` objects, unlike a bare-array
  constant like `SECTION_CATEGORIES`):
  ```ts
  export const EDataBindingMode = { STATIC: 'static', BOUND_FIELD: 'boundField', ITEM_INDEX: 'itemIndex', MIXED_FIELD: 'mixedField' } as const;
  export type EDataBindingMode = (typeof EDataBindingMode)[keyof typeof EDataBindingMode];

  export const ERepeatSource = { OWN: 'own', RELATED: 'related', BACKLINK: 'backlink', MIXED: 'mixed', LOCAL: 'local' } as const;
  export type ERepeatSource = (typeof ERepeatSource)[keyof typeof ERepeatSource];

  export const ERepeatCardinality = { MANY: 'many', ONE: 'one' } as const;
  export type ERepeatCardinality = (typeof ERepeatCardinality)[keyof typeof ERepeatCardinality];

  export const ERepeatPaginationMode = { RELOAD: 'reload', CLIENT: 'client' } as const;
  export type ERepeatPaginationMode = (typeof ERepeatPaginationMode)[keyof typeof ERepeatPaginationMode];

  export const ERepeatOnNotFound = { NOT_FOUND: '404', HIDE: 'hide' } as const;
  export type ERepeatOnNotFound = (typeof ERepeatOnNotFound)[keyof typeof ERepeatOnNotFound];
  ```
  Read `node.types.ts`'s current `DataBinding.mode`, `CollectionRepeat.source/cardinality/
  pagination.mode/onNotFound` field declarations first to confirm exact member spelling
  (`ERepeatSource` has 5 members per the inventory — `'own'|'related'|'backlink'|'mixed'|'local'`
  — one more than BE's 4-member `ERepeatSource` from Task 3, since FE's `'local'` source has no
  BE-side equivalent; this is expected, do not try to reconcile FE/BE member counts — they are
  two independently-declared types that happen to share a name across repos, same as every other
  hand-mirrored BE/FE pair in this codebase).

- [ ] **Step 1**: declare all 5 `as const` objects + derived types (`EDataBindingMode`,
  `ERepeatSource`, `ERepeatCardinality`, `ERepeatPaginationMode`, `ERepeatOnNotFound`) in
  `node.types.ts`, replacing the current bare-string-literal-union field types on
  `DataBinding`/`CollectionRepeat` with references to the new types.

- [ ] **Step 2**: update every consumer file's literal comparisons. Given the file count (11
  files), work through them one at a time, re-reading the inventory's cited lines in
  `docs/superpowers/specs/2026-09-02-be-fe-reuse-audit-report.md` for each before editing —
  don't batch-guess. `nodeDataBinding.ts` has the most occurrences (mode + source + cardinality
  all appear there).

- [ ] **Step 3: Run tests + typecheck**

  Run: `npx astro check` then `npm test` — expected 107/107 suites, 1109/1109 tests.

- [ ] **Step 4: Commit**

  ```bash
  git add -A
  git commit -m "refactor(fe): as-const the DataBinding/Repeat mode/source/cardinality/pagination discriminants"
  ```

---

## Task 13 (FE): Animation + Frame-behavior + CustomCode-isolation as-const cluster

**Files:**
- Modify: `src/modules/cms/node/animationTimeline.types.ts` (declare `EAnimationTrigger`,
  `EAnimationProperty`)
- Modify: `src/modules/cms/node/applyAnimationTimeline.ts`, `src/modules/cms/node/effectRegistry.ts`,
  `src/modules/cms/admin/nodeBuilder/EffectCard.tsx`,
  `src/modules/cms/admin/nodeBuilder/NodeAnimationTab.tsx` (consume `EAnimationTrigger`/
  `EAnimationProperty`)
- Modify: `src/modules/cms/node/primitives/FrameNode.tsx` (promote its already-exported
  `FrameBehaviorConfig.type` union to `as const` — it's already correctly shared, just not yet
  const-ified)
- Modify: `src/modules/cms/admin/nodeBuilder/NodeContainerLayoutTab.tsx`,
  `src/modules/cms/node/resolveRenderableChildren.ts`, `src/modules/cms/node/NodeRenderer.tsx`
  (consume `EFrameBehaviorType`)
- Modify: `src/modules/cms/node/primitives/CustomCodeNode.tsx` (export a named
  `ECodeIsolationMode` as-const instead of the current inline, unexported union)
- Modify: `src/modules/cms/node/nodeRegistry.ts` (import `ECodeIsolationMode` instead of its own
  raw-literal option list)
- Test: `test/modules/cms/node/**`, `test/modules/cms/admin/nodeBuilder/**`

**Interfaces:**
- Produces:
  ```ts
  // animationTimeline.types.ts
  export const EAnimationTrigger = { ON_LOAD: 'onLoad', ON_SCROLL: 'onScroll' } as const;
  export type EAnimationTrigger = (typeof EAnimationTrigger)[keyof typeof EAnimationTrigger];

  export const EAnimationProperty = { OPACITY: 'opacity', X: 'x', Y: 'y', SCALE: 'scale', ROTATION: 'rotation' } as const;
  export type EAnimationProperty = (typeof EAnimationProperty)[keyof typeof EAnimationProperty];

  // FrameNode.tsx
  export const EFrameBehaviorType = { ACCORDION_ITEM: 'accordion-item', SPOTLIGHT_LIST: 'spotlight-list', CAROUSEL: 'carousel' } as const;
  export type EFrameBehaviorType = (typeof EFrameBehaviorType)[keyof typeof EFrameBehaviorType];

  // CustomCodeNode.tsx
  export const ECodeIsolationMode = { DIRECT: 'direct', SHADOW: 'shadow', SANDBOXED: 'sandboxed' } as const;
  export type ECodeIsolationMode = (typeof ECodeIsolationMode)[keyof typeof ECodeIsolationMode];
  ```

- [ ] **Step 1**: `EAnimationTrigger`/`EAnimationProperty` — declare in
  `animationTimeline.types.ts`, update `applyAnimationTimeline.ts` (lines ~132,137-140,155,185),
  `effectRegistry.ts` (every preset's `defaults`/`preview`, lines ~28,39,48,57,66,75,84,96),
  `EffectCard.tsx:44`, `NodeAnimationTab.tsx` (lines ~68,191,193-194,198).

- [ ] **Step 2**: `EFrameBehaviorType` — `FrameNode.tsx`'s `FrameBehaviorConfig.type` (lines
  ~34-36) is already a named, exported, correctly-shared type — just wrap it in the `as const`
  pattern without changing its name's usage anywhere that already imports `FrameBehaviorConfig`
  (the interface containing `type` stays; only the inline union becomes a reference to the new
  `EFrameBehaviorType`). Update literal comparisons at `FrameNode.tsx:120-121,140`,
  `NodeContainerLayoutTab.tsx:184-233`, `resolveRenderableChildren.ts:40`,
  `NodeRenderer.tsx:231`.

- [ ] **Step 3**: `ECodeIsolationMode` — currently an inline, unexported union on
  `CustomCodeNode.tsx:39`. Export it as the `as const` pattern shown above. Update
  `CustomCodeNode.tsx`'s own usages (lines ~152,160,163,166) and replace `nodeRegistry.ts`'s
  independent raw-literal option list (lines ~147,149-151) with an import of
  `ECodeIsolationMode` from `CustomCodeNode.tsx`.

- [ ] **Step 4: Run tests + typecheck**

  Run: `npx astro check` then `npm test` — expected 107/107 suites, 1109/1109 tests.

- [ ] **Step 5: Commit**

  ```bash
  git add -A
  git commit -m "refactor(fe): as-const Animation trigger/property, Frame behavior, CustomCode isolation mode"
  ```

---

## Task 14 (FE): Remaining CMS field/style unions + `TypographyRole`

**Files:**
- Modify: `src/modules/cms/node/primitives/ContentDetailNode.tsx`,
  `src/modules/cms/admin/FieldDefinitionArrayInput.tsx` (declare + consume
  `EFieldDisplayVariant`)
- Modify: `src/modules/cms/node/node.fieldSchema.types.ts` (promote `FieldControl` to
  `as const` as `EFieldControl`), `src/modules/cms/admin/nodeBuilder/FieldRenderer.tsx`,
  `src/modules/cms/node/nodeRegistry.ts` (consume it)
- Modify: `src/modules/cms/node/node.types.ts` (declare `EVisibilityConditionType`,
  `EVisibilityLogic` for `VisibilityCondition.type`/`VisibilityRules.logic`; declare
  `EBackgroundFillType` for the inline `StyleObject.background.type` union)
- Modify: `src/modules/cms/node/evaluateVisibilityRules.ts`,
  `src/modules/cms/admin/nodeBuilder/NodeVisibilityTab.tsx` (consume
  `EVisibilityConditionType`/`EVisibilityLogic` — note: this file was ALSO touched by Task 9 for
  the operator-field unification; if Task 9 already ran, re-read the current file state before
  editing rather than assuming the Task-9-era content)
- Modify: `src/modules/cms/admin/nodeBuilder/NodeStyleTab.tsx`,
  `src/modules/cms/node/applyNodeStyle.ts`, `src/modules/cms/node/primitives/FrameNode.tsx`,
  `src/modules/cms/node/applyNodeBackgroundAnimation.ts` (consume `EBackgroundFillType`)
- Modify: `src/modules/theme/theme.types.ts` (declare `TYPOGRAPHY_ROLES` as-const array +
  derived `TypographyRole` union — plural bare-array-constant naming, matching
  `SECTION_CATEGORIES`'s existing convention rather than the `E`-prefixed object convention,
  since this is a plain string array not an object map — replacing the current bare union)
- Modify: `src/modules/cms/node/node.types.ts` (re-export, unchanged mechanism),
  `src/modules/cms/node/applyNodeStyle.ts`, `src/modules/cms/node/resolveTypographyRoleCss.ts`,
  `src/modules/cms/node/primitives/TextNode.tsx`,
  `src/modules/cms/admin/nodeBuilder/NodeStyleTab.tsx` (consume `TYPOGRAPHY_ROLES`)
- Test: `test/modules/cms/**`, `test/modules/theme/**`

**Interfaces:**
- Produces:
  ```ts
  // node.types.ts or wherever ContentDetailNode's config type lives
  export const EFieldDisplayVariant = { LIST: 'list', CARDS: 'cards', ACCORDION: 'accordion' } as const;
  export type EFieldDisplayVariant = (typeof EFieldDisplayVariant)[keyof typeof EFieldDisplayVariant];

  // node.fieldSchema.types.ts
  export const EFieldControl = { TEXT: 'text', TEXTAREA: 'textarea', RICHTEXT: 'richtext', CODE: 'code', IMAGE: 'image', COLOR: 'color', SELECT: 'select', NUMBER: 'number', BOOLEAN: 'boolean', REPEATER: 'repeater' } as const;
  export type EFieldControl = (typeof EFieldControl)[keyof typeof EFieldControl];

  // node.types.ts
  export const EVisibilityConditionType = { DEVICE: 'device', AUTH_STATE: 'authState', DATE_RANGE: 'dateRange', FIELD_VALUE: 'fieldValue', QUERY_PARAM: 'queryParam' } as const;
  export type EVisibilityConditionType = (typeof EVisibilityConditionType)[keyof typeof EVisibilityConditionType];
  export const EVisibilityLogic = { AND: 'AND', OR: 'OR' } as const;
  export type EVisibilityLogic = (typeof EVisibilityLogic)[keyof typeof EVisibilityLogic];

  export const EBackgroundFillType = { COLOR: 'color', GRADIENT: 'gradient', IMAGE: 'image', VIDEO: 'video' } as const;
  export type EBackgroundFillType = (typeof EBackgroundFillType)[keyof typeof EBackgroundFillType];

  // theme.types.ts
  export const TYPOGRAPHY_ROLES = ['display','h1','h2','h3','h4','bodyLg','body','small','caption'] as const;
  export type TypographyRole = (typeof TYPOGRAPHY_ROLES)[number];
  ```
  **Do not** merge `EBackgroundFillType` with `StyleObject.typography.color.type`
  (`'solid'|'image'|'gradient'|'video'`, `node.types.ts:59`) — the inventory confirmed these are
  genuinely different fields (different first member: `color` vs `solid`), not a spelling bug.
  Leave `typography.color.type` untouched in this task.

- [ ] **Step 1**: `EFieldDisplayVariant` — declare next to wherever `ContentDetailNode.tsx`'s own
  field-display config type lives (read the file first to find the right home — likely inline in
  `ContentDetailNode.tsx` itself, exported). Update its 3 comparisons (lines ~116,123,130) and
  `FieldDefinitionArrayInput.tsx`'s type-assertion (line ~196).

- [ ] **Step 2**: `EFieldControl` — promote in `node.fieldSchema.types.ts` (lines ~10-20).
  Update `FieldRenderer.tsx`'s 10-way switch (lines ~37-83) and `nodeRegistry.ts`'s 25 literal
  occurrences across its field-schema declarations (one per node type — go through every node
  type's Content-tab field list, not just the first few you find).

- [ ] **Step 3**: `EVisibilityConditionType`/`EVisibilityLogic` — declare in `node.types.ts`
  (lines ~344-353). Update `evaluateVisibilityRules.ts` (lines ~7-34,42-44) and
  `NodeVisibilityTab.tsx` (lines ~37,83-88,100,107,134,149,174,210) — re-read this file's
  current state first since Task 9 may have already modified it for the `operator` field; only
  touch the `type`/`logic` fields here, don't re-do Task 9's `operator` work.

- [ ] **Step 4**: `EBackgroundFillType` — declare in `node.types.ts` near
  `StyleObject.background` (line ~72). Update `NodeStyleTab.tsx` (lines ~205-206,216,225),
  `applyNodeStyle.ts`'s color-resolution branch, `FrameNode.tsx` (lines ~106,116),
  `applyNodeBackgroundAnimation.ts:41`.

- [ ] **Step 5**: `TypographyRole` — in `theme.types.ts`, replace the bare union (line ~35) with
  the `as const` array + derived type shown above. Update `node.types.ts`'s re-export (lines
  ~16-17, mechanism unchanged, just re-exporting the new symbols), `applyNodeStyle.ts`,
  `resolveTypographyRoleCss.ts`, `TextNode.tsx`'s `tagForRole` switch (lines ~59-71),
  `NodeStyleTab.tsx`, and `resolveThemeCssVars.ts`'s `scale: Record<TypographyRole,...>` (should
  now derive its own key list from `TYPOGRAPHY_ROLES` too, if it currently hand-lists them).

- [ ] **Step 6: Run tests + typecheck**

  Run: `npx astro check` then `npm test` — expected 107/107 suites, 1109/1109 tests.

- [ ] **Step 7: Commit**

  ```bash
  git add -A
  git commit -m "refactor(fe): as-const FieldDisplayVariant/FieldControl/VisibilityCondition/BackgroundFillType/TypographyRole"
  ```

---

## Execution order

BE tasks 1-5 and FE tasks 6-14 touch disjoint repos — safe to run each repo's sequence
independently (e.g. two parallel `subagent-driven-development` passes, one per repo), but
**within FE, run Task 9 before Task 14** (Task 14 explicitly reads Task 9's result in
`NodeVisibilityTab.tsx`). BE has no such ordering constraint between its 5 tasks.

Each task gets its own implementer → task-reviewer cycle. Given every task here is a
type/string-literal substitution (not new logic), reviewers should weight "did every call site
in the Files list actually get updated, with no site missed and no stray behavior change" as the
primary spec-compliance question — a missed call site (old literal left in place while its
sibling enum now exists) is a Critical finding (silent type-narrowing gap), not Minor.

After all tasks in a repo are done, run that repo's full test suite + typecheck one final time,
then a whole-branch review before merging to master (same pattern as Group 0 and H1).
