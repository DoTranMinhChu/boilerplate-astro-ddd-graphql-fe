import {
  batch,
  createMemo,
  createSignal,
  onMount,
  Show,
} from 'solid-js';
import { AuthContext, AuthContextType } from './AuthContext';
import { useApp } from '../app/AppContext';
import { OauthError } from '@core/types/oauthError';
import { EAccountType, AuthAccountDTO } from '@/shared/types/auth.type';
import { AdminService } from '@/shared/services/admin/admin.service';
import { AgencyAccountService } from '@/shared/services/agencyAccount/agencyAccount.service';
import { TenantAccountService } from '@/shared/services/tenantAccount/tenantAccount.service';
import {
  MerchantAssignmentDTO,
  MerchantService,
} from '@/shared/services/merchant/merchant.service';
import { CustomerService } from '@/shared/services/customer/customer.service';
import { MERCHANT_SWITCH_CONFIG, MerchantOrgType } from '@/shared/services/merchant/merchantSwitchConfig';
import { TokenManager } from '@/shared/helpers/token.helper';
import { GraphQL } from '@core/api/graphql';
import { RestBaseService } from '@core/services/restBase.service';
import { setAgencyActingTenantIdResolver } from '@core/components/control/Select';
import { ERole } from '@/shared/generated/typed-graphql';
import { agencyActingTenantId } from '@/shared/contexts/agency/agencyActingTenant';
import { getLocale } from '@/shared/i18n/locale';
import { getErrorAction } from '@/shared/errors/errorActions';

// ─── Wire JWT resolver vào GraphQL / REST ở cấp module ──────────────────────
// Mỗi outgoing request sẽ đọc TokenManager.getActiveToken() để quyết định JWT
// gắn vào Authorization header. Nhờ vậy:
//   • Không còn mutate global headers → không còn race giữa các flow async.
//   • Mỗi tab có activeType riêng (in-memory) → mở đồng thời Admin/Agency/
//     Tenant/Merchant trên các tab khác nhau, mỗi tab tự dùng đúng JWT
//     của layout mình, dù localStorage chứa song song token của mọi role.
GraphQL.setTokenResolver(() => TokenManager.getActiveToken());
RestBaseService.setTokenResolver(() => TokenManager.getActiveToken());

// Parase 2: Agency "đang thao tác với tổ chức" → header x-acting-tenant-id.
// Chỉ ảnh hưởng backend khi stamp tenantId lúc create (read/update/delete vẫn theo agencyId).
GraphQL.setActingTenantResolver(() => agencyActingTenantId());
RestBaseService.setActingTenantResolver?.(() => agencyActingTenantId());

// Locale + error-action resolvers, same DI pattern as token/acting-tenant above — decouples
// core/api/graphql.ts from shared/i18n and shared/errors, wiring the real implementations back
// in here since AuthProvider is already firmly in shared/.
GraphQL.setLocaleResolver(() => getLocale());
GraphQL.setErrorActionResolver(getErrorAction);

// Same DI pattern, decoupling core/components/control/Select.tsx's agency-tenant-scoped
// options filter from shared/contexts/agency/agencyActingTenant.
setAgencyActingTenantIdResolver(() => agencyActingTenantId());

export const AuthProvider = (props: { children: any }) => {
  const { switchMode } = useApp();

  const [isClient, setIsClient] = createSignal(false);
  const [merchantAssignments] = createSignal<MerchantAssignmentDTO | null>(null);

  // Mỗi type có slot riêng, không đè nhau
  const [accounts, setAccounts] = createSignal<Partial<Record<EAccountType, AuthAccountDTO | null>>>({});

  onMount(() => setIsClient(true));

  // ── Active type management ────────────────────────────────────────────────
  // Thay cho việc ghi đè global GraphQL.defaultHeaders, giờ chỉ báo cho
  // TokenManager biết layout nào đang active → resolver sẽ tự lấy đúng JWT.

  const applyTokenForType = (type: EAccountType): boolean => {
    const token = TokenManager.getToken(type);
    if (!token) return false;
    TokenManager.setActiveType(type);
    GraphQL.resetClient();
    return true;
  };

  const clearActiveSession = () => {
    TokenManager.setActiveType(null);
    GraphQL.resetClient();
  };

  // ── fetchUserByRole ───────────────────────────────────────────────────────
  // Gọi getMe bằng token được truyền vào, scoped qua withToken — không đụng
  // đến activeType của layout hiện tại. An toàn với luồng impersonate và
  // restore song song nhiều role.

  const fetchUserByRole = async (
    type: EAccountType,
    token: string,
  ): Promise<AuthAccountDTO | null> => {
    try {
      return await TokenManager.withToken(token, async () => {

        switch (type) {
          case EAccountType.ADMIN: {
            const existingToken = TokenManager.getToken(EAccountType.ADMIN);
            const admin = await AdminService.adminGetMe(existingToken!);
            if (!admin) return null;
            return {
              account: {
                id: admin.id!,
                name: `${admin.firstName} ${admin.lastName}`,
                type,
                username: admin.username!,
              },
              roles: admin.roles as ERole[],
            };
          }
          case EAccountType.AGENCY: {
            const existingToken = TokenManager.getToken(EAccountType.AGENCY);
            console.log('[Auth] Fetching agency account with token', { existingToken });
            const agency = await AgencyAccountService.agencyAccountGetMe(existingToken!);

            if (!agency) return null;
            return {
              account: {
                id: agency.id!,
                name: agency.fullname!,
                type,
                username: agency.username!,
              },
              roles: agency.roles as ERole[],
              agencyId: agency.agencyId!,
            };
          }
          case EAccountType.TENANT: {
            const existingToken = TokenManager.getToken(EAccountType.TENANT);
            const tenantAccount = await TenantAccountService.tenantAccountGetMe(existingToken!);
            if (!tenantAccount) return null;
            return {
              account: {
                id: tenantAccount.id!,
                name: tenantAccount.fullname!,
                type,
                username: tenantAccount.username!,
              },
              roles: tenantAccount.roles as ERole[],
              agencyId: tenantAccount.agencyId!,
              tenantId: tenantAccount.tenantId!,
            };
          }
          case EAccountType.MERCHANT: {
            const existingToken = TokenManager.getToken(EAccountType.MERCHANT);
            const merchant = await MerchantService.merchantGetMe(existingToken!);
            if (!merchant) return null;
            return {
              account: {
                id: merchant.id!,
                name: merchant.fullname || merchant.username!,
                type,
                username: merchant.username!,
              },
              merchantId: merchant.id!,
              roles: [],
            };
          }
          case EAccountType.CUSTOMER: {
            const existingToken = TokenManager.getToken(EAccountType.CUSTOMER);
            const customer = await CustomerService.customerGetMe(existingToken!);
            if (!customer) return null;
            return {
              account: {
                id: customer.id!,
                name: customer.fullname || customer.email || customer.phone!,
                type,
                username: customer.email || customer.phone!,
              },
              roles: [],
            };
          }

          default:
            return null;
        }
      });
    } catch (e: any) {
      console.warn(`[Auth] Failed to restore session for ${type}`, e);
      const msg = String(e?.message ?? '');
      // Nếu token bị sai context (BE trả về "Token không đúng context") hoặc
      // hết hạn, xoá luôn để lần tới không kéo lỗi cũ.
      if (
        e?.name === OauthError.UNAUTHORIZED ||
        msg.includes('Auth required') ||
        msg.includes('Token không đúng context')
      ) {
        TokenManager.removeToken(type);
      }
      return null;
    }
  };

  // ── restoreAccount ────────────────────────────────────────────────────────

  const restoreAccount = async (type: EAccountType): Promise<AuthAccountDTO | null> => {
    const token = TokenManager.getToken(type);
    if (!token) return null;

    const existing = accounts()[type];
    if (existing) {
      applyTokenForType(type);
      return existing;
    }

    const user = await fetchUserByRole(type, token);
    if (user) {
      setAccounts(prev => ({ ...prev, [type]: user }));
    }
    applyTokenForType(type);
    return user;
  };

  // ── Getters ───────────────────────────────────────────────────────────────

  const getAccountByType = (type: EAccountType): AuthAccountDTO | null =>
    accounts()[type] ?? null;

  const authAccount = createMemo<AuthAccountDTO | null>(() => {
    const priority = [
      EAccountType.TENANT,
      EAccountType.AGENCY,
      EAccountType.MERCHANT,
      EAccountType.ADMIN,
      EAccountType.CUSTOMER,
    ];
    for (const type of priority) {
      const acc = accounts()[type];
      if (acc) return acc;
    }
    return null;
  });

  // ── Memos ─────────────────────────────────────────────────────────────────

  const accountType = createMemo(() => authAccount()?.account.type ?? null);
  const isAdmin = createMemo(() => !!accounts()[EAccountType.ADMIN]);
  const isAgency = createMemo(() => !!accounts()[EAccountType.AGENCY]);
  const isTenant = createMemo(() => !!accounts()[EAccountType.TENANT]);
  const isCustomer = createMemo(() => accountType() === EAccountType.CUSTOMER);
  const isAnonymous = createMemo(() => accountType() === EAccountType.ANONYMOUS);
  const isMerchant = createMemo(() => !!accounts()[EAccountType.MERCHANT]);
  const isMerchantInContext = createMemo(() => isAgency() || isTenant());

  // ── setAuthData ───────────────────────────────────────────────────────────

  const setAuthData = (type: EAccountType, data: any, token: string) => {
    batch(() => {
      TokenManager.setToken(type, token);

      if (data?.tenantId)
        localStorage.setItem(`last_id_${type}`, data.tenantId);
      if (data?.tenantCode)
        localStorage.setItem(`last_code_${type}`, data.tenantCode);

      const formatted: AuthAccountDTO = {
        account: {
          id: data?.id,
          username: data?.username || data?.phone,
          name: data?.fullname || data?.name || data?.phone,
          type,
        },
        roles: data?.roles || [],
        tenantId: data?.tenantId,
        agencyId: data?.agencyId,
      };

      setAccounts(prev => ({ ...prev, [type]: formatted }));
      applyTokenForType(type);
      switchMode(type, {
        id: data?.tenantId,
        code: data?.tenantCode,
        accountId: data?.id,
      });
    });
  };

  // ── setMerchantAuthData ───────────────────────────────────────────────────

  const setMerchantAuthData = async (data: any, token: string) => {
    TokenManager.setToken(EAccountType.MERCHANT, token);

    const formatted: AuthAccountDTO = {
      account: {
        id: data?.id,
        username: data?.username,
        name: data?.fullname || data?.username,
        type: EAccountType.MERCHANT,
      },
      merchantId: data?.id,
      roles: [],
    };

    batch(() => {
      setAccounts(prev => ({ ...prev, [EAccountType.MERCHANT]: formatted }));
      applyTokenForType(EAccountType.MERCHANT);
      switchMode(EAccountType.MERCHANT, {});
    });
  };

  // ── openTabAndNavigate ────────────────────────────────────────────────────
  // Merchant chuyển context → mở tab mới với JWT được backend cấp mới.
  // API call để xin token được scope qua withToken — không đụng vào activeType.

  const openTabAndNavigate = async (
    apiCall: () => Promise<{ token?: string | null } | null | undefined>,
    redirectPath: string
  ): Promise<boolean> => {
    const merchantToken = TokenManager.getToken(EAccountType.MERCHANT);
    if (!merchantToken) return false;

    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.title = "Đang xử lý...";
      newWindow.document.body.innerHTML = `
      <div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;">
        <p>Đang kết nối, vui lòng đợi...</p>
      </div>
    `;
    } else {
      console.warn('[Auth] Popup blocked');
      return false;
    }

    try {
      const res = await TokenManager.withToken(merchantToken, () => apiCall());
      if (!res?.token) {
        newWindow.close();
        return false;
      }
      newWindow.location.href = `${redirectPath}?token=${encodeURIComponent(res.token)}`;
      return true;
    } catch (e) {
      console.error('[Auth] Switch context failed', e);
      newWindow.close();
      return false;
    }
  };

  // ── impersonateOpenTab ────────────────────────────────────────────────────
  // Admin/Agency/Tenant bấm "Truy cập" → xin token mới bằng JWT của chính
  // mình, rồi mở tab mới với `?token=...`. Tab gốc không bị thay đổi activeType.

  const impersonateOpenTab = async (
    callerType: EAccountType,
    apiCall: () => Promise<{ token?: string | null } | null | undefined>,
    redirectPath: string,
  ): Promise<boolean> => {
    const callerToken = TokenManager.getToken(callerType);
    if (!callerToken) return false;

    const newWindow = window.open('', '_blank');
    if (!newWindow) return false;

    try {
      const res = await TokenManager.withToken(callerToken, () => apiCall());
      if (!res?.token) {
        newWindow.close();
        return false;
      }
      newWindow.location.href = `${redirectPath}?token=${encodeURIComponent(res.token)}`;
      return true;
    } catch (e) {
      console.error('[Auth] Impersonate failed', e);
      newWindow.close();
      return false;
    }
  };

  // ── Merchant helpers ──────────────────────────────────────────────────────
  // Single generic entry point for Merchant SSO context-switching, backed by
  // the MERCHANT_SWITCH_CONFIG registry (see merchantSwitchConfig.ts) —
  // adding a new org type later is a config change there, not a new
  // hardcoded method + new call sites.

  const switchContext = async (orgType: MerchantOrgType, code: string): Promise<boolean> => {
    const { call, redirectPath } = MERCHANT_SWITCH_CONFIG[orgType];
    return openTabAndNavigate(() => call(code), redirectPath);
  };

  const merchantBackToSelect = () => {
    applyTokenForType(EAccountType.MERCHANT);
    switchMode(EAccountType.MERCHANT, {});
  };

  const switchActiveRole = async (role: EAccountType): Promise<boolean> =>
    applyTokenForType(role);

  // ── logout ────────────────────────────────────────────────────────────────

  const logout = (type?: EAccountType) => {
    batch(() => {
      if (type) {
        TokenManager.removeToken(type);
        localStorage.removeItem(`last_id_${type}`);
        localStorage.removeItem(`last_code_${type}`);
        setAccounts(prev => ({ ...prev, [type]: null }));
        // Chỉ clear activeType nếu đang là role vừa logout
        if (TokenManager.getActiveType() === type) {
          clearActiveSession();
        }
      } else {
        TokenManager.clearAll();
        setAccounts({});
        clearActiveSession();
      }
      switchMode('PUBLIC');
    });
  };

  // ── Context value ─────────────────────────────────────────────────────────

  const contextValue: AuthContextType = {
    authAccount,
    getAccountByType,
    restoreAccount,
    setAuthData,
    refetchAuthAccount: () => {
      const allTypes = [
        EAccountType.ADMIN,
        EAccountType.MERCHANT,
        EAccountType.AGENCY,
        EAccountType.TENANT,
        EAccountType.CUSTOMER,
      ];
      allTypes.forEach(type => {
        const token = TokenManager.getToken(type);
        if (!accounts()[type] || !token) return;
        fetchUserByRole(type, token).then(user => {
          if (user) setAccounts(prev => ({ ...prev, [type]: user }));
        });
      });
    },
    logout,
    applyTokenForType,
    accountType,
    isAdmin, isAgency, isTenant, isCustomer, isAnonymous,
    isMerchant,
    isMerchantInContext,
    merchantAssignments,
    setMerchantAuthData,
    switchContext,
    merchantBackToSelect,
    switchActiveRole,
    impersonateOpenTab,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      <Show
        when={isClient()}
        fallback={
          <div class="flex-center h-screen w-screen bg-white">
            <div class="flex-column items-center gap-4">
              <div class="h-12 w-12 animate-spin rounded-full border-4 border-main-600 border-t-transparent" />
              <p class="animate-pulse text-xs font-bold uppercase tracking-widest text-neutral-600">
                Đang bảo mật kết nối...
              </p>
            </div>
          </div>
        }
      >
        {props.children}
      </Show>
    </AuthContext.Provider>
  );
};
