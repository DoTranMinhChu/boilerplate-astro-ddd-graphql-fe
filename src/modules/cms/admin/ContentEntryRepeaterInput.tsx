import { createSignal } from 'solid-js';
import { createControl } from '@core/components/control/createControl';
import { Button } from '@core/components/button/Button';
import { DragList, DragHandle } from './DragList';
import type { FieldDefinitionDTO } from '@/modules/cms/cms.types';
import { t } from '@/shared/i18n/t';

export interface ContentEntryRepeaterInputProps {
    itemFields: FieldDefinitionDTO[];
    /** Render 1 field con — nhận vào field definition + value hiện tại + hàm cập nhật giá trị đó.
     * Truyền vào dạng prop (không import trực tiếp registry) để tránh phụ thuộc vòng giữa file
     * này và manageContentEntries.page.tsx (nơi định nghĩa registry, và registry đó cũng cần
     * import chính component này cho case REPEATER). */
    renderField: (field: FieldDefinitionDTO, value: any, onChange: (v: any) => void) => any;
    value?: Record<string, any>[];
    onChange?: (v: Record<string, any>[]) => void;
    fieldless?: boolean;
}

/** Tiêu đề tóm tắt cho 1 mục Repeater khi thu gọn (mục D.1 thiết kế) — field có
 * `isRepeaterTitleSource: true` thắng nếu có giá trị, rơi về field TEXT đầu tiên
 * có giá trị, rơi về "Mục #N" (N = index + 1, 1-based cho người dùng cuối) nếu
 * không field nào có giá trị dùng được. Hàm THUẦN để test trực tiếp — bản dịch
 * 1-1 của Task 5's resolveRepeaterItemTitle (SchemaFieldsEditor.tsx), viết riêng
 * cho FieldDefinitionDTO theo đúng quyết định "không gộp chung" (Task 5's Global
 * Constraints). */
export function resolveContentEntryRepeaterItemTitle(itemFields: FieldDefinitionDTO[], item: Record<string, any>, index: number): string {
    const hasValue = (key: string) => {
        const v = item?.[key];
        return v !== undefined && v !== null && v !== '';
    };
    const marked = itemFields.find((f) => f.isRepeaterTitleSource && f.type === 'TEXT' && f.key && hasValue(f.key));
    if (marked) return String(item[marked.key!]);
    const firstText = itemFields.find((f) => f.type === 'TEXT' && f.key && hasValue(f.key));
    if (firstText) return String(item[firstText.key!]);
    return `Mục #${index + 1}`;
}

const REPEATER_PAGE_SIZE = 10;

/** Index (0-based) của mục vừa thêm vào Repeater — nhận `currentLength` là độ dài
 * mảng TRƯỚC khi thêm (index mục mới luôn = độ dài cũ). Hàm THUẦN để test trực
 * tiếp — tách riêng vì `onChange()` của createControl chạy setValue() ĐỒNG BỘ nên
 * gọi `items().length` SAU khi onChange đã chạy sẽ đọc nhầm độ dài MỚI (off-by-one). */
export function computeNewItemIndex(currentLength: number): number {
    return currentLength;
}

/** Clamp `page` (0-based) về trong phạm vi hợp lệ sau khi `itemCount` thay đổi
 * (vd. remove() làm mảng co lại). Hàm THUẦN để test trực tiếp — tách riêng vì
 * nếu không clamp, xoá mục cuối trên trang cuối có thể để `page` trỏ tới trang
 * không còn tồn tại -> pagedIndices() rỗng, không nút nào để quay lại. */
export function computeClampedPage(page: number, itemCount: number, pageSize: number): number {
    const totalPages = Math.max(1, Math.ceil(itemCount / pageSize));
    return page >= totalPages ? totalPages - 1 : page;
}

/** Danh sách lặp lại cho field kiểu REPEATER của Content Type — cùng khuôn với
 * Phase 1's RepeaterFieldInput (mutate item TẠI CHỖ trước khi bọc mảng mới cho
 * onChange, giữ nguyên object reference để DragList không remount hàng đang gõ
 * dở — xem TwoFieldListInput.tsx cho lý do đầy đủ), nhưng render field con qua
 * `props.renderField` (content-entry registry) thay vì block registry.
 *
 * Mỗi mục mặc định THU GỌN (accordion, cùng pattern Set<number> của
 * AccordionListSection.tsx) — chỉ hiện dòng tóm tắt (resolveContentEntryRepeaterItemTitle)
 * cho tới khi admin bấm mở. Danh sách DÒNG TÓM TẮT được PHÂN TRANG khi vượt
 * REPEATER_PAGE_SIZE mục — kéo-thả (DragList) chỉ nhận items của TRANG HIỆN
 * TẠI nên chỉ sắp xếp lại được trong phạm vi 1 trang (giản lược v1 có chủ đích,
 * xem brief Task 5 — không hỗ trợ kéo xuyên trang). Bản dịch 1-1 của Task 5's
 * RepeaterFieldInput cấu trúc UI (SchemaFieldsEditor.tsx, sau commit fix
 * ab279c4) — 2 bug đã biết (off-by-one khi tự mở mục mới, thiếu clamp trang khi
 * xoá làm co mảng) đã tránh bằng cách dịch nguyên add()/remove() từ bản ĐÃ SỬA. */
export function ContentEntryRepeaterInput(props: ContentEntryRepeaterInputProps) {
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
        const newIndex = computeNewItemIndex(items().length);
        onChange([...items(), {}]);
        // Mục mới thêm luôn mở sẵn (admin vừa bấm "+ Thêm mục" chắc chắn muốn điền ngay).
        setOpenSet(new Set([...openSet(), newIndex]));
    };
    const updateItem = (index: number, key: string, val: any) => {
        const next = [...items()];
        Object.assign(next[index], { [key]: val });
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
        // Clamp trang hiện tại nếu mảng co lại khiến trang đó không còn tồn tại
        // (vd. xoá mục cuối cùng trên trang cuối cùng) — nếu không, needsPagination()
        // có thể trở thành false (ẩn luôn nút điều hướng) trong khi page() vẫn trỏ
        // tới 1 trang rỗng -> toàn bộ mục còn lại biến mất khỏi UI.
        setPage((p) => computeClampedPage(p, next.length, REPEATER_PAGE_SIZE));
    };

    const totalPages = () => Math.max(1, Math.ceil(items().length / REPEATER_PAGE_SIZE));
    const pagedIndices = () => {
        const start = page() * REPEATER_PAGE_SIZE;
        return items().map((_, i) => i).slice(start, start + REPEATER_PAGE_SIZE);
    };
    const needsPagination = () => items().length > REPEATER_PAGE_SIZE;

    return (
        <div class="space-y-3">
            <DragList items={pagedIndices().map((i) => items()[i])} onReorder={() => { /* Phân trang + kéo-thả xuyên trang không hỗ trợ v1 — DragList chỉ nhận items của trang hiện tại, không đổi thứ tự toàn mảng. */ }} class="space-y-3">
                {(item, localIndex, dragHandle) => {
                    const realIndex = () => pagedIndices()[localIndex()];
                    const isOpen = () => openSet().has(realIndex());
                    return (
                        <div class="rounded-lg border border-neutral-200 bg-white p-4">
                            <div class="flex items-center gap-2">
                                <DragHandle {...dragHandle} />
                                <button
                                    type="button"
                                    class="flex-1 text-left text-sm font-medium text-neutral-700 truncate"
                                    onClick={() => toggleOpen(realIndex())}
                                >
                                    {resolveContentEntryRepeaterItemTitle(props.itemFields, item, realIndex())}
                                </button>
                                <Button sm outline interactDanger onClick={() => remove(realIndex())}>
                                    {t('cms.contentEntries.repeaterRemoveButton')}
                                </Button>
                                <button type="button" class="px-1 text-neutral-400" onClick={() => toggleOpen(realIndex())}>
                                    {isOpen() ? '▲' : '▼'}
                                </button>
                            </div>
                            {isOpen() && (
                                <div class="mt-3 space-y-3 border-t border-neutral-100 pt-3">
                                    {props.itemFields.map((field) => (
                                        <div>
                                            <p class="mb-1 text-xs font-medium text-neutral-500">
                                                {field.label}{field.required ? ' *' : ''}
                                            </p>
                                            {props.renderField(field, item[field.key!], (v) => updateItem(realIndex(), field.key!, v))}
                                        </div>
                                    ))}
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
            <Button sm outline onClick={add}>{t('cms.contentEntries.repeaterAddButton')}</Button>
        </div>
    );
}
