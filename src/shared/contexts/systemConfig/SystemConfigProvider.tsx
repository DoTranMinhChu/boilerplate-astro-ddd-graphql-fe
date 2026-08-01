import { createSignal, onMount } from 'solid-js';
import {
  SystemConfigContext,
  SYSTEM_CONFIG_CACHE_KEY,
  SYSTEM_CONFIG_TTL_MS,
  DEFAULT_SYSTEM_CONFIG,
} from './SystemConfigContext';
import { SystemConfigDTO, SystemConfigService } from '@/shared/services/systemConfig/systemConfig.service';
import { TokenManager } from '@/shared/helpers/token.helper';
import { EAccountType } from '@/shared/types/auth.type';

function readCache(): SystemConfigDTO | null {
  try {
    const raw = localStorage.getItem(SYSTEM_CONFIG_CACHE_KEY);
    if (!raw) return null;
    const { data, cachedAt } = JSON.parse(raw) as { data: SystemConfigDTO; cachedAt: number };
    if (Date.now() - cachedAt < SYSTEM_CONFIG_TTL_MS) return data;
  } catch { /* SSR / parse error */ }
  return null;
}

function writeCache(data: SystemConfigDTO): void {
  try {
    localStorage.setItem(SYSTEM_CONFIG_CACHE_KEY, JSON.stringify({ data, cachedAt: Date.now() }));
  } catch { /* quota exceeded */ }
}

function hasAnyToken(): boolean {
  return [EAccountType.ADMIN, EAccountType.MERCHANT, EAccountType.AGENCY, EAccountType.TENANT]
    .some(type => !!TokenManager.getToken(type));
}

export function SystemConfigProvider(props: BaseProps) {
  const [config, setConfig] = createSignal<SystemConfigDTO | null>(null);

  const reload = async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = readCache();
      if (cached) {
        setConfig(cached);
        return;
      }
    }

    // Nếu chưa có token nào (trang public như login) → dùng defaults, không gọi API
    // tránh BaseService tự hiển thị toast lỗi auth không cần thiết
    if (!hasAnyToken()) {
      setConfig(DEFAULT_SYSTEM_CONFIG);
      return;
    }

    try {
      const data = await SystemConfigService.getSystemConfig();
      if (data) {
        setConfig(data as SystemConfigDTO);
        writeCache(data as SystemConfigDTO);
      }
    } catch {
      if (!config()) setConfig(DEFAULT_SYSTEM_CONFIG);
    }
  };

  onMount(() => { reload(); });

  return (
    <SystemConfigContext.Provider value={{ config, reload }}>
      {props.children}
    </SystemConfigContext.Provider>
  );
}
