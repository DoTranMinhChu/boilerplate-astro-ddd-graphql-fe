// @core/components/table/MobileCardList.tsx
// Component noi bo — dung boi GeneratedDatatable khi isMobile() = true
// va developer KHONG khai bao <Datatable.CardView>.

import { For, Show, JSX } from "solid-js";
import { mergeClass } from "@core/helpers/class";

export interface MobileCardColumn {
  title?: string | JSX.Element;
  renderFn: (item: any, index: () => number) => JSX.Element;
  isAction?: boolean;
  hideOnCard?: boolean;
}

export interface MobileCardListProps {
  items: any[] | undefined;
  columns: MobileCardColumn[];
  loading?: boolean;
  class?: string;
}

export function MobileCardList(props: MobileCardListProps) {
  const dataColumns = () => props.columns.filter((c) => !c.isAction && !c.hideOnCard);
  const actionColumn = () => props.columns.find((c) => c.isAction);

  return (
    <div class={mergeClass("flex flex-col gap-3", props.class)}>
      <Show
        when={!props.loading}
        fallback={
          <For each={Array(3).fill(null)}>
            {() => (
              <div class="rounded-xl border border-neutral-200 bg-white p-4 animate-pulse space-y-3">
                <div class="h-4 bg-neutral-100 rounded w-2/3" />
                <div class="h-3 bg-neutral-100 rounded w-1/2" />
              </div>
            )}
          </For>
        }
      >
        <For each={props.items ?? []}>
          {(item, index) => (
            <div class="rounded-xl border border-neutral-200 bg-white shadow-xs divide-y divide-neutral-100 overflow-hidden">
              {/* Data rows */}
              <div class="p-4 grid grid-cols-2 gap-x-4 gap-y-3">
                <For each={dataColumns()}>
                  {(col, colIndex) => (
                    <div
                      class="flex flex-col gap-0.5"
                      classList={{
                        "col-span-2":
                          dataColumns().length === 1 ||
                          (dataColumns().length % 2 !== 0 &&
                            colIndex() === dataColumns().length - 1),
                      }}
                    >
                      <Show when={col.title}>
                        <span class="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                          {col.title as any}
                        </span>
                      </Show>
                      <div class="text-sm text-neutral-800 wrap-break-word">
                        {col.renderFn(item, index)}
                      </div>
                    </div>
                  )}
                </For>
              </div>

              {/* Action row */}
              <Show when={actionColumn()}>
                <div class="px-4 py-2.5 bg-neutral-50 flex justify-end gap-1">
                  {actionColumn()!.renderFn(item, index)}
                </div>
              </Show>
            </div>
          )}
        </For>

        <Show when={(props.items ?? []).length === 0 && !props.loading}>
          <div class="py-12 text-center text-sm text-neutral-400">
            Khong co du lieu
          </div>
        </Show>
      </Show>
    </div>
  );
}