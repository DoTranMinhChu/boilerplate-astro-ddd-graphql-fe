// src/shared/utils/scopeRule.helpers.ts

export type IScopeRuleFE =
    | { type: 'ALLOW_ALL' }
    | { type: 'DENY_ALL' }
    | { type: 'INCLUDE'; field: string; ids: string[] }
    | { type: 'EXCLUDE'; field: string; ids: string[] }
    | { type: 'SELF'; field: string }
    | { type: 'OR'; rules: IScopeRuleFE[] }
    | { type: 'AND'; rules: IScopeRuleFE[] };

export interface IScopeRuleMeta {
    byId?: string | null;
    byParentField?: string | null;
    byParentLabel?: string | null;
    bySelf?: string | null;
}

export type ScopeOption = {
    value: string;
    label: string;
};

// ─── stripScopeRuleTypename ───────────────────────────────────────────────────
//
// Apollo/urql tự thêm __typename vào mọi object trong query response.
// Khi dùng scopeRule từ response để gửi vào mutation input, GraphQL server
// báo lỗi: "Field __typename is not defined by type ScopeRuleInput"
//
// Hàm này xóa __typename (và bất kỳ key nào bắt đầu bằng '__') ra khỏi
// scopeRule trước khi gửi mutation.
//
// Ví dụ input:
//   { __typename: 'ScopeRule', type: 'INCLUDE', field: 'productionUnitId', ids: ['u1'], rules: null }
//
// Ví dụ output:
//   { type: 'INCLUDE', field: 'productionUnitId', ids: ['u1'] }
//   (rules: null bị bỏ vì null/undefined không cần gửi)

export function stripScopeRuleTypename(rule: any): IScopeRuleFE {
    if (!rule || typeof rule !== 'object') return rule;

    const cleaned: Record<string, any> = {};

    for (const [key, value] of Object.entries(rule)) {
        // Bỏ qua __typename và bất kỳ internal Apollo key nào
        if (key.startsWith('__')) continue;
        // Bỏ qua null/undefined — InputType không cần
        if (value === null || value === undefined) continue;

        if (key === 'rules' && Array.isArray(value)) {
            // Đệ quy clean từng rule con trong OR/AND
            const cleanedRules = value
                .filter(r => r != null)
                .map(r => stripScopeRuleTypename(r));
            if (cleanedRules.length > 0) {
                cleaned[key] = cleanedRules;
            }
        } else {
            cleaned[key] = value;
        }
    }

    return cleaned as IScopeRuleFE;
}

// ─── buildScopeOptions ────────────────────────────────────────────────────────

export function buildScopeOptions(meta?: IScopeRuleMeta | null): ScopeOption[] {
    const opts: ScopeOption[] = [
        { value: 'ALLOW_ALL', label: 'Tất cả' },
    ];

    if (!meta) return opts;

    if (meta.bySelf) {
        opts.push({ value: `SELF:${meta.bySelf}`, label: 'Của mình tạo' });
    }

    if (meta.byParentField && meta.byParentLabel) {
        opts.push({ value: `INCLUDE_PARENT:${meta.byParentField}`, label: `Theo ${meta.byParentLabel}` });
        opts.push({ value: `EXCLUDE_PARENT:${meta.byParentField}`, label: `Tất cả trừ ${meta.byParentLabel}` });
        if (meta.bySelf) {
            opts.push({
                value: `OR_PARENT_SELF:${meta.byParentField}:${meta.bySelf}`,
                label: `Theo ${meta.byParentLabel} HOẶC của mình`,
            });
        }
    }

    if (meta.byId) {
        opts.push({ value: `INCLUDE_ID:${meta.byId}`, label: 'Chỉ một số cụ thể' });
        opts.push({ value: `EXCLUDE_ID:${meta.byId}`, label: 'Tất cả trừ một số' });
    }

    return opts;
}

// ─── ruleToOptionValue ────────────────────────────────────────────────────────

export function ruleToOptionValue(rule: IScopeRuleFE): string {
    switch (rule.type) {
        case 'ALLOW_ALL':
        case 'DENY_ALL':
            return 'ALLOW_ALL';
        case 'SELF':
            return `SELF:${rule.field}`;
        case 'INCLUDE':
            return rule.field === 'id' ? `INCLUDE_ID:${rule.field}` : `INCLUDE_PARENT:${rule.field}`;
        case 'EXCLUDE':
            return rule.field === 'id' ? `EXCLUDE_ID:${rule.field}` : `EXCLUDE_PARENT:${rule.field}`;
        case 'OR': {
            const inc = rule.rules.find(r => r.type === 'INCLUDE') as Extract<IScopeRuleFE, { type: 'INCLUDE' }> | undefined;
            const self = rule.rules.find(r => r.type === 'SELF') as Extract<IScopeRuleFE, { type: 'SELF' }> | undefined;
            if (inc && self) return `OR_PARENT_SELF:${inc.field}:${self.field}`;
            return 'ALLOW_ALL';
        }
        default:
            return 'ALLOW_ALL';
    }
}

// ─── optionValueToBaseRule ────────────────────────────────────────────────────

export function optionValueToBaseRule(optionValue: string): IScopeRuleFE {
    if (optionValue === 'ALLOW_ALL') return { type: 'ALLOW_ALL' };

    const parts = optionValue.split(':');
    const prefix = parts[0] ?? '';
    const field = parts[1] ?? '';
    const selfField = parts[2] ?? '';

    switch (prefix) {
        case 'SELF': return { type: 'SELF', field };
        case 'INCLUDE_PARENT': return { type: 'INCLUDE', field, ids: [] };
        case 'INCLUDE_ID': return { type: 'INCLUDE', field, ids: [] };
        case 'EXCLUDE_PARENT': return { type: 'EXCLUDE', field, ids: [] };
        case 'EXCLUDE_ID': return { type: 'EXCLUDE', field, ids: [] };
        case 'OR_PARENT_SELF':
            return { type: 'OR', rules: [{ type: 'INCLUDE', field, ids: [] }, { type: 'SELF', field: selfField }] };
        default:
            return { type: 'ALLOW_ALL' };
    }
}

// ─── getIdsFromRule ───────────────────────────────────────────────────────────

export function getIdsFromRule(rule: IScopeRuleFE): string[] {
    if (rule.type === 'INCLUDE' || rule.type === 'EXCLUDE') return rule.ids;
    if (rule.type === 'OR') {
        const r = rule.rules.find(r => r.type === 'INCLUDE') as Extract<IScopeRuleFE, { type: 'INCLUDE' }> | undefined;
        return r?.ids ?? [];
    }
    return [];
}

export function setIdsInRule(rule: IScopeRuleFE, ids: string[]): IScopeRuleFE {
    if (rule.type === 'INCLUDE' || rule.type === 'EXCLUDE') return { ...rule, ids };
    if (rule.type === 'OR') {
        return { ...rule, rules: rule.rules.map(r => r.type === 'INCLUDE' ? { ...r, ids } : r) };
    }
    return rule;
}

export function getParentFieldFromRule(rule: IScopeRuleFE): string | null {
    if (rule.type === 'INCLUDE' || rule.type === 'EXCLUDE') return rule.field;
    if (rule.type === 'OR') {
        const r = rule.rules.find(r => r.type === 'INCLUDE') as Extract<IScopeRuleFE, { type: 'INCLUDE' }> | undefined;
        return r?.field ?? null;
    }
    return null;
}

export function ruleNeedsIds(rule: IScopeRuleFE): boolean {
    return getParentFieldFromRule(rule) !== null;
}

export function isParentFieldQuery(field: string | null): boolean {
    return !!field && field !== 'id';
}

export function preserveIdsOnRuleChange(newBase: IScopeRuleFE, prev: IScopeRuleFE): IScopeRuleFE {
    const prevField = getParentFieldFromRule(prev);
    const newField = getParentFieldFromRule(newBase);
    if (prevField && newField && prevField === newField) {
        const prevIds = getIdsFromRule(prev);
        if (prevIds.length) return setIdsInRule(newBase, prevIds);
    }
    return newBase;
}