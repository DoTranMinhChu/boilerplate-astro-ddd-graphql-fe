import { Show } from 'solid-js';
import { Select } from '@core/components/control/Select';
import { Icon } from '@shared/components/icons/Icon';
import { TenantService } from '@/shared/services/tenant/tenant.service';
import { agencyActingTenantId, setAgencyActingTenantId } from '@/shared/contexts/agency/agencyActingTenant';

/**
 * Thanh "Đang thao tác với tổ chức" — chỉ hiển thị ở giao diện Agency.
 *
 * Agency chọn 1 tổ chức ở đây → MỌI thao tác TẠO/SỬA dữ liệu sẽ nhắm vào tổ chức đó
 * (gửi qua header x-acting-tenant-id; backend đã validate tổ chức thuộc agency này).
 * Khi để trống → chỉ xem (oversight toàn bộ tổ chức của agency), không tạo được.
 *
 * Đây là "input theo tenant lúc tạo" dùng chung cho mọi trang — không cần lặp ở từng form.
 */
export function AgencyActingTenantBar() {
    return (
        <div class="flex items-center gap-3 px-4 py-2 mb-4 rounded-xl border border-violet-100 bg-violet-50/60">
            <div class="flex items-center gap-1.5 text-violet-700 shrink-0">
                <Icon name="heroicons-outline:building-office-2" class="w-4 h-4" />
                <span class="text-xs font-bold whitespace-nowrap">Thao tác với tổ chức:</span>
            </div>
            <div class="min-w-[240px] max-w-[360px] flex-1">
                <Select
                    value={agencyActingTenantId() ?? undefined}
                    onChange={(v: any) => setAgencyActingTenantId(v ?? null)}
                    clearable
                    hasSubtext
                    placeholder="— Chỉ xem tất cả tổ chức —"
                    optionsQuery={{
                        query: (i: any) => TenantService.getAllTenant({ input: i.input }),
                        option: (t: any) => ({ label: t.name, value: t.id, subText: t.code }),
                    }}
                />
            </div>
            <Show
                when={agencyActingTenantId()}
                fallback={
                    <span class="text-[11px] text-slate-400 hidden md:inline">
                        Chọn tổ chức để tạo / chỉnh sửa dữ liệu cho tổ chức đó
                    </span>
                }
            >
                <span class="text-[11px] text-emerald-600 font-semibold hidden md:inline-flex items-center gap-1">
                    <Icon name="heroicons-outline:check-circle" class="w-3.5 h-3.5" />
                    Dữ liệu mới sẽ thuộc tổ chức này
                </span>
            </Show>
        </div>
    );
}
