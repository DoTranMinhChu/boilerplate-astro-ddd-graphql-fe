import { createMemo } from 'solid-js';
import { Icon } from '@shared/components/icons/Icon';
import { PublicAsset } from '@shared/helpers/assets';
import { getBrandFaviconUrl, useBrand } from '@shared/contexts/brand/BrandContext';
import { useDashboard } from '../DashboardContext';

export function DashboardRootSidebar() {
  const { } = useDashboard();
  const { brand } = useBrand();
  const iconLogoUrl = createMemo(() => getBrandFaviconUrl(brand()) || PublicAsset.logoIcon);
  const brandName = createMemo(() => brand()?.name || 'AgriBase');

  return (
    // THAY ĐỔI Ở ĐÂY: Thêm 'hidden md:flex'
    // 'hidden': Ẩn mặc định (mobile)
    // 'md:flex': Hiện lại (display: flex) khi màn hình > 768px
    <div class="hidden md:flex sticky top-0 z-10 h-screen w-16 p-1.5 flex-col bg-neutral-900 border-r border-neutral-800">
      <div class="flex-column h-full items-center gap-4 py-4">
        {/* Logo */}
        <div class="w-10 h-10 flex-center bg-white rounded-xl overflow-hidden shadow-lg mb-4">
          <img class="w-7" src={iconLogoUrl()} alt={brandName()} />
        </div>

        <div class="flex-column flex-1 items-center gap-3">
          {/* Home Icon với chỉ thị trạng thái */}
          <div class="bg-main-600 text-white flex-center relative h-10 w-10 rounded-xl text-2xl shadow-lg shadow-main-900/50">
            <Icon name={'heroicons-solid:home'} />
          </div>

          <div class="text-neutral-500 flex-center hover:bg-neutral-800 hover:text-white transition-all h-10 w-10 cursor-pointer rounded-xl text-2xl">
            <Icon name={'material-symbols:contact-support-rounded'} />
          </div>
        </div>

        {/* Version & Info */}
        <div class="flex-column items-center gap-2">
          <div class="text-[10px] text-center font-bold text-neutral-500 uppercase tracking-tighter leading-none">
            v{import.meta.env.PUBLIC_APP_VERSION}
          </div>
        </div>
      </div>
    </div>
  );
}
