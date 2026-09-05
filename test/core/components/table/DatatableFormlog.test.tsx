// test/core/components/table/DatatableFormlog.test.tsx
// @vitest-environment jsdom
//
// Regression coverage for the 1st of the 3 non-reactive spots found in the Drawer-reactivity
// bug (Task 19's follow-up review; see Formlog.test.tsx for the other 2, inside Formlog.tsx
// itself). `getModalSettings()` reads `props.viewMode`, and `const settings =
// getModalSettings();` used to compute this ONCE, outside any reactive scope, at component
// setup — never re-read when `props.viewMode` (bound to a live signal by real callers, e.g.
// manageContentEntries.page.tsx's `formlogMode()`) changes AFTER mount. Fixed by wrapping it
// in `createMemo()` and reading it as `settings()` everywhere it's used.
//
// THE POINT OF THIS TEST (same standard as Formlog.test.tsx): a test that only renders once
// would pass identically whether or not the fix is present. This one mounts
// `<DatatableFormlog viewMode={viewMode()} .../>` bound to a real Solid signal, asserts the
// initial rendered chrome, then flips the SIGNAL (not a fresh render) and asserts the chrome
// downstream in `<Formlog>` actually followed. Manually verified red against the pre-fix
// `const settings = getModalSettings();` shape (reverted locally and re-run during
// development, not committed) — the "after viewMode -> drawer" assertion below failed
// exactly as expected, then passed again once restored.
//
// Reuses the DatatableContext-stub pattern already established by
// GeneratedDatatable.test.tsx (`buildContext`) — trimmed to just the fields DatatableFormlog
// itself reads (`id`, `service`, `isFormlogOpen`, `setIsFormlogOpen`, `formlogItem`,
// `setFormlogItem`, `isFormlogReadOnly`, `setIsFormlogReadOnly`, `refresh`); the rest of
// `DatatableContextValue` is cast in via `as any` the same way that file already does for a
// couple of its own unused setters, since `useDatatable()`'s consumer here never touches them.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { DatatableContext, DatatableContextValue } from '@core/components/table/DatatableContext';
import { BaseService } from '@core/services/base.service';

if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
        matches: false, media: query, onchange: null,
        addListener: () => {}, removeListener: () => {},
        addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
}

class FakeService extends BaseService {
    static displayName = 'Test Item';
}

let DatatableFormlog: typeof import('@core/components/table/DatatableFormlog')['DatatableFormlog'];

beforeAll(async () => {
    ({ DatatableFormlog } = await import('@core/components/table/DatatableFormlog'));
}, 30000);

afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
});

function buildContext(): DatatableContextValue {
    const [isFormlogOpen] = createSignal<boolean | MouseEvent | undefined>(true);
    const [formlogItem] = createSignal<any>(null);
    const [isFormlogReadOnly, setIsFormlogReadOnly] = createSignal<boolean>(false);

    return {
        id: 'test-datatable',
        service: FakeService,
        isFormlogOpen,
        setIsFormlogOpen: () => {},
        formlogItem,
        setFormlogItem: () => {},
        isFormlogReadOnly,
        setIsFormlogReadOnly,
        refresh: async () => {},
    } as unknown as DatatableContextValue;
}

/** Same DOM signal Formlog.test.tsx uses: only `Slideout.Footer` stacks `border-t` onto
 * `DialogFooter`'s own root div (`.rounded-b-inherit`) — see that file's header comment for
 * the full explanation of why this is a safe, ModalProvider-independent signal. */
function footerEl() {
    return document.querySelector('.rounded-b-inherit');
}
function isSlideoutShaped() {
    return !!footerEl()?.classList.contains('border-t');
}

describe('DatatableFormlog — viewMode prop is genuinely reactive after mount (Drawer-reactivity fix)', () => {
    it('switches footer chrome between modal(dialog)-shaped and drawer(slideout)-shaped as viewMode changes AFTER mount', async () => {
        const [viewMode, setViewMode] = createSignal<'modal' | 'drawer'>('modal');
        const ctx = buildContext();

        render(() => (
            <DatatableContext.Provider value={ctx}>
                <DatatableFormlog viewMode={viewMode()}>
                    {() => <div>body</div>}
                </DatatableFormlog>
            </DatatableContext.Provider>
        ));

        await waitFor(() => expect(footerEl()).toBeTruthy());
        expect(isSlideoutShaped(), 'initial render (viewMode="modal") should be dialog-shaped, not slideout-shaped').toBe(false);

        // The actual regression scenario: `viewMode` changes on an already-mounted
        // DatatableFormlog, exactly like manageContentEntries.page.tsx's `formlogMode()`
        // signal flipping after the user picks "Chỉnh sửa dạng Drawer".
        setViewMode('drawer');
        await waitFor(() => expect(isSlideoutShaped(), 'after viewMode -> "drawer", footer should become slideout-shaped').toBe(true));

        setViewMode('modal');
        await waitFor(() => expect(isSlideoutShaped(), 'after viewMode -> "modal", footer should become dialog-shaped again').toBe(false));
    });
});
