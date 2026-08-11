// src/shared/helpers/token.helper.ts
import { EAccountType } from '@/shared/types/auth.type';

const TOKEN_PREFIX = 'token_';

// Per-tab in-memory state. Mỗi tab có JS runtime riêng nên 2 biến này
// độc lập giữa các tab — đó là lý do có thể mở song song 5 layout, mỗi
// tab tự chọn activeType của mình mà không đạp token của tab khác.
let _activeType: EAccountType | null = null;
let _tokenOverride: string | null = null;

// ── Cookie cho Customer (SSR đọc được) ──────────────────────────────────────
// localStorage không tồn tại phía server → các layout public (Astro SSR) cần
// biết Customer đã login hay chưa thì phải đọc qua cookie, không phải qua
// TokenManager.getToken() (chỉ chạy được ở client). Chỉ CUSTOMER cần cơ chế
// này — admin/merchant/agency/tenant luôn render sau khi client mount xong.
function setCustomerCookie(token: string | null): void {
  if (typeof document === 'undefined') return; // SSR-safe guard, không chạy phía server
  if (token) {
    // 7 ngày, path=/ để mọi route (admin lẫn public) đều gửi kèm -- SameSite=Lax đủ cho
    // cookie tự set qua JS cùng-origin, không cần Strict (sẽ chặn redirect từ Google OAuth
    // callback nếu sau này thêm luồng redirect-based).
    document.cookie = `customer_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
  } else {
    document.cookie = 'customer_token=; path=/; max-age=0';
  }
}

export const TokenManager = {
  getFieldName: (type: EAccountType) => `${TOKEN_PREFIX}${type}`,

  setToken: (type: EAccountType, token: string) => {
    localStorage.setItem(TokenManager.getFieldName(type), token);
    if (type === EAccountType.CUSTOMER) setCustomerCookie(token);
  },

  getToken: (type: EAccountType) => {
    return localStorage.getItem(TokenManager.getFieldName(type));
  },

  clearToken: (type: EAccountType) => {
    localStorage.removeItem(TokenManager.getFieldName(type));
    if (type === EAccountType.CUSTOMER) setCustomerCookie(null);
  },
  removeToken: (type: EAccountType) => {
    localStorage.removeItem(TokenManager.getFieldName(type));
    if (type === EAccountType.CUSTOMER) setCustomerCookie(null);
  },

  // ── Active account type của tab hiện tại ───────────────────────────────────
  // Mỗi layout set activeType khi mount → outgoing request tự chọn đúng JWT.

  setActiveType(type: EAccountType | null): void {
    _activeType = type;
  },

  getActiveType(): EAccountType | null {
    return _activeType;
  },

  /**
   * Token thực sự gắn vào Authorization cho request sắp gửi.
   * Priority: scoped override (withToken) > active layout's token.
   */
  getActiveToken(): string | null {
    if (_tokenOverride) return _tokenOverride;
    if (!_activeType) return null;
    return localStorage.getItem(`${TOKEN_PREFIX}${_activeType}`);
  },

  /**
   * Chạy fn với một token cụ thể, tự khôi phục override sau khi xong.
   * Dùng cho impersonate / bootstrap session: cần gọi API bằng một token
   * khác mà không đụng đến activeType của layout hiện tại.
   */
  async withToken<T>(token: string, fn: () => Promise<T>): Promise<T> {
    const prev = _tokenOverride;
    _tokenOverride = token;
    try {
      return await fn();
    } finally {
      _tokenOverride = prev;
    }
  },

  /**
   * Merchant logout → xóa toàn bộ token liên quan:
   * MERCHANT + AGENCY + TENANT (vì agency/tenant token được cấp từ merchant)
   */
  clearMerchantSession(): void {
    this.removeToken(EAccountType.MERCHANT);
    this.removeToken(EAccountType.AGENCY);
    this.removeToken(EAccountType.TENANT);
    localStorage.removeItem('merchant_active_context');
  },
  // Dùng để xóa sạch khi Logout toàn bộ
  clearAll: () => {
    Object.values(EAccountType).forEach(type => {
      localStorage.removeItem(`${TOKEN_PREFIX}${type}`);
    });
    localStorage.removeItem('active_account_type');
    setCustomerCookie(null); // tránh cookie customer_token còn sót lại sau logout toàn bộ
    _activeType = null;
    _tokenOverride = null;
  },

  /**
     * Lưu context đang active của merchant (MERCHANT | AGENCY | TENANT)
     */
  setMerchantActiveContext(type: EAccountType): void {
    localStorage.setItem('merchant_active_context', type);
  },

  getMerchantActiveContext(): EAccountType | null {
    return localStorage.getItem('merchant_active_context') as EAccountType | null;
  },
};
