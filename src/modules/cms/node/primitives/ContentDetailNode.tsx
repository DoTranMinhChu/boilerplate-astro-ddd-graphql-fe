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
import { For, Show, createResource, createSignal } from 'solid-js';
import DOMPurify from 'isomorphic-dompurify';
import type { NodeComponentProps } from '../nodeRegistry';
import type { FieldDefinitionDTO } from '@/modules/cms/cms.types';
import { ContentTypeService } from '@/shared/services/contentType/contentType.service';

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

/** Node primitive tương đương `ContentDetailSection.tsx` — tự render TOÀN BỘ field của
 * ContextEntry hiện tại theo đúng FieldDefinition[] của ContentType, không cần code riêng cho
 * từng loại Object Type. */
export function ContentDetailNode(props: NodeComponentProps) {
    const contentTypeId = () => props.node.props?.contentTypeId as string | undefined;
    const [contentType] = createResource(contentTypeId, (id) => ContentTypeService.getOneContentType({ id }));

    const allFields = () => (contentType()?.fields || []).filter((f): f is FieldDefinitionDTO & { key: string } => !!f?.key);
    const itemSubFields = (field: FieldDefinitionDTO) =>
        (field.itemFields || []).filter((f): f is FieldDefinitionDTO & { key: string } => !!f?.key);
    const data = () => props.context.contextEntry || {};
    const hasValue = (key: string) => data()[key] !== undefined && data()[key] !== null && data()[key] !== '';

    const heroImageField = () => allFields().find((f) => f.type === 'IMAGE' && hasValue(f.key));
    const titleField = () => allFields().find((f) => f.type === 'TEXT' && hasValue(f.key));
    const bodyFields = () => {
        const heroKey = heroImageField()?.key;
        const titleKey = titleField()?.key;
        return allFields().filter((f) => f.key !== heroKey && f.key !== titleKey && hasValue(f.key));
    };
    const valueOf = (key: string) => data()[key];

    return (
        <section class="bg-white py-14 text-neutral-900 md:py-20">
            <div class="mx-auto max-w-4xl px-6">
                <Show when={heroImageField()}>
                    {(field) => (
                        <img src={valueOf(field().key)} alt={String(valueOf(titleField()?.key ?? '') ?? '')} class="mb-8 w-full rounded-2xl object-cover shadow-lg" />
                    )}
                </Show>
                <Show when={titleField()}>
                    {(field) => <h1 class="text-3xl md:text-5xl font-bold tracking-tight">{valueOf(field().key)}</h1>}
                </Show>
                <div class="mt-8 space-y-6">
                    <For each={bodyFields()}>
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
                                            <For each={(value as string[]) || []}>{(src) => <img src={src} class="aspect-square w-full rounded-lg object-cover" />}</For>
                                        </div>
                                    </Show>
                                    <Show when={field.type === 'REPEATER'}>
                                        <RepeaterFieldDisplay field={field} items={(value as Record<string, unknown>[]) || []} itemSubFields={itemSubFields(field)} />
                                    </Show>
                                    <Show when={field.type !== 'RICHTEXT' && field.type !== 'GALLERY' && field.type !== 'IMAGE' && field.type !== 'REPEATER'}>
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
