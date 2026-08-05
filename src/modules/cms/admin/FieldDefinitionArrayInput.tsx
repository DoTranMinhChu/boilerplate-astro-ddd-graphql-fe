import { For } from 'solid-js';
import { createControl } from '@core/components/control/createControl';
import { Input } from '@core/components/control/Input';
import { NativeSelect } from '@core/components/control/NativeSelect';
import { Checkbox } from '@core/components/control/Checkbox';
import { Button } from '@core/components/button/Button';
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

const emptyField = (): FieldDefinitionInput => ({ key: '', label: '', type: EFieldType.TEXT });

/** Field builder động cho ContentType (mục 4.6 spec CMS) — admin tự thêm/sửa/xoá
 * field tuỳ ý cho Object Type mình tạo. Đăng ký qua createControl('object_array', ...)
 * để hoạt động như 1 control bình thường bên trong <Datatable.Field name="fields">. */
export function FieldDefinitionArrayInput() {
    const { value, onChange } = createControl<FieldDefinitionInput[]>('object_array', {});

    const fields = () => value() || [];

    const updateField = (index: number, patch: Partial<FieldDefinitionInput>) => {
        const next = [...fields()];
        next[index] = { ...next[index], ...patch };
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
            <For each={fields()}>
                {(field, index) => (
                    <div class="grid grid-cols-12 gap-2 rounded-lg border border-neutral-200 p-3">
                        <div class="col-span-3">
                            <Input
                                value={field.key}
                                onChange={(v: string) => updateField(index(), { key: v })}
                                placeholder="key (vd tenSanPham)"
                                fieldless
                            />
                        </div>
                        <div class="col-span-3">
                            <Input
                                value={field.label}
                                onChange={(v: string) => updateField(index(), { label: v })}
                                placeholder="Nhãn hiển thị"
                                fieldless
                            />
                        </div>
                        <div class="col-span-2">
                            <NativeSelect
                                value={field.type}
                                onChange={(v: string) => updateField(index(), { type: v as EFieldType })}
                                options={FIELD_TYPE_OPTIONS}
                                optionGroups={[]}
                                emptyPlaceholder=""
                                fieldless
                            />
                        </div>
                        <div class="col-span-2 flex items-center gap-3 text-xs">
                            <label class="flex items-center gap-1">
                                <Checkbox value={!!field.required} onChange={(v: boolean) => updateField(index(), { required: v })} fieldless />
                                Bắt buộc
                            </label>
                            <label class="flex items-center gap-1">
                                <Checkbox value={!!field.isSlugSource} onChange={(v: boolean) => updateField(index(), { isSlugSource: v })} fieldless />
                                Slug
                            </label>
                        </div>
                        <div class="col-span-2 flex items-center justify-end">
                            <Button sm outline onClick={() => removeField(index())}>Xoá</Button>
                        </div>
                        {field.type === 'SELECT' && (
                            <div class="col-span-12">
                                <Input
                                    value={(field.options || []).join(', ')}
                                    onChange={(v: string) => updateField(index(), { options: v.split(',').map((s) => s.trim()).filter(Boolean) })}
                                    placeholder="Các lựa chọn, cách nhau bằng dấu phẩy"
                                    fieldless
                                />
                            </div>
                        )}
                    </div>
                )}
            </For>
            <Button sm onClick={addField}>+ Thêm field</Button>
        </div>
    );
}
