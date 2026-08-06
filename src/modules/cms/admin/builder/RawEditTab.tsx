import { createSignal, createEffect, Show } from 'solid-js';
import { Button } from '@core/components/button/Button';
import { Icon } from '@shared/components/icons/Icon';
import { t } from '@/shared/i18n/t';
import type { SectionDTO } from '@/modules/cms/cms.types';

/** Các field admin có thể sửa — khớp `SavableFields` trong PageBuilder.page.tsx
 * (không gồm id/pageId/order/timestamps do Builder tự quản). */
const EDITABLE_KEYS = ['content', 'style', 'animation', 'dataSource', 'fieldMapping', 'visibilityRules', 'responsiveSettings', 'layoutPreset', 'theme', 'enabled'] as const;

function pickEditable(section: SectionDTO): Partial<SectionDTO> {
    const out: Partial<SectionDTO> = {};
    for (const key of EDITABLE_KEYS) {
        if (section[key] !== undefined) (out as Record<string, unknown>)[key] = section[key];
    }
    return out;
}

export interface RawEditTabProps {
    section: SectionDTO;
    onChange: (data: Partial<SectionDTO>) => void;
}

/**
 * Chỉnh trực tiếp JSON thô của khối — dành cho người rành kỹ thuật cần sửa nhanh
 * hoặc dán cấu hình từ nơi khác vào, không phải đi qua từng ô nhập của tab Nội
 * dung/Giao diện/Hiệu ứng. KHÔNG tự áp khi đang gõ dở (JSON không hợp lệ giữa
 * chừng là bình thường) — chỉ áp khi bấm "Áp dụng" và JSON hợp lệ.
 */
export function RawEditTab(props: RawEditTabProps) {
    const [text, setText] = createSignal('');
    const [error, setError] = createSignal<string>();
    const [dirty, setDirty] = createSignal(false);

    // Nạp lại từ section khi đổi khối đang chọn (không nạp lại khi admin đang gõ dở
    // trên CÙNG 1 khối — persist() debounce phía trên có thể trả patch ngược lại).
    createEffect((prevId?: string) => {
        const id = props.section.id;
        if (id !== prevId) {
            setText(JSON.stringify(pickEditable(props.section), null, 2));
            setError(undefined);
            setDirty(false);
        }
        return id;
    });

    const apply = () => {
        try {
            const parsed = JSON.parse(text());
            if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
                throw new Error(t('cms.builder.rawEdit.mustBeObject'));
            }
            setError(undefined);
            setDirty(false);
            props.onChange(parsed as Partial<SectionDTO>);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        }
    };

    const reset = () => {
        setText(JSON.stringify(pickEditable(props.section), null, 2));
        setError(undefined);
        setDirty(false);
    };

    return (
        <div class="space-y-3">
            <div class="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <Icon name="heroicons-outline:code-bracket" class="mt-0.5 shrink-0" />
                <p>{t('cms.builder.rawEdit.warning')}</p>
            </div>

            <textarea
                value={text()}
                onInput={(e) => { setText(e.currentTarget.value); setDirty(true); }}
                spellcheck={false}
                rows={20}
                class="w-full rounded-lg border border-neutral-200 bg-neutral-950 p-3 font-mono text-xs text-neutral-100 outline-none focus:border-primary-400"
            />

            <Show when={error()}>
                <p class="text-xs font-medium text-red-600">⚠ {error()}</p>
            </Show>

            <div class="flex justify-end gap-2">
                <Button sm outline onClick={reset} disabled={!dirty()}>
                    {t('cms.builder.rawEdit.resetButton')}
                </Button>
                <Button sm solid main onClick={apply} disabled={!dirty()}>
                    {t('cms.builder.rawEdit.applyButton')}
                </Button>
            </div>
        </div>
    );
}
