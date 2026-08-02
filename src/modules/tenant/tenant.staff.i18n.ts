// src/modules/tenant/tenant.staff.i18n.ts
//
// Module-scoped i18n dictionary for the tenant staff/account-management UI
// (tenantAccountSection, tenantJoinRequests, tenantStaffSettings, permRow,
// permissionModal, tenantAccount pages). Kept separate from the central
// dictionaries/vi.ts + dictionaries/en.ts during the Phase-3 mass-extraction
// rollout to avoid merge conflicts with other agents working on other tenant
// modules in parallel. Intended to be merged into the central dictionaries
// later — every key here is namespaced under `tenant.` to match that plan.

export const tenantStaffVi = {
    tenant: {
        common: {
            saving: 'Đang lưu...',
            cancel: 'Hủy',
        },
        staff: {
            title: {
                tenantView: 'Danh sách nhân viên',
                adminView: 'Nhân viên tổ chức',
            },
            description: 'Quản lý tài khoản truy cập hệ thống',
            createButton: 'Cấp tài khoản',
            column: {
                staff: 'Nhân viên',
                role: 'Vai trò',
                status: 'Trạng thái',
            },
            noNameFallback: '(Chưa cập nhật tên)',
            role: {
                owner: 'Chủ sở hữu',
                manager: 'Quản lý',
                staff: 'Nhân viên',
                managerOperation: 'Quản lý vận hành',
                staffOperation: 'Nhân viên vận hành',
            },
            status: {
                locked: 'Khóa',
                active: 'Hoạt động',
            },
            impersonateButton: 'Truy cập',
            permissionButton: 'Phân quyền',
            impersonate: {
                redirecting: 'Đang chuyển hướng đến {name}...',
                tokenError: 'Không lấy được token truy cập.',
            },
            form: {
                accountBlockTitle: 'Tài khoản truy cập',
                username: 'Tên đăng nhập',
                initialPassword: 'Mật khẩu ban đầu',
                fullname: 'Tên nhân viên',
                fullnamePlaceholder: 'Họ và tên',
                email: 'Email công việc',
                roles: 'Vai trò hệ thống',
            },
        },
        joinRequests: {
            unknownUser: 'Người dùng',
            approveSuccess: 'Đã duyệt {name} vào đơn vị',
            approveError: 'Duyệt thất bại',
            title: 'Yêu cầu xin làm nhân sự',
            description: 'Người tự đăng ký tại trang đơn vị đang chờ bạn duyệt',
            column: {
                applicant: 'Người xin vào',
                sentDate: 'Ngày gửi',
            },
            approveButton: 'Duyệt',
            rejectButton: 'Từ chối',
            rejectConfirmTitle: 'Từ chối yêu cầu xin làm nhân sự này?',
        },
        staffSettings: {
            loadError: 'Không tải được cấu hình nhân sự. Vui lòng tải lại trang trước khi lưu.',
            saveSuccess: 'Đã lưu cấu hình nhân sự',
            saveError: 'Lưu cấu hình thất bại',
            title: 'Cấu hình tự đăng ký nhân sự',
            subtitle: 'Cho phép nhân sự tự đăng ký & thiết lập vai trò/quyền cấp sẵn khi họ tham gia.',
            loading: 'Đang tải cấu hình...',
            allowSelf: {
                label: 'Cho phép tự đăng ký',
                description: 'Hiện nút "Đăng ký & xin vào đơn vị" ở trang đăng nhập tenant.',
            },
            autoApprove: {
                label: 'Tự động duyệt yêu cầu',
                description: 'Lời xin làm nhân sự được duyệt ngay, không cần thao tác thủ công.',
            },
            defaultRoles: {
                label: 'Vai trò cấp khi khởi tạo',
                placeholder: 'Chọn vai trò mặc định...',
            },
            defaultPerms: {
                label: 'Quyền cấp sẵn',
                count: '({count} quyền)',
            },
            loadingPerms: 'Đang tải danh sách quyền...',
            deselectAll: 'Bỏ chọn',
            selectAll: 'Chọn tất cả',
            saveButton: 'Lưu cấu hình',
        },
        permission: {
            row: {
                excludeLabel: 'Ngoại trừ:',
                limitToLabel: 'Giới hạn vào ({label}):',
                defaultListLabel: 'danh sách',
                toggleOffTitle: 'Tắt quyền này',
                toggleOnTitle: 'Bật quyền này',
                manageScopeTitle: 'Phạm vi nhân viên này được phép cấp quyền cho người khác',
                allowAllOption: 'Ủy quyền toàn bộ',
                boundedOption: 'Giới hạn theo quyền của họ',
                missingFieldPrefix: '⚠️ Field',
                missingFieldSuffix: 'chưa có trong registry. Thêm vào',
            },
            modal: {
                loadErrorToast: 'Không tải được quyền hiện tại của tài khoản. Vui lòng đóng và thử lại.',
                saveSuccess: 'Đã lưu phân quyền cho {name}',
                saveError: 'Lưu quyền thất bại',
                subtitle: 'Bật quyền và chọn phạm vi truy cập cho từng chức năng. Nhân viên chỉ thấy và thao tác những gì được cấp quyền.',
                loadErrorBody: 'Không tải được quyền hiện tại. Vui lòng đóng và thử lại.',
                loading: 'Đang tải quyền...',
                disableAllTitle: 'Tắt tất cả',
                enableAllTitle: 'Bật tất cả',
                enabledCountSuffix: 'quyền đang bật',
                saveButton: 'Lưu phân quyền',
            },
        },
        accountProfile: {
            loadError: 'Không tải được thông tin tài khoản. Vui lòng tải lại trang trước khi lưu.',
            updateSuccess: 'Cập nhật thông tin thành công',
            updateError: 'Cập nhật thất bại',
            title: 'Hồ sơ tài khoản',
            subtitle: 'Thông tin hiển thị công khai và pháp lý',
            saveButton: 'Lưu thay đổi',
            fullnameLabel: 'Tên tài khoản',
        },
    },
};

export const tenantStaffEn = {
    tenant: {
        common: {
            saving: 'Saving...',
            cancel: 'Cancel',
        },
        staff: {
            title: {
                tenantView: 'Staff list',
                adminView: 'Organization staff',
            },
            description: 'Manage accounts with system access',
            createButton: 'Create account',
            column: {
                staff: 'Staff',
                role: 'Role',
                status: 'Status',
            },
            noNameFallback: '(Name not set)',
            role: {
                owner: 'Owner',
                manager: 'Manager',
                staff: 'Staff',
                managerOperation: 'Operations manager',
                staffOperation: 'Operations staff',
            },
            status: {
                locked: 'Locked',
                active: 'Active',
            },
            impersonateButton: 'Access',
            permissionButton: 'Permissions',
            impersonate: {
                redirecting: 'Redirecting to {name}...',
                tokenError: 'Could not get an access token.',
            },
            form: {
                accountBlockTitle: 'Login account',
                username: 'Username',
                initialPassword: 'Initial password',
                fullname: 'Staff name',
                fullnamePlaceholder: 'Full name',
                email: 'Work email',
                roles: 'System roles',
            },
        },
        joinRequests: {
            unknownUser: 'User',
            approveSuccess: 'Approved {name} to join the organization',
            approveError: 'Approval failed',
            title: 'Staff join requests',
            description: 'People who self-registered on the organization page, waiting for your approval',
            column: {
                applicant: 'Applicant',
                sentDate: 'Sent date',
            },
            approveButton: 'Approve',
            rejectButton: 'Reject',
            rejectConfirmTitle: 'Reject this staff join request?',
        },
        staffSettings: {
            loadError: 'Could not load staff settings. Please reload the page before saving.',
            saveSuccess: 'Staff settings saved',
            saveError: 'Failed to save settings',
            title: 'Staff self-registration settings',
            subtitle: 'Allow staff to self-register & configure the default role/permissions granted when they join.',
            loading: 'Loading settings...',
            allowSelf: {
                label: 'Allow self-registration',
                description: 'Show a "Register & request to join" button on the tenant login page.',
            },
            autoApprove: {
                label: 'Auto-approve requests',
                description: 'Join requests are approved instantly, with no manual action needed.',
            },
            defaultRoles: {
                label: 'Roles granted on join',
                placeholder: 'Select default roles...',
            },
            defaultPerms: {
                label: 'Default permissions',
                count: '({count} permissions)',
            },
            loadingPerms: 'Loading permission list...',
            deselectAll: 'Deselect all',
            selectAll: 'Select all',
            saveButton: 'Save settings',
        },
        permission: {
            row: {
                excludeLabel: 'Except:',
                limitToLabel: 'Limit to ({label}):',
                defaultListLabel: 'list',
                toggleOffTitle: 'Turn off this permission',
                toggleOnTitle: 'Turn on this permission',
                manageScopeTitle: 'Scope this staff member is allowed to grant permissions to others',
                allowAllOption: 'Full delegation',
                boundedOption: 'Limited to their own permissions',
                missingFieldPrefix: '⚠️ Field',
                missingFieldSuffix: 'is not registered yet. Add it to',
            },
            modal: {
                loadErrorToast: "Could not load the account's current permissions. Please close and try again.",
                saveSuccess: 'Permissions saved for {name}',
                saveError: 'Failed to save permissions',
                subtitle: 'Turn on permissions and choose the access scope for each feature. Staff will only see and act on what they are granted.',
                loadErrorBody: 'Could not load current permissions. Please close and try again.',
                loading: 'Loading permissions...',
                disableAllTitle: 'Turn off all',
                enableAllTitle: 'Turn on all',
                enabledCountSuffix: 'permissions enabled',
                saveButton: 'Save permissions',
            },
        },
        accountProfile: {
            loadError: 'Could not load account information. Please reload the page before saving.',
            updateSuccess: 'Information updated successfully',
            updateError: 'Update failed',
            title: 'Account profile',
            subtitle: 'Publicly displayed and legal information',
            saveButton: 'Save changes',
            fullnameLabel: 'Account name',
        },
    },
};
