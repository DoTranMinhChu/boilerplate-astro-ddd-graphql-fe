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
// byParentField = 'productionUnitId' → chỉ có 1 entity dùng field này → lookup dễ.
// byId = 'id' → mọi entity đều có field 'id' → không biết query service nào.
//
// GIẢI PHÁP: Compound key = 'resourceGroup:id' khi field là 'id'.
//   'productionUnit:id' → ProductionUnitService
//   'productionPlot:id' → ProductionPlotService
//   'productionMember:id' → ProductionMemberService
//   ...
//
// Với byParentField (field khác 'id') → key đơn giản = field name:
//   'productionUnitId' → ProductionUnitService
//   'memberId'         → ProductionMemberService
//
// ── CÁCH THÊM MỚI ─────────────────────────────────────────────────────────────
//
// 1. Thêm entry vào SCOPE_FIELD_REGISTRY.
//
// 2. Ví dụ thêm filter theo id của Lot:
//
//   import { LotService } from '../services/lot/lot.service';
//
//   // Dùng trong scope "Chỉ một số lô cụ thể" (byId: 'id', resourceGroup: 'lot')
//   'lot:id': {
//       placeholder: 'Tìm lô sản xuất...',
//       query: (input) => LotService.getAllLot(input),
//       getLabel: (item) => item.code ?? item.name ?? '',
//       getValue: (item) => item.id ?? '',
//   },
//
//   // Dùng trong scope "Theo lô" (byParentField: 'lotId')
//   'lotId': {
//       placeholder: 'Tìm lô sản xuất...',
//       query: (input) => LotService.getAllLot(input),
//       getLabel: (item) => item.code ?? item.name ?? '',
//       getValue: (item) => item.id ?? '',
//   },
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
// Picker scope KHÔNG gọi getAllProductionUnit / getAllProductionPlot... nữa
// (những API đó gác bởi *_VIEW → người quản lý quyền không có VIEW sẽ thấy rỗng).
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

export const SCOPE_FIELD_REGISTRY: Record<string, IScopeFieldQueryConfig> = {

    // ── ProductionUnit ────────────────────────────────────────────────────────
    'productionUnit:id':  grantable('productionUnit', 'Tìm vùng sản xuất...'),
    'productionUnitId':   grantable('productionUnit', 'Tìm vùng sản xuất...'),

    // ── ProductionPlot ────────────────────────────────────────────────────────
    'productionPlot:id':  grantable('productionPlot', 'Tìm điểm sản xuất...'),
    'productionPlotId':   grantable('productionPlot', 'Tìm điểm sản xuất...'),

    // ── ProductionMember ──────────────────────────────────────────────────────
    'productionMember:id': grantable('productionMember', 'Tìm thành viên...'),
    'memberId':            grantable('productionMember', 'Tìm thành viên...'),
    'productionMemberId':  grantable('productionMember', 'Tìm thành viên...'),

    // ── Factory ───────────────────────────────────────────────────────────────
    'factory:id': grantable('factory', 'Tìm nhà máy...'),
    'factoryId':  grantable('factory', 'Tìm nhà máy...'),

    // ── Warehouse ─────────────────────────────────────────────────────────────
    'warehouse:id': grantable('warehouse', 'Tìm kho hàng...'),
    'warehouseId':  grantable('warehouse', 'Tìm kho hàng...'),

    // ── Lot ───────────────────────────────────────────────────────────────────
    'lot:id': grantable('lot', 'Tìm lô sản xuất...'),
    'lotId':  grantable('lot', 'Tìm lô sản xuất...'),

    // ── Supplier ──────────────────────────────────────────────────────────────
    'supplier:id': grantable('supplier', 'Tìm nhà cung cấp...'),
    'supplierId':  grantable('supplier', 'Tìm nhà cung cấp...'),

    // ── Vehicle ───────────────────────────────────────────────────────────────
    'vehicle:id': grantable('vehicle', 'Tìm phương tiện...'),
    'vehicleId':  grantable('vehicle', 'Tìm phương tiện...'),
};

// ─── getScopeFieldConfig ──────────────────────────────────────────────────────
//
// Lookup theo field + resourceGroup.
//
// Thứ tự tìm:
//   1. 'resourceGroup:field' (khi field = 'id' — cần context để phân biệt entity)
//   2. 'field' đơn thuần (khi field = 'productionUnitId', 'memberId', ...)
//
// Ví dụ:
//   getScopeFieldConfig('id', 'productionUnit') → tìm 'productionUnit:id' → ✓
//   getScopeFieldConfig('productionUnitId', 'productionPlot') → tìm 'productionPlot:productionUnitId' (miss)
//                                                              → tìm 'productionUnitId' → ✓
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