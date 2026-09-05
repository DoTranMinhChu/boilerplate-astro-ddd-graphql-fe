// ddd-graphql-fe/src/modules/cms/admin/GridGalleryViewLayout.tsx
import { For, Show, type JSX } from 'solid-js';
import { Empty } from '@core/components/utilities/Empty';

export interface GridGalleryViewLayoutProps<T> {
    items: T[] | undefined;
    loading: boolean;
    renderCard: (item: T) => JSX.Element;
    /** 'grid' = lưới đều, nhiều cột nhỏ. 'gallery' = ít cột hơn, ảnh to hơn/nhấn mạnh hơn
     * (mục C design). Chỉ khác breakpoint/cột số, cùng 1 component. */
    variant: 'grid' | 'gallery';
}

export function GridGalleryViewLayout<T>(props: GridGalleryViewLayoutProps<T>) {
    const gridClass = () =>
        props.variant === 'gallery'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3';

    return (
        <Show
            when={!props.loading}
            fallback={
                <div class={gridClass()}>
                    <For each={Array(8).fill(null)}>{() => <div class="aspect-square rounded-xl bg-neutral-100 animate-pulse" />}</For>
                </div>
            }
        >
            <Show when={props.items?.length} fallback={<Empty />}>
                <div class={gridClass()}>
                    <For each={props.items}>{(item) => props.renderCard(item)}</For>
                </div>
            </Show>
        </Show>
    );
}
