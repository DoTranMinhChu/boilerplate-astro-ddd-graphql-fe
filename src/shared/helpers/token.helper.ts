// src/shared/helpers/token.helper.ts
import { EAccountType } from '@/shared/types/auth.type';

const TOKEN_PREFIX = 'token_';

// Per-tab in-memory state. Mỗi tab có JS runtime riêng nên 2 biến này
// độc lập giữa các tab — đó là lý do có thể mở song song 5 layout, mỗi
// tab tự chọn activeType của mình mà không đạp token của tab khác.
let _activeType: EAccountType | null = null;
let _tokenOverride: string | null = null;

export const TokenManager = {
  getFieldName: (type: EAccountType) => `${TOKEN_PREFIX}${type}`,

  setToken: (type: EAccountType, token: string) => {
    localStorage.setItem(TokenManager.getFieldName(type), token);
  },

  getToken: (type: EAccountType) => {
    return localStorage.getItem(TokenManager.getFieldName(type));
  },

  clearToken: (type: EAccountType) => {
    localStorage.removeItem(TokenManager.getFieldName(type));
  },
  removeToken: (type: EAccountType) => {
    localStorage.removeItem(TokenManager.getFieldName(type));
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
