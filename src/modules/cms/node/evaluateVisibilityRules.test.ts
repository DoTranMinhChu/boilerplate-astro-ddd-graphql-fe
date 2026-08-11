import { describe, it, expect } from 'vitest';
import { evaluateVisibilityRules } from './evaluateVisibilityRules';
import type { NodeRenderContext } from './node.types';

function ctx(overrides: Partial<NodeRenderContext> = {}): NodeRenderContext {
    return { isCustomerLoggedIn: false, device: 'desktop', queryParams: {}, now: new Date('2026-08-12T00:00:00Z'), ...overrides };
}

describe('evaluateVisibilityRules', () => {
    it('null/undefined rules → always visible', () => {
        expect(evaluateVisibilityRules(null, ctx())).toBe(true);
        expect(evaluateVisibilityRules(undefined, ctx())).toBe(true);
    });

    it('device condition matches ctx.device', () => {
        expect(evaluateVisibilityRules({ logic: 'AND', conditions: [{ type: 'device', value: 'mobile' }] }, ctx({ device: 'mobile' }))).toBe(true);
        expect(evaluateVisibilityRules({ logic: 'AND', conditions: [{ type: 'device', value: 'mobile' }] }, ctx({ device: 'desktop' }))).toBe(false);
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

    it('fieldValue compares against contextEntry with operator "eq"', () => {
        const rules = { logic: 'AND' as const, conditions: [{ type: 'fieldValue' as const, field: 'stock', operator: 'eq', value: 0 }] };
        expect(evaluateVisibilityRules(rules, ctx({ contextEntry: { stock: 0 } }))).toBe(true);
        expect(evaluateVisibilityRules(rules, ctx({ contextEntry: { stock: 5 } }))).toBe(false);
    });

    it('queryParam matches ctx.queryParams', () => {
        const rules = { logic: 'AND' as const, conditions: [{ type: 'queryParam' as const, key: 'preview', value: '1' }] };
        expect(evaluateVisibilityRules(rules, ctx({ queryParams: { preview: '1' } }))).toBe(true);
        expect(evaluateVisibilityRules(rules, ctx({ queryParams: {} }))).toBe(false);
    });

    it('logic "AND" requires every condition true; "OR" requires at least one', () => {
        const conditions = [{ type: 'device' as const, value: 'mobile' as const }, { type: 'authState' as const, value: 'loggedIn' as const }];
        expect(evaluateVisibilityRules({ logic: 'AND', conditions }, ctx({ device: 'mobile', isCustomerLoggedIn: false }))).toBe(false);
        expect(evaluateVisibilityRules({ logic: 'OR', conditions }, ctx({ device: 'mobile', isCustomerLoggedIn: false }))).toBe(true);
    });
});
