import { describe, expect, it } from 'vitest';
import { createRoot } from 'solid-js';
import { createStore, produce, unwrap } from 'solid-js/store';
import { Util } from '@core/helpers/util';
import { detachFromStore } from './detachFromStore';

/** Bug gốc: form SỬA 1 bản ghi có field kiểu mảng-object (Content Type `fields`, REPEATER
 * `itemFields`, Content Visibility Rules...) — giá trị vừa sửa KHÔNG được lưu, im lặng
 * hoàn toàn trên bản production. Nguyên nhân: tín hiệu LOCAL của control bị seed thẳng
 * bằng Proxy SỐNG của Solid Store, nên `Object.assign(next[i], patch)` của list-editor
 * bị trap `set` của store nuốt mất (bản production còn không log gì).
 *
 * LƯU Ý QUAN TRỌNG CHO NGƯỜI SỬA TEST NÀY: test chỉ có ý nghĩa khi `solid-js/store` được
 * resolve sang build BROWSER. Với điều kiện `node` mặc định, Solid trả về build server —
 * `createStore` ở đó chỉ trả lại object thường, KHÔNG có proxy nào, nên mọi assert dưới
 * đây pass một cách vô nghĩa. Xem `resolve.alias` trong vitest.config.ts. */
const assertBrowserStoreBuild = (store: any) => {
  expect(
    unwrap(store) !== store,
    'solid-js/store đang resolve về build SERVER (không có proxy) — test vô nghĩa. Kiểm tra resolve.alias trong vitest.config.ts',
  ).toBe(true);
};

const makeStore = () => {
  const [data, setData] = createStore<any>({});
  setData(
    produce((s: any) => {
      Object.assign(
        s,
        Util.cloneDeep({
          fields: [
            { key: 'a', label: 'A', type: 'TEXT', options: ['x'] },
            { key: 'b', label: 'B', type: 'SELECT' },
          ],
        }),
      );
    }),
  );
  return [data, setData] as const;
};

describe('detachFromStore', () => {
  it('giá trị KHÔNG phải store proxy được trả nguyên reference (tạo mới/defaultValue không đổi hành vi)', () => {
    const plainArr = [{ key: 'a' }];
    const plainObj = { a: 1 };
    expect(detachFromStore(plainArr)).toBe(plainArr);
    expect(detachFromStore(plainObj)).toBe(plainObj);
  });

  it('primitive được trả nguyên, KHÔNG làm nổ stack (cloneDeep của radashi đệ quy vô hạn với falsy)', () => {
    for (const v of [undefined, null, false, 0, '', 'x', 7]) {
      expect(() => detachFromStore(v as any)).not.toThrow();
      expect(detachFromStore(v as any)).toStrictEqual(v);
    }
    expect(detachFromStore(NaN)).toBeNaN();
  });

  it('REGRESSION: mảng-object lấy từ store phải mutate-tại-chỗ được, và KHÔNG rò ngược vào store', () => {
    createRoot((dispose) => {
      const [data] = makeStore();
      const live = Util.get(data, 'fields') as any[];
      assertBrowserStoreBuild(live);

      // UI đã render danh sách -> mỗi phần tử đã được đọc qua proxy (gắn symbol nội bộ
      // $PROXY/$NODE lên object raw) — đây là trạng thái THỰC TẾ lúc user bấm sửa.
      live.forEach((it: any) => void it.key);

      // Chứng minh bug vẫn tồn tại nếu seed thẳng proxy: ghi bị NUỐT, không ném lỗi.
      const rawSeeded = [...live];
      Object.assign(rawSeeded[0], { type: 'NUMBER' });
      expect(rawSeeded[0].type).toBe('TEXT');

      // Sau khi tách: ghi ăn thật.
      const detached = detachFromStore(live);
      const next = [...detached];
      Object.assign(next[0], { type: 'NUMBER' });
      expect(next[0].type).toBe('NUMBER');

      // Bản sao phải ĐỘC LẬP: không được đụng tới store, kể cả ở cấp lồng nhau.
      next[0].options.push('y');
      expect((data as any).fields[0].type).toBe('TEXT');
      expect((data as any).fields[0].options.length).toBe(1);

      dispose();
    });
  });

  it('REGRESSION: bản sao ghi ngược vào store rồi đọc lại phải ra giá trị MỚI (không dính Proxy cũ qua symbol $PROXY)', () => {
    createRoot((dispose) => {
      const [data, setData] = makeStore();
      const live = Util.get(data, 'fields') as any[];
      assertBrowserStoreBuild(live);
      live.forEach((it: any) => void it.key);

      const next = [...detachFromStore(live)];
      Object.assign(next[0], { type: 'NUMBER' });

      // giống hệt setValues() của generateForm.tsx
      setData(
        produce((s: any) => {
          Object.assign(s, Util.set(s, 'fields', next));
        }),
      );

      expect((data as any).fields[0].type).toBe('NUMBER');
      dispose();
    });
  });
});
