// Backend "kept modules" hiện tại KHÔNG có module brand (không entity/resolver
// trong ddd-graphql-be/src/modules) — generated typed-graphql.ts không export
// `Brand`/`Media` (đã kiểm tra schema.graphql), nên không thể build query qua
// typed builder. Giữ nguyên toàn bộ shape DTO (đã viết tay sẵn từ trước) để UI
// biên dịch được; mọi method throw rõ ràng khi gọi thay vì sập lúc import.
import { BaseService } from '@/core/services/base.service';
import type { PaginationCursor } from '@/core/api/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BrandLandingMode = 'STRUCTURED' | 'HTML';

export interface BrandLandingFeature {
    title: string;
    description: string;
    icon: string;
}

export interface BrandLandingContent {
    heroTitle?: string;
    heroSubtitle?: string;
    heroImage?: string;
    loginTitle?: string;
    loginBg?: string;
    features?: BrandLandingFeature[];
}

export interface BrandMediaDTO {
    id: string;
    url: string;
    fullUrl?: string;
}

export interface BrandDTO {
    id: string;
    name: string;
    slug: string;
    domain: string;
    logoUrl?: string;
    faviconUrl?: string;
    logoId?: string;
    logo?: BrandMediaDTO;
    faviconId?: string;
    favicon?: BrandMediaDTO;
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string;
    seoImageUrl?: string;
    seoImageId?: string;
    seoImage?: BrandMediaDTO;
    primaryColor: string;
    landingMode: BrandLandingMode;
    landingContent?: BrandLandingContent;
    landingHtmlUrl?: string;
    isDefault: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateBrandInput {
    name: string;
    slug: string;
    domain: string;
    logoUrl?: string;
    faviconUrl?: string;
    logoId?: string;
    faviconId?: string;
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string;
    seoImageUrl?: string;
    seoImageId?: string;
    primaryColor?: string;
    landingMode?: BrandLandingMode;
    landingContent?: BrandLandingContent;
    landingHtmlUrl?: string;
    isDefault?: boolean;
    isActive?: boolean;
}

export type UpdateBrandInput = Partial<CreateBrandInput>;

export type BrandPaginationCursor = PaginationCursor<BrandDTO>;

// ─── Service ──────────────────────────────────────────────────────────────────

const NOT_SUPPORTED = 'BrandService: backend hiện tại chưa có module brand.';

export class BrandService extends BaseService {
    static apiName = 'brand' as const;
    static displayName = 'Brand';

    static getBrandConfig = async (_domain: string): Promise<BrandDTO | null> => {
        throw new Error(NOT_SUPPORTED);
    };

    static getAllBrand = async (_args: { input: any }): Promise<BrandPaginationCursor> => {
        throw new Error(NOT_SUPPORTED);
    };

    static getOneBrand = async (_id: string): Promise<BrandDTO> => {
        throw new Error(NOT_SUPPORTED);
    };

    static getBrands = async (): Promise<BrandDTO[]> => {
        throw new Error(NOT_SUPPORTED);
    };

    static createBrand = async (_data: CreateBrandInput): Promise<BrandDTO> => {
        throw new Error(NOT_SUPPORTED);
    };

    static updateBrand = async (_id: string, _data: UpdateBrandInput): Promise<BrandDTO> => {
        throw new Error(NOT_SUPPORTED);
    };

    static deleteBrand = async (_id: string): Promise<boolean> => {
        throw new Error(NOT_SUPPORTED);
    };

    static setDefaultBrand = async (_id: string): Promise<BrandDTO> => {
        throw new Error(NOT_SUPPORTED);
    };
}
