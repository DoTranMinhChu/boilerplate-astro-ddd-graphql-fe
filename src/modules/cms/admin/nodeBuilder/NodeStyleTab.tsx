// src/modules/cms/admin/nodeBuilder/NodeStyleTab.tsx
//
// Admin Style tab for the generic Node tree — restyled (Toolbar & Inspector
// Modernization) into 5 InspectorSections using SpacingControl/ColorControl/
// SliderInput. Same StyleObject read/write contract as before — every control
// still writes straight into `props.style.<group>.<field>` via `props.onChange`.
import { InputNumber } from '@core/components/control/InputNumber';
import { Select } from '@core/components/control/Select';
import { FONT_FAMILIES } from '@core/components/control/editor/commands/font';
import { InspectorSection } from '@core/components/control/InspectorSection';
import { SliderInput } from '@core/components/control/SliderInput';
import { ColorControl } from '@core/components/control/ColorControl';
import { SpacingControl } from '@core/components/control/SpacingControl';
import type { StyleObject } from '@/modules/cms/node/node.types';
import { t } from '@/shared/i18n/t';

export interface NodeStyleTabProps {
    style?: StyleObject;
    onChange: (next: StyleObject) => void;
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

/** Reverse-lookup for the Select's current value — matches by deep-equality against the 3 real
 * presets so a value the admin picked from this same Select round-trips back to its label; any
 * OTHER shadow shape (hand-authored via a future raw editor, or legacy data) falls back to 'none'
 * being shown as selected rather than crashing — the underlying `style().shadow` value itself is
 * untouched either way, only the Select's displayed selection is approximate for non-preset data. */
function shadowPresetKeyOf(shadow: StyleObject['shadow']): 'none' | 'sm' | 'md' | 'lg' {
    const key = (Object.keys(SHADOW_PRESETS) as (keyof typeof SHADOW_PRESETS)[]).find(
        (k) => JSON.stringify(SHADOW_PRESETS[k]) === JSON.stringify(shadow ?? undefined),
    );
    return key ?? 'none';
}

export function NodeStyleTab(props: NodeStyleTabProps) {
    const style = () => props.style ?? {};

    const set = <K extends keyof StyleObject>(key: K, value: StyleObject[K]) =>
        props.onChange({ ...style(), [key]: value });

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
                    <ColorControl
                        label={t('cms.node.style.textColor')}
                        value={style().typography?.color}
                        defaultValue="#171717"
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
                    <ColorControl
                        label={t('cms.node.style.backgroundValue')}
                        value={style().background?.value}
                        defaultValue="#ffffff"
                        onChange={(v) => set('background', { ...style().background, value: v })}
                    />
                </div>
            </InspectorSection>

            <InspectorSection title={t('cms.node.style.border')}>
                <div class="flex flex-col gap-3">
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
                        defaultValue="#e5e5e5"
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
                    <div>
                        <label class={LABEL_CLASS}>{t('cms.node.style.shadowLabel')}</label>
                        <Select
                            value={shadowPresetKeyOf(style().shadow)}
                            onChange={(v) => set('shadow', SHADOW_PRESETS[v as keyof typeof SHADOW_PRESETS])}
                            options={[
                                { value: 'none', label: t('cms.node.style.shadowNone') },
                                { value: 'sm', label: t('cms.node.style.shadowSm') },
                                { value: 'md', label: t('cms.node.style.shadowMd') },
                                { value: 'lg', label: t('cms.node.style.shadowLg') },
                            ]}
                            fieldless
                        />
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
        </>
    );
}
