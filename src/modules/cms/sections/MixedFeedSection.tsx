import { For, Show } from 'solid-js';
import { animate } from '@/modules/cms/animation/useAnimate';
import { getLayer, spacingClass, sectionCssVars, resolveTheme, themeBackgroundClass } from './sectionHelpers';
import type { ResolvedSection } from '@/modules/cms/cms.types';

const _ = animate;

export interface MixedFeedContent {
    heading?: string;
}

const GRID_COLS: Record<string, string> = {
    'grid-2': 'md:grid-cols-2',
    'grid-3': 'md:grid-cols-3',
    'grid-4': 'md:grid-cols-4',
};

/**
 * "Nội dung tổng hợp" — trộn nhiều Object Type khác nhau (vd Đối tác + Tin tức) vào
 * 1 feed duy nhất, sắp theo ngày tạo. Mỗi entry trong `mixedEntries` giữ RIÊNG
 * fieldMapping/detailPathPattern của content type nó thuộc về (2 loại khác nhau có
 * field key và trang Chi tiết khác nhau) — xem ResolvedMixedEntry trong cms.types.ts.
 */
export function MixedFeedSection(props: { section: ResolvedSection }) {
    const content = () => (props.section.content || {}) as MixedFeedContent;
    const cols = () => GRID_COLS[props.section.layoutPreset || 'grid-3'] || GRID_COLS['grid-3'];
    const theme = () => resolveTheme(props.section);

    const hrefFor = (item: NonNullable<ResolvedSection['mixedEntries']>[number]) => {
        const slug = item.entry.slug;
        return slug && item.detailPathPattern ? item.detailPathPattern.replace(':slug', slug) : undefined;
    };

    return (
        <Show when={props.section.mixedEntries?.length}>
            <section class={`${spacingClass(props.section.responsiveSettings?.spacing)} px-6 ${themeBackgroundClass(theme())}`} style={sectionCssVars(props.section)}>
                <div class="mx-auto max-w-6xl">
                    <Show when={content().heading}>
                        <h2 use:animate={getLayer(props.section, 'heading')} class="mb-8 text-2xl font-bold tracking-tight">
                            {content().heading}
                        </h2>
                    </Show>

                    <div use:animate={getLayer(props.section, 'grid')} class={`grid grid-cols-1 gap-6 ${cols()}`}>
                        <For each={props.section.mixedEntries || []}>
                            {(item) => {
                                const data = (item.entry.data || {}) as Record<string, unknown>;
                                const heading = item.fieldMapping.heading ? data[item.fieldMapping.heading] : undefined;
                                const image = item.fieldMapping.image ? data[item.fieldMapping.image] : undefined;
                                const description = item.fieldMapping.description ? data[item.fieldMapping.description] : undefined;
                                const href = hrefFor(item);
                                return (
                                    <a href={href} class="group block overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:shadow-lg">
                                        <Show when={image}>
                                            <div class="aspect-[4/3] overflow-hidden bg-neutral-100">
                                                <img src={image as string} alt={String(heading ?? '')} class="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                                            </div>
                                        </Show>
                                        <div class="p-4">
                                            <Show when={heading}>
                                                <p class="font-semibold text-neutral-900">{heading as string}</p>
                                            </Show>
                                            <Show when={description}>
                                                <p class="mt-1 line-clamp-2 text-sm text-neutral-500">{description as string}</p>
                                            </Show>
                                        </div>
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
