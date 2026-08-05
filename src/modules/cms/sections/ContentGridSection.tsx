import { For, Show } from 'solid-js';
import { animate } from '@/modules/cms/animation/useAnimate';
import { getLayer, spacingClass, sectionCssVars, resolveTheme, themeBackgroundClass } from './sectionHelpers';
import type { ResolvedSection } from '@/modules/cms/cms.types';

const _ = animate;

export interface ContentGridContent {
    heading?: string;
    description?: string;
}

const GRID_COLS: Record<string, string> = {
    'grid-2': 'md:grid-cols-2',
    'grid-3': 'md:grid-cols-3',
    'grid-4': 'md:grid-cols-4',
};

/**
 * Section "list nội dung động" (mục 9 spec CMS) — dùng chung cho BẤT KỲ Object
 * Type nào admin tự tạo (Sản phẩm/Tin tức/Đối tác/Dự án...), không hardcode
 * field theo 1 loại content cụ thể. Admin chọn field nào map vào slot nào qua
 * `fieldMapping` (heading/image/description) khi cấu hình section.
 */
export function ContentGridSection(props: { section: ResolvedSection }) {
    const content = () => (props.section.content || {}) as ContentGridContent;
    const mapping = () => props.section.fieldMapping || {};
    const cols = () => GRID_COLS[props.section.layoutPreset || 'grid-3'] || GRID_COLS['grid-3'];

    const fieldOf = (data: Record<string, any>, slot: string) => {
        const key = mapping()[slot];
        return key ? data?.[key] : undefined;
    };

    const hrefFor = (slug: string) => {
        const pattern = props.section.detailPathPattern;
        return pattern ? pattern.replace(':slug', slug) : undefined;
    };
    const theme = () => resolveTheme(props.section);

    return (
        <section class={`${spacingClass(props.section.responsiveSettings?.spacing)} px-6 ${themeBackgroundClass(theme())}`} style={sectionCssVars(props.section)}>
            <div class="mx-auto max-w-6xl">
                <Show when={content().heading}>
                    <div class="mb-10 text-center">
                        <h2 use:animate={getLayer(props.section, 'heading')} class="text-3xl font-bold tracking-tight">
                            {content().heading}
                        </h2>
                        <Show when={content().description}>
                            <p class="mt-3 opacity-80">{content().description}</p>
                        </Show>
                    </div>
                </Show>

                <div use:animate={getLayer(props.section, 'grid')} class={`grid grid-cols-1 gap-8 ${cols()}`}>
                    <For each={props.section.entries || []}>
                        {(entry) => {
                            const data = entry.data || {};
                            const heading = fieldOf(data, 'heading');
                            const image = fieldOf(data, 'image');
                            const description = fieldOf(data, 'description');
                            const href = entry.slug ? hrefFor(entry.slug) : undefined;
                            const Wrapper = (p: { children: any }) =>
                                href ? <a href={href} class="group block">{p.children}</a> : <div>{p.children}</div>;

                            return (
                                <Wrapper>
                                    <div class="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition group-hover:shadow-lg">
                                        <Show when={image}>
                                            <div class="aspect-[4/3] overflow-hidden bg-neutral-100">
                                                <img src={image} alt={heading || ''} class="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                                            </div>
                                        </Show>
                                        <div class="p-5">
                                            <Show when={heading}>
                                                <p class="font-semibold text-neutral-900">{heading}</p>
                                            </Show>
                                            <Show when={description}>
                                                <p class="mt-1 line-clamp-2 text-sm text-neutral-500">{description}</p>
                                            </Show>
                                        </div>
                                    </div>
                                </Wrapper>
                            );
                        }}
                    </For>
                </div>

                <Show when={!props.section.entries?.length}>
                    <p class="text-center text-neutral-400">Chưa có nội dung.</p>
                </Show>
            </div>
        </section>
    );
}
