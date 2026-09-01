// src/modules/cms/node/commands/nodeCommands.ts
//
// Task 4 — 4 Command factories (Add/Delete/UpdateProperty/Move) wrapping the real
// NodeService mutations. Verified against the REAL node.service.ts (12) + generated
// GraphQL input types (typed-graphql.ts) rather than transcribing the task-4-brief's
// guessed shapes verbatim — see task-4-report.md for every place reality differed.
import { produce, type SetStoreFunction } from 'solid-js/store';
import { NodeService } from '@/shared/services/node/node.service';
import { t } from '@/shared/i18n/t';
import { computeMoveReorder, type OrderableRow } from './computeReorder';
import type { Command } from './CommandManager';
import type { LayoutProps, Breakpoint } from '@/modules/cms/node/node.types';
import { pickSavableNodeFields } from '@/modules/cms/node/node.types';
import { buildLayoutPatch } from '../buildLayoutPatch';

/**
 * Shape tối thiểu các Command này đọc/ghi — TÁCH BIỆT khỏi NodeDTO đầy đủ
 * (`@/modules/cms/node/node.types`), cùng lý do Task 3's computeReorder.ts tách
 * `OrderableRow` ra khỏi NodeDTO: dễ test độc lập (không cần mock đủ mọi field NodeDTO
 * mà các Command này không đọc/ghi — id/createdAt/updatedAt/deletedAt).
 *
 * Cố tình KHÔNG import NodeDTO trực tiếp làm kiểu tham số ở đây (khác brief's code mẫu)
 * — phát hiện thật lúc viết task này: NodeDTO's field không-phải-JSON (createdAt/
 * updatedAt/deletedAt/layoutMode, xem node.service.ts/typed-graphql.ts) là REQUIRED keys
 * (dù kiểu giá trị `T | undefined`); 1 type test-fixture tối giản không khai đủ các key
 * đó (hoặc khai chúng dạng OPTIONAL) KHÔNG thoả structural type của NodeDTO — `astro
 * check` báo lỗi ts(2322) thật, dù `npx vitest` (không typecheck) vẫn pass bình thường.
 * Dùng generic `<T extends NodeRow>` thay vì ép cứng `NodeDTO` để 2 bên (test's
 * `TestNode` tối giản, và Task 7's `NodeDTO` thật) đều khớp tự nhiên, không cần ép kiểu ở
 * lời gọi thật.
 *
 * Phase 4 (Animation Timeline) live-verification fix: `animationRef` WAS listed above as
 * a field these Commands deliberately don't touch — that was true through Phase 3, but
 * is no longer true now that `createUpdateNodePropertyCommand`/`createAddNodeCommand`
 * need to persist it (see `toUpdatePayload`/`toCreatePayload` below). Added here so it
 * flows through the same generic `<T extends NodeRow>` path as every other JSON field.
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
    animationRef?: unknown;
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
 * `as any` khiến tsc/astro check không bắt được lỗi này lúc build.
 *
 * Phase 4 (Animation Timeline) live-verification fix: Task 1 added `animationRef` to
 * `NodeBuilder.page.tsx`'s `toSavable`/`SavableNodeFields` but missed this SEPARATE
 * hardcoded field list — the doc comment above already said these two are supposed to
 * stay identical, but `applyAndPersist` (below) is what actually calls
 * `NodeService.updateNode`, so `animationRef` never reached the server despite the
 * Inspector tab correctly updating local store state. Confirmed via live dev-server
 * network capture: every `updateNode` mutation variables omitted `animationRef`
 * entirely, and the server's response kept returning `animationRef: null` no matter how
 * many keyframes were added/edited/reordered in the UI. */
function toUpdatePayload(node: NodeRow) {
    // `as any` here (not `as NodeDTO`) for the same reason the doc comment above `NodeRow`
    // explains: `NodeRow` is DELIBERATELY a minimal structural subset of `NodeDTO` (no
    // id/createdAt/updatedAt/deletedAt/componentDefinitionId/componentSourceNodeId — see the
    // real tsc error this cast replaces: ts(2345), confirmed at task-14 write time), so a
    // test-fixture `TestNode` can satisfy it without declaring every NodeDTO field. `pick
    // SavableNodeFields` only ever READS the `SAVABLE_NODE_FIELD_KEYS` subset off its argument
    // (see node.types.ts), which `NodeRow` always has — the cast is safe, matching the same
    // `as any` idiom already used at every `NodeService.*` call site in this file.
    return pickSavableNodeFields(node as any);
}

/** Field thật sự ghi được qua CreateNodeInput — thêm `pageId`/`parentId` so với
 * UpdateNodeInput ở trên, vẫn KHÔNG có `id`/timestamps (BE tự sinh). Dùng khi tạo lại
 * node ở `createDeleteNodesCommand.undo()` — brief's guessed code spread nguyên cả
 * node cũ (`{ ...node, parentId: newParentId, id: undefined }`), lẫn cả id/createdAt/
 * updatedAt/deletedAt vào biến `data` gửi lên: cùng lỗi runtime như trên.
 *
 * Phase 4: `animationRef` added for the same reason as `toUpdatePayload` above — without
 * it, undoing a delete (which recreates the node via `createNode`) would silently drop
 * any animationRef the node had before deletion. */
function toCreatePayload(node: NodeRow, parentId: string | undefined) {
    const { pageId } = node;
    // Same `as any` idiom/rationale as `toUpdatePayload` above.
    return { pageId, parentId, ...pickSavableNodeFields(node as any) };
}

export function createAddNodeCommand<T extends NodeRow>(
    // Final-review fix Critical #1 — `order` is now OPTIONAL and, per NodeBuilder.page.tsx's
    // `handleAdd`, deliberately omitted by the real caller: leaving it unset lets the BE's
    // `createNode` auto-assign a race-safe order (see `data.order === undefined` branch,
    // node.service.ts) instead of the caller racily/incorrectly computing it client-side.
    // Still accepted here (rather than removed outright) so a caller that legitimately knows
    // the exact target order (none currently do) isn't forced to route through a follow-up
    // move/reorder call just to set it.
    data: { pageId: string; parentId: string | undefined; type: string; order?: number },
    getNodes: () => T[],
    setNodes: SetStoreFunction<T[]>,
): Command {
    let createdId: string | undefined;
    return {
        label: t('cms.node.commands.addLabel'),
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

/**
 * Review finding fix (Task 7 follow-up) — `undo()` recreates the ENTIRE deleted snapshot
 * (root(s) AND every descendant) under brand-new server-generated ids, all of which are
 * "new" relative to before undo() ran. NodeBuilder.page.tsx's post-undo/redo selection
 * resync used to diff the store's ids before/after and select EVERY new id — correct for
 * Add (exactly 1 new id, no descendants) but wrong here: it selected the recreated root(s)
 * AND every recreated descendant, not just the root(s) the user actually had selected
 * before deleting. `getRootIdsAfterLastOp` is the escape hatch: it exposes exactly
 * `currentRootIds` (the ORIGINAL `rootIds`, remapped through `oldToNewId` at the end of the
 * last undo()/execute()) so a caller can select precisely those instead of the generic
 * all-new-ids diff. Non-standard — NOT part of the shared `Command` interface
 * (CommandManager.ts) since no other command type needs this; see
 * resyncSelectionAfterHistoryOp.ts's `hasRootIdsAfterLastOp` for the caller-side check.
 */
export interface DeleteNodesCommand extends Command {
    getRootIdsAfterLastOp: () => string[];
}

export function createDeleteNodesCommand<T extends NodeRow>(
    rootIds: string[],
    getNodes: () => T[],
    setNodes: SetStoreFunction<T[]>,
): DeleteNodesCommand {
    // Snapshot đầy đủ (cha trước, con sau — thứ tự BFS) TRƯỚC khi xoá, để undo() có đủ
    // dữ liệu tạo lại. Ghi đè lại `snapshot`/`currentRootIds` mỗi lần undo() chạy, để 1
    // redo() sau đó (execute() gọi lại) xoá ĐÚNG id vừa được tạo lại, không phải id gốc
    // đã không còn tồn tại (BE luôn cấp id MỚI, không nhận id chỉ định — xem node.service.ts).
    let snapshot: T[] = [];
    let currentRootIds = [...rootIds];

    return {
        label: currentRootIds.length > 1
            ? t('cms.node.commands.deleteLabelCount', { count: currentRootIds.length })
            : t('cms.node.commands.deleteLabel'),
        execute: async () => {
            const all = getNodes();
            const idsToRemoveLocally = new Set<string>();
            const snapshotNodes: T[] = [];
            // Deduplicated "real roots" — ids that actually pass the guard below (not a
            // literal duplicate in currentRootIds, and not already covered because it's a
            // descendant of another root already processed in this same batch). REUSED for
            // the deleteNode API-call loop below, instead of iterating raw `currentRootIds`
            // — otherwise an overlapping/duplicate id would trigger a second deleteNode call
            // against a node the first call already deleted server-side, and a resulting
            // throw would roll back the ENTIRE snapshot (including nodes that WERE
            // successfully deleted server-side), causing a local/server desync.
            const realRootIds: string[] = [];

            for (const rootId of currentRootIds) {
                const root = all.find((n) => n.id === rootId);
                if (!root || idsToRemoveLocally.has(rootId)) continue;
                idsToRemoveLocally.add(rootId);
                realRootIds.push(rootId);
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
                for (const rootId of realRootIds) await NodeService.deleteNode({ id: rootId });
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
        // Returns the CURRENT `currentRootIds` array reference at call time (post-remap
        // after the last undo(), or the original construction-time `rootIds` if undo()
        // hasn't run yet) — see the `DeleteNodesCommand`/review-finding comment above.
        getRootIdsAfterLastOp: () => currentRootIds,
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
        // Full snapshot of the node's fields right BEFORE this patch is applied — needed to
        // fully revert the optimistic mutation if updateNode rejects (not just the fields in
        // `patch`, in case a future caller passes a patch narrower than what actually changed).
        const before = { ...getNodes()[idx] } as T;
        setNodes(produce((nodes) => { Object.assign(nodes[idx], patch); }));
        try {
            await NodeService.updateNode({ id: nodeId, data: toUpdatePayload(getNodes()[idx]) as any });
        } catch (err) {
            // Rollback cục bộ nếu API lỗi — cùng idiom createDeleteNodesCommand/
            // createAddNodeCommand: revert store, rồi rethrow để CommandManager.run()/undo()/
            // redo() biết thao tác thất bại và KHÔNG đẩy command này vào undo/redo stack.
            setNodes(produce((nodes) => { Object.assign(nodes[idx], before); }));
            throw err;
        }
    };
    return {
        label: t('cms.node.commands.updatePropertyLabel'),
        execute: () => applyAndPersist(afterPatch),
        undo: () => applyAndPersist(beforePatch),
    };
}

/** Shared single-node move mechanics — extracted (Task 6 fix) so both
 * `createMoveNodeCommand` (1 node) and `createMoveNodesCommand` (N nodes, batched) run the
 * SAME forward move logic, instead of the batch command reimplementing it. Always reads
 * LIVE state via `getNodes()` at call time (never a snapshot) — required so that calling
 * this several times in a row (once per moved id in a batch) has each subsequent call see
 * the previous call's effect, and so a later redo() (== execute() called again after an
 * undo() has restored the original state) is naturally correct with no special-casing. */
async function applyNodeMove<T extends NodeRow>(
    movedId: string,
    toParent: string | null,
    toIdx: number,
    getNodes: () => T[],
    setNodes: SetStoreFunction<T[]>,
): Promise<void> {
    // computeMoveReorder (Task 3) dùng convention `parentId: string | null` cho gốc
    // cây (OrderableRow, computeReorder.ts) — khác với NodeDTO/MoveNodeInput thật, nơi
    // "không cha" là `undefined` (xem generated typed-graphql.ts — mọi field kiểu
    // `T | undefined`, KHÔNG có `null`). Quy đổi ở ranh giới: `?? null` khi đưa vào
    // computeMoveReorder, `?? undefined` khi gọi NodeService.moveNode.
    const rows: OrderableRow[] = getNodes().map((n) => ({ id: n.id!, parentId: n.parentId ?? null, order: n.order ?? 0 }));
    const { movedNode, siblingUpdates } = computeMoveReorder(rows, movedId, toParent, toIdx);

    // Final-review fix Important #1 — snapshot of the moved node's PRE-move position,
    // captured before either API call runs, so a `reorderNodes` failure AFTER `moveNode`
    // already succeeded has something to compensate back to (see the catch block below).
    const originalRow = rows.find((r) => r.id === movedId);

    await NodeService.moveNode({ data: { id: movedNode.id, newParentId: movedNode.parentId ?? undefined, newOrder: movedNode.order } });
    // Global constraint: PHẢI renumber mọi sibling khác bị đổi order do thao tác này
    // qua reorderNodes, nếu không giá trị order sẽ trùng nhau — BE không tự validate
    // việc này (moveNode/reorderNodes chỉ ghi đè giá trị thô).
    if (siblingUpdates.length) {
        try {
            await NodeService.reorderNodes({ items: siblingUpdates });
        } catch (err) {
            // Final-review fix Important #1 — unlike createAddNodeCommand/
            // createDeleteNodesCommand/createUpdateNodePropertyCommand, this function calls
            // its API mutations BEFORE touching the local store (`setNodes` below hasn't run
            // yet), so there is no optimistic local state to roll back here. But the SERVER
            // is now in a broken state: `moveNode` above already committed (node reparented/
            // reordered), while these `siblingUpdates` were never applied — exactly the
            // duplicate-`order` situation `computeMoveReorder`'s doc comment says must never
            // happen. Best-effort compensation: move the node back to its pre-move position.
            // This can't be a real transaction (2 separate GraphQL calls), so it's not a
            // guarantee — just an attempt to leave the server closer to its original state
            // than "moved but not renumbered". If the compensating call ALSO fails, there's
            // nothing more we can safely do client-side; log it and let the original error
            // win (rethrown below either way, so CommandManager.run()/undo()/redo() never
            // pushes this onto its stack).
            if (originalRow) {
                try {
                    await NodeService.moveNode({
                        data: { id: movedId, newParentId: originalRow.parentId ?? undefined, newOrder: originalRow.order },
                    });
                } catch (compensationErr) {
                    console.error(
                        'applyNodeMove: compensating moveNode also failed after reorderNodes rejected — server may be left with a moved node whose siblings were not renumbered (duplicate order values)',
                        compensationErr,
                    );
                }
            }
            throw err;
        }
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

    return {
        label: t('cms.node.commands.moveLabel'),
        execute: () => applyNodeMove(movedId, toParentId, toIndex, getNodes, setNodes),
        undo: () => applyNodeMove(movedId, fromParentId, fromOrder, getNodes, setNodes),
    };
}

/** Full `{id, parentId, order}` snapshot entry — construction-time-only shape used by
 * `createMoveNodesCommand`'s undo(). Deliberately mirrors `NodeRow`'s `parentId?: string`
 * convention (`undefined` for "no parent", never `null`) so it round-trips through
 * `NodeService.moveNode`'s `newParentId` field with no extra conversion at undo time. */
interface MoveNodesSnapshotEntry {
    id: string;
    parentId: string | undefined;
    order: number;
}

/**
 * Task 6 Critical-finding fix — replaces the old `composeCommand`-of-N-independent-
 * `createMoveNodeCommand`s approach for multi-select drag (LayersPanel.tsx). That approach
 * was correct on execute() (forward) but WRONG on undo() whenever the dragged selection was
 * non-contiguous: each sub-command's undo() calls `computeMoveReorder` against the LIVE
 * store at the moment IT runs, which is missing whichever other batch member hasn't been
 * un-done yet — so sequential independent-command undos can't reconstruct the true original
 * interleaving of untouched siblings sitting between the moved nodes (traced repro: A(0)
 * B(1) C(2) D(3), select A+C, drag after D → forward gives B(0) D(1) A(2) C(3) correctly,
 * but undoing C then A via 2 independent computeMoveReorder calls yields A(0) B(1) D(2)
 * C(3) — C and D end up swapped relative to the true original).
 *
 * Fix: snapshot-and-restore instead of composed sub-command undo. `undo()` never calls
 * `computeMoveReorder` — it writes the EXACT construction-time snapshot values back,
 * which is correct regardless of how many untouched nodes were interleaved among the
 * moved ones, and regardless of how many source parent groups were involved.
 */
export function createMoveNodesCommand<T extends NodeRow>(
    movedIds: string[],
    toParentId: string | null,
    baseIndex: number,
    getNodes: () => T[],
    setNodes: SetStoreFunction<T[]>,
): Command {
    // Full-store snapshot of EVERY node's {id, parentId, order} — chụp lúc TẠO Command
    // (trước execute() đầu tiên chạy), không phải chỉ riêng các node được di chuyển hay
    // riêng các sibling "trực tiếp" của chúng. Đây là thứ DUY NHẤT undo() cần đọc — snapshot
    // TOÀN BỘ cây (chứ không chỉ các parent-group liên quan) cố tình rộng hơn mức tối thiểu
    // cần thiết: ghi đè lại giá trị snapshot cho 1 node không hề bị ảnh hưởng là no-op (giá
    // trị hiện tại của nó đã trùng snapshot), nên snapshot rộng hơn không có chi phí đúng/sai
    // nào, chỉ tốn thêm vài phần tử bộ nhớ — và tránh hẳn việc phải tự liệt kê chính xác "mọi
    // parent-group liên quan" (nguồn + đích), vốn dễ bỏ sót nếu làm thủ công.
    const snapshot: MoveNodesSnapshotEntry[] = getNodes().map((n) => ({ id: n.id!, parentId: n.parentId, order: n.order ?? 0 }));

    return {
        label: movedIds.length > 1
            ? t('cms.node.commands.moveLabelCount', { count: movedIds.length })
            : t('cms.node.commands.moveLabel'),
        execute: async () => {
            // Giống HỆT forward-logic cũ (N lệnh createMoveNodeCommand độc lập) — phần này
            // reviewer đã xác nhận ĐÚNG, không đổi: mỗi id kế tiếp được chèn NGAY SAU id vừa
            // xử lý ở đích, đọc state SỐNG (getNodes()) ở mỗi lần lặp — không phải snapshot ở
            // trên (snapshot chỉ undo() dùng) — nên lần execute() ĐẦU TIÊN và một redo() sau
            // đó (execute() được gọi lại sau khi undo() đã khôi phục state gốc) chạy giống hệt
            // nhau, không cần xử lý riêng cho redo().
            for (let i = 0; i < movedIds.length; i++) {
                await applyNodeMove(movedIds[i], toParentId, baseIndex + i, getNodes, setNodes);
            }
        },
        undo: async () => {
            const live = getNodes();
            // 2 nhóm lệnh API cần gọi để đưa server về đúng snapshot — KHÔNG tính lại qua
            // computeMoveReorder (đã có sẵn giá trị đích chính xác từ snapshot, không cần
            // suy luận gì thêm):
            //  - parentId hiện tại khác snapshot => phải gọi moveNode (nó set CẢ parentId lẫn
            //    order trong 1 lệnh).
            //  - parentId hiện tại giống snapshot nhưng order khác => gộp vào 1 lệnh
            //    reorderNodes duy nhất cho tất cả các node dạng này (không phân biệt node đó
            //    thuộc parent-group nào — reorderNodes nhận 1 danh sách phẳng).
            const moveNodeCalls: MoveNodesSnapshotEntry[] = [];
            const reorderOnlyItems: { id: string; order: number }[] = [];

            for (const entry of snapshot) {
                const current = live.find((n) => n.id === entry.id);
                if (!current) continue; // node không còn tồn tại nữa — không có gì để khôi phục
                const parentChanged = (current.parentId ?? undefined) !== (entry.parentId ?? undefined);
                const orderChanged = (current.order ?? 0) !== entry.order;
                if (parentChanged) moveNodeCalls.push(entry);
                else if (orderChanged) reorderOnlyItems.push({ id: entry.id, order: entry.order });
            }

            for (const entry of moveNodeCalls) {
                await NodeService.moveNode({ data: { id: entry.id, newParentId: entry.parentId, newOrder: entry.order } });
            }
            if (reorderOnlyItems.length) {
                await NodeService.reorderNodes({ items: reorderOnlyItems });
            }

            // Ghi ĐÚNG giá trị snapshot vào store cục bộ cho MỌI entry (kể cả những node
            // không đổi gì — no-op) — trực tiếp, KHÔNG qua computeMoveReorder, vì snapshot đã
            // LÀ giá trị đích chính xác. Đây chính là điều đảm bảo khôi phục byte-for-byte bất
            // kể có bao nhiêu node không-được-chọn xen giữa các node đã di chuyển.
            setNodes(produce((nodes) => {
                for (const entry of snapshot) {
                    const idx = nodes.findIndex((n) => n.id === entry.id);
                    if (idx !== -1) {
                        nodes[idx].parentId = entry.parentId;
                        nodes[idx].order = entry.order;
                    }
                }
            }));
        },
    };
}

/**
 * M1c (Task 2) — canvas free-drag (x/y within a FRAME-typed free-layout parent) batched over
 * N selected nodes as ONE Command, mirroring `createMoveNodesCommand`'s "batch of N as one
 * Command" shape but for `layout` object replacement instead of order/parentId math (same
 * domain as `createUpdateNodePropertyCommand`'s single-node patch/persist, just applied per
 * node in a loop here instead of N separate Commands). Each `moves[]` entry already carries
 * its own exact `layoutBefore`/`layoutAfter` (computed by the caller from the live drag
 * gesture) — unlike `createMoveNodesCommand`, this command does NOT snapshot the full store
 * at construction time, because there's no reorder math to recompute against on undo: the
 * caller-supplied `layoutBefore` IS already the exact pre-drag value to restore.
 *
 * Store-mutation idiom verified against `createUpdateNodePropertyCommand`'s `applyAndPersist`
 * (the real pattern in this file) rather than the brief's illustrative
 * `setNodes(idx, 'layout' as any, ...)` sketch: real calls go through
 * `setNodes(produce((nodes) => { ... }))` with plain property assignment inside the producer,
 * no `as any` needed anywhere (NodeRow's `layout?: unknown` already accepts a `LayoutProps`
 * value with no cast).
 */
export function createDragNodesCommand<T extends NodeRow>(
    moves: { id: string; layoutBefore: LayoutProps; layoutAfter: LayoutProps }[],
    breakpoint: Breakpoint,
    getNodes: () => T[],
    setNodes: SetStoreFunction<T[]>,
): Command {
    // Per-node patch/persist/rollback-on-failure — cùng idiom
    // `createUpdateNodePropertyCommand`'s `applyAndPersist`, chạy tuần tự cho từng node trong
    // `moves` (KHÔNG song song — 1 lỗi giữa batch phải dừng lại đúng chỗ nó xảy ra, không để
    // các request sau chạy tiếp trên 1 batch đã biết là sẽ rollback một phần).
    //
    // Task 15 fix — "breakpoint-blind" bug: this used to unconditionally write `move[which]`
    // straight into the node's DESKTOP `layout` field regardless of which breakpoint the admin
    // was previewing when the drag happened. Now routes through `buildLayoutPatch` (same
    // desktop-vs-tablet/mobile branch the Inspector's own Layout/Style tabs already use) so a
    // drag performed while previewing Tablet/Mobile lands in `responsiveOverrides.<bp>.layout`
    // instead, leaving the desktop `layout` field genuinely untouched.
    const applyLayouts = async (which: 'layoutBefore' | 'layoutAfter') => {
        for (const move of moves) {
            const idx = getNodes().findIndex((n) => n.id === move.id);
            if (idx === -1) continue; // node không còn tồn tại nữa — bỏ qua, không có gì để áp
            // Snapshot TOÀN BỘ node (không chỉ field `layout`) ngay trước khi ghi đè — cùng lý
            // do `applyAndPersist`'s `before`: rollback đầy đủ nếu updateNode từ chối, không chỉ
            // riêng field vừa đổi.
            const before = { ...getNodes()[idx] } as T;
            const patch = buildLayoutPatch(before as { responsiveOverrides?: any }, breakpoint, move[which]);
            setNodes(produce((nodes) => { Object.assign(nodes[idx], patch); }));
            try {
                await NodeService.updateNode({ id: move.id, data: toUpdatePayload(patch as NodeRow) as any });
            } catch (err) {
                // Rollback CỤC BỘ riêng node này nếu API lỗi — cùng idiom
                // `applyAndPersist`/`createDeleteNodesCommand`: revert store, rồi rethrow để
                // CommandManager.run()/undo()/redo() biết thao tác thất bại và KHÔNG đẩy command
                // này vào undo/redo stack. Các node ĐÃ áp thành công ở vòng lặp trước đó (persist
                // xong trên server) giữ nguyên optimistic state — không rollback ngược lại chúng,
                // vì server-side đã thực sự đổi cho các node đó rồi.
                setNodes(produce((nodes) => { Object.assign(nodes[idx], before); }));
                throw err;
            }
        }
    };
    return {
        label: moves.length > 1
            ? t('cms.node.commands.dragLabelCount', { count: moves.length })
            : t('cms.node.commands.dragLabel'),
        execute: () => applyLayouts('layoutAfter'),
        undo: () => applyLayouts('layoutBefore'),
    };
}

/**
 * Task 2 (Property Inspector redesign plan) — wires the already-existing, already-tested
 * BE mutation `NodeService.duplicateNode` (BE's `duplicateSubtree`, node.service.ts) which
 * clones a whole subtree server-side but only ever RETURNS the new root — nothing in this
 * codebase called it from the UI before this task. Consumed by a later task's
 * `NodeBuilder.page.tsx` `handleDuplicateSelected`.
 *
 * Because `duplicateNode` only returns the new root, a follow-up `getNodesByPage` refetch is
 * what actually picks up the cloned descendants too. Deliberately does NOT reuse the
 * existing `reloadNodes()` helper (NodeBuilder.page.tsx) — that also calls
 * `commandManager.reset()`, wiping ALL undo history, which is wrong for a single undoable
 * Duplicate action. Instead: diff the store's ids before/after the refetch and push only the
 * ids that are new (root + its cloned descendants), matching `createAddNodeCommand`'s
 * "push only what was actually created" idiom rather than replacing the whole store.
 *
 * `getCreatedRootId` is a non-standard escape hatch on top of the shared `Command` interface
 * (CommandManager.ts) — same idiom as `createDeleteNodesCommand`'s `getRootIdsAfterLastOp` —
 * so a caller (Task 4's `handleDuplicateSelected`) can select exactly the duplicated root
 * after execute()/redo(), without this file needing to know anything about selection.
 */
export function createDuplicateNodeCommand<T extends NodeRow>(
    rootId: string,
    pageId: string,
    getNodes: () => T[],
    setNodes: SetStoreFunction<T[]>,
): Command & { getCreatedRootId: () => string | undefined } {
    let createdRootId: string | undefined;
    let createdIds: string[] = [];

    return {
        label: t('cms.node.commands.duplicateLabel'),
        execute: async () => {
            const beforeIds = new Set(getNodes().map((n) => n.id).filter((id): id is string => !!id));
            const clonedRoot = await NodeService.duplicateNode({ id: rootId });
            const fresh = await NodeService.getNodesByPage({ pageId });
            const newNodes = fresh.filter((n) => n.id && !beforeIds.has(n.id));
            createdRootId = clonedRoot.id;
            createdIds = newNodes.map((n) => n.id!).filter(Boolean);
            setNodes(produce((nodes) => { nodes.push(...(newNodes as unknown as T[])); }));
        },
        undo: async () => {
            if (!createdRootId) return;
            await NodeService.deleteNode({ id: createdRootId });
            setNodes((nodes) => nodes.filter((n) => !n.id || !createdIds.includes(n.id)));
        },
        getCreatedRootId: () => createdRootId,
    };
}
