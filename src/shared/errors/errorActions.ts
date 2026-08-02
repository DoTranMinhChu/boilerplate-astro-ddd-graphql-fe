// src/shared/errors/errorActions.ts
//
// Maps a backend EErrorCode to what the FE should DO about it, so call sites branch
// on `error.name` (which GraphQL.handleError already sets to the error's extensions.code
// — see core/api/graphql.ts) instead of pattern-matching on message text, which changes
// per-locale and was never meant to be parsed.
import { EErrorCode } from './errorCode.enum';

export type TErrorSeverity = 'danger' | 'warning';

export interface IErrorAction {
    /** Which toast() variant a generic handler should use when displaying this error. */
    severity: TErrorSeverity;
    /** The user's session/token is no longer valid — should be treated like a logout. */
    sessionExpired?: boolean;
    /** The user is authenticated but acting outside a permitted scope (tenant/agency mismatch). */
    outOfScope?: boolean;
    /** Worth a retry button rather than just a dead-end message (rate limit, timeout). */
    retryable?: boolean;
}

const DEFAULT_ACTION: IErrorAction = { severity: 'danger' };

const ERROR_ACTIONS: Partial<Record<EErrorCode, IErrorAction>> = {
    [EErrorCode.AUTH_REQUIRED]: { severity: 'warning', sessionExpired: true },
    [EErrorCode.AUTH_TOKEN_MISSING]: { severity: 'warning', sessionExpired: true },
    [EErrorCode.AUTH_TOKEN_INVALID]: { severity: 'warning', sessionExpired: true },

    [EErrorCode.PERMISSION_DENIED]: { severity: 'warning', outOfScope: true },
    [EErrorCode.PERMISSION_INSUFFICIENT_ROLE]: { severity: 'warning', outOfScope: true },
    [EErrorCode.PERMISSION_SCOPE_DENIED]: { severity: 'warning', outOfScope: true },
    [EErrorCode.AGENCY_ACCESS_DENIED]: { severity: 'warning', outOfScope: true },
    [EErrorCode.TENANT_ACCESS_DENIED]: { severity: 'warning', outOfScope: true },

    [EErrorCode.RATE_LIMIT_EXCEEDED]: { severity: 'warning', retryable: true },
    [EErrorCode.REQUEST_TIMEOUT]: { severity: 'warning', retryable: true },

    [EErrorCode.VALIDATION_FAILED]: { severity: 'warning' },
    [EErrorCode.VALIDATION_REQUIRED_FIELD]: { severity: 'warning' },
    [EErrorCode.RESOURCE_DUPLICATE]: { severity: 'warning' },
    [EErrorCode.DUPLICATE_ENTRY]: { severity: 'warning' },
};

/** Look up what to do about a given error code — falls back to a generic danger toast. */
export function getErrorAction(code: string | undefined): IErrorAction {
    if (!code) return DEFAULT_ACTION;
    return ERROR_ACTIONS[code as EErrorCode] ?? DEFAULT_ACTION;
}
