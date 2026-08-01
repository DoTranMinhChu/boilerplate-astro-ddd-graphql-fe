// src/modules/merchant/components/RoleBadge.tsx


import { ERole } from '@/shared/generated/typed-graphql';
import { ROLE_LABELS } from '../merchant.constants';
import { For } from 'solid-js';

interface Props {
    role: ERole;
    /** agency → indigo, tenant → emerald, auto → phân loại từ tên role */
    variant?: 'agency' | 'tenant' | 'auto';
}

function resolveVariant(role: ERole, hint?: Props['variant']): 'agency' | 'tenant' {
    if (hint === 'agency') return 'agency';
    if (hint === 'tenant') return 'tenant';
    return role.startsWith('AGENCY_') ? 'agency' : 'tenant';
}

export function RoleBadge(props: Props) {
    const v = () => resolveVariant(props.role, props.variant);
    const cls = () =>
        v() === 'agency'
            ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
            : 'bg-emerald-50 text-emerald-700 border-emerald-100';

    return (
        <span class={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${cls()}`}>
            {ROLE_LABELS[props.role] ?? props.role}
        </span>
    );
}

/** List of role badges */
export function RoleBadgeList(props: { roles?: ERole[]; variant?: Props['variant'] }) {
    return (
        <div class="flex flex-wrap gap-1">
            <For each={props.roles ?? []}>
                {(role) => <RoleBadge role={role} variant={props.variant ?? 'auto'} />}
            </For>
        </div>
    );
}