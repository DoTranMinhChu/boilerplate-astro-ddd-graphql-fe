import { defineConfig, configDefaults } from 'vitest/config';
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
    // `*.ssr.test.*` belongs to the OTHER project (vitest.ssr.config.ts): those tests need
    // Solid's server runtime + the SSR JSX transform, i.e. the exact opposite of the
    // browser-build aliases and client transform this config sets up on purpose. Excluded
    // here so each file is compiled by exactly one toolchain. `npm test` runs both.
    exclude: [...configDefaults.exclude, 'src/**/*.ssr.test.ts', 'src/**/*.ssr.test.tsx'],
    server: {
      deps: {
        // Bắt buộc INLINE (bundle qua Vite) thay vì để Vitest coi các gói này là
        // "external" cho SSR. Khi một gói bị đánh dấu external, Vitest/vite-node nạp
        // nó bằng một ESM loader NGUYÊN SINH riêng cho việc externalize — loader đó áp
        // dụng resolve.conditions của Vite (nên vẫn dính điều kiện "development" mà
        // vite-plugin-solid tự thêm khi HMR bật) nhưng KHÔNG áp dụng resolve.alias.
        // Hệ quả: mọi import "solid-js"/"solid-js/web" xảy ra BÊN TRONG một gói
        // external (@solidjs/testing-library, @solid-primitives/*, hay chính
        // solid-js/web tự import lại "solid-js") đều lách qua 2 alias production ở
        // dưới và luôn rơi vào bản DEVELOPMENT (dist/dev.js, web/dist/dev.js) — xác
        // nhận bằng thực nghiệm: 2 alias solid-js/solid-js-web đứng một mình KHÔNG đủ
        // để InputNumber.test.tsx pass, chỉ khi thêm inline này (buộc mọi import
        // solid-js đi qua resolveId của Vite, nơi alias thực sự có hiệu lực) thì 4/4
        // test mới pass. Đây mới là nguyên nhân gốc khiến solid-js/web (và cả solid-js
        // core, khi được import gián tiếp từ trong một gói external) resolve sai bản.
        inline: [/solid-js/, /@solid-primitives/, /@solidjs\/testing-library/],
      },
    },
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
      // Ghim solid-js/web về build BROWSER (production), cùng lý do như alias solid-js
      // ở trên — nhưng đây là một specifier RIÊNG (deep import), regex /^solid-js$/
      // KHÔNG match nó. Nếu để mặc định, solid-js/web sẽ resolve sang web/dist/dev.js
      // (bản DEVELOPMENT), tức là một MODULE INSTANCE KHÁC với core solid-js đã ghim ở
      // trên, có Owner/effect-queue riêng. @solidjs/testing-library's render() import
      // solid-js/web ở bên trong, nên hai instance lệch nhau khiến createEffect chạy
      // ĐỒNG BỘ ngay trong lần render đầu (thay vì được defer đúng cách) — gây lỗi TDZ
      // ReferenceError khi effect tham chiếu tới một const khai báo sau nó trong cùng
      // component (pattern hợp lệ và rất phổ biến trong Solid.js).
      // LƯU Ý: alias này chỉ có hiệu lực khi import thực sự đi qua resolveId của Vite —
      // xem giải thích `server.deps.inline` ở khối `test` phía trên để biết vì sao cả
      // solid-js lẫn solid-js/web đều cần được ép INLINE thì 2 alias production này
      // (alias này và alias solid-js ở trên) mới thực sự phát huy tác dụng.
      {
        find: /^solid-js\/web$/,
        replacement: path.resolve(__dirname, 'node_modules/solid-js/web/dist/web.js'),
      },
      { find: '@core', replacement: path.resolve(__dirname, 'src/core') },
      { find: '@shared', replacement: path.resolve(__dirname, 'src/shared') },
      { find: '@modules', replacement: path.resolve(__dirname, 'src/modules') },
      { find: '@layouts', replacement: path.resolve(__dirname, 'src/layouts') },
      { find: '@', replacement: path.resolve(__dirname, 'src') },
    ],
  },
});
