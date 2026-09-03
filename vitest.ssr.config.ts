import { defineConfig } from 'vitest/config';
import solidPlugin from 'vite-plugin-solid';
import path from 'node:path';

// Second, deliberately SEPARATE Vitest project for tests that must exercise code the way
// it runs during Astro's SERVER render, not in the browser.
//
// It cannot be folded into vitest.config.ts: that file pins `solid-js`, `solid-js/web`
// and `solid-js/store` to Solid's BROWSER builds on purpose (see its comments — Store
// proxies, effect scheduling, and `@solidjs/testing-library` all need the client runtime),
// and compiles JSX with vite-plugin-solid's default CLIENT transform (`_tmpl$()` +
// `document.createElement`). Those two choices are exactly what an SSR test must NOT have:
// SSR-compiled JSX emits `ssr()`/`escape()` from solid-js/web's SERVER build, and Solid's
// server runtime is the only one that runs `cleanNode` (i.e. `onCleanup`) as part of
// finishing a render.
//
// Files matched here are `*.ssr.test.tsx(?)`, and vitest.config.ts excludes that same glob
// so each file is compiled by exactly one of the two toolchains. `npm test` runs both, with
// THIS project first on purpose: the client project currently exits non-zero even when all
// of its assertions pass (pre-existing unhandled rejections after teardown — a BE fetch in
// NodeDataSourceTab.test.tsx, gsap's requestAnimationFrame in NodeRenderer.test.tsx), so a
// `client && ssr` chain would silently never reach the SSR suite. Run either half alone with
// `npm run test:ssr` / `npm run test:client`.
export default defineConfig({
  plugins: [solidPlugin({ ssr: true })],
  test: {
    name: 'ssr',
    environment: 'node',
    include: ['test/**/*.ssr.test.ts', 'test/**/*.ssr.test.tsx'],
    server: {
      deps: {
        // Same reason as vitest.config.ts: force every solid-js import through Vite's
        // resolveId so the conditions below actually apply instead of being bypassed by
        // Vitest's externalize loader.
        inline: [/solid-js/, /@solid-primitives/],
      },
    },
  },
  resolve: {
    // The whole point of this project: resolve Solid through its `node`/server exports so
    // `solid-js/web` is the SSR runtime (renderToStringAsync, ssr(), cleanNode) — the
    // mirror image of vitest.config.ts's `conditions: ['browser']`.
    conditions: ['node'],
    alias: [
      { find: '@core', replacement: path.resolve(__dirname, 'src/core') },
      { find: '@shared', replacement: path.resolve(__dirname, 'src/shared') },
      { find: '@modules', replacement: path.resolve(__dirname, 'src/modules') },
      { find: '@layouts', replacement: path.resolve(__dirname, 'src/layouts') },
      { find: '@', replacement: path.resolve(__dirname, 'src') },
    ],
  },
});
