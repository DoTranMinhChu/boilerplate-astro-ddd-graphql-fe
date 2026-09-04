// src/modules/agency/agency.i18n.ts
//
// Module-scoped i18n dictionary for src/modules/agency/**. Kept separate from the
// central src/shared/i18n/dictionaries/{vi,en}.ts during the Phase-3 mass-extraction
// rollout to avoid merge conflicts with other agents editing those files in parallel.
// All keys are namespaced under `agency.` and are meant to be merged into the central
// vi/en dictionaries later.

export const agencyVi = {
  agency: {
    account: {
      impersonate: {
        redirecting: 'Đang chuyển hướng đến {name}...',
        tokenError: 'Không lấy được token truy cập.',
      },
      table: {
        title: 'Nhân sự đối tác',
        description: 'Tài khoản quản trị viên của Agency',
        createLabel: 'Cấp tài khoản',
      },
      column: {
        fullname: 'Nhân sự',
        roles: 'Quyền hạn',
        status: 'Trạng thái',
      },
      noName: '(Chưa cập nhật tên)',
      action: {
        access: 'Truy cập',
      },
      form: {
        loginInfoTitle: 'Thông tin đăng nhập',
        usernameLabel: 'Username',
        passwordLabel: 'Mật khẩu',
        fullnameLabel: 'Họ và tên',
        fullnamePlaceholder: 'Nguyễn Văn A',
        emailLabel: 'Email',
        rolesLabel: 'Vai trò',
        roleOwner: 'Chủ sở hữu (Owner)',
        roleManager: 'Quản lý (Manager)',
        activateLabel: 'Kích hoạt',
      },
    },
    changePassword: {
      note: 'Tài khoản Agency sử dụng chung mật khẩu với tài khoản Merchant liên kết. Khi đổi mật khẩu, mật khẩu Merchant cũng thay đổi theo.',
    },
    common: {
      na: 'N/A',
    },
    list: {
      title: 'Danh sách đối tác',
      description: 'Quản lý các đối tác đối tác',
      createLabel: 'Thêm đối tác',
      columnPartner: 'Đối Tác',
      codeLabel: 'Mã:',
      columnContact: 'Liên hệ',
      columnTaxCode: 'Mã số thuế',
      detailLabel: 'Chi tiết',
      formTitle: 'Thông tin Agency',
      codeFieldLabel: 'Mã định danh',
      nameFieldLabel: 'Tên đối tác',
      namePlaceholder: 'Ví dụ: Công ty AI Việt Nam',
      contactEmailLabel: 'Email liên hệ',
      taxCodeFieldLabel: 'Mã số thuế',
      websiteLabel: 'Website',
    },
    login: {
      welcomeToast: 'Xin chào, {name}',
      sessionInvalidToast: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
      loginFailedError: 'Đăng nhập thất bại',
      verifyingSession: 'Đang xác thực phiên đăng nhập...',
      portalTitle: 'Agency Portal',
      subtitle: 'Đăng nhập với tài khoản đối tác',
      codeLabel: 'Mã đối tác',
      codePlaceholder: 'Nhập mã đối tác...',
      usernameLabel: 'Tên đăng nhập',
      usernamePlaceholder: 'Nhập username...',
      passwordLabel: 'Mật khẩu',
      forgotPassword: 'Quên mật khẩu?',
      submitLabel: 'Đăng nhập',
    },
    forgotPassword: {
      pageTitle: 'Quên mật khẩu',
      heading: 'Quên mật khẩu',
      subtitle: 'Nhập mã đối tác và tên đăng nhập để nhận link đặt lại mật khẩu',
      // Final-review fix (Important 1): AgencyAccountService.forgotPassword (BE) chỉ tìm theo
      // username ({ username: login, agencyId }) — KHÔNG thử theo email như Merchant. Nhãn/text
      // cũ mời nhập email và nói "nếu email tồn tại" là sai — người dùng gõ email sẽ luôn rơi
      // vào nhánh silent-return (chống account-enumeration) và không bao giờ nhận được mail,
      // không có lỗi, không có gợi ý retry — một ngõ cụt câm lặng cho chính flow vừa được thêm.
      successMessage: 'Nếu tài khoản tồn tại trong hệ thống, chúng tôi đã gửi link đặt lại mật khẩu.',
      successHint: 'Link có hiệu lực trong 30 phút.',
      backToLoginButton: 'Quay lại đăng nhập',
      codeFieldLabel: 'Mã đối tác',
      codePlaceholder: 'Nhập mã đối tác...',
      loginFieldLabel: 'Tên đăng nhập',
      loginPlaceholder: 'Nhập tên đăng nhập...',
      submitLabel: 'Gửi link đặt lại mật khẩu',
      errors: {
        codeRequired: 'Vui lòng nhập mã đối tác',
        loginRequired: 'Vui lòng nhập tên đăng nhập',
      },
    },
    detail: {
      loadError: 'Không tải được thông tin đại lý.',
      subtitle: 'Quản trị đối tác chiến lược',
      infoTab: 'Thông tin & Nhân sự',
      emailLabel: 'Email',
      codeLabel: 'Mã định danh',
      taxCodeLabel: 'Mã số thuế',
      websiteLabel: 'Website',
      renewalTab: 'Lịch sử gia hạn',
      renewalComingSoonTitle: 'Tính năng đang phát triển',
      renewalComingSoonDescription: 'Hệ thống thanh toán và gia hạn đang được tích hợp.',
    },
  },
};

export const agencyEn = {
  agency: {
    account: {
      impersonate: {
        redirecting: 'Redirecting to {name}...',
        tokenError: 'Failed to obtain access token.',
      },
      table: {
        title: 'Agency staff',
        description: 'Agency administrator accounts',
        createLabel: 'Add account',
      },
      column: {
        fullname: 'Staff',
        roles: 'Roles',
        status: 'Status',
      },
      noName: '(Name not set)',
      action: {
        access: 'Access',
      },
      form: {
        loginInfoTitle: 'Login information',
        usernameLabel: 'Username',
        passwordLabel: 'Password',
        fullnameLabel: 'Full name',
        fullnamePlaceholder: 'John Doe',
        emailLabel: 'Email',
        rolesLabel: 'Role',
        roleOwner: 'Owner',
        roleManager: 'Manager',
        activateLabel: 'Active',
      },
    },
    changePassword: {
      note: 'The Agency account shares its password with the linked Merchant account. Changing the password will also change the Merchant password.',
    },
    common: {
      na: 'N/A',
    },
    list: {
      title: 'Agency list',
      description: 'Manage agency partners',
      createLabel: 'Add agency',
      columnPartner: 'Agency',
      codeLabel: 'Code:',
      columnContact: 'Contact',
      columnTaxCode: 'Tax code',
      detailLabel: 'Details',
      formTitle: 'Agency information',
      codeFieldLabel: 'Identifier code',
      nameFieldLabel: 'Agency name',
      namePlaceholder: 'e.g. AI Vietnam Company',
      contactEmailLabel: 'Contact email',
      taxCodeFieldLabel: 'Tax code',
      websiteLabel: 'Website',
    },
    login: {
      welcomeToast: 'Welcome, {name}',
      sessionInvalidToast: 'The login session is invalid or has expired.',
      loginFailedError: 'Login failed',
      verifyingSession: 'Verifying login session...',
      portalTitle: 'Agency Portal',
      subtitle: 'Sign in with your agency account',
      codeLabel: 'Agency code',
      codePlaceholder: 'Enter agency code...',
      usernameLabel: 'Username',
      usernamePlaceholder: 'Enter username...',
      passwordLabel: 'Password',
      forgotPassword: 'Forgot password?',
      submitLabel: 'Sign in',
    },
    forgotPassword: {
      pageTitle: 'Forgot password',
      heading: 'Forgot password',
      subtitle: 'Enter your agency code and username to receive a password reset link',
      successMessage: 'If the account exists in our system, we have sent a password reset link.',
      successHint: 'The link is valid for 30 minutes.',
      backToLoginButton: 'Back to sign in',
      codeFieldLabel: 'Agency code',
      codePlaceholder: 'Enter agency code...',
      loginFieldLabel: 'Username',
      loginPlaceholder: 'Enter your username...',
      submitLabel: 'Send reset link',
      errors: {
        codeRequired: 'Please enter the agency code',
        loginRequired: 'Please enter your username',
      },
    },
    detail: {
      loadError: 'Failed to load agency information.',
      subtitle: 'Strategic partner management',
      infoTab: 'Info & Staff',
      emailLabel: 'Email',
      codeLabel: 'Identifier code',
      taxCodeLabel: 'Tax code',
      websiteLabel: 'Website',
      renewalTab: 'Renewal history',
      renewalComingSoonTitle: 'Feature under development',
      renewalComingSoonDescription: 'The payment and renewal system is being integrated.',
    },
  },
};
