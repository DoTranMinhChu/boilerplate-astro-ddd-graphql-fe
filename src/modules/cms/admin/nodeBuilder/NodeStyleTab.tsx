// src/modules/cms/admin/nodeBuilder/NodeStyleTab.tsx
//
// Admin Style tab for the generic Node tree: Typography/Background/Border/Shadow/Effects
// InspectorSections, each control writing straight into `props.style.<group>.<field>` via
// `props.onChange`. Spacing/Size/focalPoint live in NodeContentSpacingSize.tsx; CSS-Transform,
// Hover, and image art-direction live in NodeStyleEffectsTab.tsx (the "Hiệu ứng" tab) — not here.
import { For, Show } from 'solid-js';
import { InputNumber } from '@core/components/control/InputNumber';
import { Select } from '@core/components/control/Select';
import { Checkbox } from '@core/components/control/Checkbox';
import { FONT_FAMILIES } from '@core/components/control/editor/commands/font';
import { InspectorSection } from '@core/components/control/InspectorSection';
import { SliderInput } from '@core/components/control/SliderInput';
import { ColorControl } from '@core/components/control/ColorControl';
import { TypographyColorControl } from './TypographyColorControl';
import { ColorTokenOrCustom } from './ColorTokenOrCustom';
import type { StyleObject, TypographyRole } from '@/modules/cms/node/node.types';
import { normalizeTypographyColor, TYPOGRAPHY_ROLES, EBackgroundFillType } from '@/modules/cms/node/node.types';
import type { ThemeDTO } from '@/shared/services/theme/theme.service';
import { t, tOrLiteral } from '@/shared/i18n/t';

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
    /* Property Inspector redesign, Task 7: the `isImage` prop is gone from this component
     * along with the "Ảnh" art-direction section it gated — that section (and the prop) moved
     * to NodeStyleEffectsTab.tsx in the "Hiệu ứng" tab. NodeBuilder.page.tsx now passes
     * `isImage` there instead. */
    /** Theme layer / style pipeline (Task 16) — the active page's resolved Theme (Page.themeId
     * wins, falls back to the default theme), resolved once by NodeBuilder.page.tsx and
     * threaded down here so the Typography/Background/Border color controls can offer a real
     * theme color-token picker (ColorTokenOrCustom) alongside the existing raw hex editor.
     * `undefined` while the theme hasn't resolved yet (or the page has no theme configured at
     * all) — every color control degrades gracefully to an empty token list, same "no admin-
     * facing crash on missing data" convention this file already follows elsewhere. */
    activeTheme?: ThemeDTO;
    /** Property Inspector Phase 4 (Task 5) — the panel-level property-search query, forwarded
     * verbatim to all 5 `InspectorSection`s below so a non-matching query hides them. A PLAIN
     * STRING, not an accessor (that is `InspectorSection.searchQuery`'s own type); the
     * reactivity comes from reading `props.searchQuery` fresh in each JSX prop position.
     * Never destructure it off `props` — that freezes it at mount and kills live filtering. */
    searchQuery?: string;
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

/** Task 14 (enum/type-safety sweep) — i18n label key per `TypographyRole`, keyed via
 * `Record<TypographyRole,...>` so TS enforces exhaustive coverage of whatever
 * `TYPOGRAPHY_ROLES` (theme.types.ts) currently lists. The typography-role `<Select>`'s options
 * below now derive their VALUES (and order) from `TYPOGRAPHY_ROLES` instead of a second,
 * independently hand-listed array — a role added/removed there can no longer silently drift out
 * of sync with what this dropdown offers. */
const TYPOGRAPHY_ROLE_LABEL_KEYS: Record<TypographyRole, string> = {
    display: 'cms.node.style.typographyRoleDisplay',
    h1: 'cms.node.style.typographyRoleH1',
    h2: 'cms.node.style.typographyRoleH2',
    h3: 'cms.node.style.typographyRoleH3',
    h4: 'cms.node.style.typographyRoleH4',
    bodyLg: 'cms.node.style.typographyRoleBodyLg',
    body: 'cms.node.style.typographyRoleBody',
    small: 'cms.node.style.typographyRoleSmall',
    caption: 'cms.node.style.typographyRoleCaption',
};

export function NodeStyleTab(props: NodeStyleTabProps) {
    const style = () => props.style ?? {};

    const set = <K extends keyof StyleObject>(key: K, value: StyleObject[K]) =>
        props.onChange({ ...style(), [key]: value });

    return (
        <>
            {/* Property Inspector redesign, Task 5: the Spacing (padding/gap) and Size
                (width/height/objectFit) sections that used to open this component now live in
                NodeContentSpacingSize.tsx, mounted in the "Nội dung" tab (which also gained a
                brand-new margin control alongside padding). Nothing about the StyleObject
                read/write contract changed — that component writes the same
                `style.spacing`/`style.size` keys, via the same `onChange` shape, from the same
                NodeBuilder.page.tsx call site. */}
            <InspectorSection
                title={t('cms.node.style.typography')}
                searchQuery={props.searchQuery}
                isModified={!!style().typography}
                onReset={() => set('typography', undefined)}
                resetButtonLabel={t('cms.node.transform.resetButton')}
            >
                <div class="flex flex-col gap-3">
                    <div>
                        <label class={LABEL_CLASS}>{t('cms.node.style.typographyRole')}</label>
                        <Select
                            clearable
                            value={style().typography?.role ?? ''}
                            onChange={(v) => set('typography', { ...style().typography, role: (v as TypographyRole) || undefined })}
                            options={TYPOGRAPHY_ROLES.map((role) => ({ value: role, label: tOrLiteral(TYPOGRAPHY_ROLE_LABEL_KEYS[role]) }))}
                            fieldless
                        />
                    </div>
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
                        activeTheme={props.activeTheme}
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

            <InspectorSection
                title={t('cms.node.style.background')}
                searchQuery={props.searchQuery}
                isModified={!!style().background}
                onReset={() => set('background', undefined)}
                resetButtonLabel={t('cms.node.transform.resetButton')}
            >
                <div class="flex flex-col gap-3">
                    <Checkbox
                        value={!!style().background}
                        onChange={(on) => set('background', on ? { type: EBackgroundFillType.COLOR, value: '#ffffffff' } : undefined)}
                        text={t('cms.node.style.backgroundEnabled')}
                        fieldless
                    />
                    <Show when={style().background}>
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.style.backgroundType')}</label>
                            <Select
                                value={style().background?.type ?? EBackgroundFillType.COLOR}
                                onChange={(v) => set('background', { ...style().background, type: v as EBackgroundFillType })}
                                options={[
                                    { value: EBackgroundFillType.COLOR, label: t('cms.node.style.backgroundTypeColor') },
                                    { value: EBackgroundFillType.GRADIENT, label: t('cms.node.style.backgroundTypeGradient') },
                                    { value: EBackgroundFillType.IMAGE, label: t('cms.node.style.backgroundTypeImage') },
                                    { value: EBackgroundFillType.VIDEO, label: t('cms.node.style.backgroundTypeVideo') },
                                ]}
                                fieldless
                            />
                        </div>
                        <Show when={style().background?.type === EBackgroundFillType.IMAGE && props.isFrame}>
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
                        <ColorTokenOrCustom
                            label={t('cms.node.style.backgroundValue')}
                            value={style().background?.value}
                            activeTheme={props.activeTheme}
                            defaultValue="#ffffffff"
                            onChange={(v) => set('background', { ...style().background, value: v })}
                        />
                    </Show>
                </div>
            </InspectorSection>

            <InspectorSection
                title={t('cms.node.style.border')}
                searchQuery={props.searchQuery}
                isModified={!!style().border}
                onReset={() => set('border', undefined)}
                resetButtonLabel={t('cms.node.transform.resetButton')}
            >
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
                        <ColorTokenOrCustom
                            label={t('cms.node.style.borderColor')}
                            value={style().border?.color}
                            activeTheme={props.activeTheme}
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

            {/* Property Inspector redesign, Task 6: Shadow split out of the old combined "Effects"
                section into its own InspectorSection (title reuses the existing
                `cms.node.style.shadowLabel` key, already used elsewhere for this same field group)
                — pure JSX reorganization, no field logic change; `set('shadow', ...)` calls are
                byte-for-byte identical to before. Placed right after Border/before the remaining
                Effects section per the design doc's Kiểu dáng tab ordering (Typography/Background/
                Border/Shadow/Decoration-Overlay). */}
            <InspectorSection
                title={t('cms.node.style.shadowLabel')}
                searchQuery={props.searchQuery}
                isModified={!!style().shadow?.length}
                onReset={() => set('shadow', undefined)}
                resetButtonLabel={t('cms.node.transform.resetButton')}
            >
                <div class="flex flex-col gap-2">
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
            </InspectorSection>

            <InspectorSection title={t('cms.node.style.effects')} searchQuery={props.searchQuery}>
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

            {/* Property Inspector redesign, Task 7: the CSS-Transform (translate/rotate/scale),
                Hover and Image art-direction sections that used to close this component now live
                in NodeStyleEffectsTab.tsx, mounted in the "Hiệu ứng" tab alongside
                NodeAnimationTab. Same StyleObject read/write contract, same call site's
                `previewBreakpoint()`-aware `style`/`onChange` slot — that component owns the
                `transform`/`hover`/`image` sub-keys and this one owns typography/background/
                border/shadow/effects/overflow; both spread the rest, so neither clobbers the
                other. NodeStyleTab.test.tsx keeps negative assertions proving the fields no
                longer render here. */}
        </>
    );
}
