import { createResource, Show } from 'solid-js';
import { Card } from '@core/components/utilities/Card';
import { generateDatatable, PagingArgsInput } from '@core/components/table/GeneratedDatatable';
import { Input } from '@core/components/control/Input';
import { Select } from '@core/components/control/Select';
import { Textarea } from '@core/components/control/Textarea';
import { PageDTO, PageService } from '@/shared/services/page/page.service';
import { SectionService } from '@/shared/services/section/section.service';
import { ContentTypeDTO, ContentTypeService } from '@/shared/services/contentType/contentType.service';
import { EPageType, EPageStatus } from '@shared/generated/typed-graphql';
import { ESectionType, EAnimationPreset, EAnimationSpeed, ESectionTheme, EImagePosition } from '@/modules/cms/cms.constants';
import type { Edge } from '@core/api/types';
import { useRoutes } from '@/shared/contexts/routes/RoutesContext';
import { toast } from '@core/components/toast/ToastProvider';
import { t, tOrLiteral } from '@/shared/i18n/t';

const PAGE_TYPE_OPTIONS = () => [
    { value: EPageType.STATIC_MODULAR, label: t('cms.pages.pageTypeOptions.staticModular') },
    { value: EPageType.COLLECTION_LISTING, label: t('cms.pages.pageTypeOptions.collectionListing') },
    { value: EPageType.COLLECTION_DETAIL, label: t('cms.pages.pageTypeOptions.collectionDetail') },
    { value: EPageType.SPECIAL, label: t('cms.pages.pageTypeOptions.special') },
];

const STATUS_LABEL_KEY: Record<string, 'draft' | 'scheduled' | 'published' | 'unpublished' | 'archived'> = {
    DRAFT: 'draft',
    SCHEDULED: 'scheduled',
    PUBLISHED: 'published',
    UNPUBLISHED: 'unpublished',
    ARCHIVED: 'archived',
};

const { Datatable, triggerRefresh } = generateDatatable<PagingArgsInput, PageDTO, PageDTO, PageDTO, any, any>({
    service: PageService,
    paginatedQuery: (input) => PageService.getAllPage(input),
    itemQuery: (item) => PageService.getOnePage({ id: item.id! }),
    createMutation: (data) => PageService.createPage({ data }),
    updateMutation: (id, data) => PageService.updatePage({ id, data }),
    deleteMutation: (item) => PageService.deletePage({ id: item.id! }),
});

export function ManageCmsPagesPage() {
    const { navigateToPage } = useRoutes();
    const [contentTypes] = createResource(() => ContentTypeService.getAllContentType({ input: { limit: 200 } }));
    const contentTypeOptions = () => ((contentTypes()?.edges || []) as Edge<ContentTypeDTO>[])
        .filter((e) => !!e.node)
        .map((e) => ({ value: e.node!.id!, label: e.node!.label! }));

    const handlePublish = async (item: PageDTO) => {
        await PageService.publishPage({ id: item.id! });
        toast().success(t('cms.pages.publishSuccess'));
        triggerRefresh();
    };
    const handleUnpublish = async (item: PageDTO) => {
        await PageService.unpublishPage({ id: item.id! });
        toast().info(t('cms.pages.unpublishSuccess'));
        triggerRefresh();
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
                                    <Show when={item.pageType !== EPageType.COLLECTION_DETAIL}>
                                        <Datatable.CellButton
                                            sm
                                            solid
                                            onClick={() => navigateToPage({ route: 'adminDashboard.cmsBuilder', context: { searchParams: { pageId: item.id } } })}
                                        >
                                            {t('cms.pages.editButton')}
                                        </Datatable.CellButton>
                                    </Show>
                                    <Datatable.CellButton sm onClick={() => navigateToPage({ route: 'adminDashboard.cmsSections', context: { searchParams: { pageId: item.id, pageName: item.internalName } } })}>
                                        {t('cms.pages.advancedButton')}
                                    </Datatable.CellButton>
                                    <Show when={item.pageType !== EPageType.COLLECTION_DETAIL}>
                                        <Datatable.CellButton
                                            sm
                                            onClick={() => navigateToPage({ route: 'adminDashboard.cmsPreview', context: { searchParams: { path: item.path! } } })}
                                        >
                                            {t('cms.pages.previewButton')}
                                        </Datatable.CellButton>
                                    </Show>
                                    <Show when={item.status === EPageStatus.PUBLISHED && item.pageType !== EPageType.COLLECTION_DETAIL}>
                                        <Datatable.CellButton sm onClick={() => window.open(item.path!, '_blank')}>{t('cms.pages.viewLiveButton')}</Datatable.CellButton>
                                    </Show>
                                    <Show when={item.status !== EPageStatus.PUBLISHED}>
                                        <Datatable.CellButton sm solid onClick={() => handlePublish(item)}>{t('cms.pages.publishButton')}</Datatable.CellButton>
                                    </Show>
                                    <Show when={item.status === EPageStatus.PUBLISHED}>
                                        <Datatable.CellButton sm onClick={() => handleUnpublish(item)}>{t('cms.pages.unpublishButton')}</Datatable.CellButton>
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
                        {() => (
                            <div class="col-span-full grid grid-cols-12 gap-x-6 gap-y-6 p-8">
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
                                <div class="col-span-12">
                                    <Datatable.Field name="seo.title" label={t('cms.pages.fields.seoTitle')}>
                                        <Input placeholder={t('cms.pages.fields.seoTitlePlaceholder')} />
                                    </Datatable.Field>
                                </div>
                                <div class="col-span-12">
                                    <Datatable.Field name="seo.description" label={t('cms.pages.fields.seoDescription')}>
                                        <Textarea rows={2} />
                                    </Datatable.Field>
                                </div>
                            </div>
                        )}
                    </Datatable.Formlog>
                </Datatable>
            </Card>
        </div>
    );
}
