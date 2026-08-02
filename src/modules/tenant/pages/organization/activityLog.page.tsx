// src/modules/tenant/pages/organization/activityLog.page.tsx
//
// Trang "Lịch sử hoạt động" — tra cứu toàn bộ nhật ký hành động của tổ chức.
// Lọc theo loại đối tượng + loại hành động, tải thêm theo cursor.

import { createSignal, onMount, For, Show } from 'solid-js';
import { Card } from '@core/components/utilities/Card';
import { Button } from '@core/components/button/Button';
import { Icon } from '@shared/components/icons/Icon';
import { toast } from '@core/components/toast/ToastProvider';
import { ActivityLogService, ActivityLogDTO } from '@/shared/services/activityLog/activityLog.service';
import {
    ACTIVITY_ACTION_META,
    ACTIVITY_ACTION_FILTER_OPTIONS,
    formatActivityTime,
} from '@/shared/components/activityLog/activityLog.meta';

const ENTITY_TYPE_OPTIONS: { value: string; label: string }[] = [
    { value: '', label: 'Tất cả đối tượng' },
    { value: 'Tenant', label: 'Tổ chức' },
    { value: 'TenantAccount', label: 'Nhân viên' },
    { value: 'Unit', label: 'Đơn vị tính' },
    { value: 'CodeConfig', label: 'Cấu hình mã' },
];

const PAGE_SIZE = 20;

export function ActivityLogPage() {
    const [items, setItems] = createSignal<ActivityLogDTO[]>([]);
    const [loading, setLoading] = createSignal(false);
    const [hasNext, setHasNext] = createSignal(false);
    const [cursor, setCursor] = createSignal<string | undefined>(undefined);

    const [entityType, setEntityType] = createSignal('');
    const [action, setAction] = createSignal('');

    const buildFilter = () => {
        const f: Record<string, any> = {};
        if (entityType()) f.entityType = entityType();
        if (action()) f.action = action();
        return f;
    };

    const fetchPage = async (reset: boolean) => {
        setLoading(true);
        try {
            const res = await ActivityLogService.getAllActivityLog({
                input: {
                    filter: buildFilter(),
                    after: reset ? undefined : cursor(),
                    limit: PAGE_SIZE,
                    sort: { createdAt: 'DESC' },
                } as any,
            });
            const nodes = (res.edges ?? []).map((e: { node: ActivityLogDTO }) => e.node) as ActivityLogDTO[];
            setItems((prev) => (reset ? nodes : [...prev, ...nodes]));
            setHasNext(!!res.pageInfo?.hasNextPage);
            setCursor(res.pageInfo?.endCursor ?? undefined);
        } catch (e: any) {
            toast().danger(e?.message ?? 'Không tải được lịch sử hoạt động');
        } finally {
            setLoading(false);
        }
    };

    const applyFilter = () => {
        setCursor(undefined);
        fetchPage(true);
    };

    onMount(() => fetchPage(true));

    return (
        <div class="space-y-6 animate-in">
            <Card>
                <div class="p-6">
                    <h1 class="text-lg font-bold text-slate-800">Lịch sử hoạt động</h1>
                    <p class="text-sm text-slate-500 mt-1">
                        Mọi thao tác quan trọng đều được ghi lại để tra cứu và kiểm toán.
                    </p>

                    {/* Filter bar */}
                    <div class="flex flex-wrap items-center gap-2 mt-4">
                        <select
                            class="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700
                                   focus:outline-none focus:ring-1 focus:ring-blue-300"
                            value={entityType()}
                            onInput={(e) => setEntityType(e.currentTarget.value)}
                        >
                            <For each={ENTITY_TYPE_OPTIONS}>
                                {(o) => <option value={o.value}>{o.label}</option>}
                            </For>
                        </select>
                        <select
                            class="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700
                                   focus:outline-none focus:ring-1 focus:ring-blue-300"
                            value={action()}
                            onInput={(e) => setAction(e.currentTarget.value)}
                        >
                            <option value="">Tất cả hành động</option>
                            <For each={ACTIVITY_ACTION_FILTER_OPTIONS}>
                                {(o) => <option value={o.value}>{o.label}</option>}
                            </For>
                        </select>
                        <Button label="Lọc" color="main" onClick={applyFilter} disabled={loading()} />
                    </div>

                    {/* List */}
                    <div class="mt-5">
                        <Show
                            when={items().length > 0}
                            fallback={
                                <p class="text-sm text-slate-400 py-8 text-center">
                                    {loading() ? 'Đang tải…' : 'Chưa có hoạt động nào.'}
                                </p>
                            }
                        >
                            <ol class="relative border-l border-slate-200 ml-2 space-y-4">
                                <For each={items()}>
                                    {(it) => {
                                        const meta = ACTIVITY_ACTION_META[it.action ?? ''] ?? ACTIVITY_ACTION_META.OTHER;
                                        return (
                                            <li class="ml-4">
                                                <span class={`absolute -left-[9px] flex items-center justify-center w-4 h-4 rounded-full ${meta.dot}`}>
                                                    <Icon name={meta.icon} class="w-2.5 h-2.5 text-white" />
                                                </span>
                                                <div class="flex items-center gap-2 flex-wrap">
                                                    <span class={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${meta.chip}`}>
                                                        {meta.label}
                                                    </span>
                                                    <span class="text-[11px] text-slate-400">
                                                        {formatActivityTime(it.createdAt)}
                                                    </span>
                                                </div>
                                                <p class="text-sm text-slate-700 mt-0.5">{it.summary ?? '—'}</p>
                                                <p class="text-[11px] text-slate-400 mt-0.5">
                                                    <Show when={it.actorName}>bởi {it.actorName} · </Show>
                                                    {it.entityType}
                                                </p>
                                            </li>
                                        );
                                    }}
                                </For>
                            </ol>

                            <Show when={hasNext()}>
                                <div class="flex justify-center mt-5">
                                    <Button
                                        label={loading() ? 'Đang tải…' : 'Tải thêm'}
                                        color="neutral"
                                        onClick={() => fetchPage(false)}
                                        disabled={loading()}
                                    />
                                </div>
                            </Show>
                        </Show>
                    </div>
                </div>
            </Card>
        </div>
    );
}

export default ActivityLogPage;
