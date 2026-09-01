// @vitest-environment jsdom
//
// `Dialog`/`Modal` portal through the app-wide `ModalProvider` (a module-level singleton store
// in `ModalProvider.tsx`), which itself portals into `Dom.getRoot('modals')` (core/helpers/dom.ts)
// — that helper throws "Root not found!" unless a `#root`/`#app` element already exists. Neither
// `ModalProvider` nor that root element is present in an isolated `@solidjs/testing-library`
// render by default (normally supplied once by the app shell, e.g. `App.tsx`), so this test
// renders `<ModalProvider>` alongside `PreviewDrawer` and adds the `#root` element — mirroring
// real app composition — so the actual `Dialog`/`Modal` open/close flow is exercised for real
// instead of only asserting on the trigger button in isolation.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup } from '@solidjs/testing-library';
import { ModalProvider } from '@core/components/modal/ModalProvider';
import { PreviewDrawer } from './PreviewDrawer';

describe('PreviewDrawer', () => {
    let appRoot: HTMLDivElement;

    beforeEach(() => {
        appRoot = document.createElement('div');
        appRoot.id = 'root';
        document.body.appendChild(appRoot);
    });

    afterEach(() => {
        // `render()`'s own container isn't the only thing left behind — `Modal`'s content portals
        // into `#root > #modals`, a sibling tree `cleanup()` alone won't touch, so `#root` itself
        // (created fresh per test above) is removed too, taking that whole portal tree with it.
        cleanup();
        appRoot.remove();
    });

    // `Modal`'s real content portals OUT of `render()`'s own container div, into a separate
    // `#root > #modals` tree appended directly to `document.body` — so this test must query via
    // `screen` (bound to the whole `document.body`), not the destructured `getByText`/`findByText`
    // from `render()` (scoped only to its own container, which the portal never touches).

    it('does not render children before the trigger is clicked', () => {
        render(() => (
            <>
                <PreviewDrawer title="Chi tiết preview" triggerLabel="Mở xem trước">
                    <p>preview content</p>
                </PreviewDrawer>
                <ModalProvider />
            </>
        ));
        expect(screen.queryByText('preview content')).toBeFalsy();
    });

    it('renders children after clicking the trigger', async () => {
        render(() => (
            <>
                <PreviewDrawer title="Chi tiết preview" triggerLabel="Mở xem trước">
                    <p>preview content</p>
                </PreviewDrawer>
                <ModalProvider />
            </>
        ));
        fireEvent.click(screen.getByText('Mở xem trước'));
        expect(await screen.findByText('preview content')).toBeTruthy();
    });
});
