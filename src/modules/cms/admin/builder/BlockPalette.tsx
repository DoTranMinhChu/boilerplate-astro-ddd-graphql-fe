import { For, Show } from 'solid-js';
import { Icon } from '@shared/components/icons/Icon';
import { t, tOrLiteral } from '@/shared/i18n/t';
import { SECTION_TYPE_META } from '@/modules/cms/sectionRegistry';

export interface BlockPaletteProps {
    open: boolean;
    onClose: () => void;
    onPick: (type: string) => void;
}

/** Modal grid of registered section types — "no-code" add-block entry point,
 * the admin only ever sees a picture + a plain-language name, never a type id. */
export function BlockPalette(props: BlockPaletteProps) {
    return (
        <Show when={props.open}>
            <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4" onClick={props.onClose}>
                <div class="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                    <p class="mb-4 text-sm font-semibold text-neutral-700">{t('cms.builder.paletteTitle')}</p>
                    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <For each={Object.entries(SECTION_TYPE_META)}>
                            {([type, meta]) => (
                                <button
                                    type="button"
                                    onClick={() => props.onPick(type)}
                                    class="flex flex-col items-center gap-2 rounded-xl border border-neutral-200 p-4 text-center transition hover:border-primary-400 hover:bg-primary-50"
                                >
                                    <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600">
                                        <Icon name={meta.icon} size="lg" />
                                    </span>
                                    <span class="text-xs font-medium text-neutral-700">{tOrLiteral(meta.labelKey)}</span>
                                </button>
                            )}
                        </For>
                    </div>
                </div>
            </div>
        </Show>
    );
}
