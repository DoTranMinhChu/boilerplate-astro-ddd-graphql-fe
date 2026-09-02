# Cross-Repo Audit: API Contract Sharing/Reuse (BE ↔ FE)

Repos: `ddd-graphql-be` (Express + custom code-first Apollo/GraphQL server) and `ddd-graphql-fe` (Astro/SolidJS + urql + typed-graphql-builder).

## Summary

- **BE schema is code-first via a bespoke decorator system** (`src/core/shared/decorators/graphQL.decorators.ts`), not NestJS's `@nestjs/graphql`/type-graphql and not schema-first `.graphql` SDL files — a custom `graphQLSchemaLoader` (`src/core/infrastructure/http/graphQLSchema.loader.ts`) builds the `GraphQLSchema` from `Reflect.getMetadata` at boot. No `.graphql` files exist on BE at all.
- **FE codegen is real and consistently used**: `src/shared/generated/{schema.graphql,typed-graphql.ts}` is genuine `typed-graphql-builder` CLI output (`scripts/generate-graph.mjs`, introspection-driven). A repo-wide grep found **zero** hand-written `gql\`` tags outside the generated folder — all query/mutation building goes through the generated `query()/mutation()/fragment()` builder API. This is a strength.
- **Staleness risk is real, not hypothetical, and undocumented in CI**: regenerating `src/shared/generated/*` (`npm run gengraph`) is a fully manual, local-only step against whatever `BACKEND_URL` happens to be running — there is no CI step that regenerates or diffs the checked-in schema against a live/introspected BE schema. `.github/workflows/ci.yml` only runs `npm run build` and `npm test`; it never runs `gengraph` or `codegen`.
- **The `npm run codegen` script is effectively dead**: `package.json` wires it to `graphql-codegen`, and `@graphql-codegen/cli` + `@graphql-codegen/typescript` are installed, but **no `codegen.yml`/`codegen.ts`/`.graphqlrc` config file exists anywhere in the repo**. Running `npm run codegen` today has nothing to read and does not correspond to how `src/shared/generated/*` is actually produced (that's `typed-graphql-builder` via `scripts/generate-graph.mjs`, a separate, undocumented-in-config pipeline).
- **The FE README's own "Codegen pipeline" section is stale relative to the actual repo**: it describes `schema.graphql`/`typed-graphql.ts` as a "MINIMAL SEED... not a copy of any real backend," scoped only to a small kept-module list (Agency/Tenant/Admin/Merchant/Customer + generic modules). The actual checked-in `schema.graphql` (2017 lines) already includes the full CMS surface (`Page`, `Node`, `ContentEntry`, `Theme`, `Taxonomy`, `ComponentDefinition`, `ArtDirectionKit`, `HeaderPreset`, `FooterPreset`, etc.) that the README says was stripped out. Anyone trusting the README's characterization would misjudge how much of the contract is actually live-generated vs. hand-seeded.
- **Error-code contract is hand-mirrored, not shared, and has already drifted**: FE's `src/shared/errors/errorCode.enum.ts` explicitly documents itself as a by-hand mirror of BE's `src/core/shared/enums/errorCode.enum.ts`. A direct diff shows BE currently has **13 error codes FE does not** (`PERMISSION_CONTEXT_MISMATCH`, `PERMISSION_SELECT_ORG_REQUIRED`, `PERMISSION_TOKEN_WRONG_CONTEXT`, `PERMISSION_ACTION_DENIED`, `PERMISSION_GRANT_NOT_OWNED`, `PERMISSION_GRANT_SCOPE_EXCEEDED`, `PERMISSION_REQUIRED_SPECIFIC`, `PERMISSION_RECORD_ACCESS_DENIED`, `RESOURCE_NOT_FOUND_WITH_ID`, `RESOURCE_NOT_FOUND_NAMED`, `TENANT_CROSS_REFERENCE_DENIED`, `COMPONENT_IN_USE`, `COMPONENT_CYCLE`). Impact is graceful degradation (unknown codes fall back to a generic danger toast in `errorActions.ts`), not a crash, but session/scope-mismatch codes silently lose their intended "treat as out-of-scope" UX.
- **Validation rules are independently hand-duplicated on both sides for non-generated fields**: the clearest example is minimum password length — BE hardcodes `newPassword.length < 6` inline in at least 6 places across `admin.service.ts`, `agencyAccount.service.ts`, `customer.service.ts`, `merchant.service.ts`; FE separately defines **two different** `MINIMUM_PASSWORD_LENGTH = 8` constants in two files (`core/helpers/string.ts` and `shared/components/fields/PasswordField.tsx`), and a third call site (`resetPasswordAdmin.page.tsx`) bypasses both constants with its own inline `< 6` check. Three independent sources of truth, two different numbers (6 vs 8), none derived from the other.
- **BE has no declarative DTO validation layer at all** (`class-validator` is not used anywhere in `src/modules`); validation is ad hoc `if (...) throw new BadRequestException(...)` inside application services. This forecloses the most common cross-repo-reuse pattern (annotate BE DTOs once, derive FE form rules or a shared JSON schema from them) — there is nothing on BE to derive from even in principle, for hardcoded rules. The one exception is `contentType`'s `FieldDefinitionDTO.maxLength/minLength`, which **is** data-driven (stored per-field in the DB, read by both BE validation and presumably FE dynamic forms) — a good-practice counter-example worth preserving as the model to extend.
- **Free-form JSON ("Mixed" scalar) fields are a structural hole in the generated contract**: BE models `Page.style`, `Page.dataBinding`, `Page.seoFieldMapping`, `ContentEntry.data`, etc. as an opaque `Mixed` GraphQL scalar (`src/core/shared/graphql/scalars.ts:3`). Codegen necessarily types these as `any`/`string`, so FE hand-writes matching interfaces (`PageStyle`, `PageDataBinding`, `MixedFeedSource`, `DetailPathBindingDTO`, etc. in `src/modules/cms/cms.types.ts`) with no compiler-enforced link to the BE-side shape — a BE change to what it puts in that JSON blob would not produce a type error on FE. This is architecturally sound to isolate the scalar override to one point per service (well done in `page.service.ts`), but the underlying shape contract itself is comment-only, not typed.

## Findings

### 1. BE schema definition mechanism

**File:line**: `ddd-graphql-be/src/core/shared/decorators/graphQL.decorators.ts:1-296`, `ddd-graphql-be/src/core/infrastructure/http/graphQLSchema.loader.ts:1-38`, `ddd-graphql-be/src/server.ts:257-258`

**Category**: organization

**Severity**: Minor

**Problem**: BE does not use NestJS's GraphQL integration (`@nestjs/graphql`) or `type-graphql`, despite the task description assuming a "NestJS GraphQL server." It's plain Express + Apollo Server (`@apollo/server`), with a **hand-rolled** decorator/reflect-metadata system (`@ObjectType`, `@InputType`, `@Field`, `@Resolver`, `@Query`, `@Mutation`, etc., all custom-defined) and a custom `graphQLSchemaLoader.loadResolvers()` that walks `glob`-discovered resolver files and assembles a `GraphQLSchema` object at boot (`server.ts:258`).

**Impact**: This is a legitimate code-first approach and DOES support the "single source of truth for the schema" goal (decorated classes = the schema), but it means: (a) the schema can only be introspected once the server boots against real resolvers — there's no SDL artifact to diff/lint outside a running process; (b) any engineer expecting standard `type-graphql`/`@nestjs/graphql` behavior (e.g. built-in class-validator integration, `buildSchemaSync`, standard error formatting) will be surprised — this framework reimplements those pieces from scratch (see Finding 5 on validation).

**Suggested direction**: Not a defect per se, but worth documenting explicitly (e.g. in BE README/CLAUDE.md) that this is a custom framework, not NestJS's official GraphQL module, since the task briefing itself assumed the latter — mismatched expectations here likely recur for new contributors too.

---

### 2. FE `npm run codegen` (`@graphql-codegen/cli`) has no config file — dead/broken script

**File:line**: `ddd-graphql-fe/package.json:10` (`"codegen": "graphql-codegen"`), `ddd-graphql-fe/package.json:74-75` (`@graphql-codegen/cli`, `@graphql-codegen/typescript` devDependencies)

**Category**: organization

**Severity**: Important

**Problem**: `graphql-codegen` requires a config file (`codegen.yml`/`codegen.ts`/`.graphqlrc*`, or a `codegen` key in `package.json`). None exists anywhere in the FE repo (verified via exhaustive filename search across the whole tree, excluding `node_modules`). Running `npm run codegen` today would fail outright (no config discovered) or silently no-op depending on CLI version behavior — either way it does not produce `src/shared/generated/*`, which is instead produced by an entirely separate, undocumented-in-`graphql-codegen`-terms pipeline (`scripts/generate-graph.mjs` using the `typed-graphql-builder` CLI, invoked via `npm run gengraph`).

**Impact**: Two competing, similarly-named codegen mechanisms exist in the same `package.json` (`codegen` vs `gengraph`), one of which (`codegen`) is non-functional. A new contributor following the "standard" `npm run codegen` convention gets nothing and no clear error pointing at `gengraph` instead. Dead tooling/dependencies also add unnecessary `npm install` weight and confusion about which is authoritative.

**Suggested direction**: Either remove the unused `@graphql-codegen/*` devDependencies and the `codegen` script, or actually wire up a `codegen.yml` (which could subsume `gengraph`'s introspection step and standardize on one pipeline) — but not leave both installed with only one working.

---

### 3. `src/shared/generated/*` regeneration is manual-only; never runs in CI

**File:line**: `ddd-graphql-fe/.github/workflows/ci.yml:1-30` (no `gengraph`/schema-diff step), `ddd-graphql-fe/scripts/generate-graph.mjs:1-60` (reads `process.env.BACKEND_URL`, requires a running BE), `ddd-graphql-fe/README.md:59-110` ("Codegen pipeline" section)

**Category**: duplication-reuse / organization

**Severity**: Important

**Problem**: The only way `src/shared/generated/schema.graphql` + `typed-graphql.ts` get refreshed is a developer manually running `npm run gengraph` against a **locally running** `ddd-graphql-be` instance pointed to by `.env`'s `BACKEND_URL`. CI (`.github/workflows/ci.yml`) never runs this — it only does `npm run build` and `npm test` against whatever is already checked in. There is no CI job that spins up BE, introspects it, and fails the build if the checked-in generated files differ from the live schema.

**Impact**: BE can add/rename/remove a field or mutation and FE's generated client will not reflect it until someone remembers to manually regenerate — and nothing in CI would catch a stale/wrong generated file (it would just compile against whatever's checked in, correct or not). Since FE's own code is entirely built on top of the generated builder (Finding "gql tags" below confirms no bypass), the failure mode when this drifts is either a compile-time break (caught, annoying but safe) or, if a BE field is silently removed/renamed without FE's generated types changing, a **runtime** GraphQL validation error against the live server that unit tests/CI won't catch since they don't talk to a real BE.

**Suggested direction**: Add a CI job (or a separate scheduled job) that boots BE, runs `npm run gengraph`, and fails if `git diff` on `src/shared/generated/*` is non-empty — turning silent drift into a visible, actionable CI failure instead of a manual-discipline requirement.

---

### 4. FE README's "Codegen pipeline" section is stale relative to the actual repo state

**File:line**: `ddd-graphql-fe/README.md:81-110` ("Known state of `src/shared/generated/` — MINIMAL SEED, not a real backend")

**Category**: organization

**Severity**: Minor

**Problem**: The README describes the checked-in `schema.graphql`/`typed-graphql.ts` as a hand-written minimal seed scoped to a small module list (Agency/Tenant/Admin/Merchant/Customer/Brand + a handful of generic modules), explicitly warning "do not treat `schema.graphql` as documentation of a real backend." In the actual repo today, `schema.graphql` (2017 lines, 1410 query/mutation/field lines) already contains the full CMS surface: `Page`, `Node`, `ContentEntry`, `ContentEntryUsageLocation`, `Theme`, `Taxonomy`, `ComponentDefinition`, `ArtDirectionKit`, `HeaderPreset`, `FooterPreset`, `PageVersion`, `PageTranslation`, etc. — and FE has a correspondingly large `src/shared/services/{node,page,contentEntry,contentType,taxonomy,theme,component,artDirectionKit,footerPreset,headerPreset,...}` tree and a whole `src/modules/cms/` area, none of which the README's "What was kept vs. removed" section acknowledges.

**Impact**: Low direct risk (the generated files themselves are current/real, per the mtime and field coverage checked), but the README actively misleads: a reader would believe the schema is a fake stand-in when it's actually a real, apparently-regenerated artifact, and would believe large parts of the codebase (all of `cms/`) don't exist.

**Suggested direction**: Update the README's "Codegen pipeline" / "What was kept vs. removed" sections to reflect the CMS module set that is actually present, or remove the stale narrative entirely if it no longer describes this checkout.

---

### 5. Hand-written GraphQL query strings outside the generated client: none found (positive finding)

**File:line**: n/a — repo-wide grep for `` gql` `` across `ddd-graphql-fe/src/**/*.{ts,tsx}` excluding `src/shared/generated/**`

**Category**: duplication-reuse

**Severity**: n/a (strength, not a defect)

**Problem/observation**: Zero hits. Every FE data-fetching call site goes through the generated `typed-graphql-builder` API (`query()`, `mutation()`, `fragment()`, imported from `@shared/generated/typed-graphql`), as seen consistently in `src/shared/services/page/page.service.ts:1-97` and (per naming convention) the ~30 other `src/shared/services/<module>/*.service.ts` files.

**Impact**: This is exactly the pattern that avoids hand-typed/hand-written query duplication — worth calling out so it isn't lost in a refactor. The one caveat is Finding 8 below (Mixed-scalar JSON shapes still need hand-typed interfaces, but that's a schema-level gap, not a discipline gap).

**Suggested direction**: Preserve this discipline; consider a lint rule (e.g. forbidding `graphql-tag`/`gql` imports outside `src/shared/generated/`) to keep it enforced as the team grows, since right now it's convention-only.

---

### 6. Error-code enum is a hand-maintained mirror and has already drifted (13 codes out of sync)

**File:line**: `ddd-graphql-fe/src/shared/errors/errorCode.enum.ts:1-69` vs `ddd-graphql-be/src/core/shared/enums/errorCode.enum.ts:1-100`; consumed by `ddd-graphql-fe/src/shared/errors/errorActions.ts:1-49`

**Category**: duplication-reuse

**Severity**: Important

**Problem**: FE's `errorCode.enum.ts` header comment states plainly: *"No shared package exists between the two repos, so this is kept in sync BY HAND — if you add a code on the backend, add the same value here."* Diffing the two files today shows FE is missing 13 codes BE already has: `PERMISSION_CONTEXT_MISMATCH`, `PERMISSION_SELECT_ORG_REQUIRED`, `PERMISSION_TOKEN_WRONG_CONTEXT`, `PERMISSION_ACTION_DENIED`, `PERMISSION_GRANT_NOT_OWNED`, `PERMISSION_GRANT_SCOPE_EXCEEDED`, `PERMISSION_REQUIRED_SPECIFIC`, `PERMISSION_RECORD_ACCESS_DENIED`, `RESOURCE_NOT_FOUND_WITH_ID`, `RESOURCE_NOT_FOUND_NAMED`, `TENANT_CROSS_REFERENCE_DENIED`, `COMPONENT_IN_USE`, `COMPONENT_CYCLE`.

**Impact**: `getErrorAction()` (`errorActions.ts:45-48`) does `ERROR_ACTIONS[code as EErrorCode] ?? DEFAULT_ACTION`, so an unrecognized code degrades to a generic `danger` toast rather than crashing — the blast radius is UX quality, not correctness. But several of the missing codes are exactly the kind BE's own comments (`errorCode.enum.ts:44-55`) flag as needing distinct handling — e.g. `PERMISSION_CONTEXT_MISMATCH`/`PERMISSION_TOKEN_WRONG_CONTEXT`/`PERMISSION_SELECT_ORG_REQUIRED` look like they should map to the same `outOfScope`/session-style treatment `errorActions.ts` already gives `PERMISSION_DENIED`/`AGENCY_ACCESS_DENIED`, but currently silently fall through to a plain error toast instead.

**Suggested direction**: Since BE's error codes are a plain TS enum with no GraphQL-schema representation, they aren't reachable by the existing GraphQL codegen pipeline at all — the practical fix is a small dedicated sync step (e.g. a script that copies/diffs `core/shared/enums/errorCode.enum.ts` between repos, or publishes it as a tiny shared JSON/TS file consumed by both, checked in CI) rather than relying on "remember to copy it by hand," which has already failed once.

---

### 7. Password minimum length duplicated independently on both sides, with inconsistent values

**File:line**:
- BE: `ddd-graphql-be/src/modules/admin/application/services/admin.service.ts:151,202,219`; `ddd-graphql-be/src/modules/agencyAccount/application/services/agencyAccount.service.ts:108`; `ddd-graphql-be/src/modules/customer/application/services/customer.service.ts:41,130`; `ddd-graphql-be/src/modules/merchant/application/services/merchant.service.ts:207,265,285` — all inline `if (newPassword.length < 6)` / `if (password.length < 6)`.
- FE: `ddd-graphql-fe/src/core/helpers/string.ts:3` (`MINIMUM_PASSWORD_LENGTH = 8`); `ddd-graphql-fe/src/shared/components/fields/PasswordField.tsx:9` (a **second**, independently-defined `MINIMUM_PASSWORD_LENGTH = 8`); `ddd-graphql-fe/src/modules/admin/pages/resetPasswordAdmin.page.tsx:21` (inline `values.newPassword.length < 6`, bypassing both constants).

**Category**: duplication-reuse

**Severity**: Important

**Problem**: The "minimum password length" business rule exists in at least **five** independently-maintained places across the two repos, and they don't even agree with each other: BE enforces **6** everywhere (hardcoded per call site, not a shared constant even within BE itself); FE has two separately-declared `MINIMUM_PASSWORD_LENGTH = 8` constants (one in a generic string-helpers file, one duplicated inside a specific form-field component — itself a same-repo duplication), used by the general `PasswordField` component; and a third FE call site (`resetPasswordAdmin.page.tsx`) skips both constants and hardcodes `< 6` directly, matching BE's real rule by coincidence rather than derivation.

**Impact**: Nothing crashes today because FE's 8-char client rule is stricter than BE's 6-char rule (fails closed), and the one place FE matches BE (6) does so by copy-paste, not reference. But this is a textbook drift trap: if BE's minimum ever changes, none of FE's three definitions is guaranteed to follow, and if FE's general `PasswordField` (8) and the one-off reset-password page (6) diverge further, users see inconsistent password requirements across different account/reset flows for what should be one rule.

**Suggested direction**: BE has no `class-validator`/DTO-level annotation to derive this from (see Finding 8) — first step would be BE consolidating its own 9 inline `< 6` checks into one named constant/helper (e.g. `MIN_PASSWORD_LENGTH` in a shared BE constants file), which at minimum stops BE-internal drift; then either expose that constant via a system-settings/config GraphQL query FE already fetches at startup, or accept it as a manually-mirrored constant like the error codes (Finding 6) and consolidate FE's two duplicate constants into one, used everywhere including `resetPasswordAdmin.page.tsx`.

---

### 8. BE has no declarative validation layer (`class-validator`) — nothing for FE to derive rules from even in principle, except `contentType` field definitions

**File:line**: `ddd-graphql-be/src/modules/**` (repo-wide: zero `class-validator` imports/usages), positive counter-example at `ddd-graphql-be/src/modules/contentType/application/dto/fieldDefinition.dto.ts:45` (`maxLength?: number` / similarly `minLength`, stored per-field); consumed on BE at `ddd-graphql-be/src/modules/contentEntry/application/services/contentEntry.service.ts:45-49` (`if (f.minLength != null && value.length < f.minLength) ... if (f.maxLength != null && value.length > f.maxLength) throw new BadRequestException(...)`).

**Category**: organization

**Severity**: Minor

**Problem**: BE validates request DTOs with ad hoc `if (...) throw new BadRequestException(...)` checks scattered through application services (confirmed: zero `class-validator` decorator usage anywhere under `src/modules`). This means for most fixed business fields (email format, code format, generic string max lengths, etc.) there is no single machine-readable place BE declares the rule — it's just imperative code — so there is structurally nothing for a codegen step to extract and hand to FE even if one were built. The one clear counter-example is `contentType`'s per-field `maxLength`/`minLength`, which **is** stored as data (in the `ContentType.fields` definition, itself served over GraphQL) and read by BE validation at write time — this is the correct pattern (single source of truth as data, not as code on either side) and, per FE's `contentEntry` module structure, is presumably also read by FE's dynamic entry-editing forms.

**Impact**: For the fixed/static fields (not content-type-driven dynamic fields), there is no path to eliminating rule duplication other than manually mirroring each rule on both sides (as seen with password length in Finding 7) — the absence of any declarative BE validation layer forecloses the most common "generate FE validation from BE DTO decorators" pattern used in decorator-based frameworks.

**Suggested direction**: Not urgent to retrofit `class-validator` everywhere, but worth extending the `contentType.fieldDefinition` pattern (data-driven constraints readable by both sides) to other fixed-shape entities where it matters most (e.g. a small `FIELD_CONSTRAINTS` config object per entity, served via a lightweight config query or a shared constants module) rather than leaving every rule as scattered inline `if` statements.

---

### 9. Free-form JSON ("Mixed" scalar) fields bypass the generated-type contract entirely

**File:line**: `ddd-graphql-be/src/core/shared/graphql/scalars.ts:3` (`GraphQLMixed` scalar definition); BE usage e.g. `Page.style`/`Page.dataBinding`/`Page.seoFieldMapping` (referenced via `ddd-graphql-fe/src/shared/services/page/page.service.ts:17-23,54,59,69`); FE hand-typed shape interfaces at `ddd-graphql-fe/src/modules/cms/cms.types.ts:26-125` (`MixedFeedSource`, `GenericDataSourceFilter`, `PageDataBinding`, `SectionDataSource`, `DetailPathBindingItemDTO`, `DetailPathBindingDTO`, `PageTranslationDTO`, `PageStyle`, etc.)

**Category**: duplication-reuse / organization

**Severity**: Important

**Problem**: Several BE fields carry arbitrary JSON via an opaque `Mixed` GraphQL scalar (BE-side, there is no structural typing of what's inside — it's whatever the application service happens to write). `typed-graphql-builder`'s codegen necessarily emits these as an untyped placeholder (per `page.service.ts:17-19`'s own comment, "codegen sinh ra kiểu `string`"), so FE re-derives the real shape by hand in `cms.types.ts`, with the link back to BE's actual runtime shape maintained only by prose comments (e.g. `page.service.ts:39-44,49-58,60-69` narrate, field-by-field, why each `Mixed` field needs to be selected and cast).

**Impact**: This is architecturally the correct place to put a manual override (one override point per DTO, well-documented, as `page.service.ts` does it) — but the underlying shape contract (what keys `PageStyle`/`dataBinding`/`seoFieldMapping` actually contain) has **zero** compile-time or codegen-time link to BE. If BE's application code changes what it writes into `page.style`, nothing on the FE build will fail — FE will just silently read `undefined`/wrong values at runtime for whatever key changed, the same class of bug this file's own comments say has already happened at least twice (they cite `seoFieldMapping`/`translationGroupId`/`rootNodeId` all previously shipping as permanently-`undefined` on FE due to a missing GraphQL field select, per the in-file comments at lines 42-68).

**Suggested direction**: Where feasible, replace `Mixed` with real GraphQL types (nested `ObjectType`/`InputType`) for JSON blobs with a known, stable shape (e.g. `PageStyle` looks fully enumerable — `PageBackgroundType` is already a closed union) so codegen produces the real structure instead of `any`. For blobs that are genuinely open-ended (arbitrary per-content-type data), consider at minimum a shared JSON-Schema or Zod schema checked into a location both repos could reference (even without a shared npm package, a checked-in `.json`/`.ts` schema file copied by a sync script, similar to the error-code suggestion in Finding 6) so drift is at least detectable.
