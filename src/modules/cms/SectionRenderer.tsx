import { ErrorBoundary, For, Show } from 'solid-js';
import { sectionRegistry } from './sectionRegistry';
import type { ContentEntryDTO, FieldDefinitionDTO, ResolvedSection } from '@/modules/cms/cms.types';

export interface SectionRendererProps {
    sections: ResolvedSection[];
    pageEntry?: ContentEntryDTO;
    contentTypeFields?: FieldDefinitionDTO[];
    /** Page Builder mode only: id of the block currently selected in the Inspector. */
    selectedSectionId?: string;
    /** Page Builder mode only: called when a block is clicked on the canvas. When set,
     * clicks inside the section (links/buttons) are intercepted so the canvas never
     * navigates away — the click always just selects the block instead. */
    onSelectSection?: (id: string) => void;
}

/** Mount 1 lần cho toàn trang (client:visible) — loop sections theo registry,
 * mỗi section bọc ErrorBoundary riêng: 1 section lỗi không sập cả trang (mục 24). */
export function SectionRenderer(props: SectionRendererProps) {
    return (
        <For each={props.sections}>
            {(section) => {
                const type = section.type ?? '';
                const Comp = sectionRegistry[type];
                const body = (
                    <Show when={Comp} fallback={<UnknownSectionWarning type={type} />}>
                        <ErrorBoundary fallback={(err) => <SectionErrorFallback error={err} type={type} />}>
                            {Comp!({ section, pageEntry: props.pageEntry, contentTypeFields: props.contentTypeFields })}
                        </ErrorBoundary>
                    </Show>
                );
                if (!props.onSelectSection || !section.id) return body;
                const selected = () => props.selectedSectionId === section.id;
                return (
                    <div
                        data-section-id={section.id}
                        class={`relative cursor-pointer outline-2 -outline-offset-2 transition ${selected() ? 'outline-primary-500' : 'outline-transparent hover:outline-primary-200'}`}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            props.onSelectSection!(section.id!);
                        }}
                    >
                        {body}
                    </div>
                );
            }}
        </For>
    );
}

function UnknownSectionWarning(props: { type: string }) {
    console.error(`[CMS] Section type không tồn tại trong registry: "${props.type}"`);
    if (import.meta.env.DEV) {
        return <div class="mx-auto max-w-4xl px-6 py-4 text-sm text-amber-600 border border-amber-200 bg-amber-50 rounded-lg my-2">
            ⚠ Section type "{props.type}" chưa được đăng ký trong sectionRegistry (chỉ hiện ở dev/preview).
        </div>;
    }
    return null;
}

function SectionErrorFallback(props: { error: unknown; type: string }) {
    console.error(`[CMS] Lỗi khi render section "${props.type}":`, props.error);
    if (import.meta.env.DEV) {
        const message = props.error instanceof Error ? props.error.message : String(props.error);
        return <div class="mx-auto max-w-4xl px-6 py-4 text-sm text-red-600 border border-red-200 bg-red-50 rounded-lg my-2">
            ⚠ Lỗi render section "{props.type}": {message}
        </div>;
    }
    return null;
}
