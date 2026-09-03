// src/core/components/control/InputDate.ssr.test.tsx
// Runs under vitest.ssr.config.ts (`npm run test:ssr`), NOT the default vitest.config.ts —
// see MaskedInput.ssr.test.tsx's header for why the two toolchains must stay separate.
//
// REVIEW-2026-09-01.md §A.12 fix-adjacent find: connecting Hương Việt's booking form-embed to
// a real Form (previously an orphaned formId:'') surfaced a "Hydration Mismatch" thrown from
// InputDate's <Floating> date-picker popover — SSR renders nothing for it (Floating.tsx returns
// null when `!props.reference`, since the wrapper's ref callback never fires server-side), but
// the client's hydration pass had `ref` already assigned and rendered real content, a genuine
// SSR/client shape mismatch. Fixed by gating <Floating> behind a `mounted` signal (set in
// onMount, so it stays false through hydration too — see InputDate.tsx's own comment on this
// exact fix for the full reasoning).
//
// This test only proves the SSR half stays correct (no popover markup, no throw) — the
// hydration-mismatch half of the bug can't be reproduced in a single jsdom process the way
// MaskedInput.ssr.test.tsx's teardown crash could; that half was verified live in a real
// browser (see the fix's commit message).
import { describe, it, expect } from 'vitest';
import { renderToStringAsync } from 'solid-js/web';
import { createComponent } from 'solid-js';
import { InputDate } from '@core/components/control/InputDate';

describe('InputDate SSR', () => {
    it('server-renders the text input without throwing, and without any Floating/Datepicker markup (mounted() stays false during SSR)', async () => {
        const html = await renderToStringAsync(() =>
            createComponent(InputDate, { mode: 'date', value: null, onChange: () => {} }),
        );
        expect(html).toContain('<input');
        // The Datepicker's own signature wrapper class ("w-72") must NOT appear — proves the
        // <Floating> branch (and everything inside it) rendered nothing server-side, matching
        // the client's pre-hydration state.
        expect(html).not.toContain('w-72');
    });
});
