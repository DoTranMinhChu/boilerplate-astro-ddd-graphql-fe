// src/modules/cms/admin/kitStarter.ts
//
// Section/Pattern Library + Art-Direction Starter Kits (Phase 6, spec §3.6) — the OPTIONAL
// "start from a kit" step in the Create-page flow.
//
// The selection lives in a MODULE-SCOPE signal because `manageCmsPages.page.tsx` builds its
// datatable (and therefore its `createMutation`) at module scope, outside the component — a
// component-local signal is unreachable from there. Keeping the signal, the pure input builder
// and the branch itself here (rather than inline in the page) is also what makes this whole
// decision testable without rendering the Datatable.
import { createSignal } from 'solid-js';
import { PageService, type PageDTO } from '@/shared/services/page/page.service';
import { ArtDirectionKitService } from '@/shared/services/artDirectionKit/artDirectionKit.service';
import type { CreatePageInput, CreatePageFromKitInput } from '@shared/generated/typed-graphql';

export interface KitSelection {
    kitId: string;
    templateKey: string;
}

/** `null` ⇒ the admin declined a kit (the DEFAULT) ⇒ today's exact `createPage` flow. */
const [kitSelection, setKitSelectionInternal] = createSignal<KitSelection | null>(null);

export { kitSelection };

/** Set (or clear, with `null`) the pending kit choice. A selection is only ever "pending" for the
 * lifetime of one open Create modal — `clearKitSelection()` runs on both close and successful
 * create, so a kit chosen once can never leak into the NEXT page an admin creates. */
export function setKitSelection(selection: KitSelection | null): void {
    setKitSelectionInternal(selection);
}

export function clearKitSelection(): void {
    setKitSelectionInternal(null);
}

/**
 * Map the Create-page form values + the kit choice onto `CreatePageFromKitInput` (Task 3).
 * `themeId`/`headerPresetId`/`footerPresetId`/`templateKey` are deliberately NOT forwarded — the
 * mutation resolves all four from the kit, which is the entire point of that path. Exported so the
 * mapping is unit-testable on its own, without a network call.
 */
export function buildCreatePageFromKitInput(selection: KitSelection, data: CreatePageInput): CreatePageFromKitInput {
    return {
        kitId: selection.kitId,
        templateKey: selection.templateKey,
        path: data.path ?? '',
        internalName: data.internalName ?? '',
        ...(data.pageType ? { pageType: data.pageType as string } : {}),
        ...(data.locale ? { locale: data.locale } : {}),
        ...(data.contentTypeId ? { contentTypeId: data.contentTypeId } : {}),
    };
}

/**
 * The ONE function `manageCmsPages.page.tsx`'s `createMutation` delegates to.
 *
 * No kit chosen (the default) ⇒ `PageService.createPage({ data })`, byte-identical to what that
 * `createMutation` did before this task. Kit chosen ⇒ `createPageFromKit`, which creates the same
 * kind of Page and additionally seeds it with the template's ordered Section instances.
 *
 * The selection is cleared only AFTER a successful create: clearing it in a `finally` would
 * silently discard the admin's kit choice when the mutation fails validation while the modal is
 * still open and they are about to fix a duplicate path and resubmit.
 */
export async function createPageWithOptionalKit(data: CreatePageInput): Promise<PageDTO> {
    const selection = kitSelection();
    if (!selection) {
        return PageService.createPage({ data });
    }
    const page = await ArtDirectionKitService.createPageFromKit({
        data: buildCreatePageFromKitInput(selection, data),
    });
    clearKitSelection();
    return page;
}
