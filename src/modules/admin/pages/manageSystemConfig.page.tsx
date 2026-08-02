import { createEffect, createSignal, For, onMount } from 'solid-js';
import { Card } from '@core/components/utilities/Card';
import { Icon } from '@shared/components/icons/Icon';
import { toast } from '@core/components/toast/ToastProvider';
import { SystemConfigService, SystemConfigDTO } from '@/shared/services/systemConfig/systemConfig.service';
import { clearSystemConfigCache, useSystemConfig } from '@/shared/contexts/systemConfig/SystemConfigContext';
import { Toggle } from '@core/components/control/Toggle';
import { Button } from '@core/components/button/Button';
import { t, type TranslationKey } from '@/shared/i18n/t';

interface FlagMeta {
  key: keyof Omit<SystemConfigDTO, 'id' | 'updatedAt'>;
  label: TranslationKey;
  description: TranslationKey;
  defaultWarning?: TranslationKey;
}

// NOTE: `title`/`subtitle`/`label`/`description` fields hold TRANSLATION KEYS, not
// literal strings — this array is a module-scoped constant evaluated once at import
// time, so translating eagerly here would freeze the text at whichever locale was
// active on load. Actual translation happens at render time via `t(...)` below,
// keeping it reactive to locale switches.
const FLAG_GROUPS: Array<{
  title: TranslationKey;
  subtitle: TranslationKey;
  icon: string;
  color: string;
  bg: string;
  border: string;
  flags: FlagMeta[];
}> = [
  {
    title: 'admin.manageSystemConfig.groups.staff.title',
    subtitle: 'admin.manageSystemConfig.groups.staff.subtitle',
    icon: 'heroicons-outline:briefcase',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    flags: [
      {
        key: 'allowMerchantSelfRegister',
        label: 'admin.manageSystemConfig.groups.staff.selfRegisterLabel',
        description: 'admin.manageSystemConfig.groups.staff.selfRegisterDescription',
      },
    ],
  },
  {
    title: 'admin.manageSystemConfig.groups.partner.title',
    subtitle: 'admin.manageSystemConfig.groups.partner.subtitle',
    icon: 'heroicons-outline:office-building',
    color: 'text-violet-700',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
    flags: [
      {
        key: 'allowAgencyCreateTenant',
        label: 'admin.manageSystemConfig.groups.partner.createTenantLabel',
        description: 'admin.manageSystemConfig.groups.partner.createTenantDescription',
      },
      {
        key: 'allowAgencyCreateTenantAccount',
        label: 'admin.manageSystemConfig.groups.partner.createTenantAccountLabel',
        description: 'admin.manageSystemConfig.groups.partner.createTenantAccountDescription',
      },
    ],
  },
];

export function ManageSystemConfigPage() {
  const { config, reload } = useSystemConfig();
  const [values, setValues] = createSignal<Record<string, boolean>>({});
  const [saving, setSaving] = createSignal(false);
  const [dirty, setDirty] = createSignal(false);

  // Reactive sync: mỗi khi config() thay đổi (từ cache hoặc API) thì tự cập nhật
  // values() — chỉ skip khi user đang có thay đổi chưa lưu (dirty)
  createEffect(() => {
    const cfg = config();
    if (!cfg || dirty()) return;
    const init: Record<string, boolean> = {};
    FLAG_GROUPS.forEach(g => g.flags.forEach(f => {
      init[f.key] = (cfg as any)[f.key] ?? true;
    }));
    setValues(init);
  });

  // Admin luôn force-refresh để không bao giờ thấy config cũ từ cache
  onMount(() => { reload(true); });

  const handleToggle = (key: string, val: boolean) => {
    setValues(prev => ({ ...prev, [key]: val }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await SystemConfigService.updateSystemConfig(values() as any);
      clearSystemConfigCache();
      await reload(true);  // cập nhật config() → createEffect tự sync values()
      setDirty(false);     // dirty = false → createEffect chạy lại → values() đúng
      toast().success(t('admin.manageSystemConfig.saveSuccess'));
    } catch (e: any) {
      toast().danger(e?.message ?? t('admin.manageSystemConfig.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div class="space-y-6 animate-in max-w-3xl">

      <div class="flex items-start justify-between gap-4">
        <div>
          <h1 class="text-xl font-bold text-gray-900">{t('admin.manageSystemConfig.title')}</h1>
          <p class="text-sm text-gray-500 mt-1">
            {t('admin.manageSystemConfig.description')}
          </p>
        </div>
        <Button
          main
          label={t('admin.manageSystemConfig.saveButton')}
          loading={saving()}
          disabled={!dirty() || saving()}
          onClick={handleSave}
          class="shrink-0 h-10 px-5 rounded-xl font-semibold"
        />
      </div>

      <For each={FLAG_GROUPS}>
        {(group) => (
          <Card class="border border-gray-100 shadow-sm p-0 overflow-hidden">
            <div class={`flex items-center gap-3 px-5 py-4 ${group.bg} border-b ${group.border}`}>
              <div class={`w-9 h-9 rounded-xl flex items-center justify-center ${group.bg} border ${group.border}`}>
                <Icon name={group.icon} class={`w-5 h-5 ${group.color}`} />
              </div>
              <div>
                <p class={`text-sm font-bold ${group.color}`}>{t(group.title)}</p>
                <p class="text-[11px] text-gray-400 mt-0.5">{t(group.subtitle)}</p>
              </div>
            </div>

            <div class="divide-y divide-gray-50">
              <For each={group.flags}>
                {(flag) => (
                  <div class="flex items-start gap-4 px-5 py-4">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <p class="text-sm font-semibold text-gray-800">{t(flag.label)}</p>
                        {flag.defaultWarning && (
                          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            {t('admin.manageSystemConfig.defaultOffBadge')}
                          </span>
                        )}
                      </div>
                      <p class="text-xs text-gray-400 mt-0.5 leading-relaxed">{t(flag.description)}</p>
                    </div>
                    <div class="shrink-0 mt-0.5">
                      <Toggle
                        value={values()[flag.key] ?? true}
                        onChange={(val) => handleToggle(flag.key, val)}
                      />
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Card>
        )}
      </For>

      {dirty() && (
        <div class="fixed bottom-6 right-6 z-50">
          <Button
            main
            label={t('admin.manageSystemConfig.saveButton')}
            loading={saving()}
            onClick={handleSave}
            class="h-11 px-6 rounded-xl font-bold shadow-lg shadow-blue-200"
          />
        </div>
      )}
    </div>
  );
}
