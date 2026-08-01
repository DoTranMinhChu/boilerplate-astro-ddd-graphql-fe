import { Select } from '@core/components/control/Select';
import { TenantService } from '@/shared/services/tenant/tenant.service';
import { agencyActingTenantId, setAgencyActingTenantId } from '@/shared/contexts/agency/agencyActingTenant';

/**
 * Bộ chọn "Tạo dữ liệu cho tổ chức nào" — chỉ hiện khi Agency tạo bản ghi mới.
 *
 * KHÔNG bind vào field của form (để không lọt tenantId vào biến GraphQL — schema
 * không có field này). Thay vào đó ghi vào signal toàn cục `agencyActingTenantId`,
 * giá trị sẽ đi kèm request qua header `x-acting-tenant-id`; backend stamp tenantId.
 *
 * Dùng qua <Datatable.TenantField /> (tự ẩn ở giao diện Tenant).
 */
export function AgencyTenantFormField(props: { label?: string }) {
    return (
        <div class="col-span-12">
            <label class="block text-xs font-bold text-slate-600 mb-1.5">
                {props.label ?? 'Tạo dữ liệu cho tổ chức'} <span class="text-red-500 ml-0.5">*</span>
            </label>
            <Select
                value={agencyActingTenantId() ?? undefined}
                onChange={(v: any) => setAgencyActingTenantId(v ?? null)}
                clearable
                hasSubtext
                placeholder="Chọn tổ chức..."
                optionsQuery={{
                    query: (i: any) => TenantService.getAllTenant({ input: i.input }),
                    option: (t: any) => ({ label: t.name, value: t.id, subText: t.code }),
                }}
            />
            <p class="text-[10px] text-slate-400 mt-1">
                Bản ghi mới sẽ thuộc về tổ chức được chọn.
            </p>
        </div>
    );
}
