// src/modules/cms/node/evaluateVisibilityRules.ts
// Pure function evaluating a Node's VisibilityRules against the current render
// context. See docs/superpowers/specs/2026-08-12-nocode-visual-builder-v2-design.md §3.
import { EFilterOperator } from '@core/api/types';
import type { VisibilityCondition, VisibilityRules, NodeRenderContext } from './node.types';

/** Task 9 (enum/type-safety sweep §3.7) backward-compat read path — `VisibilityCondition
 * ['fieldValue'].operator` is now statically typed `EFilterOperator` (the `$`-prefixed
 * spelling), but that type only binds what FE code WRITES from now on (NodeVisibilityTab.tsx).
 * A Node's `visibilityRules` is untyped JSONB read straight off the wire — any page whose
 * `fieldValue` condition was saved BEFORE this change may still carry the OLD bare-name
 * spelling ('eq'/'neq'/'gt'/'gte'/'lt'/'lte'/'contains'). A real test fixture in this exact
 * file's own test suite (`evaluateVisibilityRules.test.ts`) asserted `operator: 'eq'` as a
 * valid, already-meaningful value before this refactor — concrete evidence the old spelling was
 * genuinely in use, not just a hypothetical — so a hard cutover risks SILENTLY breaking an
 * already-published page's visibility rule (falls to `default: return false` below, which can
 * either wrongly hide content that should show, or wrongly show content that should stay
 * hidden — no error, no crash, just a silently wrong page). Reads through both spellings until
 * a real data migration back-fills every saved value to the new one — do not remove this
 * function before that migration ships. 'contains' maps to `LIKE` (not `ILIKE`): the case
 * comparison below (`String(actual).includes(...)`) is case-SENSITIVE, matching `LIKE`'s
 * semantics, not `ILIKE`'s case-insensitive one — see this same mapping choice noted in the
 * Task 9 commit message. */
function normalizeVisibilityOperator(operator: EFilterOperator | string | undefined): EFilterOperator | undefined {
    switch (operator) {
        case EFilterOperator.EQUALS:
        case 'eq': return EFilterOperator.EQUALS;
        case EFilterOperator.NOT_EQUALS:
        case 'neq': return EFilterOperator.NOT_EQUALS;
        case EFilterOperator.GREATER_THAN:
        case 'gt': return EFilterOperator.GREATER_THAN;
        case EFilterOperator.GREATER_THAN_OR_EQUAL:
        case 'gte': return EFilterOperator.GREATER_THAN_OR_EQUAL;
        case EFilterOperator.LESS_THAN:
        case 'lt': return EFilterOperator.LESS_THAN;
        case EFilterOperator.LESS_THAN_OR_EQUAL:
        case 'lte': return EFilterOperator.LESS_THAN_OR_EQUAL;
        case EFilterOperator.LIKE:
        case 'contains': return EFilterOperator.LIKE;
        default: return undefined;
    }
}

function evaluateOne(cond: VisibilityCondition, ctx: NodeRenderContext): boolean {
    switch (cond.type) {
        case 'device':
            return ctx.device() === cond.value;
        case 'authState':
            return cond.value === 'loggedIn' ? ctx.isCustomerLoggedIn : !ctx.isCustomerLoggedIn;
        case 'dateRange': {
            const now = ctx.now.getTime();
            if (cond.from && now < new Date(cond.from).getTime()) return false;
            if (cond.to && now > new Date(cond.to).getTime()) return false;
            return true;
        }
        case 'fieldValue': {
            const actual = ctx.contextEntry?.[cond.field];
            switch (normalizeVisibilityOperator(cond.operator)) {
                case EFilterOperator.EQUALS: return actual === cond.value;
                case EFilterOperator.NOT_EQUALS: return actual !== cond.value;
                case EFilterOperator.GREATER_THAN: return actual > cond.value;
                case EFilterOperator.GREATER_THAN_OR_EQUAL: return actual >= cond.value;
                case EFilterOperator.LESS_THAN: return actual < cond.value;
                case EFilterOperator.LESS_THAN_OR_EQUAL: return actual <= cond.value;
                case EFilterOperator.LIKE: return Array.isArray(actual) ? actual.includes(cond.value) : String(actual ?? '').includes(String(cond.value));
                default: return false;
            }
        }
        case 'queryParam':
            return ctx.queryParams[cond.key] === cond.value;
        default:
            return true;
    }
}

/** null/undefined rules = always visible (matches the old Section visibilityRules
 * behavior: absence of rules means no restriction). */
export function evaluateVisibilityRules(rules: VisibilityRules | null | undefined, ctx: NodeRenderContext): boolean {
    if (!rules || !rules.conditions.length) return true;
    return rules.logic === 'OR'
        ? rules.conditions.some((c) => evaluateOne(c, ctx))
        : rules.conditions.every((c) => evaluateOne(c, ctx));
}
