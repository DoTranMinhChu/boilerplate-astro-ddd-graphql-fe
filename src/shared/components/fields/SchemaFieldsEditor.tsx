import { For, createSignal } from 'solid-js';
import { createControl } from '@core/components/control/createControl';
import { Input } from '@core/components/control/Input';
import { Textarea } from '@core/components/control/Textarea';
import { Editor } from '@core/components/control/Editor';
import { InputImage } from '@core/components/control/InputImage';
import { InputNumber } from '@core/components/control/InputNumber';
import { Select } from '@core/components/control/Select';
import { Toggle } from '@core/components/control/Toggle';
import { Button } from '@core/components/button/Button';
import { DragList, DragHandle } from '@/modules/cms/admin/DragList';
import { t } from '@/shared/i18n/t';
import type { BlockFieldDefinition } from './blockField.types';

const fieldLabelClass = 'mb-1 text-[11px] font-medium text-neutral-400';

/** 1 field ở chế độ AMBIENT — không nhận value/onChange, đọc/ghi qua
 * <Field name="..."> bao ngoài. Dùng cho field TOP-LEVEL của 1 khối
 * trong ContentTab.tsx (xem Task 8). */
export function renderBlockFieldControl(field: BlockFieldDefinition) {
    switch (field.type) {
        case 'TEXTAREA':
            return <Textarea rows={3} placeholder={field.placeholder || field.label} />;
        case 'RICHTEXT':
            return <Editor />;
        case 'NUMBER':
            return <InputNumber placeholder={field.placeholder || field.label} />;
        case 'BOOLEAN':
            return <Toggle />;
        case 'IMAGE':
            return <InputImage />;
        case 'GALLERY':
            return <InputImage multiple={20} />;
        case 'SELECT':
            return <Select options={field.options || []} clearable />;
        case 'LINK':
            return <Input placeholder={field.placeholder || '/duong-dan'} />;
        case 'REPEATER':
            return <RepeaterFieldInput itemFields={field.itemFields || []} />;
        default:
            return <Input placeholder={field.placeholder || field.label} />;
    }
}

/** 1 field ở chế độ CONTROLLED (value/onChange tường minh) — dùng bên trong 1
 * item của REPEATER, nơi không có path <Field name="..."> ổn định (mỗi item
 * là 1 phần tử mảng, không phải 1 key cố định trên form). */
function renderControlledField(field: BlockFieldDefinition, value: any, onChange: (v: any) => void) {
    switch (field.type) {
        case 'TEXTAREA':
            return <Textarea rows={3} value={value} onChange={onChange} placeholder={field.placeholder || field.label} fieldless />;
        case 'RICHTEXT':
            return <Editor value={value} onChange={onChange} fieldless />;
        case 'NUMBER':
            return <InputNumber value={value} onChange={onChange} placeholder={field.placeholder || field.label} fieldless />;
        case 'BOOLEAN':
            return <Toggle value={value} onChange={onChange} fieldless />;
        case 'IMAGE':
            return <InputImage value={value} onChange={onChange} fieldless />;
        case 'GALLERY':
            return <InputImage multiple={20} value={value} onChange={onChange} fieldless />;
        case 'SELECT':
            return <Select options={field.options || []} value={value} onChange={onChange} clearable fieldless />;
        case 'LINK':
            return <Input value={value} onChange={onChange} placeholder={field.placeholder || '/duong-dan'} fieldless />;
        case 'REPEATER':
            return <RepeaterFieldInput itemFields={field.itemFields || []} value={value} onChange={onChange} fieldless />;
        default:
            return <Input value={value} onChange={onChange} placeholder={field.placeholder || field.label} fieldless />;
    }
}

/** Editor CONTROLLED cho 1 object theo `fields` — dùng đệ quy bên trong mỗi
 * item của RepeaterFieldInput (1 item = 1 object con theo `itemFields`). */
export function SchemaFieldsEditor(props: {
    fields: BlockFieldDefinition[];
    value?: Record<string, any>;
    onChange: (next: Record<string, any>) => void;
}) {
    const data = () => props.value || {};
    const update = (key: string, val: any) => props.onChange({ ...data(), [key]: val });

    return (
        <div class="space-y-3">
            <For each={props.fields}>
                {(field) => (
                    <div>
                        <p class={fieldLabelClass}>{field.label}{field.required ? ' *' : ''}</p>
                        {renderControlledField(field, data()[field.key], (v) => update(field.key, v))}
                    </div>
                )}
            </For>
        </div>
    );
}

/** Tiêu đề tóm tắt cho 1 mục Repeater khi thu gọn (mục D.1 thiết kế) — field có
 * `isRepeaterTitleSource: true` thắng nếu có giá trị, rơi về field TEXT đầu tiên
 * có giá trị, rơi về "Mục #N" (N = index + 1, 1-based cho người dùng cuối) nếu
 * không field nào có giá trị dùng được. Hàm THUẦN để test trực tiếp. */
export function resolveRepeaterItemTitle(itemFields: BlockFieldDefinition[], item: Record<string, any>, index: number): string {
    const hasValue = (key: string) => {
        const v = item?.[key];
        return v !== undefined && v !== null && v !== '';
    };
    const marked = itemFields.find((f) => f.isRepeaterTitleSource && f.type === 'TEXT' && hasValue(f.key));
    if (marked) return String(item[marked.key]);
    const firstText = itemFields.find((f) => f.type === 'TEXT' && hasValue(f.key));
    if (firstText) return String(item[firstText.key]);
    return `Mục #${index + 1}`;
}

const REPEATER_PAGE_SIZE = 10;

/** Danh sách lặp lại (REPEATER) — mỗi item là 1 object theo `itemFields`.
 * Dùng chung 1 component cho cả 2 chế độ (ambient khi gọi không kèm
 * value/onChange, controlled khi gọi kèm value/onChange+fieldless) nhờ
 * `createControl` đã hỗ trợ sẵn cả 2 (xem TwoFieldListInput.tsx, cùng cơ chế).
 * Mutate item TẠI CHỖ (Object.assign) trước khi bọc mảng mới cho onChange —
 * giữ nguyên object reference của item để DragList không remount hàng đang gõ
 * dở (xem comment gốc trong TwoFieldListInput.tsx cho lý do đầy đủ).
 *
 * Mỗi mục mặc định THU GỌN (accordion, cùng pattern Set<number> của
 * AccordionListSection.tsx) — chỉ hiện dòng tóm tắt (resolveRepeaterItemTitle)
 * cho tới khi admin bấm mở. Danh sách DÒNG TÓM TẮT được PHÂN TRANG khi vượt
 * REPEATER_PAGE_SIZE mục — kéo-thả (DragList) chỉ nhận items của TRANG HIỆN
 * TẠI nên chỉ sắp xếp lại được trong phạm vi 1 trang (giản lược v1 có chủ đích,
 * xem brief Task 5 — không hỗ trợ kéo xuyên trang). */
function RepeaterFieldInput(props: {
    itemFields: BlockFieldDefinition[];
    value?: Record<string, any>[];
    onChange?: (v: Record<string, any>[]) => void;
    fieldless?: boolean;
}) {
    const { value, onChange } = createControl<Record<string, any>[]>('object_array', {
        value: props.value,
        onChange: props.onChange,
        fieldless: props.fieldless,
    });
    const items = () => value() || [];
    const [openSet, setOpenSet] = createSignal<Set<number>>(new Set());
    const [page, setPage] = createSignal(0);

    const toggleOpen = (index: number) => {
        const next = new Set(openSet());
        if (next.has(index)) next.delete(index); else next.add(index);
        setOpenSet(next);
    };

    const add = () => {
        onChange([...items(), {}]);
        // Mục mới thêm luôn mở sẵn (admin vừa bấm "+ Thêm" chắc chắn muốn điền ngay).
        setOpenSet(new Set([...openSet(), items().length]));
    };
    const updateItem = (index: number, patch: Record<string, any>) => {
        const next = [...items()];
        Object.assign(next[index], patch);
        onChange(next);
    };
    const remove = (index: number) => {
        const next = [...items()];
        next.splice(index, 1);
        onChange(next);
        // Re-index openSet: mục sau vị trí xoá lùi lại 1 index.
        const nextOpen = new Set<number>();
        openSet().forEach((i) => {
            if (i < index) nextOpen.add(i);
            else if (i > index) nextOpen.add(i - 1);
        });
        setOpenSet(nextOpen);
    };

    const totalPages = () => Math.max(1, Math.ceil(items().length / REPEATER_PAGE_SIZE));
    const pagedIndices = () => {
        const start = page() * REPEATER_PAGE_SIZE;
        return items().map((_, i) => i).slice(start, start + REPEATER_PAGE_SIZE);
    };
    const needsPagination = () => items().length > REPEATER_PAGE_SIZE;

    return (
        <div class="space-y-2">
            <DragList items={pagedIndices().map((i) => items()[i])} onReorder={() => { /* Phân trang + kéo-thả xuyên trang không hỗ trợ v1 — DragList chỉ nhận items của trang hiện tại, không đổi thứ tự toàn mảng. */ }} class="space-y-2">
                {(item, localIndex, dragHandle) => {
                    const realIndex = () => pagedIndices()[localIndex()];
                    const isOpen = () => openSet().has(realIndex());
                    return (
                        <div class="rounded-lg border border-neutral-200">
                            <div class="flex items-center gap-2 p-2">
                                <DragHandle {...dragHandle} />
                                <button
                                    type="button"
                                    class="flex-1 text-left text-sm font-medium text-neutral-700 truncate"
                                    onClick={() => toggleOpen(realIndex())}
                                >
                                    {resolveRepeaterItemTitle(props.itemFields, item, realIndex())}
                                </button>
                                <Button sm outline onClick={() => remove(realIndex())}>{t('cms.builder.repeaterRemoveButton')}</Button>
                                <button type="button" class="px-1 text-neutral-400" onClick={() => toggleOpen(realIndex())}>
                                    {isOpen() ? '▲' : '▼'}
                                </button>
                            </div>
                            {isOpen() && (
                                <div class="border-t border-neutral-100 p-3">
                                    <SchemaFieldsEditor fields={props.itemFields} value={item} onChange={(patch) => updateItem(realIndex(), patch)} />
                                </div>
                            )}
                        </div>
                    );
                }}
            </DragList>
            {needsPagination() && (
                <div class="flex items-center justify-center gap-3 pt-1 text-xs text-neutral-500">
                    <button type="button" disabled={page() === 0} class="disabled:opacity-30" onClick={() => setPage(page() - 1)}>◀</button>
                    <span>Trang {page() + 1}/{totalPages()}</span>
                    <button type="button" disabled={page() >= totalPages() - 1} class="disabled:opacity-30" onClick={() => setPage(page() + 1)}>▶</button>
                </div>
            )}
            <Button sm onClick={add}>{t('cms.builder.repeaterAddButton')}</Button>
        </div>
    );
}
