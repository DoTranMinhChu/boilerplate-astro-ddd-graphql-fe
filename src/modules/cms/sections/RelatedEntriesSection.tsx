import { For, Show } from 'solid-js';
import { animate } from '@/modules/cms/animation/useAnimate';
import { getLayer, spacingClass, sectionCssVars, resolveTheme, themeBackgroundClass } from './sectionHelpers';
import type { ResolvedSection } from '@/modules/cms/cms.types';

const _ = animate;

export interface RelatedEntriesContent {
    heading?: string;
}

const GRID_COLS: Record<string, string> = {
    'grid-2': 'md:grid-cols-2',
    'grid-3': 'md:grid-cols-3',
    'grid-4': 'md:grid-cols-4',
};

/**
 * "Nội dung liên quan" — CHỈ dùng trên trang Chi tiết (COLLECTION_DETAIL). `entries`
 * đã được resolveCmsPageProps() query sẵn theo `dataSource.matchField` (vd cùng Loại
 * tin tức với bài đang xem), loại bỏ bản ghi hiện tại, độn thêm bài mới nếu chưa đủ số
 * lượng — xem ContentEntryService.findRelated() phía backend. Field hiển thị dùng
 * `fieldMapping` giống hệt content-grid vì cùng content type với entry đang xem.
 */
export function RelatedEntriesSection(props: { section: ResolvedSection }) {
    const content = () => (props.section.content || {}) as RelatedEntriesContent;
    const mapping = () => props.section.fieldMapping || {};
    const cols = () => GRID_COLS[props.section.layoutPreset || 'grid-3'] || GRID_COLS['grid-3'];
    const theme = () => resolveTheme(props.section);

    const fieldOf = (data: Record<string, unknown>, slot: string) => {
        const key = mapping()[slot];
        return key ? data?.[key] : undefined;
    };
    const hrefFor = (slug: string) => {
        const pattern = props.section.detailPathPattern;
        return pattern ? pattern.replace(':slug', slug) : undefined;
    };

    return (
        <Show when={props.section.entries?.length}>
            <section class={`${spacingClass(props.section.responsiveSettings?.spacing)} px-6 ${themeBackgroundClass(theme())}`} style={sectionCssVars(props.section)}>
                <div class="mx-auto max-w-6xl">
                    <Show when={content().heading}>
                        <h2 use:animate={getLayer(props.section, 'heading')} class="mb-8 text-2xl font-bold tracking-tight">
                            {content().heading}
                        </h2>
                    </Show>

                    <div use:animate={getLayer(props.section, 'grid')} class={`grid grid-cols-1 gap-6 ${cols()}`}>
                        <For each={props.section.entries || []}>
                            {(entry) => {
                                const data = entry.data || {};
                                const heading = fieldOf(data, 'heading');
                                const image = fieldOf(data, 'image');
                                const href = entry.slug ? hrefFor(entry.slug) : undefined;
                                return (
                                    <a href={href} class="group block overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:shadow-lg">
                                        <Show when={image}>
                                            <div class="aspect-[4/3] overflow-hidden bg-neutral-100">
                                                <img src={image as string} alt={String(heading ?? '')} class="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                                            </div>
                                        </Show>
                                        <Show when={heading}>
                                            <p class="p-4 font-semibold text-neutral-900">{heading as string}</p>
                                        </Show>
                                    </a>
                                );
                            }}
                        </For>
                    </div>
                </div>
            </section>
        </Show>
    );
}
