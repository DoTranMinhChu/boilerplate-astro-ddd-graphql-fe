import { For } from 'solid-js';
import { Dialog } from '@core/components/dialog/Dialog';
import { Icon } from '@shared/components/icons/Icon';
import { MODAL_DURATION } from '@core/components/modal/ModalProvider';
import { t } from '@/shared/i18n/t';
import type { FormMode } from '@/modules/cms/cms.types';

/** "Thêm bản ghi mới" picker (mục D design, ảnh mockup 1) — 1 lựa chọn / FormMode đã bật cho
 * content type này. Nhân bản là 1 nút RIÊNG trên toolbar (Task 16), không nằm trong picker này
 * (nó cần chọn entry nguồn trước, không phải 1 form mode). */
const MODE_META: Record<FormMode, { icon: string; titleKey: string; descKey: string }> = {
    dialog: { icon: 'heroicons-outline:document-text', titleKey: 'cms.createModePicker.dialogTitle', descKey: 'cms.createModePicker.dialogDesc' },
    drawer: { icon: 'heroicons-outline:view-columns', titleKey: 'cms.createModePicker.drawerTitle', descKey: 'cms.createModePicker.drawerDesc' },
    fullPage: { icon: 'heroicons-outline:document', titleKey: 'cms.createModePicker.fullPageTitle', descKey: 'cms.createModePicker.fullPageDesc' },
};

export interface CreateContentEntryModePickerProps {
    isOpen: boolean;
    onClose: () => void;
    enabledModes: FormMode[];
    onPick: (mode: FormMode) => void;
}

export function CreateContentEntryModePicker(props: CreateContentEntryModePickerProps) {
    // 'dialog'/'drawer' đều gọi `onPick` -> `handlePickMode` (manageContentEntries.page.tsx)
    // -> `openCreateFormlog()`, tức mở 1 Dialog KHÁC (Datatable.Formlog) trong lúc picker này
    // vẫn đang đóng. Đóng picker NGAY (đồng bộ) rồi mới `onPick` sau khi transition đóng của
    // ModalProvider.tsx thực sự hoàn tất (MODAL_DURATION=300ms + đệm) — mirror đúng fix đã
    // dùng ở ContentTypeCreationWizard.tsx (Task 18). Lý do (xác nhận qua ModalProvider.tsx's
    // `openModal`/`closeModal`/`isModalInteractionBlocked`, không chỉ đọc code): nếu Formlog's
    // `openModal` chạy CÙNG tick lúc picker vẫn còn nằm trong `mainModals` (chưa kịp bị
    // `closeModal`'s `setTimeout(...MODAL_DURATION)` splice rỗng), Formlog đăng ký thành
    // sub-modal (`isSubModal = mainModals.length ? true : false`) thay vì main modal — rồi
    // chính lệnh `closeModal()` của picker bị `isModalInteractionBlocked()` chặn ÂM THẦM (chặn
    // 1 lệnh đóng trong lúc sub-modal đang 'opening'), để lại 1 modal-frame rỗng kẹt
    // full-screen, pointer-events:auto, chặn MỌI click sau đó. Đợi tới khi `mainModals` rỗng
    // (MODAL_DURATION đã trôi qua) trước khi Formlog mở tránh được kẹt này.
    // 'fullPage' thì điều hướng sang route khác qua `navigateToPage` — không mở modal nào khác
    // trong ModalProvider.tsx nên không có race trên để tránh; giữ nguyên thứ tự đóng/gọi cũ
    // (không cần defer).
    const handlePick = (mode: FormMode) => {
        if (mode === 'dialog' || mode === 'drawer') {
            props.onClose();
            setTimeout(() => props.onPick(mode), MODAL_DURATION + 50);
        } else {
            props.onPick(mode);
            props.onClose();
        }
    };

    return (
        <Dialog id="create-content-entry-mode-picker" isOpen={props.isOpen} onClose={props.onClose} sm>
            <Dialog.Header title={t('cms.createModePicker.dialogHeader')} />
            <Dialog.Body class="px-5 pb-6 space-y-2">
                <For each={props.enabledModes}>
                    {(mode) => (
                        <button
                            type="button"
                            class="w-full flex items-start gap-3 rounded-xl border border-neutral-200 p-4 text-left hover:border-main-300 hover:bg-main-50/40 transition-colors"
                            onClick={() => handlePick(mode)}
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
