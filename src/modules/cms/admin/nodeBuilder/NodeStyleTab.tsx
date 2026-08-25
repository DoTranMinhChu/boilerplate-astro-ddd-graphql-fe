// src/modules/cms/admin/nodeBuilder/NodeStyleTab.tsx
//
// Admin Style tab for the generic Node tree — restyled (Toolbar & Inspector
// Modernization) into 5 InspectorSections using SpacingControl/ColorControl/
// SliderInput. Same StyleObject read/write contract as before — every control
// still writes straight into `props.style.<group>.<field>` via `props.onChange`.
import { For, Show } from 'solid-js';
import { InputNumber } from '@core/components/control/InputNumber';
import { Select } from '@core/components/control/Select';
import { Checkbox } from '@core/components/control/Checkbox';
import { FONT_FAMILIES } from '@core/components/control/editor/commands/font';
import { InspectorSection } from '@core/components/control/InspectorSection';
import { SliderInput } from '@core/components/control/SliderInput';
import { ColorControl } from '@core/components/control/ColorControl';
import { SpacingControl } from '@core/components/control/SpacingControl';
import { TypographyColorControl } from './TypographyColorControl';
import type { StyleObject, HoverStyleOverride } from '@/modules/cms/node/node.types';
import { normalizeTypographyColor } from '@/modules/cms/node/node.types';
import { t, tOrLiteral } from '@/shared/i18n/t';

/** `size.width`/`size.height` are raw CSS length strings (applyNodeStyle.ts passes them
 * through verbatim), but the overwhelming majority of real edits are a plain pixel value —
 * same "recognize only the shape this Inspector itself writes" convention as
 * NodeContainerLayoutTab.tsx's `columnsOf`. A value in any other unit (e.g. hand-authored
 * `%`/`vh`) round-trips fine through `style.size` itself, just shows empty here rather than
 * guessing a px number that isn't really there. */
function pxToNumber(value: string | undefined): number | null {
    const m = /^(\d+(?:\.\d+)?)px$/.exec(value ?? '');
    return m ? parseFloat(m[1]) : null;
}
function numberToPx(value: number | null): string | undefined {
    return value == null ? undefined : `${value}px`;
}

export interface NodeStyleTabProps {
    style?: StyleObject;
    onChange: (next: StyleObject) => void;
    /** final-review fix round 3 (#2): the "Hiệu ứng nền → Thở" (breathe animation) control is
     * shown for every node type that has `style:true` capability (25 node types), but only
     * FrameNode.tsx actually renders the child-free background layer that control's persisted
     * `animate:'breathe'` value targets — every other node type would silently persist the
     * field with no visible effect. Mirrors the existing Frame-only gate precedent at
     * NodeBuilder.page.tsx's `behavior={selected()?.type === ENodeType.FRAME ? ... : undefined}`
     * call for `NodeContainerLayoutTab`. */
    isFrame?: boolean;
}

const LABEL_CLASS = 'mb-1 block text-xs font-medium text-nb-text-muted';

/** Preset `box-shadow` values (mirrors Tailwind's own shadow-sm/md/lg scale, applyNodeStyle.ts's
 * `effective.shadow` — a raw multi-layer array editor isn't a reasonable no-code Inspector
 * control, a small preset list is). `none` clears the field entirely (`undefined`, not `[]`) so
 * a node with no shadow round-trips identically to one that never had this field set. */
const SHADOW_PRESETS: Record<'none' | 'sm' | 'md' | 'lg', NonNullable<StyleObject['shadow']> | undefined> = {
    none: undefined,
    sm: [{ x: 0, y: 1, blur: 2, spread: 0, color: 'rgba(0,0,0,0.05)' }],
    md: [
        { x: 0, y: 4, blur: 6, spread: -1, color: 'rgba(0,0,0,0.1)' },
        { x: 0, y: 2, blur: 4, spread: -2, color: 'rgba(0,0,0,0.1)' },
    ],
    lg: [
        { x: 0, y: 10, blur: 15, spread: -3, color: 'rgba(0,0,0,0.1)' },
        { x: 0, y: 4, blur: 6, spread: -4, color: 'rgba(0,0,0,0.1)' },
    ],
};

export function NodeStyleTab(props: NodeStyleTabProps) {
    const style = () => props.style ?? {};

    const set = <K extends keyof StyleObject>(key: K, value: StyleObject[K]) =>
        props.onChange({ ...style(), [key]: value });
    const setHover = <K extends keyof HoverStyleOverride>(key: K, value: HoverStyleOverride[K]) =>
        set('hover', { ...style().hover, [key]: value });

    return (
        <>
            <InspectorSection title={t('cms.node.style.spacing')}>
                <div class="flex flex-col gap-3">
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

            <InspectorSection title={t('cms.node.style.size')}>
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
                </div>
            </InspectorSection>

            <InspectorSection title={t('cms.node.style.typography')}>
                <div class="flex flex-col gap-3">
                    <div>
                        <label class={LABEL_CLASS}>{t('cms.node.style.fontFamily')}</label>
                        <Select
                            clearable
                            value={style().typography?.fontFamily ?? ''}
                            onChange={(v) => set('typography', { ...style().typography, fontFamily: (v as string) || undefined })}
                            options={FONT_FAMILIES.map((f) => ({ value: f.value, label: f.title }))}
                            fieldless
                        />
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.style.fontSize')}</label>
                            <InputNumber
                                nullable
                                value={style().typography?.size ?? null}
                                onChange={(v) => set('typography', { ...style().typography, size: v ?? undefined })}
                                fieldless
                            />
                        </div>
                        <SliderInput
                            label={t('cms.node.style.fontWeight')}
                            value={style().typography?.weight ?? null}
                            min={100}
                            max={900}
                            step={100}
                            nullValue={400}
                            onChange={(v) => set('typography', { ...style().typography, weight: v ?? undefined })}
                        />
                    </div>
                    <TypographyColorControl
                        value={normalizeTypographyColor(style().typography?.color)}
                        onChange={(v) => set('typography', { ...style().typography, color: v })}
                    />
                    <div>
                        <label class={LABEL_CLASS}>{t('cms.node.style.textAlign')}</label>
                        <Select
                            value={style().typography?.align ?? 'left'}
                            onChange={(v) => set('typography', { ...style().typography, align: v as NonNullable<StyleObject['typography']>['align'] })}
                            options={[
                                { value: 'left', label: t('cms.node.style.alignLeft') },
                                { value: 'center', label: t('cms.node.style.alignCenter') },
                                { value: 'right', label: t('cms.node.style.alignRight') },
                                { value: 'justify', label: t('cms.node.style.alignJustify') },
                            ]}
                            fieldless
                        />
                    </div>
                    <div>
                        <label class={LABEL_CLASS}>{t('cms.node.style.maxLines')}</label>
                        <InputNumber
                            nullable
                            min={1}
                            value={style().typography?.maxLines ?? null}
                            onChange={(v) => set('typography', { ...style().typography, maxLines: v ?? undefined })}
                            fieldless
                        />
                    </div>
                </div>
            </InspectorSection>

            <InspectorSection title={t('cms.node.style.background')}>
                <div class="flex flex-col gap-3">
                    <Checkbox
                        value={!!style().background}
                        onChange={(on) => set('background', on ? { type: 'color', value: '#ffffffff' } : undefined)}
                        text={t('cms.node.style.backgroundEnabled')}
                        fieldless
                    />
                    <Show when={style().background}>
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.style.backgroundType')}</label>
                            <Select
                                value={style().background?.type ?? 'color'}
                                onChange={(v) => set('background', { ...style().background, type: v as NonNullable<StyleObject['background']>['type'] })}
                                options={[
                                    { value: 'color', label: t('cms.node.style.backgroundTypeColor') },
                                    { value: 'gradient', label: t('cms.node.style.backgroundTypeGradient') },
                                    { value: 'image', label: t('cms.node.style.backgroundTypeImage') },
                                    { value: 'video', label: t('cms.node.style.backgroundTypeVideo') },
                                ]}
                                fieldless
                            />
                        </div>
                        <Show when={style().background?.type === 'image' && props.isFrame}>
                            <div>
                                <label class={LABEL_CLASS}>{t('cms.node.style.backgroundAnimate')}</label>
                                <Select
                                    value={style().background?.animate ?? 'none'}
                                    options={[
                                        { value: 'none', label: t('cms.node.style.backgroundAnimateNone') },
                                        { value: 'breathe', label: t('cms.node.style.backgroundAnimateBreathe') },
                                    ]}
                                    onChange={(v: string) => set('background', { ...style().background, animate: v as 'none' | 'breathe' })}
                                    fieldless
                                />
                            </div>
                        </Show>
                        <ColorControl
                            label={t('cms.node.style.backgroundValue')}
                            value={style().background?.value}
                            defaultValue="#ffffffff"
                            onChange={(v) => set('background', { ...style().background, value: v })}
                        />
                    </Show>
                </div>
            </InspectorSection>

            <InspectorSection title={t('cms.node.style.border')}>
                <div class="flex flex-col gap-3">
                    <Checkbox
                        value={!!style().border}
                        onChange={(on) => set('border', on ? { width: 1, style: 'solid', color: '#e5e5e5ff' } : undefined)}
                        text={t('cms.node.style.borderEnabled')}
                        fieldless
                    />
                    <Show when={style().border}>
                        <div class="grid grid-cols-2 gap-2">
                            <div>
                                <label class={LABEL_CLASS}>{t('cms.node.style.borderWidth')}</label>
                                <InputNumber
                                    nullable
                                    value={style().border?.width ?? null}
                                    onChange={(v) => set('border', { ...style().border, width: v ?? undefined })}
                                    fieldless
                                />
                            </div>
                            <div>
                                <label class={LABEL_CLASS}>{t('cms.node.style.borderStyle')}</label>
                                <Select
                                    value={style().border?.style ?? 'solid'}
                                    onChange={(v) => set('border', { ...style().border, style: v as NonNullable<StyleObject['border']>['style'] })}
                                    options={[
                                        { value: 'solid', label: t('cms.node.style.borderStyleSolid') },
                                        { value: 'dashed', label: t('cms.node.style.borderStyleDashed') },
                                        { value: 'dotted', label: t('cms.node.style.borderStyleDotted') },
                                    ]}
                                    fieldless
                                />
                            </div>
                        </div>
                        <ColorControl
                            label={t('cms.node.style.borderColor')}
                            value={style().border?.color}
                            defaultValue="#e5e5e5ff"
                            onChange={(v) => set('border', { ...style().border, color: v })}
                        />
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.style.borderRadius')}</label>
                            <InputNumber
                                nullable
                                value={style().border?.radius?.tl ?? null}
                                onChange={(v) => set('border', { ...style().border, radius: v == null ? undefined : { tl: v, tr: v, br: v, bl: v } })}
                                fieldless
                            />
                        </div>
                    </Show>
                </div>
            </InspectorSection>

            <InspectorSection title={t('cms.node.style.effects')}>
                <div class="flex flex-col gap-3">
                    <SliderInput
                        label={t('cms.node.style.opacity')}
                        value={style().effects?.opacity ?? null}
                        min={0}
                        max={1}
                        step={0.01}
                        nullValue={1}
                        decimal
                        inputMin={0}
                        inputMax={1}
                        onChange={(v) => set('effects', { ...style().effects, opacity: v ?? undefined })}
                    />
                    <SliderInput
                        label={t('cms.node.style.grayscale')}
                        value={style().effects?.grayscale ?? null}
                        min={0}
                        max={100}
                        step={1}
                        nullValue={0}
                        onChange={(v) => set('effects', { ...style().effects, grayscale: v ?? undefined })}
                    />
                    <div>
                        <label class={LABEL_CLASS}>{tOrLiteral('cms.node.style.blur')}</label>
                        <InputNumber
                            nullable
                            min={0}
                            max={40}
                            value={style().effects?.blur ?? null}
                            onChange={(v) => set('effects', { ...style().effects, blur: v ?? undefined })}
                            fieldless
                        />
                    </div>
                    <div>
                        <label class={LABEL_CLASS}>{tOrLiteral('cms.node.style.backdropBlur')}</label>
                        <InputNumber
                            nullable
                            min={0}
                            max={40}
                            value={style().effects?.backdropBlur ?? null}
                            onChange={(v) => set('effects', { ...style().effects, backdropBlur: v ?? undefined })}
                            fieldless
                        />
                    </div>
                    <div>
                        <label class={LABEL_CLASS}>{tOrLiteral('cms.node.style.blendMode')}</label>
                        <Select
                            value={style().effects?.blendMode ?? 'normal'}
                            onChange={(v) => set('effects', { ...style().effects, blendMode: v === 'normal' ? undefined : (v as string) })}
                            options={[
                                { value: 'normal', label: tOrLiteral('cms.node.style.blendModeNormal') },
                                { value: 'multiply', label: tOrLiteral('cms.node.style.blendModeMultiply') },
                                { value: 'screen', label: tOrLiteral('cms.node.style.blendModeScreen') },
                                { value: 'overlay', label: tOrLiteral('cms.node.style.blendModeOverlay') },
                                { value: 'lighten', label: tOrLiteral('cms.node.style.blendModeLighten') },
                                { value: 'darken', label: tOrLiteral('cms.node.style.blendModeDarken') },
                            ]}
                            fieldless
                        />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class={LABEL_CLASS}>{t('cms.node.style.shadowLabel')}</label>
                        <div class="flex gap-1">
                            <For each={(['none', 'sm', 'md', 'lg'] as const)}>
                                {(presetKey) => (
                                    <button
                                        type="button"
                                        class="rounded-nb-sm border border-nb-border px-2 py-1 text-xs hover:bg-nb-bg-subtle"
                                        onClick={() => set('shadow', SHADOW_PRESETS[presetKey])}
                                    >
                                        {t(
                                            presetKey === 'none' ? 'cms.node.style.shadowNone'
                                                : presetKey === 'sm' ? 'cms.node.style.shadowSm'
                                                    : presetKey === 'md' ? 'cms.node.style.shadowMd'
                                                        : 'cms.node.style.shadowLg',
                                        )}
                                    </button>
                                )}
                            </For>
                        </div>
                        {/* Always-visible custom editor once ANY shadow is set (preset-picked or
                            hand-authored/legacy data) — the old reverse-lookup Select silently showed
                            non-preset shadow values as "none" with no way to see/edit the real value.
                            Single-layer only (`shadow[0]`): multi-layer shadow authoring stays out of
                            scope for v1, matching the spec's disclosed cuts — a multi-layer preset
                            (md/lg) picked from above still round-trips its full array untouched by
                            this editor, it just only exposes layer 0 for hand-editing. */}
                        <Show when={style().shadow?.length}>
                            <div class="grid grid-cols-2 gap-2 rounded-nb-sm border border-nb-border p-2">
                                <div>
                                    <label class={LABEL_CLASS}>{tOrLiteral('cms.node.style.shadowX')}</label>
                                    <InputNumber
                                        nullable
                                        value={style().shadow?.[0]?.x ?? 0}
                                        onChange={(v) => set('shadow', [{ ...(style().shadow?.[0] ?? { x: 0, y: 0, blur: 0, spread: 0, color: '#00000040' }), x: v ?? 0 }, ...(style().shadow?.slice(1) ?? [])])}
                                        fieldless
                                    />
                                </div>
                                <div>
                                    <label class={LABEL_CLASS}>{tOrLiteral('cms.node.style.shadowY')}</label>
                                    <InputNumber
                                        nullable
                                        value={style().shadow?.[0]?.y ?? 0}
                                        onChange={(v) => set('shadow', [{ ...(style().shadow?.[0] ?? { x: 0, y: 0, blur: 0, spread: 0, color: '#00000040' }), y: v ?? 0 }, ...(style().shadow?.slice(1) ?? [])])}
                                        fieldless
                                    />
                                </div>
                                <div>
                                    <label class={LABEL_CLASS}>{tOrLiteral('cms.node.style.shadowBlur')}</label>
                                    <InputNumber
                                        nullable
                                        min={0}
                                        value={style().shadow?.[0]?.blur ?? 0}
                                        onChange={(v) => set('shadow', [{ ...(style().shadow?.[0] ?? { x: 0, y: 0, blur: 0, spread: 0, color: '#00000040' }), blur: v ?? 0 }, ...(style().shadow?.slice(1) ?? [])])}
                                        fieldless
                                    />
                                </div>
                                <div>
                                    <label class={LABEL_CLASS}>{tOrLiteral('cms.node.style.shadowSpread')}</label>
                                    <InputNumber
                                        nullable
                                        value={style().shadow?.[0]?.spread ?? 0}
                                        onChange={(v) => set('shadow', [{ ...(style().shadow?.[0] ?? { x: 0, y: 0, blur: 0, spread: 0, color: '#00000040' }), spread: v ?? 0 }, ...(style().shadow?.slice(1) ?? [])])}
                                        fieldless
                                    />
                                </div>
                                <div class="col-span-2">
                                    <ColorControl
                                        label={tOrLiteral('cms.node.style.shadowColor')}
                                        value={style().shadow?.[0]?.color}
                                        defaultValue="#00000040"
                                        onChange={(v) => set('shadow', [{ ...(style().shadow?.[0] ?? { x: 0, y: 0, blur: 0, spread: 0 }), color: v ?? '#00000040' }, ...(style().shadow?.slice(1) ?? [])])}
                                    />
                                </div>
                            </div>
                        </Show>
                    </div>
                    <div>
                        <label class={LABEL_CLASS}>{t('cms.node.style.overflowLabel')}</label>
                        <Select
                            value={style().overflow ?? 'visible'}
                            onChange={(v) => set('overflow', (v as StyleObject['overflow']) === 'visible' ? undefined : (v as StyleObject['overflow']))}
                            options={[
                                { value: 'visible', label: t('cms.node.style.overflowVisible') },
                                { value: 'hidden', label: t('cms.node.style.overflowHidden') },
                                { value: 'auto', label: t('cms.node.style.overflowAuto') },
                            ]}
                            fieldless
                        />
                    </div>
                </div>
            </InspectorSection>

            <InspectorSection title={t('cms.node.style.transform')}>
                <div class="flex flex-col gap-3">
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.style.translateX')}</label>
                            <InputNumber
                                nullable
                                value={style().transform?.translateX ?? null}
                                onChange={(v) => set('transform', { ...style().transform, translateX: v ?? undefined })}
                                fieldless
                            />
                        </div>
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.style.translateY')}</label>
                            <InputNumber
                                nullable
                                value={style().transform?.translateY ?? null}
                                onChange={(v) => set('transform', { ...style().transform, translateY: v ?? undefined })}
                                fieldless
                            />
                        </div>
                    </div>
                    <div class="grid grid-cols-3 gap-2">
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.style.rotate')}</label>
                            <InputNumber
                                nullable
                                value={style().transform?.rotate ?? null}
                                onChange={(v) => set('transform', { ...style().transform, rotate: v ?? undefined })}
                                fieldless
                            />
                        </div>
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.style.scaleX')}</label>
                            <InputNumber
                                nullable
                                decimal
                                value={style().transform?.scaleX ?? null}
                                onChange={(v) => set('transform', { ...style().transform, scaleX: v ?? undefined })}
                                fieldless
                            />
                        </div>
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.style.scaleY')}</label>
                            <InputNumber
                                nullable
                                decimal
                                value={style().transform?.scaleY ?? null}
                                onChange={(v) => set('transform', { ...style().transform, scaleY: v ?? undefined })}
                                fieldless
                            />
                        </div>
                    </div>
                </div>
            </InspectorSection>

            <InspectorSection title={t('cms.node.style.hover')}>
                <div class="flex flex-col gap-3">
                    <div>
                        <label class={LABEL_CLASS}>{t('cms.node.style.hoverScope')}</label>
                        <Select
                            value={style().hover?.scope ?? 'self'}
                            onChange={(v) => setHover('scope', (v as HoverStyleOverride['scope']) === 'self' ? undefined : (v as HoverStyleOverride['scope']))}
                            options={[
                                { value: 'self', label: t('cms.node.style.hoverScopeSelf') },
                                { value: 'parent', label: t('cms.node.style.hoverScopeParent') },
                            ]}
                            fieldless
                        />
                    </div>
                    <TypographyColorControl
                        value={normalizeTypographyColor(style().hover?.typography?.color)}
                        onChange={(v) => setHover('typography', v ? { color: v } : undefined)}
                        hideVideoOption
                    />
                    <Checkbox
                        value={!!style().hover?.background}
                        onChange={(on) => setHover('background', on ? { type: 'color', value: '#ffffffff' } : undefined)}
                        text={t('cms.node.style.backgroundEnabled')}
                        fieldless
                    />
                    <Show when={style().hover?.background}>
                        <ColorControl
                            label={t('cms.node.style.background')}
                            value={style().hover?.background?.value}
                            defaultValue="#ffffffff"
                            onChange={(v) => setHover('background', { ...style().hover?.background, type: 'color', value: v })}
                        />
                    </Show>
                    <Checkbox
                        value={!!style().hover?.border}
                        onChange={(on) => setHover('border', on ? { width: 1, style: 'solid', color: '#e5e5e5ff' } : undefined)}
                        text={t('cms.node.style.borderEnabled')}
                        fieldless
                    />
                    <Show when={style().hover?.border}>
                        <ColorControl
                            label={t('cms.node.style.borderColor')}
                            value={style().hover?.border?.color}
                            defaultValue="#e5e5e5ff"
                            onChange={(v) => setHover('border', { ...style().hover?.border, width: style().hover?.border?.width ?? 1, color: v })}
                        />
                    </Show>
                    <SliderInput
                        label={t('cms.node.style.grayscale')}
                        value={style().hover?.effects?.grayscale ?? null}
                        min={0}
                        max={100}
                        step={1}
                        nullValue={0}
                        onChange={(v) => setHover('effects', { ...style().hover?.effects, grayscale: v ?? undefined })}
                    />
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.style.translateX')}</label>
                            <InputNumber
                                nullable
                                value={style().hover?.transform?.translateX ?? null}
                                onChange={(v) => setHover('transform', { ...style().hover?.transform, translateX: v ?? undefined })}
                                fieldless
                            />
                        </div>
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.style.translateY')}</label>
                            <InputNumber
                                nullable
                                value={style().hover?.transform?.translateY ?? null}
                                onChange={(v) => setHover('transform', { ...style().hover?.transform, translateY: v ?? undefined })}
                                fieldless
                            />
                        </div>
                    </div>
                </div>
            </InspectorSection>
        </>
    );
}
