import { EFieldType } from '@shared/generated/typed-graphql';
import { EFilterOperator } from '@core/api/types';

/** Bộ lọc nhanh (mục F design) — widget suy ra từ operator TRƯỚC (quyết định SHAPE giá trị:
 * BETWEEN luôn cần 2 số, LIKE luôn là text), rồi mới field type (SELECT/BOOLEAN có widget
 * chuyên biệt hơn text thường). RELATION/TAXONOMY chưa có widget riêng — fallback text (nhập
 * tay giá trị field đích), không crash, không giả vờ có picker. */
export function resolveQuickFilterWidget(fieldType: EFieldType, operator: EFilterOperator): 'select' | 'boolean' | 'range' | 'text' {
    if (operator === EFilterOperator.BETWEEN) return 'range';
    if (operator === EFilterOperator.LIKE) return 'text';
    if (fieldType === EFieldType.BOOLEAN) return 'boolean';
    if (fieldType === EFieldType.SELECT && (operator === EFilterOperator.EQUALS || operator === EFilterOperator.IN)) return 'select';
    return 'text';
}
