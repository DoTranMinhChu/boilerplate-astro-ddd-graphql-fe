// src/core/components/control/MaskedInput.ssr.test.tsx
// Runs under vitest.ssr.config.ts (`npm run test:ssr`), NOT the default vitest.config.ts —
// see that file's header for why the two toolchains must stay separate.
//
// Regression test for the "renderToString timed out" failure on any public CMS page that
// embeds a Form containing a DATE or NUMBER field (both render MaskedInput, via
// InputDate.tsx / InputNumber.tsx). Real occurrence: /nha-hang, whose Reservation section
// holds a form-embed node.
//
// MaskedInput assigns its `InputMask` instance ONLY inside the `<input ref={...}>`
// callback. On the server that callback never runs (there is no DOM), yet Solid's SSR
// teardown DOES run `onCleanup` (solid-js/dist/server.js `cleanNode`) once the render
// completes — so `m.destroy()` was called on `undefined`. The resulting TypeError is
// raised inside Solid's post-render flush promise chain, so Astro sees it as an
// UnhandledRejection, aborts the response mid-stream (every node after the form-embed is
// silently dropped), and 30 seconds later reports only the generic
// `"renderToString timed out"`.
import { describe, it, expect } from 'vitest';
import { renderToStringAsync } from 'solid-js/web';
import { createComponent } from 'solid-js';
import { MaskedInput } from './MaskedInput';

describe('MaskedInput SSR teardown', () => {
    it('server-renders an <input> and survives Solid disposing the render root', async () => {
        // Before the fix this rejected with
        // `TypeError: Cannot read properties of undefined (reading 'destroy')`.
        const DateMasked = MaskedInput({ mask: Date });
        const html = await renderToStringAsync(() => createComponent(DateMasked, { value: '' }));
        expect(html).toContain('<input');
    });

    it('server-renders a numeric mask the same way (InputNumber\'s code path)', async () => {
        const NumberMasked = MaskedInput({ mask: Number });
        const html = await renderToStringAsync(() =>
            createComponent(NumberMasked, { value: '0', unmaskedValue: '0' }),
        );
        expect(html).toContain('<input');
    });
});
