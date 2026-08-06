import { createControl } from '@core/components/control/createControl';
import { Editor } from '@core/components/control/Editor';
import { InputImage } from '@core/components/control/InputImage';
import { Button } from '@core/components/button/Button';
import { Icon } from '@shared/components/icons/Icon';
import { DragList, DragHandle } from './DragList';
import { t } from '@/shared/i18n/t';
import type { IntroRailFeature } from '@/modules/cms/sections/editorial/IntroRailSection';

/** Danh sách USP (Unique Selling Point) tự do — thay cho 3 slot cố định trước đây,
 * thêm/xoá/kéo sắp xếp bao nhiêu tuỳ ý (số cột mỗi hàng cấu hình riêng ở
 * `content.featureColumns`, xem ContentTab.tsx). */
export function FeatureListInput() {
    const { value, onChange } = createControl<IntroRailFeature[]>('object_array', {});
    const items = () => value() || [];

    // Mutate item TẠI CHỖ (giữ nguyên object reference) — DragList's <For> key theo
    // reference (xem stableKey() trong DragList.tsx); nếu tạo object mới cho dòng
    // đang sửa thì mỗi phím gõ vào Editor (CKEditor onChange bắn liên tục) sẽ làm
    // <For> coi đó là 1 item khác, unmount + remount toàn bộ dòng — CKEditor bị phá
    // huỷ giữa chừng, không bao giờ kịp render xong toolbar (hộp trống, vỡ giao diện).
    const update = (index: number, patch: Partial<IntroRailFeature>) => {
        const next = [...items()];
        Object.assign(next[index], patch);
        onChange(next);
    };
    const add = () => onChange([...items(), { text: '' }]);
    const remove = (index: number) => {
        const next = [...items()];
        next.splice(index, 1);
        onChange(next);
    };

    return (
        <div class="space-y-2">
            <DragList items={items()} onReorder={onChange} class="space-y-2">
                {(item, index) => (
                    <div class="space-y-2 rounded-lg border border-neutral-200 p-2">
                        <div class="flex items-start gap-2">
                            <DragHandle />
                            {/* Ảnh minh hoạ admin tự tải lên — không còn chọn icon từ danh sách. */}
                            <div class="w-28">
                                <InputImage
                                    value={item.image}
                                    onChange={(v: string | string[] | null) => update(index(), { image: typeof v === 'string' ? v : undefined })}
                                    fieldless
                                />
                            </div>
                            <div class="flex-1" />
                            <Button
                                sm
                                outline
                                interactDanger
                                icon={<Icon name="heroicons-outline:trash" tooltip={t('cms.sections.editorial.removeFeature')} />}
                                onClick={() => remove(index())}
                            />
                        </div>
                        {/* Cùng Editor (CKEditor) dùng cho field RICHTEXT — cho phép canh lề/in
                            đậm/... thay vì chỉ text thường. Render tương ứng phải sanitize +
                            innerHTML (xem IntroRailSection.tsx), không còn hiện `{f.text}` thô. */}
                        <Editor value={item.text} onChange={(v: string) => update(index(), { text: v })} placeholder={t('cms.sections.editorial.featureText')} class="min-h-24 max-h-48" fieldless />
                    </div>
                )}
            </DragList>
            <Button sm onClick={add}>{t('cms.sections.editorial.addFeature')}</Button>
        </div>
    );
}
