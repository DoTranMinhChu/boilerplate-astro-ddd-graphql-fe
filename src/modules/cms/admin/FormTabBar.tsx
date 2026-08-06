import { For } from 'solid-js';

export interface FormTabBarProps {
    tabs: { key: string; label: string }[];
    active: string;
    onChange: (key: string) => void;
}

/**
 * Thanh chuyển tab dùng chung cho các form Formlog cần tách Nội dung / SEO ra
 * riêng (Content Entries, Pages...) — CHỈ ẩn/hiện bằng CSS (không dùng `<Show>`),
 * vì `<Show>` sẽ unmount Datatable.Field của tab đang ẩn khỏi form context, khiến
 * giá trị của tab đó bị THIẾU khi submit (form chỉ gom field đang "registered").
 * Cùng ngôn ngữ hình ảnh với tab của Page Builder Inspector.
 */
export function FormTabBar(props: FormTabBarProps) {
    return (
        <div class="col-span-full -mt-2 mb-1 flex gap-1 rounded-lg bg-neutral-100 p-1">
            <For each={props.tabs}>
                {(tab) => (
                    <button
                        type="button"
                        onClick={() => props.onChange(tab.key)}
                        class={`flex-1 rounded-md py-1.5 text-sm font-medium transition ${
                            props.active === tab.key ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'
                        }`}
                    >
                        {tab.label}
                    </button>
                )}
            </For>
        </div>
    );
}
