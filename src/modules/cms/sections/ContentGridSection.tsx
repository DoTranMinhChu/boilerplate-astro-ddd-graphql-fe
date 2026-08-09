import { For, Show } from 'solid-js';
import DOMPurify from 'isomorphic-dompurify';
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

    // Fix Important #3 (γ final review): field feed-URL/param name KHÔNG luôn tên "slug" — đọc
    // động từ binding.fieldKey/binding.paramName (trước đây hardcode "slug").
    const hrefFor = (feedValue: string) => {
        const binding = props.section.detailPathPattern;
        return binding ? binding.path.replace(':' + binding.paramName, feedValue) : undefined;
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
                            <div class="mt-3 opacity-80 [&_p]:m-0" innerHTML={DOMPurify.sanitize(content().description || '')} />
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
                            // ContentEntry không còn cột `slug` cứng (mục γ, Task 5) — đọc field feed-URL
                            // THẬT của content type này qua binding.fieldKey (Fix Important #3), không
                            // hardcode "slug".
                            const binding = props.section.detailPathPattern;
                            const feedValue = binding ? ((entry.data as Record<string, unknown> | undefined)?.[binding.fieldKey] as string | undefined) : undefined;
                            const href = feedValue ? hrefFor(feedValue) : undefined;
                            const Wrapper = (p: { children: JSX.Element }) =>
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
