// src/modules/cms/node/primitives/ContentDetailNode.tsx
// Phase 0 M2b: tự chứa, đọc props.node.props.contentTypeId (ghi tĩnh lúc migrate từ
// Page.dataBinding/Section.dataSource — xem migrateSectionsToNodes.ts) + context.contextEntry
// (đã được gán sẵn cho TOÀN BỘ cây Node từ M1/M2a qua cơ chế quét Section cũ —
// resolveCmsPageProps.ts CHƯA đổi sang đọc Page.dataBinding runtime, dời tới M3 — xem spec §5).
// Port nguyên allFields/heroImageField/titleField/bodyFields/RepeaterFieldDisplay/
// resolveRepeaterItemTitlePublic từ ContentDetailSection.tsx — BỎ relationDisplay/
// taxonomyDisplay (chưa có đường truyền vào NodeRenderContext, field RELATION/TAXONOMY hiện raw
// id thay vì tên đã "join" — giới hạn CHẤP NHẬN ĐƯỢC ở M2b, backlog M3) và onMount track-view
// (không phải nội dung hiển thị, backlog).
//
// Phase 0 M2c: `createResource` gọi ContentTypeService bên dưới ĐÃ render đủ dữ liệu ở SSR HTML
// (kiểm chứng thật: curl 1 trang Chi tiết thật với CMS_NODE_TREE_ENABLED=true, <h1>/body xuất
// hiện đầy đủ trong HTML thô) — Astro-Solid's implicit <Suspense> + renderToStringAsync tự
// resolve resource này, không cần refactor SSR riêng như đã lo ngại ở M2b's final review.
//
// Final whole-branch review fix (Important #1): props.node.props.content.fieldLayout (admin's
// "Bố cục hiển thị" override) và legacyAnimation (getLayer 'image'/'heading'/per-field) đã bị bỏ
// sót ở lần viết đầu — migrateSectionsToNodes.ts giờ ghi cả 2, restore đủ ở đây để không mất dữ
// liệu admin đã cấu hình (đúng logic layout()/heroImageField()/titleField()/bodyFields() gốc).
//
// Post-Phase-8 content build-out dogfooding fix: M2b's header comment above explicitly deferred
// "field RELATION/TAXONOMY hiện raw id thay vì tên đã 'join'" to a "backlog M3" that never
// shipped — hit live building Báo Bối Pet Spa's real "Sản phẩm" Content Type (a RELATION field
// "Danh mục" pointing at "Danh mục sản phẩm"): the public Detail page rendered a raw UUID
// ("01a05384-3b7f-...") instead of "Thức ăn khô". Fixed for RELATION via `RelationFieldDisplay`
// below — resolves the stored id(s) through the SAME public, unauthenticated query the
// data-source binding elsewhere in this codebase already uses (`getPublicContentEntries` with
// `ids`), so Content Visibility Rules still apply and no staff-only endpoint leaks to public
// visitors. Label fallback mirrors RelationFieldInput.tsx's admin-picker fix (mục Phase 8
// extension): the target CT's configured `relationDisplayField` first, else the first non-empty
// string value found in the related entry's `data`, else the raw id as a last resort. TAXONOMY
// still shows raw id(s) — same class of gap, not addressed in this pass; left as disclosed backlog.
// Motion System Unification, Task 11a: Task 11's delete-legacy-system grep gate found THIS file
// as the one remaining live consumer of `useAnimate.ts`/`getLayerForNode.ts` (missed by Tasks
// 1-10 because it isn't one of the 13 retired node types Task 2 covered). Migrated to the new
// `useNodeAnimation.ts`/`AnimationTimeline` system, same pattern as every other node primitive
// (ButtonNode.tsx, FrameNode.tsx, ...) and as Tasks 7-8's SiteHeader.tsx/SiteFooter.tsx: ONE
// `use:nodeAnimation={props.node.animationRef}` on this component's single root `<section>`,
// `data-anim-target="..."` on the 3 previously-`use:animate`-targeted sub-elements (image/heading/
// per-body-field, keyed by `field.key` to preserve the old per-field targeting granularity — an
// admin can still animate one specific field by typing its key into NodeAnimationTab's free-text
// target input). Per explicit project-owner decision, this is a CODE migration only — any
// existing `props.legacyAnimation` value (written once by migrateSectionsToNodes.ts) is not
// data-migrated and its animation is simply lost; `getLayerForNode` is removed as a result of
// this file being its last importer.
import { For, Show, createResource, createSignal } from 'solid-js';
import DOMPurify from 'isomorphic-dompurify';
import { nodeAnimation } from '../useNodeAnimation';
import type { NodeComponentProps } from '../nodeRegistry';
import type { FieldDefinitionDTO } from '@/modules/cms/cms.types';
import { ContentTypeService } from '@/shared/services/contentType/contentType.service';
import { ContentEntryService } from '@/shared/services/contentEntry/contentEntry.service';
import { applyNodeStyle } from '../applyNodeStyle';

void nodeAnimation;

export interface DetailFieldLayoutEntry {
    key: string;
    slot: 'hero' | 'title' | 'body';
    visible: boolean;
}

export interface ContentDetailNodeContent {
    fieldLayout?: DetailFieldLayoutEntry[];
}

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

function RepeaterFieldDisplay(props: {
    field: FieldDefinitionDTO & { key: string };
    items: Record<string, unknown>[];
    itemSubFields: (FieldDefinitionDTO & { key: string })[];
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
                const hasSubValue = () => item[sub.key] !== undefined && item[sub.key] !== null && item[sub.key] !== '';
                return (
                    <Show when={hasSubValue()}>
                        <div class="mb-3 last:mb-0">
                            <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{sub.label}</p>
                            <Show when={sub.type === 'RICHTEXT'}>
                                <div class="prose prose-sm max-w-none mt-0.5" innerHTML={DOMPurify.sanitize(String(item[sub.key] ?? ''))} />
                            </Show>
                            <Show when={sub.type !== 'RICHTEXT'}>
                                <p class="mt-0.5 text-neutral-700">{String(item[sub.key])}</p>
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
                        {(item, itemIndex) => <div class="rounded-lg border border-neutral-200 p-4">{renderItem(item, itemIndex())}</div>}
                    </For>
                </div>
            </Show>
            <Show when={props.field.displayVariant === 'cards'}>
                <div class="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <For each={props.items}>
                        {(item, itemIndex) => <div class="rounded-lg border border-neutral-200 p-4">{renderItem(item, itemIndex())}</div>}
                    </For>
                </div>
            </Show>
            <Show when={props.field.displayVariant === 'accordion'}>
                <div class="mt-2 space-y-2">
                    <For each={props.items}>
                        {(item, itemIndex) => {
                            const open = () => openSet().has(itemIndex());
                            return (
                                <div class="rounded-lg border border-neutral-200">
                                    <button type="button" class="flex w-full items-center justify-between gap-4 p-4 text-left" onClick={() => toggle(itemIndex())} aria-expanded={open()}>
                                        <span class="font-medium text-neutral-800">{resolveRepeaterItemTitlePublic(props.itemSubFields, item, itemIndex())}</span>
                                        <span class="text-neutral-400">{open() ? '−' : '+'}</span>
                                    </button>
                                    <Show when={open()}><div class="px-4 pb-4">{renderItem(item, itemIndex())}</div></Show>
                                </div>
                            );
                        }}
                    </For>
                </div>
            </Show>
        </>
    );
}

function firstStringValue(data: Record<string, unknown> | undefined): string | undefined {
    if (!data) return undefined;
    for (const v of Object.values(data)) {
        if (typeof v === 'string' && v.trim()) return v;
    }
    return undefined;
}

function RelationFieldDisplay(props: {
    field: FieldDefinitionDTO & { key: string };
    value: unknown;
    valueClass: string;
}) {
    const ids = () => {
        const v = props.value;
        if (!v) return [];
        return (Array.isArray(v) ? v : [v]).filter((x): x is string => typeof x === 'string' && !!x);
    };
    const [entries] = createResource(
        () => (props.field.relationTarget && ids().length ? { contentTypeId: props.field.relationTarget, ids: ids() } : null),
        (args) => ContentEntryService.getPublicContentEntries({ contentTypeId: args!.contentTypeId, ids: args!.ids, limit: args!.ids.length }),
    );
    const labels = () => {
        const byId = new Map((entries() || []).filter((e): e is NonNullable<typeof e> => !!e).map((e) => [e.id, e]));
        return ids().map((id) => {
            const entry = byId.get(id);
            if (!entry) return id;
            const data = entry.data as Record<string, unknown> | undefined;
            return (props.field.relationDisplayField ? data?.[props.field.relationDisplayField] as string : undefined) || firstStringValue(data) || id;
        });
    };
    return <p class={props.valueClass}>{labels().join(', ')}</p>;
}

export function ContentDetailNode(props: NodeComponentProps) {
    // Canvas Editor v2, Task 12 — prefer the ancestor-walk-resolved contentTypeId threaded via
    // context (see NodeRenderContext.contextEntryContentTypeId), falling back to the OLD static
    // node.props.contentTypeId for pages that predate this field (non-breaking).
    const contentTypeId = () => props.context.contextEntryContentTypeId ?? (props.node.props?.contentTypeId as string | undefined);
    const [contentType] = createResource(contentTypeId, (id) => ContentTypeService.getOneContentType({ id }));

    const allFields = () => (contentType()?.fields || []).filter((f): f is FieldDefinitionDTO & { key: string } => !!f?.key);
    const itemSubFields = (field: FieldDefinitionDTO) =>
        (field.itemFields || []).filter((f): f is FieldDefinitionDTO & { key: string } => !!f?.key);
    const data = () => props.context.contextEntry || {};
    const hasValue = (key: string) => data()[key] !== undefined && data()[key] !== null && data()[key] !== '';
    const fieldByKey = (key: string) => allFields().find((f) => f.key === key);

    const layout = () => (props.node.props?.content as ContentDetailNodeContent | undefined)?.fieldLayout;

    const heroImageField = () => {
        const configured = layout()?.find((e) => e.slot === 'hero' && e.visible);
        if (configured) return fieldByKey(configured.key);
        if (layout()?.length) return undefined;
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

    // `bg-white text-neutral-900` below are only the DEFAULT (unstyled) look — this component
    // previously ignored `node.style` entirely, so a dark-themed site (e.g. VELTRA/gaming-platform)
    // had no way to make its own Detail page match the rest of the page short of editing this
    // file. Inline styles always win over Tailwind utility classes (specificity), so an admin who
    // sets `style.background`/`style.typography.color` on this node now overrides the default —
    // and a node that never sets a custom style still renders byte-for-byte the same as before
    // (applyNodeStyle({}) contributes no CSS properties at all).
    const sectionStyle = () => applyNodeStyle(props.node.style ?? {}, props.node.responsiveOverrides, props.context.device());
    // An explicit `style.background` is this component's only signal that the admin wants a
    // custom (non-default-white) look — used below to swap the auxiliary label/value/prose text
    // colors to their light-on-dark equivalents. `sectionStyle()`'s own `color` (from
    // `style.typography.color`, if set) only affects the `<h1>` for free via CSS inheritance —
    // the label/value/prose elements below all set their OWN explicit Tailwind text-color class,
    // which (correctly) wins over an inherited value, so they need this separate, explicit switch.
    const hasCustomBg = () => !!props.node.style?.background?.value;

    return (
        <section use:nodeAnimation={props.node.animationRef} class="bg-white py-14 text-neutral-900 md:py-20" style={sectionStyle()}>
            <div class="mx-auto max-w-4xl px-6">
                <Show when={heroImageField()}>
                    {(field) => (
                        <img data-anim-target="image" src={valueOf(field().key)} alt={String(valueOf(titleField()?.key ?? '') ?? '')} class="mb-8 w-full rounded-2xl object-cover shadow-lg" />
                    )}
                </Show>
                <Show when={titleField()}>
                    {(field) => <h1 data-anim-target="heading" class="text-3xl md:text-5xl font-bold tracking-tight">{valueOf(field().key)}</h1>}
                </Show>
                <div class="mt-8 space-y-6">
                    <For each={bodyFields()}>
                        {(field) => {
                            const value = valueOf(field.key);
                            return (
                                <div data-anim-target={field.key}>
                                    <p class={hasCustomBg() ? 'text-xs font-semibold uppercase tracking-wide text-white/50' : 'text-xs font-semibold uppercase tracking-wide text-neutral-400'}>{field.label}</p>
                                    {/* No `@tailwindcss/typography` plugin in this project (checked package.json) — `prose`
                                        was already a no-op class name here before this fix, contributing no color of its
                                        own. The sanitized HTML's raw <p>/<strong>/etc. tags have no color class of their
                                        own either, so they correctly inherit `color` from the <section> above (which now
                                        honors `style.typography.color` — see `sectionStyle()`) with zero extra code needed
                                        here. */}
                                    <Show when={field.type === 'RICHTEXT'}>
                                        <div class="prose max-w-none mt-1" innerHTML={DOMPurify.sanitize(String(value ?? ''))} />
                                    </Show>
                                    <Show when={field.type === 'GALLERY'}>
                                        <div class="mt-2 grid grid-cols-2 gap-3 md:grid-cols-3">
                                            <For each={(value as string[]) || []}>{(src) => <img src={src} class="aspect-square w-full rounded-lg object-cover" />}</For>
                                        </div>
                                    </Show>
                                    <Show when={field.type === 'REPEATER'}>
                                        <RepeaterFieldDisplay field={field} items={(value as Record<string, unknown>[]) || []} itemSubFields={itemSubFields(field)} />
                                    </Show>
                                    <Show when={field.type === 'RELATION'}>
                                        <RelationFieldDisplay field={field} value={value} valueClass={hasCustomBg() ? 'mt-1 text-white/80' : 'mt-1 text-neutral-700'} />
                                    </Show>
                                    <Show when={field.type !== 'RICHTEXT' && field.type !== 'GALLERY' && field.type !== 'IMAGE' && field.type !== 'REPEATER' && field.type !== 'RELATION'}>
                                        <p class={hasCustomBg() ? 'mt-1 text-white/80' : 'mt-1 text-neutral-700'}>{String(value)}</p>
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
