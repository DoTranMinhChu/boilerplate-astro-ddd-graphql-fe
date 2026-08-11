import { createSignal, For, Show } from 'solid-js';
import { t, tOrLiteral } from '@/shared/i18n/t';
import { ContentTab } from './ContentTab';
import { StyleTab } from './StyleTab';
import { AnimationTab } from './AnimationTab';
import { RawEditTab } from './RawEditTab';
import { SECTION_TYPE_META } from '@/modules/cms/sectionRegistry';
import { ESectionType } from '@/modules/cms/cms.constants';
import type { DetailFieldLayoutEntry } from '@/modules/cms/sections/ContentDetailSection';
import type { AnimationLayer, CustomBlockElement, FieldDefinitionDTO, SectionDTO, SectionStyle } from '@/modules/cms/cms.types';
import type { ContentTypeDTO } from '@/shared/services/contentType/contentType.service';

type TabKey = 'content' | 'style' | 'animation' | 'raw';
const ALL_TABS: TabKey[] = ['content', 'style', 'animation', 'raw'];
// The "editorial" section family carries a fixed, self-contained visual identity
// (see sections/editorialEffects.css) — they don't consume `section.style` at all,
// so the Style tab would silently do nothing there. Hide it to avoid a confusing
// dead control.
const EDITORIAL_SECTION_TYPES = new Set<string>([
    ESectionType.MEDIA_HERO,
    ESectionType.INTRO_RAIL,
    ESectionType.PROJECT_SHOWCASE,
    ESectionType.SPOTLIGHT_LIST,
    ESectionType.LOGO_GRID,
    ESectionType.STAT_METRICS,
    ESectionType.TIMELINE_LIST,
    ESectionType.ACCORDION_LIST,
    ESectionType.PROCESS_STEPS,
    ESectionType.CONTACT_COLUMNS,
    ESectionType.INQUIRY_FORM,
    ESectionType.FEATURED_ENTRY,
]);

export interface InspectorProps {
    section?: SectionDTO;
    contentTypeOptions: { value: string; label: string }[];
    /** Full ContentType list (with `.fields`) — needed by MIXED_FEED's per-source
     * field-mapping selects, which must show that source's OWN field keys, not the
     * current page's. */
    contentTypesFull?: ContentTypeDTO[];
    /** Only populated when the page has a configured CONTENT_DETAIL block — see PageBuilder. */
    detailFields?: FieldDefinitionDTO[];
    /** FORM block's Select options (Phase 4 mục 1, Task 5) — all Forms created on the Forms
     * admin screen (Task 4), so the block can bind `dataSource.formId` to one of them. */
    formOptions?: { value: string; label: string }[];
    onChangeContent: (data: Partial<SectionDTO>) => void;
    onChangeStyle: (style: SectionStyle) => void;
    onChangeAnimation: (animation: AnimationLayer[]) => void;
    onPreviewAnimation: (mode: 'start' | 'end' | 'replay') => void;
}

export function Inspector(props: InspectorProps) {
    const [tab, setTab] = createSignal<TabKey>('content');
    // `content-detail` targets are dynamic — every visible field is animatable,
    // not a fixed ['heading','image','body'] list — so once the admin has actually
    // saved a field layout, derive targets from it instead of the static registry.
    // `custom-block` targets are ALSO dynamic — 1 target per element the admin has
    // added (its id), since the whole point of this block is a free-form list.
    const targets = () => {
        const section = props.section;
        if (section?.type === ESectionType.CONTENT_DETAIL) {
            const layout = (section.content as { fieldLayout?: DetailFieldLayoutEntry[] } | undefined)?.fieldLayout;
            if (layout?.length) {
                const visible = layout.filter((e) => e.visible);
                return [
                    ...visible.filter((e) => e.slot === 'hero').map(() => 'image'),
                    ...visible.filter((e) => e.slot === 'title').map(() => 'heading'),
                    ...visible.filter((e) => e.slot === 'body').map((e) => e.key),
                ];
            }
        }
        if (section?.type === ESectionType.CUSTOM_BLOCK) {
            const elements = (section.content as { elements?: CustomBlockElement[] } | undefined)?.elements;
            return (elements || []).filter((e) => e.type !== 'spacer' && e.type !== 'divider').map((e) => e.id);
        }
        return SECTION_TYPE_META[section?.type ?? '']?.targets ?? [];
    };
    const tabs = () => (EDITORIAL_SECTION_TYPES.has(props.section?.type ?? '') ? ALL_TABS.filter((k) => k !== 'style') : ALL_TABS);
    const activeTab = () => (tabs().includes(tab()) ? tab() : 'content');

    return (
        <Show when={props.section} fallback={<p class="p-6 text-center text-sm text-neutral-400">{t('cms.builder.noSelection')}</p>}>
            {(section) => (
                <div class="flex h-full flex-col">
                    <div class="mb-4 flex gap-1 rounded-lg bg-neutral-100 p-1">
                        <For each={tabs()}>
                            {(key) => (
                                <button
                                    type="button"
                                    onClick={() => setTab(key)}
                                    class={`flex-1 rounded-md py-1.5 text-sm font-medium transition ${
                                        activeTab() === key ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'
                                    }`}
                                >
                                    {tOrLiteral(`cms.builder.tabs.${key}`)}
                                </button>
                            )}
                        </For>
                    </div>

                    <div class="flex-1 overflow-y-auto scrollbar-custom pr-3">
                        <Show when={activeTab() === 'content'}>
                            <ContentTab section={section()} contentTypeOptions={props.contentTypeOptions} contentTypesFull={props.contentTypesFull} formOptions={props.formOptions} detailFields={props.detailFields} onChange={props.onChangeContent} />
                        </Show>
                        <Show when={activeTab() === 'style'}>
                            <StyleTab style={section().style} onChange={props.onChangeStyle} />
                        </Show>
                        <Show when={activeTab() === 'animation'}>
                            <AnimationTab targets={targets()} animation={section().animation} onChange={props.onChangeAnimation} onPreview={props.onPreviewAnimation} />
                        </Show>
                        <Show when={activeTab() === 'raw'}>
                            <RawEditTab section={section()} onChange={props.onChangeContent} />
                        </Show>
                    </div>
                </div>
            )}
        </Show>
    );
}
