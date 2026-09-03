# Group 1: FE `core/` vs `shared/` Restructure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to
> implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `core/` truly generic/business-blind again by resolving all 26 verified
`core/**` → `shared/**`/`modules/**` import violations (the master audit's original "22" had
drifted), collapse the accidental `shared/config`/`shared/configs` typo-split, delete 8
confirmed-dead files, and add a lint guard so this can't silently regress.

**Architecture:** No new layers. `core/` stays framework-agnostic/business-blind; `shared/` stays
this app's cross-module glue and per-domain service layer; `modules/` stays routed feature code.
Where a violation's real fix is "inject the app-specific behavior instead of importing it"
(matching the dependency-injection pattern `core/api/graphql.ts` already uses for
`setTokenResolver`/`setActingTenantResolver`), extend that pattern rather than moving the file —
moving a foundational, widely-imported file (`Select.tsx`: 47 importers; `graphql.ts`: 5
core-internal dependents) would cascade a NEW core→shared edge into everything that imports it,
which is worse than the violation being fixed.

**Tech Stack:** TypeScript, SolidJS, Astro. No new dependencies (ESLint's `no-restricted-imports`
is already available via the project's existing ESLint config).

## Global Constraints

- Full FE test suite must stay green throughout: baseline 107/107 suites, 1114/1114 tests
  (2-4 known pre-existing rotating post-teardown "Uncaught Exception" errors from
  iconify-icon/GSAP/floating-ui/solid-js teardown races are NOT a regression signal — only a
  suite/test COUNT regression or genuine assertion failure counts as broken; rerun once if one
  unrelated file fails).
- `npx astro check` must stay clean (0 errors) after every task.
- Every file move uses `git mv` (preserves rename history), never delete+recreate.
- Never move a file whose siblings/parent still reference it via a NOW-BROKEN relative path —
  update every relative import to the new location, or convert to the `@core/`/`@shared/`/
  `@modules/`/`@/` alias form (prefer the alias form for anything crossing a moved boundary).
- The two files already flagged as having a REAL pre-existing circular import
  (`core/components/table/Datatable.tsx` ↔ `GeneratedDatatable.tsx`) must move together, in the
  SAME commit, with the cycle intact and unchanged in shape — never partially move this cluster.
- Do not "fix" the circular import as a side effect of this plan — that's out of scope; the goal
  here is relocating the tier boundary correctly, not fixing pre-existing cycles.
- After deleting any of the 8 dead files, run a repo-wide grep for the deleted symbol name to
  confirm zero remaining references (belt-and-suspenders beyond `npx astro check`, since a
  dynamic string-based reference wouldn't surface as a type error).
- Source citations (file:line, importer counts) below come from a full read-only audit completed
  2026-09-04 — re-verify each one against the current file before editing; counts may drift.

---

## Task 1: Icon-tier fix — 6 live files (8 minus 2 that get deleted in Task 9)

**Files:**
- Modify: `src/core/components/stats/StatCard.tsx`, `src/core/components/utilities/EnumBadge.tsx`,
  `src/core/components/dialog/MediaLightbox.tsx`, `src/core/components/control/IconRadioGroup.tsx`,
  `src/core/components/control/InspectorSection.tsx`, `src/core/components/control/SpacingControl.tsx`
- Test: run the full suite (see Step 2) — no dedicated new tests needed, this is a pure import-swap

**Interfaces:**
- Consumes: `BaseIcon` from `@core/components/icon/BaseIcon` (already exists, core's own generic
  icon primitive — confirmed every one of these 6 files only ever uses `<Icon name="...">`, never
  the app-specific `IconVariant` boolean shorthand props that only `shared`'s wrapper adds).

- [ ] **Step 1**: in each of the 6 files, replace the import of `Icon` from
  `@shared/components/icons/Icon` with `BaseIcon` from `@core/components/icon/BaseIcon`, and
  rename the JSX usage from `<Icon .../>` to `<BaseIcon .../>` (re-read each file first — confirm
  `BaseIcon`'s prop shape matches what's actually passed; if a prop doesn't exist on `BaseIcon`,
  stop and report rather than guessing, since the brief's own audit found zero `IconVariant`-only
  usages but line numbers may have drifted since).

- [ ] **Step 2: Run tests + typecheck**

  Run: `npx astro check` (expect 0 errors) then `npm test` (expect 107/107 suites, 1114/1114
  tests — this is a leaf-component swap, unlikely to break anything, but verify).

- [ ] **Step 3: Commit**

  ```bash
  git add -A
  git commit -m "refactor(fe): swap 6 core/ components from shared Icon to core's own BaseIcon"
  ```

---

## Task 2: Decouple `core/api/types.ts` + `createData.tsx` from the generated schema's `PageInfo`

**Files:**
- Modify: `src/core/api/types.ts` (add a local `PageInfo` interface)
- Modify: `src/core/api/createData.tsx` (import the now-local `PageInfo`)
- Test: full suite

**Interfaces:**
- Produces (in `core/api/types.ts`):
  ```ts
  /** Relay-spec cursor pagination info — hand-written so core/ doesn't depend on the
   * app-specific generated GraphQL schema. */
  export interface PageInfo {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      startCursor?: string | null;
      endCursor?: string | null;
  }
  ```
  Read the CURRENT `import { PageInfo } from '@/shared/generated/typed-graphql'` usage's actual
  field access patterns first — if the real generated `PageInfo` type has different field
  optionality (e.g. `startCursor` not nullable), match that exactly rather than the Relay-spec
  default shown above; the audit found `PaginationCursor.pageInfo: PageInfo | any` already
  unions with `any`, so this is low-risk either way.

- [ ] **Step 1**: add the local `PageInfo` interface to `core/api/types.ts`, remove the import
  from `@/shared/generated/typed-graphql`.

- [ ] **Step 2**: update `core/api/createData.tsx`'s `PageInfo` import to come from
  `@core/api/types` (or relative `./types`, matching this file's existing import style) instead
  of the generated schema.

- [ ] **Step 3: Run tests + typecheck**

  Run: `npx astro check` (0 errors — this is the step most likely to surface a real shape
  mismatch, since `core/api/types.ts` has 45 importers; fix any that break by matching the field
  optionality to what's actually used) then `npm test`.

- [ ] **Step 4: Commit**

  ```bash
  git add -A
  git commit -m "refactor(fe): give core/api/types.ts its own PageInfo, decoupled from generated schema"
  ```

---

## Task 3: Extend `core/api/graphql.ts`'s existing DI pattern to locale + error-action resolution

**Files:**
- Modify: `src/core/api/graphql.ts` (add `_localeResolver`/`setLocaleResolver`,
  `_errorActionResolver`/`setErrorActionResolver`, following the exact shape of the file's
  existing `_tokenResolver`/`setTokenResolver` and `_actingTenantResolver`/
  `setActingTenantResolver`)
- Modify: `src/shared/contexts/auth/AuthProvider.tsx` (wire the 2 new resolvers at app bootstrap,
  next to wherever `setTokenResolver`/`setActingTenantResolver` are already called)
- Test: full suite, plus manually verify (via existing test coverage or a new small unit test if
  none exists) that a request still carries the correct locale header and that an error still
  resolves to the correct `EErrorCode`-driven action

**Interfaces:**
- Consumes: `getLocale` (`@/shared/i18n/locale`), `getErrorAction` (`@/shared/errors/errorActions`)
  — read both functions' exact signatures first, the new resolver types must match exactly.
- Produces: `GraphQL.setLocaleResolver(fn: () => string)`,
  `GraphQL.setErrorActionResolver(fn: (code: string) => void /* or whatever getErrorAction's
  real return type is */)` — read `getErrorAction`'s actual signature before writing this, don't
  guess the type.

- [ ] **Step 1**: read `core/api/graphql.ts`'s current `_tokenResolver`/`setTokenResolver` and
  `_actingTenantResolver`/`setActingTenantResolver` implementation in full — this is the exact
  pattern to replicate, not to reinvent. Read every current call site of `getLocale()` and
  `getErrorAction()` inside this file to know exactly what each resolver needs to return and
  where it's called from.

- [ ] **Step 2**: add `_localeResolver`/`setLocaleResolver` and `_errorActionResolver`/
  `setErrorActionResolver` static fields/methods to the `GraphQL` class, matching the existing
  pattern's null-safety (what happens if a resolver is called before being set — match whatever
  the existing 2 resolvers do, e.g. a safe default or a thrown error). Replace the direct
  `getLocale()`/`getErrorAction()` calls with calls through the new resolvers.

- [ ] **Step 3**: remove the now-unused `import { getLocale } from '@/shared/i18n/locale'` and
  `import { getErrorAction } from '@/shared/errors/errorActions'` from `graphql.ts`.

- [ ] **Step 4**: in `shared/contexts/auth/AuthProvider.tsx`, find where
  `GraphQL.setTokenResolver`/`GraphQL.setActingTenantResolver` are called (likely in an
  `onMount`/module-init) and add `GraphQL.setLocaleResolver(() => getLocale())` and
  `GraphQL.setErrorActionResolver(getErrorAction)` right beside them, importing `getLocale`/
  `getErrorAction` into `AuthProvider.tsx` (which is already firmly in `shared/`, so this import
  is legitimate there).

- [ ] **Step 5: Run tests + typecheck**

  Run: `npx astro check` (0 errors) then `npm test` (107/107 suites, 1114/1114 tests). This
  touches the GraphQL client every request goes through — if ANY test fails, do not proceed,
  investigate fully (a broken locale/error-action resolver could silently misbehave in
  production without a test catching it, since these resolvers likely have thin test coverage —
  check `test/core/api/graphql.test.ts` for existing coverage and extend it if the locale/
  error-action wiring isn't already exercised there).

- [ ] **Step 6: Commit**

  ```bash
  git add -A
  git commit -m "refactor(fe): extend graphql.ts's resolver-injection pattern to locale + error-action, decoupling core/ from shared/"
  ```

---

## Task 4: Move the Datatable/GeneratedDatatable cluster to `shared/` (HIGH RISK — atomic, do carefully)

**Files:**
- Move (via `git mv`, preserving the pre-existing circular import intact):
  `src/core/components/table/Datatable.tsx` → `src/shared/components/table/Datatable.tsx`
  `src/core/components/table/GeneratedDatatable.tsx` → `src/shared/components/table/GeneratedDatatable.tsx`
  `src/core/components/table/DatatableButtonCreate.tsx` → `src/shared/components/table/DatatableButtonCreate.tsx`
  `src/core/components/table/CellButtonUpdate.tsx` → `src/shared/components/table/CellButtonUpdate.tsx`
  `src/core/components/table/CellButtonDelete.tsx` → `src/shared/components/table/CellButtonDelete.tsx`
- Modify: every file that imports any of these 5 from `@core/components/table/X` — update to
  `@shared/components/table/X` (grep for all 5 names across `src/modules/**` first; the audit
  found 25 direct importers of `GeneratedDatatable.tsx` alone spanning
  `modules/{admin,agency,merchant,tenant,cms,unit}` — there will be more across the other 4 files,
  budget for updating on the order of 30-40 import lines total)
- Modify: the ~17 sibling files remaining in `src/core/components/table/` (`Table.tsx`, `Cell.tsx`,
  `CellButton.tsx`, `DatatableContext.tsx`, `DatatablePagination.tsx`, etc.) if any of the 5 moved
  files reference them via relative path — those relative imports need to become
  `@core/components/table/X` aliases (crossing a tier boundary can no longer use `../`)
- Test: full suite — this is the single highest-blast-radius task in the whole plan; do not skip
  live verification if a dev server is available (see Step 5)

**Interfaces:**
- No interface changes — component names, props, and exports stay identical. Only the import
  path changes, from `@core/components/table/X` to `@shared/components/table/X`.

- [ ] **Step 1**: read `Datatable.tsx` and `GeneratedDatatable.tsx` in full first, to see the
  EXACT shape of their existing circular import (`GeneratedDatatable` imports `Datatable` as
  `BaseDatatable`; `Datatable` imports a type `PagingArgsInput` back from `GeneratedDatatable`).
  Confirm this is still accurate before proceeding — if the cycle has changed shape since the
  audit, stop and report rather than assuming.

- [ ] **Step 2**: `git mv` all 5 files from `src/core/components/table/` to
  `src/shared/components/table/` in one batch. Fix each moved file's own internal imports:
  - Any relative import to another one of the 5 moved files (e.g. `GeneratedDatatable.tsx`'s
    imports of `CellButtonDelete.tsx`/`CellButtonUpdate.tsx`/`DatatableButtonCreate.tsx`, and the
    `Datatable`↔`GeneratedDatatable` cycle itself) can stay relative (`./X`) since they're all in
    the same new directory together — verify the relative paths still resolve correctly (they
    should, since all 5 move together).
  - Any relative import to a file that DIDN'T move (a `core/components/table/` sibling like
    `Table.tsx`, `DatatableContext.tsx`, etc.) must become `@core/components/table/X`.
  - The `agencyActingTenantId`/`useIsAgencyView`/`AgencyTenantCell`/`AgencyTenantFilterField`/
    `AgencyTenantFormField` imports from `shared/` that caused this move in the first place can
    now be relative or `@shared/` alias, your call — check what convention this new
    `shared/components/table/` directory should follow (likely `@shared/` alias, matching other
    `shared/` files' own style; check a few existing `shared/components/*` files for the
    convention).

- [ ] **Step 3**: repo-wide fix every external importer. Run
  `grep -rlE "from ['\"]@core/components/table/(Datatable|GeneratedDatatable|DatatableButtonCreate|CellButtonUpdate|CellButtonDelete)['\"]" src/`
  and update every hit's import path from `@core/components/table/X` to
  `@shared/components/table/X`. Do this for all 5 names, not just `GeneratedDatatable`.

- [ ] **Step 4: Run tests + typecheck**

  Run: `npx astro check` — expect this to surface EVERY remaining broken import as a compile
  error, which is the real safety net for a move this size. Fix every one. Then `npm test`
  (107/107 suites, 1114/1114 tests).

- [ ] **Step 5: Live verification if possible**

  If a dev server can be started (check for port availability first, per this project's own
  worktree-port-collision precedent — override the port), load at least 2-3 real admin pages
  that render through `GeneratedDatatable`/`Datatable.CellButtonUpdate`/`Datatable.CellButtonDelete`
  (e.g. an admin list page, an agency list page) and confirm the table renders and its action
  buttons work. If no dev server is available in this environment, rely on `astro check` + the
  test suite as the safety net and disclose this in your report as a DONE_WITH_CONCERNS item for
  the controller to live-verify separately before merge.

- [ ] **Step 6: Commit**

  ```bash
  git add -A
  git commit -m "refactor(fe): move Datatable/GeneratedDatatable cluster from core/ to shared/ (atomic, preserves existing circular import)"
  ```

---

## Task 5: Extract `Select.tsx`'s agency-tenant-scoping into an injectable resolver

**Files:**
- Modify: `src/core/components/control/Select.tsx` (extract the `agencyActingTenantId`-based
  filter injection into an injectable resolver, same DI pattern as Task 3)
- Modify: `src/shared/contexts/auth/AuthProvider.tsx` (or wherever `agencyActingTenantId` is
  actually sourced from — read `@/shared/contexts/agency/agencyActingTenant` first to find the
  right wiring point) to register the resolver
- Test: full suite, plus specifically re-verify any existing test coverage of Select's
  agency-tenant filter injection (search `test/core/components/control/Select.test.ts` if it
  exists)

**Interfaces:**
- Consumes: `agencyActingTenantId` from `@/shared/contexts/agency/agencyActingTenant` (read this
  file first — is it a plain exported signal/accessor, or does it need a Solid context read? The
  resolver signature must match whichever it is).
- Produces: a new resolver-injection point on `Select.tsx`, naming convention up to you but
  follow the SAME pattern already used by `graphql.ts` (a module-level settable resolver, not a
  new Solid Context — `Select.tsx` is a core/ component and shouldn't gain a new context
  dependency just to solve this).

- [ ] **Step 1**: read `Select.tsx`'s current lines ~198-202 (re-verify current location) in full
  — understand exactly how `agencyActingTenantId` currently gets read and injected into the
  options-query filter.

- [ ] **Step 2**: read `@/shared/contexts/agency/agencyActingTenant.ts` (or wherever it actually
  lives) to see its exact export shape.

- [ ] **Step 3**: add a module-level injectable resolver to `Select.tsx` (e.g.
  `let _agencyActingTenantIdResolver: (() => string | undefined) | undefined;` +
  `export function setAgencyActingTenantIdResolver(fn: typeof _agencyActingTenantIdResolver) {...}`),
  replace the direct import/read with a call through the resolver (safely handling the
  not-yet-registered case — likely just "no filter injected," matching current behavior for a
  non-agency user).

- [ ] **Step 4**: wire the resolver at app bootstrap (in `AuthProvider.tsx` or wherever makes
  sense given Step 2's finding) — import `Select`'s new setter, call it once with a function that
  reads `agencyActingTenantId`.

- [ ] **Step 5: Run tests + typecheck**

  Run: `npx astro check` (0 errors) then `npm test` (107/107 suites, 1114/1114 tests). This
  touches a component with 47 importers — if you have any doubt about correctness, prefer
  DONE_WITH_CONCERNS over guessing.

- [ ] **Step 6: Commit**

  ```bash
  git add -A
  git commit -m "refactor(fe): extract Select.tsx's agency-tenant-scoping into an injectable resolver, decoupling core/ from shared/"
  ```

---

## Task 6: Move the rich-text editor subtree to `shared/components/editor/`

**Files:**
- Move (via `git mv`) the whole `src/core/components/control/editor/` directory to
  `src/shared/components/editor/` — including both the 4 confirmed violators
  (`Toolbar.tsx`, `TableToolbar.tsx`, `TablePropertiesPanel.tsx`, `editor.i18n.ts`) and their
  non-violating siblings (`ImageResizeHandles.tsx`, `TableGridPicker.tsx`, `commands/*`,
  `core/{EditorCore,Selection,HistoryManager}.ts`, `types.ts` — re-list the directory's actual
  current contents first, this list is from the audit and may be incomplete)
- Move: `src/core/components/control/Editor.tsx` → `src/shared/components/editor/Editor.tsx`
  (the parent file itself, since it directly imports the violating children)
- Delete: `src/core/components/control/MediaEditor.tsx` (confirmed 0 importers anywhere — bonus
  dead-code finding from the audit, handle in this task since it's adjacent, or defer to Task 9
  if you prefer to keep dead-file deletions together — your call, note which you did)
- Modify: `src/shared/i18n/dictionaries/{en,vi}.ts` — currently import `editorVi`/`editorEn`
  FROM `core/components/control/editor/editor.i18n.ts` (a reversed dependency: real translated
  UI strings physically living inside `core/`); after the move this import path simplifies to a
  same-tier relative/alias path
- Modify: every external importer of `Editor.tsx` (confirmed: `modules/cms/admin/nodeBuilder/
  FieldRenderer.tsx` and `shared/components/fields/contentEntryFieldRenderer.tsx` — grep for more)
- Test: full suite

**Interfaces:**
- No interface changes — only import paths move from `@core/components/control/{editor/*,Editor}`
  to `@shared/components/editor/{*, Editor}`.

- [ ] **Step 1**: list the CURRENT full contents of `src/core/components/control/editor/` (the
  audit's file list may be incomplete) and confirm which files import `shared/` (the 4 already
  named) vs which are clean siblings that just need to move along for locality.

- [ ] **Step 2**: `git mv src/core/components/control/editor src/shared/components/editor` (moves
  the whole directory in one operation, preserving its internal relative-import structure intact
  since everything inside moves together). Then `git mv src/core/components/control/Editor.tsx
  src/shared/components/editor/Editor.tsx`.

- [ ] **Step 3**: fix `Editor.tsx`'s own imports of `./editor/Toolbar` and `./editor/TableToolbar`
  — these should still resolve as relative paths (`./editor/Toolbar` → now `./Toolbar` since
  `Editor.tsx` and the `editor/` directory's former contents are now siblings under
  `shared/components/editor/`) — re-verify the exact new relative structure once both moves are
  done and fix every relative import inside the moved files accordingly.

- [ ] **Step 4**: fix `shared/i18n/dictionaries/{en,vi}.ts`'s import of `editorVi`/`editorEn` to
  point at the new location.

- [ ] **Step 5**: repo-wide fix every external importer:
  `grep -rlE "from ['\"]@core/components/control/(Editor|editor/)" src/` and update each to
  `@shared/components/editor/...`.

- [ ] **Step 6**: delete `MediaEditor.tsx` (confirmed dead) — see Files note above for where.

- [ ] **Step 7: Run tests + typecheck**

  Run: `npx astro check` (0 errors) then `npm test` (107/107 suites, 1114/1114 tests).

- [ ] **Step 8: Commit**

  ```bash
  git add -A
  git commit -m "refactor(fe): move rich-text editor subtree from core/ to shared/, delete dead MediaEditor.tsx"
  ```

---

## Task 7: Move `ColorControl.tsx` to `modules/cms/` (not `shared/`)

**Files:**
- Move: `src/core/components/control/ColorControl.tsx` →
  `src/modules/cms/admin/builder/ColorControl.tsx` (co-located with `ColorPickerField`, which it
  already imports)
- Modify: its 3 known importers — `modules/cms/admin/manageThemes.page.tsx`,
  `modules/cms/admin/nodeBuilder/ColorTokenOrCustom.tsx`,
  `modules/cms/admin/nodeBuilder/NodeStyleTab.tsx` (grep to confirm no others)
- Test: full suite

**Interfaces:** No interface changes.

- [ ] **Step 1**: `git mv src/core/components/control/ColorControl.tsx
  src/modules/cms/admin/builder/ColorControl.tsx`. Fix its own import of `ColorPickerField` (was
  `@/modules/cms/admin/builder/ColorPickerField`, now a same-directory relative import
  `./ColorPickerField` — your call whether to keep the alias form or go relative, check the
  directory's existing convention).

- [ ] **Step 2**: repo-wide fix: `grep -rl "core/components/control/ColorControl" src/` and
  update each import to `@modules/cms/admin/builder/ColorControl`.

- [ ] **Step 3: Run tests + typecheck**

  Run: `npx astro check` (0 errors) then `npm test`.

- [ ] **Step 4: Commit**

  ```bash
  git add -A
  git commit -m "refactor(fe): move ColorControl.tsx from core/ to modules/cms/ (its only consumer)"
  ```

---

## Task 8: Move the 4 business hooks to `shared/hooks/`

**Files:**
- Move: `src/core/hooks/useAccountByType.ts`, `src/core/hooks/useFeatureFetcher.ts`,
  `src/core/hooks/usePermissionFetcher.ts`, `src/core/hooks/useTenantRolesFetcher.ts` →
  `src/shared/hooks/` (same filenames — confirmed no naming collision with the existing
  `shared/hooks/{useIsAgencyView,useOrgRouteBase}.ts`)
- Modify: their importers — confirmed to be exclusively `src/layouts/{admin,agency,merchant,
  tenant}/*Layout.tsx` (grep to confirm no others exist)
- Test: full suite

**Interfaces:** No interface changes.

- [ ] **Step 1**: `git mv` all 4 files from `src/core/hooks/` to `src/shared/hooks/`.

- [ ] **Step 2**: repo-wide fix: `grep -rlE "from ['\"]@core/hooks/(useAccountByType|useFeatureFetcher|usePermissionFetcher|useTenantRolesFetcher)['\"]" src/`
  and update each to `@shared/hooks/X`.

- [ ] **Step 3: Run tests + typecheck**

  Run: `npx astro check` (0 errors) then `npm test`.

- [ ] **Step 4: Commit**

  ```bash
  git add -A
  git commit -m "refactor(fe): move 4 business-specific hooks from core/hooks/ to shared/hooks/"
  ```

---

## Task 9: Delete confirmed-dead files + collapse `shared/config`/`shared/configs`

**Files:**
- Delete: `src/core/helpers/hash.ts`, `src/core/helpers/secret.ts`,
  `src/core/components/map/InputGPS.tsx`, `src/core/components/map/InputPolygon.tsx`,
  `src/shared/hooks/useOrgRouteBase.ts`
- Delete (careful — read Step 1 first): `src/core/components/icons/Icon.tsx`,
  `src/core/components/icons/iconVariants.ts`, and possibly the dependent chain
  `src/core/components/utilities/Value.tsx` +
  `src/shared/components/dialog/AccountPasswordDialog.tsx` (see Step 1)
- Move: `src/shared/configs/scopeFieldRegistry.ts` → `src/shared/config/scopeFieldRegistry.ts`
  (canonical singular name, matching the file's own header comment)
- Modify: `src/modules/tenant/pages/tenantAccount/staff/permRow.tsx` (update its import of
  `scopeFieldRegistry` to the new path)
- Delete: the now-empty `src/shared/configs/` directory
- Test: full suite

**Interfaces:** No interface changes to anything that survives.

- [ ] **Step 1: Investigate the Icon.tsx dead-chain BEFORE deleting anything in it**

  The audit found `core/components/icons/Icon.tsx` has exactly 1 real importer —
  `core/components/utilities/Value.tsx` (relative import `'../icons/Icon'`) — and `Value.tsx`
  itself has exactly 1 importer, `shared/components/dialog/AccountPasswordDialog.tsx`, which
  itself has 0 importers anywhere. Read all 3 files. Decide between:
  (a) Delete all 3 files together (`Icon.tsx`, `iconVariants.ts` in `core/components/icons/`,
      `Value.tsx`, AND `AccountPasswordDialog.tsx`) if the whole chain is genuinely unused/
      unreachable dead UI.
  (b) Keep `Value.tsx`/`AccountPasswordDialog.tsx` (if they look like intentional, not-yet-wired
      UI rather than abandoned code) and just repoint `Value.tsx`'s import to
      `@shared/components/icons/Icon` instead of the core copy, then delete only
      `core/components/icons/{Icon.tsx,iconVariants.ts}`.
  This is a judgment call the audit explicitly flagged as needing a decision — make it based on
  what you find reading the 2 files (does `AccountPasswordDialog.tsx` look finished/intentional,
  or half-built/abandoned?), and clearly disclose which you chose and why in your report.

  Also note the audit found `core/components/icons/iconVariants.ts` is **NOT** byte-identical to
  `shared/components/icons/iconVariants.ts` as an earlier report claimed — `shared`'s version is
  a superset (29 additional `IconVariant` members). This doesn't change the deletion decision
  (core's copy still has 0 direct importers once the Value.tsx chain is resolved either way) but
  don't repeat the "byte-identical" claim anywhere in your own commit message/report — it's
  inaccurate.

- [ ] **Step 2**: delete `hash.ts`, `secret.ts`, `InputGPS.tsx`, `InputPolygon.tsx`,
  `useOrgRouteBase.ts` — straightforward, 0 importers confirmed, no chain to investigate.

- [ ] **Step 3**: for each deleted file (from Steps 1-2), run a repo-wide grep for the deleted
  export's name (function/component name, not just the file path) to confirm zero remaining
  references beyond what `astro check` would catch — a dynamic string-based reference wouldn't
  surface as a type error.

- [ ] **Step 4**: `git mv src/shared/configs/scopeFieldRegistry.ts
  src/shared/config/scopeFieldRegistry.ts`. Update `permRow.tsx`'s import from
  `@/shared/configs/scopeFieldRegistry` to `@/shared/config/scopeFieldRegistry`. Delete the now-
  empty `src/shared/configs/` directory (confirm it's actually empty first).

- [ ] **Step 5: Run tests + typecheck**

  Run: `npx astro check` (0 errors) then `npm test` (107/107 suites, 1114/1114 tests, OR fewer if
  you chose option (a) in Step 1 and any tests directly exercised the deleted
  `Value.tsx`/`AccountPasswordDialog.tsx` — check first, and if such tests exist, delete them too
  and note the new baseline count in your report).

- [ ] **Step 6: Commit**

  ```bash
  git add -A
  git commit -m "chore(fe): delete confirmed-dead files, collapse shared/config + shared/configs"
  ```

---

## Task 10: Add `no-restricted-imports` ESLint rule + document `shared/services` vs `modules/` coverage

**Files:**
- Modify: the project's ESLint config (find it — likely `.eslintrc.cjs`/`eslint.config.js` at
  repo root; read it first to match its existing rule-declaration style)
- Modify: `docs/PROJECT-CONTEXT.md` (add the `shared/services/<domain>` ↔ `modules/<name>`
  coverage table from the audit, and explicitly document that CMS's ~15 service domains are
  individually named per-entity rather than bundled under one `cms` domain — not obvious from
  directory names alone)

**Interfaces:** N/A — tooling + docs only.

- [ ] **Step 1**: find and read the project's current ESLint config in full.

- [ ] **Step 2**: add a `no-restricted-imports` rule (or the project's existing pattern for
  path-restriction rules, if it already uses something like `eslint-plugin-boundaries` — check
  first rather than assuming `no-restricted-imports` is the right mechanism) scoped to files
  under `src/core/**`, banning import patterns matching `@shared/*`, `@modules/*`,
  `@/shared/*`, `@/modules/*` (cover every alias form this codebase uses). Explicitly exclude
  `**/*.hbs` from the rule's file glob (the Plop scaffold template's generated-output `@shared/`
  references are correct by design, not a real violation).

- [ ] **Step 3**: run the project's lint command (find it in `package.json`) against the whole
  `src/core/` tree and confirm ZERO violations remain (this is the real verification that Tasks
  1-9 actually closed every violation the audit found — if the lint rule fires on anything, that
  means either a task above missed something or the new rule's pattern is too broad/narrow; fix
  whichever is true).

- [ ] **Step 4**: add the `shared/services/<domain>` vs `modules/<name>` coverage table (from the
  audit's §4) to `docs/PROJECT-CONTEXT.md`, in whatever section already documents the FE's
  `shared/services` convention — read that section first to match its existing style rather than
  just appending a raw table.

- [ ] **Step 5: Run tests + typecheck + lint**

  Run: `npx astro check`, `npm test`, and the project's lint command — all clean.

- [ ] **Step 6: Commit**

  ```bash
  git add -A
  git commit -m "chore(fe): add no-restricted-imports guard for core/ business-blindness, document shared/services coverage"
  ```

---

## Execution order

Tasks 1-3 are independent low/no-risk fixes — safe to do in any order, first. Task 4 (Datatable
cluster) is the highest-risk task in the plan — do it in isolation, with its own careful
verification, not bundled with anything else. Task 5 (Select.tsx) is also high-risk given its
47-importer blast radius — do it after Task 4 so any DI-pattern lessons learned there carry over.
Tasks 6-8 are medium/low risk moves, any order, after 4-5. Task 9 (dead-file deletion + config
merge) has no dependency on the others — could run anytime, but doing it last means the lint rule
in Task 10 verifies the FINAL state of `core/`, not an intermediate one. Task 10 must be last —
it's the verification gate confirming Tasks 1-9 actually closed every violation.

Each task gets its own implementer → task-reviewer cycle. Given Tasks 4 and 5 touch the app's
most widely-used UI primitives (Datatable rendered on nearly every admin list page; Select used
in 47 files), their reviews should be held to the same rigor as a security-sensitive change —
verify every updated import path actually resolves, not just that `astro check` is clean (a
missed relative-vs-alias conversion could pass typecheck but fail at runtime in an edge case
`astro check`'s static analysis doesn't fully cover, e.g. a dynamic `import()`). After all 10
tasks, run a final whole-branch review (most capable model available) before merging to master,
per the same pattern used for every prior initiative in this project (H1, H2, H3, Group 0).
