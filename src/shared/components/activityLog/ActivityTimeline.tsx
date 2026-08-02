// src/shared/components/activityLog/ActivityTimeline.tsx
//
// Timeline nhật ký hoạt động của MỘT entity. Nhúng vào trang chi tiết
// (vd: chi tiết đợt tem, hồ sơ, lô...) để xem lịch sử thao tác.

import { createResource, For, Show } from 'solid-js';
import { Icon } from '@shared/components/icons/Icon';
import { ActivityLogService, ActivityLogDTO } from '@/shared/services/activityLog/activityLog.service';
import { ACTIVITY_ACTION_META, formatActivityTime } from './activityLog.meta';
import { t } from '@/shared/i18n/t';

interface ActivityTimelineProps {
    entityType: string;
    entityId: string;
    /** Tiêu đề tuỳ chọn */
    title?: string;
}

export function ActivityTimeline(props: ActivityTimelineProps) {
    const [items] = createResource(
        () => ({ entityType: props.entityType, entityId: props.entityId }),
        (args) => ActivityLogService.getEntityTimeline(args),
    );

    return (
        <div>
            <Show when={props.title}>
                <p class="text-sm font-semibold text-slate-700 mb-2">{props.title}</p>
            </Show>

            <Show
                when={!items.loading}
                fallback={<p class="text-xs text-slate-400 py-4 text-center">{t('shared.activityLog.loading')}</p>}
            >
                {/* A load failure must not render identically to "genuinely no history" —
                    that hides real errors (permissions, network) behind a misleading
                    "empty" message that looks like a normal, expected state. */}
                <Show
                    when={!items.error}
                    fallback={<p class="text-xs text-red-400 py-4 text-center">{t('shared.activityLog.loadError')}</p>}
                >
                <Show
                    when={(items() ?? []).length > 0}
                    fallback={<p class="text-xs text-slate-400 py-4 text-center">{t('shared.activityLog.empty')}</p>}
                >
                    <ol class="relative border-l border-slate-200 ml-2 space-y-4">
                        <For each={items() as ActivityLogDTO[]}>
                            {(it) => {
                                const meta = ACTIVITY_ACTION_META[it.action ?? ''] ?? ACTIVITY_ACTION_META.OTHER;
                                return (
                                    <li class="ml-4">
                                        <span
                                            class={`absolute -left-[9px] flex items-center justify-center w-4 h-4 rounded-full ${meta.dot}`}
                                        >
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
                                        <Show when={it.actorName}>
                                            <p class="text-[11px] text-slate-400 mt-0.5">
                                                {t('shared.activityLog.by', { name: it.actorName ?? '' })}
                                            </p>
                                        </Show>
                                    </li>
                                );
                            }}
                        </For>
                    </ol>
                </Show>
                </Show>
            </Show>
        </div>
    );
}

export default ActivityTimeline;
