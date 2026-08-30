import { createResource } from 'solid-js';
import { Select } from '@core/components/control/Select';
import { ContentEntryService, type ContentEntryDTO } from '@/shared/services/contentEntry/contentEntry.service';
import type { Edge } from '@core/api/types';
import { t } from '@/shared/i18n/t';

export interface RelationFieldInputProps {
    contentTypeId: string;
    multiple?: boolean;
    /** field.relationDisplayField đã cấu hình ở Content Type builder — key của 1 field
     * TRÊN content type đích dùng làm nhãn hiển thị trong picker. Để trống -> fallback
     * `data.slug` (ContentEntry không còn cột `slug` cứng từ mục γ, Task 5, nhưng
     * `data.slug` vẫn tồn tại — quy ước hiện tại, xem ghi chú resolveCmsPageProps.ts). */
    displayField?: string;
    /** Truyền để dùng ở chế độ CONTROLLED (vd bên trong 1 item của REPEATER, nơi
     * không có path <Field name="..."> ambient ổn định) thay vì ambient mode mặc định. */
    value?: string | string[];
    onChange?: (v: string | string[]) => void;
    fieldless?: boolean;
}

/**
 * RELATION field trước đây bắt admin tự gõ tay UUID của bản ghi liên quan — không
 * ai nhớ nổi ID nào ứng với bản ghi nào, dễ nhập sai. Giờ hiển thị dropdown tìm và
 * chọn thật, hiển thị theo `displayField` khi content type đích có cấu hình
 * ("Hiển thị theo field" ở Content Type builder). `Select` hỗ trợ cả 2 chế độ: ambient
 * (tự bind vào Field context bao quanh, dùng ở top-level Datatable.Field) và
 * controlled (value/onChange/fieldless truyền tay, dùng bên trong REPEATER item).
 *
 * Found live (Post-Phase-8 content build-out dogfooding): khi admin KHÔNG cấu hình
 * `displayField` (trường hợp phổ biến nhất — không ai nhớ tick "Hiển thị theo field"
 * ngay lúc tạo Quan hệ), fallback cũ dùng `data.slug` — nhưng ContentEntry không còn
 * cột `slug` cứng từ mục γ (Task 5), và KHÔNG Content Type nào admin tự tạo có field
 * tên "slug" (xem 10 Content Type thật đã tạo ở Phase 8 extension: Sản phẩm, Game,
 * Khóa học, Món ăn... field đầu tiên luôn là "ten", không phải "slug") — nên fallback
 * luôn rơi thẳng xuống UUID thô, dropdown hiển thị 1 cột toàn UUID không đọc được,
 * y hệt lỗi ban đầu component này được tạo ra để sửa. Fallback mới: lấy giá trị
 * string không rỗng ĐẦU TIÊN trong `data` (đúng tinh thần `entryDisplayName()` ở
 * manageContentEntries.page.tsx — "field TEXT đầu tiên" — nhưng không cần fetch thêm
 * field schema của content type đích vì duyệt thẳng `data` đã có sẵn từ entries()).
 */
export function RelationFieldInput(props: RelationFieldInputProps) {
    const [entries] = createResource(
        () => props.contentTypeId,
        // `filter` sinh ra kiểu string do hạn chế codegen với scalar Mixed (xem cms.types.ts)
        // — giá trị thật lúc runtime vẫn nhận object bình thường, đây là điểm cast duy nhất.
        (contentTypeId) => ContentEntryService.getAllContentEntry({ input: { limit: 200, filter: { contentTypeId } as unknown as string } }),
    );
    const firstStringValue = (data: Record<string, unknown> | undefined): string | undefined => {
        if (!data) return undefined;
        for (const v of Object.values(data)) {
            if (typeof v === 'string' && v.trim()) return v;
        }
        return undefined;
    };
    const options = () => ((entries()?.edges || []) as Edge<ContentEntryDTO>[])
        .filter((e): e is Edge<ContentEntryDTO> & { node: ContentEntryDTO } => !!e.node)
        .map((e) => {
            const data = e.node.data as Record<string, unknown> | undefined;
            const label = (props.displayField ? data?.[props.displayField] as string : undefined) || firstStringValue(data) || e.node.id!;
            return { value: e.node.id!, label };
        });

    return (
        <Select
            options={options()}
            multi={props.multiple}
            clearable
            loading={entries.loading}
            placeholder={t('cms.contentEntries.fields.relationPlaceholder')}
            value={props.value}
            onChange={props.onChange}
            fieldless={props.fieldless}
        />
    );
}
