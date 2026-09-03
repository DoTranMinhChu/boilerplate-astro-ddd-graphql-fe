import { createMemo, createResource } from 'solid-js';
import { Card } from '@core/components/utilities/Card';
import { generateDatatable, PagingArgsInput } from '@core/components/table/GeneratedDatatable';
import { Input } from '@core/components/control/Input';
import { InputNumber } from '@core/components/control/InputNumber';
import { Select } from '@core/components/control/Select';
import { ColorControl } from '@core/components/control/ColorControl';
import { IconRadioGroup } from '@core/components/control/IconRadioGroup';
import { PreviewDrawer } from '@core/components/utilities/PreviewDrawer';
import { useForm } from '@core/components/form/FormContext';
import { Icon } from '@shared/components/icons/Icon';
import { toast } from '@core/components/toast/ToastProvider';
import { ThemeDTO, ThemeService } from '@/shared/services/theme/theme.service';
import type { CreateThemeInput, UpdateThemeInput } from '@shared/generated/typed-graphql';
import { THEME_COLOR_TOKEN_KEYS } from '@/modules/theme/theme.types';
import { t } from '@/shared/i18n/t';

const { Datatable, triggerRefresh } = generateDatatable<PagingArgsInput, ThemeDTO, ThemeDTO, ThemeDTO, CreateThemeInput, UpdateThemeInput>({
    service: ThemeService,
    paginatedQuery: () => ThemeService.getAllThemesCursor(),
    itemQuery: (item) => ThemeService.getOneTheme({ id: item.id! }),
    createMutation: (data) => ThemeService.createTheme({ data }),
    updateMutation: (id, data) => ThemeService.updateTheme({ id, data }),
    deleteMutation: (item) => ThemeService.deleteTheme({ id: item.id! }),
});

/** `CreateThemeInput`/`UpdateThemeInput` (codegen) type `colors`/`typography`/`layout`/`motion`
 * as `string` — the same "Mixed scalar → codegen `string`" limitation documented in
 * theme.service.ts's `RawThemeDTO`/`ThemeDTO` cast — so `Datatable.Field`'s `FieldName<T>` can't
 * derive nested dotted paths (e.g. `colors.light.primary`) from those flat-`string` types even
 * though the form engine's `Util.get`/`Util.set` (generateForm.tsx) genuinely walks any dotted
 * path on the real runtime object regardless of its declared type. One cast point here, same
 * convention as the service-level cast, instead of threading `as any` through every field below. */
const themeField = (name: string) => name as any;

/** Reasonable per-token default hex — `ColorControl`'s `defaultValue` is the swatch/placeholder
 * shown before a real value is set (e.g. a brand-new Theme), never a fallback that silently
 * masks an actually-saved value. Loosely follows the same neutral/brand split every real seeded
 * theme already uses (see `getAllThemes` data) so a fresh color starts on a plausible tone
 * instead of pure black for every field. */
/** Substring-keyed icon lookup for `motion.signature` — the field stays a free `string` sourced
 * LIVE from `getAllThemes()` (see `signatureOptions` below), not a hardcoded literal union, so
 * this can't be a plain value->icon map for values it hasn't seen. Matching by substring keeps
 * every signature a future theme introduces pickable (falls back to a neutral icon) instead of
 * silently breaking `IconRadioGroup` for an unrecognized value. */
const SIGNATURE_ICONS: Record<string, string> = {
    fast: 'heroicons-outline:lightning-bolt',
    precise: 'heroicons-outline:cursor-click',
    bouncy: 'heroicons-outline:sparkles',
    calm: 'heroicons-outline:moon',
    editorial: 'heroicons-outline:book-open',
};
const iconForSignature = (label: string) => {
    const key = Object.keys(SIGNATURE_ICONS).find((k) => label.toLowerCase().includes(k));
    return key ? SIGNATURE_ICONS[key] : 'heroicons-outline:adjustments';
};

const COLOR_DEFAULTS: Record<string, string> = {
    background: '#FFFFFF', surface: '#F8FAFC', surfaceMuted: '#EEF2F7',
    foreground: '#0F172A', foregroundMuted: '#64748B', border: '#E2E8F0',
    primary: '#16A34A', onPrimary: '#FFFFFF',
    secondary: '#0EA5E9', onSecondary: '#FFFFFF',
    accent: '#F59E0B', onAccent: '#0F172A',
    success: '#22C55E', warning: '#F59E0B', danger: '#EF4444',
};

/** Full nested-JSON editor for 1 theme's 4 token groups, grouped into 4 `<Datatable.Field>`
 * sections matching `ThemeColors`/`ThemeTypography`/`ThemeLayout`/`ThemeMotion`'s own shape 1:1
 * so no field is unreachable from the admin UI.
 *
 * `typography.scale` (the 9-role matrix) has no v1 editing UI on purpose — set only via seed
 * script/direct mutation. Font/signature fields are `<Select>`s sourced LIVE from real seeded
 * values, not hardcoded guesses, so picking an existing font/signature reliably resolves to the
 * same CSS. */
export function ManageThemesPage() {
    const setDefault = async (item: ThemeDTO) => {
        await ThemeService.setDefaultTheme({ id: item.id! });
        toast().success(t('cms.themes.setDefaultSuccess'));
        triggerRefresh();
    };

    // Live-sourced Select options for the 3 "practically an enum" fields — see this component's
    // own doc comment above for why these stay `string`-typed but become selectable.
    const [existingThemes] = createResource(() => ThemeService.getAllThemes());
    const distinctOptions = (pick: (theme: ThemeDTO) => string | undefined) => {
        const values = new Set<string>();
        for (const theme of existingThemes() ?? []) {
            const v = pick(theme);
            if (v) values.add(v);
        }
        return Array.from(values).sort().map((v) => ({ value: v, label: v }));
    };
    const displayFontOptions = createMemo(() => distinctOptions((th) => th.typography?.displayFont?.family));
    const bodyFontOptions = createMemo(() => distinctOptions((th) => th.typography?.bodyFont?.family));
    const signatureOptions = createMemo(() => distinctOptions((th) => th.motion?.signature));
    const signatureIconOptions = createMemo(() =>
        signatureOptions().map((o) => ({ value: o.value, label: o.label, icon: iconForSignature(o.label) })),
    );

    return (
        <div class="space-y-6 animate-in">
            <Card class="border-none shadow-sm">
                <Datatable id="ThemeTable">
                    <Datatable.Header>
                        <Datatable.Title title={t('cms.themes.title')} description={t('cms.themes.description')} />
                        <Datatable.Buttons>
                            <Datatable.ButtonRefresh />
                            <Datatable.ButtonCreate label={t('cms.themes.createButton')} />
                        </Datatable.Buttons>
                    </Datatable.Header>

                    <Datatable.Toolbar>
                        <Datatable.Search />
                    </Datatable.Toolbar>

                    <Datatable.Table>
                        <Datatable.Column title={t('cms.themes.columns.name')}>
                            {(item) => (
                                <div class="flex items-center gap-2">
                                    <span class="h-4 w-4 rounded-full border border-neutral-200" style={{ 'background-color': item.colors?.light?.primary }} />
                                    <p class="font-semibold text-gray-900">{item.name}</p>
                                    {item.isDefault && (
                                        <span class="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-100">
                                            {t('cms.themes.defaultBadge')}
                                        </span>
                                    )}
                                </div>
                            )}
                        </Datatable.Column>
                        <Datatable.Column title="">
                            {(item) => (
                                <Datatable.CellButtons>
                                    <Datatable.CellButton
                                        sm
                                        visible={!item.isDefault}
                                        icon={<Icon name="heroicons-outline:check-circle" tooltip={t('cms.themes.setDefaultButton')} />}
                                        onClick={() => setDefault(item)}
                                    />
                                    <Datatable.CellButtonUpdate item={item} />
                                    <Datatable.CellButtonDelete item={item} itemName={item.name!} />
                                </Datatable.CellButtons>
                            )}
                        </Datatable.Column>
                    </Datatable.Table>

                    <Datatable.Pagination />

                    <Datatable.Formlog viewMode="modal" class="w-full max-w-[880px]" createTitle={t('cms.themes.createTitle')} updateTitle={t('cms.themes.updateTitle')}>
                        {() => {
                            // `ColorControl` is a standalone control (explicit value/onChange, own
                            // label) — same pattern `NodeStyleTab.tsx` already uses it with, not
                            // `Datatable.Field`'s auto-injected-FieldContext pattern `Input`/
                            // `InputNumber`/`Select` below rely on. Reading `useForm()` directly
                            // here (same hook `Field.tsx` itself calls) wires it into this SAME
                            // form without needing a second, parallel field-registration path.
                            const { value, setValues } = useForm();
                            return (
                            <div class="col-span-full grid grid-cols-12 gap-x-6 gap-y-6 p-8">
                                <div class="col-span-12">
                                    <Datatable.Field name="name" label={t('cms.themes.fields.name')} required>
                                        <Input placeholder={t('cms.themes.fields.namePlaceholder')} />
                                    </Datatable.Field>
                                </div>

                                <div class="col-span-12 flex items-center justify-between">
                                    <div class="font-semibold text-sm text-neutral-500">{t('cms.themes.sections.colors')}</div>
                                    {/* Sample card, not SiteHeader/SiteFooter — Theme has no single "shape" to
                                        render (see docs/superpowers/specs/2026-09-01-admin-ui-consistency-design.md
                                        §3.1). Reads the SAME reactive `value()` used by ColorControl above, so
                                        editing any color/font field updates this live before saving. */}
                                    <PreviewDrawer title={t('cms.themes.preview.title')} triggerLabel={t('cms.themes.preview.button')}>
                                        <div
                                            class="space-y-4 rounded-xl border p-6"
                                            style={{
                                                'background-color': value(themeField('colors.light.background')) || COLOR_DEFAULTS.background,
                                                color: value(themeField('colors.light.foreground')) || COLOR_DEFAULTS.foreground,
                                                'border-color': value(themeField('colors.light.border')) || COLOR_DEFAULTS.border,
                                                'font-family': value(themeField('typography.bodyFont.family')) || undefined,
                                            }}
                                        >
                                            <h3
                                                style={{ 'font-family': value(themeField('typography.displayFont.family')) || undefined }}
                                                class="text-xl font-semibold"
                                            >
                                                {t('cms.themes.preview.headingSample')}
                                            </h3>
                                            <p class="text-sm">{t('cms.themes.preview.bodySample')}</p>
                                            <div class="flex gap-2">
                                                <button
                                                    type="button"
                                                    class="rounded-lg px-4 py-2 text-sm font-semibold"
                                                    style={{
                                                        'background-color': value(themeField('colors.light.primary')) || COLOR_DEFAULTS.primary,
                                                        color: value(themeField('colors.light.onPrimary')) || COLOR_DEFAULTS.onPrimary,
                                                    }}
                                                >
                                                    {t('cms.themes.preview.primaryButton')}
                                                </button>
                                                <button
                                                    type="button"
                                                    class="rounded-lg border px-4 py-2 text-sm font-semibold"
                                                    style={{
                                                        'border-color': value(themeField('colors.light.secondary')) || COLOR_DEFAULTS.secondary,
                                                        color: value(themeField('colors.light.secondary')) || COLOR_DEFAULTS.secondary,
                                                    }}
                                                >
                                                    {t('cms.themes.preview.secondaryButton')}
                                                </button>
                                            </div>
                                        </div>
                                    </PreviewDrawer>
                                </div>
                                {THEME_COLOR_TOKEN_KEYS.map((field) => {
                                    const fieldName = themeField(`colors.light.${field}`);
                                    return (
                                        <div class="col-span-3">
                                            <ColorControl
                                                label={field}
                                                value={value(fieldName)}
                                                defaultValue={COLOR_DEFAULTS[field] ?? '#000000'}
                                                onChange={(v) => setValues(fieldName, v)}
                                            />
                                        </div>
                                    );
                                })}

                                <div class="col-span-12 font-semibold text-sm text-neutral-500">{t('cms.themes.sections.typography')}</div>
                                <div class="col-span-6">
                                    <Datatable.Field name={themeField('typography.displayFont.family')} label={t('cms.themes.fields.displayFont')}>
                                        <Select options={displayFontOptions()} clearable />
                                    </Datatable.Field>
                                </div>
                                <div class="col-span-6">
                                    <Datatable.Field name={themeField('typography.bodyFont.family')} label={t('cms.themes.fields.bodyFont')}>
                                        <Select options={bodyFontOptions()} clearable />
                                    </Datatable.Field>
                                </div>

                                <div class="col-span-12 font-semibold text-sm text-neutral-500">{t('cms.themes.sections.layout')}</div>
                                <div class="col-span-4">
                                    <Datatable.Field name={themeField('layout.containerWidths.content')} label={t('cms.themes.fields.containerContent')}>
                                        <InputNumber />
                                    </Datatable.Field>
                                </div>
                                <div class="col-span-4">
                                    <Datatable.Field name={themeField('layout.sectionPadding.desktop.0')} label={t('cms.themes.fields.sectionPaddingMin')}>
                                        <InputNumber />
                                    </Datatable.Field>
                                </div>
                                <div class="col-span-4">
                                    <Datatable.Field name={themeField('layout.sectionPadding.desktop.1')} label={t('cms.themes.fields.sectionPaddingMax')}>
                                        <InputNumber />
                                    </Datatable.Field>
                                </div>

                                <div class="col-span-12 font-semibold text-sm text-neutral-500">{t('cms.themes.sections.motion')}</div>
                                <div class="col-span-4">
                                    <Datatable.Field name={themeField('motion.duration.hover')} label={t('cms.themes.fields.hoverDuration')}>
                                        <InputNumber />
                                    </Datatable.Field>
                                </div>
                                <div class="col-span-4">
                                    <Datatable.Field name={themeField('motion.duration.reveal')} label={t('cms.themes.fields.revealDuration')}>
                                        <InputNumber />
                                    </Datatable.Field>
                                </div>
                                <div class="col-span-4">
                                    {/* Standalone control, not createControl-native — see IconRadioGroup's own
                                        header comment — wired via the SAME useForm() destructure this render
                                        callback already opened for ColorControl above. */}
                                    <label class="mb-1.5 block text-sm font-medium text-neutral-700">{t('cms.themes.fields.signature')}</label>
                                    <IconRadioGroup
                                        value={value(themeField('motion.signature'))}
                                        options={signatureIconOptions()}
                                        onChange={(v) => setValues(themeField('motion.signature'), v)}
                                    />
                                </div>
                            </div>
                            );
                        }}
                    </Datatable.Formlog>
                </Datatable>
            </Card>
        </div>
    );
}
