import { createResource, createSignal, Show } from 'solid-js';
import { Card } from '@core/components/utilities/Card';
import { generateDatatable, PagingArgsInput } from '@core/components/table/GeneratedDatatable';
import { useDatatable } from '@core/components/table/DatatableContext';
import { Input } from '@core/components/control/Input';
import { Select } from '@core/components/control/Select';
import { AddTranslationButton } from './AddTranslationButton';
import { PageDataBindingModal } from './PageDataBindingModal';
import { PageDTO, PageService } from '@/shared/services/page/page.service';
import { SectionService } from '@/shared/services/section/section.service';
import { ContentTypeDTO, ContentTypeService } from '@/shared/services/contentType/contentType.service';
import { HeaderPresetService } from '@/shared/services/headerPreset/headerPreset.service';
import { FooterPresetService } from '@/shared/services/footerPreset/footerPreset.service';
import { Icon } from '@shared/components/icons/Icon';
import { EPageType, EPageStatus } from '@shared/generated/typed-graphql';
import type { CreatePageInput, UpdatePageInput } from '@shared/generated/typed-graphql';
import { ESectionType, EAnimationPreset, EAnimationSpeed, ESectionTheme, EImagePosition } from '@/modules/cms/cms.constants';
import type { Edge } from '@core/api/types';
import { useRoutes } from '@/shared/contexts/routes/RoutesContext';
import { toast } from '@core/components/toast/ToastProvider';
import { t, tOrLiteral } from '@/shared/i18n/t';

const PAGE_TYPE_OPTIONS = () => [
    { value: EPageType.STATIC_MODULAR, label: t('cms.pages.pageTypeOptions.staticModular') },
    { value: EPageType.COLLECTION_LISTING, label: t('cms.pages.pageTypeOptions.collectionListing') },
    { value: EPageType.SPECIAL, label: t('cms.pages.pageTypeOptions.special') },
];

const STATUS_LABEL_KEY: Record<string, 'draft' | 'scheduled' | 'published' | 'unpublished' | 'archived'> = {
    DRAFT: 'draft',
    SCHEDULED: 'scheduled',
    PUBLISHED: 'published',
    UNPUBLISHED: 'unpublished',
    ARCHIVED: 'archived',
};

const { Datatable, triggerRefresh } = generateDatatable<PagingArgsInput, PageDTO, PageDTO, PageDTO, CreatePageInput, UpdatePageInput>({
    service: PageService,
    paginatedQuery: (input) => PageService.getAllPage(input),
    itemQuery: (item) => PageService.getOnePage({ id: item.id! }),
    createMutation: (data) => PageService.createPage({ data }),
    updateMutation: (id, data) => PageService.updatePage({ id, data }),
    deleteMutation: (item) => PageService.deletePage({ id: item.id! }),
});

export function ManageCmsPagesPage() {
    const { navigateToPage } = useRoutes();
    // Phase 0 M1 Task 11 — which row's Page.dataBinding modal is open (undefined = closed).
    // `PageDataBindingModal` is mounted PERMANENTLY below (NOT wrapped in `<Show>`) — see its
    // file header for why: unmounting the whole subtree while still open would skip the
    // Modal's isOpen-true→false backdrop cleanup effect and leave a dangling full-screen
    // backdrop (a real bug already caught/documented for this exact pattern in
    // TermTreeEditor.tsx).
    const [dataBindingPage, setDataBindingPage] = createSignal<PageDTO | undefined>();
    const [contentTypes] = createResource(() => ContentTypeService.getAllContentType({ input: { limit: 200 } }));
    const contentTypeOptions = () => ((contentTypes()?.edges || []) as Edge<ContentTypeDTO>[])
        .filter((e) => !!e.node)
        .map((e) => ({ value: e.node!.id!, label: e.node!.label! }));

    const [headerPresets] = createResource(() => HeaderPresetService.getAllHeaderPresets());
    const headerPresetOptions = () => (headerPresets() || []).map((p) => ({
        value: p.id!,
        label: p.isDefault ? `${p.name} (${t('cms.headerPresets.defaultBadge')})` : p.name!,
    }));
    const [footerPresets] = createResource(() => FooterPresetService.getAllFooterPresets());
    const footerPresetOptions = () => (footerPresets() || []).map((p) => ({
        value: p.id!,
        label: p.isDefault ? `${p.name} (${t('cms.footerPresets.defaultBadge')})` : p.name!,
    }));

    const handlePublish = async (item: PageDTO) => {
        try {
            await PageService.publishPage({ id: item.id! });
            toast().success(t('cms.pages.publishSuccess'));
            triggerRefresh();
        } catch (err) {
            toast().danger(t('cms.pages.publishFailed'), err instanceof Error ? err.message : undefined);
        }
    };
    const handleUnpublish = async (item: PageDTO) => {
        try {
            await PageService.unpublishPage({ id: item.id! });
            toast().info(t('cms.pages.unpublishSuccess'));
            triggerRefresh();
        } catch (err) {
            toast().danger(t('cms.pages.unpublishFailed'), err instanceof Error ? err.message : undefined);
        }
    };

    /**
     * Tạo nhanh 1 trang demo có sẵn nội dung + animation thật (Hero + Text&Image
     * + CTA) để admin thấy ngay kết quả cụ thể thay vì bắt đầu từ trang trắng —
     * mở luôn Page Builder ngay sau khi tạo.
     */
    const seedSamplePage = async () => {
        const path = `/trang-mau-${Date.now().toString(36)}`;
        const page = await PageService.createPage({
            data: { internalName: 'Trang mẫu (demo)', path, pageType: EPageType.STATIC_MODULAR, templateKey: 'home' },
        });

        // `content`/`animation` là scalar Mixed (JSON tự do) — generated input type
        // của nó sinh ra "string" do hạn chế của tool codegen (xem comment đầu
        // cms.types.ts), giá trị thật lúc runtime vẫn là object JSON bình thường.
        await SectionService.createSection({
            data: {
                pageId: page.id!,
                type: ESectionType.HERO,
                order: 0,
                content: {
                    eyebrow: 'Giải pháp thiết kế bao bì',
                    heading: 'Tạo dấu ấn thương hiệu qua từng bao bì sản phẩm',
                    description: 'Chúng tôi đồng hành cùng thương hiệu của bạn từ ý tưởng đến sản phẩm hoàn thiện — sáng tạo, chỉn chu, đúng chất lượng.',
                    image: 'https://picsum.photos/seed/hero1/1600/900',
                    ctaLabel: 'Liên hệ ngay',
                    ctaHref: '#contact',
                } as any,
                animation: [
                    { target: 'eyebrow', preset: EAnimationPreset.FADE_IN, order: 1, delay: 0, speed: EAnimationSpeed.MEDIUM },
                    { target: 'heading', preset: EAnimationPreset.TEXT_REVEAL, order: 2, delay: 100, speed: EAnimationSpeed.MEDIUM },
                    { target: 'description', preset: EAnimationPreset.FADE_UP, order: 3, delay: 250, speed: EAnimationSpeed.MEDIUM },
                    { target: 'cta', preset: EAnimationPreset.FADE_UP, order: 4, delay: 350, speed: EAnimationSpeed.MEDIUM },
                    { target: 'image', preset: EAnimationPreset.SCALE_IN, order: 5, delay: 200, speed: EAnimationSpeed.SLOW },
                ] as any,
                style: { theme: ESectionTheme.DARK } as any,
            },
        });

        await SectionService.createSection({
            data: {
                pageId: page.id!,
                type: ESectionType.TEXT_IMAGE,
                order: 1,
                content: {
                    heading: 'Quy trình làm việc chuyên nghiệp',
                    text: 'Từ khảo sát thị trường, phác thảo ý tưởng, đến sản xuất thử nghiệm — mỗi bước đều được đội ngũ thiết kế và kỹ thuật của chúng tôi kiểm soát chặt chẽ để đảm bảo sản phẩm cuối cùng đúng như kỳ vọng.',
                    image: 'https://picsum.photos/seed/process1/1200/1200',
                    imagePosition: EImagePosition.LEFT,
                } as any,
                animation: [
                    { target: 'image', preset: EAnimationPreset.SLIDE_RIGHT, order: 1, delay: 0, speed: EAnimationSpeed.MEDIUM },
                    { target: 'heading', preset: EAnimationPreset.FADE_UP, order: 2, delay: 100, speed: EAnimationSpeed.MEDIUM },
                    { target: 'text', preset: EAnimationPreset.FADE_UP, order: 3, delay: 200, speed: EAnimationSpeed.MEDIUM },
                ] as any,
            },
        });

        await SectionService.createSection({
            data: {
                pageId: page.id!,
                type: ESectionType.CTA,
                order: 2,
                content: {
                    heading: 'Sẵn sàng kể câu chuyện thương hiệu của bạn?',
                    description: 'Liên hệ với chúng tôi để nhận tư vấn miễn phí ngay hôm nay.',
                    buttonLabel: 'Bắt đầu ngay',
                    buttonHref: '#contact',
                    email: 'contact@example.com',
                } as any,
                animation: [
                    { target: 'heading', preset: EAnimationPreset.FADE_UP, order: 1, delay: 0, speed: EAnimationSpeed.MEDIUM },
                    { target: 'description', preset: EAnimationPreset.FADE_UP, order: 2, delay: 100, speed: EAnimationSpeed.MEDIUM },
                    { target: 'cta', preset: EAnimationPreset.FADE_UP, order: 3, delay: 200, speed: EAnimationSpeed.MEDIUM },
                ] as any,
            },
        });

        toast().success(t('cms.pages.seedSuccess'));
        triggerRefresh();
        navigateToPage({ route: 'adminDashboard.cmsBuilder', context: { searchParams: { pageId: page.id } } });
    };

    return (
        <div class="space-y-6 animate-in">
            <Card class="border-none shadow-sm">
                <Datatable id="CmsPageTable">
                    <Datatable.Header>
                        <Datatable.Title title={t('cms.pages.title')} description={t('cms.pages.description')} />
                        <Datatable.Buttons>
                            <Datatable.Button sm outline onClick={seedSamplePage}>{t('cms.pages.seedButton')}</Datatable.Button>
                            <Datatable.ButtonRefresh />
                            <Datatable.ButtonCreate label={t('cms.pages.createButton')} />
                        </Datatable.Buttons>
                    </Datatable.Header>

                    <Datatable.Toolbar>
                        <Datatable.Search />
                    </Datatable.Toolbar>

                    <Datatable.Table>
                        <Datatable.Column title={t('cms.pages.columns.internalName')} sortable="internalName">
                            {(item) => <p class="font-semibold text-gray-900">{item.internalName}</p>}
                        </Datatable.Column>
                        <Datatable.Column title={t('cms.pages.columns.path')}>
                            {(item) => <code class="text-sm bg-gray-100 px-2 py-0.5 rounded font-mono">{item.path}</code>}
                        </Datatable.Column>
                        <Datatable.Column title={t('cms.pages.columns.pageType')}>
                            {(item) => <span class="text-sm text-neutral-600">{PAGE_TYPE_OPTIONS().find((o) => o.value === item.pageType)?.label ?? item.pageType}</span>}
                        </Datatable.Column>
                        <Datatable.Column title={t('cms.pages.columns.status')}>
                            {(item) => (
                                <span class={`text-xs font-semibold px-2 py-0.5 rounded-full ${item.status === EPageStatus.PUBLISHED ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-gray-100 text-gray-500'}`}>
                                    {tOrLiteral(`cms.pages.status.${STATUS_LABEL_KEY[item.status!] ?? 'draft'}`)}
                                </span>
                            )}
                        </Datatable.Column>
                        <Datatable.Column title="">
                            {(item) => (
                                <Datatable.CellButtons>
                                    {/* Page Builder (cấu trúc khối) áp dụng cho MỌI loại trang, kể cả
                                        trang Chi tiết. Xem trước/Xem trang thì KHÔNG áp dụng được cho
                                        trang có path còn chứa tham số động ":param" (chưa gắn 1 bản ghi
                                        cụ thể) — trước mục γ điều kiện này là `pageType !== COLLECTION_DETAIL`,
                                        nay kiểm thẳng trên path (tổng quát hơn, đúng cả trang Chi tiết kiểu β). */}
                                    <Datatable.CellButton
                                        sm
                                        solid
                                        icon={<Icon name="heroicons-outline:pencil-square" tooltip={t('cms.pages.editButton')} />}
                                        onClick={() => navigateToPage({ route: 'adminDashboard.cmsBuilder', context: { searchParams: { pageId: item.id } } })}
                                    />
                                    {/* Node Builder (Phase 1 của node-tree visual builder mới) */}
                                    <Datatable.CellButton
                                        sm
                                        icon={<Icon name="heroicons-outline:cube-transparent" tooltip={t('cms.pages.nodeBuilderButton')} />}
                                        onClick={() => navigateToPage({ route: 'adminDashboard.cmsNodeBuilder', context: { searchParams: { pageId: item.id } } })}
                                    />
                                    <Datatable.CellButton
                                        sm
                                        icon={<Icon name="heroicons-outline:table-cells" tooltip={t('cms.pages.advancedButton')} />}
                                        onClick={() => navigateToPage({ route: 'adminDashboard.cmsSections', context: { searchParams: { pageId: item.id, pageName: item.internalName } } })}
                                    />
                                    {/* Phase 0 M1 Task 11 — configure Page.dataBinding (detail-page binding for
                                        Node-tree pages), the Node-tree equivalent of the legacy Section system's
                                        CONTENT_DETAIL block. */}
                                    <Datatable.CellButton
                                        sm
                                        icon={<Icon name="heroicons-outline:link" tooltip={t('cms.pages.dataBinding.title')} />}
                                        onClick={() => setDataBindingPage(item)}
                                    />
                                    <Show when={!item.path?.includes(':')}>
                                        <Datatable.CellButton
                                            sm
                                            icon={<Icon name="heroicons-outline:eye" tooltip={t('cms.pages.previewButton')} />}
                                            onClick={() => navigateToPage({ route: 'adminDashboard.cmsPreview', context: { searchParams: { path: item.path! } } })}
                                        />
                                    </Show>
                                    <Show when={item.status === EPageStatus.PUBLISHED && !item.path?.includes(':')}>
                                        <Datatable.CellButton
                                            sm
                                            icon={<Icon name="heroicons-outline:arrow-top-right-on-square" tooltip={t('cms.pages.viewLiveButton')} />}
                                            onClick={() => window.open(item.path!, '_blank')}
                                        />
                                    </Show>
                                    <Show when={item.status !== EPageStatus.PUBLISHED}>
                                        <Datatable.CellButton
                                            sm
                                            solid
                                            icon={<Icon name="heroicons-outline:cloud-arrow-up" tooltip={t('cms.pages.publishButton')} />}
                                            onClick={() => handlePublish(item)}
                                        />
                                    </Show>
                                    <Show when={item.status === EPageStatus.PUBLISHED}>
                                        <Datatable.CellButton
                                            sm
                                            icon={<Icon name="heroicons-outline:eye-slash" tooltip={t('cms.pages.unpublishButton')} />}
                                            onClick={() => handleUnpublish(item)}
                                        />
                                    </Show>
                                    <Datatable.CellButtonUpdate item={item} />
                                    <Datatable.CellButtonDelete item={item} itemName={item.internalName!} />
                                </Datatable.CellButtons>
                            )}
                        </Datatable.Column>
                    </Datatable.Table>

                    <Datatable.Pagination />

                    <Datatable.Formlog
                        viewMode="modal"
                        class="w-full max-w-[640px]"
                        createTitle={t('cms.pages.createTitle')}
                        updateTitle={t('cms.pages.updateTitle')}
                    >
                        {(item) => {
                            const { setIsFormlogOpen, setFormlogItem } = useDatatable();

                            // "+ Thêm bản dịch" (Phase 3 mục 3, Task 15) — nhân bản Page hiện tại
                            // (+ toàn bộ Section con, xem PageService.createTranslation phía BE)
                            // sang 1 locale mới. Sửa nội dung của Page CHỈ diễn ra ở Page Builder
                            // (form CRUD ở đây chỉ có metadata), không có "modal sửa" nào để mở
                            // tại chỗ như Content Entry — đóng modal rồi điều hướng sang Builder
                            // của bản dịch mới, đúng hành vi nút bút chì (pencil) trong bảng.
                            const handleCreateTranslation = async (locale: string) => {
                                const created = await PageService.createPageTranslation({ pageId: item!.id!, locale });
                                toast().success(t('cms.translations.createSuccess'));
                                triggerRefresh();
                                setIsFormlogOpen(false);
                                setFormlogItem();
                                navigateToPage({ route: 'adminDashboard.cmsBuilder', context: { searchParams: { pageId: created.id } } });
                            };

                            return (
                                <div class="col-span-full grid grid-cols-12 gap-x-6 gap-y-6 p-8">
                                    <div class="col-span-full grid grid-cols-12 gap-x-6 gap-y-6">
                                        <div class="col-span-8">
                                            <Datatable.Field name="internalName" label={t('cms.pages.fields.internalName')} required>
                                                <Input placeholder={t('cms.pages.fields.internalNamePlaceholder')} />
                                            </Datatable.Field>
                                        </div>
                                        <div class="col-span-4">
                                            <Datatable.Field name="path" label={t('cms.pages.fields.path')} required>
                                                <Input placeholder={t('cms.pages.fields.pathPlaceholder')} />
                                            </Datatable.Field>
                                        </div>
                                        <div class="col-span-6">
                                            <Datatable.Field name="pageType" label={t('cms.pages.fields.pageType')} required>
                                                <Select options={PAGE_TYPE_OPTIONS()} />
                                            </Datatable.Field>
                                        </div>
                                        <div class="col-span-6">
                                            <Datatable.Field name="templateKey" label={t('cms.pages.fields.templateKey')}>
                                                <Input placeholder={t('cms.pages.fields.templateKeyPlaceholder')} />
                                            </Datatable.Field>
                                        </div>
                                        <div class="col-span-12">
                                            <Datatable.Field name="contentTypeId" label={t('cms.pages.fields.contentType')}>
                                                <Select options={contentTypeOptions()} clearable />
                                            </Datatable.Field>
                                        </div>
                                        <div class="col-span-6">
                                            <Datatable.Field name="headerPresetId" label={t('cms.pages.fields.headerPreset')} description={t('cms.pages.fields.headerPresetHint')}>
                                                <Select options={headerPresetOptions()} clearable />
                                            </Datatable.Field>
                                        </div>
                                        <div class="col-span-6">
                                            <Datatable.Field name="footerPresetId" label={t('cms.pages.fields.footerPreset')} description={t('cms.pages.fields.footerPresetHint')}>
                                                <Select options={footerPresetOptions()} clearable />
                                            </Datatable.Field>
                                        </div>
                                    </div>

                                    {/* SEO đã chuyển vào Trình xây trang (Page Builder) -> nút Cài đặt trang
                                        (⚙), nơi có đủ ngữ cảnh Content Type gắn ở block Chi tiết để cấu hình
                                        mapping field -> SEO (mục δ design 2026-08-09-block-driven-content-
                                        binding-design.md). Form CRUD danh sách trang này chỉ còn phần Nội dung. */}

                                    {/* "+ Thêm bản dịch" (Task 15) — CHỈ ở chế độ Sửa (`item` có giá trị).
                                        Page mới tạo trong CHÍNH modal này chưa persist xong lúc render (form
                                        đang ở nhánh create), "dịch" 1 thứ chưa tồn tại là vô nghĩa. */}
                                    <Show when={item}>
                                        <div class="col-span-full border-t border-gray-100 pt-5">
                                            <label class="mb-2 block text-sm font-semibold text-gray-700">
                                                {t('cms.translations.sectionLabel')}
                                            </label>
                                            <AddTranslationButton currentLocale={item!.locale} onCreate={handleCreateTranslation} />
                                        </div>
                                    </Show>
                                </div>
                            );
                        }}
                    </Datatable.Formlog>
                </Datatable>
            </Card>

            {/* Phase 0 M1 Task 11 — mounted permanently, NOT wrapped in `<Show>` (see
                PageDataBindingModal.tsx's file header / the signal comment above). */}
            <PageDataBindingModal
                page={dataBindingPage()}
                isOpen={!!dataBindingPage()}
                onClose={() => setDataBindingPage(undefined)}
                onSaved={() => { setDataBindingPage(undefined); triggerRefresh(); }}
            />
        </div>
    );
}
