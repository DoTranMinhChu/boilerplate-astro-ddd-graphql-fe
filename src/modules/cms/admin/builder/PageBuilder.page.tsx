import { createResource, createSignal, Show } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { debounce } from '@solid-primitives/scheduled';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Button } from '@core/components/button/Button';
import { Icon } from '@shared/components/icons/Icon';
import { Slideout } from '@core/components/dialog/Slideout';
import { toast } from '@core/components/toast/ToastProvider';
import { t, tOrLiteral } from '@/shared/i18n/t';
import { useRoutes } from '@/shared/contexts/routes/RoutesContext';
import { PageService } from '@/shared/services/page/page.service';
import { SectionService } from '@/shared/services/section/section.service';
import { ContentTypeService } from '@/shared/services/contentType/contentType.service';
import { resolveSectionDataSource } from '@/modules/cms/api/resolveCmsPageProps';
import { SectionRenderer } from '@/modules/cms/SectionRenderer';
import { SECTION_TYPE_META } from '@/modules/cms/sectionRegistry';
import { BlockList } from './BlockList';
import { BlockPalette } from './BlockPalette';
import { Inspector } from './Inspector';
import { PageSettingsPanel, type PageStyle } from './PageSettingsPanel';
import { EPageType } from '@shared/generated/typed-graphql';
import type { AnimationLayer, ContentEntryDTO, FieldDefinitionDTO, ResolvedSection, SectionDTO, SectionStyle } from '@/modules/cms/cms.types';
import type { Edge as PagedEdge } from '@core/api/types';
import type { ContentTypeDTO } from '@/shared/services/contentType/contentType.service';

/** Placeholder value shown for a field with no admin-set `mockValue` — the Page
 * Builder canvas for a COLLECTION_DETAIL page has no real entry bound while
 * editing structure/animation, so every field needs *something* to render. */
function fallbackMockValue(field: FieldDefinitionDTO): unknown {
    switch (field.type) {
        case 'IMAGE': return 'https://picsum.photos/seed/mock-preview/1200/800';
        case 'GALLERY': return ['https://picsum.photos/seed/mock-1/600/600', 'https://picsum.photos/seed/mock-2/600/600'];
        case 'DATE': return new Date().toISOString().slice(0, 10);
        case 'BOOLEAN': return true;
        case 'NUMBER': return 0;
        default: return `[Xem trước] ${field.label ?? field.key}`;
    }
}

function buildMockPageEntry(fields: FieldDefinitionDTO[]): ContentEntryDTO {
    const data: Record<string, unknown> = {};
    for (const field of fields) {
        if (!field.key) continue;
        data[field.key] = field.mockValue || fallbackMockValue(field);
    }
    return { data } as ContentEntryDTO;
}

/** Fields the Inspector can write — excludes id/pageId/order/timestamps, which the
 * Builder itself manages (order via drag, everything else is server-generated). */
type SavableFields = Pick<SectionDTO, 'content' | 'style' | 'animation' | 'dataSource' | 'fieldMapping' | 'visibilityRules' | 'responsiveSettings' | 'layoutPreset' | 'theme' | 'enabled'>;

function toSavable(section: SectionDTO): SavableFields {
    const { content, style, animation, dataSource, fieldMapping, visibilityRules, responsiveSettings, layoutPreset, theme, enabled } = section;
    return { content, style, animation, dataSource, fieldMapping, visibilityRules, responsiveSettings, layoutPreset, theme, enabled };
}

/** `replay` chạy lại hiệu ứng từ đầu (giống hệt cuộn trang thật lần đầu); `start`/`end`
 * nhảy thẳng timeline GSAP tới khung đầu/cuối (không phát), để admin so sánh trước/sau
 * ngay lập tức thay vì phải đợi phát xong mới biết kết quả cuối trông thế nào. */
function setSectionAnimationState(sectionId: string, mode: 'start' | 'end' | 'replay') {
    const el = document.querySelector(`[data-section-id="${sectionId}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
        ScrollTrigger.getAll().forEach((st) => {
            if (!(st.trigger instanceof Node) || !el.contains(st.trigger)) return;
            if (mode === 'replay') st.animation?.restart(true);
            else st.animation?.progress(mode === 'end' ? 1 : 0).pause();
        });
    }, 400);
}

export function PageBuilderPage() {
    const { searchParams, navigate, navigateToPage } = useRoutes();
    const pageId = () => searchParams.pageId as string;

    const [page, { mutate: mutatePage }] = createResource(pageId, (id) => PageService.getOnePage({ id }));
    const [contentTypes] = createResource(() => ContentTypeService.getAllContentType({ input: { limit: 200 } }));
    const contentTypesFull = () => ((contentTypes()?.edges || []) as PagedEdge<ContentTypeDTO>[])
        .map((e) => e.node)
        .filter((n): n is ContentTypeDTO => !!n);
    const contentTypeOptions = () => contentTypesFull().map((n) => ({ value: n.id!, label: n.label! }));

    // COLLECTION_DETAIL pages render `content-detail` from a real ContentEntry that
    // doesn't exist while just editing structure/animation — fetch the bound Object
    // Type's fields so the canvas can preview with mock data (see FieldDefinition's
    // `mockValue`) and the Inspector can offer the field-layout editor.
    const isDetailPage = () => page()?.pageType === EPageType.COLLECTION_DETAIL;
    const [detailContentType] = createResource(
        () => (isDetailPage() ? page()?.contentTypeId : undefined),
        (id) => ContentTypeService.getOneContentType({ id }),
    );
    const detailFields = () => (detailContentType()?.fields || []).filter((f): f is FieldDefinitionDTO => !!f);
    const mockPageEntry = () => (detailFields().length ? buildMockPageEntry(detailFields()) : undefined);

    const [sections, setSections] = createStore<ResolvedSection[]>([]);
    const [loading, setLoading] = createSignal(true);
    const [selectedId, setSelectedId] = createSignal<string>();
    const [paletteOpen, setPaletteOpen] = createSignal(false);
    const [pageSettingsOpen, setPageSettingsOpen] = createSignal(false);

    // Nền/font riêng cho TOÀN trang (Page.style) — khác Style tab của từng Section.
    // Cùng cơ chế debounce-auto-save như mọi field khác trong Page Builder, không có
    // nút Lưu riêng để nhất quán với phần còn lại của trình chỉnh sửa.
    const persistPageStyle = debounce((style: Record<string, string>) => {
        // `style` sinh ra kiểu string do hạn chế codegen với scalar Mixed (xem cms.types.ts)
        // — giá trị thật lúc runtime vẫn nhận object bình thường, đây là điểm cast duy nhất.
        PageService.updatePage({ id: pageId(), data: { style: style as unknown as string } }).catch(() => toast().danger(t('cms.toasts.saveFailed')));
    }, 500);
    const handleChangePageStyle = (patch: Partial<PageStyle>) => {
        const current = page();
        if (!current) return;
        const nextStyle: Record<string, string> = { ...(current.style || {}) };
        for (const [key, value] of Object.entries(patch)) {
            if (value) nextStyle[key] = value;
            else delete nextStyle[key];
        }
        mutatePage({ ...current, style: nextStyle });
        persistPageStyle(nextStyle);
    };

    // Sidebar khối kéo-giãn được (256–560px) — trước đây cố định 256px, tên khối dài
    // (vd "Trưng bày nội dung", "Lưới logo/đối tác") bị cắt chữ không đọc được hết.
    const SIDEBAR_MIN = 220;
    const SIDEBAR_MAX = 560;
    const [sidebarWidth, setSidebarWidth] = createSignal(280);
    const startSidebarResize = (downEvent: MouseEvent) => {
        downEvent.preventDefault();
        const onMove = (e: MouseEvent) => setSidebarWidth(Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, e.clientX)));
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    createResource(pageId, async (id) => {
        setLoading(true);
        const raw = await SectionService.getSectionsByPage({ pageId: id });
        // Mixed-scalar codegen quirk (see cms.types.ts) — same single cast point resolveCmsPageProps.ts uses.
        const resolved = await Promise.all(raw.map((s) => resolveSectionDataSource(s as unknown as SectionDTO)));
        setSections(resolved);
        setLoading(false);
        return true;
    });

    const selected = () => sections.find((s) => s.id === selectedId());

    const persist = debounce((section: SectionDTO) => {
        SectionService.updateSection({ id: section.id!, data: toSavable(section) as any })
            .catch(() => toast().danger(t('cms.toasts.saveFailed')));
    }, 600);

    const updateSelected = (patch: (s: ResolvedSection) => void) => {
        const id = selectedId();
        if (!id) return;
        const idx = sections.findIndex((s) => s.id === id);
        if (idx === -1) return;
        setSections(produce((list) => patch(list[idx])));
        persist(sections[idx]);
    };

    const handleReorder = async (orderedIds: string[]) => {
        const items = orderedIds.map((id, order) => ({ id, order }));
        setSections((list) => orderedIds.map((id) => list.find((s) => s.id === id)!).map((s, order) => ({ ...s, order })));
        try {
            await SectionService.reorderSections({ items });
        } catch {
            toast().danger(t('cms.toasts.saveFailed'));
        }
    };

    const handleAddBlock = async (type: string) => {
        setPaletteOpen(false);
        try {
            const created = await SectionService.createSection({ data: { pageId: pageId(), type, order: sections.length } });
            setSections((list) => [...list, created as ResolvedSection]);
            setSelectedId(created.id!);
        } catch {
            toast().danger(t('cms.toasts.saveFailed'));
        }
    };

    const handleDelete = async (id: string) => {
        const prev = sections;
        setSections((list) => list.filter((s) => s.id !== id));
        if (selectedId() === id) setSelectedId(undefined);
        try {
            await SectionService.deleteSection({ id });
        } catch {
            setSections(prev);
            toast().danger(t('cms.toasts.saveFailed'));
        }
    };

    const handleToggleEnabled = async (id: string) => {
        const idx = sections.findIndex((s) => s.id === id);
        if (idx === -1) return;
        const next = sections[idx].enabled === false;
        setSections(idx, 'enabled', next);
        try {
            await SectionService.updateSection({ id, data: { enabled: next } as any });
        } catch {
            setSections(idx, 'enabled', !next);
            toast().danger(t('cms.toasts.saveFailed'));
        }
    };

    const handleDuplicate = async (id: string) => {
        try {
            const created = await SectionService.duplicateSection({ id });
            const resolved = await resolveSectionDataSource(created as unknown as SectionDTO);
            setSections((list) => [...list, resolved]);
            toast().success(t('cms.sections.duplicateSuccess'));
        } catch {
            toast().danger(t('cms.toasts.saveFailed'));
        }
    };

    return (
        <div class="flex h-[calc(100vh-4rem)] flex-col -m-4 md:-m-6">
            <div class="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-2.5">
                <div class="flex items-center gap-2 min-w-0">
                    <Button sm outline onClick={() => navigate(-1)}>
                        <Icon name="heroicons-solid:arrow-left" />
                    </Button>
                    <p class="truncate text-sm font-semibold text-neutral-800">{page()?.internalName}</p>
                    <code class="hidden shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-400 sm:inline">{page()?.path}</code>
                </div>
                <div class="flex shrink-0 items-center gap-2">
                    <Button sm outline onClick={() => setPageSettingsOpen(true)}>
                        <Icon name="heroicons-outline:swatch" /> {t('cms.builder.pageSettingsButton')}
                    </Button>
                    <Show when={page()?.path}>
                        <Button
                            sm
                            solid
                            main
                            onClick={() => navigateToPage({ route: 'adminDashboard.cmsPreview', context: { searchParams: { path: page()!.path! } } })}
                        >
                            <Icon name="heroicons-outline:eye" /> {t('cms.pages.previewButton')}
                        </Button>
                    </Show>
                </div>
            </div>

            <div class="flex flex-1 min-h-0">
                <aside
                    class="relative hidden shrink-0 border-r border-neutral-200 bg-white p-3 md:block"
                    style={{ width: `${sidebarWidth()}px` }}
                >
                    <BlockList
                        sections={sections}
                        selectedId={selectedId()}
                        onSelect={setSelectedId}
                        onReorder={handleReorder}
                        onAddBlock={() => setPaletteOpen(true)}
                        onDelete={handleDelete}
                        onToggleEnabled={handleToggleEnabled}
                        onDuplicate={handleDuplicate}
                    />
                    {/* Kéo cạnh phải để giãn/thu sidebar — vùng bấm rộng hơn viền hiển thị 1px
                        cho dễ bắt chuột, sáng màu primary khi hover để báo hiệu kéo được. */}
                    <div
                        class="absolute right-0 top-0 -mr-1 h-full w-2 cursor-col-resize"
                        onMouseDown={startSidebarResize}
                    >
                        <div class="mx-auto h-full w-px bg-transparent hover:bg-primary-300" />
                    </div>
                </aside>

                <main class="flex-1 overflow-auto bg-neutral-100">
                    <Show when={!loading()} fallback={<div class="flex h-full items-center justify-center text-neutral-400"><Icon spinner /></div>}>
                        <Show
                            when={sections.length > 0}
                            fallback={
                                <div class="flex h-full flex-col items-center justify-center gap-3 text-center text-neutral-400">
                                    <p>{t('cms.pages.emptyPageNoSections')}</p>
                                    <Button onClick={() => setPaletteOpen(true)}>{t('cms.builder.addBlockButton')}</Button>
                                </div>
                            }
                        >
                            {/* No max-width/bg here — sections manage their own width (some go up to
                                1720px) and background (editorial sections are dark, generic ones are
                                white). Capping this wrapper narrower than a section's own breakpoints
                                used to force premature text-wrapping the real page never shows. */}
                            <div class="min-w-[1024px]">
                                <SectionRenderer
                                    sections={sections}
                                    pageEntry={mockPageEntry()}
                                    contentTypeFields={detailFields()}
                                    selectedSectionId={selectedId()}
                                    onSelectSection={setSelectedId}
                                />
                            </div>
                        </Show>
                    </Show>
                </main>

            </div>

            {/* Wide drawer instead of a fixed sidebar — the Inspector's multi-column
                layouts (e.g. Intro Rail's 3 USP columns) need real room; a ~320px
                permanent sidebar squeezed every field's dropdowns/textareas down to a
                couple characters wide. The drawer overlays the canvas instead of
                permanently stealing its width, and closes back to a full-width canvas. */}
            <Slideout
                id="page-builder-inspector"
                isOpen={!!selected()}
                onClose={() => setSelectedId(undefined)}
                class="w-full max-w-[900px]"
            >
                <Slideout.Header
                    title={selected() ? tOrLiteral(SECTION_TYPE_META[selected()!.type ?? '']?.labelKey ?? selected()!.type ?? '') : ''}
                    hasClose
                />
                <Slideout.Body class="p-5">
                    <Inspector
                        section={selected()}
                        contentTypeOptions={contentTypeOptions()}
                        contentTypesFull={contentTypesFull()}
                        detailFields={detailFields()}
                        onChangeContent={(data) => updateSelected((s) => Object.assign(s, data))}
                        onChangeStyle={(style: SectionStyle) => updateSelected((s) => { s.style = style; })}
                        onChangeAnimation={(animation: AnimationLayer[]) => updateSelected((s) => { s.animation = animation; })}
                        onPreviewAnimation={(mode) => selectedId() && setSectionAnimationState(selectedId()!, mode)}
                    />
                </Slideout.Body>
            </Slideout>

            <BlockPalette open={paletteOpen()} onClose={() => setPaletteOpen(false)} onPick={handleAddBlock} />

            <Slideout
                id="page-builder-settings"
                isOpen={pageSettingsOpen()}
                onClose={() => setPageSettingsOpen(false)}
                class="w-full max-w-[420px]"
            >
                <Slideout.Header title={t('cms.builder.pageSettings.title')} hasClose />
                <Slideout.Body class="p-5">
                    <PageSettingsPanel style={page()?.style} onChange={handleChangePageStyle} />
                </Slideout.Body>
            </Slideout>
        </div>
    );
}
