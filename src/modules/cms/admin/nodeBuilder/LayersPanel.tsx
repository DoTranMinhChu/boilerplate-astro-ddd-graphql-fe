// src/modules/cms/admin/nodeBuilder/LayersPanel.tsx
//
// Multi-select Layers panel: multi-select + drag reorder/reparent (3-zone before/after/inside)
// + Undo/Redo. Uses row.id directly as solid-dnd's Id — safe because all store mutations here go
// through produce() and mutate existing rows in place, never replace them by reference. Zone
// detection uses a manual onPointerMove/getBoundingClientRect per row, since solid-dnd's own
// collision detector never exposes continuous pointer position to handlers.
import { createMemo, createSignal, For, Show, type Component, type JSX } from 'solid-js';
import type { SetStoreFunction } from 'solid-js/store';
import {
    DragDropProvider,
    DragDropSensors,
    createDraggable,
    createDroppable,
    type Id,
} from '@thisbeyond/solid-dnd';
import { Icon } from '@/shared/components/icons/Icon';
import { t, tOrLiteral } from '@/shared/i18n/t';
import { confirmAction } from '@core/components/dialog/ConfirmProvider';
import { toast } from '@core/components/toast/ToastProvider';
import { nodeCapabilities, NODE_TYPE_META } from '@/modules/cms/node/nodeRegistry';
import { useNodeSelection } from '@/modules/cms/node/selection/NodeSelectionContext';
import { flattenVisibleTree, type FlatRow } from '@/modules/cms/node/commands/flattenTree';
import { createMoveNodeCommand, createMoveNodesCommand, createDeleteNodesCommand } from '@/modules/cms/node/commands/nodeCommands';
import type { CommandManager } from '@/modules/cms/node/commands/CommandManager';
import type { NodeDTO } from '@/modules/cms/node/node.types';

type DropZone = 'before' | 'after' | 'inside';

export interface LayersPanelProps {
    nodes: NodeDTO[];
    getNodes: () => NodeDTO[];
    setNodes: SetStoreFunction<NodeDTO[]>;
    commandManager: CommandManager;
    onAddChild: (parentId: string) => void;
}

const ROW_BUTTON_CLASS = 'rounded-nb-sm p-1 text-nb-text-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-nb-bg-subtle hover:text-nb-text disabled:opacity-30 disabled:hover:bg-transparent transition-opacity';

/** Fixes the brief's deliberately-planted bug: zone math must read the target NODE's
 * `type` (via a real lookup into `nodes`), not misuse `targetRow.id` (a node id, never a
 * type key) as a `nodeCapabilities` index. 1/3 top = before, 1/3 bottom = after, middle
 * third = inside ONLY if the target is a container (FRAME) — everything else's middle
 * third falls back to before/after by the nearer half, since it has no "inside" to offer. */
function computeDropZone(targetEl: HTMLElement, pointerY: number, targetNode: NodeDTO | undefined): DropZone {
    const rect = targetEl.getBoundingClientRect();
    const relativeY = rect.height > 0 ? (pointerY - rect.top) / rect.height : 0.5;
    const targetIsContainer = targetNode ? nodeCapabilities[targetNode.type ?? '']?.layoutChildren === true : false;
    if (relativeY < 1 / 3) return 'before';
    if (relativeY > 2 / 3) return 'after';
    return targetIsContainer ? 'inside' : (relativeY < 0.5 ? 'before' : 'after');
}

interface RowProps {
    row: FlatRow;
    node: NodeDTO | undefined;
    isSelected: boolean;
    isCollapsed: boolean;
    isDragging: boolean;
    dropZone: DropZone | null;
    onToggleCollapse: (id: string) => void;
    onRowClick: (row: FlatRow, e: MouseEvent) => void;
    onAddChild: (parentId: string) => void;
    onDelete: (id: string) => void;
    onPointerMoveRow: (row: FlatRow, e: PointerEvent) => void;
    dragHandleProps: JSX.HTMLAttributes<HTMLSpanElement>;
    rowRef: (el: HTMLElement) => void;
}

function Row(props: RowProps) {
    const meta = () => NODE_TYPE_META[props.node?.type ?? ''];
    const canHaveChildren = () => nodeCapabilities[props.node?.type ?? '']?.layoutChildren === true;

    return (
        <div
            ref={props.rowRef}
            classList={{
                'group relative flex items-center gap-1 py-1.5 pr-2 rounded-nb-sm cursor-pointer select-none border-l-2 transition-colors': true,
                'border-nb-accent bg-nb-accent/5': props.isSelected,
                'border-transparent hover:bg-nb-bg-subtle': !props.isSelected,
                'opacity-40': props.isDragging,
                'ring-2 ring-inset ring-nb-accent bg-nb-accent/10': props.dropZone === 'inside',
            }}
            style={{ 'padding-left': `${8 + props.row.depth * 16}px` }}
            onClick={(e) => props.onRowClick(props.row, e)}
            onPointerMove={(e) => props.onPointerMoveRow(props.row, e)}
        >
            {/* Indentation guides — one thin vertical line per ancestor depth level,
                so nested rows read as a real tree rather than just growing indentation. */}
            <For each={Array.from({ length: props.row.depth })}>
                {(_, i) => (
                    <div class="pointer-events-none absolute inset-y-0 w-px bg-nb-border" style={{ left: `${8 + i() * 16 + 7}px` }} />
                )}
            </For>

            {/* Before/after drop-position indicators — unchanged behavior, restyled color. */}
            <Show when={props.dropZone === 'before'}>
                <div class="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-nb-accent" />
            </Show>
            <Show when={props.dropZone === 'after'}>
                <div class="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-nb-accent" />
            </Show>

            <span
                {...props.dragHandleProps}
                class="cursor-grab text-nb-text-muted opacity-0 group-hover:opacity-100 hover:text-nb-text transition-opacity"
                title={t('cms.node.tree.dragHandleLabel')}
            >
                <Icon name="heroicons-solid:bars-3" class="w-3.5 h-3.5" />
            </span>

            <Show
                when={props.row.hasChildren}
                fallback={<span class="w-4 h-4 shrink-0" />}
            >
                <button
                    type="button"
                    class="rounded-nb-sm p-0.5 text-nb-text-muted hover:bg-nb-bg-subtle hover:text-nb-text"
                    onClick={(e) => { e.stopPropagation(); props.onToggleCollapse(props.row.id); }}
                    title={props.isCollapsed ? t('cms.node.tree.expandButton') : t('cms.node.tree.collapseButton')}
                >
                    <Icon name={props.isCollapsed ? 'heroicons-solid:chevron-right' : 'heroicons-solid:chevron-down'} class="w-4 h-4" />
                </button>
            </Show>

            <Show when={meta()}><Icon name={meta().icon} class="w-4 h-4 shrink-0 text-nb-text-muted" /></Show>
            <span class="flex-1 text-sm truncate text-nb-text">{meta() ? tOrLiteral(meta().labelKey) : props.node?.type}</span>

            <Show when={canHaveChildren()}>
                <button
                    type="button"
                    class={ROW_BUTTON_CLASS}
                    onClick={(e) => { e.stopPropagation(); props.onAddChild(props.row.id); }}
                    title={t('cms.node.tree.addChildButton')}
                >
                    <Icon name="heroicons-solid:plus" class="w-4 h-4" />
                </button>
            </Show>
            <button
                type="button"
                class={ROW_BUTTON_CLASS}
                onClick={(e) => { e.stopPropagation(); props.onDelete(props.row.id); }}
                title={t('cms.node.tree.deleteButton')}
            >
                <Icon name="heroicons-solid:trash" class="w-4 h-4 text-red-500" />
            </button>
        </div>
    );
}

/** Figma-style Layers panel: select/multi-select/drag-reorder/drag-reparent for the
 * current page's Node tree, all Undo/Redo-backed through `props.commandManager`. */
export const LayersPanel: Component<LayersPanelProps> = (props) => {
    const selection = useNodeSelection();
    const [collapsedIds, setCollapsedIds] = createSignal<Set<string>>(new Set());
    const [draggingId, setDraggingId] = createSignal<string | null>(null);
    const [dropTarget, setDropTarget] = createSignal<{ id: string; zone: DropZone } | null>(null);

    const nodesById = createMemo(() => {
        const map = new Map<string, NodeDTO>();
        for (const n of props.nodes) if (n.id) map.set(n.id, n);
        return map;
    });

    const flatRows = createMemo(() => flattenVisibleTree(
        props.nodes.map((n) => ({ id: n.id!, parentId: n.parentId ?? null, order: n.order ?? 0 })),
        collapsedIds(),
    ));

    const toggleCollapse = (id: string) => {
        setCollapsedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleRowClick = (row: FlatRow, e: MouseEvent) => {
        if (e.shiftKey) selection.selectRange(row.id, flatRows().map((r) => r.id));
        else if (e.ctrlKey || e.metaKey) selection.toggle(row.id);
        else selection.select(row.id);
    };

    const handleDelete = async (id: string) => {
        const idsToDelete = selection.isSelected(id) && selection.selectedIds().size > 1
            ? Array.from(selection.selectedIds())
            : [id];
        // Final-review fix Important #4 — this used to always show the SINGULAR confirm
        // copy regardless of how many ids were about to be deleted, unlike
        // NodeBuilder.page.tsx's own handleDeleteSelected, which already branches correctly.
        const confirmed = await confirmAction().danger(() =>
            idsToDelete.length > 1 ? t('cms.node.tree.deleteConfirmCount', { count: idsToDelete.length }) : t('cms.node.tree.deleteConfirm'),
        );
        if (!confirmed) return;
        // Final-review fix Important #3 — this used to call commandManager.run() bare, unlike
        // NodeBuilder.page.tsx's handleAdd/handleDeleteSelected/patchSelected, which all
        // catch -> toast().danger(...) on failure.
        try {
            await props.commandManager.run(createDeleteNodesCommand(idsToDelete, props.getNodes, props.setNodes));
            idsToDelete.forEach((deletedId) => selection.remove(deletedId));
        } catch {
            toast().danger(t('cms.toasts.saveFailed'));
        }
    };

    /** true if `candidateId` IS `ancestorId`, or is anywhere in `ancestorId`'s subtree —
     * i.e. moving something to a destination parent of `ancestorId` would put it inside
     * its own (former) descendant. Walks UP from candidate via parentId chain, so it
     * answers "is candidate inside ancestor's subtree" without needing a separate
     * descendants-collecting pass. Purely a client-side guard — no BE-side check exists
     * for this (moveNode/reorderNodes just write the raw values they're given). */
    const isSameOrDescendant = (candidateId: string, ancestorId: string): boolean => {
        let current: string | null = candidateId;
        const guardLimit = props.nodes.length + 1;
        let steps = 0;
        while (current) {
            if (current === ancestorId) return true;
            if (++steps > guardLimit) return true; // corrupt-cycle safety net — treat as unsafe
            current = nodesById().get(current)?.parentId ?? null;
        }
        return false;
    };

    const handleDrop = async (draggedId: string, targetId: string, zone: DropZone) => {
        if (draggedId === targetId) return;
        const targetRow = flatRows().find((r) => r.id === targetId);
        const targetNode = nodesById().get(targetId);
        if (!targetRow || !targetNode) return;

        // Reparent guard (repeated here, not just at hover-time): "inside" is only ever
        // valid when the target is a FRAME (layoutChildren === true). If somehow a stale
        // zone made it this far, fall back to "after" rather than silently reparenting
        // into a non-container.
        const targetIsContainer = nodeCapabilities[targetNode.type ?? '']?.layoutChildren === true;
        const effectiveZone: DropZone = zone === 'inside' && !targetIsContainer ? 'after' : zone;

        const toParentId: string | null = effectiveZone === 'inside' ? targetId : (targetRow.parentId ?? null);

        let baseIndex: number;
        if (effectiveZone === 'inside') {
            baseIndex = 0;
        } else {
            const destSiblings = props.nodes
                .filter((n) => (n.parentId ?? null) === toParentId)
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            const targetIdx = destSiblings.findIndex((n) => n.id === targetId);
            baseIndex = effectiveZone === 'before' ? targetIdx : targetIdx + 1;
        }

        const multi = selection.isSelected(draggedId) && selection.selectedIds().size > 1;

        // Final-review fix Important #3 — both branches below used to call
        // commandManager.run() bare, unlike NodeBuilder.page.tsx's handleAdd/
        // handleDeleteSelected/patchSelected, which all catch -> toast().danger(...).
        if (!multi) {
            if (toParentId !== null && isSameOrDescendant(toParentId, draggedId)) return; // would create a cycle
            try {
                await props.commandManager.run(createMoveNodeCommand(draggedId, toParentId, baseIndex, props.getNodes, props.setNodes));
            } catch {
                toast().danger(t('cms.toasts.saveFailed'));
            }
            return;
        }

        // Multi-select drag DECISION (documented per task instructions, not left
        // undefined): every currently-selected node moves to the SAME destination
        // parent/position, in their current visible relative order, bundled as ONE
        // Command via `createMoveNodesCommand` so a single Undo reverses the entire batch —
        // and, per Task 6's Critical-finding fix, restores it EXACTLY (snapshot-and-restore,
        // not N independent createMoveNodeCommand undo()s composed in reverse — that approach
        // corrupted non-contiguous selections' relative order on undo; see nodeCommands.ts's
        // createMoveNodesCommand doc comment for the traced repro).
        // Any selected id whose subtree would end up containing itself (dragging a
        // selection onto/into one of its own descendants) is silently skipped — it
        // stays where it is; the rest of the batch still moves. This never corrupts
        // data (each remaining move still goes through the same computeMoveReorder
        // machinery Task 4 already validated).
        const visibleOrder = flatRows().map((r) => r.id);
        const selectedInVisibleOrder = visibleOrder.filter((id) => selection.isSelected(id));
        const validIds = selectedInVisibleOrder.filter((id) => toParentId === null || !isSameOrDescendant(toParentId, id));
        if (validIds.length === 0) return;

        try {
            await props.commandManager.run(createMoveNodesCommand(validIds, toParentId, baseIndex, props.getNodes, props.setNodes));
        } catch {
            toast().danger(t('cms.toasts.saveFailed'));
        }
    };

    const handlePointerMoveRow = (row: FlatRow, e: PointerEvent) => {
        const dragged = draggingId();
        if (!dragged) return;
        if (row.id === dragged || isSameOrDescendant(row.id, dragged)) {
            // Never show/accept a drop zone on the dragged row itself or one of its own
            // descendants (dragging a Frame over its own child) — no legal zone there.
            setDropTarget(null);
            return;
        }
        const el = e.currentTarget as HTMLElement;
        const zone = computeDropZone(el, e.clientY, nodesById().get(row.id));
        setDropTarget({ id: row.id, zone });
    };

    return (
        <div class="flex flex-col">
            <Show when={flatRows().length > 0} fallback={<p class="p-3 text-xs text-nb-text-muted">{t('cms.node.tree.emptyLabel')}</p>}>
                <DragDropProvider
                    onDragStart={({ draggable }) => setDraggingId(String(draggable.id))}
                    onDragEnd={({ draggable }) => {
                        const dragged = draggingId();
                        const target = dropTarget();
                        setDraggingId(null);
                        setDropTarget(null);
                        if (!draggable || !dragged || !target) return;
                        void handleDrop(dragged, target.id, target.zone);
                    }}
                >
                    <DragDropSensors>
                        <For each={flatRows()}>
                            {(row) => {
                                const draggable = createDraggable(row.id as Id);
                                const droppable = createDroppable(row.id as Id);
                                return (
                                    <Row
                                        row={row}
                                        node={nodesById().get(row.id)}
                                        isSelected={selection.isSelected(row.id)}
                                        isCollapsed={collapsedIds().has(row.id)}
                                        isDragging={draggable.isActiveDraggable}
                                        dropZone={dropTarget()?.id === row.id ? dropTarget()!.zone : null}
                                        onToggleCollapse={toggleCollapse}
                                        onRowClick={handleRowClick}
                                        onAddChild={props.onAddChild}
                                        onDelete={handleDelete}
                                        onPointerMoveRow={handlePointerMoveRow}
                                        dragHandleProps={draggable.dragActivators as JSX.HTMLAttributes<HTMLSpanElement>}
                                        rowRef={(el) => { draggable(el); droppable(el); }}
                                    />
                                );
                            }}
                        </For>
                    </DragDropSensors>
                </DragDropProvider>
            </Show>
        </div>
    );
};
