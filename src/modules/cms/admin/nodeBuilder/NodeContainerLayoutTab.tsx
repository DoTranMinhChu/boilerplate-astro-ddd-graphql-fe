// src/modules/cms/admin/nodeBuilder/NodeContainerLayoutTab.tsx
//
// Container-layout Inspector tab (2026-08-19) — exposes `LayoutProps`'s container-facing
// fields (`display`/`gridTemplate`/`direction`/`wrap`), already fully supported by the render
// engine (applyNodeLayout.ts's `applyContainerLayout`, breakpoint-aware via
// `resolveEffectiveLayout`'s `responsiveOverrides` merge — same mechanism NodeTransformTab.tsx
// already uses for x/y/width/height) but never surfaced anywhere in the Inspector before this.
// Shown only for a node with `layoutMode !== 'free'` (a 'free' container is `position:relative`
// with absolutely-positioned children — none of these fields apply, see applyContainerLayout.ts).
// Same standalone-control pattern as NodeStyleTab.tsx (no `<Form>`/`<Field>` context, every
// control needs `fieldless`).
import { Show } from 'solid-js';
import { InputNumber } from '@core/components/control/InputNumber';
import { Select } from '@core/components/control/Select';
import { Checkbox } from '@core/components/control/Checkbox';
import { InspectorSection } from '@core/components/control/InspectorSection';
import type { LayoutProps } from '@/modules/cms/node/node.types';
import type { FrameBehaviorConfig } from '@/modules/cms/node/primitives/FrameNode';
import { t } from '@/shared/i18n/t';

const LABEL_CLASS = 'mb-1 block text-xs font-medium text-nb-text-muted';

export interface NodeContainerLayoutTabProps {
    layout?: LayoutProps;
    onChange: (next: LayoutProps) => void;
    /** Phase A2a — lives at node.props.behavior (NOT node.layout), a deliberately separate
     * prop pair from layout/onChange above since it patches a different part of the Node.
     * See docs/superpowers/specs/2026-08-21-frame-accordion-behavior-design.md §1/§4.
     * SpotlightList close-out (2026-08-22): `'spotlight-list'` is a SECOND behavior variant
     * (see FrameNode.tsx's `FrameBehaviorConfig`) — no extra fields of its own, so it's just a
     * bare `{ type: 'spotlight-list' }`; the `defaultOpen` Checkbox below stays gated to
     * `accordion-item` only.
     * Task 3 (2026-08-23): `'carousel'` adds `autoplayMs` (number, default 2300) and
     * `pagination` (one of 'dots'|'arrows-counter'|'none') — renders conditional UI for both. */
    behavior?: FrameBehaviorConfig;
    onBehaviorChange?: (next: FrameBehaviorConfig | undefined) => void;
}

/** `gridTemplate` is a raw CSS `grid-template-columns` string (applyNodeLayout.ts passes it
 * straight through) — this Inspector only ever WRITES the single uniform shape
 * `repeat(N, 1fr)`, so reading it back only recognizes that exact shape (any other value,
 * e.g. hand-authored via a future raw-CSS escape hatch, shows as empty rather than guessing a
 * column count that isn't really there). */
function columnsOf(gridTemplate: string | undefined): number | null {
    const m = /^repeat\((\d+),\s*1fr\)$/.exec(gridTemplate ?? '');
    return m ? parseInt(m[1], 10) : null;
}

export function NodeContainerLayoutTab(props: NodeContainerLayoutTabProps) {
    const layout = () => props.layout ?? {};
    const set = <K extends keyof LayoutProps>(key: K, value: LayoutProps[K]) =>
        props.onChange({ ...layout(), [key]: value });
    const display = () => layout().display ?? 'flex';
    // `FrameBehaviorConfig` is ONE interface with a union `type` field (not a discriminated
    // union of 3 separate object types), so `autoplayMs`/`pagination` are already optional on
    // it directly — no `Extract<...>` narrowing needed (and `Extract` against a non-union type
    // resolves to `never`, which is exactly what broke here after switching to the shared type).
    const carousel = () => props.behavior;

    return (
        <>
        <InspectorSection title={t('cms.node.containerLayout.title')}>
            <div class="flex flex-col gap-3">
                <div>
                    <label class={LABEL_CLASS}>{t('cms.node.containerLayout.displayLabel')}</label>
                    <Select
                        value={display()}
                        options={[
                            { value: 'flex', label: t('cms.node.containerLayout.displayFlex') },
                            { value: 'grid', label: t('cms.node.containerLayout.displayGrid') },
                        ]}
                        onChange={(v) => set('display', v as 'flex' | 'grid')}
                        fieldless
                    />
                </div>
                <div>
                    <label class={LABEL_CLASS}>{t('cms.node.containerLayout.containerWidthLabel')}</label>
                    {/* Root-caused live crash (systematic-debugging, 2026-09-01): missing `clearable`
                        here combined with `Select.tsx`'s auto-select-first-option `createEffect`
                        (fires whenever a NON-clearable Select's value is falsy) formed a genuine
                        infinite loop for any Frame whose `containerWidth` is unset (the common
                        case) — the effect "auto-selects" this list's own first option (the
                        explicit `value: ''` "Không (mặc định)" placeholder), `onChange` normalizes
                        `''` back to `undefined` via `(v || undefined)`, which still reads back as
                        `''` through the `?? ''` above, so `!value()` never becomes false and the
                        effect refires on every remount — amplified into a real
                        "Maximum call stack size exceeded" by `buildNodeTree.ts`'s own documented
                        "brand-new object references on every store write" behavior (see its
                        Task-5-drag-gesture comment elsewhere in this file), which remounts the
                        WHOLE canvas (and this Select fresh) on every such write. `clearable` is the
                        correct fix, not a workaround: this field's "unset" state is a real,
                        permanent, valid value (mirrors NodeAnimationTab.tsx's `easing` Select,
                        the only other Select in this admin with the same "explicit `value: ''`
                        first option" shape — already `clearable` there), so the auto-select
                        effect (designed for genuinely-must-have-a-value Selects) should never
                        have applied to it in the first place. */}
                    <Select
                        clearable
                        value={layout().containerWidth ?? ''}
                        options={[
                            { value: '', label: t('cms.node.containerLayout.containerWidthNone') },
                            { value: 'content', label: t('cms.node.containerLayout.containerWidthContent') },
                            { value: 'wide', label: t('cms.node.containerLayout.containerWidthWide') },
                            { value: 'full', label: t('cms.node.containerLayout.containerWidthFull') },
                        ]}
                        onChange={(v) => set('containerWidth', (v || undefined) as LayoutProps['containerWidth'])}
                        fieldless
                    />
                </div>
                <Show when={display() === 'grid'}>
                    <div>
                        <label class={LABEL_CLASS}>{t('cms.node.containerLayout.columnsLabel')}</label>
                        <InputNumber
                            nullable
                            min={1}
                            value={columnsOf(layout().gridTemplate)}
                            onChange={(v) => set('gridTemplate', v ? `repeat(${v}, 1fr)` : undefined)}
                            fieldless
                        />
                    </div>
                </Show>
                {/* Real editor gap found live (Post-Phase-8 dogfooding): `LayoutProps.gap` — the
                    actual CSS `gap` `applyContainerLayout` puts on THIS Frame's own flex/grid
                    children (confirmed via a live FAQ Frame carrying `layout.gap:8` with zero way
                    to change it) — had NO Inspector control anywhere. The Style tab's
                    confusingly-similarly-labeled "Khoảng cách giữa các phần tử" field
                    (NodeStyleTab.tsx) writes `style.spacing.gap` instead, a DIFFERENT field with
                    no visible effect on a Frame's own container gap — editing it (repeatedly, on a
                    real page) silently did nothing. This field is deliberately labelled
                    differently ("...giữa các CON", not "...giữa các phần tử") to not collide with
                    that existing Style-tab control in the admin's mental model. */}
                <div>
                    <label class={LABEL_CLASS}>{t('cms.node.containerLayout.gapLabel')}</label>
                    <InputNumber
                        nullable
                        min={0}
                        value={layout().gap ?? null}
                        onChange={(v) => set('gap', v ?? undefined)}
                        fieldless
                    />
                </div>
                <Show when={display() === 'flex'}>
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.containerLayout.directionLabel')}</label>
                            <Select
                                value={layout().direction ?? 'column'}
                                options={[
                                    { value: 'row', label: t('cms.node.containerLayout.directionRow') },
                                    { value: 'column', label: t('cms.node.containerLayout.directionColumn') },
                                ]}
                                onChange={(v) => set('direction', v as 'row' | 'column')}
                                fieldless
                            />
                        </div>
                        <div class="flex items-center justify-between">
                            <label class={LABEL_CLASS}>{t('cms.node.containerLayout.wrapLabel')}</label>
                            <Checkbox value={!!layout().wrap} onChange={(v) => set('wrap', v || undefined)} fieldless />
                        </div>
                    </div>
                </Show>
            </div>
        </InspectorSection>
        <InspectorSection title={t('cms.node.containerLayout.behaviorLabel')}>
            <div class="flex flex-col gap-3">
                <Select
                    value={props.behavior?.type ?? 'none'}
                    options={[
                        { value: 'none', label: t('cms.node.containerLayout.behaviorNone') },
                        { value: 'accordion-item', label: t('cms.node.containerLayout.behaviorAccordionItem') },
                        { value: 'spotlight-list', label: t('cms.node.containerLayout.behaviorSpotlightList') },
                        { value: 'carousel', label: t('cms.node.containerLayout.behaviorCarousel') },
                    ]}
                    onChange={(v: string) => props.onBehaviorChange?.(
                        v === 'accordion-item' ? { type: 'accordion-item' }
                        : v === 'spotlight-list' ? { type: 'spotlight-list' }
                        : v === 'carousel' ? { type: 'carousel', autoplayMs: 2300, pagination: 'dots' }
                        : undefined
                    )}
                    fieldless
                />
                {/* `defaultOpen` only applies to the accordion-item variant of `behavior` — the
                    `<Show>` guard is what makes that true at runtime; `FrameBehaviorConfig` is a
                    flat interface (not a discriminated union), so `defaultOpen` reads directly,
                    no cast needed. */}
                <Show when={props.behavior?.type === 'accordion-item'}>
                    <Checkbox
                        value={!!props.behavior?.defaultOpen}
                        onChange={(v) => props.onBehaviorChange?.({ type: 'accordion-item', defaultOpen: v })}
                        text={t('cms.node.containerLayout.behaviorDefaultOpenLabel')}
                        fieldless
                    />
                </Show>
                {/* Carousel-specific fields: autoplayMs number input and pagination select */}
                <Show when={props.behavior?.type === 'carousel'}>
                    <div class="flex flex-col gap-3">
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.containerLayout.autoplayMsLabel')}</label>
                            <InputNumber
                                nullable
                                min={1}
                                value={carousel()?.autoplayMs ?? 2300}
                                onChange={(v) => props.onBehaviorChange?.({ type: 'carousel', autoplayMs: v ?? 2300, pagination: carousel()?.pagination ?? 'dots' })}
                                fieldless
                            />
                        </div>
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.containerLayout.paginationLabel')}</label>
                            <Select
                                value={carousel()?.pagination ?? 'dots'}
                                options={[
                                    { value: 'dots', label: t('cms.node.containerLayout.paginationDots') },
                                    { value: 'arrows-counter', label: t('cms.node.containerLayout.paginationArrowsCounter') },
                                    { value: 'none', label: t('cms.node.containerLayout.paginationNone') },
                                ]}
                                onChange={(v: string) => props.onBehaviorChange?.({ type: 'carousel', autoplayMs: carousel()?.autoplayMs ?? 2300, pagination: v as 'dots' | 'arrows-counter' | 'none' })}
                                fieldless
                            />
                        </div>
                    </div>
                </Show>
            </div>
        </InspectorSection>
        </>
    );
}
