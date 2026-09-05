// src/shared/errors/errorCode.enum.ts
//
// Mirrors ddd-graphql-be's src/core/shared/enums/errorCode.enum.ts. No shared package
// exists between the two repos, so this is kept in sync BY HAND — if you add a code on
// the backend, add the same value here. FE uses this purely to type `errorActions.ts`'s
// lookup table; the actual string that arrives over the wire (`error.extensions.code`)
// is untyped at the network boundary, same as any other API response field.
export enum EErrorCode {
    // ── Generic / cross-cutting ────────────────────────────────────────────────
    INTERNAL_ERROR = 'INTERNAL_ERROR',
    VALIDATION_FAILED = 'VALIDATION_FAILED',
    VALIDATION_REQUIRED_FIELD = 'VALIDATION_REQUIRED_FIELD',
    VALIDATION_INVALID_CURSOR = 'VALIDATION_INVALID_CURSOR',
    RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
    RESOURCE_DUPLICATE = 'RESOURCE_DUPLICATE',
    REQUEST_TIMEOUT = 'REQUEST_TIMEOUT',
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
    UPLOAD_ERROR = 'UPLOAD_ERROR',
    INVALID_JSON = 'INVALID_JSON',

    // ── Auth / identity ─────────────────────────────────────────────────────────
    AUTH_REQUIRED = 'AUTH_REQUIRED',
    AUTH_TOKEN_MISSING = 'AUTH_TOKEN_MISSING',
    AUTH_TOKEN_INVALID = 'AUTH_TOKEN_INVALID',
    AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
    AUTH_ACCOUNT_NOT_FOUND = 'AUTH_ACCOUNT_NOT_FOUND',
    AUTH_ACCOUNT_DEACTIVATED = 'AUTH_ACCOUNT_DEACTIVATED',
    AUTH_LINKED_ACCOUNT_NOT_FOUND = 'AUTH_LINKED_ACCOUNT_NOT_FOUND',
    AUTH_OLD_PASSWORD_INCORRECT = 'AUTH_OLD_PASSWORD_INCORRECT',
    AUTH_PASSWORD_TOO_SHORT = 'AUTH_PASSWORD_TOO_SHORT',
    AUTH_EMAIL_MISSING_FOR_RESET = 'AUTH_EMAIL_MISSING_FOR_RESET',
    AUTH_RESET_TOKEN_INVALID = 'AUTH_RESET_TOKEN_INVALID',
    AUTH_USERNAME_TAKEN = 'AUTH_USERNAME_TAKEN',
    AUTH_EMAIL_TAKEN = 'AUTH_EMAIL_TAKEN',

    // ── Permission / RBAC ───────────────────────────────────────────────────────
    PERMISSION_DENIED = 'PERMISSION_DENIED',
    PERMISSION_INSUFFICIENT_ROLE = 'PERMISSION_INSUFFICIENT_ROLE',
    PERMISSION_SCOPE_DENIED = 'PERMISSION_SCOPE_DENIED',
    PERMISSION_MIN_REQUIRED = 'PERMISSION_MIN_REQUIRED',
    // Each of these has a distinct message template with different dynamic params —
    // kept separate from the generic PERMISSION_* codes above rather than sharing one
    // (a shared code can only have ONE catalog template, so different {placeholder}
    // shapes need different codes; see BE's i18n.service.ts's translateError).
    PERMISSION_CONTEXT_MISMATCH = 'PERMISSION_CONTEXT_MISMATCH',
    PERMISSION_SELECT_ORG_REQUIRED = 'PERMISSION_SELECT_ORG_REQUIRED',
    PERMISSION_TOKEN_WRONG_CONTEXT = 'PERMISSION_TOKEN_WRONG_CONTEXT',
    PERMISSION_ACTION_DENIED = 'PERMISSION_ACTION_DENIED',
    PERMISSION_GRANT_NOT_OWNED = 'PERMISSION_GRANT_NOT_OWNED',
    PERMISSION_GRANT_SCOPE_EXCEEDED = 'PERMISSION_GRANT_SCOPE_EXCEEDED',
    PERMISSION_REQUIRED_SPECIFIC = 'PERMISSION_REQUIRED_SPECIFIC',
    PERMISSION_RECORD_ACCESS_DENIED = 'PERMISSION_RECORD_ACCESS_DENIED',

    // ── Deletion policy ─────────────────────────────────────────────────────────
    DELETION_FORBIDDEN_APPEND_ONLY = 'DELETION_FORBIDDEN_APPEND_ONLY',
    DELETION_RESTRICTED = 'DELETION_RESTRICTED',
    DELETION_RESTRICTED_AUTO = 'DELETION_RESTRICTED_AUTO',

    // ── Resource lookup with identifying detail (distinct from the generic
    // RESOURCE_NOT_FOUND, which has no dynamic params) ─────────────────────────
    RESOURCE_NOT_FOUND_WITH_ID = 'RESOURCE_NOT_FOUND_WITH_ID',
    RESOURCE_NOT_FOUND_NAMED = 'RESOURCE_NOT_FOUND_NAMED',

    // ── Database ────────────────────────────────────────────────────────────────
    DATABASE_ERROR = 'DATABASE_ERROR',
    DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
    FK_VIOLATION = 'FK_VIOLATION',
    NOT_NULL_VIOLATION = 'NOT_NULL_VIOLATION',
    INVALID_INPUT = 'INVALID_INPUT',
    SYNTAX_ERROR = 'SYNTAX_ERROR',
    CHECK_VIOLATION = 'CHECK_VIOLATION',

    // ── Mail / SMTP config ──────────────────────────────────────────────────────
    MAIL_CONFIG_NOT_FOUND = 'MAIL_CONFIG_NOT_FOUND',
    MAIL_CONFIG_INCOMPLETE = 'MAIL_CONFIG_INCOMPLETE',
    MAIL_CONFIG_DUPLICATE_DOMAIN = 'MAIL_CONFIG_DUPLICATE_DOMAIN',

    // ── Module-specific ─────────────────────────────────────────────────────────
    TENANT_CODE_INVALID = 'TENANT_CODE_INVALID',
    AGENCY_CODE_INVALID = 'AGENCY_CODE_INVALID',
    AGENCY_ACCESS_DENIED = 'AGENCY_ACCESS_DENIED',
    TENANT_ACCESS_DENIED = 'TENANT_ACCESS_DENIED',
    TENANT_CROSS_REFERENCE_DENIED = 'TENANT_CROSS_REFERENCE_DENIED',
    UNIT_NAME_REQUIRED = 'UNIT_NAME_REQUIRED',
    UNIT_CODE_REQUIRED = 'UNIT_CODE_REQUIRED',
    UNIT_CODE_DUPLICATE = 'UNIT_CODE_DUPLICATE',
    // Xoá 1 ComponentDefinition trong khi vẫn còn chỗ đặt (instance) đang dùng nó. Phải là code
    // RIÊNG, không dùng chung RESOURCE_DUPLICATE mặc định của ConflictException: catalog của
    // RESOURCE_DUPLICATE là "This value already exists." — với locale != vi, translateError lấy
    // catalog đè lên message ở throw site, nên admin dùng EN thấy 1 câu vô nghĩa thay vì lý do thật.
    COMPONENT_IN_USE = 'COMPONENT_IN_USE',
    // Đặt 1 Component vào bên trong định nghĩa của chính nó (trực tiếp hoặc gián tiếp qua chuỗi
    // lồng nhau) — cùng lý do phải có code RIÊNG như COMPONENT_IN_USE ngay trên: mặc định của
    // ConflictException là RESOURCE_DUPLICATE, mà catalog EN của nó là "This value already
    // exists." — vô nghĩa với 1 lời từ chối vì vòng lặp chứa nhau.
    COMPONENT_CYCLE = 'COMPONENT_CYCLE',
}
