// Module-scoped i18n dictionary for the Code Config page.
//
// Standalone (not merged into src/shared/i18n/dictionaries/*.ts) because those central
// dictionaries are being edited by other agents in parallel. Once merged centrally,
// these keys should live under `codeConfig` in vi.ts / en.ts and this file can be
// removed along with the loosened `t()` signature.

export const codeConfigVi = {
  codeConfig: {
    entityLabels: {
      invoiceOption: 'Hoá đơn (Invoice)',
      orderOption: 'Đơn hàng (Order)',
      contractOption: 'Hợp đồng (Contract)',
      documentOption: 'Tài liệu (Document)',
      invoice: 'Hoá đơn',
      order: 'Đơn hàng',
      contract: 'Hợp đồng',
      document: 'Tài liệu',
    },
    card: {
      currentSequence: 'Seq hiện tại:',
      configured: 'Đã cấu hình',
      prefixLabel: 'Tiền tố',
      prefixPlaceholder: 'VD: INV, ORD, DOC',
      separatorLabel: 'Dấu phân cách',
      separatorPlaceholder: '-',
      sequenceLengthLabel: 'Độ dài số',
      sequenceLengthPlaceholder: '5',
      includeYearLabel: 'Thêm năm',
      samplePreview: 'Mã mẫu:',
      save: 'Lưu',
      saveSuccess: 'Đã lưu cấu hình mã {entity}',
    },
    page: {
      title: 'Cấu hình mã tự động',
      subtitle: 'Thiết lập quy tắc sinh mã cho từng loại đối tượng',
    },
  },
};

export type CodeConfigDict = typeof codeConfigVi;

export const codeConfigEn: CodeConfigDict = {
  codeConfig: {
    entityLabels: {
      invoiceOption: 'Invoice',
      orderOption: 'Order',
      contractOption: 'Contract',
      documentOption: 'Document',
      invoice: 'Invoice',
      order: 'Order',
      contract: 'Contract',
      document: 'Document',
    },
    card: {
      currentSequence: 'Current seq:',
      configured: 'Configured',
      prefixLabel: 'Prefix',
      prefixPlaceholder: 'e.g. INV, ORD, DOC',
      separatorLabel: 'Separator',
      separatorPlaceholder: '-',
      sequenceLengthLabel: 'Sequence length',
      sequenceLengthPlaceholder: '5',
      includeYearLabel: 'Include year',
      samplePreview: 'Sample code:',
      save: 'Save',
      saveSuccess: 'Saved code config for {entity}',
    },
    page: {
      title: 'Automatic Code Configuration',
      subtitle: 'Set up code generation rules for each object type',
    },
  },
};
