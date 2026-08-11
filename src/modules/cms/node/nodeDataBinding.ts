// src/modules/cms/node/nodeDataBinding.ts
// Node data-binding engine — resolves a node prop's actual value (static vs bound-to-
// contextEntry) và fetch entries cho node có `repeat` (collection binding). Xem
// docs/superpowers/specs/2026-08-12-nocode-visual-builder-v2-design.md §3.
import type { DataBinding, CollectionRepeat } from './node.types';
import { ContentEntryService } from '@/shared/services/contentEntry/contentEntry.service';

/** Static value hay giá trị lấy từ field của context entry hiện tại. `static` luôn
 * thắng bất kể contextEntry có gì; `boundField` fallback về giá trị static nếu
 * không có context hoặc field không tồn tại (an toàn khi preview ngoài Page có
 * dataBinding, hoặc field bị đổi tên phía Content Type). */
export function resolveBoundValue(binding: DataBinding, contextEntry: Record<string, any> | undefined, staticValue: any): any {
    if (binding.mode !== 'boundField' || !binding.field) return staticValue;
    if (!contextEntry || !(binding.field in contextEntry)) return staticValue;
    return contextEntry[binding.field];
}

/** Fetch danh sách entry cho 1 node có `repeat` — gọi trực tiếp
 * ContentEntryService.getPublicContentEntries (cùng hàm MixedFeed/RelatedEntries/
 * ContentDetail đang dùng qua resolveCmsPageProps.ts), KHÔNG qua genericDataSource.ts
 * (file đó chỉ resolve filter VALUE từ path/query param, không fetch gì cả).
 *
 * `repeat.contentTypeKey` được truyền thẳng làm `contentTypeId` — codebase này không
 * có bảng tra key→id riêng, mọi nơi khác đều tham chiếu ContentType qua contentTypeId.
 *
 * GAP đã biết: `repeat.taxonomyFilter` (lọc theo taxonomy term) chưa có tham số tương
 * ứng ở getPublicContentEntries — hạ tầng BE chưa hỗ trợ, không phải thiếu ở đây. Nếu
 * có giá trị, chỉ cảnh báo console và bỏ qua (KHÔNG throw, KHÔNG âm thầm coi như đã lọc). */
export async function fetchRepeatEntries(repeat: CollectionRepeat, ctx?: { locale?: string }): Promise<Record<string, any>[]> {
    if (repeat.taxonomyFilter?.length) {
        console.warn('[nodeDataBinding] taxonomyFilter is not yet supported by getPublicContentEntries — ignoring.');
    }

    const filters = Object.entries(repeat.filter ?? {}).map(([field, value]) => ({ field, operator: '$eq', value: String(value) }));

    const res = await ContentEntryService.getPublicContentEntries({
        contentTypeId: repeat.contentTypeKey,
        filters: filters.length ? filters : undefined,
        sortField: repeat.sort?.field,
        sortDirection: repeat.sort?.direction,
        limit: repeat.limit,
        locale: ctx?.locale,
    });

    return (res ?? []).filter((e) => e != null) as Record<string, any>[];
}
