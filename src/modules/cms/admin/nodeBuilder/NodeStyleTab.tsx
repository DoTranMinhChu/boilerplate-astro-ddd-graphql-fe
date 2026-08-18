// src/modules/cms/admin/nodeBuilder/NodeStyleTab.tsx
//
// Admin Style tab for the generic Node tree (Task 24) — same level of directness as
// the existing Section `StyleTab.tsx` (no generic style-schema abstraction): one
// fieldset per `StyleObject` sub-section, each control writing straight into
// `props.style.<group>.<field>` via `props.onChange`.
//
// Control APIs here are the REAL signatures read from @core/components/control/* —
// notably: none of Input/InputNumber/Select carry a `label` prop (labels are plain
// markup next to the control, per StyleTab.tsx / GenericFilterListInput.tsx), the
// change handler is `onChange` (not `onInput`), and every control needs `fieldless`
// since this tab is used outside any `<Form>`/`<Field>` context.
import { InputNumber } from '@core/components/control/InputNumber';
import { Select } from '@core/components/control/Select';
import { FONT_FAMILIES } from '@core/components/control/editor/commands/font';
import { ColorPickerField } from '@/modules/cms/admin/builder/ColorPickerField';
import type { StyleObject } from '@/modules/cms/node/node.types';
import { t } from '@/shared/i18n/t';

export interface NodeStyleTabProps {
    style?: StyleObject;
    onChange: (next: StyleObject) => void;
}

const LABEL_CLASS = 'mb-1 block text-xs font-medium text-neutral-500';
const LEGEND_CLASS = 'text-sm font-semibold';

/** No-code style controls for a single tree Node — spacing/typography/background/
 * border/effects, hand-wired straight to `StyleObject` (Task 10). Consumed by
 * Task 25's `NodeInspector`. */
export function NodeStyleTab(props: NodeStyleTabProps) {
    const style = () => props.style ?? {};

    const set = <K extends keyof StyleObject>(key: K, value: StyleObject[K]) =>
        props.onChange({ ...style(), [key]: value });

    return (
        <div class="flex flex-col gap-6 p-4">
            <fieldset class="flex flex-col gap-2">
                <legend class={LEGEND_CLASS}>{t('cms.node.style.spacing')}</legend>
                <div class="grid grid-cols-4 gap-2">
                    <div>
                        <label class={LABEL_CLASS}>{t('cms.node.style.paddingTop')}</label>
                        <InputNumber
                            nullable
                            value={style().spacing?.padding?.t ?? null}
                            onChange={(v) => set('spacing', { ...style().spacing, padding: { ...style().spacing?.padding, t: v ?? undefined } })}
                            fieldless
                        />
                    </div>
                    <div>
                        <label class={LABEL_CLASS}>{t('cms.node.style.paddingRight')}</label>
                        <InputNumber
                            nullable
                            value={style().spacing?.padding?.r ?? null}
                            onChange={(v) => set('spacing', { ...style().spacing, padding: { ...style().spacing?.padding, r: v ?? undefined } })}
                            fieldless
                        />
                    </div>
                    <div>
                        <label class={LABEL_CLASS}>{t('cms.node.style.paddingBottom')}</label>
                        <InputNumber
                            nullable
                            value={style().spacing?.padding?.b ?? null}
                            onChange={(v) => set('spacing', { ...style().spacing, padding: { ...style().spacing?.padding, b: v ?? undefined } })}
                            fieldless
                        />
                    </div>
                    <div>
                        <label class={LABEL_CLASS}>{t('cms.node.style.paddingLeft')}</label>
                        <InputNumber
                            nullable
                            value={style().spacing?.padding?.l ?? null}
                            onChange={(v) => set('spacing', { ...style().spacing, padding: { ...style().spacing?.padding, l: v ?? undefined } })}
                            fieldless
                        />
                    </div>
                </div>
                <div>
                    <label class={LABEL_CLASS}>{t('cms.node.style.gap')}</label>
                    <InputNumber
                        nullable
                        value={style().spacing?.gap ?? null}
                        onChange={(v) => set('spacing', { ...style().spacing, gap: v ?? undefined })}
                        fieldless
                    />
                </div>
            </fieldset>

            <fieldset class="flex flex-col gap-2">
                <legend class={LEGEND_CLASS}>{t('cms.node.style.typography')}</legend>
                <div>
                    <label class={LABEL_CLASS}>{t('cms.node.style.fontFamily')}</label>
                    <Select
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
                    <div>
                        <label class={LABEL_CLASS}>{t('cms.node.style.fontWeight')}</label>
                        <InputNumber
                            nullable
                            value={style().typography?.weight ?? null}
                            onChange={(v) => set('typography', { ...style().typography, weight: v ?? undefined })}
                            fieldless
                            slider={{ min: 100, max: 900, step: 100 }}
                        />
                    </div>
                </div>
                <ColorPickerField
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
            </fieldset>

            <fieldset class="flex flex-col gap-2">
                <legend class={LEGEND_CLASS}>{t('cms.node.style.background')}</legend>
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
                <ColorPickerField
                    label={t('cms.node.style.backgroundValue')}
                    value={style().background?.value}
                    defaultValue="#ffffff"
                    onChange={(v) => set('background', { ...style().background, value: v })}
                />
            </fieldset>

            <fieldset class="flex flex-col gap-2">
                <legend class={LEGEND_CLASS}>{t('cms.node.style.border')}</legend>
                <div class="grid grid-cols-3 gap-2">
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
                    <ColorPickerField
                        label={t('cms.node.style.borderColor')}
                        value={style().border?.color}
                        defaultValue="#e5e5e5"
                        onChange={(v) => set('border', { ...style().border, color: v })}
                    />
                </div>
            </fieldset>

            <fieldset class="flex flex-col gap-2">
                <legend class={LEGEND_CLASS}>{t('cms.node.style.effects')}</legend>
                <div>
                    <label class={LABEL_CLASS}>{t('cms.node.style.opacity')}</label>
                    <InputNumber
                        nullable
                        min={0}
                        max={1}
                        decimal
                        value={style().effects?.opacity ?? null}
                        onChange={(v) => set('effects', { ...style().effects, opacity: v ?? undefined })}
                        fieldless
                        slider={{ min: 0, max: 1, step: 0.01 }}
                    />
                </div>
            </fieldset>
        </div>
    );
}
