import { createContext, useContext } from 'solid-js';
import { BrandDTO } from '@/shared/services/brand/brand.service';

export interface IBrandContext {
    brand: () => BrandDTO | null;
    reload: (forceRefresh?: boolean) => Promise<void>;
}

export const BRAND_CACHE_KEY_PREFIX = 'agribase:brand:';
// Client-side TTL ngắn hơn server (10 phút) để nhận cập nhật Admin sớm hơn
export const BRAND_CACHE_TTL_MS = 10 * 60 * 1000;

export const DEFAULT_BRAND: BrandDTO = {
    id: '',
    name: 'AgriBase',
    slug: 'agribase',
    domain: '',
    logoUrl: undefined,
    faviconUrl: undefined,
    seoTitle: 'AgriBase',
    seoDescription: 'Truy xuat nguon goc nong nghiep',
    seoKeywords: 'AgriBase, truy xuat nguon goc, nong nghiep',
    seoImageUrl: undefined,
    primaryColor: '#10b981',
    landingMode: 'STRUCTURED',
    landingContent: {
        heroTitle: 'Nền tảng quản lý chuỗi cung ứng nông nghiệp',
        heroSubtitle: 'Minh bạch từ vùng trồng đến tay người tiêu dùng',
        features: [],
    },
    landingHtmlUrl: undefined,
    isDefault: true,
    isActive: true,
    createdAt: '',
    updatedAt: '',
};

export const BrandContext = createContext<IBrandContext>();

export function getBrandMediaUrl(media?: { fullUrl?: string; url?: string } | null): string | undefined {
    return media?.fullUrl || media?.url || undefined;
}

export function firstBrandValue(...values: Array<string | undefined | null>): string | undefined {
    return values.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim();
}

export function getBrandLogoUrl(brand?: BrandDTO | null): string | undefined {
    if (!brand) return undefined;
    return firstBrandValue(getBrandMediaUrl(brand.logo), brand.logoUrl);
}

export function getBrandFaviconUrl(brand?: BrandDTO | null): string | undefined {
    if (!brand) return undefined;
    return firstBrandValue(
        getBrandMediaUrl(brand.favicon),
        brand.faviconUrl,
        getBrandLogoUrl(brand),
    );
}

export function getBrandSeoImageUrl(brand?: BrandDTO | null): string | undefined {
    if (!brand) return undefined;
    return firstBrandValue(
        getBrandMediaUrl(brand.seoImage),
        brand.seoImageUrl,
        getBrandLogoUrl(brand),
        getBrandFaviconUrl(brand),
    );
}

export function useBrand(): IBrandContext {
    const ctx = useContext(BrandContext);
    if (!ctx) {
        return {
            brand: () => DEFAULT_BRAND,
            reload: async () => {},
        };
    }
    return ctx;
}

export function clearBrandCache(domain?: string): void {
    try {
        if (domain) {
            localStorage.removeItem(`${BRAND_CACHE_KEY_PREFIX}${domain}`);
        } else {
            // Xóa tất cả brand cache
            Object.keys(localStorage)
                .filter(k => k.startsWith(BRAND_CACHE_KEY_PREFIX))
                .forEach(k => localStorage.removeItem(k));
        }
    } catch { /* SSR / private mode */ }
}
