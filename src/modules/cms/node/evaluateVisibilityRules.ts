// src/modules/cms/node/evaluateVisibilityRules.ts
// Pure function evaluating a Node's VisibilityRules against the current render
// context. See docs/superpowers/specs/2026-08-12-nocode-visual-builder-v2-design.md §3.
import type { VisibilityCondition, VisibilityRules, NodeRenderContext } from './node.types';

function evaluateOne(cond: VisibilityCondition, ctx: NodeRenderContext): boolean {
    switch (cond.type) {
        case 'device':
            return ctx.device === cond.value;
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
            switch (cond.operator) {
                case 'eq': return actual === cond.value;
                case 'neq': return actual !== cond.value;
                case 'gt': return actual > cond.value;
                case 'gte': return actual >= cond.value;
                case 'lt': return actual < cond.value;
                case 'lte': return actual <= cond.value;
                case 'contains': return Array.isArray(actual) ? actual.includes(cond.value) : String(actual ?? '').includes(String(cond.value));
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
