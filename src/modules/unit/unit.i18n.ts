// src/modules/unit/unit.i18n.ts
//
// Module-scoped i18n dictionary for the "Manage Unit" page. Standalone so it can
// typecheck against the temporarily-loosened `t()` signature before being merged
// into the central src/shared/i18n/dictionaries/{vi,en}.ts (owned by other agents
// in parallel — do not merge here, do not edit those files from this module).
export const unitVi = {
    unit: {
        title: 'Đơn vị tính',
        description: 'Quản lý đơn vị tính — dùng cho sản phẩm, lô hàng, quy trình',
        buttonCreate: 'Thêm đơn vị',
        groupOptions: {
            weight: 'Khối lượng',
            volume: 'Thể tích',
            count: 'Đếm / Số lượng',
            length: 'Chiều dài',
            area: 'Diện tích',
            other: 'Khác',
        },
        column: {
            name: 'Tên đơn vị',
            code: 'Ký hiệu',
            group: 'Nhóm',
            status: 'Trạng thái',
        },
        status: {
            active: 'Đang dùng',
            inactive: 'Tạm ẩn',
        },
        form: {
            createTitle: 'Thêm đơn vị đo',
            updateTitle: 'Cập nhật đơn vị đo',
            nameLabel: 'Tên đơn vị',
            namePlaceholder: 'VD: Kilogram, Trái, Bao 50kg',
            codeLabel: 'Ký hiệu',
            codePlaceholder: 'VD: kg, trái, bao',
            groupLabel: 'Nhóm đo lường',
            groupPlaceholder: 'Chọn nhóm...',
            descriptionLabel: 'Mô tả',
            descriptionPlaceholder: 'VD: 1 bao = 50kg...',
            statusLabel: 'Trạng thái',
            statusActive: 'Đang sử dụng',
            statusInactive: 'Tạm ẩn',
        },
    },
};

export const unitEn: typeof unitVi = {
    unit: {
        title: 'Units',
        description: 'Manage measurement units — used for products, batches, and processes',
        buttonCreate: 'Add unit',
        groupOptions: {
            weight: 'Weight',
            volume: 'Volume',
            count: 'Count / Quantity',
            length: 'Length',
            area: 'Area',
            other: 'Other',
        },
        column: {
            name: 'Unit name',
            code: 'Symbol',
            group: 'Group',
            status: 'Status',
        },
        status: {
            active: 'Active',
            inactive: 'Hidden',
        },
        form: {
            createTitle: 'Add measurement unit',
            updateTitle: 'Update measurement unit',
            nameLabel: 'Unit name',
            namePlaceholder: 'e.g. Kilogram, Piece, 50kg bag',
            codeLabel: 'Symbol',
            codePlaceholder: 'e.g. kg, pc, bag',
            groupLabel: 'Measurement group',
            groupPlaceholder: 'Select group...',
            descriptionLabel: 'Description',
            descriptionPlaceholder: 'e.g. 1 bag = 50kg...',
            statusLabel: 'Status',
            statusActive: 'Active',
            statusInactive: 'Hidden',
        },
    },
};
