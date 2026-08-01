import { getClientConfig } from '@/core/helpers/config.client';
import { getServerConfig } from '@/core/helpers/config.server';

const APP_CODE = ((import.meta.env.SSR ? getServerConfig('APP_CODE' as never) : getClientConfig('APP_CODE' as never))) as string;


// Kept for parity with the source app's per-appCode asset switching pattern —
// this source base only ships the `default` asset set. To support multiple
// white-labeled builds again, add more folders under src/assets/logo/<code>
// and branch on `appCode` here (each branch's dynamic import() must resolve
// to a real file at build time, since Rollup statically analyzes them).
const appCode = APP_CODE ? APP_CODE?.toLowerCase() : "default";
void appCode;

const assetMap = {
  logo: () => import('@/assets/logo/default/logo-full.png'),
  logoIcon: () => import('@/assets/logo/default/logo-icon.png'),
  logoWhite: () => import('@/assets/logo/default/logo-full-white.png'),
  logoAlt: () => import('@/assets/logo/default/logo-alt.png'),
  bgAuth: () => import('@/assets/img/login/bg-auth.jpg'),
};

export class Public {
  static readonly assets: Partial<Record<keyof typeof assetMap, string>> = {};

  static async init() {
    await Promise.all(
      Object.entries(assetMap).map(async ([key, loader]) => {
        const mod: any = await loader();

        const resolved = new URL(mod.default.src, import.meta.url).href;
        Public.assets[key as keyof typeof assetMap] = resolved;
        (Public as any)[key] = resolved; // attach as static property too
        return [key, resolved];
      }),
    );
  }
}
await Public.init();
export const PublicAsset = Public.assets;

