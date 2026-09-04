// Static UI text dictionary — Vietnamese (default locale). Namespaced keys:
// "<area>.<thing>" (e.g. "common.save", "tenant.detail.title"). Each top-level
// namespace beyond `common`/`locale` is authored in its own module-scoped file
// (co-located with the feature it covers) and merged here — keeps large dictionaries
// out of one unwieldy file and lets each module's extraction be reviewed/owned
// independently.
import { adminVi } from '@/modules/admin/admin.i18n';
import { agencyVi } from '@/modules/agency/agency.i18n';
import { authVi } from '@/modules/auth/auth.i18n';
import { cmsVi } from '@/modules/cms/cms.i18n';
import { codeConfigVi } from '@/modules/codeConfig/codeConfig.i18n';
import { editorVi } from '@shared/components/editor/editor.i18n';
import { merchantVi } from '@/modules/merchant/merchant.i18n';
import { tenantAuthOrgVi } from '@/modules/tenant/tenant.auth-org.i18n';
import { tenantStaffVi } from '@/modules/tenant/tenant.staff.i18n';
import { unitVi } from '@/modules/unit/unit.i18n';
import { layoutsSharedVi } from '../layouts-shared.i18n';

export const vi = {
    common: {
        save: 'Lưu',
        cancel: 'Hủy',
        delete: 'Xóa',
        edit: 'Sửa',
        close: 'Đóng',
        confirm: 'Xác nhận',
        loading: 'Đang tải...',
        search: 'Tìm kiếm',
        noData: 'Không có dữ liệu',
        error: 'Đã có lỗi xảy ra',
        retry: 'Thử lại',
        back: 'Quay lại',
        next: 'Tiếp theo',
        yes: 'Có',
        no: 'Không',
    },
    locale: {
        switcherLabel: 'Ngôn ngữ',
        vi: 'Tiếng Việt',
        en: 'Tiếng Anh',
    },
    ...adminVi,
    ...agencyVi,
    ...authVi,
    ...cmsVi,
    ...codeConfigVi,
    ...editorVi,
    ...merchantVi,
    ...unitVi,
    ...layoutsSharedVi,
    tenant: {
        ...tenantAuthOrgVi.tenant,
        ...tenantStaffVi.tenant,
    },
} as const;
