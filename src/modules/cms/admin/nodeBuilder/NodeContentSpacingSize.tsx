// src/modules/cms/admin/nodeBuilder/NodeContentSpacingSize.tsx
//
// Property Inspector redesign, Task 5 — the "Nội dung" tab's Spacing + Size +
// (Image-only) Position group, extracted out of NodeStyleTab.tsx: Spacing and Size are
// content-shaping fields, not decoration, so per the redesign spec's corrected §2 they
// belong under "Nội dung" rather than "Kiểu dáng".
//
// Same StyleObject read/write contract as NodeStyleTab.tsx (and every other Inspector
// section in this module): each control writes straight into
// `props.style.<group>.<field>` via `props.onChange`, spreading the rest of the object
// so a sibling group is never clobbered.
//
// One field here is genuinely NEW rather than moved: `spacing.margin`. The data field
// (node.types.ts's `StyleObject['spacing']['margin']`) and its render-time application
// (applyNodeStyle.ts) both already existed — only the UI control was missing.
import { Show } from 'solid-js';
import { InputNumber } from '@core/components/control/InputNumber';
import { Select } from '@core/components/control/Select';
import { InspectorSection } from '@core/components/control/InspectorSection';
import { SpacingControl } from '@core/components/control/SpacingControl';
import type { StyleObject } from '@/modules/cms/node/node.types';
import { t } from '@/shared/i18n/t';

const LABEL_CLASS = 'mb-1 block text-xs font-medium text-nb-text-muted';

/** `size.width`/`size.height` are raw CSS length strings (applyNodeStyle.ts passes them
 * through verbatim), but the overwhelming majority of real edits are a plain pixel value —
 * same "recognize only the shape this Inspector itself writes" convention as
 * NodeContainerLayoutTab.tsx's `columnsOf`. A value in any other unit (e.g. hand-authored
 * `%`/`vh`) round-trips fine through `style.size` itself, just shows empty here rather than
 * guessing a px number that isn't really there. (Moved here with the Size section — this
 * pair no longer has any caller left in NodeStyleTab.tsx.) */
function pxToNumber(value: string | undefined): number | null {
    const m = /^(\d+(?:\.\d+)?)px$/.exec(value ?? '');
    return m ? parseFloat(m[1]) : null;
}
function numberToPx(value: number | null): string | undefined {
    return value == null ? undefined : `${value}px`;
}

export interface NodeContentSpacingSizeProps {
    style?: StyleObject;
    onChange: (next: StyleObject) => void;
    /** Gates the focal-point (Position) fields — same Image-only gating convention (and prop
     * name) NodeStyleTab.tsx already uses for its remaining art-direction controls. */
    isImage?: boolean;
    /** Property Inspector Phase 4 (Task 5) — the panel-level property-search query, forwarded
     * verbatim to every `InspectorSection` below so a non-matching query hides them. A PLAIN
     * STRING, not an accessor: `InspectorSection.searchQuery` is `string | undefined`, and the
     * reactivity is carried by reading `props.searchQuery` fresh inside each JSX prop position.
     * Never destructure it (`const { searchQuery } = props`) — that would freeze the value at
     * this component's initial mount and the sections would stop reacting to the search box. */
    searchQuery?: string;
}

export function NodeContentSpacingSize(props: NodeContentSpacingSizeProps) {
    const style = () => props.style ?? {};

    const set = <K extends keyof StyleObject>(key: K, value: StyleObject[K]) =>
        props.onChange({ ...style(), [key]: value });

    return (
        <>
            <InspectorSection
                title={t('cms.node.style.spacing')}
                searchQuery={props.searchQuery}
                isModified={!!(style().spacing?.margin || style().spacing?.padding || style().spacing?.gap)}
                onReset={() => set('spacing', undefined)}
                resetButtonLabel={t('cms.node.transform.resetButton')}
            >
                <div class="flex flex-col gap-3">
                    <SpacingControl
                        label={t('cms.node.style.margin')}
                        value={style().spacing?.margin}
                        onChange={(next) => set('spacing', { ...style().spacing, margin: next })}
                    />
                    <SpacingControl
                        label={t('cms.node.style.padding')}
                        value={style().spacing?.padding}
                        onChange={(next) => set('spacing', { ...style().spacing, padding: next })}
                    />
                    <div>
                        <label class={LABEL_CLASS}>{t('cms.node.style.gap')}</label>
                        <InputNumber
                            nullable
                            value={style().spacing?.gap ?? null}
                            onChange={(v) => set('spacing', { ...style().spacing, gap: v ?? undefined })}
                            fieldless
                        />
                    </div>
                </div>
            </InspectorSection>

            <InspectorSection
                title={t('cms.node.style.size')}
                searchQuery={props.searchQuery}
                isModified={!!style().size || !!(props.isImage && style().image?.focalPoint)}
                onReset={() => props.onChange({
                    ...style(),
                    size: undefined,
                    ...(props.isImage ? { image: { ...style().image, focalPoint: undefined } } : {}),
                })}
                resetButtonLabel={t('cms.node.transform.resetButton')}
            >
                <div class="flex flex-col gap-3">
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.style.sizeWidth')}</label>
                            <InputNumber
                                nullable
                                min={0}
                                value={pxToNumber(style().size?.width)}
                                onChange={(v) => set('size', { ...style().size, width: numberToPx(v) })}
                                fieldless
                            />
                        </div>
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.style.sizeHeight')}</label>
                            <InputNumber
                                nullable
                                min={0}
                                value={pxToNumber(style().size?.height)}
                                onChange={(v) => set('size', { ...style().size, height: numberToPx(v) })}
                                fieldless
                            />
                        </div>
                    </div>
                    <div>
                        <label class={LABEL_CLASS}>{t('cms.node.style.objectFit')}</label>
                        <Select
                            clearable
                            value={style().size?.objectFit ?? ''}
                            onChange={(v) => set('size', { ...style().size, objectFit: (v as NonNullable<StyleObject['size']>['objectFit']) || undefined })}
                            options={[
                                { value: 'cover', label: t('cms.node.style.objectFitCover') },
                                { value: 'contain', label: t('cms.node.style.objectFitContain') },
                                { value: 'fill', label: t('cms.node.style.objectFitFill') },
                            ]}
                            fieldless
                        />
                    </div>
                    {/* Position — the image focal point, i.e. WHICH part of the image survives a
                        `cover` crop. Kept inside the Size section (rather than a section of its
                        own) because it is only meaningful together with the width/height/objectFit
                        above it; the rest of the old "Ảnh" art-direction group
                        (aspectRatio/treatment/duotone/overlayGradient/mask/revealOnScroll) stays in
                        NodeStyleTab.tsx. */}
                    <Show when={props.isImage}>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class={LABEL_CLASS}>{t('cms.node.image.focalPointX')}</label>
                                <InputNumber
                                    nullable
                                    min={0}
                                    max={100}
                                    value={style().image?.focalPoint?.x ?? null}
                                    onChange={(v) => set('image', { ...style().image, focalPoint: v == null ? undefined : { x: v, y: style().image?.focalPoint?.y ?? 50 } })}
                                    fieldless
                                />
                            </div>
                            <div>
                                <label class={LABEL_CLASS}>{t('cms.node.image.focalPointY')}</label>
                                <InputNumber
                                    nullable
                                    min={0}
                                    max={100}
                                    value={style().image?.focalPoint?.y ?? null}
                                    onChange={(v) => set('image', { ...style().image, focalPoint: v == null ? undefined : { x: style().image?.focalPoint?.x ?? 50, y: v } })}
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
