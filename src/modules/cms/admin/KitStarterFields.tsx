import { createResource, createSignal, Show, onCleanup } from 'solid-js';
import { Select } from '@core/components/control/Select';
import { ArtDirectionKitService, type ArtDirectionKitDTO } from '@/shared/services/artDirectionKit/artDirectionKit.service';
import { setKitSelection, clearKitSelection } from './kitStarter';
import { t } from '@/shared/i18n/t';

/**
 * "Bắt đầu từ bộ kit" (Phase 6, spec §3.6) — the OPTIONAL kit + template step in the Create-page
 * modal. Rendered by `manageCmsPages.page.tsx` in CREATE mode only (choosing a starting
 * composition for a page that already exists is meaningless — the same reasoning
 * `AddTranslationButton` is update-only for).
 *
 * Deliberately NOT `Datatable.Field`-bound: neither `kitId` nor `templateKey` is a `CreatePageInput`
 * field. They select WHICH MUTATION runs, which is a decision about the form, not a value in it —
 * so this component owns its own signals and writes the result into `kitStarter.ts`'s module-scope
 * selection, the one thing `createMutation` (built at module scope) can read.
 *
 * Leaving the kit select empty is the default and keeps today's exact `createPage` flow.
 */
export function KitStarterFields() {
    const [kits] = createResource(() => ArtDirectionKitService.getAllArtDirectionKits());
    const [kitId, setKitId] = createSignal('');
    const [templateKey, setTemplateKey] = createSignal('');

    // The modal can be dismissed without ever submitting — never let a stale choice survive.
    onCleanup(() => clearKitSelection());

    const kitOptions = () => (kits() || []).map((kit: ArtDirectionKitDTO) => ({
        value: kit.id!,
        label: kit.name!,
    }));
    const selectedKit = () => (kits() || []).find((kit: ArtDirectionKitDTO) => kit.id === kitId());
    const templateOptions = () => (selectedKit()?.templates || []).map((tpl) => ({
        value: tpl.templateKey,
        label: `${tpl.label} (${tpl.sectionComponentIds.length})`,
    }));

    /** One writer for the module-scope selection: a choice only counts once BOTH halves are set,
     * so a half-finished pick can never route the submit to `createPageFromKit` with an unknown
     * templateKey (which the BE would reject with a BadRequestException). */
    const syncSelection = (nextKitId: string, nextTemplateKey: string) => {
        if (nextKitId && nextTemplateKey) setKitSelection({ kitId: nextKitId, templateKey: nextTemplateKey });
        else clearKitSelection();
    };

    const handleKitChange = (value: unknown) => {
        const next = String(value ?? '');
        setKitId(next);
        // A template only exists inside one kit — changing kit always invalidates the template.
        setTemplateKey('');
        syncSelection(next, '');
    };

    const handleTemplateChange = (value: unknown) => {
        const next = String(value ?? '');
        setTemplateKey(next);
        syncSelection(kitId(), next);
    };

    return (
        <div class="col-span-full border-t border-gray-100 pt-5" data-testid="kit-starter">
            <label class="mb-1 block text-sm font-semibold text-gray-700">
                {t('cms.pages.kitStarter.sectionLabel')}
            </label>
            <p class="mb-3 text-xs text-neutral-500">{t('cms.pages.kitStarter.sectionHint')}</p>
            <div class="grid grid-cols-12 gap-x-6 gap-y-3">
                <div class="col-span-6" data-testid="kit-starter-kit">
                    <label class="mb-1 block text-xs font-medium text-gray-600">
                        {t('cms.pages.kitStarter.kitLabel')}
                    </label>
                    <Select
                        native
                        fieldless
                        clearable
                        placeholder={t('cms.pages.kitStarter.kitPlaceholder')}
                        options={kitOptions()}
                        value={kitId()}
                        onChange={handleKitChange}
                    />
                </div>
                <div class="col-span-6">
                    <Show when={kitId()}>
                        <div data-testid="kit-starter-template">
                            <label class="mb-1 block text-xs font-medium text-gray-600">
                                {t('cms.pages.kitStarter.templateLabel')}
                            </label>
                            <Select
                                native
                                fieldless
                                clearable
                                placeholder={t('cms.pages.kitStarter.templatePlaceholder')}
                                options={templateOptions()}
                                value={templateKey()}
                                onChange={handleTemplateChange}
                            />
                        </div>
                    </Show>
                </div>
                <Show when={kitId()}>
                    <p class="col-span-12 text-xs text-amber-700" data-testid="kit-starter-override-hint">
                        {t('cms.pages.kitStarter.overrideHint')}
                    </p>
                </Show>
            </div>
        </div>
    );
}
