import { Show } from 'solid-js';
import { createControl } from '@core/components/control/createControl';
import { Input } from '@core/components/control/Input';
import { NativeSelect } from '@core/components/control/NativeSelect';
import { Toggle } from '@core/components/control/Toggle';
import { Button } from '@core/components/button/Button';
import { Icon } from '@shared/components/icons/Icon';
import { DragList, DragHandle } from './DragList';
import { EFieldType, type FieldDefinitionInput } from '@shared/generated/typed-graphql';

const FIELD_TYPE_OPTIONS = [
    { value: 'TEXT', label: 'Text' },
    { value: 'RICHTEXT', label: 'Rich text' },
    { value: 'NUMBER', label: 'Số' },
    { value: 'BOOLEAN', label: 'Boolean' },
    { value: 'DATE', label: 'Ngày' },
    { value: 'SELECT', label: 'Select' },
    { value: 'IMAGE', label: 'Ảnh' },
    { value: 'GALLERY', label: 'Gallery' },
    { value: 'VIDEO', label: 'Video' },
    { value: 'LINK', label: 'Link' },
    { value: 'RELATION', label: 'Quan hệ' },
];

export interface FieldDefinitionArrayInputProps {
    /** Danh sách Content Type khác để chọn làm đích cho field kiểu RELATION — không
     * bao gồm chính Content Type đang sửa nếu đã biết id (self-relation không hợp lý
     * cho use-case hiện tại: "sản phẩm liên quan tới bài viết", không phải cây phả hệ). */
    contentTypeOptions?: { value: string; label: string }[];
}

const emptyField = (): FieldDefinitionInput => ({ key: '', label: '', type: EFieldType.TEXT });

/** Nhãn nhỏ phía trên mỗi ô nhập — bố cục kiểu "data editor" (Notion/Airtable: mỗi
 * property có tên rõ ràng phía trên, không chỉ dựa vào placeholder) thay vì nhồi
 * key/label/type/checkbox vào chung 1 hàng 12 cột hẹp (trước đây làm nhãn checkbox
 * "Bắt buộc"/"Slug" bị bóp xuống còn 1 chữ/dòng). */
function FieldLabel(props: { children: string }) {
    return <p class="mb-1 text-[11px] font-medium text-neutral-400">{props.children}</p>;
}

/** Field builder động cho ContentType (mục 4.6 spec CMS) — admin tự thêm/sửa/xoá/sắp
 * xếp field tuỳ ý cho Object Type mình tạo. Đăng ký qua createControl('object_array', ...)
 * để hoạt động như 1 control bình thường bên trong <Datatable.Field name="fields">.
 * Thứ tự field ở đây cũng là thứ tự MẶC ĐỊNH khi trang chi tiết (content-detail) tự
 * sắp bố cục — xem field layout editor trong Page Builder. */
export function FieldDefinitionArrayInput(props: FieldDefinitionArrayInputProps) {
    const { value, onChange } = createControl<FieldDefinitionInput[]>('object_array', {});

    const fields = () => value() || [];

    // Mutate tại chỗ (giữ nguyên reference) — DragList's <For> key theo reference
    // (xem stableKey() trong DragList.tsx); tạo object mới cho dòng đang gõ sẽ khiến
    // <For> unmount+remount cả dòng mỗi phím gõ, làm mất focus đang nhập.
    const updateField = (index: number, patch: Partial<FieldDefinitionInput>) => {
        const next = [...fields()];
        Object.assign(next[index], patch);
        onChange(next);
    };

    const addField = () => onChange([...fields(), emptyField()]);
    const removeField = (index: number) => {
        const next = [...fields()];
        next.splice(index, 1);
        onChange(next);
    };

    return (
        <div class="space-y-3">
            <DragList items={fields()} onReorder={onChange} class="space-y-3">
                {(field, index) => (
                    <div class="flex gap-3 rounded-xl border border-neutral-200 bg-neutral-50/50 p-4">
                        <div class="mt-6"><DragHandle /></div>
                        <div class="flex-1 space-y-4">
                            <div class="grid grid-cols-12 gap-3">
                                <div class="col-span-4">
                                    <FieldLabel>Key</FieldLabel>
                                    <Input
                                        value={field.key}
                                        onChange={(v: string) => updateField(index(), { key: v })}
                                        placeholder="vd: tenSanPham"
                                        fieldless
                                    />
                                </div>
                                <div class="col-span-4">
                                    <FieldLabel>Nhãn hiển thị</FieldLabel>
                                    <Input
                                        value={field.label}
                                        onChange={(v: string) => updateField(index(), { label: v })}
                                        placeholder="vd: Tên sản phẩm"
                                        fieldless
                                    />
                                </div>
                                <div class="col-span-3">
                                    <FieldLabel>Loại field</FieldLabel>
                                    <NativeSelect
                                        value={field.type}
                                        onChange={(v: string) => updateField(index(), { type: v as EFieldType })}
                                        options={FIELD_TYPE_OPTIONS}
                                        optionGroups={[]}
                                        emptyPlaceholder=""
                                        fieldless
                                    />
                                </div>
                                <div class="col-span-1 flex items-end justify-end pb-0.5">
                                    <Button
                                        sm
                                        outline
                                        interactDanger
                                        icon={<Icon name="heroicons-outline:trash" tooltip="Xoá field" />}
                                        onClick={() => removeField(index())}
                                    />
                                </div>
                            </div>

                            <div class="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg bg-white px-3 py-2 border border-neutral-100">
                                <Toggle
                                    text="Bắt buộc"
                                    textClass="text-xs text-neutral-600"
                                    value={!!field.required}
                                    onChange={(v: boolean) => updateField(index(), { required: v })}
                                    fieldless
                                />
                                <Toggle
                                    text="Dùng làm Slug"
                                    textClass="text-xs text-neutral-600"
                                    value={!!field.isSlugSource}
                                    onChange={(v: boolean) => updateField(index(), { isSlugSource: v })}
                                    fieldless
                                />
                                <Toggle
                                    text="Hiện trong danh sách"
                                    textClass="text-xs text-neutral-600"
                                    value={!!field.showInListing}
                                    onChange={(v: boolean) => updateField(index(), { showInListing: v })}
                                    fieldless
                                />
                            </div>

                            <Show when={field.type === 'SELECT'}>
                                <div>
                                    <FieldLabel>Các lựa chọn</FieldLabel>
                                    <Input
                                        value={(field.options || []).join(', ')}
                                        onChange={(v: string) => updateField(index(), { options: v.split(',').map((s) => s.trim()).filter(Boolean) })}
                                        placeholder="Cách nhau bằng dấu phẩy, vd: Đỏ, Xanh, Vàng"
                                        fieldless
                                    />
                                </div>
                            </Show>

                            <Show when={field.type === 'RELATION'}>
                                <div class="grid grid-cols-12 gap-3">
                                    <div class="col-span-8">
                                        <FieldLabel>Liên quan tới loại nội dung</FieldLabel>
                                        <NativeSelect
                                            value={field.relationTarget}
                                            onChange={(v: string) => updateField(index(), { relationTarget: v })}
                                            options={props.contentTypeOptions || []}
                                            optionGroups={[]}
                                            emptyPlaceholder="-- Chọn loại nội dung --"
                                            clearable
                                            fieldless
                                        />
                                    </div>
                                    <div class="col-span-4 flex items-end pb-1.5">
                                        <Toggle
                                            text="Cho phép chọn nhiều"
                                            textClass="text-xs text-neutral-600"
                                            value={!!field.relationMultiple}
                                            onChange={(v: boolean) => updateField(index(), { relationMultiple: v })}
                                            fieldless
                                        />
                                    </div>
                                </div>
                            </Show>

                            <div>
                                <FieldLabel>Giá trị mẫu (xem trước trang Chi tiết khi chưa có dữ liệu thật)</FieldLabel>
                                <Input
                                    value={field.mockValue}
                                    onChange={(v: string) => updateField(index(), { mockValue: v })}
                                    placeholder="vd: Sản phẩm mẫu"
                                    fieldless
                                />
                            </div>
                        </div>
                    </div>
                )}
            </DragList>
            <Button sm outline onClick={addField}>+ Thêm field</Button>
        </div>
    );
}
