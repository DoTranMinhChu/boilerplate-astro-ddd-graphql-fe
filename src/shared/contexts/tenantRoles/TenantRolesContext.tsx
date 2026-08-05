// src/shared/contexts/tenantRoles/TenantRolesContext.tsx
//
// Vai trò nghiệp vụ của tổ chức (Tenant.businessRoles) — lái UX toàn app.
// Mirror cấu trúc FeatureContext. FALLBACK = full access (admin/dev/khi chưa load).

import { createContext, useContext, createSignal, JSX, Accessor } from 'solid-js';
import { ETenantBusinessRole } from '@/shared/generated/localEnums';

interface ITenantRolesContext {
    roles: Accessor<ETenantBusinessRole[]>;
    isLoaded: Accessor<boolean>;
    setRoles: (roles: ETenantBusinessRole[]) => void;
    hasRole: (role: ETenantBusinessRole) => boolean;
    hasAnyRole: (...roles: ETenantBusinessRole[]) => boolean;
    /** true nếu tổ chức ĐÃ cấu hình vai trò (để biết có nên gate theo vai trò chưa) */
    hasConfiguredRoles: Accessor<boolean>;
}

const FALLBACK: ITenantRolesContext = {
    roles: () => [],
    isLoaded: () => true,
    setRoles: () => {},
    hasRole: () => true,        // Fallback = full access
    hasAnyRole: () => true,
    hasConfiguredRoles: () => false,
};

const TenantRolesContext = createContext<ITenantRolesContext>();
export const useTenantRoles = () => useContext(TenantRolesContext) ?? FALLBACK;

export function TenantRolesProvider(props: { children: JSX.Element }) {
    const [roles, setRolesSignal] = createSignal<ETenantBusinessRole[]>([]);
    const [isLoaded, setIsLoaded] = createSignal(false);

    const setRoles = (r: ETenantBusinessRole[]) => {
        setRolesSignal(r ?? []);
        setIsLoaded(true);
    };

    const hasRole = (r: ETenantBusinessRole) => roles().includes(r);
    const hasAnyRole = (...r: ETenantBusinessRole[]) => r.some(hasRole);
    const hasConfiguredRoles = () => roles().length > 0;

    return (
        <TenantRolesContext.Provider
            value={{ roles, isLoaded, setRoles, hasRole, hasAnyRole, hasConfiguredRoles }}
        >
            {props.children}
        </TenantRolesContext.Provider>
    );
}
