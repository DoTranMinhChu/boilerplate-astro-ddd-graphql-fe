import { defineConfig } from 'vitest/config';
import solidPlugin from 'vite-plugin-solid';
import path from 'node:path';

export default defineConfig({
  // Only needed so a test can import a .tsx SOURCE file (real JSX, not a
  // prebuilt node_modules dist) — e.g. SchemaFieldsEditor.test.ts imports
  // resolveRepeaterItemTitle straight out of SchemaFieldsEditor.tsx. Without this,
  // Vite/esbuild would compile that JSX with its default (React-shaped) transform
  // instead of Solid's. Pure .ts test files are unaffected.
  plugins: [solidPlugin()],
  test: {
    environment: 'node',
    // `.test.tsx` added (Canvas Editor v2, Task 2) — RepeaterFieldEditor.test.tsx renders
    // JSX directly (`<RepeaterFieldEditor .../>`), which BOTH esbuild's default .ts loader
    // and tsc itself refuse to parse in a plain `.ts` file (JSX syntax is only legal in
    // .tsx/.jsx). `.tsx` is the standard extension for a Solid/React test that mounts a
    // component via `render()`, so the file lives as `.test.tsx` and is picked up here.
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
  resolve: {
    // Third-party deps (e.g. @solidjs/router, imported by Button.tsx) ship both a
    // "server" and a "browser" build behind Node's export conditions; left at the
    // default 'node' condition, resolution picks the SERVER build, whose
    // client-only DOM APIs (template()) throw immediately on import. Forcing
    // 'browser' here (without 'development', to keep prod-build behavior — see the
    // solid-js/store alias comment below) makes every non-aliased Solid package
    // resolve the same "real browser code" way the two explicit aliases below
    // already pin solid-js/solid-js-store to.
    conditions: ['browser'],
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
