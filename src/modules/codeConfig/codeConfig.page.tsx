import { createSignal, Show, For, createEffect } from 'solid-js';
import { Card } from '@core/components/utilities/Card';
import { Input } from '@core/components/control/Input';
import { Icon } from '@shared/components/icons/Icon';
import { Button } from '@core/components/button/Button';
import { InputNumber } from '@/core/components/control/InputNumber';
import { generateForm } from '@core/components/form/generateForm';
import { CodeConfigDTO, CodeConfigService } from '@/shared/services/codeConfig/codeConfig.service';
import { toast } from '@core/components/toast/ToastProvider';
import { createStore } from 'solid-js/store';
import { Toggle } from '@/core/components/control/Toggle';
import { useIsAgencyView } from '@/shared/hooks/useIsAgencyView';
import { agencyActingTenantId } from '@/shared/contexts/agency/agencyActingTenant';
import { ensureAgencyActingTenant } from '@/shared/contexts/agency/agencyWriteGuard';
import { t } from '@/shared/i18n/t';

// Example entity types demonstrating the sequential-code-generation pattern
// (see CodeConfigService / ECodeEntityType) — replace with your product's real
// document/record types that need auto-generated codes.
const ENTITY_TYPE_OPTIONS = [
  { label: t('codeConfig.entityLabels.invoiceOption'), value: 'INVOICE' },
  { label: t('codeConfig.entityLabels.orderOption'), value: 'ORDER' },
  { label: t('codeConfig.entityLabels.contractOption'), value: 'CONTRACT' },
  { label: t('codeConfig.entityLabels.documentOption'), value: 'DOCUMENT' },
];

const ENTITY_LABEL: Record<string, string> = {
  INVOICE: t('codeConfig.entityLabels.invoice'),
  ORDER: t('codeConfig.entityLabels.order'),
  CONTRACT: t('codeConfig.entityLabels.contract'),
  DOCUMENT: t('codeConfig.entityLabels.document'),
};

const ENTITY_ICON: Record<string, string> = {
  INVOICE: 'heroicons-outline:receipt-tax',
  ORDER: 'heroicons-outline:shopping-cart',
  CONTRACT: 'heroicons-outline:document-text',
  DOCUMENT: 'heroicons-outline:document',
};

function generatePreview(config: { prefix?: string; separator?: string; includeYear?: boolean; sequenceLength?: number }) {
  const parts: string[] = [];
  if (config.prefix) parts.push(config.prefix);
  if (config.includeYear) parts.push(new Date().getFullYear().toString());
  parts.push('0'.repeat(config.sequenceLength || 5).slice(0, -1) + '1');
  return parts.join(config.separator || '-');
}

function CodeConfigCard(props: { entityType: string; existing?: CodeConfigDTO; onSaved: () => void }) {
  const isAgency = useIsAgencyView();
  const { Form, submitting } = generateForm({
    handleSubmit: async (values: any) => {
      if (!ensureAgencyActingTenant(isAgency())) return { success: false };
      await CodeConfigService.upsertCodeConfig({
        data: {
          entityType: props.entityType as any,
          prefix: values.prefix || undefined,
          separator: values.separator || '-',
          includeYear: values.includeYear === true || values.includeYear === 'true',
          sequenceLength: values.sequenceLength ? Number(values.sequenceLength) : 5,
          customPattern: values.customPattern || undefined,
        },
      });
      toast().success(t('codeConfig.card.saveSuccess', { entity: ENTITY_LABEL[props.entityType] }));
      props.onSaved();
      return { success: true };
    },


  });

  const icon = ENTITY_ICON[props.entityType] || 'heroicons-outline:hashtag';
  const label = ENTITY_LABEL[props.entityType] || props.entityType;

  return (
    <Card class="p-5 border-none shadow-sm">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
          <Icon name={icon} class="w-5 h-5 text-blue-600" />
        </div>
        <div class="flex-1">
          <h3 class="text-sm font-bold text-gray-900">{label}</h3>
          <Show when={props.existing}>
            <p class="text-xs text-gray-400">
              {t('codeConfig.card.currentSequence')} <span class="font-mono font-semibold text-gray-600">{props.existing?.currentSequence ?? 0}</span>
            </p>
          </Show>
        </div>
        <Show when={props.existing}>
          <span class="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{t('codeConfig.card.configured')}</span>
        </Show>
      </div>

      <Form class="grid grid-cols-12 gap-3">
        <div class="col-span-4">
          <Form.Field name="prefix" label={t('codeConfig.card.prefixLabel')}>
            <Input placeholder={t('codeConfig.card.prefixPlaceholder')} class="h-9 text-sm" defaultValue={props.existing?.prefix!} />
          </Form.Field>
        </div>
        <div class="col-span-3">
          <Form.Field name="separator" label={t('codeConfig.card.separatorLabel')}>
            <Input placeholder={t('codeConfig.card.separatorPlaceholder')} class="h-9 text-sm" defaultValue={props.existing?.separator!} />
          </Form.Field>
        </div>

        <div class="col-span-2">
          <Form.Field name="sequenceLength" label={t('codeConfig.card.sequenceLengthLabel')}>
            <InputNumber min={5} max={10} placeholder={t('codeConfig.card.sequenceLengthPlaceholder')} defaultValue={props.existing?.sequenceLength!} />
          </Form.Field>
        </div>
        <div class="col-span-3">
          <Form.Field name="includeYear" label={t('codeConfig.card.includeYearLabel')}>
            <Toggle defaultValue={props.existing?.includeYear!} />
          </Form.Field>
        </div>

        <div class="col-span-12 flex items-center justify-between pt-2 border-t border-dashed border-gray-200">
          <div class="text-xs text-gray-400">
            {t('codeConfig.card.samplePreview')} <span class="font-mono font-semibold text-gray-700">
              {generatePreview({
                prefix: props.existing?.prefix || 'CODE',
                separator: props.existing?.separator || '-',
                includeYear: props.existing?.includeYear ?? true,
                sequenceLength: props.existing?.sequenceLength || 5,
              })}
            </span>
          </div>
          <Button
            submit
            main
            class="px-4 py-2 text-xs font-bold rounded-lg"
            label={t('codeConfig.card.save')}
            loading={submitting()}
          />
        </div>
      </Form>
    </Card>
  );
}

export function CodeConfigPage() {
  const isAgency = useIsAgencyView();
  const [configs, setConfigs] = createStore<CodeConfigDTO[]>([]);
  const [loading, setLoading] = createSignal(true);

  const loadConfigs = async () => {
    // Agency chưa chọn tổ chức → không gọi API (tránh 403), hiển thị rỗng.
    if (isAgency() && !agencyActingTenantId()) {
      setConfigs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const items = await CodeConfigService.getMyCodeConfigs();
      setConfigs(items);
    } finally {
      setLoading(false);
    }
  };

  // Nạp lại khi đổi tổ chức đang thao tác (agency) — chạy cả lần đầu.
  createEffect(() => { agencyActingTenantId(); loadConfigs(); });

  const getConfigByType = (type: string) => configs.find((c) => c.entityType === type);

  return (
    <div class="max-w-3xl mx-auto space-y-6 animate-in">
      <div class="flex items-center gap-3 mb-2">
        <div class="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
          <Icon name="heroicons-outline:cog" class="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h2 class="text-xl font-black text-gray-900">{t('codeConfig.page.title')}</h2>
          <p class="text-sm text-gray-500">{t('codeConfig.page.subtitle')}</p>
        </div>
      </div>

      <Show when={!loading()} fallback={
        <div class="flex justify-center py-12">
          <div class="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full" />
        </div>
      }>
        <div class="space-y-4">
          <For each={ENTITY_TYPE_OPTIONS}>
            {(opt) => (
              <CodeConfigCard
                entityType={opt.value}
                existing={getConfigByType(opt.value)}
                onSaved={loadConfigs}
              />
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
