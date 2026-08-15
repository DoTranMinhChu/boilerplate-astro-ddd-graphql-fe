// src/modules/cms/node/commands/nodeCommands.ts
//
// Task 4 — 4 Command factories (Add/Delete/UpdateProperty/Move) wrapping the real
// NodeService mutations. Verified against the REAL node.service.ts (12) + generated
// GraphQL input types (typed-graphql.ts) rather than transcribing the task-4-brief's
// guessed shapes verbatim — see task-4-report.md for every place reality differed.
import { produce, type SetStoreFunction } from 'solid-js/store';
import { NodeService } from '@/shared/services/node/node.service';
import { computeMoveReorder, type OrderableRow } from './computeReorder';
import type { Command } from './CommandManager';

/**
 * Shape tối thiểu các Command này đọc/ghi — TÁCH BIỆT khỏi NodeDTO đầy đủ
 * (`@/modules/cms/node/node.types`), cùng lý do Task 3's computeReorder.ts tách
 * `OrderableRow` ra khỏi NodeDTO: dễ test độc lập (không cần mock đủ mọi field NodeDTO
 * mà các Command này không đọc/ghi — id/createdAt/updatedAt/deletedAt/animationRef).
 *
 * Cố tình KHÔNG import NodeDTO trực tiếp làm kiểu tham số ở đây (khác brief's code mẫu)
 * — phát hiện thật lúc viết task này: NodeDTO's field không-phải-JSON (createdAt/
 * updatedAt/deletedAt/layoutMode/animationRef, xem node.service.ts/typed-graphql.ts) là
 * REQUIRED keys (dù kiểu giá trị `T | undefined`); 1 type test-fixture tối giản không
 * khai đủ các key đó (hoặc khai chúng dạng OPTIONAL) KHÔNG thoả structural type của
 * NodeDTO — `astro check` báo lỗi ts(2322) thật, dù `npx vitest` (không typecheck) vẫn
 * pass bình thường. Dùng generic `<T extends NodeRow>` thay vì ép cứng `NodeDTO` để 2
 * bên (test's `TestNode` tối giản, và Task 7's `NodeDTO` thật) đều khớp tự nhiên, không
 * cần ép kiểu ở lời gọi thật.
 */
export interface NodeRow {
    id?: string;
    pageId?: string;
    parentId?: string;
    type?: string;
    order?: number;
    layoutMode?: unknown;
    style?: unknown;
    layout?: unknown;
    props?: unknown;
    dataBinding?: unknown;
    repeat?: unknown;
    visibilityRules?: unknown;
    responsiveOverrides?: unknown;
}

/** BFS xuống hết cây con — bản sao Y HỆT thuật toán đã có trong NodeBuilder.page.tsx's
 * collectDescendantIds (dòng 66-75 tại thời điểm viết task này): cùng chữ ký (nodes, id)
 * => Set<string>, cùng cách duyệt theo "frontier" từng tầng. Nhân bản ở đây (thay vì
 * import từ .page.tsx, vốn không export nó) vì Task 7 mới là nơi rewire trang đó để DÙNG
 * các Command này — tới lúc đó 2 bản sẽ hợp nhất lại thành 1. */
function collectDescendantIds<T extends NodeRow>(nodes: T[], id: string): Set<string> {
    const ids = new Set<string>();
    let frontier = [id];
    while (frontier.length) {
        const children = nodes.filter((n) => n.parentId && frontier.includes(n.parentId)).map((n) => n.id).filter((cid): cid is string => !!cid);
        frontier = children.filter((cid) => !ids.has(cid));
        frontier.forEach((cid) => ids.add(cid));
    }
    return ids;
}

/** Field thật sự ghi được qua UpdateNodeInput (xem node.service.ts/typed-graphql.ts) —
 * KHÔNG có pageId/parentId/id/createdAt/updatedAt/deletedAt. Y hệt tập field của
 * NodeBuilder.page.tsx's `toSavable`/`SavableNodeFields` (dòng 51-59) — cố tình trùng,
 * không phải trùng hợp: gửi cả node đầy đủ (kể cả field UpdateNodeInput không khai báo)
 * sẽ bị GraphQL từ chối ("field không tồn tại trên input type") ở request thật, dù
 * `as any` khiến tsc/astro check không bắt được lỗi này lúc build. */
function toUpdatePayload(node: NodeRow) {
    const { type, order, layoutMode, style, layout, props, dataBinding, repeat, visibilityRules, responsiveOverrides } = node;
    return { type, order, layoutMode, style, layout, props, dataBinding, repeat, visibilityRules, responsiveOverrides };
}

/** Field thật sự ghi được qua CreateNodeInput — thêm `pageId`/`parentId` so với
 * UpdateNodeInput ở trên, vẫn KHÔNG có `id`/timestamps (BE tự sinh). Dùng khi tạo lại
 * node ở `createDeleteNodesCommand.undo()` — brief's guessed code spread nguyên cả
 * node cũ (`{ ...node, parentId: newParentId, id: undefined }`), lẫn cả id/createdAt/
 * updatedAt/deletedAt vào biến `data` gửi lên: cùng lỗi runtime như trên. */
function toCreatePayload(node: NodeRow, parentId: string | undefined) {
    const { pageId, type, order, layoutMode, style, layout, props, dataBinding, repeat, visibilityRules, responsiveOverrides } = node;
    return { pageId, parentId, type, order, layoutMode, style, layout, props, dataBinding, repeat, visibilityRules, responsiveOverrides };
}

export function createAddNodeCommand<T extends NodeRow>(
    data: { pageId: string; parentId: string | undefined; type: string; order: number },
    getNodes: () => T[],
    setNodes: SetStoreFunction<T[]>,
): Command {
    let createdId: string | undefined;
    return {
        label: 'Thêm phần tử',
        execute: async () => {
            const created = await NodeService.createNode({ data: data as any });
            createdId = created.id;
            // Cast như handleAdd hiện có (dòng 137 NodeBuilder.page.tsx) — createNode's
            // return type là NodeDTO THÔ (JSON field = string) của chính node.service.ts,
            // khác với NodeDTO đã parse (StyleObject/...) mà store thật khai kiểu.
            setNodes(produce((nodes) => { nodes.push(created as unknown as T); }));
        },
        undo: async () => {
            if (!createdId) return;
            await NodeService.deleteNode({ id: createdId });
            setNodes((nodes) => nodes.filter((n) => n.id !== createdId));
        },
    };
}

export function createDeleteNodesCommand<T extends NodeRow>(
    rootIds: string[],
    getNodes: () => T[],
    setNodes: SetStoreFunction<T[]>,
): Command {
    // Snapshot đầy đủ (cha trước, con sau — thứ tự BFS) TRƯỚC khi xoá, để undo() có đủ
    // dữ liệu tạo lại. Ghi đè lại `snapshot`/`currentRootIds` mỗi lần undo() chạy, để 1
    // redo() sau đó (execute() gọi lại) xoá ĐÚNG id vừa được tạo lại, không phải id gốc
    // đã không còn tồn tại (BE luôn cấp id MỚI, không nhận id chỉ định — xem node.service.ts).
    let snapshot: T[] = [];
    let currentRootIds = [...rootIds];

    return {
        label: currentRootIds.length > 1 ? `Xoá ${currentRootIds.length} phần tử` : 'Xoá phần tử',
        execute: async () => {
            const all = getNodes();
            const idsToRemoveLocally = new Set<string>();
            const snapshotNodes: T[] = [];

            for (const rootId of currentRootIds) {
                const root = all.find((n) => n.id === rootId);
                if (!root || idsToRemoveLocally.has(rootId)) continue;
                idsToRemoveLocally.add(rootId);
                snapshotNodes.push(root);
                for (const descId of collectDescendantIds(all, rootId)) {
                    if (idsToRemoveLocally.has(descId)) continue;
                    idsToRemoveLocally.add(descId);
                    const descNode = all.find((n) => n.id === descId);
                    if (descNode) snapshotNodes.push(descNode);
                }
            }
            snapshot = snapshotNodes;

            // Xoá cục bộ trước (optimistic), rồi gọi API — CHỈ gọi deleteNode 1 lần cho
            // mỗi root trực tiếp bị xoá (BE tự cascade xuống con qua deleteSubtree()
            // application-layer, xác nhận thật trong node.service.ts BE — KHÔNG tự gọi
            // deleteNode cho từng hậu duệ ở đây, khớp đúng handleDelete hiện có).
            setNodes((nodes) => nodes.filter((n) => !n.id || !idsToRemoveLocally.has(n.id)));
            try {
                for (const rootId of currentRootIds) await NodeService.deleteNode({ id: rootId });
            } catch (err) {
                // Rollback cục bộ nếu API lỗi — cùng idiom handleDelete's `setNodes(prev)`.
                setNodes(produce((nodes) => { nodes.push(...snapshot); }));
                throw err;
            }
        },
        undo: async () => {
            // Tạo lại CHA TRƯỚC CON (snapshot đã ở đúng thứ tự BFS) — map id CŨ -> id MỚI
            // vì BE luôn tự sinh id mới, không nhận id chỉ định (xác nhận thật, node.service.ts
            // không có tham số nào cho phép chỉ định id khi createNode).
            const oldToNewId = new Map<string, string>();
            const recreated: T[] = [];
            for (const node of snapshot) {
                const newParentId = node.parentId ? (oldToNewId.get(node.parentId) ?? node.parentId) : node.parentId;
                const created = await NodeService.createNode({ data: toCreatePayload(node, newParentId) as any });
                oldToNewId.set(node.id!, created.id!);
                recreated.push(created as unknown as T);
            }
            // Cập nhật snapshot/rootIds's ids để 1 redo() sau đó xoá ĐÚNG các row vừa tạo
            // lại, không phải id gốc đã không còn tồn tại.
            snapshot = recreated;
            currentRootIds = currentRootIds.map((id) => oldToNewId.get(id) ?? id);
            setNodes(produce((nodes) => { nodes.push(...recreated); }));
        },
    };
}

export function createUpdateNodePropertyCommand<T extends NodeRow>(
    nodeId: string,
    beforePatch: Partial<NodeRow>,
    afterPatch: Partial<NodeRow>,
    getNodes: () => T[],
    setNodes: SetStoreFunction<T[]>,
): Command {
    // Cùng shape `patchSelected`/`persist` hiện có (dòng 111-125 NodeBuilder.page.tsx):
    // patch cục bộ trước qua `produce`, rồi persist FULL node hiện tại (không chỉ patch
    // vừa áp) qua updateNode — chỉ gửi đúng tập field UpdateNodeInput khai báo
    // (`toUpdatePayload`), không phải cả object node (id/pageId/parentId/timestamps sẽ bị
    // GraphQL từ chối vì không thuộc UpdateNodeInput).
    const applyAndPersist = async (patch: Partial<NodeRow>) => {
        const idx = getNodes().findIndex((n) => n.id === nodeId);
        if (idx === -1) return;
        setNodes(produce((nodes) => { Object.assign(nodes[idx], patch); }));
        await NodeService.updateNode({ id: nodeId, data: toUpdatePayload(getNodes()[idx]) as any });
    };
    return {
        label: 'Sửa thuộc tính',
        execute: () => applyAndPersist(afterPatch),
        undo: () => applyAndPersist(beforePatch),
    };
}

export function createMoveNodeCommand<T extends NodeRow>(
    movedId: string,
    toParentId: string | null,
    toIndex: number,
    getNodes: () => T[],
    setNodes: SetStoreFunction<T[]>,
): Command {
    // Snapshot vị trí GỐC của node đang di chuyển (để undo() biết quay lại đâu) — chụp
    // lúc tạo Command (trước execute() đầu tiên), không đổi sau đó.
    const before = getNodes().find((n) => n.id === movedId);
    if (!before) throw new Error(`createMoveNodeCommand: node ${movedId} not found`);
    const fromParentId = before.parentId ?? null;
    const fromOrder = before.order ?? 0;

    const applyMove = async (toParent: string | null, toIdx: number) => {
        // computeMoveReorder (Task 3) dùng convention `parentId: string | null` cho gốc
        // cây (OrderableRow, computeReorder.ts) — khác với NodeDTO/MoveNodeInput thật, nơi
        // "không cha" là `undefined` (xem generated typed-graphql.ts — mọi field kiểu
        // `T | undefined`, KHÔNG có `null`). Quy đổi ở ranh giới: `?? null` khi đưa vào
        // computeMoveReorder, `?? undefined` khi gọi NodeService.moveNode.
        const rows: OrderableRow[] = getNodes().map((n) => ({ id: n.id!, parentId: n.parentId ?? null, order: n.order ?? 0 }));
        const { movedNode, siblingUpdates } = computeMoveReorder(rows, movedId, toParent, toIdx);

        await NodeService.moveNode({ data: { id: movedNode.id, newParentId: movedNode.parentId ?? undefined, newOrder: movedNode.order } });
        // Global constraint: PHẢI renumber mọi sibling khác bị đổi order do thao tác này
        // qua reorderNodes, nếu không giá trị order sẽ trùng nhau — BE không tự validate
        // việc này (moveNode/reorderNodes chỉ ghi đè giá trị thô).
        if (siblingUpdates.length) {
            await NodeService.reorderNodes({ items: siblingUpdates });
        }

        setNodes(produce((nodes) => {
            const movedIdx = nodes.findIndex((n) => n.id === movedNode.id);
            if (movedIdx !== -1) {
                nodes[movedIdx].parentId = movedNode.parentId ?? undefined;
                nodes[movedIdx].order = movedNode.order;
            }
            for (const update of siblingUpdates) {
                const idx = nodes.findIndex((n) => n.id === update.id);
                if (idx !== -1) nodes[idx].order = update.order;
            }
        }));
    };

    return {
        label: 'Di chuyển phần tử',
        execute: () => applyMove(toParentId, toIndex),
        undo: () => applyMove(fromParentId, fromOrder),
    };
}
