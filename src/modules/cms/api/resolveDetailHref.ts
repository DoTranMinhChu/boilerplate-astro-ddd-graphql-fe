import type { DetailPathBindingDTO } from '@/modules/cms/cms.types';

/**
 * Build href thật từ binding đa-param + data của 1 entry (Phase 3 mục 2 — path Chi tiết có thể
 * cần NHIỀU param, không còn đúng 1 `paramName`/`fieldKey`). Dùng chung cho MỌI nơi tiêu thụ
 * `DetailPathBindingDTO` (FeaturedEntryNode.tsx, nodeDataBinding.ts — `resolveRelationDisplays`
 * từng dùng hàm này nhưng đã bị xoá ở Phase 0 M3b final-review fix, xem resolveCmsPageProps.ts)
 * thay vì tự lặp lại `.replace()` ở từng nơi — tránh lệch logic khi shape đổi lần nữa.
 *
 * Trả `undefined` nếu THIẾU giá trị ở BẤT KỲ field nào trong `bindings` — giữ nguyên tắc cũ
 * ("1 field thiếu = không suy ngược được path đúng") của bản 1-param, mở rộng cho N field: nếu
 * 1 trong N field không có giá trị, href build ra sẽ sai/thiếu param, coi như không xác định
 * được link, không hiện href hỏng.
 */
export function resolveDetailHref(binding: DetailPathBindingDTO | undefined | null, data: Record<string, unknown> | undefined): string | undefined {
    if (!binding || !data) return undefined;
    let path = binding.path;
    for (const b of binding.bindings) {
        const value = data[b.fieldKey];
        if (value === undefined || value === null || value === '') return undefined;
        path = path.replace(':' + b.paramName, String(value));
    }
    return path;
}
