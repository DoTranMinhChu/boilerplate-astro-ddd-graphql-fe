import { createSignal, For, Show } from 'solid-js';
import { t, tOrLiteral } from '@/shared/i18n/t';
import { ContentTab } from './ContentTab';
import { StyleTab } from './StyleTab';
import { AnimationTab } from './AnimationTab';
import { SECTION_TYPE_META } from '@/modules/cms/sectionRegistry';
import { ESectionType } from '@/modules/cms/cms.constants';
import type { AnimationLayer, SectionDTO, SectionStyle } from '@/modules/cms/cms.types';

type TabKey = 'content' | 'style' | 'animation';
const ALL_TABS: TabKey[] = ['content', 'style', 'animation'];
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
    onChangeContent: (data: Partial<SectionDTO>) => void;
    onChangeStyle: (style: SectionStyle) => void;
    onChangeAnimation: (animation: AnimationLayer[]) => void;
    onPreviewAnimation: () => void;
}

export function Inspector(props: InspectorProps) {
    const [tab, setTab] = createSignal<TabKey>('content');
    const targets = () => SECTION_TYPE_META[props.section?.type ?? '']?.targets ?? [];
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

                    <div class="flex-1 overflow-y-auto custom-scrollbar pr-1">
                        <Show when={activeTab() === 'content'}>
                            <ContentTab section={section()} contentTypeOptions={props.contentTypeOptions} onChange={props.onChangeContent} />
                        </Show>
                        <Show when={activeTab() === 'style'}>
                            <StyleTab style={section().style} onChange={props.onChangeStyle} />
                        </Show>
                        <Show when={activeTab() === 'animation'}>
                            <AnimationTab targets={targets()} animation={section().animation} onChange={props.onChangeAnimation} onPreview={props.onPreviewAnimation} />
                        </Show>
                    </div>
                </div>
            )}
        </Show>
    );
}
