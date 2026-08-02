// src/shared/i18n/layouts-shared.i18n.ts
//
// Scoped i18n dictionary for the Phase-3 mass-extraction rollout covering:
//   - src/layouts/**            -> `layout.*`
//   - src/shared/components/**  -> `shared.*`
//   - src/pages/**               -> `pages.*`
//
// This file is intentionally separate from the central dictionaries
// (src/shared/i18n/dictionaries/{vi,en}.ts) to avoid merge conflicts with
// other agents working on src/modules/** in parallel. It will be merged into
// the central dictionaries later.

import type { DeepPartial, Widen } from './t';

export const layoutsSharedVi = {
    layout: {
        typeName: {
            admin: 'Quản trị hệ thống',
            agency: 'Đối tác',
            tenant: 'Tổ chức',
            merchant: 'tài khoản',
        },
        account: {
            roleBadge: {
                admin: 'Hệ thống',
                agency: 'Đối tác',
                tenant: 'Tổ chức',
            },
            accountLabel: 'Tài khoản',
            profile: 'Hồ sơ cá nhân',
            changePassword: 'Đổi mật khẩu',
            logout: 'Đăng xuất',
        },
        breadcrumbs: {
            home: 'Trang chủ',
            admin: 'Hệ thống',
            agency: 'Đối tác',
            agencies: 'Đối tác',
            tenant: 'Tổ chức',
            tenants: 'Tổ chức',
            users: 'Tài khoản',
            customer: 'Khách hàng',
            brands: 'Thương hiệu',
            appearance: 'Giao diện và thương hiệu',
            merchant: 'Chuyên viên',
            memberShip: 'Tài khoản',
            invitation: 'Lời mời',
            inviteMerchant: 'Lời mời',
            staff: 'Nhân viên',
            organizationRoles: 'Vai trò tổ chức',
            stats: 'Thống kê',
            profile: 'Hồ sơ',
            unit: 'Đơn vị tính',
            codeConfig: 'Cấu hình mã',
            emailConfig: 'Cấu hình email',
            systemConfig: 'Cấu hình hệ thống',
            activityLog: 'Nhật ký hoạt động',
        },
        header: {
            title: 'Quản trị {typeName}',
        },
        seo: {
            homeTitle: 'Trang chủ',
            keyword: 'Truy xuất nguồn gốc',
        },
    },
    shared: {
        activityLog: {
            loading: 'Đang tải lịch sử…',
            loadError: 'Không tải được lịch sử hoạt động.',
            empty: 'Chưa có hoạt động nào được ghi nhận.',
            by: 'bởi {name}',
        },
        agency: {
            actingBar: {
                label: 'Thao tác với tổ chức:',
                placeholder: '— Chỉ xem tất cả tổ chức —',
                hintEmpty: 'Chọn tổ chức để tạo / chỉnh sửa dữ liệu cho tổ chức đó',
                hintSelected: 'Dữ liệu mới sẽ thuộc tổ chức này',
            },
            tenantFilter: {
                label: 'Tổ chức',
                placeholder: 'Lọc theo tổ chức...',
            },
            tenantFormField: {
                label: 'Tạo dữ liệu cho tổ chức',
                placeholder: 'Chọn tổ chức...',
                hint: 'Bản ghi mới sẽ thuộc về tổ chức được chọn.',
            },
        },
        controls: {
            enabledStatus: {
                active: 'Đang hoạt động',
                inactive: 'Ngừng hoạt động',
            },
            enabledToggle: {
                disableSuccess: 'Ngừng hoạt động thành công',
                disableError: 'Ngừng hoạt động thất bại',
                enableSuccess: 'Bật hoạt động thành công',
                enableError: 'Bật hoạt động thất bại',
            },
        },
        dialog: {
            accountPassword: {
                submitLabel: 'Xác nhận đã lưu mật khẩu',
                calloutTitle: 'Xin lưu mật khẩu ở nơi an toàn',
                calloutContent: 'Thông tin này chỉ hiện một lần duy nhất',
                usernameLabel: 'Email đăng nhập',
                passwordLabel: 'Mật khẩu',
            },
        },
        fields: {
            code: {
                hintLength: 'Từ {min} đến {max} ký tự',
                hintChars: 'Gồm chữ thường, số, gạch ngang và gạch dưới',
                hintSpecial: 'Không đặt ký tự đặc biệt ở đầu, cuối hoặc liên tiếp',
                invalid: '{label} không hợp lệ',
            },
            password: {
                label: 'Mật khẩu',
                description: 'Khuyến nghị dùng tính năng đề xuất mật khẩu, mật khẩu sẽ hiển thị để sao chép sau khi tạo thành công.',
                hint: 'Từ {min} đến {max} ký tự hoa thường, ký tự đặc biệt và số',
                suggestButton: 'Đề xuất mật khẩu',
            },
            username: {
                label: 'Tên đăng nhập',
            },
        },
        password: {
            changeForm: {
                errorRequired: 'Vui lòng điền đầy đủ thông tin',
                errorMinLength: 'Mật khẩu mới phải có ít nhất 6 ký tự',
                errorMismatch: 'Mật khẩu xác nhận không khớp',
                success: 'Đổi mật khẩu thành công',
                title: 'Đổi mật khẩu',
                subtitle: 'Cập nhật mật khẩu đăng nhập của bạn',
                oldPasswordLabel: 'Mật khẩu hiện tại',
                oldPasswordPlaceholder: 'Nhập mật khẩu hiện tại',
                newPasswordLabel: 'Mật khẩu mới',
                newPasswordPlaceholder: 'Tối thiểu 6 ký tự',
                confirmPasswordLabel: 'Xác nhận mật khẩu mới',
                confirmPasswordPlaceholder: 'Nhập lại mật khẩu mới',
                submitLabel: 'Cập nhật mật khẩu',
            },
        },
    },
    pages: {
        resetPassword: {
            title: 'Đặt lại mật khẩu',
        },
    },
} as const;

export const layoutsSharedEn: DeepPartial<Widen<typeof layoutsSharedVi>> = {
    layout: {
        typeName: {
            admin: 'System administration',
            agency: 'Agency',
            tenant: 'Organization',
            merchant: 'account',
        },
        account: {
            roleBadge: {
                admin: 'System',
                agency: 'Agency',
                tenant: 'Organization',
            },
            accountLabel: 'Account',
            profile: 'My profile',
            changePassword: 'Change password',
            logout: 'Log out',
        },
        breadcrumbs: {
            home: 'Home',
            admin: 'System',
            agency: 'Agency',
            agencies: 'Agency',
            tenant: 'Organization',
            tenants: 'Organization',
            users: 'Accounts',
            customer: 'Customers',
            brands: 'Brands',
            appearance: 'Appearance & branding',
            merchant: 'Staff',
            memberShip: 'Accounts',
            invitation: 'Invitations',
            inviteMerchant: 'Invitations',
            staff: 'Staff',
            organizationRoles: 'Organization roles',
            stats: 'Statistics',
            profile: 'Profile',
            unit: 'Units',
            codeConfig: 'Code configuration',
            emailConfig: 'Email configuration',
            systemConfig: 'System configuration',
            activityLog: 'Activity log',
        },
        header: {
            title: '{typeName} administration',
        },
        seo: {
            homeTitle: 'Home',
            keyword: 'Traceability',
        },
    },
    shared: {
        activityLog: {
            loading: 'Loading history…',
            loadError: 'Failed to load activity history.',
            empty: 'No activity recorded yet.',
            by: 'by {name}',
        },
        agency: {
            actingBar: {
                label: 'Acting on behalf of:',
                placeholder: '— View all organizations —',
                hintEmpty: 'Select an organization to create / edit data for it',
                hintSelected: 'New data will belong to this organization',
            },
            tenantFilter: {
                label: 'Organization',
                placeholder: 'Filter by organization...',
            },
            tenantFormField: {
                label: 'Create data for organization',
                placeholder: 'Select organization...',
                hint: 'The new record will belong to the selected organization.',
            },
        },
        controls: {
            enabledStatus: {
                active: 'Active',
                inactive: 'Inactive',
            },
            enabledToggle: {
                disableSuccess: 'Deactivated successfully',
                disableError: 'Failed to deactivate',
                enableSuccess: 'Activated successfully',
                enableError: 'Failed to activate',
            },
        },
        dialog: {
            accountPassword: {
                submitLabel: 'Confirm password saved',
                calloutTitle: 'Please save this password somewhere safe',
                calloutContent: 'This information is shown only once',
                usernameLabel: 'Login email',
                passwordLabel: 'Password',
            },
        },
        fields: {
            code: {
                hintLength: '{min} to {max} characters',
                hintChars: 'Lowercase letters, numbers, hyphens and underscores',
                hintSpecial: 'No special characters at the start, end, or consecutively',
                invalid: '{label} is invalid',
            },
            password: {
                label: 'Password',
                description: 'We recommend using the password suggestion feature; the password will be shown once for copying after creation.',
                hint: '{min} to {max} characters, mixing upper/lowercase, special characters and numbers',
                suggestButton: 'Suggest password',
            },
            username: {
                label: 'Username',
            },
        },
        password: {
            changeForm: {
                errorRequired: 'Please fill in all required information',
                errorMinLength: 'New password must be at least 6 characters',
                errorMismatch: 'Password confirmation does not match',
                success: 'Password changed successfully',
                title: 'Change password',
                subtitle: 'Update your login password',
                oldPasswordLabel: 'Current password',
                oldPasswordPlaceholder: 'Enter current password',
                newPasswordLabel: 'New password',
                newPasswordPlaceholder: 'At least 6 characters',
                confirmPasswordLabel: 'Confirm new password',
                confirmPasswordPlaceholder: 'Re-enter new password',
                submitLabel: 'Update password',
            },
        },
    },
    pages: {
        resetPassword: {
            title: 'Reset password',
        },
    },
};
