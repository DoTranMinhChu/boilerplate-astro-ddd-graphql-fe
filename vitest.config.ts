import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: [
      // Ghim solid-js về build BROWSER (production). Mặc định, resolve trong Node đi theo
      // điều kiện export "node" -> Solid trả về build SERVER, ở đó `createStore` chỉ trả
      // lại object thường, KHÔNG có Proxy nào. Mọi test về hành vi thật của Store (vd
      // detachFromStore.test.ts — tái hiện lỗi mất dữ liệu ÂM THẦM khi ghi thẳng lên store
      // proxy) sẽ "pass" một cách vô nghĩa. Test chạy trong environment 'node' nhưng code
      // được test là code CHẠY TRÊN TRÌNH DUYỆT, nên phải test đúng build đó.
      // Chọn bản production (solid.js/store.js) chứ không phải dev.js: đúng bản mà bug biểu
      // hiện tệ nhất — trap `set` của store chỉ `return true`, không log cảnh báo nào.
      {
        find: /^solid-js\/store$/,
        replacement: path.resolve(
          __dirname,
          'node_modules/solid-js/store/dist/store.js',
        ),
      },
      {
        find: /^solid-js$/,
        replacement: path.resolve(__dirname, 'node_modules/solid-js/dist/solid.js'),
      },
      { find: '@core', replacement: path.resolve(__dirname, 'src/core') },
      { find: '@shared', replacement: path.resolve(__dirname, 'src/shared') },
      { find: '@modules', replacement: path.resolve(__dirname, 'src/modules') },
      { find: '@layouts', replacement: path.resolve(__dirname, 'src/layouts') },
      { find: '@', replacement: path.resolve(__dirname, 'src') },
    ],
  },
});
