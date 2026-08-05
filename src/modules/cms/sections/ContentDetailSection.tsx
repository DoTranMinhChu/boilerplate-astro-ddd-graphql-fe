import { For, Show } from 'solid-js';
import DOMPurify from 'isomorphic-dompurify';
import { animate } from '@/modules/cms/animation/useAnimate';
import { getLayer, spacingClass, sectionCssVars, resolveTheme, themeBackgroundClass } from './sectionHelpers';
import type { ContentEntryDTO, FieldDefinitionDTO, ResolvedSection } from '@/modules/cms/cms.types';

const _ = animate;

/**
 * Section "chi tiết nội dung động" — tự render TOÀN BỘ field của 1 ContentEntry
 * theo đúng FieldDefinition[] của ContentType (bất kể admin tạo Object Type gì:
 * Sản phẩm/Dự án/Đối tác...), không cần code riêng cho từng loại. Đây là section
 * mặc định gắn vào trang COLLECTION_DETAIL.
 */
export function ContentDetailSection(props: { section: ResolvedSection; pageEntry?: ContentEntryDTO; contentTypeFields?: FieldDefinitionDTO[] }) {
    // `key` là required=true khi admin tạo field (ContentTypeService validate), nhưng
    // GraphQL type luôn nullable (framework không dùng NonNull) -> lọc field thiếu key
    // 1 lần ở đây rồi coi field.key là string thật cho phần còn lại của component.
    const fields = () => {
        const data = props.pageEntry?.data || {};
        return (props.contentTypeFields || [])
            .filter((f): f is FieldDefinitionDTO & { key: string } => !!f.key && data[f.key] !== undefined && data[f.key] !== null && data[f.key] !== '');
    };

    const heroImageField = () => fields().find((f) => f.type === 'IMAGE');
    const titleField = () => fields().find((f) => f.isSlugSource) || fields().find((f) => f.type === 'TEXT');
    const restFields = () => fields().filter((f) => f.key !== heroImageField()?.key && f.key !== titleField()?.key);
    const valueOf = (key: string) => props.pageEntry?.data?.[key];
    const theme = () => resolveTheme(props.section);

    return (
        <section class={`${spacingClass(props.section.responsiveSettings?.spacing)} ${themeBackgroundClass(theme())}`} style={sectionCssVars(props.section)}>
            <div class="mx-auto max-w-4xl px-6">
                <Show when={heroImageField()}>
                    {(field) => (
                        <img
                            use:animate={getLayer(props.section, 'image')}
                            src={valueOf(field().key)}
                            alt={String(valueOf(titleField()?.key ?? '') ?? '')}
                            class="mb-8 w-full rounded-2xl object-cover shadow-lg"
                        />
                    )}
                </Show>

                <Show when={titleField()}>
                    {(field) => (
                        <h1 use:animate={getLayer(props.section, 'heading')} class="text-3xl md:text-5xl font-bold tracking-tight">
                            {valueOf(field().key)}
                        </h1>
                    )}
                </Show>

                <div use:animate={getLayer(props.section, 'body')} class="mt-8 space-y-6">
                    <For each={restFields()}>
                        {(field) => {
                            const value = valueOf(field.key);
                            return (
                                <div>
                                    <p class="text-xs font-semibold uppercase tracking-wide text-neutral-400">{field.label}</p>
                                    <Show when={field.type === 'RICHTEXT'}>
                                        <div class="prose max-w-none mt-1" innerHTML={DOMPurify.sanitize(String(value ?? ''))} />
                                    </Show>
                                    <Show when={field.type === 'GALLERY'}>
                                        <div class="mt-2 grid grid-cols-2 gap-3 md:grid-cols-3">
                                            <For each={(value as string[]) || []}>
                                                {(src) => <img src={src} class="aspect-square w-full rounded-lg object-cover" />}
                                            </For>
                                        </div>
                                    </Show>
                                    <Show when={field.type !== 'RICHTEXT' && field.type !== 'GALLERY' && field.type !== 'IMAGE'}>
                                        <p class="mt-1 text-neutral-700">{String(value)}</p>
                                    </Show>
                                </div>
                            );
                        }}
                    </For>
                </div>
            </div>
        </section>
    );
}
