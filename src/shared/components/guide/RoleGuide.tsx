// src/shared/components/guide/RoleGuide.tsx
//
// Hướng dẫn vai trò: hiển thị tổ chức ở vai trò này làm gì & các bước trong
// chuỗi truy xuất quốc gia. Dùng nhúng vào trang Vai trò tổ chức / onboarding /
// các trang TXNG để mọi người hiểu phần việc của mình.

import { For, Show } from 'solid-js';
import { Icon } from '@shared/components/icons/Icon';
import { ETenantBusinessRole } from '@shared/generated/typed-graphql';
import { TENANT_BUSINESS_ROLE_META } from '@/shared/config/tenantBusinessRole.meta';

interface RoleGuideProps {
    role: ETenantBusinessRole;
    /** Ẩn phần "việc cần làm", chỉ hiện các bước TXNG */
    compact?: boolean;
}

export function RoleGuide(props: RoleGuideProps) {
    const meta = () => TENANT_BUSINESS_ROLE_META[props.role];

    return (
        <div class={`rounded-xl border p-4 ${meta().accent}`}>
            <div class="flex items-start gap-3">
                <div class="shrink-0 w-9 h-9 rounded-lg bg-white/70 flex items-center justify-center">
                    <Icon name={meta().icon} class="w-5 h-5" />
                </div>
                <div class="min-w-0">
                    <p class="font-bold text-sm">{meta().label}</p>
                    <p class="text-xs opacity-80 mt-0.5">{meta().description}</p>
                </div>
            </div>

            <Show when={!props.compact}>
                <div class="mt-3">
                    <p class="text-[11px] font-semibold uppercase tracking-wide opacity-70 mb-1">Việc cần làm</p>
                    <ul class="space-y-1">
                        <For each={meta().responsibilities}>
                            {(r) => (
                                <li class="flex items-start gap-1.5 text-xs">
                                    <Icon name="heroicons-outline:check-circle" class="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                    <span>{r}</span>
                                </li>
                            )}
                        </For>
                    </ul>
                </div>
            </Show>

            <div class="mt-3">
                <p class="text-[11px] font-semibold uppercase tracking-wide opacity-70 mb-1">
                    Vai trò trong chuỗi truy xuất quốc gia
                </p>
                <ol class="space-y-1">
                    <For each={meta().txngSteps}>
                        {(step, i) => (
                            <li class="flex items-start gap-2 text-xs">
                                <span class="shrink-0 w-4 h-4 rounded-full bg-white/80 text-[10px] font-bold flex items-center justify-center">
                                    {i() + 1}
                                </span>
                                <span>{step}</span>
                            </li>
                        )}
                    </For>
                </ol>
            </div>
        </div>
    );
}

export default RoleGuide;
