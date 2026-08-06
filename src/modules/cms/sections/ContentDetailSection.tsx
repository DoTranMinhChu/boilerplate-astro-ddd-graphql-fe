import { For, Show } from 'solid-js';
import DOMPurify from 'isomorphic-dompurify';
import { animate } from '@/modules/cms/animation/useAnimate';
import { getLayer, spacingClass, sectionCssVars, resolveTheme, themeBackgroundClass } from './sectionHelpers';
import { ESectionTheme } from '@/modules/cms/cms.constants';
import type { ContentEntryDTO, FieldDefinitionDTO, RelationDisplayItem, ResolvedSection } from '@/modules/cms/cms.types';

const _ = animate;

export interface DetailFieldLayoutEntry {
    key: string;
    /** Which part of the layout this field renders in. `hero`/`title` are special,
     * larger-styled single slots — the first visible field assigned to each wins if
     * an admin (mis)assigns more than one. Everything else is `body`, a plain
     * ordered list. */
    slot: 'hero' | 'title' | 'body';
    visible: boolean;
}

export interface ContentDetailContent {
    /** Admin-configured layout (see Page Builder → "Bố cục hiển thị" for this block).
     * Empty/undefined = fall back to the original heuristic (first IMAGE field is the
     * hero, the slug-source or first TEXT field is the title, everything else is the
     * body list in ContentType field order) — keeps every section created before this
     * existed rendering exactly as before. */
    fieldLayout?: DetailFieldLayoutEntry[];
}

/**
 * Section "chi tiết nội dung động" — tự render TOÀN BỘ field của 1 ContentEntry
 * theo đúng FieldDefinition[] của ContentType (bất kể admin tạo Object Type gì:
 * Sản phẩm/Dự án/Đối tác...), không cần code riêng cho từng loại. Đây là section
 * mặc định gắn vào trang COLLECTION_DETAIL.
 */
export function ContentDetailSection(props: { section: ResolvedSection; pageEntry?: ContentEntryDTO; contentTypeFields?: FieldDefinitionDTO[]; relationDisplay?: Record<string, RelationDisplayItem[]> }) {
    // `key` là required=true khi admin tạo field (ContentTypeService validate), nhưng
    // GraphQL type luôn nullable (framework không dùng NonNull) -> lọc field thiếu key
    // 1 lần ở đây rồi coi field.key là string thật cho phần còn lại của component.
    const allFields = () => (props.contentTypeFields || []).filter((f): f is FieldDefinitionDTO & { key: string } => !!f.key);
    const data = () => props.pageEntry?.data || {};
    const hasValue = (key: string) => data()[key] !== undefined && data()[key] !== null && data()[key] !== '';
    const fieldByKey = (key: string) => allFields().find((f) => f.key === key);

    const layout = () => (props.section.content as ContentDetailContent | undefined)?.fieldLayout;

    const heroImageField = () => {
        const configured = layout()?.find((e) => e.slot === 'hero' && e.visible);
        if (configured) return fieldByKey(configured.key);
        if (layout()?.length) return undefined; // configured but nothing assigned to hero — respect that choice
        return allFields().find((f) => f.type === 'IMAGE' && hasValue(f.key));
    };
    const titleField = () => {
        const configured = layout()?.find((e) => e.slot === 'title' && e.visible);
        if (configured) return fieldByKey(configured.key);
        if (layout()?.length) return undefined;
        return allFields().find((f) => f.isSlugSource && hasValue(f.key)) || allFields().find((f) => f.type === 'TEXT' && hasValue(f.key));
    };
    const bodyFields = () => {
        const heroKey = heroImageField()?.key;
        const titleKey = titleField()?.key;
        const cfg = layout();
        if (cfg?.length) {
            return cfg
                .filter((e) => e.slot === 'body' && e.visible && e.key !== heroKey && e.key !== titleKey)
                .map((e) => fieldByKey(e.key))
                .filter((f): f is FieldDefinitionDTO & { key: string } => !!f && hasValue(f.key));
        }
        return allFields().filter((f) => f.key !== heroKey && f.key !== titleKey && hasValue(f.key));
    };

    const valueOf = (key: string) => data()[key];
    const theme = () => resolveTheme(props.section);
    // `themeBackgroundClass` chỉ set màu nền + màu chữ CƠ BẢN cho toàn <section> — body
    // text/RICHTEXT bên dưới trước đây hardcode màu tối (text-neutral-700, `prose` mặc
    // định giả định nền sáng) nên khi admin đổi Style › Kiểu giao diện sang "Tối" thì
    // chữ thân bài gần như vô hình (chữ xám đậm trên nền đen). Theo màu nền thật.
    const isDark = () => theme() === ESectionTheme.DARK || theme() === ESectionTheme.BRAND;

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

                <div class="mt-8 space-y-6">
                    <For each={bodyFields()}>
                        {(field) => {
                            const value = valueOf(field.key);
                            return (
                                <div use:animate={getLayer(props.section, field.key)}>
                                    <p class={`text-xs font-semibold uppercase tracking-wide ${isDark() ? 'text-white/40' : 'text-neutral-400'}`}>{field.label}</p>
                                    <Show when={field.type === 'RICHTEXT'}>
                                        <div class={`prose max-w-none mt-1 ${isDark() ? 'prose-invert' : ''}`} innerHTML={DOMPurify.sanitize(String(value ?? ''))} />
                                    </Show>
                                    <Show when={field.type === 'GALLERY'}>
                                        <div class="mt-2 grid grid-cols-2 gap-3 md:grid-cols-3">
                                            <For each={(value as string[]) || []}>
                                                {(src) => <img src={src} class="aspect-square w-full rounded-lg object-cover" />}
                                            </For>
                                        </div>
                                    </Show>
                                    <Show when={field.type === 'RELATION'}>
                                        <div class="mt-1 flex flex-wrap gap-2">
                                            <For each={props.relationDisplay?.[field.key] || []}>
                                                {(item) => item.href ? (
                                                    <a href={item.href} class={`rounded-full border px-3 py-1 text-sm font-medium transition hover:opacity-80 ${isDark() ? 'border-white/30 text-white' : 'border-neutral-300 text-neutral-800'}`}>
                                                        {item.label}
                                                    </a>
                                                ) : (
                                                    <span class={`rounded-full border px-3 py-1 text-sm font-medium ${isDark() ? 'border-white/20 text-white/70' : 'border-neutral-200 text-neutral-600'}`}>
                                                        {item.label}
                                                    </span>
                                                )}
                                            </For>
                                        </div>
                                    </Show>
                                    <Show when={field.type !== 'RICHTEXT' && field.type !== 'GALLERY' && field.type !== 'IMAGE' && field.type !== 'RELATION'}>
                                        <p class={`mt-1 ${isDark() ? 'text-white/80' : 'text-neutral-700'}`}>{String(value)}</p>
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
