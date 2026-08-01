import { Show, createSignal, createEffect, on } from 'solid-js';
import { Card } from '@core/components/utilities/Card';
import { Icon } from '@shared/components/icons/Icon';
import { Input } from '@core/components/control/Input';
import { Select } from '@core/components/control/Select';
import { Toggle } from '@core/components/control/Toggle';
import { InputImage } from '@core/components/control/InputImage';
import { toast } from '@core/components/toast/ToastProvider';
import { confirmAction } from '@core/components/dialog/ConfirmProvider';
import { generateDatatable, PagingArgsInput } from '@/core/components/table/GeneratedDatatable';
import {
    BrandService, BrandDTO, BrandLandingMode,
    CreateBrandInput, UpdateBrandInput,
} from '@/shared/services/brand/brand.service';
import { clearBrandCache } from '@/shared/contexts/brand/BrandContext';

// ─── Form values (flattened landingContent → top-level fields) ───────────────

type BrandFormValues = {
    name?: string;
    slug?: string;
    domain?: string;
    logoId?: string;
    faviconId?: string;
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string;
    seoImageId?: string;
    seoImageUrl?: string;
    primaryColor?: string;
    landingMode?: BrandLandingMode;
    landingHtmlUrl?: string;
    isDefault?: boolean;
    isActive?: boolean;
    // flattened from landingContent:
    heroTitle?: string;
    heroSubtitle?: string;
    heroImage?: string;
    loginTitle?: string;
};

function buildLandingContent(data: BrandFormValues) {
    if (data.landingMode === 'HTML') return undefined;
    const hasAny = data.heroTitle || data.heroSubtitle || data.heroImage || data.loginTitle;
    if (!hasAny) return undefined;
    return {
        heroTitle: data.heroTitle,
        heroSubtitle: data.heroSubtitle,
        heroImage: data.heroImage,
        loginTitle: data.loginTitle,
    };
}

function toCreateInput(data: BrandFormValues): CreateBrandInput {
    return {
        name: data.name ?? '',
        slug: data.slug ?? '',
        domain: data.domain ?? '',
        logoId: data.logoId ?? undefined,
        faviconId: data.faviconId ?? undefined,
        seoTitle: data.seoTitle ?? undefined,
        seoDescription: data.seoDescription ?? undefined,
        seoKeywords: data.seoKeywords ?? undefined,
        seoImageId: data.seoImageId ?? undefined,
        seoImageUrl: data.seoImageUrl ?? undefined,
        primaryColor: data.primaryColor,
        landingMode: data.landingMode,
        landingContent: buildLandingContent(data),
        landingHtmlUrl: data.landingMode === 'HTML' ? (data.landingHtmlUrl ?? undefined) : undefined,
        isDefault: data.isDefault,
        isActive: data.isActive,
    };
}

function toUpdateInput(data: BrandFormValues): UpdateBrandInput {
    return {
        name: data.name,
        slug: data.slug,
        domain: data.domain,
        logoId: data.logoId ?? undefined,
        faviconId: data.faviconId ?? undefined,
        seoTitle: data.seoTitle ?? undefined,
        seoDescription: data.seoDescription ?? undefined,
        seoKeywords: data.seoKeywords ?? undefined,
        seoImageId: data.seoImageId ?? undefined,
        seoImageUrl: data.seoImageUrl ?? undefined,
        primaryColor: data.primaryColor,
        landingMode: data.landingMode,
        landingContent: buildLandingContent(data),
        landingHtmlUrl: data.landingMode === 'HTML' ? (data.landingHtmlUrl ?? undefined) : undefined,
        isDefault: data.isDefault,
        isActive: data.isActive,
    };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ManageBrandsPage() {
    const { Datatable, triggerRefresh } = generateDatatable<
        PagingArgsInput,
        BrandDTO,
        BrandDTO,
        BrandDTO,
        BrandFormValues,
        BrandFormValues
    >({
        service: BrandService,
        paginatedQuery: BrandService.getAllBrand,
        queryInput: { sort: { createdAt: 'DESC' } },
        loadMode: 'page',
        limit: 15,
        itemQuery: (item) => BrandService.getOneBrand(item.id),
        createMutation: (data) => BrandService.createBrand(toCreateInput(data)),
        updateMutation: (id, data) => BrandService.updateBrand(id, toUpdateInput(data)),
        deleteMutation: (item) => BrandService.deleteBrand(item.id),
    });

    const handleSetDefault = async (id: string, name: string) => {
        const ok = await confirmAction().question(`Đặt "${name}" làm thương hiệu mặc định?`);
        if (!ok) return;
        await toast().api(async () => {
            await BrandService.setDefaultBrand(id);
            clearBrandCache();
            triggerRefresh();
        }, { successMessage: 'Đã đặt làm thương hiệu mặc định' });
    };

    return (
        <div class="space-y-6 animate-in">
            <Card class="border-none shadow-sm">
                <Datatable id="BrandDatatable">
                    {/* ─── Header ─────────────────────────────────────────── */}
                    <Datatable.Header class="mb-6">
                        <Datatable.Title
                            title="Quản lý thương hiệu"
                            description="Mỗi thương hiệu có domain, logo và landing page riêng"
                        />
                        <Datatable.Buttons>
                            <Datatable.ButtonRefresh />
                            <Datatable.ButtonCreate label="Thêm thương hiệu" />
                        </Datatable.Buttons>
                    </Datatable.Header>

                    {/* ─── Toolbar ────────────────────────────────────────── */}
                    <Datatable.Toolbar class="bg-gray-50/50 p-4 rounded-xl mb-4 border border-gray-100">
                        <Datatable.Search class="max-w-sm" />
                    </Datatable.Toolbar>

                    {/* ─── Table ──────────────────────────────────────────── */}
                    <Datatable.Table>
                        <Datatable.Column title="Thương hiệu" class="min-w-[220px]">
                            {(item) => (
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                                        <Show
                                            when={item.logo?.fullUrl ?? item.logoUrl}
                                            fallback={<Icon name="heroicons-outline:globe-alt" class="w-5 h-5 text-gray-300" />}
                                        >
                                            <img
                                                src={item.logo?.fullUrl ?? item.logoUrl}
                                                alt={item.name}
                                                class="w-full h-full object-contain p-1"
                                            />
                                        </Show>
                                    </div>
                                    <div>
                                        <div class="font-semibold text-gray-900 text-sm">{item.name}</div>
                                        <div class="text-xs text-gray-400 font-mono">/{item.slug}</div>
                                    </div>
                                </div>
                            )}
                        </Datatable.Column>

                        <Datatable.Column title="Domain" class="hidden md:table-cell">
                            {(item) => (
                                <span class="text-sm font-mono text-gray-600">{item.domain}</span>
                            )}
                        </Datatable.Column>

                        <Datatable.Column title="Màu" center fitContent>
                            {(item) => (
                                <div
                                    class="w-5 h-5 rounded-full border border-gray-200 mx-auto"
                                    style={{ 'background-color': item.primaryColor }}
                                    title={item.primaryColor}
                                />
                            )}
                        </Datatable.Column>

                        <Datatable.Column title="Landing" center fitContent class="hidden lg:table-cell">
                            {(item) => (
                                <span class={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                    item.landingMode === 'HTML'
                                        ? 'border-purple-200 text-purple-600 bg-purple-50'
                                        : 'border-gray-200 text-gray-500 bg-gray-50'
                                }`}>
                                    {item.landingMode === 'HTML' ? 'HTML' : 'Form'}
                                </span>
                            )}
                        </Datatable.Column>

                        <Datatable.Column title="Trạng thái" center fitContent>
                            {(item) => (
                                <div class="flex flex-col items-center gap-1">
                                    <Show when={item.isDefault}>
                                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            Mặc định
                                        </span>
                                    </Show>
                                    <span class={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                        item.isActive
                                            ? 'bg-blue-50 text-blue-600'
                                            : 'bg-gray-100 text-gray-400'
                                    }`}>
                                        {item.isActive ? 'Hoạt động' : 'Tắt'}
                                    </span>
                                </div>
                            )}
                        </Datatable.Column>

                        <Datatable.Column right fitContent>
                            {(item) => (
                                <Datatable.CellButtons>
                                    <Show when={!item.isDefault}>
                                        <Datatable.CellButton
                                            icon={<Icon name="heroicons-outline:star" class="w-4 h-4" />}
                                            onClick={() => handleSetDefault(item.id, item.name)}
                                        />
                                    </Show>
                                    <Datatable.CellButtonUpdate item={item} />
                                    <Show when={!item.isDefault}>
                                        <Datatable.CellButtonDelete item={item} itemName={item.name} />
                                    </Show>
                                </Datatable.CellButtons>
                            )}
                        </Datatable.Column>
                    </Datatable.Table>

                    <Datatable.Pagination class="border-t border-gray-100 p-4" />

                    {/* ─── Form ───────────────────────────────────────────── */}
                    <Datatable.Formlog
                        viewMode="modal"
                        modalType="dialog"
                        class="min-w-3xl"
                        transformUpdateInitialValues={(item: BrandDTO) => ({
                            ...item,
                            heroTitle: item.landingContent?.heroTitle ?? '',
                            heroSubtitle: item.landingContent?.heroSubtitle ?? '',
                            heroImage: item.landingContent?.heroImage ?? '',
                            loginTitle: item.landingContent?.loginTitle ?? '',
                        })}
                        onSubmitted={async () => {
                            clearBrandCache();
                        }}
                    >
                        {(item: BrandDTO | null | undefined) => (
                            <BrandFormBody item={item} Datatable={Datatable} />
                        )}
                    </Datatable.Formlog>
                </Datatable>
            </Card>
        </div>
    );
}

// ─── Form body (tách component để dùng createSignal) ─────────────────────────

function BrandFormBody(props: {
    item: BrandDTO | null | undefined;
    Datatable: ReturnType<typeof generateDatatable<any, any, any, any, any, any>>['Datatable'];
}) {
    const Dt = props.Datatable;
    const [landingMode, setLandingMode] = createSignal<string>(
        props.item?.landingMode ?? 'STRUCTURED'
    );

    // Sync mode khi form mở với item khác (edit brand khác nhau)
    createEffect(on(() => props.item?.id, () => {
        setLandingMode(props.item?.landingMode ?? 'STRUCTURED');
    }, { defer: true }));

    return (
        <div class="col-span-full grid grid-cols-12 gap-x-6 gap-y-8 p-8">
            {/* ── Thông tin cơ bản ─────────────────────────────────────── */}
            <div class="col-span-full">
                <p class="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                    Thông tin cơ bản
                </p>
            </div>

            <div class="col-span-5">
                <Dt.Field name="name" label="Tên thương hiệu" required>
                    <Input placeholder="DurianBase" />
                </Dt.Field>
            </div>
            <div class="col-span-4">
                <Dt.Field name="slug" label="Slug" required>
                    <Input placeholder="durianbase" />
                </Dt.Field>
            </div>
            <div class="col-span-3">
                <Dt.Field name="primaryColor" label="Màu chủ đạo">
                    <Input type="color" class="h-10 cursor-pointer" />
                </Dt.Field>
            </div>

            <div class="col-span-8">
                <Dt.Field name="domain" label="Domain" required>
                    <Input placeholder="durianbase.com" />
                </Dt.Field>
            </div>
            <div class="col-span-2">
                <Dt.Field name="isActive" label="Kích hoạt">
                    <Toggle />
                </Dt.Field>
            </div>
            <div class="col-span-2">
                <Dt.Field name="isDefault" label="Mặc định">
                    <Toggle />
                </Dt.Field>
            </div>

            {/* ── Logo & Favicon ───────────────────────────────────────── */}
            <div class="col-span-full border-t border-dashed border-gray-100 pt-5">
                <p class="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                    Logo & Favicon
                </p>
            </div>

            <div class="col-span-6">
                <Dt.Field name="logoId" label="Logo thương hiệu">
                    <InputImage
                        medias={props.item?.logo
                            ? { id: props.item.logo.id, url: props.item.logo.fullUrl ?? props.item.logo.url, fileName: '', fileSize: 0 }
                            : null
                        }
                    />
                </Dt.Field>
            </div>
            <div class="col-span-6">
                <Dt.Field name="faviconId" label="Favicon (tab trình duyệt)">
                    <InputImage
                        medias={props.item?.favicon
                            ? { id: props.item.favicon.id, url: props.item.favicon.fullUrl ?? props.item.favicon.url, fileName: '', fileSize: 0 }
                            : null
                        }
                    />
                </Dt.Field>
            </div>

            {/* ── Landing Page ─────────────────────────────────────────── */}
            <div class="col-span-full border-t border-dashed border-gray-100 pt-5">
                <p class="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                    Landing Page
                </p>
            </div>

            <div class="col-span-full border-t border-dashed border-gray-100 pt-5">
                <p class="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                    SEO & Social preview
                </p>
            </div>

            <div class="col-span-6">
                <Dt.Field name="seoTitle" label="Tiêu đề SEO / tab trình duyệt">
                    <Input placeholder="Thiên Tâm | Nông nghiệp số" />
                </Dt.Field>
            </div>
            <div class="col-span-6">
                <Dt.Field name="seoKeywords" label="Từ khóa SEO">
                    <Input placeholder="nông nghiệp, truy xuất nguồn gốc, Thiên Tâm" />
                </Dt.Field>
            </div>
            <div class="col-span-full">
                <Dt.Field name="seoDescription" label="Mô tả SEO">
                    <Input placeholder="Nền tảng quản lý chuỗi giá trị nông nghiệp..." />
                </Dt.Field>
            </div>
            <div class="col-span-6">
                <Dt.Field name="seoImageId" label="Ảnh SEO / social share">
                    <InputImage
                        medias={props.item?.seoImage
                            ? { id: props.item.seoImage.id, url: props.item.seoImage.fullUrl ?? props.item.seoImage.url, fileName: '', fileSize: 0 }
                            : null
                        }
                    />
                </Dt.Field>
            </div>
            <div class="col-span-6">
                <Dt.Field name="seoImageUrl" label="URL ảnh SEO dự phòng">
                    <Input placeholder="https://..." />
                </Dt.Field>
            </div>

            <div class="col-span-full">
                <Dt.Field name="landingMode" label="Loại landing page">
                    <Select
                        options={[
                            { value: 'STRUCTURED', label: 'Thiết kế bằng form (khuyến nghị)' },
                            { value: 'HTML', label: 'Upload file HTML' },
                        ]}
                        onChange={(v) => setLandingMode((v as string) ?? 'STRUCTURED')}
                    />
                </Dt.Field>
            </div>

            <Show when={landingMode() === 'STRUCTURED'}>
                <div class="col-span-6">
                    <Dt.Field name="heroTitle" label="Tiêu đề chính (Hero Title)">
                        <Input placeholder="Sàn giao dịch sầu riêng chuyên nghiệp" />
                    </Dt.Field>
                </div>
                <div class="col-span-6">
                    <Dt.Field name="heroSubtitle" label="Mô tả ngắn (Hero Subtitle)">
                        <Input placeholder="Kết nối vùng trồng — minh bạch từ gốc đến tay" />
                    </Dt.Field>
                </div>
                <div class="col-span-6">
                    <Dt.Field name="heroImage" label="Ảnh hero (URL)">
                        <Input placeholder="https://..." />
                    </Dt.Field>
                </div>
                <div class="col-span-6">
                    <Dt.Field name="loginTitle" label="Tiêu đề trang đăng nhập">
                        <Input placeholder="Đăng nhập DurianBase" />
                    </Dt.Field>
                </div>
            </Show>

            <Show when={landingMode() === 'HTML'}>
                <div class="col-span-full">
                    <Dt.Field name="landingHtmlUrl" label="URL file HTML landing page">
                        <Input placeholder="https://cdn.example.com/landing.html" />
                    </Dt.Field>
                </div>
                <div class="col-span-full">
                    <p class="text-xs text-gray-400">
                        Tải file HTML lên S3/CDN trước, sau đó dán URL vào trường trên.
                        File HTML sẽ được nhúng qua iframe sandbox.
                    </p>
                </div>
            </Show>
        </div>
    );
}
