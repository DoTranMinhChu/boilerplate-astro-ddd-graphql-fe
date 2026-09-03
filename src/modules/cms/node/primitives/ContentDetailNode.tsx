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
import { EFieldDisplayVariant } from '@/modules/cms/cms.types';
import { ContentTypeService } from '@/shared/services/contentType/contentType.service';
import { ContentEntryService } from '@/shared/services/contentEntry/contentEntry.service';
import { applyNodeStyle } from '../applyNodeStyle';
import { formatNumberFieldValue, isCurrencyLabel } from '../formatFieldValue';
import { EFieldType } from '@/shared/generated/typed-graphql';

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
    const marked = itemFields.find((f) => f.isRepeaterTitleSource && f.type === EFieldType.TEXT && f.key && hasValue(f.key));
    if (marked) return String(item[marked.key!]);
    const firstText = itemFields.find((f) => f.type === EFieldType.TEXT && f.key && hasValue(f.key));
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
                            <Show when={sub.type === EFieldType.RICHTEXT}>
                                <div class="prose prose-sm max-w-none mt-0.5" innerHTML={DOMPurify.sanitize(String(item[sub.key] ?? ''))} />
                            </Show>
                            <Show when={sub.type !== EFieldType.RICHTEXT}>
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
            <Show when={(props.field.displayVariant || EFieldDisplayVariant.LIST) === EFieldDisplayVariant.LIST}>
                <div class="mt-2 space-y-3">
                    <For each={props.items}>
                        {(item, itemIndex) => <div class="rounded-lg border border-neutral-200 p-4">{renderItem(item, itemIndex())}</div>}
                    </For>
                </div>
            </Show>
            <Show when={props.field.displayVariant === EFieldDisplayVariant.CARDS}>
                <div class="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <For each={props.items}>
                        {(item, itemIndex) => <div class="rounded-lg border border-neutral-200 p-4">{renderItem(item, itemIndex())}</div>}
                    </For>
                </div>
            </Show>
            <Show when={props.field.displayVariant === EFieldDisplayVariant.ACCORDION}>
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
    // `<span>`, not `<p>` — the visual-quality redesign below (see the big comment on
    // `ContentDetailNode` itself) reuses this same component for RELATION values shown as a
    // meta "pill" inline alongside other pills, where a block-level `<p>` would force its own
    // line. The one caller that still wants block/paragraph behavior (a RELATION field that
    // lands in the generic "rest of the fields" section, not a meta pill) adds `block` to its
    // own `valueClass` — same as it already had to specify every other Tailwind class.
    return <span class={props.valueClass}>{labels().join(', ')}</span>;
}

/**
 * User visual-quality review (Post-Phase-8 extension, live screenshot walkthrough of the built
 * detail pages): "Phần Xem chi tiết sản phẩm hoặc game nhìn còn quá đơn điệu với layout theo thứ
 * tự từ trên xuống nhìn quá thô và xấu không có điểm nhấn" — every field rendered as an identical
 * label+value block stacked top-to-bottom regardless of what it WAS (a price sat in the exact
 * same visual weight as a brand name), reading as a raw spec sheet, not a product page. Redesigned
 * below to categorize `bodyFields()` by role — schema-agnostic (no hardcoded field keys, so this
 * benefits every brand's Content Type: Sản phẩm/Game/Khóa học/Món ăn all get this for free):
 *   - `priceField()`: the first NUMBER field whose LABEL reads as currency ("Giá (VNĐ)", "Price"
 *     — see `isCurrencyLabel`), else just the first NUMBER field — shown large, bold, and
 *     formatted (`formatNumberFieldValue`, fixes the raw-"320000" complaint) right under the lead.
 *   - `leadField()`: the first short (<=200 char) TEXT field — shown as a lede paragraph under
 *     the H1, not buried mid-list with an ALL-CAPS "MÔ TẢ NGẮN" micro-label above it.
 *   - `metaFields()`: remaining short TEXT/RELATION fields (brand, category, ...) — a horizontal
 *     row of pills, not a vertical stack of label/value blocks.
 *   - everything else (`restFields()`: RICHTEXT, GALLERY, REPEATER, any leftover/long fields)
 *     renders below in the original field-by-field style, now with the same NUMBER formatting.
 * Media becomes a sticky column beside this header block on desktop (`lg:grid-cols-2`) instead
 * of a full-width banner sitting above a wall of text — the classic 2-column PDP layout.
 */
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
        return allFields().find((f) => f.type === EFieldType.IMAGE && hasValue(f.key));
    };
    const titleField = () => {
        const configured = layout()?.find((e) => e.slot === 'title' && e.visible);
        if (configured) return fieldByKey(configured.key);
        if (layout()?.length) return undefined;
        return allFields().find((f) => f.type === EFieldType.TEXT && hasValue(f.key));
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
        // `slug` is routing plumbing (the `:slug` path param this very page matched on — see
        // the Post-Phase-8 extension's "content-modeling requirement" finding), not something a
        // real customer wants to see spelled out on the page ("Đường dẫn (slug): hat-kho-...").
        // Only excluded from the DEFAULT (no admin `fieldLayout` configured) path — an admin who
        // explicitly added it to the Bố cục hiển thị body slots gets their explicit choice honored,
        // same as any other field.
        return allFields().filter((f) => f.key !== heroKey && f.key !== titleKey && f.key !== 'slug' && hasValue(f.key));
    };
    const valueOf = (key: string) => data()[key];

    // See the big comment above this component for the design rationale.
    const priceField = () => {
        const numberFields = bodyFields().filter((f) => f.type === EFieldType.NUMBER);
        if (!numberFields.length) return undefined;
        return numberFields.find((f) => isCurrencyLabel(f.label)) ?? numberFields[0];
    };
    const leadField = () => {
        const priceKey = priceField()?.key;
        return bodyFields().find((f) => {
            if (f.type !== EFieldType.TEXT || f.key === priceKey) return false;
            const v = valueOf(f.key);
            return typeof v === 'string' && v.length > 0 && v.length <= 200;
        });
    };
    const metaFields = () => {
        const priceKey = priceField()?.key;
        const leadKey = leadField()?.key;
        return bodyFields().filter((f) => {
            if (f.key === priceKey || f.key === leadKey) return false;
            if (f.type === EFieldType.RELATION) return true;
            if (f.type === EFieldType.TEXT) {
                const v = valueOf(f.key);
                return typeof v === 'string' && v.length > 0 && v.length <= 60;
            }
            return false;
        });
    };
    // REVIEW-2026-09-01.md §A.10 — a GALLERY/REPEATER field with 0 items (or any other field with
    // a genuinely empty value) still rendered its `field.label` heading below ("THƯ VIỆN ẢNH" and
    // similar), leaving an orphaned ALL-CAPS label sitting above nothing — confirmed live on both
    // the Học Viện course detail and Hương Việt món ăn detail templates. `restFields()` already
    // filters OUT fields consumed elsewhere (price/lead/meta); this extends the same filter to
    // also drop a field whose own value has nothing to show, so the label and its empty content
    // block disappear together rather than the label surviving alone.
    const restFields = () => {
        const used = new Set([priceField()?.key, leadField()?.key, ...metaFields().map((f) => f.key)].filter(Boolean));
        return bodyFields().filter((f) => {
            if (used.has(f.key)) return false;
            const v = valueOf(f.key);
            if (f.type === EFieldType.GALLERY || f.type === EFieldType.REPEATER) return Array.isArray(v) && v.length > 0;
            if (v === null || v === undefined) return false;
            if (typeof v === 'string') return v.trim().length > 0;
            return true;
        });
    };

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

    const mutedClass = () => (hasCustomBg() ? 'text-white/50' : 'text-neutral-400');
    const bodyTextClass = () => (hasCustomBg() ? 'text-white/80' : 'text-neutral-700');
    // Post-Phase-8 dogfooding find (user's own critique, point #11): a gray `bg-neutral-100`
    // pill with a "Label:" prefix on every meta value ("Danh mục: Thức ăn dặm") read as an
    // admin-dashboard field dump, not consumer-facing product copy — the exact "tạo cảm giác
    // admin dashboard, không phù hợp consumer website" complaint. Plain text, no background box,
    // no "Label:" prefix, values joined by a middle dot (`·`) instead — matches the user's own
    // proposed replacement ("Thức ăn dinh dưỡng · Cho chó & mèo") almost verbatim.
    const metaTextClass = () => (hasCustomBg() ? 'text-white/70' : 'text-neutral-500');
    // `sectionStyle()`'s own `color` (from `style.typography.color`) affects text via inheritance,
    // but the price needs to visibly stand OUT from body text, not just match it — an explicit
    // accent (not user-configurable yet; a real "brand accent color" wiring is a bigger follow-up,
    // out of scope for this pass) rather than plain inherited neutral-900/white.
    const priceAccentClass = () => (hasCustomBg() ? 'text-amber-300' : 'text-primary-600');

    return (
        <section use:nodeAnimation={props.node.animationRef} class="bg-white py-14 text-neutral-900 md:py-20" style={sectionStyle()}>
            <div class="mx-auto max-w-6xl px-6">
                <div classList={{ 'grid gap-10 lg:grid-cols-2 lg:items-start': !!heroImageField() }}>
                    <Show when={heroImageField()}>
                        {(field) => (
                            <div class="lg:sticky lg:top-24">
                                <img
                                    data-anim-target="image"
                                    src={valueOf(field().key)}
                                    alt={String(valueOf(titleField()?.key ?? '') ?? '')}
                                    class="aspect-4/5 w-full rounded-2xl object-cover shadow-lg lg:aspect-square"
                                />
                            </div>
                        )}
                    </Show>

                    <div>
                        <Show when={titleField()}>
                            {(field) => <h1 data-anim-target="heading" class="text-3xl font-bold tracking-tight md:text-5xl">{valueOf(field().key)}</h1>}
                        </Show>

                        <Show when={leadField()}>
                            {(field) => (
                                <p data-anim-target={field().key} class={`mt-4 text-lg leading-relaxed ${bodyTextClass()}`}>
                                    {valueOf(field().key)}
                                </p>
                            )}
                        </Show>

                        <Show when={priceField()}>
                            {(field) => (
                                <p data-anim-target={field().key} class={`mt-6 text-3xl font-bold tracking-tight ${priceAccentClass()}`}>
                                    {formatNumberFieldValue(valueOf(field().key), field().label)}
                                </p>
                            )}
                        </Show>

                        <Show when={metaFields().length}>
                            <div class={`mt-4 flex flex-wrap items-center gap-x-2 text-sm ${metaTextClass()}`}>
                                <For each={metaFields()}>
                                    {(field, i) => (
                                        <>
                                            <Show when={i() > 0}><span aria-hidden="true">·</span></Show>
                                            <span data-anim-target={field.key}>
                                                <Show when={field.type === EFieldType.RELATION} fallback={valueOf(field.key)}>
                                                    <RelationFieldDisplay field={field} value={valueOf(field.key)} valueClass="" />
                                                </Show>
                                            </span>
                                        </>
                                    )}
                                </For>
                            </div>
                        </Show>
                    </div>
                </div>

                <div class="mt-12 space-y-8 border-t border-neutral-100 pt-10">
                    <For each={restFields()}>
                        {(field) => {
                            const value = valueOf(field.key);
                            return (
                                <div data-anim-target={field.key}>
                                    <p class={`text-xs font-semibold uppercase tracking-wide ${mutedClass()}`}>{field.label}</p>
                                    {/* No `@tailwindcss/typography` plugin in this project (checked package.json) — `prose`
                                        was already a no-op class name here before this fix, contributing no color of its
                                        own. The sanitized HTML's raw <p>/<strong>/etc. tags have no color class of their
                                        own either, so they correctly inherit `color` from the <section> above (which now
                                        honors `style.typography.color` — see `sectionStyle()`) with zero extra code needed
                                        here. */}
                                    <Show when={field.type === EFieldType.RICHTEXT}>
                                        <div class="prose max-w-none mt-1" innerHTML={DOMPurify.sanitize(String(value ?? ''))} />
                                    </Show>
                                    <Show when={field.type === EFieldType.GALLERY}>
                                        <div class="mt-2 grid grid-cols-2 gap-3 md:grid-cols-3">
                                            <For each={(value as string[]) || []}>{(src) => <img src={src} class="aspect-square w-full rounded-lg object-cover" />}</For>
                                        </div>
                                    </Show>
                                    <Show when={field.type === EFieldType.REPEATER}>
                                        <RepeaterFieldDisplay field={field} items={(value as Record<string, unknown>[]) || []} itemSubFields={itemSubFields(field)} />
                                    </Show>
                                    <Show when={field.type === EFieldType.RELATION}>
                                        <RelationFieldDisplay field={field} value={value} valueClass={`mt-1 block ${bodyTextClass()}`} />
                                    </Show>
                                    <Show when={field.type === EFieldType.NUMBER}>
                                        <p class={`mt-1 ${bodyTextClass()}`}>{formatNumberFieldValue(value, field.label)}</p>
                                    </Show>
                                    <Show when={field.type !== EFieldType.RICHTEXT && field.type !== EFieldType.GALLERY && field.type !== EFieldType.IMAGE && field.type !== EFieldType.REPEATER && field.type !== EFieldType.RELATION && field.type !== EFieldType.NUMBER}>
                                        <p class={`mt-1 ${bodyTextClass()}`}>{String(value)}</p>
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
