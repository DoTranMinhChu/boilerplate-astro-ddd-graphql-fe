# Audit Group 0 — Completion Report

**Status: COMPLETE on both worktree branches, NOT YET MERGED to master (awaiting user review).**

Branches: `audit-group0-bugfixes` in both `ddd-graphql-be` and `ddd-graphql-fe` (git worktrees at
`.worktrees/audit-group0-bugfixes` in each repo).

Plan executed: `docs/superpowers/plans/2026-09-02-audit-group0-bugfixes.md` (this repo).
Source audit: `docs/superpowers/specs/2026-09-02-be-fe-reuse-audit-report.md` (this repo), Group 0.

This document is the durable record of what actually happened during execution — the
per-task/per-review-round working notes (`.superpowers/sdd/progress.md` and briefs/reports) are
gitignored scratch files and will not survive worktree cleanup; this file is the permanent summary.

## What Group 0 originally asked for

10 real bugs found by the reuse/scalability audit (Group 0 of a larger 5-group roadmap — Groups
1-5 cover the bigger reuse/architecture refactor and have not been started).

## What actually happened

All 10 original tasks were implemented, tested, and individually reviewed — clean. Then a
**final whole-branch review** (required before any merge, per this project's standard process)
found and fixed 2 genuine **Critical** severity issues on the BE side that were **not** present
in the original audit — they were introduced or exposed as a side effect of the Group 0 fixes
themselves, and were caught through iterative adversarial re-review, each round finding the
previous round's fix was incomplete. This is the most severe finding chain in this project's
history to date.

### The escalation chain (BE), round by round

1. **Task 7** (of the original plan) added `ERole.TENANT_STAFF` to `@GQLAuthorized` on
   `createTenantAccount`/`updateTenantAccount` so a `STAFF_CREATE`/`STAFF_UPDATE` permission
   grant would have real effect (the audit's original ask).
2. **Final review round 1** found this let a `TENANT_STAFF` holding `STAFF_UPDATE` set their own
   `roles` to `[TENANT_OWNER]` and bypass the entire permission system — plus a second, unrelated
   Critical: `setPermissions`'s own Task-5 fix passed plain objects to `.save()`, skipping
   `@BeforeInsert`, so **every** permission grant would fail with a NOT NULL violation. Both fixed
   and live-verified.
3. **Round 2** found the same escalation was ALSO reachable via `PUT /api/v1/tenantAccount/:id`
   (REST), no permission grant even required — plus 2 smaller holes in round 1's guard (a
   duplicated-role array could slip past a downstream check; no check on the record being
   *edited*, so a demote/delete-the-owner lockout was possible). Fixed and live-verified.
4. **Round 3** found the REST vector was understated: it doesn't need ANY authenticated tenant
   account — `registerMerchant` is public, so anyone can self-register a context-free `MERCHANT`
   token and use it. Fixed (`buildScope` fails closed for a non-ADMIN caller with no scope to
   restrict by) and live-verified.
5. **Round 4** found that fix only covered 4 of 9 REST controllers (the ones with an
   `agencyId`/`tenantId` column). The other 5 — **Admin, Merchant, Agency, Media, MediaSet** —
   were still fully open. Live-proven as an **unauthenticated full platform takeover**:
   self-register a merchant → `GET /api/v1/admins` (returns password hashes, no `select:false`)
   → `POST /api/v1/admins` with `roles:["SUPER_ADMIN"]` and an attacker-chosen password →
   200, password persisted **unhashed** (the generic REST create path never goes through
   `AdminService.register()`'s hashing) → log in as a brand-new platform super-admin. Fixed
   (deny non-ADMIN outright on any entity with no scope column, matching what all 5 controllers'
   own already-written, but shadowed-dead, `@Authorized` decorators already intended) and
   live-verified — full exploit chain now 403 at every step, real ADMIN access confirmed
   unaffected.
6. **Round 5** confirmed: BE side is done. All 9 `BaseRestController` subclasses accounted for,
   the entity-metadata detection mechanism (`hasColumn`) empirically verified against real
   TypeORM metadata for all 9, the fix proven strictly additive (zero behavior change) for the
   4 already-scoped controllers, and — since the FE is 100% GraphQL with zero REST call sites —
   zero risk of breaking real client behavior. One cosmetic comment-wording nit found and fixed.

**Root cause underneath all of this, still open (deliberately, see below):** a pre-existing
route-registration-shadowing bug where `BaseRestController`'s generic handler always wins over a
subclass's stricter override, regardless of registration order intent — already documented in
`baseRest.controller.ts`'s own header comment (from a prior, unrelated security fix) as needing
"a separate task." The buildScope fixes close the actual exploit surface regardless of which
handler technically wins, but the shadowing bug itself remains a real correctness/maintainability
hazard.

### FE side (lower severity, 2 review rounds)

Round 1 found the new Agency/Tenant forgot-password pages advertised "account or email" when the
BE only matches by username (silent dead-end for anyone typing an email), and that the audit's
FormEmbedNode style-bug (Group 0.7) actually had 2 more instances (TableNode, CardListNode) the
original audit missed. Both fixed; round 2 caught one missed i18n string location and confirmed
everything else clean.

## Final commit counts

- **ddd-graphql-be**: 17 commits on `audit-group0-bugfixes` (11 original task commits + 6
  review-fix commits across 5 review rounds). Full test suite: 582/582 passing.
- **ddd-graphql-fe**: 9 commits on `audit-group0-bugfixes` (7 original task-side commits +
  2 review-fix commits across 2 review rounds). Full test suite: 1109/1109 passing (SSR + client).

## Verification methodology

Every Critical/Important finding across all 5 BE review rounds was **live-verified against the
real dev database**, not just unit-tested — using this project's established disposable-account
pattern (`.qa-disposable-admin.cjs`, never reading/forging real credentials): self-registering or
admin-creating fresh throwaway accounts, reproducing the exact exploit chain through real
GraphQL/REST calls, confirming the fix blocks it, confirming legitimate access is unaffected, then
deleting every piece of test data created. No real user data was ever read or touched.

## Genuinely open items (not blockers — disclosed, not silently dropped)

1. **BE — route-registration-shadowing bug** (pre-existing, described above). Recommend a
   dedicated follow-up task: fix route registration to prefer the most-derived class's decorator
   per method+path instead of first-registered-wins.
2. **BE — `agencyAccount.resolver.ts`'s new `@GQLPermission(STAFF_*)` checks are unreachable in
   practice** (every role that passes its `@GQLAuthorized` also hits the "Agency bypass" in
   `applyGQLPermission` before the fine-grained check runs). This is a direct, deliberate
   consequence of *not* widening that resolver's `@GQLAuthorized` (a conservative choice). Needs
   a product decision: accept as-is (Agency owners have unconditional full access by design), or
   set `bypassForAgency: false` + add an agency-staff role — a real security-behavior change
   requiring explicit sign-off, not decided unilaterally here.
3. **BE — login mutations remain a weaker account-enumeration oracle** than the `forgotPassword`
   flows this batch fixed (distinguishable "not found" vs. "wrong password" errors). Pre-existing,
   not introduced by this batch.
4. **BE — `generatePresignedUrl` still has no `MEDIA_MANAGE` gate.** Deliberate scope call from
   the original plan, flagged for product review rather than fixed here.
5. **FE — no real browser click-through was performed this entire session** (Playwright MCP
   failed to connect every time it was attempted). All verification was via direct GraphQL/REST
   calls against a real running server plus the full automated test suite. Recommend a live
   click-through pass once Playwright reconnects, especially for the new Agency/Tenant
   forgot-password flow and the FormEmbedNode/TableNode/CardListNode style fixes.
6. **FE — `/reset-password` mislabels agency/tenant users as "Merchant"** after a successful
   reset, and routes "back to login" to the merchant portal. The underlying credential reset
   itself is verified correct (it resets the linked Merchant's password, which is genuinely what
   agency/tenant accounts authenticate against) — this is a UX/labeling gap only, needing a
   coordinated BE+FE change (a new `type=agency`/`type=tenant` value), deferred to a future task.

## Next steps

1. **User reviews both branches** (`audit-group0-bugfixes` in each repo) before merge — this was
   explicitly requested up front ("review only at the end").
2. Once approved, merge both branches to their respective `master` and clean up the worktrees.
3. Proceed to Group 1 (FE `core/` vs `shared/` restructure) of the original 5-group roadmap, or
   address the open items above first, per user preference.
