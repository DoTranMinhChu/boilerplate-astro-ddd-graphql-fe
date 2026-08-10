import { For, Show, onMount, createSignal } from 'solid-js';
import DOMPurify from 'isomorphic-dompurify';
import { animate } from '@/modules/cms/animation/useAnimate';
import { getLayer, spacingClass, sectionCssVars, resolveTheme, themeBackgroundClass } from './sectionHelpers';
import { ESectionTheme } from '@/modules/cms/cms.constants';
import type { ContentEntryDTO, FieldDefinitionDTO, RelationDisplayItem, TaxonomyDisplayItem, ResolvedSection } from '@/modules/cms/cms.types';
import { ContentEntryService } from '@/shared/services/contentEntry/contentEntry.service';

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

/** Tiêu đề tóm tắt cho 1 mục Repeater ở kiểu hiển thị `accordion` (mục E.2) — field
 * có `isRepeaterTitleSource: true` thắng nếu có giá trị, rơi về field TEXT đầu tiên
 * có giá trị, rơi về "Mục #N" nếu không field nào dùng được. Hàm THUẦN, viết RIÊNG
 * cho khu vực CÔNG KHAI (không tái dùng `resolveContentEntryRepeaterItemTitle` của
 * ContentEntryRepeaterInput.tsx — file đó thuộc khu vực ADMIN và import
 * `@core/components/control/createControl` + `Button` + `DragList`, kéo theo phụ
 * thuộc/bundle không cần thiết vào trang công khai nếu import chéo qua đây; đúng
 * quyết định "không gộp chung" đã áp dụng nhất quán giữa Task 5/6 cho 2 khu vực
 * admin khác nhau, ở đây là admin vs. public nên càng nên tách). */
function resolveRepeaterItemTitlePublic(itemFields: FieldDefinitionDTO[], item: Record<string, unknown>, index: number): string {
    const hasValue = (key: string) => {
        const v = item?.[key];
        return v !== undefined && v !== null && v !== '';
    };
    const marked = itemFields.find((f) => f.isRepeaterTitleSource && f.type === 'TEXT' && f.key && hasValue(f.key));
    if (marked) return String(item[marked.key!]);
    const firstText = itemFields.find((f) => f.type === 'TEXT' && f.key && hasValue(f.key));
    if (firstText) return String(item[firstText.key!]);
    return `Mục #${index + 1}`;
}

export interface ContentDetailContent {
    /** Admin-configured layout (see Page Builder → "Bố cục hiển thị" for this block).
     * Empty/undefined = fall back to the original heuristic (first IMAGE field is the
     * hero, the slug-source or first TEXT field is the title, everything else is the
     * body list in ContentType field order) — keeps every section created before this
     * existed rendering exactly as before. */
    fieldLayout?: DetailFieldLayoutEntry[];
}

/** Render 1 field REPEATER trên trang công khai theo `field.displayVariant` (mục E.2:
 * `list`/`cards`/`accordion`, mặc định `list` = layout gốc trước Task 8, không đổi gì
 * nếu admin chưa từng set). Tách thành component riêng (thay vì IIFE ngay trong JSX
 * của ContentDetailSection) để accordion's `createSignal<Set<number>>` có 1 instance
 * ỔN ĐỊNH cho mỗi field REPEATER (Solid mount component 1 lần theo <For> item, không
 * tạo lại signal mỗi lần re-render cha) — cùng pattern AccordionListSection.tsx.
 * `renderItem` bên trong là hàm con dùng chung cho cả 3 nhánh, tránh lặp code 3 lần
 * phần render "1 item" (mục E.2 quyết định implementer). */
function RepeaterFieldDisplay(props: {
    field: FieldDefinitionDTO & { key: string };
    items: Record<string, unknown>[];
    itemSubFields: (FieldDefinitionDTO & { key: string })[];
    relationDisplay?: Record<string, RelationDisplayItem[]>;
    taxonomyDisplay?: Record<string, TaxonomyDisplayItem[]>;
    isDark: () => boolean;
}) {
    const [openSet, setOpenSet] = createSignal<Set<number>>(new Set([0]));
    const toggle = (index: number) => {
        const next = new Set(openSet());
        if (next.has(index)) next.delete(index); else next.add(index);
        setOpenSet(next);
    };

    const renderItem = (item: Record<string, unknown>, itemIndex: number) => (
        <For each={props.itemSubFields}>
            {(sub) => {
                const compositeKey = `${props.field.key}.${itemIndex}.${sub.key}`;
                const hasSubValue = () => item[sub.key] !== undefined && item[sub.key] !== null && item[sub.key] !== '';
                return (
                    <Show when={sub.type === 'RELATION' ? !!props.relationDisplay?.[compositeKey]?.length : sub.type === 'TAXONOMY' ? !!props.taxonomyDisplay?.[compositeKey]?.length : hasSubValue()}>
                        <div class="mb-3 last:mb-0">
                            <p class={`text-[11px] font-semibold uppercase tracking-wide ${props.isDark() ? 'text-white/40' : 'text-neutral-400'}`}>{sub.label}</p>
                            <Show when={sub.type === 'RELATION'}>
                                <div class="mt-1 flex flex-wrap gap-2">
                                    <For each={props.relationDisplay?.[compositeKey] || []}>
                                        {(rel) => rel.href ? (
                                            <a href={rel.href} class={`rounded-full border px-3 py-1 text-sm font-medium transition hover:opacity-80 ${props.isDark() ? 'border-white/30 text-white' : 'border-neutral-300 text-neutral-800'}`}>{rel.label}</a>
                                        ) : (
                                            <span class={`rounded-full border px-3 py-1 text-sm font-medium ${props.isDark() ? 'border-white/20 text-white/70' : 'border-neutral-200 text-neutral-600'}`}>{rel.label}</span>
                                        )}
                                    </For>
                                </div>
                            </Show>
                            <Show when={sub.type === 'TAXONOMY'}>
                                <div class="mt-1 flex flex-wrap gap-2">
                                    <For each={props.taxonomyDisplay?.[compositeKey] || []}>
                                        {(tax) => <span class={`rounded-full border px-3 py-1 text-sm font-medium ${props.isDark() ? 'border-white/20 text-white/70' : 'border-neutral-200 text-neutral-600'}`}>{tax.label}</span>}
                                    </For>
                                </div>
                            </Show>
                            <Show when={sub.type === 'RICHTEXT'}>
                                <div class={`prose prose-sm max-w-none mt-0.5 ${props.isDark() ? 'prose-invert' : ''}`} innerHTML={DOMPurify.sanitize(String(item[sub.key] ?? ''))} />
                            </Show>
                            <Show when={sub.type !== 'RELATION' && sub.type !== 'TAXONOMY' && sub.type !== 'RICHTEXT'}>
                                <p class={`mt-0.5 ${props.isDark() ? 'text-white/80' : 'text-neutral-700'}`}>{String(item[sub.key])}</p>
                            </Show>
                        </div>
                    </Show>
                );
            }}
        </For>
    );

    return (
        <>
            <Show when={(props.field.displayVariant || 'list') === 'list'}>
                <div class="mt-2 space-y-3">
                    <For each={props.items}>
                        {(item, itemIndex) => (
                            <div class={`rounded-lg border p-4 ${props.isDark() ? 'border-white/15' : 'border-neutral-200'}`}>
                                {renderItem(item, itemIndex())}
                            </div>
                        )}
                    </For>
                </div>
            </Show>
            <Show when={props.field.displayVariant === 'cards'}>
                <div class="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <For each={props.items}>
                        {(item, itemIndex) => (
                            <div class={`rounded-lg border p-4 ${props.isDark() ? 'border-white/15' : 'border-neutral-200'}`}>
                                {renderItem(item, itemIndex())}
                            </div>
                        )}
                    </For>
                </div>
            </Show>
            <Show when={props.field.displayVariant === 'accordion'}>
                <div class="mt-2 space-y-2">
                    <For each={props.items}>
                        {(item, itemIndex) => {
                            const open = () => openSet().has(itemIndex());
                            return (
                                <div class={`rounded-lg border ${props.isDark() ? 'border-white/15' : 'border-neutral-200'}`}>
                                    <button
                                        type="button"
                                        class="flex w-full items-center justify-between gap-4 p-4 text-left"
                                        onClick={() => toggle(itemIndex())}
                                        aria-expanded={open()}
                                    >
                                        <span class={`font-medium ${props.isDark() ? 'text-white' : 'text-neutral-800'}`}>{resolveRepeaterItemTitlePublic(props.itemSubFields, item, itemIndex())}</span>
                                        <span class={props.isDark() ? 'text-white/50' : 'text-neutral-400'}>{open() ? '−' : '+'}</span>
                                    </button>
                                    <Show when={open()}>
                                        <div class="px-4 pb-4">{renderItem(item, itemIndex())}</div>
                                    </Show>
                                </div>
                            );
                        }}
                    </For>
                </div>
            </Show>
        </>
    );
}

/**
 * Section "chi tiết nội dung động" — tự render TOÀN BỘ field của 1 ContentEntry
 * theo đúng FieldDefinition[] của ContentType (bất kể admin tạo Object Type gì:
 * Sản phẩm/Dự án/Đối tác...), không cần code riêng cho từng loại. Đây là section
 * mặc định gắn vào trang Chi tiết.
 */
export function ContentDetailSection(props: { section: ResolvedSection; pageEntry?: ContentEntryDTO; contentTypeFields?: FieldDefinitionDTO[]; relationDisplay?: Record<string, RelationDisplayItem[]>; taxonomyDisplay?: Record<string, TaxonomyDisplayItem[]> }) {
    // `key` là required=true khi admin tạo field (ContentTypeService validate), nhưng
    // GraphQL type luôn nullable (framework không dùng NonNull) -> lọc field thiếu key
    // 1 lần ở đây rồi coi field.key là string thật cho phần còn lại của component.
    const allFields = () => (props.contentTypeFields || []).filter((f): f is FieldDefinitionDTO & { key: string } => !!f.key);
    // itemFields của 1 REPEATER cũng nullable-element (`key` required lúc admin tạo field,
    // nhưng GraphQL type không NonNull) — lọc y hệt allFields ở trên, không cast away lỗi TS.
    const itemSubFields = (field: FieldDefinitionDTO) =>
        (field.itemFields || []).filter((f): f is FieldDefinitionDTO & { key: string } => !!f?.key);
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
        return allFields().find((f) => f.type === 'TEXT' && hasValue(f.key));
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

    // Tăng lượt xem 1 LẦN mỗi phiên trình duyệt cho mỗi entry — dedup qua
    // sessionStorage (mục 1 design Phase 2b: v1 cố ý đơn giản, không chặn multi-tab/
    // bot, đã thống nhất với chủ dự án). Component này chạy trong 1 client:visible
    // island (SectionRenderer, xem CmsPageShell.astro) nên onMount + browser API an
    // toàn — không phải SSR-only.
    onMount(() => {
        const entryId = props.pageEntry?.id;
        if (!entryId || typeof window === 'undefined') return;
        const key = `viewed:${entryId}`;
        if (window.sessionStorage.getItem(key)) return;
        window.sessionStorage.setItem(key, '1');
        ContentEntryService.trackEntryView({ entryId }).catch(() => { /* 1 lượt xem lỡ mất không đáng báo lỗi cho người xem */ });
    });

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
                                    <Show when={field.type === 'TAXONOMY'}>
                                        <div class="mt-1 flex flex-wrap gap-2">
                                            <For each={props.taxonomyDisplay?.[field.key] || []}>
                                                {(item) => (
                                                    <span class={`rounded-full border px-3 py-1 text-sm font-medium ${isDark() ? 'border-white/20 text-white/70' : 'border-neutral-200 text-neutral-600'}`}>
                                                        {item.label}
                                                    </span>
                                                )}
                                            </For>
                                        </div>
                                    </Show>
                                    <Show when={field.type === 'REPEATER'}>
                                        <RepeaterFieldDisplay
                                            field={field}
                                            items={(value as Record<string, unknown>[]) || []}
                                            itemSubFields={itemSubFields(field)}
                                            relationDisplay={props.relationDisplay}
                                            taxonomyDisplay={props.taxonomyDisplay}
                                            isDark={isDark}
                                        />
                                    </Show>
                                    <Show when={field.type !== 'RICHTEXT' && field.type !== 'GALLERY' && field.type !== 'IMAGE' && field.type !== 'RELATION' && field.type !== 'REPEATER' && field.type !== 'TAXONOMY'}>
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
