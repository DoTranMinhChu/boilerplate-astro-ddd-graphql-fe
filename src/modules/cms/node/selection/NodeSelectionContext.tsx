import { createSignal, createContext, useContext, type Accessor, type JSX } from 'solid-js';

export interface NodeSelectionStore {
    selectedIds: Accessor<Set<string>>;
    isSelected: (id: string) => boolean;
    /** Chọn đơn — xoá selection cũ, set id này làm anchor cho Shift+click sau. */
    select: (id: string) => void;
    /** Ctrl/Cmd+click — thêm/bớt 1 id khỏi selection, KHÔNG đổi anchor nếu đã có. */
    toggle: (id: string) => void;
    /** Shift+click — chọn dải liên tục giữa anchor hiện tại và `toId`, theo thứ tự
     * hiển thị hiện tại (`orderedVisibleIds`, đã tôn trọng collapse). Nếu chưa có
     * anchor, fallback về chọn đơn `toId`. */
    selectRange: (toId: string, orderedVisibleIds: string[]) => void;
    clear: () => void;
    /** Gỡ 1 id khỏi selection nếu có mặt — dùng khi node đó bị xoá (kể cả do Undo). */
    remove: (id: string) => void;
}

export function createNodeSelectionStore(): NodeSelectionStore {
    const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set());
    const [anchorId, setAnchorId] = createSignal<string | null>(null);

    const select = (id: string) => {
        setSelectedIds(new Set([id]));
        setAnchorId(id);
    };

    const toggle = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
        if (anchorId() === null) setAnchorId(id);
    };

    const selectRange = (toId: string, orderedVisibleIds: string[]) => {
        const anchor = anchorId();
        if (anchor === null) {
            select(toId);
            return;
        }
        const fromIdx = orderedVisibleIds.indexOf(anchor);
        const toIdx = orderedVisibleIds.indexOf(toId);
        if (fromIdx === -1 || toIdx === -1) {
            select(toId);
            return;
        }
        const [start, end] = fromIdx <= toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
        setSelectedIds(new Set(orderedVisibleIds.slice(start, end + 1)));
    };

    const clear = () => {
        setSelectedIds(new Set<string>());
        setAnchorId(null);
    };

    const remove = (id: string) => {
        setSelectedIds((prev) => {
            if (!prev.has(id)) return prev;
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
        if (anchorId() === id) setAnchorId(null);
    };

    return {
        selectedIds,
        isSelected: (id) => selectedIds().has(id),
        select,
        toggle,
        selectRange,
        clear,
        remove,
    };
}

const NodeSelectionContext = createContext<NodeSelectionStore>();

export function NodeSelectionProvider(props: { children: JSX.Element }) {
    const store = createNodeSelectionStore();
    return (
        <NodeSelectionContext.Provider value={store}>
            {props.children}
        </NodeSelectionContext.Provider>
    );
}

export function useNodeSelection(): NodeSelectionStore {
    const ctx = useContext(NodeSelectionContext);
    if (!ctx) throw new Error('useNodeSelection() must be used within <NodeSelectionProvider>');
    return ctx;
}
