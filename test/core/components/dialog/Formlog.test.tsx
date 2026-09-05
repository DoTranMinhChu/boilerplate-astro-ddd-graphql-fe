// test/core/components/dialog/Formlog.test.tsx
// @vitest-environment jsdom
//
// Regression coverage for the "Drawer edit mode never actually renders as a slide-out" bug
// (Task 19's final verification pass, follow-up review). That review found 3 SEPARATE
// non-reactive spots, all of which had to be fixed TOGETHER or Drawer mode would still
// visually fail:
//   1. DatatableFormlog.tsx's `settings = getModalSettings()` — a plain, once-computed object
//      (fixed by wrapping it in `createMemo()`; not exercised directly here, see that file's
//      own fix comment — it returns plain data, not a component reference, so it carries none
//      of the compound-component hazard the other two spots do).
//   2 & 3. THIS file's two spots, inside Formlog.tsx: `const modalType = props.modalType ||
//      'dialog'` and (in the separate FormlogFooter function) `const Modal = props.modalType
//      == 'dialog' ? Dialog : Slideout` — both computed ONCE at component setup, never
//      re-read when `props.modalType` changes later (real callers bind it to a LIVE signal,
//      e.g. manageContentEntries.page.tsx's `formlogMode()`, via
//      DatatableFormlog -> Formlog).
//
// THE POINT OF THIS TEST: a test that only renders once and checks the result would pass
// identically whether or not the reactivity fix is present — both the ORIGINAL buggy code
// and the fixed code render the CORRECT branch on a component's own first mount (the bug is
// specifically that a prop change AFTER that first mount was ignored). So this test:
//   1. mounts `<Formlog modalType={modalType()} .../>` bound to a REAL Solid signal (the
//      same shape a real caller's binding takes — not a hardcoded string prop);
//   2. asserts the initial DOM chrome for one branch;
//   3. changes the SIGNAL (not a fresh render() call) to flip `modalType` — the same "prop
//      changes after mount" scenario the bug was actually about;
//   4. asserts the DOM chrome ACTUALLY SWITCHED to the other branch's shape.
//
// The revert check below actually failed against the pre-fix code (manually verified by
// reverting Formlog.tsx's `renderChrome`/`<Show>` back to the original
// `const modalType = props.modalType || 'dialog'; const Modal = modalType == 'dialog' ?
// Dialog : Slideout;` shape and re-running this file: both "after mount" assertions failed —
// the footer chrome stayed frozen to whatever `modalType` was on first render, exactly the
// reported bug), confirming this test is red against the bug and green against the fix.
//
// DOM signal used to tell Dialog-shaped chrome from Slideout-shaped chrome: `Slideout.Footer`
// (`SlideoutFooter` in Slideout.tsx) wraps plain `Dialog.Footer` (`DialogFooter`) with one
// extra class it always adds: `border-t border-neutral-100 mb-0` (non-mobile) — verified
// (see `test/_probe_spread.test.tsx`-style probe run during development, not committed) that
// an unset `class` prop passed through `{...props}` here does NOT clobber that literal
// default (Solid's `mergeProps`/prop-spread getter skips `undefined` values and falls
// through to the earlier literal — confirmed empirically, not just reasoned about).
// `Dialog.Header`/`.Body` vs `Slideout.Header`/`.Body` are otherwise byte-identical
// pass-through wrappers (Slideout.tsx), so the footer's `border-t` class is the one real,
// ModalProvider-independent DOM signal available. (Modal's own position/size chrome is only
// ever applied by the SEPARATE `<ModalProvider>` overlay component, which this test
// deliberately does not mount — same reason Confirm.test.tsx doesn't either: solid-js/web's
// own `Portal`'s `mount` prop falls back to `document.body` when
// `document.getElementById('MainModalContentWrapper')` doesn't exist, so everything still
// renders into `document.body` and is queryable there.)
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';

// Same matchMedia polyfill + beforeAll-dynamic-import shape as the other jsdom component
// tests in this repo (see Confirm.test.tsx / ChartNode.test.tsx header comments): the import
// chain here reaches Modal/createScreen, which touch matchMedia at module scope.
if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
        matches: false, media: query, onchange: null,
        addListener: () => {}, removeListener: () => {},
        addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
}

let Formlog: typeof import('@core/components/dialog/Formlog')['Formlog'];

beforeAll(async () => {
    ({ Formlog } = await import('@core/components/dialog/Formlog'));
}, 30000);

// The dialog/slideout mounts into a portal outside testing-library's `container` (falls back
// to document.body — see header comment), and `cleanup()` alone leaves that portal node
// behind — without this, a previous case's footer would still be in the document and a
// `querySelector` assertion could pass vacuously against stale markup.
afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
});

/** `DialogFooter`'s own root div always carries this exact class token (Dialog.tsx's
 * `footerClass()`); `SlideoutFooter` (Slideout.tsx) is the only wrapper that additionally
 * stacks `border-t` onto that SAME div. */
function footerEl() {
    return document.querySelector('.rounded-b-inherit');
}
function isSlideoutShaped() {
    return !!footerEl()?.classList.contains('border-t');
}

describe('Formlog — modalType prop is genuinely reactive after mount (Drawer-reactivity fix)', () => {
    // Deliberately ONE test, ONE render() call, ONE Formlog `id`, doing a full
    // dialog -> slideout -> dialog round trip in sequence — NOT split into separate `it`
    // blocks. `Modal.tsx`'s open/close bookkeeping lives in a module-level store shared by
    // every mounted Modal in this file (`mainModals`/`modalState` in ModalProvider.tsx), and
    // it transitions through real 300ms `setTimeout`s (`MODAL_DURATION`) that this test does
    // not fast-forward. A second, INDEPENDENT `render()` started before that first modal's
    // open transition finishes gets silently reclassified as a sub-modal by `openModal()`'s
    // own `isSubModal`/`isModalInteractionBlocked()` logic (confirmed empirically — an
    // earlier draft of this file with 2 separate `it`s intermittently failed this way, a
    // false negative caused by test cross-talk, not a real product bug). Keeping everything
    // in one continuous render sidesteps that entirely and is also simply a MORE FAITHFUL
    // reproduction of the real bug scenario: one already-open Formlog instance whose
    // `modalType` prop changes under it, not a fresh mount each time.
    it('switches footer chrome between Dialog-shaped and Slideout-shaped as modalType changes AFTER mount, round trip', async () => {
        const [modalType, setModalType] = createSignal<'dialog' | 'slideout'>('dialog');

        render(() => (
            <Formlog
                id="testFormlogRoundTrip"
                isOpen
                onClose={() => {}}
                title="Test form"
                modalType={modalType()}
            >
                <div>body content</div>
            </Formlog>
        ));

        await waitFor(() => expect(footerEl()).toBeTruthy());
        expect(isSlideoutShaped(), 'initial render (dialog) should NOT be slideout-shaped').toBe(false);

        // The actual regression scenario: the PROP changes on an already-mounted component,
        // exactly like manageContentEntries.page.tsx's `formlogMode()` signal flipping after
        // the user picks "Chỉnh sửa dạng Drawer" from an already-open create/edit picker.
        setModalType('slideout');
        await waitFor(() => expect(isSlideoutShaped(), 'after modalType -> slideout, footer should become slideout-shaped').toBe(true));

        // ...and back, proving it isn't a one-way/lucky coincidence of mount order.
        setModalType('dialog');
        await waitFor(() => expect(isSlideoutShaped(), 'after modalType -> dialog, footer should become dialog-shaped again').toBe(false));
    });
});
