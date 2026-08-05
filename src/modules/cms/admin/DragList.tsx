import { For, type JSX } from 'solid-js';
import {
    DragDropProvider,
    DragDropSensors,
    SortableProvider,
    createSortable,
    closestCenter,
    type DragEvent,
    type Id,
} from '@thisbeyond/solid-dnd';
import { Icon } from '@shared/components/icons/Icon';

// Same rationale as BlockList.tsx — solid-dnd ships no JSX.Directives entry for
// bare `use:sortable`.
declare module 'solid-js' {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace JSX {
        interface Directives {
            sortable: boolean;
        }
    }
}

/** Assigns a permanent drag id to an object REFERENCE the first time it's seen —
 * reordering an array never changes its items' references (only their position),
 * so this id survives drags. It only breaks (correctly) when an item is genuinely
 * replaced, e.g. by an edit that spreads into a new object. Solid's `<For>` reuses
 * a row's component instance for as long as the object reference is unchanged, so
 * `createSortable(stableKey(item))` below is called once per logical row and stays
 * valid — the same property `BlockList` gets for free from real DB ids. */
const keyRegistry = new WeakMap<object, number>();
let keyCounter = 0;
export function stableKey(item: object): number {
    let key = keyRegistry.get(item);
    if (key === undefined) {
        key = ++keyCounter;
        keyRegistry.set(item, key);
    }
    return key;
}

export interface DragListProps<T extends object> {
    items: T[];
    onReorder: (nextItems: T[]) => void;
    children: (item: T, index: () => number, dragHandle: JSX.HTMLAttributes<HTMLSpanElement>) => JSX.Element;
    class?: string;
}

/** Generic drag-to-reorder list for arrays of OBJECTS (see `stableKey` above for
 * why it needs objects, not primitives) — the same `@thisbeyond/solid-dnd` wiring
 * as the Page Builder's block list, extracted so every repeatable admin list
 * (timeline entries, FAQ items, metrics, showcase projects...) gets the same
 * reordering UX for free. */
export function DragList<T extends object>(props: DragListProps<T>) {
    const ids = (): Id[] => props.items.map(stableKey);

    const onDragEnd = ({ draggable, droppable }: DragEvent) => {
        if (!draggable || !droppable) return;
        const currentIds = ids();
        const from = currentIds.indexOf(draggable.id as number);
        const to = currentIds.indexOf(droppable.id as number);
        if (from === -1 || to === -1 || from === to) return;
        const next = [...props.items];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        props.onReorder(next);
    };

    return (
        <div class={props.class}>
            <DragDropProvider onDragEnd={onDragEnd} collisionDetector={closestCenter}>
                <DragDropSensors>
                    <SortableProvider ids={ids()}>
                        <For each={props.items}>
                            {(item, index) => {
                                const sortable = createSortable(stableKey(item));
                                return (
                                    <div use:sortable classList={{ 'opacity-40': sortable.isActiveDraggable }}>
                                        {props.children(item, index, sortable.dragActivators as JSX.HTMLAttributes<HTMLSpanElement>)}
                                    </div>
                                );
                            }}
                        </For>
                    </SortableProvider>
                </DragDropSensors>
            </DragDropProvider>
        </div>
    );
}

/** Standard grab handle for use inside `DragList` rows. */
export function DragHandle(props: JSX.HTMLAttributes<HTMLSpanElement>) {
    return (
        <span class="mt-1.5 cursor-grab self-start text-neutral-300 hover:text-neutral-500" {...props}>
            <Icon name="heroicons-solid:bars-3" />
        </span>
    );
}
