# Audit Group 0 — Bugfix Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 10 real, independent bugs found by the 2026-09-02 BE+FE reuse/scalability audit (security/correctness — see `docs/superpowers/specs/2026-09-02-be-fe-reuse-audit-report.md`, Group 0), before any of the larger reuse/refactor work (Groups 1-5) begins.

**Architecture:** No new architecture — these are targeted fixes inside the existing DDD-BE / module-FE structure. Each task is independent and can be done in any order; grouped below roughly by repo and by how much context each shares with its neighbor.

**Tech Stack:** BE: Node/TypeScript, Express, custom code-first GraphQL (`@/core/shared/decorators/graphQL.decorators`), TypeORM/Postgres, Jest. FE: Astro + SolidJS, urql GraphQL client, `typed-graphql-builder` codegen, Vitest.

## Global Constraints

- Two separate git repos: `D:\OTHER\node-source-base\ddd-graphql-be` and `D:\OTHER\node-source-base\ddd-graphql-fe`. Commit each task's changes in the repo it actually touches — never mix BE and FE changes in one commit.
- BE tests: `npm test` (Jest) from `ddd-graphql-be`. FE tests: `npm run test` (Vitest) from `ddd-graphql-fe`.
- Follow existing code style exactly (Vietnamese comments where the surrounding file already uses them, same import ordering, same DI-via-constructor-defaults pattern for BE services).
- Do not touch anything outside each task's named files — the larger reuse/refactor consolidation (shared `AccountCredentialService`, shared `LoginForm`, etc.) is Group 2, a separate later plan. These fixes may look locally "duplicated" — that's intentional; Group 2 consolidates them.
- Never commit `.env` or log files (`*.log`, `.dev-server.log`, `be-dev*.log`, `fe-dev*.log`) — they're already gitignored, just don't `git add -A`.

---

### Task 1: BE — Fix nested `AND(OR(...))` scope rule silently over-granting list-query access

**Files:**
- Modify: `ddd-graphql-be/src/modules/permission/types/scope.types.ts:307-331` (the `AND` case of `_resolve`)
- Test: `ddd-graphql-be/src/modules/permission/types/__tests__/scope.types.test.ts` (new file)

**Interfaces:**
- Consumes: nothing new — `_resolve(rule: ScopeRule, account: IAccount): ResolvedScope` already exists in this file; `ResolvedScope` is `{ type: 'ALLOW' } | { type: 'DENY' } | { type: 'FILTER'; where: ...; rule }`.
- Produces: same signature, corrected behavior only. No other file's interface changes.

**Problem being fixed:** when an `AND(...)` rule contains a nested `OR(...)` sub-rule, the current code hits the `else` branch at line 321-326, logs a `console.warn`, and **silently drops** the OR sub-condition from the merged filter — so a list query returns MORE rows than the configured rule allows. `recordMatchesRule` (used for single-record mutation checks, same file) already handles this nesting correctly, so the same rule is enforced inconsistently between list and mutation paths.

- [ ] **Step 1: Write the failing test**

Create `ddd-graphql-be/src/modules/permission/types/__tests__/scope.types.test.ts`:

```ts
import { resolveRule } from '../scope.types';
import { EScopeRuleType } from '../scope.types';
import { IAccount } from '@/core/shared/types/common.types';

const account = { tenantAccountId: 'ta-1', tenantId: 't-1' } as IAccount;

describe('resolveRule — AND containing nested OR', () => {
    it('does NOT silently widen the result set to just the AND siblings', () => {
        // AND(INCLUDE(unitId in [u1]), OR(INCLUDE(status in [A]), SELF(ownerId)))
        const rule = {
            type: EScopeRuleType.AND,
            rules: [
                { type: EScopeRuleType.INCLUDE, field: 'unitId', ids: ['u1'] },
                {
                    type: EScopeRuleType.OR,
                    rules: [
                        { type: EScopeRuleType.INCLUDE, field: 'status', ids: ['A'] },
                        { type: EScopeRuleType.SELF, field: 'ownerId' },
                    ],
                },
            ],
        } as const;

        const resolved = resolveRule(rule as any, account);

        // Before the fix: resolved === { type: 'FILTER', where: { unitId: { $in: ['u1'] } }, rule }
        // — the OR branch vanished entirely, so ANY row with unitId=u1 would match regardless of
        // status/ownership. After the fix, the OR restriction must still be represented somehow
        // (nested-AND-of-ORs shape) — assert it is NOT simply dropped.
        expect(resolved.type).not.toBe('DENY'); // sanity: still resolvable, not over-restrictive either
        if (resolved.type === 'FILTER') {
            const serialized = JSON.stringify(resolved.where);
            expect(serialized).toContain('unitId');
            // The nested OR's fields must appear SOMEWHERE in the resolved filter — if they don't,
            // the OR branch was dropped (the bug).
            expect(serialized).toContain('status');
            expect(serialized).toContain('ownerId');
        }
    });

    it('still fails closed (DENY) if a branch cannot be represented, rather than silently widening', () => {
        // AND with an OR branch that resolves to DENY (no self id available) alongside an ALLOW sibling
        const rule = {
            type: EScopeRuleType.AND,
            rules: [
                { type: EScopeRuleType.ALLOW_ALL },
                { type: EScopeRuleType.OR, rules: [{ type: EScopeRuleType.SELF, field: 'ownerId' }] },
            ],
        } as const;
        const noSelfAccount = { tenantAccountId: undefined, tenantId: 't-1' } as unknown as IAccount;
        const resolved = resolveRule(rule as any, noSelfAccount);
        // SELF with no selfId → DENY per existing SELF case; AND containing a DENY branch must
        // still DENY overall (existing short-circuit at line 313-314) — not silently drop it.
        expect(resolved.type).toBe('DENY');
    });
});
```

Check the file's actual exported function name first — run:
```bash
grep -n "^export function\|^function _resolve\|^export const resolveRule" ddd-graphql-be/src/modules/permission/types/scope.types.ts
```
If the resolver function is named `_resolve` and not exported, export it (add `export` to its declaration) so the test can import it directly — this is a pure function with no side effects, safe to export.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ddd-graphql-be && npx jest src/modules/permission/types/__tests__/scope.types.test.ts`
Expected: FAIL on the first test — the resolved filter's serialized JSON does not contain `status`/`ownerId` (the OR branch was silently dropped).

- [ ] **Step 3: Fix the AND case to represent nested OR instead of dropping it**

In `ddd-graphql-be/src/modules/permission/types/scope.types.ts`, replace the `AND` case (currently ~lines 307-331):

```ts
        case EScopeRuleType.AND: {
            if (!rule.rules?.length) return { type: 'ALLOW' };
            const andWhereConditions: Record<string, any>[] = [];
            const merged: Record<string, any> = {};

            for (const sub of rule.rules) {
                const resolved = _resolve(sub, account);
                // Nếu bất kỳ nhánh nào DENY → toàn bộ AND DENY (short-circuit)
                if (resolved.type === 'DENY') return { type: 'DENY' };
                if (resolved.type === 'ALLOW') continue;
                // FILTER với AND where → merge vào object chung
                if (!Array.isArray(resolved.where)) {
                    Object.assign(merged, resolved.where);
                }
                // FIX (was: silently dropped with a console.warn, over-granting list-query access —
                // see docs/superpowers/specs/2026-09-02-be-fe-reuse-audit-report.md Group 0.1).
                // AND containing a nested OR (array where) → represent as its own AND-branch instead
                // of discarding it. buildWhereConditions/normalizeWhereInput below combines this
                // correctly: each entry of `andWhereConditions` becomes one AND-ed OR-group.
                else {
                    andWhereConditions.push({ $or: resolved.where });
                }
            }

            if (!Object.keys(merged).length && !andWhereConditions.length) return { type: 'ALLOW' };
            if (!andWhereConditions.length) return { type: 'FILTER', where: merged, rule };

            // At least one nested-OR branch exists — represent the whole AND as an $and array so
            // BaseRepository.buildWhereConditions can compose it correctly instead of losing it.
            const combined = Object.keys(merged).length ? [merged, ...andWhereConditions] : andWhereConditions;
            return { type: 'FILTER', where: { $and: combined } as any, rule };
        }
```

Now check how `buildWhereConditions`/`normalizeWhereInput` in `ddd-graphql-be/src/core/infrastructure/database/base.abstract.repository.ts` actually consumes a `where` value — run:
```bash
grep -n "normalizeWhereInput\|\\$or\|\\$and" ddd-graphql-be/src/core/infrastructure/database/base.abstract.repository.ts
```
This project's `where` values already support an **array** meaning OR (confirmed by the existing `EScopeRuleType.OR` case: `return { type: 'FILTER', where: conditions, rule }` where `conditions` is a plain array — the code comment at that OR case says `// Array → BaseRepository.normalizeWhereInput xử lý như OR conditions`). There is **no** existing `$and`/`$or` key convention in this codebase — using literal `$and`/`$or` keys above would NOT be understood by `buildWhereConditions`. Adjust the fix to use the **actual** existing convention instead:

- A plain object = AND of its keys (existing behavior).
- An array = OR of its entries (existing behavior, confirmed by the `OR` case).

So "AND of (plain merged conditions) and (an OR array)" has no single-level representation in this scheme — the correct fix, consistent with the codebase's actual capabilities, is to **distribute** the merged AND-conditions across each OR branch (turn `AND(mergedConditions, OR(a, b))` into `OR(AND(mergedConditions, a), AND(mergedConditions, b))`, i.e. a flat array of merged objects) rather than inventing an unsupported `$and`/`$or` key. Replace the fix above with:

```ts
        case EScopeRuleType.AND: {
            if (!rule.rules?.length) return { type: 'ALLOW' };
            let orBranches: Record<string, any>[] | null = null; // set once an OR sub-rule is found
            const merged: Record<string, any> = {};

            for (const sub of rule.rules) {
                const resolved = _resolve(sub, account);
                // Nếu bất kỳ nhánh nào DENY → toàn bộ AND DENY (short-circuit)
                if (resolved.type === 'DENY') return { type: 'DENY' };
                if (resolved.type === 'ALLOW') continue;
                if (!Array.isArray(resolved.where)) {
                    Object.assign(merged, resolved.where);
                    continue;
                }
                // FIX (was: silently dropped, over-granting list-query access — see
                // docs/superpowers/specs/2026-09-02-be-fe-reuse-audit-report.md Group 0.1).
                // AND containing a nested OR (array where): this scheme has no AND-of-OR primitive,
                // only "plain object = AND" / "array = OR" (see the OR case above and
                // BaseRepository.normalizeWhereInput). Distribute instead of dropping: AND(X, OR(a,b))
                // ≡ OR(AND(X,a), AND(X,b)) — each OR branch gets merged with X individually, and the
                // whole thing is represented as one OR array, matching what normalizeWhereInput
                // already knows how to consume. Only the FIRST nested-OR sub-rule is distributed this
                // way; a second nested OR at the same AND level is a genuinely unsupported shape
                // (AND-of-two-ORs) — fail closed instead of guessing.
                if (orBranches !== null) {
                    console.error('[ScopeRule] AND containing more than one nested OR sub-rule is not supported — failing closed (DENY) instead of guessing.');
                    return { type: 'DENY' };
                }
                orBranches = resolved.where;
            }

            if (orBranches === null) {
                if (!Object.keys(merged).length) return { type: 'ALLOW' };
                return { type: 'FILTER', where: merged, rule };
            }
            const distributed = orBranches.map((branch) => ({ ...merged, ...branch }));
            return { type: 'FILTER', where: distributed, rule };
        }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ddd-graphql-be && npx jest src/modules/permission/types/__tests__/scope.types.test.ts`
Expected: PASS — first test's resolved filter is now an array (OR) of `{unitId: {$in:['u1']}, status: {$in:['A']}}` and `{unitId: {$in:['u1']}, ownerId: selfId}`-shaped objects, both containing `unitId`, and the union of the two contains `status` and `ownerId`; second test still resolves to `DENY`.

- [ ] **Step 5: Run the full permission module test suite to check nothing else regressed**

Run: `cd ddd-graphql-be && npx jest src/modules/permission src/modules/accountPermission`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
cd ddd-graphql-be
git add src/modules/permission/types/scope.types.ts src/modules/permission/types/__tests__/scope.types.test.ts
git commit -m "fix(permission): stop silently dropping nested OR inside AND scope rules on list queries

AND(OR(...)) rules were over-granting access on list queries — the OR
branch was discarded with only a console.warn, while recordMatchesRule
(mutation path) already handled the same nesting correctly. Distribute
the AND's plain conditions across each OR branch instead (the only shape
BaseRepository.normalizeWhereInput actually supports), and fail closed
if more than one nested OR appears at the same AND level.

Audit: docs/superpowers/specs/2026-09-02-be-fe-reuse-audit-report.md Group 0.1

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: BE — Stop Admin/Merchant `forgotPassword` leaking account existence

**Files:**
- Modify: `ddd-graphql-be/src/modules/admin/application/services/admin.service.ts:162-191` (`forgotPassword`)
- Modify: `ddd-graphql-be/src/modules/merchant/application/services/merchant.service.ts:219-248` (`forgotPassword`)
- Test: `ddd-graphql-be/src/modules/admin/application/services/__tests__/admin.service.test.ts` (new file)
- Test: `ddd-graphql-be/src/modules/merchant/application/services/__tests__/merchant.service.test.ts` (new file)

**Interfaces:**
- Consumes: `EmailConfigService.findForDomain(domain)`, `mailService.sendPasswordResetEmail({...})` — both already used identically in `CustomerService.requestPasswordReset` (the reference pattern), file `ddd-graphql-be/src/modules/customer/application/services/customer.service.ts:93-119`.
- Produces: `forgotPassword(login: string, domain: string): Promise<void>` — same signature as before, callers (`admin.resolver.ts:127-131`, `merchant.resolver.ts:158-168`) do not change.

**Problem:** both methods `throw NotFoundException` when the login doesn't match any account — a public, unauthenticated mutation that lets an attacker distinguish "account exists" from "account doesn't exist" by response shape. `CustomerService.requestPasswordReset` already fixed the identical issue with a silent-return + try/catch pattern (see that file's own comment at lines 103-110).

- [ ] **Step 1: Write the failing tests**

Create `ddd-graphql-be/src/modules/admin/application/services/__tests__/admin.service.test.ts`:

```ts
import { AdminService } from '../admin.service';
import { NotFoundException } from '@/core/domain/exceptions/appException';
import { mailService } from '@/core/infrastructure/mail/mail.service';

function makeService(repoOverrides: Partial<any> = {}) {
    const adminRepository: any = {
        findByEmail: jest.fn(async () => null),
        findOneByCondition: jest.fn(async () => null),
        updateById: jest.fn(async (id: string, d: any) => ({ id, ...d })),
        ...repoOverrides,
    };
    const service = new (AdminService as any)();
    (service as any).adminRepository = adminRepository;
    (service as any).updateById = adminRepository.updateById;
    return { service, adminRepository };
}

describe('AdminService.forgotPassword', () => {
    afterEach(() => jest.restoreAllMocks());

    it('does NOT throw when the login does not match any admin (no account-enumeration leak)', async () => {
        const { service } = makeService(); // findByEmail/findOneByCondition both resolve null
        await expect(service.forgotPassword('nobody@example.com', 'https://admin.example.com')).resolves.toBeUndefined();
    });

    it('sends a reset email and does not throw when the login matches an activated admin with an email', async () => {
        jest.spyOn(mailService, 'sendPasswordResetEmail').mockResolvedValue(undefined as any);
        const admin = { id: 'a1', email: 'a@b.com', username: 'admin1', isActivated: true };
        const { service, adminRepository } = makeService({ findByEmail: jest.fn(async () => admin) });
        (service as any).emailConfigService = { findForDomain: jest.fn(async () => ({ id: 'ec1' })) };

        await service.forgotPassword('a@b.com', 'https://admin.example.com');

        expect(adminRepository.updateById).toHaveBeenCalledWith('a1', expect.objectContaining({ resetPasswordToken: expect.any(String) }));
        expect(mailService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('does not throw even if sending the email fails (infrastructure error must not leak account existence either)', async () => {
        jest.spyOn(mailService, 'sendPasswordResetEmail').mockRejectedValue(new Error('SMTP down'));
        const admin = { id: 'a1', email: 'a@b.com', username: 'admin1', isActivated: true };
        const { service } = makeService({ findByEmail: jest.fn(async () => admin) });
        (service as any).emailConfigService = { findForDomain: jest.fn(async () => ({ id: 'ec1' })) };

        await expect(service.forgotPassword('a@b.com', 'https://admin.example.com')).resolves.toBeUndefined();
    });
});
```

Create `ddd-graphql-be/src/modules/merchant/application/services/__tests__/merchant.service.test.ts` with the same 3 tests, adapted:

```ts
import { MerchantService } from '../merchant.service';
import { mailService } from '@/core/infrastructure/mail/mail.service';

function makeService() {
    const merchantRepository: any = {
        findOneByCondition: jest.fn(async () => null),
        updateById: jest.fn(async (id: string, d: any) => ({ id, ...d })),
    };
    const emailConfigService: any = { findForDomain: jest.fn(async () => ({ id: 'ec1' })) };
    const service = new MerchantService(merchantRepository, {} as any, {} as any, {} as any, {} as any, emailConfigService);
    return { service, merchantRepository, emailConfigService };
}

describe('MerchantService.forgotPassword', () => {
    afterEach(() => jest.restoreAllMocks());

    it('does NOT throw when the login does not match any merchant (no account-enumeration leak)', async () => {
        const { service } = makeService();
        await expect(service.forgotPassword('nobody@example.com', 'https://app.example.com')).resolves.toBeUndefined();
    });

    it('sends a reset email and does not throw when the login matches an activated merchant with an email', async () => {
        jest.spyOn(mailService, 'sendPasswordResetEmail').mockResolvedValue(undefined as any);
        const merchant = { id: 'm1', email: 'm@b.com', username: 'merchant1', isActivated: true };
        const { service, merchantRepository } = makeService();
        merchantRepository.findOneByCondition = jest.fn(async () => merchant);

        await service.forgotPassword('m@b.com', 'https://app.example.com');

        expect(merchantRepository.updateById).toHaveBeenCalledWith('m1', expect.objectContaining({ resetPasswordToken: expect.any(String) }));
        expect(mailService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('does not throw even if sending the email fails', async () => {
        jest.spyOn(mailService, 'sendPasswordResetEmail').mockRejectedValue(new Error('SMTP down'));
        const merchant = { id: 'm1', email: 'm@b.com', username: 'merchant1', isActivated: true };
        const { service, merchantRepository } = makeService();
        merchantRepository.findOneByCondition = jest.fn(async () => merchant);

        await expect(service.forgotPassword('m@b.com', 'https://app.example.com')).resolves.toBeUndefined();
    });
});
```

Check `MerchantService`'s actual constructor parameter order first (`merchantRepository, agencyAccountRepository, tenantAccountRepository, agencyRepository, tenantRepository, emailConfigService` per the file already read) and adjust the `new MerchantService(...)` call above to match exactly if it differs.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ddd-graphql-be && npx jest src/modules/admin/application/services/__tests__ src/modules/merchant/application/services/__tests__`
Expected: FAIL — both "does NOT throw when login does not match" tests currently reject with `NotFoundException`.

- [ ] **Step 3: Fix `AdminService.forgotPassword`**

Replace `ddd-graphql-be/src/modules/admin/application/services/admin.service.ts:162-191`:

```ts
    /**
     * Quên mật khẩu — tìm theo username hoặc email, tạo reset token và gửi email
     *
     * FIX (audit Group 0.2): trước đây throw NotFoundException khi không tìm thấy tài khoản —
     * đây là mutation @GQLPublic (không cần đăng nhập), nên throw tạo ra một "account-enumeration
     * oracle" — kẻ tấn công dò được username/email admin nào tồn tại qua sự khác biệt lỗi/thành
     * công. CustomerService.requestPasswordReset đã sửa đúng lỗi này (silent-return + try/catch
     * quanh phần gửi email) — port lại pattern đó ở đây.
     */
    async forgotPassword(login: string, domain: string): Promise<void> {
        // Tìm theo email trước, sau đó theo username
        let admin = await this.adminRepository.findByEmail(login);
        if (!admin) {
            admin = await this.adminRepository.findOneByCondition({ where: { username: login } });
        }
        // KHÔNG throw ở bất kỳ nhánh nào dưới đây — luôn trả về êm, tránh lộ "login này có tồn
        // tại/kích hoạt/có email hay không" qua sự khác biệt lỗi/thành công.
        if (!admin || !admin.isActivated || !admin.email) return;

        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        const expires = new Date(Date.now() + 30 * 60 * 1000);

        await this.updateById(admin.id, {
            resetPasswordToken: hashedToken,
            resetPasswordExpires: expires,
        } as any);

        // Bọc try/catch: lỗi hạ tầng (EmailConfig thiếu, SMTP sai) không được lộ ngược ra client —
        // nếu không, "login tồn tại nhưng gửi email lỗi" sẽ phân biệt được với "login không tồn
        // tại" (return êm ở trên), đúng lỗ hổng enumeration mà silent-return vừa muốn chặn.
        try {
            const emailConfig = await this.emailConfigService.findForDomain(domain);
            await mailService.sendPasswordResetEmail({
                to: admin.email,
                username: admin.username,
                resetToken,
                accountType: 'admin',
                origin: domain,
                config: emailConfig,
            });
        } catch (err) {
            console.error(`[AdminService] forgotPassword: gửi email thất bại cho adminId=${admin.id} — ${err instanceof Error ? err.message : String(err)}`);
        }
    }
```

(`console.error` matches this file's existing style — it has no `Logger` import today, unlike `customer.service.ts`. Do not add a new import for this alone; keep the fix minimal.)

- [ ] **Step 4: Fix `MerchantService.forgotPassword`**

Replace `ddd-graphql-be/src/modules/merchant/application/services/merchant.service.ts:219-248` the same way:

```ts
    // ─────────────────────────────────────────────────────────────
    // Quên mật khẩu — tạo reset token và gửi email
    //
    // FIX (audit Group 0.2): silent-return + try/catch, cùng lý do và cùng pattern đã áp dụng cho
    // AdminService.forgotPassword — xem comment ở đó.
    // ─────────────────────────────────────────────────────────────

    async forgotPassword(login: string, domain: string): Promise<void> {
        let merchant = await this.merchantRepository.findOneByCondition({ where: { email: login } });
        if (!merchant) {
            merchant = await this.merchantRepository.findOneByCondition({ where: { username: login } });
        }
        if (!merchant || !merchant.isActivated || !merchant.email) return;

        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        const expires = new Date(Date.now() + 30 * 60 * 1000);

        await this.merchantRepository.updateById(merchant.id, {
            resetPasswordToken: hashedToken,
            resetPasswordExpires: expires,
        } as any);

        try {
            const emailConfig = await this.emailConfigService.findForDomain(domain);
            await mailService.sendPasswordResetEmail({
                to: merchant.email,
                username: merchant.username,
                resetToken,
                accountType: 'merchant',
                origin: domain,
                config: emailConfig,
            });
        } catch (err) {
            console.error(`[MerchantService] forgotPassword: gửi email thất bại cho merchantId=${merchant.id} — ${err instanceof Error ? err.message : String(err)}`);
        }
    }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd ddd-graphql-be && npx jest src/modules/admin/application/services/__tests__ src/modules/merchant/application/services/__tests__`
Expected: all PASS.

- [ ] **Step 6: Run each module's full existing test suite to check nothing regressed**

Run: `cd ddd-graphql-be && npx jest src/modules/admin src/modules/merchant`
Expected: all PASS. `NotFoundException`/`EErrorCode` imports may now be partially unused in `admin.service.ts` — check with `grep -n "NotFoundException" ddd-graphql-be/src/modules/admin/application/services/admin.service.ts`; if still used elsewhere in the file (e.g. `resetMerchantPassword`), leave the import as-is.

- [ ] **Step 7: Commit**

```bash
cd ddd-graphql-be
git add src/modules/admin/application/services/admin.service.ts src/modules/admin/application/services/__tests__/admin.service.test.ts src/modules/merchant/application/services/merchant.service.ts src/modules/merchant/application/services/__tests__/merchant.service.test.ts
git commit -m "fix(auth): stop Admin/Merchant forgotPassword leaking account existence

Both threw NotFoundException on an unauthenticated public mutation when
the login didn't match — an enumeration oracle for the highest-privilege
account types. Port CustomerService.requestPasswordReset's already-proven
silent-return + try/catch pattern to both.

Audit: docs/superpowers/specs/2026-09-02-be-fe-reuse-audit-report.md Group 0.2

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: BE — Add Agency/Tenant forgot-password mutations (reusing the Merchant reset flow)

**Files:**
- Modify: `ddd-graphql-be/src/core/shared/dto/auth.dto.ts` (`ForgotPasswordInput` — add optional `code`)
- Modify: `ddd-graphql-be/src/modules/agencyAccount/application/services/agencyAccount.service.ts` (add `forgotPassword`)
- Modify: `ddd-graphql-be/src/modules/tenantAccount/application/services/tenantAccount.service.ts` (add `forgotPassword`)
- Modify: `ddd-graphql-be/src/modules/agencyAccount/infrastructure/http/graphql/agencyAccount.resolver.ts` (add `agencyAccountForgotPassword` mutation)
- Modify: `ddd-graphql-be/src/modules/tenantAccount/infrastructure/http/graphql/tenantAccount.resolver.ts` (add `tenantAccountForgotPassword` mutation)
- Test: `ddd-graphql-be/src/modules/agencyAccount/application/services/__tests__/agencyAccount.service.test.ts` (new)
- Test: `ddd-graphql-be/src/modules/tenantAccount/application/services/__tests__/tenantAccount.service.test.ts` (new)

**Design decision (from the audit's own analysis of these two services):** AgencyAccount/TenantAccount authenticate by verifying the password against their **linked Merchant** record (`login()`/`changePassword()` in both services already do this — confirmed in `agencyAccount.service.ts:85-90`/`98-113` and `tenantAccount.service.ts:88-93`/`101-117`). So "forgot password" for these two account types must reset the **Merchant's** password, not add a new credential field. This lets the reset step reuse the *already-existing, already-tested* `MerchantService.resetPasswordByToken` / `merchantResetPassword` mutation and the generic FE `ResetPasswordPage` (`type=merchant`) completely unchanged — only the "request a reset email" half needs new code.

**Interfaces:**
- Consumes: `MerchantService.findById`, `MerchantRepository.updateById` (already injected in both services as `this.merchantService`/`this.merchantRepository`), `EmailConfigService.findForDomain`, `mailService.sendPasswordResetEmail` (same as Task 2).
- Produces: `AgencyAccountService.forgotPassword(code: string, login: string, domain: string): Promise<void>`; `TenantAccountService.forgotPassword(code: string, login: string, domain: string): Promise<void>`. New GraphQL mutations `agencyAccountForgotPassword(input: ForgotPasswordInput)`, `tenantAccountForgotPassword(input: ForgotPasswordInput)`, both `@GQLPublic()`, both returning `Object` (`{ success: boolean }`) — same shape as `merchantForgotPassword`.

- [ ] **Step 1: Add optional `code` to `ForgotPasswordInput`**

In `ddd-graphql-be/src/core/shared/dto/auth.dto.ts`, modify the existing `ForgotPasswordInput` class (currently lines 44-59):

```ts
@InputType('ForgotPasswordInput')
export class ForgotPasswordInput {
    /** Username hoặc email đều được chấp nhận */
    @Field({ type: String })
    login!: string;

    /**
     * Mã tổ chức (agency/tenant code) — CHỈ cần cho agencyAccountForgotPassword/
     * tenantAccountForgotPassword (Agency/Tenant account được định danh bởi username SCOPED theo
     * agency/tenant, giống LoginInput.code). Admin/Merchant/Customer bỏ trống field này.
     */
    @Field({ type: String, nullable: true })
    code?: string;

    /**
     * Origin đầy đủ của FE, lấy từ window.location.origin
     * VD: "https://admin.example.com", "https://app.example.com"
     * BE dùng để:
     *   1. Tìm EmailConfig phù hợp (match theo hostname)
     *   2. Tạo reset link: ${origin}${config.resetPasswordPath}?token=...
     */
    @Field({ type: String, nullable: true })
    domain?: string;
}
```

- [ ] **Step 2: Write the failing tests**

Create `ddd-graphql-be/src/modules/agencyAccount/application/services/__tests__/agencyAccount.service.test.ts`:

```ts
import { AgencyAccountService } from '../agencyAccount.service';
import { mailService } from '@/core/infrastructure/mail/mail.service';

function makeService() {
    const agencyAccountRepository: any = { findOneByCondition: jest.fn(async () => null) };
    const agencyRepository: any = { findOneByCondition: jest.fn(async () => null) };
    const merchantService: any = { findById: jest.fn(async () => null), register: jest.fn() };
    const merchantRepository: any = { findById: jest.fn(async () => null), updateById: jest.fn(async (id: string, d: any) => ({ id, ...d })) };
    const service = new AgencyAccountService(agencyAccountRepository, agencyRepository, merchantService, merchantRepository);
    (service as any).emailConfigService = { findForDomain: jest.fn(async () => ({ id: 'ec1' })) };
    return { service, agencyAccountRepository, agencyRepository, merchantService, merchantRepository };
}

describe('AgencyAccountService.forgotPassword', () => {
    afterEach(() => jest.restoreAllMocks());

    it('does not throw when the agency code does not exist', async () => {
        const { service } = makeService();
        await expect(service.forgotPassword('BADCODE', 'someone', 'https://app.example.com')).resolves.toBeUndefined();
    });

    it('does not throw when the agency exists but the username does not match any account', async () => {
        const { service, agencyRepository } = makeService();
        agencyRepository.findOneByCondition = jest.fn(async () => ({ id: 'ag1', code: 'AG1' }));
        await expect(service.forgotPassword('AG1', 'nobody', 'https://app.example.com')).resolves.toBeUndefined();
    });

    it('resets the LINKED MERCHANT reset token and sends accountType=merchant email when everything matches', async () => {
        jest.spyOn(mailService, 'sendPasswordResetEmail').mockResolvedValue(undefined as any);
        const { service, agencyRepository, agencyAccountRepository, merchantService, merchantRepository } = makeService();
        agencyRepository.findOneByCondition = jest.fn(async () => ({ id: 'ag1', code: 'AG1' }));
        agencyAccountRepository.findOneByCondition = jest.fn(async () => ({ id: 'aa1', merchantId: 'm1', isActivated: true }));
        merchantService.findById = jest.fn(async () => ({ id: 'm1', email: 'm@b.com', username: 'merchant1' }));

        await service.forgotPassword('AG1', 'staff1', 'https://app.example.com');

        expect(merchantRepository.updateById).toHaveBeenCalledWith('m1', expect.objectContaining({ resetPasswordToken: expect.any(String) }));
        expect(mailService.sendPasswordResetEmail).toHaveBeenCalledWith(expect.objectContaining({ accountType: 'merchant', to: 'm@b.com' }));
    });
});
```

Create `ddd-graphql-be/src/modules/tenantAccount/application/services/__tests__/tenantAccount.service.test.ts` with the mirrored 3 tests (swap `agency`→`tenant`, `agencyAccount`→`tenantAccount`, constructor args `(tenantAccountRepository, tenantRepository, merchantService, merchantRepository)` per `tenantAccount.service.ts`'s actual constructor order).

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd ddd-graphql-be && npx jest src/modules/agencyAccount/application/services/__tests__ src/modules/tenantAccount/application/services/__tests__`
Expected: FAIL — `forgotPassword` does not exist on either service yet (TypeScript compile error / `is not a function`).

- [ ] **Step 4: Implement `AgencyAccountService.forgotPassword`**

Add to `ddd-graphql-be/src/modules/agencyAccount/application/services/agencyAccount.service.ts`, inside the `AgencyAccountService` class (after `changePassword`), and add `import * as crypto from 'crypto';` and `import { mailService } from '@/core/infrastructure/mail/mail.service';` and `import { EmailConfigService } from '@/modules/emailConfig/application/services/emailConfig.service';` to the top of the file if not already present, plus add `emailConfigService = new EmailConfigService()` as a new constructor default param:

```ts
    constructor(
        private readonly agencyAccountRepository = new AgencyAccountRepository(),
        private readonly agencyRepository = new AgencyRepository(),
        private readonly merchantService = new MerchantService(),
        private readonly merchantRepository = new MerchantRepository(),
        private readonly emailConfigService = new EmailConfigService(),
    ) {
        super(agencyAccountRepository, 'AgencyAccount');
    }
```

```ts
    /**
     * Quên mật khẩu (Agency staff) — AgencyAccount xác thực qua Merchant password (xem login()/
     * changePassword() ở trên), nên reset token/email/gửi mail đều thao tác trên bản ghi Merchant
     * liên kết, KHÔNG phải AgencyAccount — cho phép bước reset-bằng-token tái dùng nguyên vẹn
     * MerchantService.resetPasswordByToken/merchantResetPassword và trang FE ResetPasswordPage
     * (type=merchant) đã có sẵn, không cần thêm mutation/trang reset riêng.
     *
     * Silent-return + try/catch quanh gửi email: cùng pattern chống account-enumeration đã áp
     * dụng cho AdminService/MerchantService.forgotPassword (audit Group 0.2/0.3) — không throw ở
     * bất kỳ nhánh "không tìm thấy" nào.
     */
    async forgotPassword(code: string, login: string, domain: string): Promise<void> {
        const agency = await this.agencyRepository.findOneByCondition({ where: { code } });
        if (!agency) return;

        const agencyAccount = await this.agencyAccountRepository.findOneByCondition({ where: { username: login, agencyId: agency.id } });
        if (!agencyAccount || !agencyAccount.isActivated) return;

        const merchant = await this.merchantService.findById(agencyAccount.merchantId);
        if (!merchant?.email) return;

        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        const expires = new Date(Date.now() + 30 * 60 * 1000);

        await this.merchantRepository.updateById(merchant.id, {
            resetPasswordToken: hashedToken,
            resetPasswordExpires: expires,
        } as any);

        try {
            const emailConfig = await this.emailConfigService.findForDomain(domain);
            await mailService.sendPasswordResetEmail({
                to: merchant.email,
                username: merchant.username,
                resetToken,
                accountType: 'merchant',
                origin: domain,
                config: emailConfig,
            });
        } catch (err) {
            console.error(`[AgencyAccountService] forgotPassword: gửi email thất bại cho merchantId=${merchant.id} — ${err instanceof Error ? err.message : String(err)}`);
        }
    }
```

- [ ] **Step 5: Implement `TenantAccountService.forgotPassword`** — same shape, adapted to `tenantRepository`/`tenantId`:

Add the same constructor `emailConfigService = new EmailConfigService()` default param and the same three imports to `ddd-graphql-be/src/modules/tenantAccount/application/services/tenantAccount.service.ts`, then:

```ts
    /**
     * Quên mật khẩu (Tenant staff) — xem comment đầy đủ ở AgencyAccountService.forgotPassword
     * (cùng lý do, cùng pattern: TenantAccount cũng xác thực qua Merchant password).
     */
    async forgotPassword(code: string, login: string, domain: string): Promise<void> {
        const tenant = await this.tenantRepository.findOneByCondition({ where: { code } });
        if (!tenant) return;

        const tenantAccount = await this.tenantAccountRepository.findOneByCondition({ where: { username: login, tenantId: tenant.id } });
        if (!tenantAccount || !tenantAccount.isActivated) return;

        const merchant = await this.merchantService.findById(tenantAccount.merchantId);
        if (!merchant?.email) return;

        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        const expires = new Date(Date.now() + 30 * 60 * 1000);

        await this.merchantRepository.updateById(merchant.id, {
            resetPasswordToken: hashedToken,
            resetPasswordExpires: expires,
        } as any);

        try {
            const emailConfig = await this.emailConfigService.findForDomain(domain);
            await mailService.sendPasswordResetEmail({
                to: merchant.email,
                username: merchant.username,
                resetToken,
                accountType: 'merchant',
                origin: domain,
                config: emailConfig,
            });
        } catch (err) {
            console.error(`[TenantAccountService] forgotPassword: gửi email thất bại cho merchantId=${merchant.id} — ${err instanceof Error ? err.message : String(err)}`);
        }
    }
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd ddd-graphql-be && npx jest src/modules/agencyAccount/application/services/__tests__ src/modules/tenantAccount/application/services/__tests__`
Expected: all PASS.

- [ ] **Step 7: Add the GraphQL mutations**

In `ddd-graphql-be/src/modules/agencyAccount/infrastructure/http/graphql/agencyAccount.resolver.ts`, add the import `ForgotPasswordInput` to the existing `import { ChangePasswordInput, LoginInput } from "@/core/shared/dto/auth.dto";` line (becomes `import { ChangePasswordInput, ForgotPasswordInput, LoginInput } from "@/core/shared/dto/auth.dto";`), and add after `loginAgencyAccount`:

```ts
    // ── Quên mật khẩu (self-service, không cần đăng nhập) ──────────────────
    @Mutation('agencyAccountForgotPassword', { returnType: Object })
    @GQLPublic()
    async agencyAccountForgotPassword(
        @Args('input', { type: ForgotPasswordInput }) input: ForgotPasswordInput,
        @Context() context: IGraphQLContext,
    ): Promise<{ success: boolean }> {
        assertAuthRateLimit(context.req, { key: 'agencyAccountForgotPassword', max: 5, windowMs: 60_000 });
        await this.agencyAccountService.forgotPassword(input.code ?? '', input.login, input.domain ?? '');
        return { success: true };
    }
```

Also add `Context` to the existing decorator import line if not already imported (`GQLQuery, GQLPublic, Context` — check the file; `Context`/`IGraphQLContext` and `assertAuthRateLimit` are already imported per the file already read).

Do the identical addition in `ddd-graphql-be/src/modules/tenantAccount/infrastructure/http/graphql/tenantAccount.resolver.ts` (`tenantAccountForgotPassword`, same body with `this.tenantAccountService.forgotPassword(...)`).

- [ ] **Step 8: Run the BE build + full module tests**

Run: `cd ddd-graphql-be && npm run build`
Expected: 0 TypeScript errors (this framework builds its schema from these decorators at boot — a build pass here does NOT itself prove the schema loads; that's verified in Task 4's Step 1).

Run: `cd ddd-graphql-be && npx jest src/modules/agencyAccount src/modules/tenantAccount`
Expected: all PASS.

- [ ] **Step 9: Commit**

```bash
cd ddd-graphql-be
git add src/core/shared/dto/auth.dto.ts src/modules/agencyAccount/application/services/agencyAccount.service.ts src/modules/agencyAccount/infrastructure/http/graphql/agencyAccount.resolver.ts src/modules/agencyAccount/application/services/__tests__/agencyAccount.service.test.ts src/modules/tenantAccount/application/services/tenantAccount.service.ts src/modules/tenantAccount/infrastructure/http/graphql/tenantAccount.resolver.ts src/modules/tenantAccount/application/services/__tests__/tenantAccount.service.test.ts
git commit -m "feat(auth): add Agency/Tenant forgot-password mutations

Agency/Tenant staff had no forgot-password route at all — the FE login
pages linked to merchantAuth.forgotPassword instead (wrong role, fixed
separately on the FE side). Both account types authenticate via their
linked Merchant's password, so the new agencyAccountForgotPassword/
tenantAccountForgotPassword mutations reset that Merchant's reset token
and reuse the existing, unchanged MerchantService.resetPasswordByToken
flow for the actual reset step — no new reset endpoint needed.

Audit: docs/superpowers/specs/2026-09-02-be-fe-reuse-audit-report.md Group 0.3

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: FE — Fix Agency/Tenant "forgot password" (wrong route) + regenerate codegen + add pages

**Files:**
- Modify: `ddd-graphql-fe/src/shared/generated/{schema.graphql,typed-graphql.ts}` (regenerated, not hand-edited)
- Create: `ddd-graphql-fe/src/modules/agency/pages/forgotPasswordAgency.page.tsx`
- Create: `ddd-graphql-fe/src/modules/tenant/pages/auth/forgotPasswordTenant.page.tsx`
- Modify: `ddd-graphql-fe/src/shared/services/agencyAccount/agencyAccount.service.ts` (add `agencyAccountForgotPassword`)
- Modify: `ddd-graphql-fe/src/shared/services/tenantAccount/tenantAccount.service.ts` (add `tenantAccountForgotPassword`)
- Modify: `ddd-graphql-fe/src/shared/common/app/AppRoutes.tsx` (register 2 new routes, fix 2 `onClick` handlers)
- Modify: `ddd-graphql-fe/src/modules/agency/pages/login.page.tsx:112` (fix wrong route)
- Modify: `ddd-graphql-fe/src/modules/tenant/pages/auth/login.page.tsx:111` (fix wrong route)
- Modify: `ddd-graphql-fe/src/shared/i18n/dictionaries/{vi.ts,en.ts}` (add i18n keys for the 2 new pages)

**Depends on:** Task 3 (BE mutations must exist and be running locally for codegen to pick them up).

- [ ] **Step 1: Start the BE dev server and regenerate FE codegen**

In a separate terminal, from `ddd-graphql-be`: start the dev server (check `package.json`'s `dev` script name first with `grep '"dev"' ddd-graphql-be/package.json`; if a port is already in use per this project's known worktree-port-collision issue, override `PORT`/read the actual bound port from the log rather than assuming the default). Confirm it's up by checking its log for a "listening"/"ready" line.

From `ddd-graphql-fe`, with `.env`'s `BACKEND_URL` pointed at that running BE instance:
```bash
cd ddd-graphql-fe
npm run gengraph
```
Expected: the script completes without error and `git diff --stat src/shared/generated/` shows `schema.graphql` and `typed-graphql.ts` changed, with `agencyAccountForgotPassword`/`tenantAccountForgotPassword` new entries. Verify:
```bash
grep -n "agencyAccountForgotPassword\|tenantAccountForgotPassword" src/shared/generated/schema.graphql src/shared/generated/typed-graphql.ts
```
Expected: matches in both files.

- [ ] **Step 2: Write the failing test for the route-config fix (route existence + correct target)**

Create/extend a test near `AppRoutes.tsx`. Check first whether a test file already exists:
```bash
find ddd-graphql-fe/src/shared/common/app -iname "*.test.*"
```
If none exists, create `ddd-graphql-fe/src/shared/common/app/AppRoutes.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { APP_ROUTES } from './AppRoutes';

describe('APP_ROUTES — agency/tenant forgot-password routes', () => {
    it('agencyAuth has its own forgotPassword route (was missing entirely)', () => {
        expect(APP_ROUTES.agencyAuth.routes).toHaveProperty('forgotPassword');
    });

    it('tenantAuth has its own forgotPassword route (was missing entirely)', () => {
        expect(APP_ROUTES.tenantAuth.routes).toHaveProperty('forgotPassword');
    });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd ddd-graphql-fe && npx vitest run src/shared/common/app/AppRoutes.test.ts`
Expected: FAIL — `agencyAuth.routes`/`tenantAuth.routes` have no `forgotPassword` key yet.

- [ ] **Step 4: Add the FE service methods**

In `ddd-graphql-fe/src/shared/services/agencyAccount/agencyAccount.service.ts`, add the `ForgotPasswordInput` type to its existing import from `@shared/generated/typed-graphql` (mirror how `merchant.service.ts` imports it), then add a static method mirroring `MerchantService.merchantForgotPassword` exactly (confirmed during planning: `merchantForgotPassword`/`merchantResetPassword` both call `this.mutationApi`, not `this.queryApi` — use `mutationApi` here too):

```ts
  static agencyAccountForgotPassword = async (args: { input: ForgotPasswordInput }) => {
    const res = await this.mutationApi({
      document: mutation("agencyAccountForgotPassword", (root) => [
        root.agencyAccountForgotPassword({ input: $('input') }),
      ]),
      variables: args,
    });
    return res.agencyAccountForgotPassword;
  };
```

Do the identical addition (`tenantAccountForgotPassword`) in `ddd-graphql-fe/src/shared/services/tenantAccount/tenantAccount.service.ts`.

- [ ] **Step 5: Create the two new pages**

Create `ddd-graphql-fe/src/modules/agency/pages/forgotPasswordAgency.page.tsx`, modeled directly on `ddd-graphql-fe/src/modules/merchant/auth/forgotPasswordMerchant.page.tsx` (read in full during planning) but with a `code` field added (matching `LoginAgencyPage`'s form) and pointed at the new service method:

```tsx
import { AuthLayout } from '@layouts/auth/AuthLayout';
import { Button } from '@core/components/button/Button';
import { Input } from '@core/components/control/Input';
import { generateForm } from '@core/components/form/generateForm';
import { useRoutes } from '@shared/contexts/routes/RoutesContext';
import { Icon } from '@shared/components/icons/Icon';
import { AgencyAccountService } from '@/shared/services/agencyAccount/agencyAccount.service';
import { createSignal } from 'solid-js';
import { t } from '@/shared/i18n/t';

export function ForgotPasswordAgencyPage() {
    const { navigateToPage } = useRoutes();
    const [submitted, setSubmitted] = createSignal(false);

    const { Form, submitting } = generateForm({
        handleSubmit: async (values: any) => {
            if (!values.code) throw new Error(t('agency.forgotPassword.errors.codeRequired'));
            if (!values.login) throw new Error(t('agency.forgotPassword.errors.loginRequired'));
            await AgencyAccountService.agencyAccountForgotPassword({
                input: {
                    code: values.code,
                    login: values.login,
                    domain: window.location.origin,
                },
            });
            setSubmitted(true);
            return { success: true };
        },
    });

    return (
        <AuthLayout title={t('agency.forgotPassword.pageTitle')}>
            <div class="mb-6 text-center animate-fade-in">
                <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-100 mb-4">
                    <Icon name="heroicons-outline:envelope" class="w-8 h-8 text-amber-600" />
                </div>
                <h1 class="text-2xl font-bold text-gray-900">{t('agency.forgotPassword.heading')}</h1>
                <p class="text-sm text-gray-500 mt-1">{t('agency.forgotPassword.subtitle')}</p>
            </div>

            {submitted() ? (
                <div class="w-full text-center space-y-4">
                    <div class="bg-green-50 border border-green-200 rounded-xl p-4">
                        <Icon name="heroicons-outline:check-circle" class="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <p class="text-sm text-green-700 font-medium">
                            {t('agency.forgotPassword.successMessage')}
                        </p>
                        <p class="text-xs text-green-600 mt-1">{t('agency.forgotPassword.successHint')}</p>
                    </div>
                    <Button
                        wide
                        class="h-11 w-full rounded-lg"
                        label={t('agency.forgotPassword.backToLoginButton')}
                        onClick={() => navigateToPage('agencyAuth.login')}
                    />
                </div>
            ) : (
                <Form class="w-full flex flex-col gap-y-5">
                    <Form.Fieldset class="flex flex-col gap-y-4">
                        <Form.Field name="code" label={t('agency.forgotPassword.codeFieldLabel')} required>
                            <Input autoFocus placeholder={t('agency.forgotPassword.codePlaceholder')} class="h-11 w-full rounded-lg" />
                        </Form.Field>
                        <Form.Field name="login" label={t('agency.forgotPassword.loginFieldLabel')} required>
                            <Input placeholder={t('agency.forgotPassword.loginPlaceholder')} class="h-11 w-full rounded-lg" />
                        </Form.Field>
                        <Form.Error class="text-sm text-red-600 font-medium" />
                        <Button
                            wide main submit
                            class="h-12 w-full text-base font-bold rounded-lg mt-2"
                            label={t('agency.forgotPassword.submitLabel')}
                            loading={submitting()}
                        />
                    </Form.Fieldset>
                </Form>
            )}

            <div class="mt-8 text-center">
                <button
                    onClick={() => navigateToPage('agencyAuth.login')}
                    class="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                    {t('agency.forgotPassword.backToLoginLink')}
                </button>
            </div>
        </AuthLayout>
    );
}
```

Create `ddd-graphql-fe/src/modules/tenant/pages/auth/forgotPasswordTenant.page.tsx` — identical structure, `TenantAccountService.tenantAccountForgotPassword`, `t('tenant.forgotPassword.*')` keys, `navigateToPage('tenantAuth.login')`.

- [ ] **Step 6: Register the routes and fix the two wrong `onClick` handlers**

In `ddd-graphql-fe/src/shared/common/app/AppRoutes.tsx`:

Add imports near the existing Agency/Tenant import blocks:
```ts
import { ForgotPasswordAgencyPage } from '@/modules/agency/pages/forgotPasswordAgency.page';
```
```ts
import { ForgotPasswordTenantPage } from '@/modules/tenant/pages/auth/forgotPasswordTenant.page';
```

Change the `tenantAuth.routes` block (currently lines 119-122):
```ts
    routes: {
      login: { path: '/login', page: LoginTenantPage },
      register: { path: '/register', page: RegisterStaffPage },
      forgotPassword: { path: '/forgotPassword', page: ForgotPasswordTenantPage },
    },
```

Change the `agencyAuth.routes` block (currently lines 168-170):
```ts
    routes: {
      login: { path: '/login', page: LoginAgencyPage },
      forgotPassword: { path: '/forgotPassword', page: ForgotPasswordAgencyPage },
    },
```

In `ddd-graphql-fe/src/modules/agency/pages/login.page.tsx:112`, change:
```tsx
onClick={() => navigateToPage('merchantAuth.forgotPassword')}
```
to:
```tsx
onClick={() => navigateToPage('agencyAuth.forgotPassword')}
```

In `ddd-graphql-fe/src/modules/tenant/pages/auth/login.page.tsx:111`, change:
```tsx
onClick={() => navigateToPage('merchantAuth.forgotPassword')}
```
to:
```tsx
onClick={() => navigateToPage('tenantAuth.forgotPassword')}
```

- [ ] **Step 7: Add i18n keys**

Check the existing key style for `merchant.forgotPassword.*` in `ddd-graphql-fe/src/shared/i18n/dictionaries/vi.ts` and `en.ts` (or wherever `merchant.forgotPassword.pageTitle` etc. actually live — the project merges per-module `*.i18n.ts` files into these dictionaries per FE-3 audit finding 9; run `grep -rn "forgotPassword.pageTitle" ddd-graphql-fe/src` to find the real source file before editing). Add an `agency.forgotPassword.*` and `tenant.forgotPassword.*` block with the same key set used above (`pageTitle`, `heading`, `subtitle`, `successMessage`, `successHint`, `backToLoginButton`, `backToLoginLink`, `codeFieldLabel`, `codePlaceholder`, `loginFieldLabel`, `loginPlaceholder`, `submitLabel`, `errors.codeRequired`, `errors.loginRequired`) in both `vi` and `en`, mirroring the Vietnamese/English tone of the sibling `merchant.forgotPassword`/`agency.login`/`tenant.login` entries already in that file.

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd ddd-graphql-fe && npx vitest run src/shared/common/app/AppRoutes.test.ts`
Expected: PASS.

Run the full FE test suite to catch any import/type errors from the new files:
Run: `cd ddd-graphql-fe && npm run test`
Expected: all PASS (0 new failures vs. the pre-existing baseline — if any pre-existing unrelated failures exist, confirm they also fail on a clean checkout before this task, don't try to fix unrelated failures here).

- [ ] **Step 9: Live-verify in a browser**

Per this project's established convention (live click-through catches what static review misses — see project memory), start the FE dev server pointed at the BE dev server from Step 1, and manually:
1. Go to `/agency/login`, click "Forgot password" → lands on `/agency/forgotPassword` (not `/merchant/forgotPassword`).
2. Submit the form with a real agency code + a real AgencyAccount username → confirm the mutation succeeds (network tab / no error toast) and (if a test SMTP/mail catcher is configured) an email arrives with `type=merchant` in the reset link.
3. Repeat for `/tenant/login` → `/tenant/forgotPassword`.
4. Follow a reset link (or manually build one with a token minted via Step 1's BE + the DB row's `resetPasswordToken` decrypted... more simply: check the emailed/logged reset link directly) to `/reset-password?token=...&type=merchant`, set a new password, then confirm the agency/tenant account can log in with it (since it proxies through the Merchant password).

If any of these fail, fix before proceeding — do not mark this task done on static review alone, per this project's established pattern of catching real bugs only via live verification.

- [ ] **Step 10: Commit**

```bash
cd ddd-graphql-fe
git add src/shared/generated/schema.graphql src/shared/generated/typed-graphql.ts src/modules/agency/pages/forgotPasswordAgency.page.tsx src/modules/tenant/pages/auth/forgotPasswordTenant.page.tsx src/shared/services/agencyAccount/agencyAccount.service.ts src/shared/services/tenantAccount/tenantAccount.service.ts src/shared/common/app/AppRoutes.tsx src/shared/common/app/AppRoutes.test.ts src/modules/agency/pages/login.page.tsx src/modules/tenant/pages/auth/login.page.tsx src/shared/i18n/dictionaries/vi.ts src/shared/i18n/dictionaries/en.ts
git commit -m "fix(auth): give Agency/Tenant their own forgot-password route

'Forgot password' on the Agency/Tenant login pages pointed at
merchantAuth.forgotPassword (wrong role, copy-paste bug) and neither
role even had its own route — a live account-recovery dead-end. Add
forgotPasswordAgency.page.tsx / forgotPasswordTenant.page.tsx (calling
the new BE mutations from the paired ddd-graphql-be commit), register
their routes, and fix both onClick handlers to point at their own role.

Audit: docs/superpowers/specs/2026-09-02-be-fe-reuse-audit-report.md Group 0.3

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: BE — Make `setPermissions` transactional (and use the existing bulk-delete)

**Files:**
- Modify: `ddd-graphql-be/src/modules/accountPermission/application/services/accountPermission.service.ts:248-272`
- Test: `ddd-graphql-be/src/modules/accountPermission/application/services/__tests__/accountPermission.service.test.ts` (new, or extend if one already exists — check first)

**Interfaces:**
- Consumes: `AccountPermissionRepository.deleteWhere(where)` (already exists, zero callers today — `ddd-graphql-be/src/modules/accountPermission/infrastructure/persistence/accountPermission.repository.ts:15-17`); the repository's underlying `this.manager()`/`.transaction()` helper — check its exact name/shape first: `grep -n "transaction(" ddd-graphql-be/src/modules/node/application/services/node.service.ts` (the plan doc's reference example at `node.service.ts:137`) to copy the exact call pattern used elsewhere in this codebase.
- Produces: `setPermissions(input: ISetPermissionsInput): Promise<void>` — same signature.

- [ ] **Step 1: Confirmed transaction pattern (verified during planning)**

`node.service.ts:137` uses `await this.manager().transaction(async (trx) => { const trxRepo = trx.getRepository(NodeEntity); ... })`. `this.manager()` comes from `BaseService` itself (`ddd-graphql-be/src/core/application/services/base.service.ts:25-27`: `manager(): EntityManager { return this.repository.manager(); }`) — available on every service extending `BaseService`, including `AccountPermissionService`. Use this exact shape in Step 4, no `AppDataSource` import needed.

- [ ] **Step 2: Write the failing test**

Check first if `ddd-graphql-be/src/modules/accountPermission/application/services/__tests__/accountPermission.service.test.ts` already exists:
```bash
find ddd-graphql-be/src/modules/accountPermission -iname "*.test.ts"
```
If it exists, add these tests to it; if not, create it with fakes matching this file's constructor injection pattern (check `AccountPermissionService`'s constructor signature first with `grep -n "constructor(" -A10 ddd-graphql-be/src/modules/accountPermission/application/services/accountPermission.service.ts`).

```ts
describe('AccountPermissionService.setPermissions', () => {
    it('calls deleteWhere ONCE with the tenantAccountId (bulk delete), not per-row deleteById', async () => {
        const tenantAccountRepo = { findOneByCondition: jest.fn(async () => ({ id: 'ta1', tenantId: 't1', agencyId: 'ag1' })) };
        const permRepo = {
            findByCondition: jest.fn(async () => [{ id: 'p1' }, { id: 'p2' }]),
            deleteWhere: jest.fn(async () => {}),
            deleteById: jest.fn(async () => {}),
            createMany: jest.fn(async () => []),
        };
        const service = makeServiceWithFakes({ tenantAccountRepo, permRepo }); // adapt to actual constructor

        await service.setPermissions({ tenantAccountId: 'ta1', tenantId: 't1', accountScope: 'X' as any, permissions: [] });

        expect(permRepo.deleteWhere).toHaveBeenCalledWith({ tenantAccountId: 'ta1' });
        expect(permRepo.deleteById).not.toHaveBeenCalled();
    });

    it('rolls back the delete if createMany throws mid-write (transactional — no zero-permission window)', async () => {
        const tenantAccountRepo = { findOneByCondition: jest.fn(async () => ({ id: 'ta1', tenantId: 't1', agencyId: 'ag1' })) };
        const permRepo = {
            findByCondition: jest.fn(async () => [{ id: 'p1' }]),
            deleteWhere: jest.fn(async () => {}),
            createMany: jest.fn(async () => { throw new Error('DB crash mid-write'); }),
        };
        const service = makeServiceWithFakes({ tenantAccountRepo, permRepo });

        await expect(
            service.setPermissions({ tenantAccountId: 'ta1', tenantId: 't1', accountScope: 'X' as any, permissions: [{ permission: 'P' as any, scopeRule: {} as any }] }),
        ).rejects.toThrow('DB crash mid-write');
        // The exact transaction-rollback assertion depends on the transaction helper's shape found
        // in Step 1 — at minimum assert the error propagates (doesn't get swallowed) so the caller/
        // client sees the failure rather than silently believing the update succeeded.
    });
});
```

Write `makeServiceWithFakes` matching whatever DI pattern `AccountPermissionService`'s real constructor uses (read the constructor before writing this helper — do not guess a shape that doesn't compile).

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd ddd-graphql-be && npx jest src/modules/accountPermission/application/services/__tests__`
Expected: FAIL on the `deleteWhere` assertion (currently calls `deleteById` N times, never `deleteWhere`).

- [ ] **Step 4: Fix `setPermissions`**

Replace `ddd-graphql-be/src/modules/accountPermission/application/services/accountPermission.service.ts:248-272`, using the exact transaction API found in Step 1 (shown here as `AppDataSource.transaction`, the most likely shape per TypeORM convention — CORRECT to whatever Step 1 actually found before writing):

```ts
    async setPermissions(input: ISetPermissionsInput): Promise<void> {
        const tenantAccount = await this.tenantAccountRepo.findOneByCondition({
            where: { id: input.tenantAccountId, tenantId: input.tenantId },
        });
        if (!tenantAccount) return;

        // FIX (audit Group 0.4): was 3 un-transacted phases (fetch, N sequential deleteById,
        // createMany) with the repository's own bulk deleteWhere sitting unused — a crash between
        // the delete phase and the insert phase left the account with ZERO permissions (silent
        // lockout). Wrap delete+insert in one transaction (same this.manager().transaction(...)
        // pattern already established in node.service.ts:137) so a mid-write failure rolls back to
        // the PRE-EDIT state instead of a half-applied one.
        await this.manager().transaction(async (trx) => {
            const trxPermRepo = trx.getRepository(AccountPermissionEntity);
            await trxPermRepo.delete({ tenantAccountId: tenantAccount.id } as any);

            if (!input.permissions.length) return;

            const entities: DeepPartial<AccountPermissionEntity>[] = input.permissions.map(p => ({
                tenantId: tenantAccount.tenantId,
                tenantAccountId: tenantAccount.id,
                agencyId: tenantAccount.agencyId,
                accountScope: input.accountScope,
                permission: p.permission,
                scopeRule: p.scopeRule,
            }));
            await trxPermRepo.save(entities);
        });
    }
```

`AccountPermissionEntity` is almost certainly already imported in this file (it's the service's own generic type param) — check with `grep -n "^import.*AccountPermissionEntity" ddd-graphql-be/src/modules/accountPermission/application/services/accountPermission.service.ts` and only add the import if it's genuinely missing. No `AppDataSource` import is needed — `this.manager()` is inherited from `BaseService`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd ddd-graphql-be && npx jest src/modules/accountPermission/application/services/__tests__`
Expected: PASS.

- [ ] **Step 6: Run the full accountPermission module suite**

Run: `cd ddd-graphql-be && npx jest src/modules/accountPermission`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
cd ddd-graphql-be
git add src/modules/accountPermission/application/services/accountPermission.service.ts src/modules/accountPermission/application/services/__tests__/accountPermission.service.test.ts
git commit -m "fix(accountPermission): make setPermissions transactional, use bulk delete

Was 3 un-transacted phases (fetch, N sequential deleteById, createMany)
with the repository's own bulk deleteWhere sitting unused — a crash
between delete and insert left an account with zero permissions. Wrap
both in one transaction.

Audit: docs/superpowers/specs/2026-09-02-be-fe-reuse-audit-report.md Group 0.4

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: BE — Add `@GQLPermission` to Media/MediaSet mutations

**Files:**
- Modify: `ddd-graphql-be/src/modules/media/infrastructure/http/graphql/media.resolver.ts`
- Modify: `ddd-graphql-be/src/modules/mediaSet/infrastructure/http/graphql/mediaSet.resolver.ts`
- Test: `ddd-graphql-be/src/modules/media/infrastructure/http/graphql/__tests__/media.resolver.test.ts` (new — check if a decorator-level test convention exists first)

**Interfaces:** no new interfaces — `EPermission.MEDIA_MANAGE` already exists (`ddd-graphql-be/src/modules/permission/enums/permission.enum.ts:53`), already has `PERMISSION_META`/`PERMISSION_GROUPS` entries, already surfaced in the grant UI — it's simply never referenced from either resolver.

- [ ] **Step 1: Metadata key confirmed during planning**

`@GQLPermission` writes to `Reflect.defineMetadata(GQL_PERMISSION_META, config, target, propertyKey)` where `GQL_PERMISSION_META = 'gql:permission'` (`ddd-graphql-be/src/core/shared/decorators/graphQLPermission.decorator.ts:145,215`). Use the literal string `'gql:permission'` directly in tests below (no placeholder).

Create `ddd-graphql-be/src/modules/media/infrastructure/http/graphql/__tests__/media.resolver.test.ts`:

```ts
import 'reflect-metadata';
import { MediaResolver } from '../media.resolver';

describe('MediaResolver mutations require @GQLPermission(MEDIA_MANAGE)', () => {
    const resolver = new MediaResolver();

    it.each(['createMedia', 'updateMedia'])('%s has GQLPermission metadata for MEDIA_MANAGE', (method) => {
        const meta = Reflect.getMetadata('gql:permission', resolver, method) as { permission?: string } | undefined;
        expect(meta).toBeDefined();
        expect(meta!.permission).toBe('MEDIA_MANAGE');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ddd-graphql-be && npx jest src/modules/media/infrastructure/http/graphql/__tests__`
Expected: FAIL — no `@GQLPermission` metadata present yet on `createMedia`/`updateMedia`.

- [ ] **Step 3: Add the decorator to Media mutations**

In `ddd-graphql-be/src/modules/media/infrastructure/http/graphql/media.resolver.ts`, add the import:
```ts
import { GQLPermission } from "@/core/shared/decorators/graphQLPermission.decorator";
import { EPermission } from "@/modules/permission/enums/permission.enum";
```

Add `@GQLPermission({ permission: EPermission.MEDIA_MANAGE, onForbidden: 'throw' })` above `@GQLAuthorized(...)` on `createMedia` and `updateMedia` (match the decorator ORDER already used in `activityLog.resolver.ts`/`unit.resolver.ts` — `@GQLAuthorized` first, then `@GQLPermission`, both above the method):

```ts
  @GQLAuthorized(Object.values(ERole))
  @GQLPermission({ permission: EPermission.MEDIA_MANAGE, onForbidden: 'throw' })
  @Mutation('createMedia', { returnType: () => MediaEntity })
  async createMedia(
```
(and identically for `updateMedia`). `generatePresignedUrl` is a prerequisite-only step (no persisted mutation) — leave it as `@GQLAuthorized`-only unless the team wants upload URLs gated too; the audit only flagged `createMedia`/`updateMedia` explicitly, so scope this fix to those two plus the module's implicit delete if one exists (check — this resolver excerpt shows no `deleteMedia` mutation; if `MediaService`/another file exposes one, apply the same fix there too).

- [ ] **Step 4: Add the decorator to MediaSet mutations**

In `ddd-graphql-be/src/modules/mediaSet/infrastructure/http/graphql/mediaSet.resolver.ts`, add the same two imports, then add `@GQLPermission({ permission: EPermission.MEDIA_MANAGE, onForbidden: 'throw' })` above `@GQLAuthorized(Object.values(ERole))` on `createMediaSet`, `updateMediaSet`, and `deleteMediaSet`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd ddd-graphql-be && npx jest src/modules/media/infrastructure/http/graphql/__tests__`
Expected: PASS. Extend the same test file (or add a sibling `mediaSet.resolver.test.ts`) covering `createMediaSet`/`updateMediaSet`/`deleteMediaSet` the same way, and confirm it passes too.

- [ ] **Step 6: Live-verify a staff account WITHOUT `MEDIA_MANAGE` granted is now rejected**

Per this project's standing QA policy (never forge credentials — use the disposable-account + real login mutation pattern), create a disposable tenant staff account with no permissions granted via the real `setPermissions` mutation (now transactional per Task 5), log in as that account through the real login flow, and attempt `createMedia` — confirm it's now rejected (`onForbidden: 'throw'`) where it previously succeeded.

- [ ] **Step 7: Commit**

```bash
cd ddd-graphql-be
git add src/modules/media/infrastructure/http/graphql/media.resolver.ts src/modules/media/infrastructure/http/graphql/__tests__/media.resolver.test.ts src/modules/mediaSet/infrastructure/http/graphql/mediaSet.resolver.ts
git commit -m "fix(media): enforce MEDIA_MANAGE permission on Media/MediaSet mutations

createMedia/updateMedia/createMediaSet/updateMediaSet/deleteMediaSet had
only @GQLAuthorized(any staff role) — any authenticated staff account
could manage media regardless of their granted permission bundle, unlike
every sibling module (Form/Menu/Page/ContentEntry). EPermission.MEDIA_MANAGE
already existed and was already surfaced in the grant UI; it just wasn't
referenced from either resolver.

Audit: docs/superpowers/specs/2026-09-02-be-fe-reuse-audit-report.md Group 0.5

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: BE — Enforce `UNIT_MANAGE`/`STAFF_*` permissions on Unit/TenantAccount/AgencyAccount resolvers

**Files:**
- Modify: `ddd-graphql-be/src/modules/unit/infrastructure/http/graphql/unit.resolver.ts`
- Modify: `ddd-graphql-be/src/modules/tenantAccount/infrastructure/http/graphql/tenantAccount.resolver.ts`
- Modify: `ddd-graphql-be/src/modules/agencyAccount/infrastructure/http/graphql/agencyAccount.resolver.ts`
- Test: extend/create `__tests__` alongside each (same metadata-inspection pattern as Task 6)

**Design decision (audit's option (a), preferred over deleting the unused permissions):** wire `@GQLPermission` into these resolvers AND relax the current hard `@GQLAuthorized` role gate to also include the STAFF-level role, so the fine-grained permission layer does the real gating — matching how `activityLog.resolver.ts` already does it (`VIEW_ROLES` includes `TENANT_STAFF`, gating happens via `@GQLPermission`, not by excluding STAFF from `@GQLAuthorized` entirely). Today `TENANT_STAFF` is hard-rejected by `@GQLAuthorized` before the permission check would ever run, so a staff member granted `UNIT_MANAGE`/`STAFF_*` via the grant UI still can't use it — the grant is currently decorative.

- [ ] **Step 1: Write the failing tests** (one per resolver, metadata-inspection style per Task 6's pattern — use the real metadata key found there)

`ddd-graphql-be/src/modules/unit/infrastructure/http/graphql/__tests__/unit.resolver.test.ts`:
```ts
import 'reflect-metadata';
import { UnitResolver } from '../unit.resolver';
import { ERole } from '@/core/shared/enums/account.enum';

describe('UnitResolver mutations', () => {
    const resolver = new UnitResolver();

    it.each(['createUnit', 'updateUnit', 'deleteUnit'])('%s has GQLPermission metadata for UNIT_MANAGE', (method) => {
        const meta = Reflect.getMetadata('gql:permission', resolver, method) as { permission?: string } | undefined;
        expect(meta?.permission).toBe('UNIT_MANAGE');
    });

    it.each(['createUnit', 'updateUnit', 'deleteUnit'])('%s now allows TENANT_STAFF at the @GQLAuthorized layer (fine-grained check gates it instead)', (method) => {
        // @GQLAuthorized writes the role list under METADATA_KEYS.ROLES = 'roles'
        // (ddd-graphql-be/src/core/shared/types/common.types.ts:181, written at
        // graphQL.decorators.ts:157) — confirmed during planning, not a placeholder.
        const roles = Reflect.getMetadata('roles', resolver, method) as string[] | undefined;
        expect(roles).toContain(ERole.TENANT_STAFF);
    });
});
```

Write the equivalent for `tenantAccount.resolver.ts` (`createTenantAccount`/`updateTenantAccount`/`deleteTenantAccount`, permission `STAFF_CREATE`/`STAFF_UPDATE`/`STAFF_DELETE` respectively — NOT all three the same permission, since the enum has separate CREATE/UPDATE/DELETE variants) and `agencyAccount.resolver.ts` (same three methods, same per-action permission split).

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ddd-graphql-be && npx jest src/modules/unit src/modules/tenantAccount src/modules/agencyAccount -t "GQLPermission\|GQLAuthorized"`
Expected: FAIL — no `@GQLPermission` present, `TENANT_STAFF` not in the current `@GQLAuthorized` lists.

- [ ] **Step 3: Fix `unit.resolver.ts`**

Add imports `GQLPermission` and `EPermission` (as in Task 6). Change `createUnit`/`updateUnit`/`deleteUnit`'s `@GQLAuthorized` list to include `ERole.TENANT_STAFF`, and add `@GQLPermission`:

```ts
    @Mutation('createUnit', { returnType: UnitEntity })
    @GQLAuthorized([ERole.TENANT_OWNER, ERole.TENANT_MANAGER, ERole.TENANT_STAFF])
    @GQLPermission({ permission: EPermission.UNIT_MANAGE, onForbidden: 'throw' })
    async createUnit(
```
(same pattern for `updateUnit`, `deleteUnit`; leave `seedDefaultUnits` and the two `@Query` methods untouched — the audit's finding was specifically about the mutations bypassing the fine-grained layer, and `seedDefaultUnits` is `TENANT_OWNER`-only already, a deliberately narrower gate).

- [ ] **Step 4: Fix `tenantAccount.resolver.ts`**

Add the same two imports. On `createTenantAccount`, add `ERole.TENANT_STAFF` to the `@GQLAuthorized` list and add `@GQLPermission({ permission: EPermission.STAFF_CREATE, onForbidden: 'throw' })`. On `updateTenantAccount`, `@GQLPermission({ permission: EPermission.STAFF_UPDATE, onForbidden: 'throw' })`. On `deleteTenantAccount`, `@GQLPermission({ permission: EPermission.STAFF_DELETE, onForbidden: 'throw' })`. Leave `getMyTenantAccount`/`getOneTenantAccount`/`getAllTenantAccount`/`generateTokenTenantAccount`/`loginTenantAccount`/`tenantAccountGetMe`/`tenantAccountChangePassword` untouched (reads and self-service auth are out of this fix's scope — the audit's finding is about the staff-management mutations specifically; if broader read-gating with `STAFF_VIEW` is wanted later, that's a separate decision, not bundled into this bugfix).

- [ ] **Step 5: Fix `agencyAccount.resolver.ts`** — identical treatment for `createAgencyAccount`/`updateAgencyAccount`/`deleteAgencyAccount`, adding `ERole.AGENCY_MANAGER` if not already present (check: `updateAgencyAccount`/`deleteAgencyAccount` currently only allow `[ERole.SUPER_ADMIN, ERole.AGENCY_OWNER]`, no manager-level role at all — that's a narrower pre-existing gate than TenantAccount's; do not silently widen it beyond what's needed for this fix — keep the existing role list AS-IS except add whatever role the permission system's `STAFF_*` grants are actually meant to reach; if `AGENCY_MANAGER` was never in scope for these before, leave the `@GQLAuthorized` list unchanged and ONLY add `@GQLPermission`, so this task doesn't silently expand who can call the mutation beyond fixing the permission-check gap):

```ts
    @Mutation('createAgencyAccount', { returnType: AgencyAccountEntity })
    @GQLAuthorized([ERole.SUPER_ADMIN, ERole.ADMIN, ERole.AGENCY_OWNER])
    @GQLPermission({ permission: EPermission.STAFF_CREATE, onForbidden: 'throw' })
    async createAgencyAccount(
```
(and `STAFF_UPDATE`/`STAFF_DELETE` on the other two, same `@GQLAuthorized` lists as today, unchanged).

Adjust Step 1's `agencyAccount.resolver.test.ts` to NOT assert `TENANT_STAFF`/`AGENCY_MANAGER` inclusion for this resolver specifically, since Step 5 deliberately does not widen its `@GQLAuthorized` lists — only assert the `@GQLPermission` metadata is present with the correct per-action permission.

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd ddd-graphql-be && npx jest src/modules/unit src/modules/tenantAccount src/modules/agencyAccount`
Expected: all PASS.

- [ ] **Step 7: Live-verify** — using the disposable-account pattern (per standing QA policy), grant a TENANT_STAFF disposable account `UNIT_MANAGE` via the real `setPermissions` mutation, log in as it, and confirm `createUnit` now succeeds (previously hard-rejected by `@GQLAuthorized` before this fix). Also confirm a TENANT_STAFF account WITHOUT the grant is still rejected.

- [ ] **Step 8: Commit**

```bash
cd ddd-graphql-be
git add src/modules/unit/infrastructure/http/graphql/unit.resolver.ts src/modules/unit/infrastructure/http/graphql/__tests__/unit.resolver.test.ts src/modules/tenantAccount/infrastructure/http/graphql/tenantAccount.resolver.ts src/modules/tenantAccount/infrastructure/http/graphql/__tests__/tenantAccount.resolver.test.ts src/modules/agencyAccount/infrastructure/http/graphql/agencyAccount.resolver.ts src/modules/agencyAccount/infrastructure/http/graphql/__tests__/agencyAccount.resolver.test.ts
git commit -m "fix(permission): wire UNIT_MANAGE/STAFF_* grants into their resolvers

These EPermission values were defined, documented, and surfaced in the
grant UI, but their resolvers never called @GQLPermission — only a
coarse @GQLAuthorized role gate that hard-excluded TENANT_STAFF, so a
staff member granted these permissions still couldn't use them. Add
@GQLPermission and (for Unit/TenantAccount, which are meant to be
staff-delegable) include the STAFF role in @GQLAuthorized so the
fine-grained layer does the real gating.

Audit: docs/superpowers/specs/2026-09-02-be-fe-reuse-audit-report.md Group 0.6

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 8: FE — Fix `FormEmbedNode` never applying its own style

**Files:**
- Modify: `ddd-graphql-fe/src/modules/cms/node/primitives/FormEmbedNode.tsx`
- Test: `ddd-graphql-fe/src/modules/cms/node/primitives/FormEmbedNode.test.tsx` (new — check for an existing sibling primitive test to model conventions on first: `find ddd-graphql-fe/src/modules/cms/node/primitives -iname "*.test.*"`)

**Interfaces:**
- Consumes: `applyNodeStyle(style: StyleObject, responsiveOverrides?: ResponsiveOverrides, breakpoint?: Breakpoint): Record<string,string>` from `'../applyNodeStyle'` (already used identically by `ButtonNode.tsx` and every other styled primitive).

- [ ] **Step 1: Check for an existing primitive test to model the convention on**

Run: `find ddd-graphql-fe/src/modules/cms/node/primitives -iname "*.test.*"`. If none exist, write a minimal logic-level test instead of a full Solid render test (the codebase's component tests, per `Checkbox.test.tsx` etc. under `core/components/control`, use `@solidjs/testing-library` — check the top of one such file for the exact render/query API before writing this test):

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render } from '@solidjs/testing-library';
import { FormEmbedNode } from './FormEmbedNode';

// FormEmbedNode fetches via FormService.getOneForm — stub it so the test is deterministic and
// doesn't hit the network.
vi.mock('@/shared/services/form/form.service', () => ({
    FormService: {
        getOneForm: vi.fn(async () => ({
            id: 'f1',
            fields: [],
            visibilityRules: {},
            submitLabel: 'Gửi',
            successMessage: 'OK',
        })),
    },
}));

describe('FormEmbedNode', () => {
    it('applies node.style to its root element (was silently ignored)', async () => {
        const node = {
            id: 'n1',
            props: { formId: 'f1' },
            style: { backgroundColor: '#ff0000' },
            responsiveOverrides: undefined,
        } as any;
        const context = { device: () => 'desktop', contextEntry: undefined, contextEntryIndex: undefined, contextEntryContentTypeId: undefined, contextMixedSources: undefined } as any;

        const { findByText, container } = render(() => <FormEmbedNode node={node} context={context} />);
        await findByText('Gửi'); // wait for the async form resource to resolve and the submit button to render

        const root = container.querySelector('div');
        expect(root).not.toBeNull();
        // Before the fix: root has no inline background-color at all, regardless of node.style.
        expect(root!.getAttribute('style') ?? '').toContain('background-color');
    });
});
```

Adjust the exact `NodeComponentProps` shape / render helper import path to match whatever a real neighboring test in this codebase actually uses — check `find ddd-graphql-fe/src/modules/cms -iname "*.test.tsx" | head -3` and read one before finalizing this test's imports, since the exact testing-library setup (custom render wrapper, provider requirements) may differ from a bare `@solidjs/testing-library` `render`.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ddd-graphql-fe && npx vitest run src/modules/cms/node/primitives/FormEmbedNode.test.tsx`
Expected: FAIL — root `<div>` has no `style` attribute at all today.

- [ ] **Step 3: Apply the fix**

In `ddd-graphql-fe/src/modules/cms/node/primitives/FormEmbedNode.tsx`, add the import:
```tsx
import { applyNodeStyle } from '../applyNodeStyle';
```

Change the root `<div>` (currently line 95, `<div class="flex flex-col gap-4">`) to:
```tsx
<div
    class="flex flex-col gap-4"
    style={applyNodeStyle(props.node.style ?? {}, props.node.responsiveOverrides, props.context.device())}
>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ddd-graphql-fe && npx vitest run src/modules/cms/node/primitives/FormEmbedNode.test.tsx`
Expected: PASS.

- [ ] **Step 5: Live-verify in the Node Builder**

Open the Node Builder editor, add a Form Embed node, open its Style tab, set a background color, save, and confirm it now actually renders on the published/preview page (previously silently did nothing per the audit's finding).

- [ ] **Step 6: Commit**

```bash
cd ddd-graphql-fe
git add src/modules/cms/node/primitives/FormEmbedNode.tsx src/modules/cms/node/primitives/FormEmbedNode.test.tsx
git commit -m "fix(cms): FormEmbedNode now actually applies its configured style

Registered with capabilities.style: true (Style/Effects/Shadow tabs shown
and editable in the Inspector) but never called applyNodeStyle — any
background/border/padding/typography set on a Form node was silently
persisted but never rendered, unlike every other style:true primitive.

Audit: docs/superpowers/specs/2026-09-02-be-fe-reuse-audit-report.md Group 0.7

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 9: FE — SSR GraphQL client: `network-only` instead of `cache-first`

**Files:**
- Modify: `ddd-graphql-fe/src/core/api/graphql.ts:102-111` (`defaultContext` getter)
- Test: `ddd-graphql-fe/src/core/api/graphql.ssr.test.ts` (new — runs under `vitest.ssr.config.ts`)
- Test: `ddd-graphql-fe/src/core/api/graphql.test.ts` (new — runs under the default `vitest.config.ts`)

**Interfaces:** no signature change — `GraphQL.defaultContext` still returns `Partial<OperationContext>`, just with a conditional `requestPolicy`.

**Test convention confirmed during planning:** this repo already runs two separate Vitest projects specifically to exercise real SSR vs. client behavior — `vitest.ssr.config.ts` resolves Solid/Vite through server (`node`) conditions so `import.meta.env.SSR` is genuinely `true` there (see e.g. `src/core/components/control/InputDate.ssr.test.tsx`'s header comment), while the default `vitest.config.ts` is the client/browser build where it's `false`. So this fix needs one `*.ssr.test.ts` file (picked up only by `vitest.ssr.config.ts`, per its `include: ['src/**/*.ssr.test.ts', ...]`) and one plain `*.test.ts` file (picked up only by the default config) — not one file toggling the value at runtime.

- [ ] **Step 1: Write the failing tests**

Create `ddd-graphql-fe/src/core/api/graphql.ssr.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { GraphQL } from './graphql';

describe('GraphQL.defaultContext — SSR', () => {
    it('uses network-only server-side — no server-process-lifetime stale cache (see fix comment in graphql.ts)', () => {
        expect(GraphQL.defaultContext.requestPolicy).toBe('network-only');
    });
});
```

Create `ddd-graphql-fe/src/core/api/graphql.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { GraphQL } from './graphql';

describe('GraphQL.defaultContext — client', () => {
    it('keeps cache-first on the client — resetClient() on every mutation still handles invalidation there', () => {
        expect(GraphQL.defaultContext.requestPolicy).toBe('cache-first');
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ddd-graphql-fe && npm run test:ssr` — expect the SSR test to FAIL (`requestPolicy` is unconditionally `'cache-first'` today, not yet `'network-only'`).
Run: `cd ddd-graphql-fe && npm run test:client -- src/core/api/graphql.test.ts` — expect this one to already PASS (no behavior change needed on the client side); it's a regression guard, not a red step, keep it in the plan so Step 4 proves nothing broke.

- [ ] **Step 3: Apply the fix**

In `ddd-graphql-fe/src/core/api/graphql.ts`, replace the `defaultContext` getter (currently lines 102-111):

```ts
  static get defaultContext() {
    return {
      // FIX (audit Group 0.8): this app's @astrojs/node adapter runs a real, LONG-LIVED server
      // process (not a per-request runtime) — 'cache-first' there meant a page's GraphQL results,
      // once cached, stayed cached for the process's entire lifetime, with NO invalidation path
      // reachable from the server: resetClient() only ever runs client-side (see its 3 call sites —
      // AuthProvider's login/logout, createData.tsx's refresh(), Select.tsx — all browser-only
      // code). A content edit published through the admin SPA never touches this server-side
      // cache, so the public site could keep serving pre-edit content indefinitely until the
      // process restarts. SSR requests now always go network-only; the in-browser client cache
      // (still 'cache-first', still invalidated by resetClient() on every mutation) is unaffected.
      requestPolicy: import.meta.env.SSR ? 'network-only' : 'cache-first',
      fetchOptions: {
        method: 'POST',
        credentials: 'include',
        headers: GraphQL.defaultHeaders,
      },
    } as Partial<OperationContext>;
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ddd-graphql-fe && npm run test:ssr` — expect PASS.
Run: `cd ddd-graphql-fe && npm run test:client -- src/core/api/graphql.test.ts` — expect PASS.

- [ ] **Step 5: Run the full FE test suite**

Run: `cd ddd-graphql-fe && npm run test` (runs `test:ssr` then the full client suite per `package.json`'s script) — confirm no regressions elsewhere that depended on SSR requests being cached (unlikely, but check).

- [ ] **Step 6: Live-verify the actual staleness bug is fixed**

Per this project's established convention, verify live rather than trusting the unit test alone: with the FE dev server running (`@astrojs/node` in dev doesn't perfectly replicate the production standalone-server long-lived-process behavior, so also check via a production build if time allows — `npm run build && npm run start`-equivalent, check `package.json` for the actual script names):
1. Load a public CMS page once (so its data would previously have been cached for the process's lifetime).
2. Through the admin SPA, publish an edit to that same page's content.
3. Reload the public page (same server process, no restart) → confirm the edit now appears immediately (previously would have kept showing the pre-edit version).

- [ ] **Step 7: Commit**

```bash
cd ddd-graphql-fe
git add src/core/api/graphql.ts src/core/api/graphql.ssr.test.ts src/core/api/graphql.test.ts
git commit -m "fix(api): SSR GraphQL requests use network-only, not cache-first

The @astrojs/node adapter runs a long-lived process, and resetClient()
(the only cache-invalidation path) only ever runs in the browser —
published content edits could stay invisible on public pages until the
server process restarted. SSR now always requests fresh data; the
in-browser client cache and its resetClient()-on-mutation invalidation
are unchanged.

Audit: docs/superpowers/specs/2026-09-02-be-fe-reuse-audit-report.md Group 0.8

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 10: BE — Scope Taxonomy/Term unique constraints to `deletedAt IS NULL`

**Files:**
- Modify: `ddd-graphql-be/src/modules/taxonomy/domain/entities/taxonomy.entity.ts`
- Modify: `ddd-graphql-be/src/modules/taxonomy/domain/entities/term.entity.ts`
- Create: `ddd-graphql-be/src/core/infrastructure/database/migrations/<timestamp>-PartialUniqueIndexTaxonomyTerm.ts`
- Test: `ddd-graphql-be/src/modules/taxonomy/application/services/__tests__/taxonomy.service.test.ts` and `term.service.test.ts` (new, or extend existing — check first)

Same bug class already found and fixed once on `ContentType.key` (`ddd-graphql-be/src/modules/contentType/domain/entities/contentType.entity.ts:24`, `@Index({ unique: true, where: '"deletedAt" IS NULL' })`) — apply the identical pattern here.

- [ ] **Step 1: Write the failing tests**

Check first: `find ddd-graphql-be/src/modules/taxonomy -iname "*.test.ts"`. The bug is really a DB-level integration behavior (partial index), which a pure unit test with fake repositories cannot exercise — the app-level `assertKeyAvailable`/`assertSlugAvailable` checks ALREADY correctly exclude soft-deleted rows (per the audit finding: "TaxonomyService.assertKeyAvailable/TermService.assertSlugAvailable both correctly exclude soft-deleted rows at the app level"). The actual bug only manifests as a raw Postgres unique-violation AFTER the app-level check passes. So:

1. Write a unit test confirming the app-level pre-check behavior is unchanged (regression guard, not the actual fix verification):

`ddd-graphql-be/src/modules/taxonomy/application/services/__tests__/taxonomy.service.test.ts` (create if absent):
```ts
import { TaxonomyService } from '../taxonomy.service';

describe('TaxonomyService.assertKeyAvailable', () => {
    it('does not consider a soft-deleted taxonomy as blocking key reuse (app-level check — already correct pre-fix)', async () => {
        const repo: any = { findOneByCondition: jest.fn(async () => null) }; // TypeORM excludes soft-deleted rows by default
        const service = new (TaxonomyService as any)(repo);
        await expect(service.assertKeyAvailable('danh-muc-tin-tuc')).resolves.toBeUndefined();
        expect(repo.findOneByCondition).toHaveBeenCalled();
    });
});
```
(Adapt to `TaxonomyService`'s real constructor signature — check it first.)

2. The REAL fix verification is at the entity-decorator level (can be asserted without a live DB) plus a migration-file existence check:

Create `ddd-graphql-be/src/modules/taxonomy/domain/entities/__tests__/taxonomy.entity.test.ts`:
```ts
import 'reflect-metadata';
import { getMetadataArgsStorage } from 'typeorm';
import { TaxonomyEntity } from '../taxonomy.entity';

describe('TaxonomyEntity.key unique index', () => {
    it('is scoped to deletedAt IS NULL (was a plain unique index — blocked key reuse after delete)', () => {
        const indices = getMetadataArgsStorage().indices.filter((i) => i.target === TaxonomyEntity);
        const keyIndex = indices.find((i) => Array.isArray(i.columns) ? i.columns.includes('key') : true);
        expect(keyIndex).toBeDefined();
        expect((keyIndex as any).options?.where).toBe('"deletedAt" IS NULL');
    });
});
```

Create the equivalent `ddd-graphql-be/src/modules/taxonomy/domain/entities/__tests__/term.entity.test.ts` for the composite `(taxonomyId, slug)` constraint.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ddd-graphql-be && npx jest src/modules/taxonomy`
Expected: the entity-metadata tests FAIL (no `where` option set today); the service test may already pass (it's a regression guard for existing-correct behavior) — that's fine, keep it as a guard against a future accidental regression.

- [ ] **Step 3: Fix `TaxonomyEntity`**

In `ddd-graphql-be/src/modules/taxonomy/domain/entities/taxonomy.entity.ts`, change:
```ts
    @Field({ type: String })
    @Index({ unique: true })
    @Column()
    key!: string; // vd "danh-muc-tin-tuc"
```
to:
```ts
    @Field({ type: String })
    // Partial index — plain `unique: true` still counts soft-deleted rows, so deleting a Taxonomy
    // and recreating one with the same key would permanently fail with a DB-level unique-violation
    // even though the app-level pre-check (assertKeyAvailable, which TypeORM's query API correctly
    // excludes soft-deleted rows from) finds nothing. Same bug already found and fixed the same way
    // on ContentType.key — see that entity's comment for the original live-reproduction case.
    @Index({ unique: true, where: '"deletedAt" IS NULL' })
    @Column()
    key!: string; // vd "danh-muc-tin-tuc"
```

- [ ] **Step 4: Fix `TermEntity`**

`@Unique(['taxonomyId', 'slug'])` (a class-level decorator) has no `where` option — TypeORM's partial-index support is only on `@Index`. In `ddd-graphql-be/src/modules/taxonomy/domain/entities/term.entity.ts`, replace:
```ts
import { Entity, Column, Index, Unique } from 'typeorm';
...
@Entity('taxonomy_term')
@Unique(['taxonomyId', 'slug'])
export class TermEntity extends BaseEntity {
```
with:
```ts
import { Entity, Column, Index } from 'typeorm';
...
@Entity('taxonomy_term')
// Composite PARTIAL unique index (was @Unique(['taxonomyId','slug']), a plain constraint that
// still counts soft-deleted rows — same bug class as TaxonomyEntity.key/ContentType.key above).
// @Unique has no `where` option; @Index(['col1','col2'], {unique, where}) is the TypeORM shape
// that supports it.
@Index(['taxonomyId', 'slug'], { unique: true, where: '"deletedAt" IS NULL' })
export class TermEntity extends BaseEntity {
```
(remove the now-redundant standalone `@Index()` on `taxonomyId` at line 12-13 ONLY IF the composite index above makes it redundant for this entity's actual query patterns — check `grep -n "taxonomyId" ddd-graphql-be/src/modules/taxonomy/application/services/term.service.ts` first; if `taxonomyId` alone (without `slug`) is queried anywhere, KEEP the standalone index, since a composite `(taxonomyId, slug)` index doesn't efficiently serve a `taxonomyId`-only lookup. Default to keeping it unless you confirm it's genuinely redundant.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd ddd-graphql-be && npx jest src/modules/taxonomy`
Expected: all PASS.

- [ ] **Step 6: Add a production migration** (this project uses `synchronize()` in dev but real migrations for prod — mirror the existing `LCUFuntion` migration's structure)

Create `ddd-graphql-be/src/core/infrastructure/database/migrations/<timestamp>-PartialUniqueIndexTaxonomyTerm.ts` (generate a real timestamp with `date +%s%3N` or follow this project's existing migration filename numbering convention — check the two existing migration files' timestamps for the exact digit count/format used):

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class PartialUniqueIndexTaxonomyTerm<TIMESTAMP> implements MigrationInterface {
    name = 'PartialUniqueIndexTaxonomyTerm<TIMESTAMP>';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Taxonomy.key: drop the old plain unique index (name per TypeORM's default naming —
        // verify the actual existing index name first with:
        //   \d taxonomy   -- in psql, or check a prior synchronize()-generated schema dump
        // and substitute below if different)
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_taxonomy_key";`);
        await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS "IDX_taxonomy_key_active"
            ON "taxonomy" ("key")
            WHERE "deletedAt" IS NULL;
        `);

        // Term (taxonomyId, slug): drop the old plain @Unique constraint (TypeORM names these
        // "UQ_<hash>" by default — find the real name first, same caveat as above) and add the
        // partial composite index.
        await queryRunner.query(`
            ALTER TABLE "taxonomy_term" DROP CONSTRAINT IF EXISTS "UQ_taxonomy_term_taxonomyId_slug";
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS "IDX_taxonomy_term_taxonomyId_slug_active"
            ON "taxonomy_term" ("taxonomyId", "slug")
            WHERE "deletedAt" IS NULL;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_taxonomy_key_active";`);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_taxonomy_key" ON "taxonomy" ("key");`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_taxonomy_term_taxonomyId_slug_active";`);
        await queryRunner.query(`ALTER TABLE "taxonomy_term" ADD CONSTRAINT "UQ_taxonomy_term_taxonomyId_slug" UNIQUE ("taxonomyId", "slug");`);
    }
}
```

Before finalizing this migration, connect to the actual dev database and confirm the real existing index/constraint names (they may not match the guessed `IDX_taxonomy_key`/`UQ_taxonomy_term_taxonomyId_slug` — TypeORM's naming strategy is deterministic but must be verified, not assumed):
```sql
SELECT indexname, indexdef FROM pg_indexes WHERE tablename IN ('taxonomy', 'taxonomy_term');
SELECT conname FROM pg_constraint WHERE conrelid = 'taxonomy_term'::regclass AND contype = 'u';
```
Substitute the real names into the migration before committing it.

- [ ] **Step 7: Run the migration against the local dev DB and verify**

Run: `cd ddd-graphql-be && npm run migration:run` (check `package.json` for the exact script name first).
Then re-run the `pg_indexes`/`pg_constraint` queries from Step 6 to confirm the new partial unique indexes exist and the old plain ones are gone.

- [ ] **Step 8: Live-verify the actual bug is fixed**

Through the admin UI (or a direct mutation call): create a Taxonomy with key `test-taxonomy`, delete it, then create a NEW Taxonomy with the same key `test-taxonomy` — confirm this now succeeds (previously failed with a raw unique-violation). Repeat for a Term within some Taxonomy (same slug, delete-then-recreate).

- [ ] **Step 9: Commit**

```bash
cd ddd-graphql-be
git add src/modules/taxonomy/domain/entities/taxonomy.entity.ts src/modules/taxonomy/domain/entities/term.entity.ts src/modules/taxonomy/domain/entities/__tests__/taxonomy.entity.test.ts src/modules/taxonomy/domain/entities/__tests__/term.entity.test.ts src/modules/taxonomy/application/services/__tests__/taxonomy.service.test.ts src/core/infrastructure/database/migrations/
git commit -m "fix(taxonomy): scope Taxonomy.key/Term(taxonomyId,slug) unique indexes to live rows

Same bug already found and fixed on ContentType.key: a plain unique
index still counts soft-deleted rows, so deleting then recreating a
Taxonomy/Term with the same key/slug hit a raw Postgres unique-violation
even though the app-level pre-check (which correctly excludes
soft-deleted rows) reported the value as free. Apply the identical
deletedAt-IS-NULL partial-index fix, plus a migration for existing
deployments (schema here is normally synchronize()-driven in dev).

Audit: docs/superpowers/specs/2026-09-02-be-fe-reuse-audit-report.md Group 0.9

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 11: FE — Delete dead `ResetPasswordAdminPage`/`ResetPasswordMerchantPage`

**Files:**
- Delete: `ddd-graphql-fe/src/modules/admin/pages/resetPasswordAdmin.page.tsx`
- Delete: `ddd-graphql-fe/src/modules/merchant/auth/resetPasswordMerchant.page.tsx`

Confirmed during planning (repo-wide grep) that neither `ResetPasswordAdminPage` nor `ResetPasswordMerchantPage` is imported anywhere outside their own file — the live route (`default.routes.resetPassword` in `AppRoutes.tsx:190`) already uses the generic `ResetPasswordPage` (`src/modules/auth/resetPassword.page.tsx`) for both admin and merchant via its `type` query param.

- [ ] **Step 1: Re-confirm zero external references right before deleting** (repo state may have changed since planning)

Run:
```bash
cd ddd-graphql-fe
grep -rn "ResetPasswordAdminPage" src --include="*.ts" --include="*.tsx" | grep -v "resetPasswordAdmin.page.tsx"
grep -rn "ResetPasswordMerchantPage" src --include="*.ts" --include="*.tsx" | grep -v "resetPasswordMerchant.page.tsx"
```
Expected: no output from either command. If either produces output, STOP — something now references the file that didn't during planning; investigate before deleting.

- [ ] **Step 2: Delete the files**

```bash
git rm src/modules/admin/pages/resetPasswordAdmin.page.tsx
git rm src/modules/merchant/auth/resetPasswordMerchant.page.tsx
```

- [ ] **Step 3: Run the build + full test suite to confirm nothing broke**

Run: `cd ddd-graphql-fe && npm run build && npm run test`
Expected: build succeeds, all tests PASS (no import errors from anywhere that secretly referenced these files).

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(auth): delete dead ResetPasswordAdminPage/ResetPasswordMerchantPage

226 lines, fully built, never routed anywhere — the live /reset-password
route already uses the generic ResetPasswordPage (type=admin|merchant
query param) for both. A future edit landing on one of these dead files
(matching intuitive naming) would never take effect in production.

Audit: docs/superpowers/specs/2026-09-02-be-fe-reuse-audit-report.md Group 0.10

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Post-plan: mark Group 0 done in the audit report

- [ ] After all 11 tasks are committed and live-verified, update `docs/superpowers/specs/2026-09-02-be-fe-reuse-audit-report.md`'s Group 0 section to note it's complete (e.g. a `**Status: done — see docs/superpowers/plans/2026-09-02-audit-group0-bugfixes.md`" line under the Group 0 heading), commit that doc update in the `ddd-graphql-fe` repo, and proceed to planning Group 1 (FE `core/` vs `shared/` restructure) as a fresh `writing-plans` pass.
