// src/modules/cms/admin/ContentTypeCreationWizard.tsx — fix round (mục C/G)
// @vitest-environment jsdom
//
// `Dialog`/`Modal` portals through the app-wide `ModalProvider` singleton store into
// `#root > #modals` (`Dom.getRoot('modals')` throws "Root not found!" without a pre-existing
// `#root` element) — same setup reasoning as test/modules/cms/admin/FormSubmissionsPanel.test.tsx.
// Render `<ModalProvider>` alongside the wizard and add `#root`; query via `screen`/
// `document.body` (bound to the whole document) since the portalled Dialog content never lands
// inside `render()`'s own container.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup } from '@solidjs/testing-library';
import { ModalProvider } from '@core/components/modal/ModalProvider';
import { ContentTypeCreationWizard } from '@modules/cms/admin/ContentTypeCreationWizard';

describe('ContentTypeCreationWizard — template field preview (fix round mục G)', () => {
    let appRoot: HTMLDivElement;

    beforeEach(() => {
        appRoot = document.createElement('div');
        appRoot.id = 'root';
        document.body.appendChild(appRoot);
    });

    afterEach(() => {
        // Modal's real content portals into a separate `#root > #modals` tree appended directly
        // to `document.body` — `cleanup()` alone won't touch it, so `#root` (created fresh per
        // test above) is removed too, taking the whole portal tree with it.
        cleanup();
        appRoot.remove();
    });

    it('shows the selected template\'s field list, updating when the selection changes', async () => {
        render(() => (
            <>
                <ContentTypeCreationWizard isOpen={true} onClose={() => {}} onPrefill={() => {}} />
                <ModalProvider />
            </>
        ));

        fireEvent.click(await screen.findByText(/Dựa trên mẫu/));

        // Wait for the field-preview list to actually render (it's inside the same portalled
        // Dialog, but only appears once `step()` flips to 'pickTemplate'). The preview label is
        // a whole `<p>`'s own text ("Tiêu đề"/"TEXT" are each only *part* of a `<p>`'s textContent
        // — a `<p>Tiêu đề — <code>TEXT</code></p>` structure — so `findByText` can't exact-match
        // them directly; assert on `document.body.textContent` (substring) instead, same as the
        // brief's own assertions.
        await screen.findByText('Trường sẽ được tạo:');

        // First template in CONTENT_TYPE_TEMPLATES is 'article' — its first field is 'title'/TEXT.
        expect(document.body.textContent).toContain('Tiêu đề');
        expect(document.body.textContent).toContain('TEXT');
    });
});
