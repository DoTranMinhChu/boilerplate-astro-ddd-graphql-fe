// ══════════════════════════════════════════════════════════════════════════════
// FILE 1: src/shared/contexts/permission/PermissionContext.tsx
// ══════════════════════════════════════════════════════════════════════════════

import { createContext, useContext, createSignal, createMemo, Accessor, JSX } from 'solid-js';
import { EPermission } from '@/shared/generated/typed-graphql';

// ─── IScopeRuleFE — mirror của BE ScopeRule (không import BE) ─────────────────

export type IScopeRuleFE =
    | { type: 'ALLOW_ALL' }
    | { type: 'DENY_ALL' }
    | { type: 'INCLUDE'; field: string; ids: string[] }
    | { type: 'EXCLUDE'; field: string; ids: string[] }
    | { type: 'SELF'; field: string }
    | { type: 'OR'; rules: IScopeRuleFE[] }
    | { type: 'AND'; rules: IScopeRuleFE[] };

export interface IPermissionEntry {
    permission: EPermission;
    scopeRule: IScopeRuleFE;
}

// ─── Context interface ────────────────────────────────────────────────────────

export interface IPermissionContext {
    permissions: Accessor<IPermissionEntry[]>;
    isLoaded: Accessor<boolean>;
    setPermissions: (perms: IPermissionEntry[]) => void;
    clearPermissions: () => void;

    /** Có quyền không? (scopeRule không phải DENY_ALL) */
    can: (permission: EPermission) => boolean;

    /** Có ít nhất 1 trong các permissions không? */
    canAny: (...permissions: EPermission[]) => boolean;

    /**
     * Có quyền nhưng bị giới hạn scope không?
     * true = không phải ALLOW_ALL (cần hiện "Giới hạn" badge trên UI)
     * false = ALLOW_ALL hoặc không có quyền
     */
    isLimited: (permission: EPermission) => boolean;

    /** Lấy IScopeRuleFE của permission — null nếu không có */
    getScope: (permission: EPermission) => IScopeRuleFE | null;

    /**
     * Lấy ids từ INCLUDE rule theo field.
     * Dùng để pre-filter dropdown/select trên UI.
     *
     * Ví dụ:
     *   getScopeIds(STAFF_VIEW, 'unitId') → ['u1','u2']
     *   → Filter unit dropdown chỉ hiện u1, u2
     *
     * Trả về [] nếu:
     *   - Không có permission
     *   - scope = ALLOW_ALL (không giới hạn)
     *   - scope = SELF (không có ids)
     */
    getScopeIds: (permission: EPermission, field: string) => string[];

    /**
     * Có quyền truy cập ít nhất 1 permission trong resourceGroup không?
     * Dùng để ẩn/hiện sidebar menu items.
     * resourceGroup là camelCase, ví dụ: 'unit', 'codeConfig'
     */
    canAccessResource: (resourceGroup: string) => boolean;
}

// ─── FALLBACK_FULL_ACCESS ─────────────────────────────────────────────────────
//
// Trả về khi usePermission() gọi ngoài PermissionProvider.
// Admin và Agency không cần PermissionProvider → full access.

const FALLBACK_FULL_ACCESS: IPermissionContext = {
    permissions: () => [],
    isLoaded: () => true,
    setPermissions: () => { },
    clearPermissions: () => { },
    can: () => true,
    canAny: () => true,
    isLimited: () => false,
    getScope: () => ({ type: 'ALLOW_ALL' }),
    getScopeIds: () => [],
    canAccessResource: () => true,
};

// ─── Context ──────────────────────────────────────────────────────────────────

const PermissionContext = createContext<IPermissionContext>();

export const usePermission = (): IPermissionContext =>
    useContext(PermissionContext) ?? FALLBACK_FULL_ACCESS;

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PermissionProvider(props: { children: JSX.Element }) {
    const [permissions, setPermissionsSignal] = createSignal<IPermissionEntry[]>([]);
    const [isLoaded, setIsLoaded] = createSignal(false);

    const permMap = createMemo(() => {
        const map = new Map<string, IPermissionEntry>();
        for (const entry of permissions()) map.set(entry.permission, entry);
        return map;
    });

    const can = (p: EPermission): boolean => {
        const entry = permMap().get(p);
        return !!entry && entry.scopeRule.type !== 'DENY_ALL';
    };

    const canAny = (...perms: EPermission[]): boolean => perms.some(p => can(p));

    const isLimited = (p: EPermission): boolean => {
        const entry = permMap().get(p);
        if (!entry || entry.scopeRule.type === 'DENY_ALL') return false;
        return entry.scopeRule.type !== 'ALLOW_ALL';
    };

    const getScope = (p: EPermission): IScopeRuleFE | null =>
        permMap().get(p)?.scopeRule ?? null;

    const getScopeIds = (p: EPermission, field: string): string[] => {
        const rule = getScope(p);
        if (!rule) return [];
        return _extractIdsFromRule(rule, field);
    };

    const canAccessResource = (resourceGroup: string): boolean => {
        const prefix = _camelToScreaming(resourceGroup) + '_';
        return permissions().some(e =>
            (e.permission as string).startsWith(prefix) && e.scopeRule.type !== 'DENY_ALL',
        );
    };

    const setPermissions = (perms: IPermissionEntry[]) => {
        setPermissionsSignal(perms);
        setIsLoaded(true);
    };

    const clearPermissions = () => {
        setPermissionsSignal([]);
        setIsLoaded(false);
    };

    return (
        <PermissionContext.Provider value={{
            permissions, isLoaded, setPermissions, clearPermissions,
            can, canAny, isLimited, getScope, getScopeIds, canAccessResource,
        }}>
            {props.children}
        </PermissionContext.Provider>
    );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _extractIdsFromRule(rule: IScopeRuleFE, field: string): string[] {
    if (rule.type === 'INCLUDE' && rule.field === field) return rule.ids;
    if (rule.type === 'OR') {
        for (const r of rule.rules) {
            const ids = _extractIdsFromRule(r, field);
            if (ids.length) return ids;
        }
    }
    if (rule.type === 'AND') {
        for (const r of rule.rules) {
            const ids = _extractIdsFromRule(r, field);
            if (ids.length) return ids;
        }
    }
    return [];
}

function _camelToScreaming(str: string): string {
    return str.replace(/([A-Z])/g, '_$1').toUpperCase();
}

