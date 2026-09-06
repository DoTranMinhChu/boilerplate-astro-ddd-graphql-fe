// src/modules/cms/admin/ContentTypeCreationWizard.tsx
//
// Task 18 — "Chọn kiểu tạo" picker in front of the existing Content Type create form: Thủ
// công (manual) / Dựa trên mẫu (template) / Nhập từ JSON (JSON import). All 3 branches only
// ever call `onPrefill` — the caller (manageContentTypes.page.tsx) is responsible for opening
// the actual create Formlog with that data as initial values (never created directly here).
import { Show, For, createSignal } from 'solid-js';
import { Dialog } from '@core/components/dialog/Dialog';
import { Select } from '@core/components/control/Select';
import { Button } from '@core/components/button/Button';
import { Icon } from '@shared/components/icons/Icon';
import { MODAL_DURATION } from '@core/components/modal/ModalProvider';
import { CONTENT_TYPE_TEMPLATES } from './contentTypeTemplates';
import { validateContentTypeJsonImport } from './validateContentTypeJsonImport';
import { t } from '@/shared/i18n/t';

type WizardStep = 'pickKind' | 'pickTemplate' | 'pasteJson';

export interface ContentTypeCreationWizardProps {
    isOpen: boolean;
    onClose: () => void;
    /** Đổ dữ liệu vào field builder hiện có rồi mở form tạo — KHÔNG tạo thẳng (mục G design). */
    onPrefill: (data: { fields: any[]; listViewConfig?: any; formConfig?: any }) => void;
}

export function ContentTypeCreationWizard(props: ContentTypeCreationWizardProps) {
    const [step, setStep] = createSignal<WizardStep>('pickKind');
    const [selectedTemplateKey, setSelectedTemplateKey] = createSignal<string>(CONTENT_TYPE_TEMPLATES[0].key);
    const [jsonText, setJsonText] = createSignal('');
    const [jsonError, setJsonError] = createSignal<string | undefined>();

    const reset = () => { setStep('pickKind'); setJsonText(''); setJsonError(undefined); };
    const close = () => { reset(); props.onClose(); };

    // Đóng wizard NGAY (đồng bộ) rồi mới gọi `onPrefill` sau khi transition đóng của
    // ModalProvider.tsx thực sự hoàn tất (MODAL_DURATION=300ms + đệm) — KHÔNG gọi
    // đồng thời/cùng tick với close(). Lý do (xác nhận qua Playwright live, không chỉ đọc code):
    // ContentTypeCreationWizard và Datatable.Formlog đều là Dialog 'main'-mode (mặc định của
    // Modal.tsx khi cha nó CHƯA có main modal nào khác đang mở); nếu `onPrefill` (mở Formlog)
    // và `close()` (đóng wizard) chạy trong CÙNG 1 tick, ModalProvider.tsx's `openModal` cho
    // Formlog set `subModalStates[id]='opening'` NGAY LẬP TỨC (đồng bộ, không đợi timeout), rồi
    // `closeModal(wizardId)`'s guard `isModalInteractionBlocked()` thấy sub-modal đang 'opening'
    // nên trả về true — lệnh đóng wizard bị CHẶN ÂM THẦM (không throw, không log), để lại 1
    // modal-frame RỖNG kẹt full-screen, pointer-events:auto, chặn MỌI click sau đó. Đảo ngược thứ
    // tự (đóng trước, mở sau CÙNG tick) cũng không xong: lúc đó `closeModal` lại tự set
    // modalState='closing', khiến `openModal(Formlog)` NGAY SAU ĐÓ (cùng tick) bị chính guard này
    // chặn ngược lại (Formlog không bao giờ mở). Cách duy nhất tránh cả 2 kẹt: tách 2 thao tác ra
    // 2 tick khác nhau, cách nhau đủ lâu để closeModal's `setTimeout(...MODAL_DURATION)` chạy xong
    // (mainModals rỗng, modalState='hidden') trước khi Formlog's openModal chạy.
    const deliver = (data: { fields: any[]; listViewConfig?: any; formConfig?: any }) => {
        close();
        setTimeout(() => props.onPrefill(data), MODAL_DURATION + 50);
    };

    const pickManual = () => deliver({ fields: [] });
    const pickTemplateStep = () => setStep('pickTemplate');
    const pickJsonStep = () => setStep('pasteJson');

    const confirmTemplate = () => {
        const template = CONTENT_TYPE_TEMPLATES.find((tpl) => tpl.key === selectedTemplateKey())!;
        deliver({ fields: template.fields, listViewConfig: template.listViewConfig, formConfig: template.formConfig });
    };

    const confirmJson = () => {
        const result = validateContentTypeJsonImport(jsonText());
        if (!result.ok) { setJsonError(result.error); return; }
        deliver(result.data);
    };

    return (
        <Dialog id="content-type-creation-wizard" isOpen={props.isOpen} onClose={close} md scrollable>
            <Dialog.Header title={t('cms.creationWizard.dialogHeader')} />
            <Dialog.Body class="px-5 pb-6 space-y-4">
                <Show when={step() === 'pickKind'}>
                    <div class="space-y-2">
                        <button type="button" class="w-full flex items-start gap-3 rounded-xl border border-neutral-200 p-4 text-left hover:border-main-300" onClick={pickManual}>
                            <Icon name="heroicons-outline:pencil-square" class="w-5 h-5 mt-0.5 text-main shrink-0" />
                            <div>
                                <p class="font-semibold text-sm">{t('cms.creationWizard.manualTitle')}</p>
                                <p class="text-xs text-neutral-400">{t('cms.creationWizard.manualDesc')}</p>
                            </div>
                        </button>
                        <button type="button" class="w-full flex items-start gap-3 rounded-xl border border-neutral-200 p-4 text-left hover:border-main-300" onClick={pickTemplateStep}>
                            <Icon name="heroicons-outline:document-duplicate" class="w-5 h-5 mt-0.5 text-main shrink-0" />
                            <div>
                                <p class="font-semibold text-sm">{t('cms.creationWizard.templateTitle')}</p>
                                <p class="text-xs text-neutral-400">{t('cms.creationWizard.templateDesc')}</p>
                            </div>
                        </button>
                        <button type="button" class="w-full flex items-start gap-3 rounded-xl border border-neutral-200 p-4 text-left hover:border-main-300" onClick={pickJsonStep}>
                            <Icon name="heroicons-outline:code-bracket" class="w-5 h-5 mt-0.5 text-main shrink-0" />
                            <div>
                                <p class="font-semibold text-sm">{t('cms.creationWizard.jsonTitle')}</p>
                                <p class="text-xs text-neutral-400">{t('cms.creationWizard.jsonDesc')}</p>
                            </div>
                        </button>
                    </div>
                </Show>

                <Show when={step() === 'pickTemplate'}>
                    <Select
                        value={selectedTemplateKey()}
                        onChange={setSelectedTemplateKey}
                        options={CONTENT_TYPE_TEMPLATES.map((tpl) => ({ value: tpl.key, label: tpl.label }))}
                        fieldless
                    />
                    <div class="space-y-1 rounded-lg border border-neutral-100 bg-neutral-50 p-3">
                        <p class="text-xs font-semibold text-neutral-500">{t('cms.creationWizard.templateFieldsPreviewLabel')}</p>
                        <For each={CONTENT_TYPE_TEMPLATES.find((tpl) => tpl.key === selectedTemplateKey())?.fields ?? []}>
                            {(field) => (
                                <p class="text-xs text-neutral-600">
                                    {field.label} — <code class="font-mono text-neutral-400">{field.type}</code>
                                </p>
                            )}
                        </For>
                    </div>
                    <div class="flex justify-end gap-2 pt-2">
                        <Button sm outline onClick={() => setStep('pickKind')}>{t('cms.creationWizard.backButton')}</Button>
                        <Button sm onClick={confirmTemplate}>{t('cms.creationWizard.continueButton')}</Button>
                    </div>
                </Show>

                <Show when={step() === 'pasteJson'}>
                    <textarea
                        class="w-full h-48 rounded-lg border border-neutral-200 p-3 text-xs font-mono"
                        value={jsonText()}
                        onInput={(e) => { setJsonText(e.currentTarget.value); setJsonError(undefined); }}
                        placeholder='{"fields": [{"key": "title", "label": "Tiêu đề", "type": "TEXT"}]}'
                    />
                    <Show when={jsonError()}>
                        <p class="text-xs text-red-600">{jsonError()}</p>
                    </Show>
                    <div class="flex justify-end gap-2 pt-2">
                        <Button sm outline onClick={() => setStep('pickKind')}>{t('cms.creationWizard.backButton')}</Button>
                        <Button sm onClick={confirmJson}>{t('cms.creationWizard.continueButton')}</Button>
                    </div>
                </Show>
            </Dialog.Body>
        </Dialog>
    );
}
