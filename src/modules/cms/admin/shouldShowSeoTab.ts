import type { FieldDefinitionDTO } from '@/modules/cms/cms.types';

/** Full Page Editor's SEO tab (mục D.3 design) — hiện CHỈ KHI content type thật sự có field
 * liên quan SEO/meta, tránh đoán mù (yêu cầu rõ ràng của design doc). Heuristic tường minh:
 * key hoặc label (không phân biệt hoa/thường) chứa "seo" hoặc "meta". */
export function shouldShowSeoTab(fields: FieldDefinitionDTO[]): boolean {
    return fields.some((f) => {
        const key = (f?.key ?? '').toLowerCase();
        const label = (f?.label ?? '').toLowerCase();
        return key.includes('seo') || key.includes('meta') || label.includes('seo') || label.includes('meta');
    });
}
