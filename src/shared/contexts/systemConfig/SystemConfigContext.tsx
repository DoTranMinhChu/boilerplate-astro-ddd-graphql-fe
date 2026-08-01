import { createContext, useContext } from 'solid-js';
import { SystemConfigDTO } from '@/shared/services/systemConfig/systemConfig.service';

export interface ISystemConfigContext {
  config: () => SystemConfigDTO | null;
  reload: (forceRefresh?: boolean) => Promise<void>;
}

export const SYSTEM_CONFIG_CACHE_KEY = 'agribase:system_config';
export const SYSTEM_CONFIG_TTL_MS = 60 * 60 * 1000; // 1 hour

export const DEFAULT_SYSTEM_CONFIG: SystemConfigDTO = {
  id: '',
  allowFarmerSelfRegister: true,
  allowFarmerCreateFarm: true,
  allowFarmerEditFarm: true,
  allowFarmerCultivationLog: true,
  allowFarmerSelfUnlink: false,
  allowFarmerSelfRegisterNtProducer: false,
  requireAdminApprovalForNtProducerRegistration: true,
  allowMerchantSelfRegister: true,
  allowAgencyCreateTenant: true,
  allowAgencyCreateTenantAccount: true,
  updatedAt: '',
};

export const SystemConfigContext = createContext<ISystemConfigContext>();

export function useSystemConfig(): ISystemConfigContext {
  const ctx = useContext(SystemConfigContext);
  if (!ctx) {
    return {
      config: () => DEFAULT_SYSTEM_CONFIG,
      reload: async () => {},
    };
  }
  return ctx;
}

export function clearSystemConfigCache(): void {
  try {
    localStorage.removeItem(SYSTEM_CONFIG_CACHE_KEY);
  } catch { /* SSR / private mode */ }
}
