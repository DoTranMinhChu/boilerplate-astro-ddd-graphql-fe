// src/modules/cms/admin/nodeBuilder/NodeStyleEffectsTab.tsx
//
// Property Inspector redesign, Task 7 — the "Hiệu ứng" tab's *remaining Style sections*: CSS
// transform (translate/rotate/scale), hover interactions, and image art-direction, extracted
// VERBATIM out of NodeStyleTab.tsx (which Task 6 moved wholesale into the "Kiểu dáng" tab even
// though these three sections belong in "Hiệu ứng" per the redesign spec's §2). Nothing about
// the StyleObject read/write contract changed: every control still writes straight into
// `props.style.<group>.<field>` via `props.onChange`, with the same `set()`/`setHover()`
// helpers, field names and option lists NodeStyleTab used. This task only moves the JSX to
// the right tab — Phase 2 is where the effect PICKER itself gets the visual-card treatment.
//
// The caller (NodeBuilder.page.tsx) passes this component the SAME `style`/`onChange` slot
// (`previewBreakpoint()`-aware) it passes NodeStyleTab: the two components own DISJOINT
// sub-keys of StyleObject (`transform`/`hover`/`image` here; typography/background/border/
// shadow/effects/overflow there) and each spreads the rest, so neither can clobber the other.
import { createSignal, For, Show } from 'solid-js';
import { InputNumber } from '@core/components/control/InputNumber';
import { Select } from '@core/components/control/Select';
import { Checkbox } from '@core/components/control/Checkbox';
import { InspectorSection } from '@core/components/control/InspectorSection';
import { SliderInput } from '@core/components/control/SliderInput';
import { Icon } from '@shared/components/icons/Icon';
import { TypographyColorControl } from './TypographyColorControl';
import { ColorTokenOrCustom } from './ColorTokenOrCustom';
import type { StyleObject, HoverStyleOverride } from '@/modules/cms/node/node.types';
import { normalizeTypographyColor } from '@/modules/cms/node/node.types';
import type { ThemeDTO } from '@/shared/services/theme/theme.service';
import { t } from '@/shared/i18n/t';

/** Hover-effect quick presets (Property Inspector redesign, Phase 2 / Task 4) — one-click starter
 * values for the most common hover interactions, sitting above the existing granular hover
 * controls (which stay fully editable afterwards). Unlike NodeStyleTab.tsx's `SHADOW_PRESETS`
 * (which safely replaces `style.shadow` wholesale — that field has no sibling sub-state to lose),
 * `HoverStyleOverride` is a compound object with independent sub-fields (`scope`, `typography`,
 * `background`, `border`, `effects`, `transform`), so applying a preset MERGES onto the existing
 * `style().hover` (see the button's onClick below) rather than replacing it outright — clicking
 * "Nhấc nhẹ" while `hover.scope` is already `'parent'` must not silently reset the trigger scope
 * back to `'self'`. */
const HOVER_PRESETS: { id: string; labelKey: string; icon: string; value: HoverStyleOverride }[] = [
    { id: 'lift', labelKey: 'cms.node.style.hoverPresetLift', icon: 'heroicons-outline:arrow-up', value: { transform: { translateY: -4 } } },
    { id: 'grow', labelKey: 'cms.node.style.hoverPresetGrow', icon: 'heroicons-outline:arrows-pointing-out', value: { transform: { scaleX: 1.03, scaleY: 1.03 } } },
    { id: 'tint', labelKey: 'cms.node.style.hoverPresetTint', icon: 'heroicons-outline:swatch', value: { background: { type: 'color', value: '#fef3c7ff' } } },
    { id: 'glow', labelKey: 'cms.node.style.hoverPresetGlow', icon: 'heroicons-outline:sparkles', value: { border: { width: 2, style: 'solid', color: '#f59e0bff' } } },
    { id: 'dim', labelKey: 'cms.node.style.hoverPresetDim', icon: 'heroicons-outline:moon', value: { effects: { grayscale: 60 } } },
];

/** Transform quick presets (Property Inspector redesign, Phase 2 / Task 5). Unlike
 * `HOVER_PRESETS`' compound `HoverStyleOverride` target (unrelated concerns — scope/background/
 * border/typography/transform — where a wholesale replace would erase sibling concerns), every
 * field of `StyleObject['transform']` (`rotate`/`scaleX`/`scaleY`/`translateX`/`translateY`)
 * describes ONE combined CSS transform. The onClick below still MERGES a preset's value onto
 * any existing `style().transform` rather than replacing it wholesale: a user may have already
 * dragged the element via translateX/Y on the canvas before reaching for "Xoay nhẹ" (tilt), and
 * a wholesale replace would silently discard that position. The one deliberate exception is the
 * "reset" preset (`value: undefined`), which fully clears `transform` — that IS the point of a
 * reset button, so it bypasses the merge entirely instead of spreading `undefined` (a no-op
 * spread) onto the existing object. */
const TRANSFORM_PRESETS: { id: string; labelKey: string; icon: string; value: StyleObject['transform'] }[] = [
    { id: 'tilt', labelKey: 'cms.node.style.transformPresetTilt', icon: 'heroicons-outline:arrow-uturn-left', value: { rotate: -3 } },
    { id: 'grow', labelKey: 'cms.node.style.transformPresetGrow', icon: 'heroicons-outline:arrows-pointing-out', value: { scaleX: 1.05, scaleY: 1.05 } },
    { id: 'reset', labelKey: 'cms.node.style.transformPresetReset', icon: 'heroicons-outline:arrow-path', value: undefined },
];

export interface NodeStyleEffectsTabProps {
    style?: StyleObject;
    onChange: (next: StyleObject) => void;
    /** Image/Media art-direction — same Frame-only-control gating precedent NodeStyleTab uses
     * for `isFrame`: the "Ảnh" section (aspect-ratio/treatment/duotone/overlay/mask/reveal) is
     * only meaningful on ImageNode, so it stays unrendered for every other node type. The
     * focal-point pair that used to sit in this group lives in NodeContentSpacingSize.tsx
     * ("Nội dung" tab) since Task 5 — it only reads together with width/height/objectFit. */
    isImage?: boolean;
    /** The active page's resolved Theme, threaded down from NodeBuilder.page.tsx so the hover
     * and duotone color controls can offer the real theme color-token picker
     * (ColorTokenOrCustom) alongside the raw hex editor. `undefined` while the theme hasn't
     * resolved yet (or the page has no theme at all) — every color control degrades gracefully
     * to an empty token list, same convention NodeStyleTab follows. */
    activeTheme?: ThemeDTO;
}

const LABEL_CLASS = 'mb-1 block text-xs font-medium text-nb-text-muted';

export function NodeStyleEffectsTab(props: NodeStyleEffectsTabProps) {
    const style = () => props.style ?? {};

    const set = <K extends keyof StyleObject>(key: K, value: StyleObject[K]) =>
        props.onChange({ ...style(), [key]: value });
    const setHover = <K extends keyof HoverStyleOverride>(key: K, value: HoverStyleOverride[K]) =>
        set('hover', { ...style().hover, [key]: value });

    // Advanced-disclosure default rule (Task 5): open if `transform` already has any value at
    // all, collapsed otherwise — this only reads the initial prop, so it does not re-collapse
    // out from under a user who is actively editing (Solid signals initialize once).
    const [showAdvancedTransform, setShowAdvancedTransform] = createSignal(!!style().transform);

    return (
        <>
            <InspectorSection
                title={t('cms.node.style.transform')}
                isModified={!!style().transform}
                onReset={() => set('transform', undefined)}
                resetButtonLabel={t('cms.node.transform.resetButton')}
            >
                <div class="flex flex-col gap-3">
                    <div class="flex flex-wrap gap-1.5">
                        <For each={TRANSFORM_PRESETS}>
                            {(preset) => (
                                <button
                                    type="button"
                                    class="flex items-center gap-1 rounded-full border border-nb-border bg-nb-bg-subtle px-2.5 py-1 text-xs font-medium text-nb-text-muted transition-colors hover:border-nb-accent hover:text-nb-accent"
                                    onClick={() => set('transform', preset.value ? { ...style().transform, ...preset.value } : undefined)}
                                >
                                    <Icon name={preset.icon} class="h-3 w-3" />
                                    {t(preset.labelKey as any)}
                                </button>
                            )}
                        </For>
                    </div>
                    <button
                        type="button"
                        class="self-start text-xs font-medium text-nb-accent hover:underline"
                        onClick={() => setShowAdvancedTransform((v) => !v)}
                    >
                        {showAdvancedTransform() ? t('cms.node.style.transformAdvancedHide') : t('cms.node.style.transformAdvancedShow')}
                    </button>
                    <Show when={showAdvancedTransform()}>
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
                    </Show>
                </div>
            </InspectorSection>

            <InspectorSection
                title={t('cms.node.style.hover')}
                isModified={!!style().hover}
                onReset={() => set('hover', undefined)}
                resetButtonLabel={t('cms.node.transform.resetButton')}
            >
                <div class="flex flex-col gap-3">
                    <div class="flex flex-wrap gap-1.5">
                        <For each={HOVER_PRESETS}>
                            {(preset) => (
                                <button
                                    type="button"
                                    class="flex items-center gap-1 rounded-full border border-nb-border bg-nb-bg-subtle px-2.5 py-1 text-xs font-medium text-nb-text-muted transition-colors hover:border-nb-accent hover:text-nb-accent"
                                    onClick={() => set('hover', { ...style().hover, ...preset.value })}
                                >
                                    <Icon name={preset.icon} class="h-3 w-3" />
                                    {t(preset.labelKey as any)}
                                </button>
                            )}
                        </For>
                    </div>
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
                        activeTheme={props.activeTheme}
                    />
                    <Checkbox
                        value={!!style().hover?.background}
                        onChange={(on) => setHover('background', on ? { type: 'color', value: '#ffffffff' } : undefined)}
                        text={t('cms.node.style.backgroundEnabled')}
                        fieldless
                    />
                    <Show when={style().hover?.background}>
                        <ColorTokenOrCustom
                            label={t('cms.node.style.background')}
                            value={style().hover?.background?.value}
                            activeTheme={props.activeTheme}
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
                        <ColorTokenOrCustom
                            label={t('cms.node.style.borderColor')}
                            value={style().hover?.border?.color}
                            activeTheme={props.activeTheme}
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
                    <div class="grid grid-cols-4 gap-2">
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
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.style.scaleX')}</label>
                            <InputNumber
                                nullable
                                decimal
                                value={style().hover?.transform?.scaleX ?? null}
                                onChange={(v) => setHover('transform', { ...style().hover?.transform, scaleX: v ?? undefined })}
                                fieldless
                            />
                        </div>
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.style.scaleY')}</label>
                            <InputNumber
                                nullable
                                decimal
                                value={style().hover?.transform?.scaleY ?? null}
                                onChange={(v) => setHover('transform', { ...style().hover?.transform, scaleY: v ?? undefined })}
                                fieldless
                            />
                        </div>
                    </div>
                </div>
            </InspectorSection>

            <Show when={props.isImage}>
                <InspectorSection
                    title={t('cms.node.image.title')}
                    isModified={!!style().image}
                    onReset={() => set('image', undefined)}
                    resetButtonLabel={t('cms.node.transform.resetButton')}
                >
                    <div class="flex flex-col gap-3">
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.image.aspectRatio')}</label>
                            <Select
                                clearable
                                value={style().image?.aspectRatio ?? ''}
                                options={[
                                    { value: '1:1', label: '1:1' },
                                    { value: '4:3', label: '4:3' },
                                    { value: '3:2', label: '3:2' },
                                    { value: '16:10', label: '16:10' },
                                    { value: '16:9', label: '16:9' },
                                    { value: '21:9', label: '21:9' },
                                ]}
                                onChange={(v) => set('image', { ...style().image, aspectRatio: (v || undefined) as NonNullable<StyleObject['image']>['aspectRatio'] })}
                                fieldless
                            />
                        </div>
                        {/* Property Inspector redesign, Task 5: the focal-point (Position) pair
                            that used to sit here moved into NodeContentSpacingSize.tsx's Size
                            section in the "Nội dung" tab — it only reads together with
                            width/height/objectFit. The rest of this art-direction group stays. */}
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.image.treatment')}</label>
                            <Select
                                clearable
                                value={style().image?.treatment ?? ''}
                                options={[
                                    { value: 'none', label: t('cms.node.image.treatmentNone') },
                                    { value: 'duotone', label: t('cms.node.image.treatmentDuotone') },
                                    { value: 'grayscale', label: t('cms.node.image.treatmentGrayscale') },
                                ]}
                                onChange={(v) => set('image', { ...style().image, treatment: (v || undefined) as NonNullable<StyleObject['image']>['treatment'] })}
                                fieldless
                            />
                        </div>
                        <Show when={style().image?.treatment === 'duotone'}>
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <ColorTokenOrCustom
                                        label={t('cms.node.image.duotoneFrom')}
                                        value={style().image?.duotone?.from}
                                        activeTheme={props.activeTheme}
                                        defaultValue="#ffffffff"
                                        onChange={(v) => set('image', { ...style().image, duotone: { from: v ?? '#ffffffff', to: style().image?.duotone?.to ?? '#000000ff' } })}
                                    />
                                </div>
                                <div>
                                    <ColorTokenOrCustom
                                        label={t('cms.node.image.duotoneTo')}
                                        value={style().image?.duotone?.to}
                                        activeTheme={props.activeTheme}
                                        defaultValue="#000000ff"
                                        onChange={(v) => set('image', { ...style().image, duotone: { from: style().image?.duotone?.from ?? '#ffffffff', to: v ?? '#000000ff' } })}
                                    />
                                </div>
                            </div>
                        </Show>
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.image.overlayGradient')}</label>
                            <input
                                class="w-full rounded-nb-sm border border-nb-border bg-nb-bg px-2 py-1.5 text-sm text-nb-text"
                                placeholder="linear-gradient(180deg, transparent, rgba(0,0,0,.6))"
                                value={style().image?.overlayGradient ?? ''}
                                onInput={(e) => set('image', { ...style().image, overlayGradient: e.currentTarget.value || undefined })}
                            />
                        </div>
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.image.mask')}</label>
                            <Select
                                clearable
                                value={style().image?.mask ?? ''}
                                options={[
                                    { value: 'none', label: t('cms.node.image.maskNone') },
                                    { value: 'circle', label: t('cms.node.image.maskCircle') },
                                    { value: 'blob', label: t('cms.node.image.maskBlob') },
                                    { value: 'diagonal', label: t('cms.node.image.maskDiagonal') },
                                ]}
                                onChange={(v) => set('image', { ...style().image, mask: (v || undefined) as NonNullable<StyleObject['image']>['mask'] })}
                                fieldless
                            />
                        </div>
                        <Checkbox
                            value={!!style().image?.revealOnScroll}
                            onChange={(on) => set('image', { ...style().image, revealOnScroll: on || undefined })}
                            text={t('cms.node.image.revealOnScroll')}
                            fieldless
                        />
                    </div>
                </InspectorSection>
            </Show>
        </>
    );
}
