import { Input } from '@core/components/control/Input';
import { InputPassword } from '@core/components/control/InputPasssword';
import { InputNumber } from '@core/components/control/InputNumber';
import { Textarea } from '@core/components/control/Textarea';
import { Toggle } from '@core/components/control/Toggle';
import { Card } from '@core/components/utilities/Card';
import { Icon } from '@shared/components/icons/Icon';
import { EmailConfigDTO, EmailConfigService } from '@/shared/services/emailConfig/emailConfig.service';
import { CreateEmailConfigInput, UpdateEmailConfigInput } from '@shared/generated/typed-graphql';
import { generateDatatable, PagingArgsInput } from '@/core/components/table/GeneratedDatatable';
import { Show, createSignal } from 'solid-js';
import { formatDatetimeToNow } from '@core/helpers/date';
import { SmtpGuideDialog } from '@/modules/admin/components/SmtpGuideDialog';
import { toast } from '@core/components/toast/ToastProvider';
import { t } from '@/shared/i18n/t';

const DEFAULT_TEMPLATE = `<html>
<body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  {{brandLogoHtml}}
  <h2 style="color: {{brandColor}};">Đặt lại mật khẩu</h2>
  <p>Xin chào <strong>{{username}}</strong>,</p>
  <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
  <p style="margin: 24px 0;">
    <a href="{{resetLink}}"
       style="background: {{brandColor}}; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
      Đặt lại mật khẩu
    </a>
  </p>
  <p style="color: #6b7280; font-size: 13px;">Link này có hiệu lực trong {{expiryMinutes}} phút.</p>
  <p style="color: #6b7280; font-size: 13px;">Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
  <p style="color: #9ca3af; font-size: 11px;">{{appName}}</p>
</body>
</html>`;

export function ManageEmailConfigPage() {
  const [showGuide, setShowGuide] = createSignal(false);

  // ── Gửi email thử nghiệm ──────────────────────────────────────────────────
  const [testItem, setTestItem] = createSignal<EmailConfigDTO | null>(null);
  const [testEmail, setTestEmail] = createSignal('');
  const [testSubmitting, setTestSubmitting] = createSignal(false);

  const handleOpenTest = (item: EmailConfigDTO) => {
    setTestEmail('');
    setTestItem(item);
  };
  const handleCloseTest = () => {
    setTestItem(null);
    setTestEmail('');
  };
  const handleSendTest = async () => {
    const item = testItem();
    if (!item) return;
    if (!testEmail().trim() || !testEmail().includes('@')) {
      toast().danger(t('admin.manageEmailConfig.errorInvalidTestEmail'));
      return;
    }
    try {
      setTestSubmitting(true);
      const result = await EmailConfigService.testEmailConfig({ id: item.id!, to: testEmail().trim() });
      if (result?.success) {
        toast().success(result.message || t('admin.manageEmailConfig.testEmailSentDefault'));
        handleCloseTest();
      } else {
        toast().danger(result?.message || t('admin.manageEmailConfig.testEmailFailedDefault'));
      }
    } catch (e: any) {
      toast().danger(e?.message || t('admin.manageEmailConfig.testEmailFailedDefault'));
    } finally {
      setTestSubmitting(false);
    }
  };

  const { Datatable } = generateDatatable<
    PagingArgsInput, EmailConfigDTO, EmailConfigDTO, EmailConfigDTO, CreateEmailConfigInput, UpdateEmailConfigInput
  >({
    service: EmailConfigService,
    paginatedQuery: EmailConfigService.getAllEmailConfig,
    queryInput: { sort: { createdAt: 'DESC' } },
    loadMode: 'page',
    limit: 20,
    itemQuery: (item) => EmailConfigService.getOneEmailConfig(item?.id!),
    createMutation: (data) => EmailConfigService.createEmailConfig(data),
    updateMutation: (id, data) => EmailConfigService.updateEmailConfig({ id, data }),
    deleteMutation: (item) => EmailConfigService.deleteEmailConfig(item?.id!),
  });

  return (
    <div class="space-y-6 animate-in">
      <SmtpGuideDialog isOpen={showGuide()} onClose={() => setShowGuide(false)} />

      <Card class="border-none shadow-sm">
        <Datatable id="EmailConfigDatatable">
          <Datatable.Header class="mb-6">
            <Datatable.Title
              title={t('admin.manageEmailConfig.title')}
              description={t('admin.manageEmailConfig.description')}
            />
            <Datatable.Buttons>
              <button
                type="button"
                onClick={() => setShowGuide(true)}
                class="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors"
              >
                <Icon name="heroicons-outline:book-open" class="w-4 h-4" />
                {t('admin.manageEmailConfig.smtpGuideButton')}
              </button>
              <Datatable.ButtonRefresh />
              <Datatable.ButtonCreate label={t('admin.manageEmailConfig.addButton')} />
            </Datatable.Buttons>
          </Datatable.Header>

          <Datatable.Table>
            <Datatable.Column title={t('admin.manageEmailConfig.columnConfigName')} class="min-w-[200px]">
              {(item) => (
                <div class="flex flex-col gap-0.5">
                  <div class="flex items-center gap-2">
                    <span class="font-semibold text-gray-900">{item.name}</span>
                    <Show when={item.isDefault}>
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                        {t('admin.manageBrands.defaultBadge')}
                      </span>
                    </Show>
                  </div>
                  <span class="text-xs text-gray-400">{item.senderEmail}</span>
                </div>
              )}
            </Datatable.Column>

            <Datatable.Column title="Domain" class="hidden md:table-cell">
              {(item) => (
                <Show when={item.domain} fallback={<span class="text-xs text-gray-300 italic">—</span>}>
                  <span class="text-sm font-mono text-gray-600 bg-gray-50 px-2 py-0.5 rounded">{item.domain}</span>
                </Show>
              )}
            </Datatable.Column>

            <Datatable.Column title="SMTP" class="hidden lg:table-cell">
              {(item) => (
                <div class="flex flex-col gap-0.5">
                  <span class="text-sm text-gray-700">{item.smtpHost}:{item.smtpPort}</span>
                  <span class="text-xs text-gray-400">{item.smtpUser}</span>
                </div>
              )}
            </Datatable.Column>

            <Datatable.Column title={t('admin.smtpGuide.common.encryptionLabel')} center fitContent class="hidden lg:table-cell">
              {(item) => (
                <Show
                  when={item.smtpSecure}
                  fallback={<span class="text-xs text-gray-400">STARTTLS</span>}
                >
                  <span class="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">SSL/TLS</span>
                </Show>
              )}
            </Datatable.Column>

            <Datatable.Column title={t('admin.manageBrands.columnStatus')} center fitContent>
              {(item) => (
                <Show
                  when={item.isActive}
                  fallback={
                    <span class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-50 text-gray-400">
                      <Icon name="heroicons-outline:pause" class="w-3 h-3" /> {t('admin.manageBrands.statusOff')}
                    </span>
                  }
                >
                  <span class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-50 text-green-700">
                    <Icon name="heroicons-outline:check" class="w-3 h-3" /> {t('admin.manageEmailConfig.statusOnBadge')}
                  </span>
                </Show>
              )}
            </Datatable.Column>

            <Datatable.Column title={t('admin.manageEmailConfig.columnUpdated')} class="hidden xl:table-cell text-gray-400">
              {(item) => (
                <span class="text-xs italic">
                  {item.updatedAt ? formatDatetimeToNow(item.updatedAt as any, { addSuffix: true }) : '—'}
                </span>
              )}
            </Datatable.Column>

            <Datatable.Column right fitContent>
              {(item) => (
                <Datatable.CellButtons>
                  <button
                    type="button"
                    onClick={() => handleOpenTest(item)}
                    title={t('admin.manageEmailConfig.sendTestTitle')}
                    class="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-black text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition whitespace-nowrap"
                  >
                    <Icon name="heroicons-outline:paper-airplane" class="w-3.5 h-3.5" />
                    <span class="hidden sm:inline">{t('admin.manageEmailConfig.sendTestButtonLabel')}</span>
                  </button>
                  <Datatable.CellButtonUpdate item={item} />
                  <Datatable.CellButtonDelete item={item} itemName={item.name!} />
                </Datatable.CellButtons>
              )}
            </Datatable.Column>
          </Datatable.Table>

          <Datatable.Pagination class="border-t border-gray-100 p-4" />

          <Datatable.Formlog
            class="min-w-2xl"
            viewMode="modal"
            modalType="dialog"
            transformCreateInitialValues={() => ({
              isActive: true,
              isDefault: false,
              smtpPort: 587,
              smtpSecure: false,
              resetPasswordTemplate: DEFAULT_TEMPLATE,
            })}
          >
            {(item) => (
              <div class="col-span-full grid grid-cols-12 gap-x-6 gap-y-6 p-6 max-h-[75vh] overflow-y-auto">

                {/* Section 1: Thông tin chung */}
                <div class="col-span-full bg-gray-50 rounded-2xl border border-gray-100 p-5 grid grid-cols-12 gap-4">
                  <p class="col-span-full text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    {t('admin.manageEmailConfig.generalInfoTitle')}
                  </p>

                  <div class="col-span-full">
                    <Datatable.Field name="name" label={t('admin.manageEmailConfig.columnConfigName')} required>
                      <Input placeholder={t('admin.manageEmailConfig.configNamePlaceholder')} class="bg-white" />
                    </Datatable.Field>
                  </div>

                  <div class="col-span-full md:col-span-8">
                    <Datatable.Field name="domain" label={t('admin.manageEmailConfig.domainFeLabel')}>
                      <Input placeholder={t('admin.manageEmailConfig.domainFePlaceholder')} class="bg-white font-mono" />
                    </Datatable.Field>
                    <p class="text-[11px] text-gray-400 mt-1">
                      {t('admin.manageEmailConfig.domainHintPrefix')} <strong>hostname</strong>{t('admin.manageEmailConfig.domainHintMid')} <code class="bg-gray-100 px-1 rounded">https://</code>.
                      {' '}{t('admin.manageEmailConfig.domainHintExampleLabel')} <code class="bg-gray-100 px-1 rounded">admin.example.com</code>
                    </p>
                    <p class="text-[11px] text-gray-400 mt-0.5">
                      {t('admin.manageEmailConfig.domainEmptyDefaultHint')}
                    </p>
                    <p class="text-[11px] text-blue-500 mt-0.5 flex items-center gap-1">
                      <Icon name="heroicons-outline:sparkles" class="w-3 h-3 shrink-0" />
                      {t('admin.manageEmailConfig.domainBrandHintPart1')}
                      <strong class="mx-0.5">{t('admin.manageEmailConfig.domainBrandHintStrong')}</strong> {t('admin.manageEmailConfig.domainBrandHintPart2')}
                    </p>
                  </div>

                  <div class="col-span-6 md:col-span-2">
                    <Datatable.Field name="isDefault" label={t('admin.manageBrands.defaultBadge')}>
                      <Toggle />
                    </Datatable.Field>
                  </div>

                  <div class="col-span-6 md:col-span-2">
                    <Datatable.Field name="isActive" label={t('admin.manageBrands.activateLabel')}>
                      <Toggle />
                    </Datatable.Field>
                  </div>
                </div>

                {/* Section 2: Cài đặt SMTP */}
                <div class="col-span-full bg-blue-50/40 rounded-2xl border border-blue-100 p-5 grid grid-cols-12 gap-4">
                  <p class="col-span-full text-[11px] font-bold text-blue-600 uppercase tracking-widest">
                    {t('admin.manageEmailConfig.smtpSettingsTitle')}
                  </p>

                  <div class="col-span-8">
                    <Datatable.Field name="smtpHost" label="SMTP Host" required>
                      <Input placeholder="smtp.gmail.com" class="bg-white font-mono" />
                    </Datatable.Field>
                  </div>

                  <div class="col-span-4">
                    <Datatable.Field name="smtpPort" label="Port" required>
                      <InputNumber placeholder="587" class="bg-white" />
                    </Datatable.Field>
                  </div>

                  {/* Cảnh báo kết hợp port/SSL sai */}
                  <div class="col-span-full">
                    <div class="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
                      <Icon name="heroicons-outline:exclamation-triangle" class="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <span class="font-semibold">{t('admin.manageEmailConfig.portSslWarningTitle')}</span>
                        <span class="ml-1">
                          Port <code class="bg-amber-100 px-1 rounded font-mono">587</code> → <strong>{t('admin.manageEmailConfig.portSslWarningOff')}</strong> SSL/TLS (STARTTLS) &nbsp;·&nbsp;
                          Port <code class="bg-amber-100 px-1 rounded font-mono">465</code> → <strong>{t('admin.manageEmailConfig.portSslWarningOn')}</strong> SSL/TLS.
                          {' '}{t('admin.manageEmailConfig.portSslWarningTail')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div class="col-span-full md:col-span-8">
                    <Datatable.Field name="smtpUser" label={t('admin.manageEmailConfig.smtpUserLabel')} required>
                      <Input placeholder="system@example.com" class="bg-white" />
                    </Datatable.Field>
                  </div>

                  <div class="col-span-full md:col-span-4">
                    <Datatable.Field name="smtpSecure" label={t('admin.manageEmailConfig.smtpSecureLabel')}>
                      <Toggle />
                    </Datatable.Field>
                    <p class="text-[11px] text-gray-400 mt-1">
                      {t('admin.manageEmailConfig.smtpSecureOnPrefix')} <code class="bg-gray-100 px-1 rounded">465</code> &nbsp;|&nbsp; {t('admin.manageEmailConfig.smtpSecureOffPrefix')} <code class="bg-gray-100 px-1 rounded">587</code>
                    </p>
                  </div>

                  <div class="col-span-full">
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-sm font-medium text-gray-700">
                        {item ? t('admin.manageEmailConfig.smtpPasswordLabelExisting') : t('admin.manageEmailConfig.smtpPasswordLabelNew')}
                        {!item && <span class="text-red-500 ml-0.5">*</span>}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowGuide(true)}
                        class="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                      >
                        <Icon name="heroicons-outline:question-mark-circle" class="w-3.5 h-3.5" />
                        {t('admin.manageEmailConfig.smtpPasswordGuideLink')}
                      </button>
                    </div>
                    <Datatable.Field
                      name="smtpPassword"
                      label=""
                      required={!item}
                    >
                      <InputPassword placeholder={item ? '••••••••' : 'App Password...'} class="bg-white" />
                    </Datatable.Field>
                  </div>

                  <div class="col-span-full md:col-span-6">
                    <Datatable.Field name="senderName" label={t('admin.manageEmailConfig.senderNameLabel')} required>
                      <Input placeholder="App System" class="bg-white" />
                    </Datatable.Field>
                  </div>

                  <div class="col-span-full md:col-span-6">
                    <Datatable.Field name="senderEmail" label={t('admin.manageEmailConfig.senderEmailLabel')} required>
                      <Input placeholder="noreply@example.com" class="bg-white" />
                    </Datatable.Field>
                  </div>
                </div>

                {/* Section 3: Template email đặt lại mật khẩu */}
                <div class="col-span-full bg-amber-50/30 rounded-2xl border border-amber-100 p-5 grid grid-cols-12 gap-4">
                  <div class="col-span-full flex items-start justify-between gap-2">
                    <p class="text-[11px] font-bold text-amber-700 uppercase tracking-widest">
                      {t('admin.manageEmailConfig.templateSectionTitle')}
                    </p>
                    <div class="flex items-center gap-1.5 text-[11px] text-gray-400 bg-white border border-gray-100 rounded-lg px-2.5 py-1.5 shrink-0">
                      <Icon name="heroicons-outline:information-circle" class="w-3.5 h-3.5 text-blue-400" />
                      {t('admin.manageEmailConfig.templateAutoLinkHint')}
                    </div>
                  </div>

                  <div class="col-span-full">
                    <Datatable.Field name="resetPasswordSubject" label={t('admin.manageEmailConfig.subjectLabel')}>
                      <Input placeholder={t('admin.manageEmailConfig.subjectPlaceholder')} class="bg-white" />
                    </Datatable.Field>
                    <p class="text-[11px] text-gray-400 mt-1">{t('admin.manageEmailConfig.subjectVarHintPrefix')} <code class="bg-gray-100 px-1 rounded">{'{{appName}}'}</code> {t('admin.manageEmailConfig.subjectVarHintSuffix')}</p>
                  </div>

                  <div class="col-span-full">
                    <div class="bg-white rounded-lg border border-amber-100 p-3 mb-2">
                      <p class="text-[11px] font-semibold text-gray-500 mb-2">{t('admin.manageEmailConfig.templateVarsListTitle')}</p>
                      <div class="grid grid-cols-2 gap-x-4 gap-y-1">
                        {[
                          ['{{resetLink}}', t('admin.manageEmailConfig.varResetLink')],
                          ['{{username}}', t('admin.manageEmailConfig.varUsername')],
                          ['{{appName}}', t('admin.manageEmailConfig.varAppName')],
                          ['{{brandName}}', t('admin.manageEmailConfig.varBrandName')],
                          ['{{brandLogoHtml}}', t('admin.manageEmailConfig.varBrandLogo')],
                          ['{{brandColor}}', t('admin.manageEmailConfig.varBrandColor')],
                          ['{{expiryMinutes}}', t('admin.manageEmailConfig.varExpiryMinutes')],
                        ].map(([v, d]) => (
                          <div class="flex items-start gap-1.5">
                            <code class="text-[10px] font-mono bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded shrink-0">{v}</code>
                            <span class="text-[10px] text-gray-400">{d}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Datatable.Field name="resetPasswordTemplate" label="HTML Template">
                      <Textarea
                        rows={10}
                        placeholder={DEFAULT_TEMPLATE}
                        class="bg-white font-mono text-xs"
                      />
                    </Datatable.Field>
                  </div>
                </div>

              </div>
            )}
          </Datatable.Formlog>
        </Datatable>
      </Card>

      {/* ── Modal gửi email thử nghiệm ─────────────────────────────────────── */}
      <Show when={testItem() !== null}>
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) handleCloseTest(); }}
        >
          <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md mx-4 overflow-hidden">
            <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <Icon name="heroicons-outline:paper-airplane" class="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p class="text-sm font-black text-slate-800">{t('admin.manageEmailConfig.sendTestTitle')}</p>
                  <p class="text-[11px] text-slate-400 truncate max-w-[240px]">{testItem()?.name}</p>
                </div>
              </div>
              <button
                onClick={handleCloseTest}
                class="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <Icon name="heroicons-outline:x" class="w-4 h-4" />
              </button>
            </div>

            <div class="px-5 py-4 space-y-4">
              <p class="text-xs text-slate-500">
                {t('admin.manageEmailConfig.testModalDescription')}
              </p>
              <div>
                <label class="block text-xs font-bold text-slate-600 mb-1.5">
                  {t('admin.manageEmailConfig.sendToEmailLabel')} <span class="text-red-500 ml-0.5">*</span>
                </label>
                <input
                  type="email"
                  value={testEmail()}
                  onInput={(e) => setTestEmail(e.currentTarget.value)}
                  placeholder="you@example.com"
                  class="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
                />
              </div>
            </div>

            <div class="px-5 pb-5 flex gap-2 justify-end">
              <button
                onClick={handleCloseTest}
                class="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition"
              >
                {t('admin.manageEmailConfig.cancelButton')}
              </button>
              <button
                onClick={handleSendTest}
                disabled={testSubmitting()}
                class="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-500 rounded-xl hover:bg-emerald-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Show
                  when={!testSubmitting()}
                  fallback={<Icon name="heroicons-outline:refresh" class="w-3.5 h-3.5 animate-spin" />}
                >
                  <Icon name="heroicons-outline:paper-airplane" class="w-3.5 h-3.5" />
                </Show>
                {t('admin.manageEmailConfig.sendTestButtonLabel')}
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
