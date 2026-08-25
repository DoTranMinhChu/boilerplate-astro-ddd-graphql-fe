// src/core/components/dialog/Confirm.test.tsx
// @vitest-environment jsdom
//
// Final-review fix: `ConfirmDialog` used to default a "strong" (caution/danger/question)
// dialog's SUBMIT BUTTON label to its own `title`, so any strong call site that didn't pass
// an explicit `submitLabel` rendered its full confirmation SENTENCE inside the button. These
// tests pin the fixed default in both directions.
//
// Same matchMedia polyfill + beforeAll-dynamic-import shape as the other jsdom component
// tests in this repo (see ChartNode.test.tsx / NodePalette.test.tsx header comments): the
// import chain here reaches Modal/createScreen, which touch matchMedia at module scope.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup } from '@solidjs/testing-library';

if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
        matches: false, media: query, onchange: null,
        addListener: () => {}, removeListener: () => {},
        addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
}

let ConfirmDialog: typeof import('./Confirm')['ConfirmDialog'];
let baseConfig: typeof import('@core/components/config/BaseConfig')['baseConfig'];

beforeAll(async () => {
    ({ ConfirmDialog } = await import('./Confirm'));
    ({ baseConfig } = await import('@core/components/config/BaseConfig'));
}, 30000);

const LONG_TITLE = 'Xoá phần tử này (và toàn bộ phần tử con)? Bạn có thể hoàn tác bằng Ctrl+Z.';

// The Modal mounts into a portal outside testing-library's `container`, and `cleanup()`
// alone leaves that portal node behind — without this, a previous case's buttons would
// still be in the document and a `toContain(...)` assertion could pass vacuously.
afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
});

/** The dialog renders into a portal/overlay outside `container`, so read the whole document. */
function buttonTexts() {
    return [...document.querySelectorAll('button')].map((b) => (b.textContent ?? '').trim());
}

describe('ConfirmDialog submit label', () => {
    it('honors an explicit submitLabel on a strong (danger) dialog', () => {
        render(() => (
            <ConfirmDialog type="danger" isOpen title={LONG_TITLE} submitLabel="Tách rời" onSubmit={() => {}} onClose={() => {}} />
        ));
        expect(buttonTexts()).toContain('Tách rời');
        expect(buttonTexts()).not.toContain(LONG_TITLE);
    });

    it('honors an explicit submitLabel on a non-strong (info) dialog', () => {
        render(() => (
            <ConfirmDialog type="info" isOpen title="Thông báo" submitLabel="Đã hiểu" onSubmit={() => {}} onClose={() => {}} />
        ));
        expect(buttonTexts()).toContain('Đã hiểu');
    });

    it('does NOT fall back to the title for a strong dialog with no submitLabel', () => {
        render(() => <ConfirmDialog type="danger" isOpen title={LONG_TITLE} onSubmit={() => {}} onClose={() => {}} />);
        const texts = buttonTexts();
        expect(texts).not.toContain(LONG_TITLE);
        expect(texts).toContain(baseConfig().confirmSubmitLabel);
    });

    it('uses the generic confirm label for every strong type, not just danger', () => {
        for (const type of ['caution', 'question'] as const) {
            const { unmount } = render(() => <ConfirmDialog type={type} isOpen title={LONG_TITLE} onSubmit={() => {}} onClose={() => {}} />);
            const texts = buttonTexts();
            expect(texts, type).not.toContain(LONG_TITLE);
            expect(texts, type).toContain(baseConfig().confirmSubmitLabel);
            unmount();
            document.body.innerHTML = '';
        }
    });

    it('still uses the generic confirm label for a non-strong dialog with no submitLabel', () => {
        render(() => <ConfirmDialog type="info" isOpen title="Thông báo" onSubmit={() => {}} onClose={() => {}} />);
        expect(buttonTexts()).toContain(baseConfig().confirmSubmitLabel);
    });
});
