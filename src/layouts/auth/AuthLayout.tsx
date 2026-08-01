import { createMemo } from 'solid-js';
import { Img } from '@core/components/utilities/Img';
import { getBrandLogoUrl, useBrand } from '@shared/contexts/brand/BrandContext';
import { PublicAsset } from '@shared/helpers/assets';

export function AuthLayout(props: BaseProps & { title: string }) {
  const { brand } = useBrand();
  const logoUrl = createMemo(() => getBrandLogoUrl(brand()) || PublicAsset.logo);
  const brandName = createMemo(() => brand()?.name || 'AgriBase');

  return (
    <div
      class="flex-center h-screen w-screen bg-cover pb-10"
      style={{
        'background-image': `url(${PublicAsset.bgAuth})`,
      }}
    >
      <div class="w-screen-sm animate-fade-in flex-col-center rounded-2xl bg-white p-8 shadow-md">
        <Img contain src={logoUrl()} alt={brandName()} freeform lazyload={false} class="mb-4 h-24 max-w-72" />
        <h4 class="text-uppercase mb-4 text-xl font-bold">{props.title}</h4>
        {props.children}
      </div>
    </div>
  );
}
