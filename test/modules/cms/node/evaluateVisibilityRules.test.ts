import { describe, it, expect } from 'vitest';
import { evaluateVisibilityRules } from '@modules/cms/node/evaluateVisibilityRules';
import type { NodeRenderContext, VisibilityRules } from '@modules/cms/node/node.types';
import { EFilterOperator } from '@core/api/types';

function ctx(overrides: Partial<NodeRenderContext> = {}): NodeRenderContext {
    return { isCustomerLoggedIn: false, device: () => 'desktop', queryParams: {}, pathParams: {}, now: new Date('2026-08-12T00:00:00Z'), ...overrides };
}

describe('evaluateVisibilityRules', () => {
    it('null/undefined rules → always visible', () => {
        expect(evaluateVisibilityRules(null, ctx())).toBe(true);
        expect(evaluateVisibilityRules(undefined, ctx())).toBe(true);
    });

    it('device condition matches ctx.device', () => {
        expect(evaluateVisibilityRules({ logic: 'AND', conditions: [{ type: 'device', value: 'mobile' }] }, ctx({ device: () => 'mobile' }))).toBe(true);
        expect(evaluateVisibilityRules({ logic: 'AND', conditions: [{ type: 'device', value: 'mobile' }] }, ctx({ device: () => 'desktop' }))).toBe(false);
    });

    it('authState matches ctx.isCustomerLoggedIn', () => {
        expect(evaluateVisibilityRules({ logic: 'AND', conditions: [{ type: 'authState', value: 'loggedIn' }] }, ctx({ isCustomerLoggedIn: true }))).toBe(true);
        expect(evaluateVisibilityRules({ logic: 'AND', conditions: [{ type: 'authState', value: 'loggedIn' }] }, ctx({ isCustomerLoggedIn: false }))).toBe(false);
    });

    it('dateRange is inclusive of from/to', () => {
        const rules = { logic: 'AND' as const, conditions: [{ type: 'dateRange' as const, from: '2026-08-01', to: '2026-08-31' }] };
        expect(evaluateVisibilityRules(rules, ctx({ now: new Date('2026-08-12') }))).toBe(true);
        expect(evaluateVisibilityRules(rules, ctx({ now: new Date('2026-09-01') }))).toBe(false);
    });

    it('fieldValue compares against contextEntry with operator EFilterOperator.EQUALS (the new canonical $-prefixed spelling)', () => {
        const rules = { logic: 'AND' as const, conditions: [{ type: 'fieldValue' as const, field: 'stock', operator: EFilterOperator.EQUALS, value: 0 }] };
        expect(evaluateVisibilityRules(rules, ctx({ contextEntry: { stock: 0 } }))).toBe(true);
        expect(evaluateVisibilityRules(rules, ctx({ contextEntry: { stock: 5 } }))).toBe(false);
    });

    // Task 9 (enum/type-safety sweep §3.7) backward-compat read path: VisibilityCondition.operator
    // used to be a bare-name string ('eq'/'neq'/...) before being unified onto EFilterOperator's
    // $-prefixed spelling. A Node's visibilityRules is untyped JSONB read straight off the wire, so
    // an already-saved page may still carry the OLD spelling — evaluateVisibilityRules.ts's
    // normalizeVisibilityOperator() must keep reading it correctly, not silently start returning
    // `false` for every condition (`as unknown as EFilterOperator` below simulates exactly that:
    // a real runtime value that no longer satisfies the STATIC type, same as old saved JSONB would).
    it('fieldValue still matches the OLD pre-Task-9 bare-name operator spelling (backward-compat read path for already-saved pages)', () => {
        const legacyRules = (operator: string): VisibilityRules => ({
            logic: 'AND',
            conditions: [{ type: 'fieldValue', field: 'stock', operator: operator as unknown as EFilterOperator, value: 5 }],
        });
        expect(evaluateVisibilityRules(legacyRules('eq'), ctx({ contextEntry: { stock: 5 } }))).toBe(true);
        expect(evaluateVisibilityRules(legacyRules('eq'), ctx({ contextEntry: { stock: 9 } }))).toBe(false);
        expect(evaluateVisibilityRules(legacyRules('neq'), ctx({ contextEntry: { stock: 9 } }))).toBe(true);
        expect(evaluateVisibilityRules(legacyRules('gt'), ctx({ contextEntry: { stock: 9 } }))).toBe(true);
        expect(evaluateVisibilityRules(legacyRules('gte'), ctx({ contextEntry: { stock: 5 } }))).toBe(true);
        expect(evaluateVisibilityRules(legacyRules('lt'), ctx({ contextEntry: { stock: 1 } }))).toBe(true);
        expect(evaluateVisibilityRules(legacyRules('lte'), ctx({ contextEntry: { stock: 5 } }))).toBe(true);
        expect(evaluateVisibilityRules(legacyRules('contains'), ctx({ contextEntry: { stock: 'in-5-stock' } }))).toBe(true);
    });

    it('fieldValue with an unrecognized operator (neither old nor new spelling) is false, not a throw', () => {
        const rules: VisibilityRules = {
            logic: 'AND',
            conditions: [{ type: 'fieldValue', field: 'stock', operator: 'bogus' as unknown as EFilterOperator, value: 5 }],
        };
        expect(evaluateVisibilityRules(rules, ctx({ contextEntry: { stock: 5 } }))).toBe(false);
    });

    it('queryParam matches ctx.queryParams', () => {
        const rules = { logic: 'AND' as const, conditions: [{ type: 'queryParam' as const, key: 'preview', value: '1' }] };
        expect(evaluateVisibilityRules(rules, ctx({ queryParams: { preview: '1' } }))).toBe(true);
        expect(evaluateVisibilityRules(rules, ctx({ queryParams: {} }))).toBe(false);
    });

    it('logic "AND" requires every condition true; "OR" requires at least one', () => {
        const conditions = [{ type: 'device' as const, value: 'mobile' as const }, { type: 'authState' as const, value: 'loggedIn' as const }];
        expect(evaluateVisibilityRules({ logic: 'AND', conditions }, ctx({ device: () => 'mobile', isCustomerLoggedIn: false }))).toBe(false);
        expect(evaluateVisibilityRules({ logic: 'OR', conditions }, ctx({ device: () => 'mobile', isCustomerLoggedIn: false }))).toBe(true);
    });
});
