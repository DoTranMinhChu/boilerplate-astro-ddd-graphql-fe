import type { DeepPartial, Widen } from '../t';
import type { vi } from './vi';
import { adminEn } from '@/modules/admin/admin.i18n';
import { agencyEn } from '@/modules/agency/agency.i18n';
import { authEn } from '@/modules/auth/auth.i18n';
import { cmsEn } from '@/modules/cms/cms.i18n';
import { codeConfigEn } from '@/modules/codeConfig/codeConfig.i18n';
import { editorEn } from '@core/components/control/editor/editor.i18n';
import { merchantEn } from '@/modules/merchant/merchant.i18n';
import { tenantAuthOrgEn } from '@/modules/tenant/tenant.auth-org.i18n';
import { tenantStaffEn } from '@/modules/tenant/tenant.staff.i18n';
import { unitEn } from '@/modules/unit/unit.i18n';
import { layoutsSharedEn } from '../layouts-shared.i18n';

// English dictionary — must eventually mirror every key in vi.ts. Typed as a
// DeepPartial of the vi dictionary's shape (not a required mirror) so a missing key
// during Phase 3's incremental rollout doesn't break the build; t() falls back to the
// Vietnamese string for any key not yet translated (see t.ts).
export const en: DeepPartial<Widen<typeof vi>> = {
    common: {
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        close: 'Close',
        confirm: 'Confirm',
        loading: 'Loading...',
        search: 'Search',
        noData: 'No data',
        error: 'Something went wrong',
        retry: 'Retry',
        back: 'Back',
        next: 'Next',
        yes: 'Yes',
        no: 'No',
    },
    locale: {
        switcherLabel: 'Language',
        vi: 'Vietnamese',
        en: 'English',
    },
    ...adminEn,
    ...agencyEn,
    ...authEn,
    ...cmsEn,
    ...codeConfigEn,
    ...editorEn,
    ...merchantEn,
    ...unitEn,
    ...layoutsSharedEn,
    tenant: {
        ...tenantAuthOrgEn.tenant,
        ...tenantStaffEn.tenant,
    },
};
