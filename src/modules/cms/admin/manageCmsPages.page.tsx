import { createResource, Show } from 'solid-js';
import { Card } from '@core/components/utilities/Card';
import { generateDatatable, PagingArgsInput } from '@shared/components/table/GeneratedDatatable';
import { useDatatable } from '@core/components/table/DatatableContext';
import { Input } from '@core/components/control/Input';
import { Select } from '@core/components/control/Select';
import { AddTranslationButton } from './AddTranslationButton';
import { KitStarterFields } from './KitStarterFields';
import { createPageWithOptionalKit, clearKitSelection } from './kitStarter';
import { PageDTO, PageService } from '@/shared/services/page/page.service';
import { NodeService } from '@/shared/services/node/node.service';
import { ContentTypeDTO, ContentTypeService } from '@/shared/services/contentType/contentType.service';
import { HeaderPresetService } from '@/shared/services/headerPreset/headerPreset.service';
import { FooterPresetService } from '@/shared/services/footerPreset/footerPreset.service';
import { ThemeService } from '@/shared/services/theme/theme.service';
import { Icon } from '@shared/components/icons/Icon';
import { EPageType, EPageStatus } from '@shared/generated/typed-graphql';
import type { CreatePageInput, UpdatePageInput } from '@shared/generated/typed-graphql';
import { ENodeType, ELayoutMode } from '@/modules/cms/node/node.constants';
import { EBackgroundFillType } from '@/modules/cms/node/node.types';
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
    createMutation: (data) => createPageWithOptionalKit(data),
    updateMutation: (id, data) => PageService.updatePage({ id, data }),
    deleteMutation: (item) => PageService.deletePage({ id: item.id! }),
});

export function ManageCmsPagesPage() {
    const { navigateToPage } = useRoutes();
    // Node-level data binding (2026-08-17) removed "Cấu hình trang Chi tiết" (Page.dataBinding)
    // — this used to be where its modal-open signal lived (see PageDataBindingModal.tsx, kept
    // on disk but unmounted, for the same reversibility reason the design doc's cutover section
    // gives for not dropping the DB columns yet).
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
    const [themes] = createResource(() => ThemeService.getAllThemes());
    const themeOptions = () => (themes() || []).map((th) => ({
        value: th.id!,
        label: th.isDefault ? `${th.name} (${t('cms.themes.defaultBadge')})` : th.name!,
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
        // `createPage()` (BE Task 3, Phase 0 M1) đã tự tạo 1 root Node (frame rỗng) và repoint
        // `page.rootNodeId` — seed 3 Frame con dưới root này để demo layout Hero/Text+Image/CTA
        // tối thiểu bằng 4 loại Node hand-authorable (Frame/Text/Image/Button). `CreateNodeInput`
        // không có field `animation` inline như `CreateSectionInput` cũ (Node dùng `animationRef`,
        // 1 cơ chế tham chiếu khác hẳn) — seed này CỐ Ý bỏ animation: `animationRef`'s shape giờ
        // đã có (Phase 4, `AnimationTimeline`), nhưng seed demo tối giản này không cần minh hoạ
        // animation — admin có thể tự thêm qua tab "Hiệu ứng" của Inspector sau khi tạo trang.
        const heroFrame = await NodeService.createNode({
            data: {
                pageId: page.id!,
                parentId: page.rootNodeId,
                type: ENodeType.FRAME,
                order: 0,
                layoutMode: ELayoutMode.FLOW,
                layout: { direction: 'column', gap: 16, align: 'start' } as any,
                style: { background: { type: EBackgroundFillType.COLOR, value: '#111827' }, spacing: { padding: { t: 64, r: 32, b: 64, l: 32 } } } as any,
            },
        });
        await NodeService.createNode({
            data: { pageId: page.id!, parentId: heroFrame.id, type: ENodeType.TEXT, order: 0, props: { text: 'Trang mẫu (demo)' } as any, style: { typography: { size: 40, weight: 700, color: { type: 'solid', value: '#ffffff' } } } as any },
        });
        await NodeService.createNode({
            data: { pageId: page.id!, parentId: heroFrame.id, type: ENodeType.TEXT, order: 1, props: { text: 'Mô tả ngắn cho trang mẫu này.' } as any, style: { typography: { size: 16, color: { type: 'solid', value: '#d1d5db' } } } as any },
        });
        await NodeService.createNode({
            data: { pageId: page.id!, parentId: heroFrame.id, type: ENodeType.BUTTON, order: 2, props: { label: 'Liên hệ', href: '#contact' } as any },
        });

        const textImageFrame = await NodeService.createNode({
            data: { pageId: page.id!, parentId: page.rootNodeId, type: ENodeType.FRAME, order: 1, layoutMode: ELayoutMode.FLOW, layout: { direction: 'row', gap: 24, align: 'center' } as any },
        });
        await NodeService.createNode({
            data: { pageId: page.id!, parentId: textImageFrame.id, type: ENodeType.IMAGE, order: 0, props: { src: '', alt: 'Ảnh minh hoạ' } as any },
        });
        await NodeService.createNode({
            data: { pageId: page.id!, parentId: textImageFrame.id, type: ENodeType.TEXT, order: 1, props: { text: 'Nội dung kèm ảnh minh hoạ.' } as any },
        });

        const ctaFrame = await NodeService.createNode({
            data: { pageId: page.id!, parentId: page.rootNodeId, type: ENodeType.FRAME, order: 2, layoutMode: ELayoutMode.FLOW, layout: { direction: 'column', gap: 16, align: 'center' } as any },
        });
        await NodeService.createNode({
            data: { pageId: page.id!, parentId: ctaFrame.id, type: ENodeType.TEXT, order: 0, props: { text: 'Sẵn sàng bắt đầu?' } as any },
        });
        await NodeService.createNode({
            data: { pageId: page.id!, parentId: ctaFrame.id, type: ENodeType.BUTTON, order: 1, props: { label: 'Liên hệ ngay', href: '#contact' } as any },
        });

        toast().success(t('cms.pages.seedSuccess'));
        triggerRefresh();
        navigateToPage({ route: 'adminDashboard.cmsNodeBuilder', context: { searchParams: { pageId: page.id } } });
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
                                    {/* Node Builder (Phase 1 của node-tree visual builder mới) — sole editor
                                        entry point kể từ M3b (Page Builder + Advanced/Sections đã bị xoá). */}
                                    <Datatable.CellButton
                                        sm
                                        icon={<Icon name="heroicons-outline:cube-transparent" tooltip={t('cms.pages.nodeBuilderButton')} />}
                                        onClick={() => navigateToPage({ route: 'adminDashboard.cmsNodeBuilder', context: { searchParams: { pageId: item.id } } })}
                                    />
                                    <Datatable.CellButton
                                        sm
                                        visible={!item.path?.includes(':')}
                                        icon={<Icon name="heroicons-outline:eye" tooltip={t('cms.pages.previewButton')} />}
                                        onClick={() => navigateToPage({ route: 'adminDashboard.cmsPreview', context: { searchParams: { path: item.path! } } })}
                                    />
                                    <Datatable.CellButton
                                        sm
                                        visible={item.status === EPageStatus.PUBLISHED && !item.path?.includes(':')}
                                        icon={<Icon name="heroicons-outline:arrow-top-right-on-square" tooltip={t('cms.pages.viewLiveButton')} />}
                                        onClick={() => window.open(item.path!, '_blank')}
                                    />
                                    {/* Admin UI Polish, Task 2 — Publish/Unpublish are mutually exclusive
                                        (never both true, never both false), so both slots always render:
                                        one is the real button, the other is the invisible placeholder for
                                        that row's state. Deliberately NOT merged into one "toggle" button —
                                        that would change behavior/UX beyond this task's scope (a pure
                                        alignment fix, not a redesign). */}
                                    <Datatable.CellButton
                                        sm
                                        solid
                                        visible={item.status !== EPageStatus.PUBLISHED}
                                        icon={<Icon name="heroicons-outline:cloud-arrow-up" tooltip={t('cms.pages.publishButton')} />}
                                        onClick={() => handlePublish(item)}
                                    />
                                    <Datatable.CellButton
                                        sm
                                        visible={item.status === EPageStatus.PUBLISHED}
                                        icon={<Icon name="heroicons-outline:eye-slash" tooltip={t('cms.pages.unpublishButton')} />}
                                        onClick={() => handleUnpublish(item)}
                                    />
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
                        onClose={() => clearKitSelection()}
                        onCreated={() => clearKitSelection()}
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
                                navigateToPage({ route: 'adminDashboard.cmsNodeBuilder', context: { searchParams: { pageId: created.id } } });
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
                                        <div class="col-span-4">
                                            <Datatable.Field name="headerPresetId" label={t('cms.pages.fields.headerPreset')} description={t('cms.pages.fields.headerPresetHint')}>
                                                <Select options={headerPresetOptions()} clearable />
                                            </Datatable.Field>
                                        </div>
                                        <div class="col-span-4">
                                            <Datatable.Field name="footerPresetId" label={t('cms.pages.fields.footerPreset')} description={t('cms.pages.fields.footerPresetHint')}>
                                                <Select options={footerPresetOptions()} clearable />
                                            </Datatable.Field>
                                        </div>
                                        <div class="col-span-4">
                                            <Datatable.Field name="themeId" label={t('cms.pages.fields.theme')} description={t('cms.pages.fields.themeHint')}>
                                                <Select options={themeOptions()} clearable />
                                            </Datatable.Field>
                                        </div>
                                    </div>

                                    {/* SEO đã chuyển vào Trình xây trang (Page Builder) -> nút Cài đặt trang
                                        (⚙), nơi có đủ ngữ cảnh Content Type gắn ở block Chi tiết để cấu hình
                                        mapping field -> SEO (mục δ design 2026-08-09-block-driven-content-
                                        binding-design.md). Form CRUD danh sách trang này chỉ còn phần Nội dung. */}

                                    {/* "Bắt đầu từ bộ kit" (Phase 6, spec §3.6) — CHỈ ở chế độ Tạo
                                        mới (`item` rỗng): chọn bố cục khởi đầu cho 1 trang ĐÃ tồn
                                        tại là vô nghĩa, cùng lý do AddTranslationButton chỉ hiện ở
                                        chế độ Sửa. Bỏ trống ô kit = luồng createPage y hệt hôm nay. */}
                                    <Show when={!item}>
                                        <KitStarterFields />
                                    </Show>

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
        </div>
    );
}
