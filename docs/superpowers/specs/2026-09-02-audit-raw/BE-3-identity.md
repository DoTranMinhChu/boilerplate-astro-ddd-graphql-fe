# BE Audit — Identity/Org/Ops modules (admin, agency, agencyAccount, merchant, tenant, tenantAccount, customer, accountPermission, permission, unit, activityLog, emailConfig, globalSequence)

Repo: `D:\OTHER\node-source-base\ddd-graphql-be`

## Summary

- **Password/reset-token orchestration is copy-pasted ~5 times** (Admin, Merchant, Customer, plus AgencyAccount/TenantAccount's "change password on the linked Merchant" variant) instead of living in one shared "account credential" service — same crypto reset-token generation, same `newPassword.length < 6` check duplicated ~10 times verbatim, same find-by-email-or-username fallback logic.
- **Real, security-relevant divergence found between modules doing the "same" thing**: `AdminService.forgotPassword` (admin.service.ts:162-169) and `MerchantService.forgotPassword` (merchant.service.ts:219-227) both `throw NotFoundException` when the login doesn't exist — a public, unauthenticated account-enumeration oracle — while `CustomerService.requestPasswordReset` (customer.service.ts:93-96) deliberately swallows the "not found" case with an explicit comment explaining why. Two of three near-identical flows never got the fix the third one already has.
- **AgencyAccount and TenantAccount both proxy login/change-password through the linked Merchant's password**, but their entities diverged on how they store the credential: `AgencyAccountEntity` still has a real, persisted, unused `password` column (agencyAccount.entity.ts:34-35) that is a stale duplicate of the Merchant's hash; `TenantAccountEntity` has no such column at all — same copy-pasted service pattern, silently forked schemas.
- **accountPermission (the fine-grained RBAC system) is NOT the consistent source of truth** for the other identity/business modules in scope: `EPermission.UNIT_MANAGE`, `STAFF_VIEW/CREATE/UPDATE/DELETE`, and `EMAIL_CONFIG_MANAGE` are all defined and documented in `permission.enum.ts`/`grantableResource` metadata, but `unit.resolver.ts`, `tenantAccount.resolver.ts`, `agencyAccount.resolver.ts`, and `emailConfig.resolver.ts` never apply `@GQLPermission` — they gate purely on coarse `@GQLAuthorized(roles)`. Only `accountPermission.resolver.ts` itself and `activityLog.resolver.ts` actually wire `@GQLPermission` end-to-end. TENANT_STAFF can therefore never be scoped into unit/staff/email-config management no matter what fine-grained permissions are granted to them.
- **Two concrete N+1 patterns inside accountPermission.service.ts**: `assertGrantWithinAuthority` (line 110) issues one DB round-trip per permission entry in a loop instead of reusing the service's own batched `resolvePermissions()` (which does one query via `In()`); `setPermissions` (line 258) deletes existing rows one-by-one via `Promise.all(existing.map(e => deleteById(e.id)))` instead of a single bulk delete by `tenantAccountId`.
- **activityLog (the audit-log module) has no retention/archival policy anywhere**, and its `getTimeline()` method (activityLog.service.ts:102-114) is genuinely unbounded — `findByCondition` with no `take`/limit, so a long-lived, frequently-changed entity's full history is returned in one response. In practice this is currently low-risk because **only one call site in the entire codebase writes to it** (`accountPermission.resolver.ts`'s `setAccountPermissions`) — none of the other 12 modules in scope record anything, despite the module's own doc comment describing itself as logging "every important action on every entity." The paginated list query (`getAllActivityLog`) is fine (capped, indexed).
- **Missing indexes on the actual login-lookup field** for two of the five account-like entities: `AgencyAccountEntity.username` and `TenantAccountEntity.username` have no `@Index()` (login filters by `{username, agencyId}` / `{username, tenantId}`), while `AdminEntity.username` and `MerchantEntity.username` do have one — an inconsistency that will show up as scale grows within a single agency/tenant.
- **DTO input-surface pattern is inconsistent and occasionally risky**: `CreateAdminInput`/`UpdateAdminInput` (admin.dto.ts) and `CreateCustomerInput`/`UpdateCustomerInput` (customer.dto.ts) `extend` the entity directly, so any future `@Field()` added to `AdminEntity`/`CustomerEntity` (e.g. `roles`, `isActivated`) automatically becomes a client-writable mutation input with zero additional review — whereas Agency/AgencyAccount/Merchant/TenantAccount DTOs use explicit whitelisted fields.
- **`globalSequence` ships a `cleanupOldRows()` retention method that is dead code** (never called from anywhere) and is latently dangerous if ever wired up naively: it filters by `createdAt`, but the table is an upsert-per-`entityType` counter (`ON CONFLICT DO UPDATE`), so `createdAt` never changes after first use — deleting "old" rows by that column would silently reset a live, low-traffic sequence counter back to 0 on its next `nextval()`, risking code/id reuse.
- Positives worth noting: the shared `authService` (hash/compare/JWT) and `BaseService`/`ABaseRepository` generic CRUD + cursor pagination (capped by `MAX_PAGINATION_LIMIT`) are genuinely well-centralized and reused by all 13 modules; `activityLogEntity` itself has good composite indexes; `DataLoaderManager` exists for N+1-safe relation batching (opt-in via explicit `@FieldResolver`, not used inside the audited modules' resolvers but not needed there either since list resolvers rely on client-selected `relations` → single JOIN).

## Findings

### 1. Duplicated password/reset-token orchestration across Admin/Merchant/Customer

**Category:** duplication-reuse
**Severity:** Important
**Files:**
- `src/modules/admin/application/services/admin.service.ts:118-210` (`changePassword`, `resetPassword`, `forgotPassword`, `resetPasswordByToken`)
- `src/modules/merchant/application/services/merchant.service.ts:200-291` (same four methods)
- `src/modules/customer/application/services/customer.service.ts:93-136` (`requestPasswordReset`, `resetPasswordByToken`)
- `src/modules/agencyAccount/application/services/agencyAccount.service.ts:98-114` (`changePassword`, delegates to Merchant)
- `src/modules/tenantAccount/application/services/tenantAccount.service.ts:101-117` (`changePassword`, delegates to Merchant)

**Problem:** Each service reimplements, near-verbatim: `crypto.randomBytes(32) → sha256 hash → 30-min expiry` reset-token generation; `authService.hashPassword`/`comparePassword` call sites; and the identical inline guard `if (newPassword.length < 6) throw new BadRequestException(...)` repeated **10 separate times** (admin.service.ts:151, 202, 219(merchant.dto? see below), merchant.service.ts:207, 265, 285, customer.service.ts:41, 130, agencyAccount.service.ts:108, tenantAccount.service.ts:111). There is no shared `ICredentialService`/`PasswordPolicy` abstraction — the minimum-length constant (`6`) is a magic number copy-pasted everywhere, so a future policy change (e.g. raise to 8, add complexity rules) requires editing 10 call sites and is easy to miss one of.

**Impact:** Maintenance risk (policy drift — see Finding 2 for a concrete case where the copies already diverged on a *more* security-critical property than length); more surface area for a future edit to introduce yet another inconsistency.

**Suggested direction:** Extract a shared `AccountCredentialService` (or free functions) in `core/application/auth/` for: `assertPasswordPolicy(password)`, `generateResetToken()` (returns `{token, hashedToken, expires}`), and a generic `resetPasswordByToken(repository, hashedTokenLookup, newPassword)` helper each module's repository can plug into.

---

### 2. Account-enumeration divergence: Admin/Merchant forgot-password leaks account existence, Customer deliberately does not

**Category:** duplication-reuse (security divergence)
**Severity:** Critical
**Files:**
- `src/modules/admin/application/services/admin.service.ts:162-170` — `forgotPassword` throws `NotFoundException('Tên đăng nhập hoặc email không tồn tại...', EErrorCode.AUTH_ACCOUNT_NOT_FOUND)` when no matching admin exists.
- `src/modules/admin/infrastructure/http/graphql/admin.resolver.ts:125-132` — `adminForgotPassword` mutation is `@GQLPublic()` (unauthenticated), so this is reachable by anyone.
- `src/modules/merchant/application/services/merchant.service.ts:219-227` — same throw-on-not-found pattern.
- `src/modules/merchant/infrastructure/http/graphql/merchant.resolver.ts:158-168` — `merchantForgotPassword` is also `@GQLPublic()`.
- Contrast: `src/modules/customer/application/services/customer.service.ts:93-96` — `requestPasswordReset` explicitly `return`s (no throw, no distinguishable response) with an inline comment: *"KHÔNG throw -- tránh lộ 'email này có tồn tại hay không' qua sự khác biệt lỗi/thành công."* Lines 103-110 further wrap the downstream email-send in try/catch specifically so infrastructure errors don't reintroduce the same leak.

**Problem:** The exact same "forgot password" flow was implemented three times. One of the three (Customer, implemented later per its own code comments referencing "Task 9/Task 13 review") had this exact enumeration vulnerability found and fixed. The other two (Admin, Merchant) — including the highest-privilege account type in the whole system (Admin/SUPER_ADMIN) — still throw a distinguishable "account not found" error on a **public, unauthenticated** mutation, letting an attacker enumerate valid admin usernames/emails by observing the response (`AUTH_ACCOUNT_NOT_FOUND` vs success).

**Impact:** Reconnaissance primitive against the admin panel (highest-value target) and merchant accounts — an attacker can build a list of valid admin logins before attempting credential stuffing / targeted phishing, with no auth required to probe.

**Suggested direction:** Port Customer's silent-return + try/catch pattern back into `AdminService.forgotPassword` and `MerchantService.forgotPassword` (or, better, extract the shared helper from Finding 1 so this fix only has to be made once and can't re-diverge).

---

### 3. AgencyAccount stores a stale, unused duplicate password hash; TenantAccount (same pattern) does not — schemas forked from identical service logic

**Category:** duplication-reuse
**Severity:** Important
**Files:**
- `src/modules/agencyAccount/domain/entities/agencyAccount.entity.ts:33-35` — persisted `@Column({ nullable: true }) password!: string;`
- `src/modules/agencyAccount/application/services/agencyAccount.service.ts:26-43` (`create`) copies the Merchant's hashed password onto `data.password` before insert; lines 70-92 (`login`) and 98-114 (`changePassword`) both verify/update against `this.merchantService`/`merchantRepository`'s password, **never** `agencyAccount.password`.
- `src/modules/tenantAccount/domain/entities/tenantAccount.entity.ts` — no `password` column at all.
- `src/modules/tenantAccount/application/services/tenantAccount.service.ts:25-43` still types `data` as `DeepPartial<TenantAccountEntity> & { password?: string }` and assigns `data.password`, even though the entity has nowhere to persist it.

**Problem:** Both services were clearly copy-pasted from one another (identical structure, identical Vietnamese comments "vì AgencyAccount/TenantAccount xác thực qua Merchant password"), but the entities backing them diverged: AgencyAccount persists a second copy of the password hash that is write-only (set once at creation, never read, never kept in sync if the Merchant's password is later changed via `AdminService.resetMerchantPassword` or `MerchantService.changePassword`/`resetPassword`) — a stale secret sitting in the DB for no functional reason. TenantAccount's version of the same code silently no-ops the password assignment.

**Impact:** Unnecessary duplicated secret-at-rest for AgencyAccount (larger attack surface / bigger blast radius on a DB leak, for a value that is never even checked); confusing/misleading schema for anyone reading `AgencyAccountEntity` who assumes `password` is authoritative; the TenantAccount side has a `DeepPartial<T> & {password}` type hack that implies a design intent that was never (or no longer) realized.

**Suggested direction:** Drop `password` from `AgencyAccountEntity` (migration to remove the column) to match TenantAccount, and remove the dead `data.password = ...` assignment from both `create()` methods. If per-account passwords are ever actually wanted (not proxied through Merchant), that should be a deliberate design decision applied identically to both entities, not a residue of copy-paste.

---

### 4. accountPermission/permission is not consistently the source of truth — several modules with defined `EPermission` entries never enforce them

**Category:** organization
**Severity:** Important
**Files:**
- `src/modules/permission/enums/permission.enum.ts:44-63` — defines `STAFF_VIEW/CREATE/UPDATE/DELETE`, `UNIT_MANAGE`, `EMAIL_CONFIG_MANAGE` with full `PERMISSION_META`/`PERMISSION_GROUPS` entries (i.e. these are meant to be assignable, scoped permissions surfaced in the permission-grant UI).
- `src/modules/unit/infrastructure/http/graphql/unit.resolver.ts:58-98` — `createUnit`/`updateUnit`/`deleteUnit`/`seedDefaultUnits` gate only with `@GQLAuthorized([ERole.TENANT_OWNER, ERole.TENANT_MANAGER])`; no `@GQLPermission(EPermission.UNIT_MANAGE)` anywhere in the file.
- `src/modules/tenantAccount/infrastructure/http/graphql/tenantAccount.resolver.ts:70-104` — `createTenantAccount`/`updateTenantAccount`/`deleteTenantAccount` use only `@GQLAuthorized([...roles])`; no `STAFF_*` permission check.
- `src/modules/agencyAccount/infrastructure/http/graphql/agencyAccount.resolver.ts:60-95` — same for Agency staff CRUD.
- `src/modules/emailConfig/infrastructure/http/graphql/emailConfig.resolver.ts:27-71` — no `EMAIL_CONFIG_MANAGE` check (though this one is `SUPER_ADMIN`/`ADMIN`-only anyway, which is arguably an intentional scope-out, unlike the tenant-scoped modules above).
- Contrast — the one resolver in scope that does it correctly: `src/modules/activityLog/infrastructure/http/graphql/activityLog.resolver.ts:32-47` applies both `@GQLAuthorized` and `@GQLPermission({ permission: EPermission.ACTIVITY_LOG_VIEW, ... })`.

**Problem:** `EPermission.UNIT_MANAGE` and the `STAFF_*` group exist, are documented, and are exposed through `getPermissionGroups`/`setAccountPermissions` so a TENANT_OWNER can grant a TENANT_STAFF member "Manage units of measure" or "Create staff account" — but the resolvers those permissions are supposed to gate never call `accountPermissionService`/`@GQLPermission` at all, and are hard-restricted to `TENANT_OWNER`/`TENANT_MANAGER`-and-above roles. A staff member granted `UNIT_MANAGE` or `STAFF_CREATE` via the permission UI still gets a hard `@GQLAuthorized` rejection before the fine-grained check would ever run.

**Impact:** The permission system is not the actual source of truth for these resources — it's decorative for them. This is confusing for anyone building on top of it (the grant UI implies capability that doesn't exist) and is a real functional bug from the product's point of view (staff permissioning silently doesn't work for units/staff-accounts), independent of the security direction (over-restrictive here, not under-restrictive, so not itself an authz vulnerability — but the *inconsistency* is the finding, per the audit's framing).

**Suggested direction:** Either (a) wire `@GQLPermission(EPermission.UNIT_MANAGE)` / `STAFF_*` into these resolvers and relax the `@GQLAuthorized` role list to include `TENANT_STAFF` (letting the fine-grained layer do the real gating, matching the activityLog pattern), or (b) if these are intentionally owner/manager-only forever, remove the unused `EPermission` entries so the permission UI doesn't advertise a capability that does nothing.

---

### 5. N+1 query pattern in `assertGrantWithinAuthority` — doesn't reuse the service's own batched helper

**Category:** performance
**Severity:** Important
**File:** `src/modules/accountPermission/application/services/accountPermission.service.ts:96-129`

**Problem:** `assertGrantWithinAuthority` loops `for (const e of entries)` (line 110) and calls `await this.getOwnRule(granter, e.permission)` (line 111) — one DB round-trip (`permRepo.findOneByCondition`) per permission entry being granted. The same file already has `resolvePermissions(account, permissions[])` (lines 165-198), which fetches all rows for multiple permissions in a single query via `In(permissions)`. `assertGrantWithinAuthority` does not reuse it.

**Impact:** `setAccountPermissions` (called from `accountPermission.resolver.ts:176-221` every time an owner/manager edits a staff member's permission set) issues one query per permission being assigned — with `EPermission` already having ~25 values, a "grant everything" UI action can trigger 20+ sequential DB round-trips in a single mutation, serialized (not even parallelized with `Promise.all`).

**Suggested direction:** Batch-fetch the granter's own rules once via `resolvePermissions(granter, entries.map(e => e.permission))` (or a raw-rule equivalent) before the loop, then do the subset/ownership check in-memory per entry.

---

### 6. N+1 write pattern in `setPermissions` — deletes old rows one at a time

**Category:** performance
**Severity:** Minor
**File:** `src/modules/accountPermission/application/services/accountPermission.service.ts:254-258`

```
const existing = await this.permRepo.findByCondition({ where: { tenantAccountId: tenantAccount.id } });
await Promise.all(existing.map(e => this.permRepo.deleteById(e.id)));
```

**Problem:** Fetches all existing permission rows for the account, then issues one `DELETE ... WHERE id = ?` per row (parallelized, but still N statements/round-trips instead of one).

**Impact:** Minor at today's per-account permission-row cardinality (~dozens at most), but unnecessary DB chatter on every permission save, and doesn't scale cleanly if `EPermission` grows substantially.

**Suggested direction:** Replace with a single bulk delete by `tenantAccountId` (e.g. `this.permRepo`'s underlying `repository.delete({ tenantAccountId: tenantAccount.id })`), or reuse `updateByCondition`-style bulk primitives already present on `ABaseRepository`.

---

### 7. `activityLog.getTimeline()` is unbounded — no pagination/limit

**Category:** performance
**Severity:** Important
**File:** `src/modules/activityLog/application/services/activityLog.service.ts:101-114`

**Problem:** `getTimeline(entityType, entityId, scope)` calls `this.activityLogRepository.findByCondition({ where, order: { createdAt: 'DESC' } })` with no `take`/limit and no cursor pagination — unlike `getAllActivityLog` (the other read path), which goes through `findAllPagination` → `findAllCursorByCondition`, which is properly capped by `MAX_PAGINATION_LIMIT`. `getEntityActivityTimeline` in `activityLog.resolver.ts:50-65` exposes this directly with `returnType: [ActivityLogEntity]` (a plain array, not the paginated type), confirming no pagination contract exists at the GraphQL layer for this query either.

**Impact:** Any entity with a long edit history (e.g. a Tenant or a frequently-permission-edited staff account, once other modules start writing to the log — see Finding 8) returns its *entire* history in one response with no cap — classic unbounded-growth read risk for a module whose entire purpose is to accumulate rows over time.

**Suggested direction:** Route `getTimeline` through the same cursor-paginated path as `getAllActivityLog` (or at minimum add a hard `take` ceiling), and change `getEntityActivityTimeline`'s GraphQL return type to the paginated wrapper so clients can page through long histories instead of receiving one unbounded array.

---

### 8. activityLog has no retention/archival policy, and is currently written from exactly one call site despite being designed as system-wide

**Category:** performance (and organization — reuse gap)
**Severity:** Important
**Files:**
- `src/modules/activityLog/application/services/activityLog.service.ts:1-118` — no TTL, no partition strategy, no archival/cleanup method anywhere in the module (contrast with `globalSequence.repository.ts:46-82`, which at least *has* a `cleanupOldRows` — see Finding 10 for why that one is itself broken).
- `src/modules/activityLog/domain/entities/activityLog.entity.ts:7-15` — module doc comment: *"Ghi lại MỌI hành động quan trọng trên bất kỳ entity nào"* ("logs every important action on any entity").
- Actual usage — repo-wide grep for `activityLogService` (excluding its own module) turns up exactly **one** call site: `src/modules/accountPermission/infrastructure/http/graphql/accountPermission.resolver.ts:205-215` (`setAccountPermissions` → `recordFromAccount`). None of Admin/Agency/AgencyAccount/Merchant/Tenant/TenantAccount/Customer/Unit/EmailConfig record anything on create/update/delete/login.

**Problem:** Two-sided finding. (a) As designed/intended (write-heavy, append-only, log-everything), this module has zero retention story — no scheduled purge, no partitioning by date/tenant, nothing analogous to `globalSequence`'s (broken) attempt at one. If adoption ever catches up to the module's stated intent, table growth is fully unbounded. (b) Right now, adoption is essentially zero — 12 of the 13 audited modules never call `activityLogService.record`/`recordFromAccount`, so the real, current growth rate is low and the immediate risk is muted. This second point is itself a reuse gap: a shared audit-log facility exists, is well-built (composite indexes, fire-and-forget error handling so it can never break the calling flow — `record()` lines 58-80), and is not used by the modules whose write operations (admin/merchant CRUD, login, password resets, tenant/agency CRUD, staff CRUD) are exactly the kind of "important action" the entity's own doc comment says it should capture.

**Impact:** No safety net is in place for when/if the other modules start calling it (Finding 7's unbounded `getTimeline` makes this worse); and today, admin/merchant/tenant/agency/customer actions are essentially unaudited, undermining the stated audit-trail purpose of the module for the very modules being reviewed here.

**Suggested direction:** Decide the module's actual scope — if it's meant to cover all of admin/agency/merchant/tenant/customer CRUD + auth events, wire `recordFromAccount` calls into those services/resolvers (mirroring `accountPermission`'s usage) and add a retention job (e.g. partitioned table + drop-old-partition, or a scheduled batched delete keyed on `createdAt` like `globalSequence` attempted) before that adoption happens; if it's meant to stay narrowly scoped to permission changes, update the doc comment to stop overstating its coverage.

---

### 9. Missing index on the actual login-lookup field for AgencyAccount/TenantAccount

**Category:** performance
**Severity:** Minor
**Files:**
- `src/modules/agencyAccount/domain/entities/agencyAccount.entity.ts:29-31` — `username` column has no `@Index()`.
- `src/modules/tenantAccount/domain/entities/tenantAccount.entity.ts:42-44` — same, no `@Index()` on `username`.
- Query sites: `src/modules/agencyAccount/application/services/agencyAccount.service.ts:76` (`where: { username: input.username, agencyId: agency.id }`); `src/modules/tenantAccount/application/services/tenantAccount.service.ts:79` (`where: { username: input.username, tenantId: tenant.id }`).
- Contrast: `src/modules/admin/domain/entities/admin.entity.ts:14-17` (`username` — `@Column({unique: true}) @Index()`), `src/modules/merchant/domain/entities/merchant.entity.ts:14-17` (same), `src/modules/customer/domain/entities/customer.entity.ts:33-36` (`email` — `@Index({unique: true})`).

**Problem:** Both `AdminEntity` and `MerchantEntity` index their unique login field explicitly; `AgencyAccountEntity`/`TenantAccountEntity` do not index `username` at all (only the FK columns `agencyId`/`tenantId`/`merchantId` are indexed via `BaseWithAgencyEntity`). Login for these two account types filters on `{username, agencyId}` / `{username, tenantId}` — Postgres can use the `agencyId`/`tenantId` index to narrow to one org's rows but then has to scan those rows for a `username` match without index assistance.

**Impact:** Currently likely fine (per-agency/per-tenant staff counts are small), but this is exactly the kind of multi-tenant fan-out column the audit brief calls out — it will degrade specifically for the largest agencies/tenants first, the ones most likely to matter.

**Suggested direction:** Add a composite index `@Index(['agencyId', 'username'])` on `AgencyAccountEntity` and `@Index(['tenantId', 'username'])` on `TenantAccountEntity` (mirroring the existing `@Index(['tenantId', 'agencyId'])` composite already on `BaseWithTenantEntity`).

---

### 10. `globalSequence.cleanupOldRows()` is dead code and would corrupt live counters if ever wired up as written

**Category:** organization
**Severity:** Minor
**File:** `src/modules/globalSequence/domain/repositories/globalSequence.repository.ts:37-82`

**Problem:** `nextval()` (lines 13-26) is an upsert keyed on `entityType` (`ON CONFLICT ("entityType") DO UPDATE SET "lastValue" = ... , "updatedAt" = now()`) — so each `entityType` has exactly one row whose `createdAt` is frozen at first use and never changes again, no matter how often it's incremented. `cleanupOldRows(retentionDays = 90, batchSize = 1000)` (lines 46-82) deletes rows where `createdAt < cutoff` — i.e. it targets rows that simply haven't been *created* recently, which for this table means "any sequence counter that was set up more than 90 days ago," regardless of how recently or frequently it's actually being incremented. It is never called from anywhere in the codebase (confirmed via repo-wide grep for `cleanupOldRows`).

**Impact:** Currently harmless (dead code). But it's a trap: if someone wires this into a cron job by analogy with a normal "prune stale audit rows" pattern (a very natural thing to do, given the module list includes `activityLog` which genuinely needs exactly that), it would delete the counter row for any low-frequency-but-still-live sequence (e.g. a code-prefix used by a low-volume entity type) on its 90-day mark, and the next `nextval()` call would re-`INSERT` starting from 1 again — silently reusing previously-issued sequence values / generated codes.

**Suggested direction:** Either remove `cleanupOldRows` (this table's rows are O(number of distinct `entityType`s), not unbounded — it doesn't need retention pruning at all), or if kept for symmetry/future use, gate it on `updatedAt` instead of `createdAt` and document clearly that a "stale" row here means "not incremented recently," not "created long ago."

---

### 11. Inconsistent GraphQL input-DTO pattern: some modules extend the entity (implicit surface), others whitelist explicitly

**Category:** organization
**Severity:** Minor
**Files:**
- `src/modules/admin/application/dto/admin.dto.ts:5,13` — `CreateAdminInput extends AdminEntity`, `UpdateAdminInput extends AdminEntity`.
- `src/modules/customer/application/dto/customer.dto.ts:5,9` — `CreateCustomerInput extends CustomerEntity`, `UpdateCustomerInput extends CustomerEntity`.
- Contrast: `src/modules/agency/application/dto/agency.dto.ts`, `src/modules/merchant/application/dto/merchant.dto.ts`, `src/modules/agencyAccount/application/dto/agencyAccount.dto.ts`, `src/modules/tenantAccount/application/dto/tenantAccount.dto.ts` all declare explicit, hand-picked `@Field()` lists instead of extending the entity.

**Problem:** Because GraphQL field exposure is driven by the `@Field()` decorator on the entity itself, `extends Entity` DTOs automatically inherit every `@Field()`-annotated property as a client-settable mutation input — e.g. `CreateAdminInput`/`UpdateAdminInput` expose `roles: ERole[]` and `isActivated: boolean` as input fields purely because `AdminEntity` happens to annotate them with `@Field()` for *read* purposes; nobody made an explicit decision that `createAdmin`/`updateAdmin` should accept a client-supplied `roles` array. Today this is contained because both mutations are `@GQLAuthorized([ERole.SUPER_ADMIN])`-only, but the pattern means the input surface silently grows every time a field is added to the entity for unrelated (read/display) reasons, with no DTO-level review step to catch it.

**Impact:** Latent privilege-escalation-by-omission risk if the role gate on these mutations is ever loosened, or if a more sensitive field is added to `AdminEntity`/`CustomerEntity` with `@Field()` later. Also just an inconsistent codebase pattern across otherwise-parallel modules.

**Suggested direction:** Convert `CreateAdminInput`/`UpdateAdminInput`/`CreateCustomerInput`/`UpdateCustomerInput` to explicit whitelisted field lists, matching the pattern already used by Agency/Merchant/AgencyAccount/TenantAccount.

---

### 12. Per-module `EmailConfigService` instantiation instead of the shared-singleton pattern used elsewhere

**Category:** organization
**Severity:** Minor
**Files:** `src/modules/admin/application/services/admin.service.ts:27,34`; `src/modules/merchant/application/services/merchant.service.ts:40`; `src/modules/customer/application/services/customer.service.ts:29,31` — each does `new EmailConfigService()` in its own constructor.
**Contrast:** `src/modules/accountPermission/application/services/accountPermission.service.ts:304` and `src/modules/activityLog/application/services/activityLog.service.ts:117` both export a module-level singleton (`export const accountPermissionService = new AccountPermissionService()`, `export const activityLogService = new ActivityLogService()`).

**Problem:** No shared `emailConfigService` singleton export exists; three unrelated services each construct their own `EmailConfigService` (and its own `EmailConfigRepository`, and thus its own TypeORM repository handle) instead of importing one shared instance.

**Impact:** Purely organizational — functionally harmless since the service is stateless, but it's an inconsistent pattern next to two other cross-cutting services in the same codebase that do export singletons, and it means three separate object graphs get constructed on every request that touches any of these services instead of one.

**Suggested direction:** Export `export const emailConfigService = new EmailConfigService();` from `emailConfig.service.ts` and have Admin/Merchant/Customer services import that instead of constructing their own.
