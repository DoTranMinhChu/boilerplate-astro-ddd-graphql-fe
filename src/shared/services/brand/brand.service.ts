import { $, fragment, query, mutation, Brand, Media } from '@shared/generated/typed-graphql';
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

export class BrandService extends BaseService {
    static apiName = 'brand' as const;
    static displayName = 'Brand';

    /** Fragment dùng chung — type-check theo schema, không còn GraphQL string thủ công. */
    static mediaFragment = fragment(Media, (m) => [m.id, m.url, m.fullUrl]);

    static fragment = fragment(Brand, (i) => [
        i.id, i.name, i.slug, i.domain,
        i.logoUrl, i.faviconUrl,
        i.logoId, i.logo(() => this.mediaFragment),
        i.faviconId, i.favicon(() => this.mediaFragment),
        i.seoTitle, i.seoDescription, i.seoKeywords,
        i.seoImageUrl, i.seoImageId, i.seoImage(() => this.mediaFragment),
        i.primaryColor,
        i.landingMode, i.landingContent, i.landingHtmlUrl,
        i.isDefault, i.isActive,
        i.createdAt, i.updatedAt,
    ]);

    static getBrandConfig = async (domain: string): Promise<BrandDTO | null> => {
        const res = await this.queryApi({
            document: query('getBrandConfig', (root) => [
                root.getBrandConfig({ domain: $('domain') }, () => this.fragment),
            ]),
            variables: { domain },
        }, { requestPolicy: 'network-only' });
        return (res?.getBrandConfig ?? null) as unknown as BrandDTO | null;
    };

    static getAllBrand = async (args: { input: any }): Promise<BrandPaginationCursor> => {
        const res = await this.queryApi({
            document: query('getAllBrand', (root) => [
                root.getAllBrand({ input: $('input') }, (n) => [
                    n.edges((e) => [e.node(() => this.fragment), e.cursor]),
                    n.pageInfo((p) => [
                        p.startCursor, p.endCursor, p.hasNextPage, p.hasPreviousPage,
                        p.totalCount, p.totalPage, p.limit,
                    ]),
                ]),
            ]),
            variables: args,
        }, { requestPolicy: 'network-only' });
        return res.getAllBrand as unknown as BrandPaginationCursor;
    };

    static getOneBrand = async (id: string): Promise<BrandDTO> => {
        const res = await this.queryApi({
            document: query('getOneBrand', (root) => [
                root.getOneBrand({ id: $('id') }, () => this.fragment),
            ]),
            variables: { id },
        }, { requestPolicy: 'network-only' });
        return res.getOneBrand as unknown as BrandDTO;
    };

    static getBrands = async (): Promise<BrandDTO[]> => {
        const res = await this.queryApi({
            document: query('getBrands', (root) => [
                root.getBrands(() => this.fragment),
            ]),
            variables: {},
        }, { requestPolicy: 'network-only' });
        return (res?.getBrands ?? []) as unknown as BrandDTO[];
    };

    static createBrand = async (data: CreateBrandInput): Promise<BrandDTO> => {
        const res = await this.mutationApi({
            document: mutation('createBrand', (root) => [
                root.createBrand({ data: $('data') }, () => this.fragment),
            ]),
            variables: { data: data as any },
        });
        return res.createBrand as unknown as BrandDTO;
    };

    static updateBrand = async (id: string, data: UpdateBrandInput): Promise<BrandDTO> => {
        const res = await this.mutationApi({
            document: mutation('updateBrand', (root) => [
                root.updateBrand({ id: $('id'), data: $('data') }, () => this.fragment),
            ]),
            variables: { id, data: data as any },
        });
        return res.updateBrand as unknown as BrandDTO;
    };

    static deleteBrand = async (id: string): Promise<boolean> => {
        const res = await this.mutationApi({
            document: mutation('deleteBrand', (root) => [
                root.deleteBrand({ id: $('id') }),
            ]),
            variables: { id },
        });
        return res.deleteBrand as boolean;
    };

    static setDefaultBrand = async (id: string): Promise<BrandDTO> => {
        const res = await this.mutationApi({
            document: mutation('setDefaultBrand', (root) => [
                root.setDefaultBrand({ id: $('id') }, () => this.fragment),
            ]),
            variables: { id },
        });
        return res.setDefaultBrand as unknown as BrandDTO;
    };
}
