import { Field } from '@core/components/form/Field';
import { Select } from '@core/components/control/Select';
import { TenantService } from '@/shared/services/tenant/tenant.service';
import { t } from '@/shared/i18n/t';

/**
 * Bộ lọc "Tổ chức" cho Agency — đặt bên trong <Datatable.Filter>.
 * Chọn 1 tổ chức → filter.tenantId, danh sách thu hẹp về tenant đó.
 * Dùng qua <Datatable.TenantFilter /> (tự ẩn ở giao diện Tenant).
 */
export function AgencyTenantFilterField(props: { label?: string }) {
    return (
        <Field name="tenantId" label={t('shared.agency.tenantFilter.label')}>
            <Select
                nullable
                clearable
                hasSubtext
                placeholder={props.label ?? t('shared.agency.tenantFilter.placeholder')}
                optionsQuery={{
                    query: (i: any) => TenantService.getAllTenant({ input: i.input }),
                    option: (t: any) => ({ label: t.name, value: t.id, subText: t.code }),
                }}
            />
        </Field>
    );
}
