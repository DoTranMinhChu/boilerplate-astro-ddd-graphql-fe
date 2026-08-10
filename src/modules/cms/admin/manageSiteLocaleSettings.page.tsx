import { createSignal, onMount, For, Show } from 'solid-js';
import { Card } from '@core/components/utilities/Card';
import { Icon } from '@shared/components/icons/Icon';
import { Input } from '@core/components/control/Input';
import { Select } from '@core/components/control/Select';
import { Button } from '@core/components/button/Button';
import { toast } from '@core/components/toast/ToastProvider';
import { t } from '@/shared/i18n/t';
import { SiteLocaleSettingsService } from '@/shared/services/siteLocaleSettings/siteLocaleSettings.service';

// Màn cấu hình đơn (KHÔNG dùng Datatable CRUD) — SiteLocaleSettings là singleton thật ở
// BE (chỉ 1 bản ghi, tự tạo mặc định ['vi'] nếu DB rỗng, không có mutation "create" riêng).
// Cùng kiểu màn với ManageSystemConfigPage (src/modules/admin/pages/manageSystemConfig.page.tsx).
export function ManageSiteLocaleSettingsPage() {
  const [loading, setLoading] = createSignal(true);
  const [saving, setSaving] = createSignal(false);
  const [enabledLocales, setEnabledLocales] = createSignal<string[]>([]);
  const [defaultLocale, setDefaultLocale] = createSignal('');
  const [newLocale, setNewLocale] = createSignal('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await SiteLocaleSettingsService.getSiteLocaleSettings();
      setEnabledLocales(data?.enabledLocales ?? []);
      setDefaultLocale(data?.defaultLocale ?? '');
    } catch (e: any) {
      toast().danger(e?.message || t('cms.siteLocaleSettings.loadError'));
    } finally {
      setLoading(false);
    }
  };

  onMount(load);

  const handleAddLocale = () => {
    const code = newLocale().trim();
    if (!code) {
      toast().danger(t('cms.siteLocaleSettings.errorEmptyLocale'));
      return;
    }
    if (enabledLocales().includes(code)) {
      toast().danger(t('cms.siteLocaleSettings.errorDuplicateLocale'));
      return;
    }
    setEnabledLocales([...enabledLocales(), code]);
    setNewLocale('');
    // Danh sách rỗng trước đó (trường hợp hiếm) → mã vừa thêm tự trở thành mặc định,
    // tránh để defaultLocale trống khi Select bên dưới chưa có option nào để hiển thị.
    if (!defaultLocale()) setDefaultLocale(code);
  };

  const handleRemoveLocale = (code: string) => {
    if (code === defaultLocale()) {
      toast().danger(t('cms.siteLocaleSettings.errorRemoveDefaultLocale'));
      return;
    }
    if (enabledLocales().length <= 1) {
      toast().danger(t('cms.siteLocaleSettings.errorNeedAtLeastOne'));
      return;
    }
    setEnabledLocales(enabledLocales().filter((l) => l !== code));
  };

  const localeOptions = () => enabledLocales().map((l) => ({ label: l, value: l }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await SiteLocaleSettingsService.updateSiteLocaleSettings({
        enabledLocales: enabledLocales(),
        defaultLocale: defaultLocale(),
      });
      setEnabledLocales(saved?.enabledLocales ?? enabledLocales());
      setDefaultLocale(saved?.defaultLocale ?? defaultLocale());
      toast().success(t('cms.siteLocaleSettings.saveSuccess'));
    } catch (e: any) {
      // BE ném BadRequestException("defaultLocale phải nằm trong enabledLocales.") khi
      // 2 field mâu thuẫn — hiển thị thẳng message BE, không có message riêng ở FE.
      toast().danger(e?.message || t('cms.siteLocaleSettings.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div class="space-y-6 animate-in max-w-2xl">
      <div>
        <h1 class="text-xl font-bold text-gray-900">{t('cms.siteLocaleSettings.title')}</h1>
        <p class="text-sm text-gray-500 mt-1">{t('cms.siteLocaleSettings.description')}</p>
      </div>

      <Card class="border border-gray-100 shadow-sm p-6">
        <Show
          when={!loading()}
          fallback={<div class="text-sm text-gray-400 py-6 text-center">...</div>}
        >
          <div class="space-y-6">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1">
                {t('cms.siteLocaleSettings.enabledLocalesLabel')}
              </label>
              <p class="text-xs text-gray-400 mb-3">
                {t('cms.siteLocaleSettings.enabledLocalesHint')}
              </p>

              <div class="flex flex-wrap gap-2 mb-3">
                <For each={enabledLocales()}>
                  {(code) => (
                    <span class="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-sm font-medium text-blue-700">
                      {code}
                      <Show when={code === defaultLocale()}>
                        <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-600 text-white">
                          {t('cms.siteLocaleSettings.defaultLocaleLabel')}
                        </span>
                      </Show>
                      <button
                        type="button"
                        onClick={() => handleRemoveLocale(code)}
                        title={t('cms.siteLocaleSettings.removeButton')}
                        class="text-blue-400 hover:text-red-500 transition-colors"
                      >
                        <Icon name="heroicons-outline:x" class="w-3.5 h-3.5" />
                      </button>
                    </span>
                  )}
                </For>
              </div>

              <div class="flex items-center gap-2">
                <Input
                  value={newLocale()}
                  onChange={(v) => setNewLocale(String(v ?? ''))}
                  placeholder={t('cms.siteLocaleSettings.addLocalePlaceholder')}
                  fieldless
                  class="max-w-[160px] font-mono"
                  onKeyDown={(e: KeyboardEvent) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddLocale();
                    }
                  }}
                />
                <Button sm outline onClick={handleAddLocale} label={t('cms.siteLocaleSettings.addButton')} />
              </div>
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1">
                {t('cms.siteLocaleSettings.defaultLocaleLabel')}
              </label>
              <Select
                native
                fieldless
                value={defaultLocale()}
                onChange={(v) => setDefaultLocale(String(v ?? ''))}
                options={localeOptions()}
                class="max-w-[200px]"
              />
            </div>

            <div class="flex justify-end pt-4 border-t border-gray-100">
              <Button
                main
                loading={saving()}
                onClick={handleSave}
                label={t('cms.siteLocaleSettings.saveButton')}
                class="h-10 px-6 rounded-xl font-semibold"
              />
            </div>
          </div>
        </Show>
      </Card>
    </div>
  );
}
