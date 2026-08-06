import { NativeSelect } from '@core/components/control/NativeSelect';
import { ColorPickerField } from './ColorPickerField';
import { t } from '@/shared/i18n/t';

const FONT_FAMILY_OPTIONS = () => [
    { value: '', label: t('cms.builder.pageSettings.fontDefault') },
    { value: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif`, label: t('cms.builder.pageSettings.fontSans') },
    { value: `Georgia, 'Times New Roman', serif`, label: t('cms.builder.pageSettings.fontSerif') },
    { value: `'Courier New', Courier, monospace`, label: t('cms.builder.pageSettings.fontMono') },
];

export interface PageStyle {
    backgroundColor?: string;
    fontFamily?: string;
}

export interface PageSettingsPanelProps {
    style?: PageStyle;
    onChange: (patch: Partial<PageStyle>) => void;
}

/**
 * Nền/font áp cho TOÀN trang (khác Style tab của từng Section — cái đó chỉ đổi 1
 * khối). Đây là backdrop chung phía sau mọi khối, và font mặc định của trang khi
 * 1 khối không tự đặt font riêng. Để trống = dùng mặc định của theme/site.
 */
export function PageSettingsPanel(props: PageSettingsPanelProps) {
    return (
        <div class="space-y-5">
            <div>
                <ColorPickerField
                    label={t('cms.builder.pageSettings.backgroundLabel')}
                    value={props.style?.backgroundColor}
                    defaultValue="#ffffff"
                    onChange={(v) => props.onChange({ backgroundColor: v })}
                />
                <p class="mt-1 text-xs text-neutral-400">{t('cms.builder.pageSettings.backgroundHint')}</p>
            </div>

            <div>
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
