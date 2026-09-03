import { Show, type JSX } from 'solid-js';
import { createControl } from '@core/components/control/createControl';
import { Input } from '@core/components/control/Input';
import { InputNumber } from '@core/components/control/InputNumber';
import { NativeSelect } from '@core/components/control/NativeSelect';
import { Select } from '@core/components/control/Select';
import { Toggle } from '@core/components/control/Toggle';
import { Button } from '@core/components/button/Button';
import { Icon } from '@shared/components/icons/Icon';
import { DragList, DragHandle } from './DragList';
import { EFieldType, type FieldDefinitionInput } from '@shared/generated/typed-graphql';
import type { ContentTypeDTO } from '@shared/services/contentType/contentType.service';
import { EFieldDisplayVariant } from '@/modules/cms/cms.types';

const FIELD_TYPE_OPTIONS: Array<{ value: EFieldType; label: string }> = [
    { value: EFieldType.TEXT, label: 'Text' },
    { value: EFieldType.RICHTEXT, label: 'Rich text' },
    { value: EFieldType.NUMBER, label: 'Số' },
    { value: EFieldType.BOOLEAN, label: 'Boolean' },
    { value: EFieldType.DATE, label: 'Ngày' },
    { value: EFieldType.SELECT, label: 'Select' },
    { value: EFieldType.IMAGE, label: 'Ảnh' },
    { value: EFieldType.GALLERY, label: 'Gallery' },
    { value: EFieldType.VIDEO, label: 'Video' },
    { value: EFieldType.LINK, label: 'Link' },
    { value: EFieldType.RELATION, label: 'Quan hệ' },
    { value: EFieldType.TAXONOMY, label: 'Danh mục / Thẻ' },
    { value: EFieldType.REPEATER, label: 'Danh sách lặp lại' },
];

const fieldTypeOptions = (nested?: boolean) =>
    nested ? FIELD_TYPE_OPTIONS.filter((o) => o.value !== EFieldType.REPEATER) : FIELD_TYPE_OPTIONS;

export interface FieldDefinitionArrayInputProps {
    /** Danh sách Content Type khác để chọn làm đích cho field kiểu RELATION — không
     * bao gồm chính Content Type đang sửa nếu đã biết id (self-relation không hợp lý
     * cho use-case hiện tại: "sản phẩm liên quan tới bài viết", không phải cây phả hệ). */
    contentTypeOptions?: { value: string; label: string }[];
    /** Bản đầy đủ (kèm `fields`) của cùng danh sách Content Type trên — dùng để tra field
     * của content type ĐÍCH đã chọn ở field RELATION (control "Hiển thị theo field"). Tách
     * riêng khỏi contentTypeOptions (chỉ có value/label) vì phần lớn nơi gọi component này
     * không cần tới list field đầy đủ, chỉ nơi cần "Hiển thị theo field" mới phải tra. */
    contentTypesFull?: ContentTypeDTO[];
    /** Danh sách Taxonomy để chọn cho field kiểu TAXONOMY (mục 4.6b — "Danh mục / Thẻ"). */
    taxonomyOptions?: { value: string; label: string }[];
    /** Cho phép gọi đệ quy (itemFields của 1 field REPEATER) — khi truyền, component hoạt
     * động ở chế độ CONTROLLED thay vì đọc/ghi qua <Field name="fields"> ambient. */
    value?: FieldDefinitionInput[];
    onChange?: (v: FieldDefinitionInput[]) => void;
    fieldless?: boolean;
    /** true khi đây là lần gọi ĐỆ QUY để soạn itemFields của 1 REPEATER cha — ẩn lựa
     * chọn REPEATER khỏi "Loại field" vì REPEATER lồng REPEATER không được hỗ trợ
     * (BE assertUniqueFieldKeys từ chối, và fragment đọc ContentType chỉ fetch
     * itemFields đúng 1 cấp — cho lồng thêm sẽ khiến cấp 2 bị mất khi đọc lại). */
    nested?: boolean;
}

const emptyField = (): FieldDefinitionInput => ({ key: '', label: '', type: EFieldType.TEXT });

/** Props truyền cho 1 panel cấu hình "đặc thù theo type" trong registry bên dưới.
 *
 * `field` là tham chiếu object ỔN ĐỊNH (mutate tại chỗ bởi updateField — xem giải thích
 * ở currentType() trong component chính) — dùng trực tiếp `field.xxx` cho các prop
 * `value=` của control TỰ nó điều khiển việc đổi giá trị (Select/Toggle/Input tự gọi
 * onChange khi user thao tác) là AN TOÀN, giống cách Key/Label/options/mockValue vẫn
 * làm từ trước — vì không có đường nào khác ngoài chính control đó ghi lại giá trị này.
 *
 * `getField` là accessor CÓ TRACKING (đọc qua fields()[index()], như currentType()) —
 * BẮT BUỘC dùng accessor này (không phải `field.xxx` thẳng) ở bất kỳ đâu 1 panel cần đọc
 * giá trị 1 field KHÁC do 1 control KHÁC trong panel ghi ra để quyết định hiển
 * thị/tính toán (vd RELATION đọc relationTarget để hiện khối "Hiển thị theo field" và để
 * tra list field của content type đích) — nếu đọc thẳng field.xxx ở đây sẽ lặp lại đúng
 * lỗi reactivity cũ (Show/computed không bao giờ re-run vì không đụng signal nào). */
interface FieldTypeConfigPanelProps {
    field: FieldDefinitionInput;
    getField: () => FieldDefinitionInput | undefined;
    index: () => number;
    updateField: (index: number, patch: Partial<FieldDefinitionInput>) => void;
    /** Accessor (không phải mảng chốt cứng) — <Show keyed> dựng panel bên trong `untrack`,
     * nên nếu truyền mảng đã tính sẵn, giá trị bị chốt cứng tại thời điểm panel dựng và
     * không bao giờ thấy resource (contentTypes/taxonomies) resolve muộn hơn. Đọc qua
     * accessor giữ đúng reactive như JSX prop gốc trước khi có registry. */
    contentTypeOptions: () => { value: string; label: string }[];
    contentTypesFull: () => ContentTypeDTO[];
    taxonomyOptions: () => { value: string; label: string }[];
    nested?: boolean;
}

/** Registry panel cấu hình "đặc thù theo type" — gom 3 khối <Show when={currentType() ===
 * 'SELECT'/'RELATION'/'REPEATER'}> viết tay trước đây + panel TAXONOMY mới thành 1 map
 * tra cứu theo EFieldType, thay vì if/else hay nhiều <Show> rời rạc. Không bao gồm control
 * validate rule (TEXT/RICHTEXT/NUMBER) — control đó hiện LUÔN theo NHÓM kiểu dữ liệu
 * (không phải panel "đặc thù" 1-1 theo 1 type), xem khối <Show> riêng ngay sau chỗ gọi
 * registry này trong component chính. */
const fieldTypeConfigPanels: Partial<Record<string, (props: FieldTypeConfigPanelProps) => JSX.Element>> = {
    SELECT: (p) => (
        <div>
            <FieldLabel>Các lựa chọn</FieldLabel>
            <Input
                value={(p.field.options || []).join(', ')}
                onChange={(v: string) => p.updateField(p.index(), { options: v.split(',').map((s) => s.trim()).filter(Boolean) })}
                placeholder="Cách nhau bằng dấu phẩy, vd: Đỏ, Xanh, Vàng"
                fieldless
            />
        </div>
    ),

    RELATION: (p) => (
        <div class="grid grid-cols-12 gap-3">
            <div class="col-span-8">
                <FieldLabel>Liên quan tới loại nội dung</FieldLabel>
                <NativeSelect
                    value={p.field.relationTarget}
                    onChange={(v: string) => p.updateField(p.index(), { relationTarget: v })}
                    options={p.contentTypeOptions()}
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
                    value={!!p.field.relationMultiple}
                    onChange={(v: boolean) => p.updateField(p.index(), { relationMultiple: v })}
                    fieldless
                />
            </div>
            {/* getField() (tracked) thay vì p.field.relationTarget thẳng — đây chính là
                field KHÁC (không phải currentType) mà brief cảnh báo cần accessor riêng:
                relationTarget được NativeSelect ở trên ghi ra, khối này ĐỌC lại nó để
                quyết định hiện/ẩn + tính list field tra cứu, nên phải qua signal. */}
            <Show when={p.getField()?.relationTarget}>
                <div class="col-span-12">
                    <FieldLabel>Hiển thị theo field</FieldLabel>
                    <Select
                        value={p.field.relationDisplayField}
                        onChange={(v: string) => p.updateField(p.index(), { relationDisplayField: v })}
                        options={(p.contentTypesFull().find((c) => c.id === p.getField()?.relationTarget)?.fields || [])
                            .filter((f): f is NonNullable<typeof f> => !!f?.key)
                            .map((f) => ({ value: f.key!, label: f.label || f.key! }))}
                        emptyPlaceholder="-- Mặc định (tự chọn field tiêu đề) --"
                        clearable
                        fieldless
                    />
                </div>
            </Show>
        </div>
    ),

    TAXONOMY: (p) => (
        <div class="grid grid-cols-12 gap-3">
            <div class="col-span-8">
                <FieldLabel>Taxonomy</FieldLabel>
                <Select
                    value={p.field.taxonomyId}
                    onChange={(v: string) => p.updateField(p.index(), { taxonomyId: v })}
                    options={p.taxonomyOptions()}
                    emptyPlaceholder="-- Chọn Taxonomy --"
                    clearable
                    fieldless
                />
            </div>
            <div class="col-span-4 flex items-end pb-1.5">
                <Toggle
                    text="Cho phép chọn nhiều"
                    textClass="text-xs text-neutral-600"
                    value={!!p.field.taxonomyMultiple}
                    onChange={(v: boolean) => p.updateField(p.index(), { taxonomyMultiple: v })}
                    fieldless
                />
            </div>
        </div>
    ),

    REPEATER: (p) => (
        <Show when={!p.nested}>
            <div class="rounded-lg border border-neutral-300 bg-neutral-50 p-4 space-y-4">
                {/* displayVariant (mục E.2) — kiểu hiển thị của REPEATER trên trang công khai, chỉ
                    có ý nghĩa ở REPEATER CẤP CAO NHẤT (khối này đã gate !p.nested phía trên) vì
                    REPEATER lồng không được hỗ trợ. p.getField() (tracked, như relationTarget ở
                    panel RELATION phía trên) chứ không phải p.field.displayVariant thẳng — dù ở
                    đây Select tự ghi giá trị của chính field nó điều khiển (an toàn theo comment
                    FieldTypeConfigPanelProps), dùng getField() cho nhất quán và để giá trị mặc
                    định 'list' hiển thị đúng ngay sau khi đổi Loại field sang REPEATER. */}
                <div>
                    <FieldLabel>Kiểu hiển thị trên trang công khai</FieldLabel>
                    <Select
                        options={[
                            { value: EFieldDisplayVariant.LIST, label: 'Danh sách (mặc định)' },
                            { value: EFieldDisplayVariant.CARDS, label: 'Lưới thẻ' },
                            { value: EFieldDisplayVariant.ACCORDION, label: 'Thu gọn (accordion)' },
                        ]}
                        value={p.getField()?.displayVariant || EFieldDisplayVariant.LIST}
                        onChange={(v: string) => p.updateField(p.index(), { displayVariant: v as EFieldDisplayVariant })}
                        fieldless
                    />
                </div>
                <div>
                    <FieldLabel>Các field con trong mỗi mục</FieldLabel>
                    <div class="mt-2">
                        <FieldDefinitionArrayInput
                            value={(p.field.itemFields || []).filter(Boolean) as FieldDefinitionInput[]}
                            onChange={(v) => p.updateField(p.index(), { itemFields: v })}
                            fieldless
                            nested
                            contentTypeOptions={p.contentTypeOptions()}
                            contentTypesFull={p.contentTypesFull()}
                            taxonomyOptions={p.taxonomyOptions()}
                        />
                    </div>
                </div>
            </div>
        </Show>
    ),
};

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
    const { value, onChange } = createControl<FieldDefinitionInput[]>('object_array', {
        value: props.value,
        onChange: props.onChange,
        fieldless: props.fieldless,
    });

    const fields = () => value() || [];

    // Mutate tại chỗ (giữ nguyên reference) — DragList's <For> key theo reference
    // (xem stableKey() trong DragList.tsx); tạo object mới cho dòng đang gõ sẽ khiến
    // <For> unmount+remount cả dòng mỗi phím gõ, làm mất focus đang nhập.
    //
    // LỊCH SỬ: pattern mutate-tại-chỗ này từng gây MẤT DỮ LIỆU ÂM THẦM ở chế độ SỬA — mảng
    // `fields` phía sau `value()` khi đó là Proxy SỐNG của Solid Store, nên Object.assign()
    // ở dưới ghi thẳng lên store proxy và bị trap `set` nuốt mất (bản dev log "Cannot mutate
    // a Store directly", bản production KHÔNG log gì cả). ĐÃ SỬA TẬN GỐC ở generateForm.tsx:
    // tín hiệu LOCAL của control giờ luôn được seed bằng 1 bản sao độc lập, không phải proxy
    // (xem core/components/form/detachFromStore.ts + detachFromStore.test.ts). Nhờ vậy KHÔNG
    // cần đổi cách DragList.tsx key theo reference, và mutate tại chỗ ở đây vẫn an toàn.
    // Đừng "sửa" lại thành tạo object mới cho dòng đang gõ — sẽ làm mất focus như giải thích
    // ngay trên.
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
                {(field, index) => {
                    // Đọc type qua fields()[index()] (tracked signal) thay vì field.type (tham
                    // chiếu object thường, KHÔNG reactive) — field được updateField() mutate tại
                    // chỗ để <For> không unmount hàng đang gõ dở (giữ focus), nhưng hệ quả là
                    // field.type đọc trực tiếp trong <Show when=...> không bao giờ trigger lại:
                    // <Show>'s when chỉ re-run khi 1 signal nó ĐỌC BÊN TRONG đổi giá trị, mà đọc
                    // thẳng field.type không đụng tới signal nào cả. fields() thì có gọi value()
                    // (signal của createControl) nên đổi Loại field ở dropdown mới thực sự khiến
                    // khối itemFields (hay trước đây là Options/Relation) hiện/ẩn đúng lúc.
                    const currentType = () => fields()[index()]?.type;
                    // Accessor CÓ TRACKING cho panel registry bên dưới — panel RELATION cần
                    // đọc lại relationTarget (do chính panel đó ghi ra) để hiện/ẩn khối "Hiển
                    // thị theo field" và tra field của content type đích; đọc field.xxx thẳng ở
                    // đây sẽ dính lại đúng lỗi reactivity mà currentType() ở trên tránh cho type.
                    const getField = () => fields()[index()];
                    // Danh sách field TEXT KHÁC (không phải chính field đang cấu hình) trong CÙNG mảng
                    // fields — dùng cho Select "Tự sinh giá trị từ field" (mục α). Đọc qua fields() (tracked)
                    // + index() (tracked), KHÔNG đọc field.xxx thẳng — đúng lớp bug reactivity đã ghi chú
                    // xuyên suốt file này (Show/computed không re-run nếu không đụng signal nào).
                    const otherTextFieldOptions = () => fields()
                        .filter((f, i) => f.type === EFieldType.TEXT && i !== index() && !!f.key)
                        .map((f) => ({ value: f.key as string, label: f.label || f.key || '' }));
                    return (
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
                                        options={fieldTypeOptions(props.nested)}
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
                                    text="Hiện trong danh sách"
                                    textClass="text-xs text-neutral-600"
                                    value={!!field.showInListing}
                                    onChange={(v: boolean) => updateField(index(), { showInListing: v })}
                                    fieldless
                                />
                            </div>

                            {/* Registry panel "đặc thù theo type" (SELECT/RELATION/TAXONOMY/REPEATER) —
                                <Show keyed> chứ KHÔNG gọi registry trực tiếp trong 1 expression trần:
                                keyed dùng equals a===b trên chính GIÁ TRỊ currentType() (chuỗi), nên
                                children (tức panel) chỉ dựng lại khi type THỰC SỰ đổi (kể cả đổi giữa
                                2 type khác nhau trong cùng phiên — đúng lỗi reactivity cũ cần tránh),
                                KHÔNG dựng lại mỗi khi 1 field bất kỳ (ở dòng này hay dòng khác) đổi giá
                                trị nào khác — nếu gọi thẳng registry không qua Show, mọi keystroke ở
                                BẤT KỲ field nào trong cả bảng (kể cả gõ trong chính panel đang mở, vd
                                ô "Mẫu regex") sẽ làm registry re-run và dựng lại DOM panel từ đầu, mất
                                focus đang gõ — lặp lại đúng dạng lỗi mà updateField() mutate-tại-chỗ
                                (thay vì tạo object mới) vốn được thiết kế để tránh. */}
                            <Show when={currentType()} keyed>
                                {(type) => fieldTypeConfigPanels[type]?.({
                                    field,
                                    getField,
                                    index,
                                    updateField,
                                    contentTypeOptions: () => props.contentTypeOptions || [],
                                    contentTypesFull: () => props.contentTypesFull || [],
                                    taxonomyOptions: () => props.taxonomyOptions || [],
                                    nested: props.nested,
                                })}
                            </Show>

                            {/* Validate rule theo NHÓM kiểu dữ liệu (không qua registry — không phải
                                panel "đặc thù" 1-1 theo 1 type) — currentType() (tracked) như trên. */}
                            <Show when={currentType() === EFieldType.TEXT || currentType() === EFieldType.RICHTEXT}>
                                <div class="grid grid-cols-12 gap-3">
                                    <div class="col-span-4">
                                        <FieldLabel>Độ dài tối thiểu</FieldLabel>
                                        <InputNumber value={field.minLength} onChange={(v) => updateField(index(), { minLength: v ?? undefined })} fieldless />
                                    </div>
                                    <div class="col-span-4">
                                        <FieldLabel>Độ dài tối đa</FieldLabel>
                                        <InputNumber value={field.maxLength} onChange={(v) => updateField(index(), { maxLength: v ?? undefined })} fieldless />
                                    </div>
                                    <div class="col-span-4">
                                        <FieldLabel>Mẫu regex (nâng cao)</FieldLabel>
                                        <Input value={field.pattern} onChange={(v: string) => updateField(index(), { pattern: v })} placeholder="vd: ^[0-9]{10}$" fieldless />
                                    </div>
                                </div>
                            </Show>
                            {/* !props.nested: unique/autoGenerateFrom (mục α) chỉ áp dụng cho field CẤP CAO
                                NHẤT của 1 entry -- resolveUniqueFields() (BE) chỉ lặp qua fields cấp cao
                                nhất, KHÔNG đệ quy vào itemFields của REPEATER (khác validateData(), có đệ
                                quy) vì "duy nhất trong Content Type" không có ngữ nghĩa rõ ràng cho 1 field
                                nằm bên trong 1 item của mảng lặp lại. Không gate theo nested ở đây sẽ để lộ
                                2 control này cho field trong itemFields, admin cấu hình/lưu được (fragment
                                đã chọn itemFields.unique/autoGenerateFrom) nhưng BE hoàn toàn bỏ qua -- lỗi
                                "cấu hình chết, im lặng" phát hiện ở rà soát cuối plan α. */}
                            <Show when={currentType() === EFieldType.TEXT && !props.nested}>
                                <div class="grid grid-cols-12 gap-3">
                                    <div class="col-span-5 flex items-end pb-1.5">
                                        <Toggle
                                            text="Duy nhất trong Content Type"
                                            textClass="text-xs text-neutral-600"
                                            value={!!field.unique}
                                            onChange={(v: boolean) => updateField(index(), { unique: v })}
                                            fieldless
                                        />
                                    </div>
                                    <div class="col-span-7">
                                        <FieldLabel>Tự sinh giá trị từ field (khi để trống)</FieldLabel>
                                        <Select
                                            value={field.autoGenerateFrom}
                                            onChange={(v: string) => updateField(index(), { autoGenerateFrom: v })}
                                            options={otherTextFieldOptions()}
                                            emptyPlaceholder="-- Không tự sinh --"
                                            clearable
                                            fieldless
                                        />
                                    </div>
                                </div>
                            </Show>
                            <Show when={currentType() === EFieldType.NUMBER}>
                                <div class="grid grid-cols-12 gap-3">
                                    <div class="col-span-6">
                                        <FieldLabel>Giá trị nhỏ nhất</FieldLabel>
                                        <InputNumber value={field.min} onChange={(v) => updateField(index(), { min: v ?? undefined })} fieldless />
                                    </div>
                                    <div class="col-span-6">
                                        <FieldLabel>Giá trị lớn nhất</FieldLabel>
                                        <InputNumber value={field.max} onChange={(v) => updateField(index(), { max: v ?? undefined })} fieldless />
                                    </div>
                                </div>
                            </Show>
                            {/* props.nested: đối lập khối unique/autoGenerateFrom phía trên — isRepeaterTitleSource
                                (mục D.1) chỉ có ý nghĩa cho field TEXT NẰM TRONG itemFields của 1 REPEATER cha (BE
                                DTO comment: "Chỉ dùng cho field NẰM TRONG itemFields"), dùng để tô đậm 1 field làm
                                "tiêu đề tóm tắt" khi thu gọn từng mục ở chế độ accordion trên trang công khai. Ẩn ở
                                field cấp cao nhất (props.nested falsy) vì không có ngữ nghĩa "thu gọn mục" ở đó.
                                currentType() (tracked, xem giải thích đầu file) để hiện/ẩn đúng khi đổi Loại field. */}
                            <Show when={props.nested && currentType() === EFieldType.TEXT}>
                                <div class="col-span-12">
                                    <Toggle
                                        text="Dùng làm tiêu đề tóm tắt khi thu gọn mục"
                                        textClass="text-xs text-neutral-600"
                                        value={!!getField()?.isRepeaterTitleSource}
                                        onChange={(v: boolean) => updateField(index(), { isRepeaterTitleSource: v })}
                                        fieldless
                                    />
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
                    );
                }}
            </DragList>
            <Button sm outline onClick={addField}>+ Thêm field</Button>
        </div>
    );
}
