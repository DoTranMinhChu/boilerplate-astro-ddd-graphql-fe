import { createSignal, Show } from 'solid-js';
import { t, tOrLiteral } from '@/shared/i18n/t';
import { ColorPickerField, isLowContrast } from './ColorPickerField';
import { DEFAULT_ACCENT_COLOR } from '@/modules/cms/sections/sectionHelpers';
import { ESectionTheme } from '@/modules/cms/cms.constants';
import type { SectionStyle } from '@/modules/cms/cms.types';

const THEME_PRESETS: { value: NonNullable<SectionStyle['theme']>; bg: string; text: string }[] = [
    { value: ESectionTheme.LIGHT, bg: '#ffffff', text: '#171717' },
    { value: ESectionTheme.DARK, bg: '#0a0a0a', text: '#ffffff' },
    { value: ESectionTheme.BRAND, bg: DEFAULT_ACCENT_COLOR, text: '#ffffff' },
];

export interface StyleTabProps {
    style?: SectionStyle;
    onChange: (style: SectionStyle) => void;
}

/** No-code style controls (spec §3): theme presets by default, an "advanced" toggle
 * reveals free hex color pickers. Everything writes straight into `section.style`. */
export function StyleTab(props: StyleTabProps) {
    const [advanced, setAdvanced] = createSignal(!!(props.style?.accentColor || props.style?.textColor || props.style?.backgroundColor));
    const style = () => props.style ?? {};
    const set = (patch: Partial<SectionStyle>) => props.onChange({ ...style(), ...patch });

    const effectiveBg = () => style().backgroundColor ?? THEME_PRESETS.find((p) => p.value === (style().theme ?? ESectionTheme.LIGHT))?.bg;
    const effectiveText = () => style().textColor ?? THEME_PRESETS.find((p) => p.value === (style().theme ?? ESectionTheme.LIGHT))?.text;

    return (
        <div class="space-y-5">
            <div>
                <p class="mb-2 text-xs font-medium text-neutral-500">{t('cms.builder.style.themeLabel')}</p>
                <div class="grid grid-cols-3 gap-2">
                    {THEME_PRESETS.map((preset) => (
                        <button
                            type="button"
                            onClick={() => set({ theme: preset.value })}
                            class={`rounded-lg border-2 p-2 text-xs font-medium transition ${
                                (style().theme ?? ESectionTheme.LIGHT) === preset.value ? 'border-primary-500' : 'border-transparent hover:border-neutral-200'
                            }`}
                        >
                            <span class="mb-1.5 block h-8 w-full rounded" style={{ 'background-color': preset.bg, border: '1px solid rgba(0,0,0,.08)' }} />
                            {tOrLiteral(`cms.sections.themeOptions.${preset.value}`)}
                        </button>
                    ))}
                </div>
            </div>

            <button type="button" class="text-xs font-medium text-primary-600 hover:text-primary-700" onClick={() => setAdvanced((v) => !v)}>
                {t('cms.builder.style.advancedToggle')} {advanced() ? '▲' : '▼'}
            </button>

            <Show when={advanced()}>
                <div class="grid grid-cols-3 gap-3 rounded-lg bg-neutral-50 p-3">
                    <ColorPickerField label={t('cms.builder.style.accentColor')} value={style().accentColor} defaultValue={DEFAULT_ACCENT_COLOR} onChange={(v) => set({ accentColor: v })} />
                    <ColorPickerField label={t('cms.builder.style.textColor')} value={style().textColor} defaultValue={effectiveText() ?? '#171717'} onChange={(v) => set({ textColor: v })} />
                    <ColorPickerField label={t('cms.builder.style.backgroundColor')} value={style().backgroundColor} defaultValue={effectiveBg() ?? '#ffffff'} onChange={(v) => set({ backgroundColor: v })} />
                </div>
                <Show when={isLowContrast(effectiveBg(), effectiveText())}>
                    <p class="text-xs text-amber-600">⚠ {t('cms.builder.style.contrastWarning')}</p>
                </Show>
            </Show>
        </div>
    );
}
