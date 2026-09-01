import { createMemo, createResource } from 'solid-js';
import { Card } from '@core/components/utilities/Card';
import { generateDatatable, PagingArgsInput } from '@core/components/table/GeneratedDatatable';
import { Input } from '@core/components/control/Input';
import { InputNumber } from '@core/components/control/InputNumber';
import { Select } from '@core/components/control/Select';
import { ColorControl } from '@core/components/control/ColorControl';
import { useForm } from '@core/components/form/FormContext';
import { Icon } from '@shared/components/icons/Icon';
import { toast } from '@core/components/toast/ToastProvider';
import { ThemeDTO, ThemeService } from '@/shared/services/theme/theme.service';
import type { CreateThemeInput, UpdateThemeInput } from '@shared/generated/typed-graphql';
import { t } from '@/shared/i18n/t';

const { Datatable, triggerRefresh } = generateDatatable<PagingArgsInput, ThemeDTO, ThemeDTO, ThemeDTO, CreateThemeInput, UpdateThemeInput>({
    service: ThemeService,
    paginatedQuery: () => ThemeService.getAllThemesCursor(),
    itemQuery: (item) => ThemeService.getOneTheme({ id: item.id! }),
    createMutation: (data) => ThemeService.createTheme({ data }),
    updateMutation: (id, data) => ThemeService.updateTheme({ id, data }),
    deleteMutation: (item) => ThemeService.deleteTheme({ id: item.id! }),
});

const COLOR_FIELDS: (keyof NonNullable<ThemeDTO['colors']>['light'])[] = [
    'background', 'surface', 'surfaceMuted', 'foreground', 'foregroundMuted', 'border',
    'primary', 'onPrimary', 'secondary', 'onSecondary', 'accent', 'onAccent',
    'success', 'warning', 'danger',
];

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
const COLOR_DEFAULTS: Record<string, string> = {
    background: '#FFFFFF', surface: '#F8FAFC', surfaceMuted: '#EEF2F7',
    foreground: '#0F172A', foregroundMuted: '#64748B', border: '#E2E8F0',
    primary: '#16A34A', onPrimary: '#FFFFFF',
    secondary: '#0EA5E9', onSecondary: '#FFFFFF',
    accent: '#F59E0B', onAccent: '#0F172A',
    success: '#22C55E', warning: '#F59E0B', danger: '#EF4444',
};

/** Full nested-JSON editor for 1 theme's 4 token groups — a real, complete editing surface (not
 * a visual live-preview canvas, which is Phase 7 "Design Lint" territory), grouped into 4
 * `<Datatable.Field>` sections matching `ThemeColors`/`ThemeTypography`/`ThemeLayout`/
 * `ThemeMotion`'s own shape 1:1 so no field is unreachable from the admin UI.
 * `typography.scale` (the 9-role size/weight/lineHeight/letterSpacing matrix) is intentionally
 * NOT exposed in this v1 form — set once via the seed script/direct GraphQL mutation; a proper
 * scale-editing grid is left for a later task once real usage shows it's needed.
 *
 * UI consistency pass — colors now use the SAME `ColorControl` (swatch + editable hex, one
 * bordered pill) every other color field in the admin already uses (`NodeStyleTab.tsx`'s Style
 * tab), instead of a bare `<input type="color">` with no hex text and no popover picker — one
 * shared component, one place to improve the color-picking experience for the whole admin.
 * `displayFont`/`bodyFont`/`signature` are plain `string` at the type level (no literal union —
 * see `theme.types.ts`), but in practice only ever take one of a handful of real values already
 * used across the seeded themes (`getAllThemes` shows exactly 5 distinct `signature` values, 5
 * distinct display fonts, 2 distinct body fonts) — turned into `<Select>`s sourced LIVE from
 * those real values (not a hardcoded guess) so picking a font/signature an admin has already
 * used elsewhere is a click, not a re-typed string that has to match some other theme's spelling
 * exactly for their intended vibe to actually resolve to the same CSS. A genuinely brand-new
 * Google Font still needs its `googleFontUrl` companion field wired up at the DB/seed-script
 * level regardless (that field isn't exposed in this form at all, before or after this pass) —
 * this change doesn't newly block anything a free-text `<Input>` here actually supported. */
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

                                <div class="col-span-12 font-semibold text-sm text-neutral-500">{t('cms.themes.sections.colors')}</div>
                                {COLOR_FIELDS.map((field) => {
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
                                    <Datatable.Field name={themeField('motion.signature')} label={t('cms.themes.fields.signature')}>
                                        <Select options={signatureOptions()} clearable />
                                    </Datatable.Field>
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
