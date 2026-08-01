// RoutesProvider.tsx
import { createRoutes } from '@core/components/routes/Routes';
import { APP_ROUTES } from '@shared/common/app/AppRoutes';
import { RoutesContext } from './RoutesContext';
import { AuthProvider } from '@/shared/contexts/auth/AuthProvider';
import { SystemConfigProvider } from '@/shared/contexts/systemConfig/SystemConfigProvider';
import { BrandProvider } from '@/shared/contexts/brand/BrandProvider';

export function RoutesProvider(props: BaseProps) {
  const routes = createRoutes(APP_ROUTES);

  return (
    <RoutesContext.Provider value={routes}>
      <BrandProvider>
        <SystemConfigProvider>
          <AuthProvider>
            {props.children}
          </AuthProvider>
        </SystemConfigProvider>
      </BrandProvider>
    </RoutesContext.Provider>
  );
}