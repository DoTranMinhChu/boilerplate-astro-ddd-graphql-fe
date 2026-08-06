import { createResource } from 'solid-js';
import { Select } from '@core/components/control/Select';
import { ContentEntryService, type ContentEntryDTO } from '@/shared/services/contentEntry/contentEntry.service';
import type { Edge } from '@core/api/types';
import { t } from '@/shared/i18n/t';

export interface RelationFieldInputProps {
    contentTypeId: string;
    multiple?: boolean;
}

/**
 * RELATION field trước đây bắt admin tự gõ tay UUID của bản ghi liên quan — không
 * ai nhớ nổi ID nào ứng với bản ghi nào, dễ nhập sai. Giờ hiển thị dropdown tìm và
 * chọn thật, hiển thị theo Slug (luôn có sẵn với mọi Object Type, không phụ thuộc
 * field nào cụ thể của loại nội dung đích). `Select` đã tự bind vào Field context
 * bao quanh (giống mọi Select khác dùng trực tiếp trong Datatable.Field), không
 * cần tự quản state qua createControl.
 */
export function RelationFieldInput(props: RelationFieldInputProps) {
    const [entries] = createResource(
        () => props.contentTypeId,
        // `filter` sinh ra kiểu string do hạn chế codegen với scalar Mixed (xem cms.types.ts)
        // — giá trị thật lúc runtime vẫn nhận object bình thường, đây là điểm cast duy nhất.
        (contentTypeId) => ContentEntryService.getAllContentEntry({ input: { limit: 200, filter: { contentTypeId } as unknown as string } }),
    );
    const options = () => ((entries()?.edges || []) as Edge<ContentEntryDTO>[])
        .filter((e): e is Edge<ContentEntryDTO> & { node: ContentEntryDTO } => !!e.node)
        .map((e) => ({ value: e.node.id!, label: e.node.slug! }));

    return (
        <Select
            options={options()}
            multi={props.multiple}
            clearable
            loading={entries.loading}
            placeholder={t('cms.contentEntries.fields.relationPlaceholder')}
        />
    );
}
