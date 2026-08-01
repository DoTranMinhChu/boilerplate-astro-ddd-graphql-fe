import { Show } from 'solid-js';

export interface AgencyTenantInfo {
    id?: string | null;
    name?: string | null;
    code?: string | null;
}

/**
 * Ô hiển thị "Tổ chức" trong bảng dành cho Agency — cho biết bản ghi thuộc tenant nào.
 * Dùng qua <Datatable.TenantColumn /> (tự ẩn ở giao diện Tenant).
 */
export function AgencyTenantCell(props: { tenant?: AgencyTenantInfo | null; tenantId?: string | null }) {
    const name = () => props.tenant?.name ?? undefined;
    const code = () => props.tenant?.code ?? undefined;
    return (
        <Show
            when={name() || code() || props.tenantId}
            fallback={<span class="text-xs text-slate-300">—</span>}
        >
            <div class="flex items-center gap-2 min-w-[120px]">
                <span class="w-6 h-6 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0 text-[11px] font-black">
                    {(name() ?? code() ?? '?').charAt(0).toUpperCase()}
                </span>
                <div class="min-w-0">
                    <p class="text-xs font-bold text-slate-700 truncate max-w-[160px]">
                        {name() ?? code() ?? '—'}
                    </p>
                    <Show when={code() && name()}>
                        <p class="text-[10px] text-slate-400 font-mono truncate">{code()}</p>
                    </Show>
                </div>
            </div>
        </Show>
    );
}
