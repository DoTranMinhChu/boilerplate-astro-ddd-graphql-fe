import { For } from 'solid-js';
import { Dialog } from '@core/components/dialog/Dialog';
import { Icon } from '@shared/components/icons/Icon';
import { t } from '@/shared/i18n/t';
import type { FormMode } from '@/modules/cms/cms.types';

/** "Thêm bản ghi mới" picker (mục D design, ảnh mockup 1) — 1 lựa chọn / FormMode đã bật cho
 * content type này (KHÔNG bao gồm 'visualGrid' ở đây; picker hiện 'fullPage' và 1 card riêng
 * "Trình soạn thảo trực quan" khi content type CÓ gridLayout đã cấu hình — cả 2 điều hướng
 * cùng 1 route, khác `layout` param, xem Task 13). Nhân bản là 1 nút RIÊNG trên toolbar (Task
 * 16), không nằm trong picker này (nó cần chọn entry nguồn trước, không phải 1 form mode). */
const MODE_META: Record<FormMode, { icon: string; titleKey: string; descKey: string }> = {
    dialog: { icon: 'heroicons-outline:document-text', titleKey: 'cms.createModePicker.dialogTitle', descKey: 'cms.createModePicker.dialogDesc' },
    drawer: { icon: 'heroicons-outline:view-columns', titleKey: 'cms.createModePicker.drawerTitle', descKey: 'cms.createModePicker.drawerDesc' },
    fullPage: { icon: 'heroicons-outline:document', titleKey: 'cms.createModePicker.fullPageTitle', descKey: 'cms.createModePicker.fullPageDesc' },
    visualGrid: { icon: 'heroicons-outline:squares-2x2', titleKey: 'cms.createModePicker.visualGridTitle', descKey: 'cms.createModePicker.visualGridDesc' },
};

export interface CreateContentEntryModePickerProps {
    isOpen: boolean;
    onClose: () => void;
    enabledModes: FormMode[];
    onPick: (mode: FormMode) => void;
}

export function CreateContentEntryModePicker(props: CreateContentEntryModePickerProps) {
    return (
        <Dialog id="create-content-entry-mode-picker" isOpen={props.isOpen} onClose={props.onClose} sm>
            <Dialog.Header title={t('cms.createModePicker.dialogHeader')} />
            <Dialog.Body class="px-5 pb-6 space-y-2">
                <For each={props.enabledModes}>
                    {(mode) => (
                        <button
                            type="button"
                            class="w-full flex items-start gap-3 rounded-xl border border-neutral-200 p-4 text-left hover:border-main-300 hover:bg-main-50/40 transition-colors"
                            onClick={() => { props.onPick(mode); props.onClose(); }}
                        >
                            <Icon name={MODE_META[mode].icon} class="w-5 h-5 mt-0.5 text-main shrink-0" />
                            <div>
                                <p class="font-semibold text-sm text-neutral-800">{t(MODE_META[mode].titleKey as any)}</p>
                                <p class="text-xs text-neutral-400 mt-0.5">{t(MODE_META[mode].descKey as any)}</p>
                            </div>
                        </button>
                    )}
                </For>
            </Dialog.Body>
        </Dialog>
    );
}
