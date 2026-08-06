import { Show } from 'solid-js';
import { NativeSelect } from '@core/components/control/NativeSelect';
import { InputImage } from '@core/components/control/InputImage';
import { InputNumber } from '@core/components/control/InputNumber';
import { ColorPickerField } from './ColorPickerField';
import { t } from '@/shared/i18n/t';
import type { PageBackgroundType, PageStyle } from '@/modules/cms/cms.types';

const FONT_FAMILY_OPTIONS = () => [
    { value: '', label: t('cms.builder.pageSettings.fontDefault') },
    { value: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif`, label: t('cms.builder.pageSettings.fontSans') },
    { value: `Georgia, 'Times New Roman', serif`, label: t('cms.builder.pageSettings.fontSerif') },
    { value: `'Courier New', Courier, monospace`, label: t('cms.builder.pageSettings.fontMono') },
];

const BACKGROUND_TYPE_OPTIONS = () => [
    { value: 'transparent', label: t('cms.builder.pageSettings.bgTypeTransparent') },
    { value: 'color', label: t('cms.builder.pageSettings.bgTypeColor') },
    { value: 'gradient', label: t('cms.builder.pageSettings.bgTypeGradient') },
    { value: 'image', label: t('cms.builder.pageSettings.bgTypeImage') },
    { value: 'video', label: t('cms.builder.pageSettings.bgTypeVideo') },
];

export interface PageSettingsPanelProps {
    style?: PageStyle;
    onChange: (patch: Partial<PageStyle>) => void;
}

/**
 * Nền/font áp cho TOÀN trang (khác Style tab của từng Section — cái đó chỉ đổi 1
 * khối). Đây là backdrop chung phía sau mọi khối. 5 kiểu nền: Trong suốt (mặc định
 * theme) / Màu phẳng / Gradient 2 màu / Ảnh (có làm mờ + lớp phủ) / Video lặp (có
 * lớp phủ) — đủ cho phần lớn nhu cầu "siêu linh động" mà không cần biết CSS.
 */
export function PageSettingsPanel(props: PageSettingsPanelProps) {
    const bgType = () => props.style?.backgroundType ?? 'transparent';
    const needsOverlay = () => bgType() === 'image' || bgType() === 'video';

    return (
        <div class="space-y-5">
            <div>
                <p class="mb-2 text-xs font-medium text-neutral-500">{t('cms.builder.pageSettings.backgroundLabel')}</p>
                <NativeSelect
                    value={bgType()}
                    onChange={(v: string) => props.onChange({ backgroundType: v as PageBackgroundType })}
                    options={BACKGROUND_TYPE_OPTIONS()}
                    optionGroups={[]}
                    emptyPlaceholder=""
                    fieldless
                />
                <p class="mt-1 text-xs text-neutral-400">{t('cms.builder.pageSettings.backgroundHint')}</p>
            </div>

            <Show when={bgType() === 'color'}>
                <ColorPickerField
                    label={t('cms.builder.pageSettings.colorLabel')}
                    value={props.style?.backgroundColor}
                    defaultValue="#ffffff"
                    onChange={(v) => props.onChange({ backgroundColor: v })}
                />
            </Show>

            <Show when={bgType() === 'gradient'}>
                <div class="grid grid-cols-2 gap-3">
                    <ColorPickerField
                        label={t('cms.builder.pageSettings.gradientFrom')}
                        value={props.style?.gradientFrom}
                        defaultValue="#4f46e5"
                        onChange={(v) => props.onChange({ gradientFrom: v })}
                    />
                    <ColorPickerField
                        label={t('cms.builder.pageSettings.gradientTo')}
                        value={props.style?.gradientTo}
                        defaultValue="#0ea5e9"
                        onChange={(v) => props.onChange({ gradientTo: v })}
                    />
                </div>
                <div>
                    <p class="mb-1 text-xs font-medium text-neutral-500">{t('cms.builder.pageSettings.gradientAngle')}</p>
                    <InputNumber
                        value={props.style?.gradientAngle ?? 135}
                        onChange={(v: number | null) => props.onChange({ gradientAngle: v ?? 135 })}
                        placeholder="135"
                        fieldless
                    />
                </div>
            </Show>

            <Show when={bgType() === 'image'}>
                <div>
                    <p class="mb-1 text-xs font-medium text-neutral-500">{t('cms.builder.pageSettings.imageLabel')}</p>
                    <InputImage value={props.style?.backgroundImage} onChange={(v: string | string[] | null) => props.onChange({ backgroundImage: typeof v === 'string' ? v : undefined })} fieldless />
                </div>
                <div>
                    <p class="mb-1 text-xs font-medium text-neutral-500">{t('cms.builder.pageSettings.blurLabel')}</p>
                    <InputNumber
                        value={props.style?.backgroundImageBlur ?? 0}
                        onChange={(v: number | null) => props.onChange({ backgroundImageBlur: v ?? 0 })}
                        placeholder="0"
                        fieldless
                    />
                    <p class="mt-1 text-xs text-neutral-400">{t('cms.builder.pageSettings.blurHint')}</p>
                </div>
            </Show>

            <Show when={bgType() === 'video'}>
                <div>
                    <p class="mb-1 text-xs font-medium text-neutral-500">{t('cms.builder.pageSettings.videoLabel')}</p>
                    <input
                        type="text"
                        value={props.style?.backgroundVideo ?? ''}
                        onInput={(e) => props.onChange({ backgroundVideo: e.currentTarget.value })}
                        placeholder="https://.../background.mp4"
                        class="w-full rounded-md border border-neutral-200 px-2.5 py-1.5 text-sm outline-none focus:border-primary-400"
                    />
                    <p class="mt-1 text-xs text-neutral-400">{t('cms.builder.pageSettings.videoHint')}</p>
                </div>
            </Show>

            <Show when={needsOverlay()}>
                <div class="grid grid-cols-2 gap-3 rounded-lg bg-neutral-50 p-3">
                    <ColorPickerField
                        label={t('cms.builder.pageSettings.overlayColor')}
                        value={props.style?.overlayColor}
                        defaultValue="#000000"
                        onChange={(v) => props.onChange({ overlayColor: v })}
                    />
                    <div>
                        <p class="mb-1 text-xs font-medium text-neutral-500">{t('cms.builder.pageSettings.overlayOpacity')}</p>
                        <InputNumber
                            value={props.style?.overlayOpacity ?? 0.4}
                            onChange={(v: number | null) => props.onChange({ overlayOpacity: v ?? 0.4 })}
                            placeholder="0.4"
                            fieldless
                        />
                    </div>
                </div>
                <p class="text-xs text-neutral-400">{t('cms.builder.pageSettings.overlayHint')}</p>
            </Show>

            <div class="border-t border-neutral-100 pt-4">
                <p class="mb-2 text-xs font-medium text-neutral-500">{t('cms.builder.pageSettings.fontLabel')}</p>
                <NativeSelect
                    value={props.style?.fontFamily ?? ''}
                    onChange={(v: string) => props.onChange({ fontFamily: v })}
                    options={FONT_FAMILY_OPTIONS()}
                    optionGroups={[]}
                    emptyPlaceholder=""
                    fieldless
                />
                <p class="mt-1 text-xs text-neutral-400">{t('cms.builder.pageSettings.fontHint')}</p>
            </div>
        </div>
    );
}
