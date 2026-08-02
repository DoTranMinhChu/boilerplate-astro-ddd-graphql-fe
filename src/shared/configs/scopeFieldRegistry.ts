// src/shared/config/scopeFieldRegistry.ts
//
// ══════════════════════════════════════════════════════════════════════════════
// SCOPE FIELD REGISTRY
// ══════════════════════════════════════════════════════════════════════════════
//
// Map từ field name → config query cho ids selector trong PermRow.
//
// ── VẤN ĐỀ VỚI FIELD 'id' ────────────────────────────────────────────────────
//
// byParentField = 'unitId' → chỉ có 1 entity dùng field này → lookup dễ.
// byId = 'id' → mọi entity đều có field 'id' → không biết query service nào.
//
// GIẢI PHÁP: Compound key = 'resourceGroup:id' khi field là 'id'.
//   'unit:id' → grantable('unit', ...)
//   'codeConfig:id' → grantable('codeConfig', ...)
//   ...
//
// Với byParentField (field khác 'id') → key đơn giản = field name:
//   'unitId'       → grantable('unit', ...)
//   'codeConfigId' → grantable('codeConfig', ...)
//
// ── CÁCH THÊM MỚI ─────────────────────────────────────────────────────────────
//
// 1. Thêm entry vào SCOPE_FIELD_REGISTRY, dùng helper `grantable(resourceGroup, placeholder)`
//    — nó tự gọi getGrantableResources(resourceGroup) qua GrantableResourceService.
//
// 2. Ví dụ thêm filter theo id của một entity mới `widget`:
//
//   // Dùng trong scope "Chỉ một số widget cụ thể" (byId: 'id', resourceGroup: 'widget')
//   'widget:id': grantable('widget', 'Tìm widget...'),
//
//   // Dùng trong scope "Theo widget" (byParentField: 'widgetId')
//   'widgetId': grantable('widget', 'Tìm widget...'),
//
// ══════════════════════════════════════════════════════════════════════════════

export interface IScopeFieldQueryConfig {
    placeholder: string;
    query: (input: { input: any }) => Promise<any>;
    getLabel: (item: any) => string;
    getValue: (item: any) => string;
}

// ══════════════════════════════════════════════════════════════════════════════
// QUAN TRỌNG — phá vòng lặp phân quyền↔dữ liệu:
//
// Picker scope KHÔNG gọi trực tiếp getAllX của service tương ứng
// (những API đó thường gác bởi *_VIEW → người quản lý quyền không có VIEW sẽ thấy rỗng).
//
// Thay vào đó dùng GrantableResourceService.forSelect(resourceGroup) → gọi
// getGrantableResources (gác bởi STAFF_PERMISSION_MANAGE). BE tự giới hạn phạm vi
// theo thẩm quyền của người gán (bounded) hoặc trả toàn bộ (full delegated admin).
// ══════════════════════════════════════════════════════════════════════════════

import { GrantableResourceService } from '../services/grantableResource/grantableResource.service';

/** Helper tạo config từ resourceGroup — query luôn đi qua getGrantableResources. */
function grantable(resourceGroup: string, placeholder: string): IScopeFieldQueryConfig {
    return {
        placeholder,
        query: GrantableResourceService.forSelect(resourceGroup),
        getLabel: (item) => item.name ?? item.code ?? item.id ?? '',
        getValue: (item) => item.id ?? '',
    };
}

// Example entries wired to the kept generic modules — add one entry per
// scoped/permissioned entity your product introduces.
export const SCOPE_FIELD_REGISTRY: Record<string, IScopeFieldQueryConfig> = {
    // ── Unit ──────────────────────────────────────────────────────────────────
    'unit:id': grantable('unit', 'Tìm đơn vị tính...'),
    'unitId':  grantable('unit', 'Tìm đơn vị tính...'),

    // ── CodeConfig ────────────────────────────────────────────────────────────
    'codeConfig:id': grantable('codeConfig', 'Tìm cấu hình mã...'),
    'codeConfigId':  grantable('codeConfig', 'Tìm cấu hình mã...'),
};

// ─── getScopeFieldConfig ──────────────────────────────────────────────────────
//
// Lookup theo field + resourceGroup.
//
// Thứ tự tìm:
//   1. 'resourceGroup:field' (khi field = 'id' — cần context để phân biệt entity)
//   2. 'field' đơn thuần (khi field = 'unitId', 'codeConfigId', ...)
//
// Ví dụ:
//   getScopeFieldConfig('id', 'unit') → tìm 'unit:id' → ✓
//   getScopeFieldConfig('unitId', 'codeConfig') → tìm 'codeConfig:unitId' (miss)
//                                                → tìm 'unitId' → ✓
//   getScopeFieldConfig('unknown', 'xyz') → undefined → PermRow fallback text input

export function getScopeFieldConfig(
    field: string | null | undefined,
    resourceGroup?: string | null,
): IScopeFieldQueryConfig | undefined {
    if (!field) return undefined;

    // 1. Compound key: 'resourceGroup:field'
    if (resourceGroup) {
        const compoundKey = `${resourceGroup}:${field}`;
        const config = SCOPE_FIELD_REGISTRY[compoundKey];
        if (config) return config;
    }

    // 2. Field đơn thuần
    return SCOPE_FIELD_REGISTRY[field];
}