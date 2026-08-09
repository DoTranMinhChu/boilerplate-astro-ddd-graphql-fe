import { createResource, createMemo } from 'solid-js';
import { Select } from '@core/components/control/Select';
import { TermService, type TermDTO } from '@/shared/services/term/term.service';
import type { Edge } from '@core/api/types';

export interface TaxonomyFieldInputProps {
    taxonomyId: string;
    multiple?: boolean;
    /** Truyền để dùng ở chế độ CONTROLLED (vd bên trong 1 item của REPEATER, nơi
     * không có path <Field name="..."> ambient ổn định) thay vì ambient mode mặc
     * định — cùng khuôn RelationFieldInputProps.value/onChange (xem RelationFieldInput.tsx). */
    value?: string | string[];
    onChange?: (v: string | string[]) => void;
    fieldless?: boolean;
}

/**
 * Field TAXONOMY — dropdown chọn Term thật (đúng khuôn RelationFieldInput, nhưng nguồn
 * dữ liệu là Term của 1 Taxonomy thay vì ContentEntry của 1 ContentType). Không cần cấu
 * hình "hiển thị theo field" như RELATION vì Term chỉ có đúng 1 field label thật, luôn
 * dùng thẳng.
 *
 * Thụt lề theo cấp cha/con: dựng cây phẳng-có-thụt-lề từ `parentId` (đúng thuật toán
 * `parentOptions` trong TermTreeEditor.tsx's TermFormDialog). Taxonomy dạng PHẲNG (không
 * hierarchical) có mọi Term với `parentId` rỗng, nên walk() từ gốc tự nhiên cho ra đúng 1
 * danh sách phẳng không thụt lề — không cần biết trước Taxonomy có hierarchical hay
 * không, nên component này không cần nhận prop đó.
 */
export function TaxonomyFieldInput(props: TaxonomyFieldInputProps) {
    const [termsResource] = createResource(
        () => props.taxonomyId,
        (taxonomyId) => TermService.getAllTerm({ input: { filter: { taxonomyId } as unknown as string, limit: 500 } }),
    );

    const terms = createMemo(() => ((termsResource()?.edges || []) as Edge<TermDTO>[])
        .filter((e): e is Edge<TermDTO> & { node: TermDTO } => !!e.node)
        .map((e) => e.node));

    const options = createMemo(() => {
        const all = terms();
        const byParent = (parentId: string | undefined) =>
            all
                .filter((term) => (term.parentId || undefined) === parentId)
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const result: { value: string; label: string }[] = [];
        const walk = (parentId: string | undefined, depth: number) => {
            byParent(parentId).forEach((term) => {
                result.push({ value: term.id!, label: `${'—'.repeat(depth)}${depth ? ' ' : ''}${term.label}` });
                walk(term.id, depth + 1);
            });
        };
        walk(undefined, 0);
        return result;
    });

    return (
        <Select
            options={options()}
            multi={props.multiple}
            clearable
            loading={termsResource.loading}
            placeholder="Chọn danh mục/thẻ"
            value={props.value}
            onChange={props.onChange}
            fieldless={props.fieldless}
        />
    );
}
