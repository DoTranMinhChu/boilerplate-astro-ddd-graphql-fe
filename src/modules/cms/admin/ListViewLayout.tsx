// ddd-graphql-fe/src/modules/cms/admin/ListViewLayout.tsx
import { For, Show, type JSX } from 'solid-js';
import { Empty } from '@core/components/utilities/Empty';

export interface ListViewLayoutProps<T> {
    items: T[] | undefined;
    loading: boolean;
    renderRow: (item: T) => JSX.Element;
}

/** Chế độ "Danh sách" (mục C design) — compact hơn Card, nhiều thông tin/dòng hơn Table gọn.
 * Layout-only: caller cung cấp `renderRow` theo đúng shape field của chính trang đó (Content
 * Entry đọc item.data[key], Content Type đọc field cố định) — xem "Design note" trước Task 7. */
export function ListViewLayout<T>(props: ListViewLayoutProps<T>) {
    return (
        <Show
            when={!props.loading}
            fallback={
                <div class="space-y-2">
                    <For each={Array(4).fill(null)}>
                        {() => <div class="h-14 rounded-lg bg-neutral-100 animate-pulse" />}
                    </For>
                </div>
            }
        >
            <Show when={props.items?.length} fallback={<Empty />}>
                <div class="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white overflow-hidden">
                    <For each={props.items}>{(item) => props.renderRow(item)}</For>
                </div>
            </Show>
        </Show>
    );
}
