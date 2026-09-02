# BE + FE Codebase Reuse & Scalability Audit — Design

**Date:** 2026-09-02
**Status:** Approved by user (chat), audit execution in progress
**Scope:** `ddd-graphql-be` (NestJS/DDD, ~25 business modules) + `ddd-graphql-fe` (Astro/React, ~10 modules)

## Goal

User wants both codebases assessed for **code organization / reusability** (mirroring the
intent behind FE's `src/core/` — one place to write common code other parts reuse) and
**performance** ("scale up hệ thống"), then refactored so the whole system is as reusable
and efficient as possible. This document covers **Phase 1: Audit only** (read-only,
no code changes). Phase 2 (refactor) is planned after the audit report is reviewed.

## Already-observed headline issue

FE has **two parallel "common code" trees** that largely overlap in purpose:

- `src/core/{api,components,config,helpers,hooks,services,styles,templates,types}` (237 files)
- `src/shared/{common,components,config,configs,contexts,errors,generated,helpers,hooks,i18n,services,types}` (103 files)

Notably `shared/services/*` is organized **per business module** (admin, agency, node,
page, tenant, theme, …) even though `src/modules/` only has 10 entries — meaning most
business logic actually lives under `shared/`, not `modules/`, so the module boundary
itself is inconsistent. `shared/config` **and** `shared/configs` both exist. This pairing
is the flagship target for the reuse audit and later refactor.

BE's `src/core/{application,domain,infrastructure,shared}` follows a conventional DDD
layering and looks structurally sound at a glance; the audit will verify whether the 25
modules actually reuse it consistently or re-implement things (pagination, validation,
resolver boilerplate, DTO mapping, caching) module-by-module.

## Approach

Deep, parallel audit — one subagent per logical batch, each producing a structured
findings report (no code edits). Batches sized so each agent holds a manageable slice
of context while still going deep per the user's "đào sâu toàn bộ module" requirement.

### Batches

| # | Batch | Directories | Lens |
|---|-------|-------------|------|
| BE-1 | BE core layer | `src/core/**`, `src/bootstrap`, `src/config` | Is the DDD layering actually reusable? What's missing that forces modules to duplicate? |
| BE-2 | BE content/CMS modules | page, node, contentEntry, contentType, component, taxonomy, form, media, mediaSet, menu, artDirectionKit, headerPreset, footerPreset, theme, codeConfig, siteSettings | Repeated CRUD/resolver/validation patterns, N+1 queries, missing indexes/pagination, cross-module inconsistency |
| BE-3 | BE identity/org/ops modules | admin, agency, agencyAccount, merchant, tenant, tenantAccount, customer, accountPermission, permission, unit, activityLog, emailConfig, globalSequence | Same lens + auth/permission/RBAC duplication (security-sensitive) |
| FE-1 | FE `core/` vs `shared/` | `src/core/**`, `src/shared/**` | Direct pairwise comparison of every overlapping subfolder; what's actually imported vs dead; propose one unified structure |
| FE-2 | FE `modules/cms` | `src/modules/cms/**` | Largest/most complex module (Node Builder editor); internal organization/reuse + perf (bundle, GSAP, canvas rendering) |
| FE-3 | FE other modules + layouts/pages | admin, agency, auth, codeConfig, customer, merchant, tenant, theme, unit modules; `src/layouts/**`, `src/pages/**` | Cross-module duplication (each likely re-implements list/form/table CRUD instead of reusing core/shared) |
| FE-4 | FE performance | build/data-fetching layer | Astro SSR/island hydration strategy, bundle size/code-splitting, data-fetching/caching pattern, image handling |
| CROSS-1 | API contract sharing | GraphQL schema/codegen on both sides | Type/contract reuse between BE and FE, schema drift risk |

### Report format (per finding)

- **File:line**
- **Category**: organization / duplication-reuse / performance
- **Severity**: Critical / Important / Minor
- **Problem** (concrete, not generic)
- **Impact** (what breaks or what scaling cost this causes)
- **Suggested direction** (not a full implementation — just the shape of the fix)

Each subagent writes its full report to a file under the session scratchpad, plus
returns a short summary. The controller (this session) synthesizes all 8 into one
master report, resolves overlaps, and produces a prioritized refactor roadmap —
presented to the user as a summary before any Phase 2 code changes begin.

## Out of scope for this document

- Actual refactor implementation (Phase 2 — separate plan after this audit is reviewed)
- Business-logic correctness bugs unrelated to organization/reuse/performance
