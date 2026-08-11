import { createResource, createSignal, Show } from 'solid-js';
import { Select } from '@core/components/control/Select';
import { Button } from '@core/components/button/Button';
import { toast } from '@core/components/toast/ToastProvider';
import { SiteLocaleSettingsService } from '@/shared/services/siteLocaleSettings/siteLocaleSettings.service';
import { t } from '@/shared/i18n/t';

/**
 * "+ Thêm bản dịch" (Phase 3 mục 3, Task 15) — dùng chung cho form sửa Page (manageCmsPages.page.tsx)
 * VÀ form sửa Content Entry (manageContentEntries.page.tsx), 2 nơi DUY NHẤT có khái niệm bản ghi đa
 * ngôn ngữ (`locale`/`translationGroupId`, Task 10-14). Chỉ hiện khi đang SỬA (không phải Tạo mới —
 * "bản dịch" của cái gì đó chưa tồn tại là vô nghĩa), do CALLER quyết định render hay không (component
 * này không tự biết create/update).
 *
 * Options = `enabledLocales` (getSiteLocaleSettings, Task 11) TRỪ `currentLocale` của record đang
 * sửa — KHÔNG lọc thêm theo "locale nào đã có bản dịch rồi" (BE `createTranslation`/
 * `createContentEntryTranslation` tự throw ConflictException nếu nhóm dịch đã có bản locale đó, xem
 * page.service.ts — để BE là nguồn sự thật DUY NHẤT, tránh 2 nơi cùng phải đồng bộ đúng danh sách
 * "đã dịch" mỗi khi thêm/xoá 1 bản dịch).
 */
export function AddTranslationButton(props: {
    /** Locale hiện tại của record đang sửa — loại khỏi options (tự dịch sang chính nó vô nghĩa). */
    currentLocale?: string;
    /** Gọi `createPageTranslation`/`createContentEntryTranslation` rồi tự xử lý kết quả (điều
     * hướng sang Page Builder, hoặc setFormlogItem để tiếp tục sửa ngay trong modal — khác nhau
     * giữa Page và Content Entry nên để CALLER quyết định, component này chỉ lo UI chọn locale). */
    onCreate: (locale: string) => Promise<void>;
}) {
    const [settings] = createResource(() => SiteLocaleSettingsService.getSiteLocaleSettings());
    const [locale, setLocale] = createSignal('');
    const [creating, setCreating] = createSignal(false);

    const options = () => (settings()?.enabledLocales || [])
        .filter((code) => code !== props.currentLocale)
        .map((code) => ({ value: code, label: code }));

    const handleCreate = async () => {
        const selected = locale();
        if (!selected) {
            toast().danger(t('cms.translations.errorSelectLocale'));
            return;
        }
        setCreating(true);
        try {
            await props.onCreate(selected);
            setLocale('');
        } catch (err) {
            toast().danger(t('cms.translations.createError'), err instanceof Error ? err.message : undefined);
        } finally {
            setCreating(false);
        }
    };

    // Rỗng khi site chưa cấu hình thêm ngôn ngữ nào khác locale hiện tại (vd site chỉ có "vi") —
    // ẩn hẳn control thay vì hiện Select trống vô dụng.
    return (
        <Show when={options().length > 0}>
            <div class="flex items-center gap-2">
                <Select
                    native
                    fieldless
                    value={locale()}
                    onChange={(v) => setLocale(String(v ?? ''))}
                    options={options()}
                    placeholder={t('cms.translations.selectLocalePlaceholder')}
                    class="max-w-[160px]"
                />
                <Button sm outline loading={creating()} onClick={handleCreate} label={t('cms.translations.createButton')} />
            </div>
        </Show>
    );
}
