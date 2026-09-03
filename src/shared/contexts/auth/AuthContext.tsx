// src/shared/contexts/auth/AuthContext.ts

import { MerchantAssignmentDTO } from '@/shared/services/merchant/merchant.service';
import { MerchantOrgType } from '@/shared/services/merchant/merchantSwitchConfig';
import { AuthAccountDTO, EAccountType } from '@/shared/types/auth.type';
import { Accessor, createContext, useContext } from 'solid-js';

export interface AuthContextType {
  authAccount: Accessor<AuthAccountDTO | null>;
  getAccountByType: (type: EAccountType) => AuthAccountDTO | null;
  restoreAccount: (type: EAccountType) => Promise<AuthAccountDTO | null>;

  setAuthData: (type: EAccountType, data: any, token: string) => void;
  refetchAuthAccount: () => void;
  logout: (type?: EAccountType) => void;
  applyTokenForType: (type: EAccountType) => boolean;

  accountType: Accessor<EAccountType | null>;
  isAdmin: Accessor<boolean>;
  isAgency: Accessor<boolean>;
  isTenant: Accessor<boolean>;
  isCustomer: Accessor<boolean>;
  isAnonymous: Accessor<boolean>;
  isMerchant: Accessor<boolean>;

  isMerchantInContext: Accessor<boolean>;

  merchantAssignments: Accessor<MerchantAssignmentDTO | null>;
  setMerchantAuthData: (data: any, token: string) => Promise<void>;

  // Generic Merchant SSO context-switch entry point — pass the org type and
  // its code, get redirected to a new tab scoped to that workspace. Adding a
  // new org type is a config change in AuthProvider, not a new method here.
  switchContext: (orgType: MerchantOrgType, code: string) => Promise<boolean>;
  merchantBackToSelect: () => void;
  switchActiveRole: (role: EAccountType) => Promise<boolean>;
  impersonateOpenTab: (
    callerType: EAccountType,
    apiCall: () => Promise<{ token?: string | null } | null | undefined>,
    redirectPath: string,
  ) => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextType>();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};