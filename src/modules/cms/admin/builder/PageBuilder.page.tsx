import { createResource, createSignal, Show } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { debounce } from '@solid-primitives/scheduled';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Button } from '@core/components/button/Button';
import { Icon } from '@shared/components/icons/Icon';
import { toast } from '@core/components/toast/ToastProvider';
import { t } from '@/shared/i18n/t';
import { useRoutes } from '@/shared/contexts/routes/RoutesContext';
import { PageService } from '@/shared/services/page/page.service';
import { SectionService } from '@/shared/services/section/section.service';
import { ContentTypeService } from '@/shared/services/contentType/contentType.service';
import { resolveSectionDataSource } from '@/modules/cms/api/resolveCmsPageProps';
import { SectionRenderer } from '@/modules/cms/SectionRenderer';
import { BlockList } from './BlockList';
import { BlockPalette } from './BlockPalette';
import { Inspector } from './Inspector';
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

function replaySectionAnimation(sectionId: string) {
    const el = document.querySelector(`[data-section-id="${sectionId}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
        ScrollTrigger.getAll().forEach((st) => {
            if (st.trigger instanceof Node && el.contains(st.trigger)) {
                st.animation?.restart(true);
            }
        });
    }, 400);
}

export function PageBuilderPage() {
    const { searchParams, navigate, navigateToPage } = useRoutes();
    const pageId = () => searchParams.pageId as string;

    const [page] = createResource(pageId, (id) => PageService.getOnePage({ id }));
    const [contentTypes] = createResource(() => ContentTypeService.getAllContentType({ input: { limit: 200 } }));
    const contentTypeOptions = () => ((contentTypes()?.edges || []) as PagedEdge<ContentTypeDTO>[])
        .filter((e) => !!e.node)
        .map((e) => ({ value: e.node!.id!, label: e.node!.label! }));

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
                <Show when={page()?.path}>
                    <Button
                        sm
                        outline
                        onClick={() => navigateToPage({ route: 'adminDashboard.cmsPreview', context: { searchParams: { path: page()!.path! } } })}
                    >
                        <Icon name="heroicons-outline:eye" /> {t('cms.pages.previewButton')}
                    </Button>
                </Show>
            </div>

            <div class="flex flex-1 min-h-0">
                <aside class="hidden w-64 shrink-0 border-r border-neutral-200 bg-white p-3 md:block">
                    <BlockList
                        sections={sections}
                        selectedId={selectedId()}
                        onSelect={setSelectedId}
                        onReorder={handleReorder}
                        onAddBlock={() => setPaletteOpen(true)}
                        onDelete={handleDelete}
                    />
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

                <aside class="hidden w-80 shrink-0 border-l border-neutral-200 bg-white p-4 lg:block">
                    <Inspector
                        section={selected()}
                        contentTypeOptions={contentTypeOptions()}
                        detailFields={detailFields()}
                        onChangeContent={(data) => updateSelected((s) => Object.assign(s, data))}
                        onChangeStyle={(style: SectionStyle) => updateSelected((s) => { s.style = style; })}
                        onChangeAnimation={(animation: AnimationLayer[]) => updateSelected((s) => { s.animation = animation; })}
                        onPreviewAnimation={() => selectedId() && replaySectionAnimation(selectedId()!)}
                    />
                </aside>
            </div>

            <BlockPalette open={paletteOpen()} onClose={() => setPaletteOpen(false)} onPick={handleAddBlock} />
        </div>
    );
}
