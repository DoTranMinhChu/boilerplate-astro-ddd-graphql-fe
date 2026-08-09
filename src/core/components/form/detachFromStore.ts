import { cloneDeep, FastCloningStrategy } from 'radashi';
import { unwrap } from 'solid-js/store';

/** Tách 1 giá trị đọc từ `data` (Solid Store của generateForm) thành bản sao ĐỘC LẬP, để
 * seed vào tín hiệu LOCAL của control (createControl.tsx).
 *
 * VÌ SAO CẦN: ở chế độ SỬA, `value(fieldName)` = `Util.get(data, fieldName)` trả về 1 Proxy
 * SỐNG của Store cho field kiểu mảng/object. Nếu seed thẳng Proxy đó vào signal local, mọi
 * list-editor mutate-tại-chỗ (`Object.assign(next[i], patch)` — pattern BẮT BUỘC để <For>
 * của DragList key theo reference không unmount dòng đang gõ, giữ được focus) sẽ ghi lên
 * chính Proxy đó. Trap `set` của Store proxy KHÔNG BAO GIỜ ghi giá trị: bản dev còn
 * `console.warn("Cannot mutate a Store directly")`, bản production chỉ `return true` —
 * mất dữ liệu HOÀN TOÀN ÂM THẦM. Chế độ TẠO MỚI không dính, vì ở đó `value()` là undefined
 * nên signal được seed bằng defaultValue (object thường, không phải proxy).
 *
 * 3 chi tiết BẮT BUỘC, đều đã kiểm chứng bằng thực nghiệm trên chính build browser của
 * solid-js 1.9 (xem detachFromStore.test.ts) — đừng "đơn giản hoá" mất cái nào:
 *
 * 1. Phải chặn primitive TRƯỚC. `cloneDeep` của radashi rơi vào đệ quy vô hạn với
 *    undefined/null/false/0/''/NaN (RangeError: Maximum call stack size exceeded) — mà đây
 *    đều là giá trị RẤT phổ biến của field (ô text rỗng, toggle tắt, số 0, form tạo mới).
 *
 * 2. Phải dùng `FastCloningStrategy`. `cloneDeep` mặc định copy property DESCRIPTOR, mà
 *    descriptor lấy từ Store proxy là accessor CHỈ CÓ GETTER (Solid tự đổi data descriptor
 *    thành getter trong trap getOwnPropertyDescriptor) → bản "sao" vẫn không ghi được, ném
 *    `TypeError: Cannot set property ... which has only a getter`. FastCloningStrategy đọc
 *    qua `{...input}` nên ra data property thường, ghi được.
 *
 * 3. KHÔNG thay bằng `cloneDeep(unwrap(v))`. `unwrap` trả về object RAW vẫn còn mang symbol
 *    $PROXY/$NODE của Solid, và cloneDeep mặc định copy luôn các symbol đó; bản sao khi được
 *    ghi ngược vào store sẽ bị `wrap()` trả về đúng Proxy CŨ → đọc lại vẫn ra giá trị CŨ.
 *
 * `unwrap(val) === val` là cách chính thức của Solid để nhận biết "không phải store proxy":
 * nhờ vậy giá trị thường (chế độ TẠO MỚI, defaultValue) được trả nguyên reference, giữ hành
 * vi hiện tại y hệt — chỉ đúng trường hợp Proxy mới bị sao chép.
 *
 * CẢNH BÁO (review độc lập phát hiện, chưa gây hại nhưng cần biết): `FastCloningStrategy` clone
 * qua `{...input}`, nên 1 CLASS INSTANCE lồng bên trong giá trị field (không phải chính field,
 * radashi's `isObject` coi class instance là "object thường") sẽ bị "làm phẳng" — mất
 * `prototype`/method, chỉ còn lại các property riêng. Hiện KHÔNG có class instance nào chảy vào
 * form values trong dự án (chỉ JSON thuần từ GraphQL + `Date` native + `File` — cả 2 loại này
 * KHÔNG bị coi là "object thường" nên giữ nguyên reference, không bị clone). Nếu sau này 1 field
 * nào đó mang theo class instance (vd 1 wrapper Money/Decimal tự viết), cần xử lý riêng ở đây. */
export function detachFromStore<T>(val: T): T {
  if (!val || typeof val !== 'object') return val;
  if (unwrap(val as any) === (val as any)) return val;
  return cloneDeep(val as any, FastCloningStrategy) as T;
}
