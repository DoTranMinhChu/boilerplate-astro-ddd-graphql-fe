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
 * Display fallback can't rely on data.slug (no Content Type has that field) — falls back to
 * the first non-empty string value in data, matching entryDisplayName()'s convention elsewhere.
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
