export const baseTextConfig = {
  selectEmptyPlaceholder: 'Chưa chọn',
  selectEmptyOptionsPlaceholder: 'Không có lựa chọn',
  selectInstructionPlaceholder: 'Chọn hoặc tìm kiếm',
  selectDefaultGroupPlaceholder: 'Khác',

  datepickerSelectMonthText: 'Chọn tháng',
  datepickerSelectYearText: 'Chọn năm',
  datepickerWeekdayNames: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
  datepickerMonthNames: [
    'Tháng 1',
    'Tháng 2',
    'Tháng 3',
    'Tháng 4',
    'Tháng 5',
    'Tháng 6',
    'Tháng 7',
    'Tháng 8',
    'Tháng 9',
    'Tháng 10',
    'Tháng 11',
    'Tháng 12',
  ],

  dialogBackLabel: 'Quay lại',
  dialogCloseLabel: 'Đóng',

  inputMultiInstructionPlaceholder: 'Nhập và bấm Enter',

  mediaUploadRatioLabel: (ratio: string) => `Tỉ lệ ${ratio}`,
  mediaUploadMaxSizeLabel: (maxSize: number) => `Tối đa ${maxSize}MB`,
  mediaUploadExceedMaxSizeLabel: (maxSize: number) =>
    `Không được tải lên quá ${maxSize}MB`,
  mediaUploadExceedMaxNumberLabel: (maxNumber: number, mediaName: string) =>
    `Không được tải lên quá ${maxNumber} ${mediaName}`,
  mediaUploadInvalidFormatLabel: (mediaName: string, accept: string) =>
    `File ${mediaName} không đúng định dạng cho phép (${accept})`,
  mediaUploadLabel: (mediaName: string) => `Tải ${mediaName}`,
  mediaOr: 'hoặc',
  mediaPasteLabel: (mediaName: string) => `Dán ${mediaName} tại đây`,
  mediaClearLabel: (mediaName: string) => `Chọn ${mediaName} khác`,
  mediaUploadFromURLFailedLabel: (mediaName: string) =>
    `Tải ${mediaName} từ đường dẫn thất bại`,
  mediaDragLabel: (mediaName: string) => `Kéo thả ${mediaName} vào đây`,
  mediaFailedLabel: (mediaName: string) => `Tải ${mediaName} lên thất bại`,
  imageLabel: 'ảnh',
  videoLabel: 'video',
  audioLabel: 'âm thanh',
  fileLabel: 'tệp tin',
  editorMaxMediasLabel: (currentMedias: number, maxMedias: number) => (
    <>
      Số lượng ảnh tải lên tối đa:{' '}
      <b>
        {currentMedias}/{maxMedias}
      </b>
      . Không tính ảnh chèn từ đường dẫn hoặc dán vào từ nguồn khác.
    </>
  ),

  confirmSubmitLabel: 'Xác nhận',
  confirmCancelLabel: 'Đóng',

  datatableCreateNewLabel: 'Tạo mới',
  datatableCreateLabel: 'Tạo',
  datatableUpdateLabel: 'Cập nhật',
  datatableDeleteLabel: 'Xoá',
  datatableRefreshLabel: 'Tải lại',
  datatableSearchByLabel: (field: string) =>
    `Tìm kiếm ${field ? `theo ${field[0]?.toLowerCase() + field.slice(1)}` : ``}`,
  datatableSearchPlaceholder: 'Tìm kiếm theo trường',
  datatableRowLabel: 'dòng',
  datatableResultLabel: 'kết quả',

  datatableDeleteItemLabel: (type: string) => `Xoá ${type}`,
  datatableDeleteItemContent: (type: string, name?: string) => (
    <span>
      {type.charAt(0).toUpperCase() + type.slice(1)} <b>{name}</b> sẽ bị xoá
      khỏi hệ thống
    </span>
  ),

  emptyText: 'Không tìm thấy dữ liệu',

  formRequiredText: 'Bắt buộc',
  formTextTooLong: 'Nội dung quá dài',
  formEmailInvalid: 'Email không đúng định dạng',
  formUrlInvalid: 'URL không đúng định dạng',
  formCodeInvalid:
    'Mã không hợp lệ. Yêu cầu nhập chữ, số, gạch ngang và gạch dưới. Từ 3-64 ký tự.',
  formMinText: (min: number) => `Cần nhập ít nhất ${min} ký tự`,
  formMaxText: (max: number) => `Không được nhập quá ${max} ký tự`,

  taskSuccessText: (text: string) => `${text} thành công`,
  taskFailureText: (text: string) => `${text} thất bại`,

  defaultImage: `/src/assets/img/default/default-image.png`,

  errorRequestTooLarge: 'Truy vấn dữ liệu quá nhiều',
  errorFailedToFetch: 'Không thể kết nối với hệ thống',
};
