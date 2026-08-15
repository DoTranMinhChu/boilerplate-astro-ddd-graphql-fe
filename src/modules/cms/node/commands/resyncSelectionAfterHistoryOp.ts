// src/modules/cms/node/commands/resyncSelectionAfterHistoryOp.ts
//
// Task 7 review-finding fix — extracted out of NodeBuilder.page.tsx's inline
// `resyncSelectionAfterHistoryOp` so this exact class of bug (the generic "select every
// id that's new after an undo/redo" diff over-selecting createDeleteNodesCommand's
// recreated descendants, not just its recreated root(s)) has a real, non-component test —
// following this plan's established pattern of pure-logic-functions-get-real-tests
// (computeReorder.ts, flattenTree.ts).
import type { Command } from './CommandManager';

/**
 * Non-standard escape hatch some `Command` factories attach to the object they return —
 * currently only `createDeleteNodesCommand` (nodeCommands.ts). Deliberately NOT part of
 * the shared `Command` interface (CommandManager.ts): Add/Move/MoveNodes/UpdateProperty
 * don't need it (Add's generic "select the 1 new id" behavior is already correct; Move/
 * MoveNodes/UpdateProperty never add/remove ids, so the generic diff already correctly
 * does nothing for them) — broadening the shared interface for a bug this narrowly scoped
 * would be unnecessary scope creep.
 */
export interface HasRootIdsAfterLastOp {
    /** Which ids should end up selected after this command's last execute()/undo(),
     * bypassing the generic all-new-ids diff. `createDeleteNodesCommand` returns its
     * (possibly server-id-remapped) original root ids here — see nodeCommands.ts. */
    getRootIdsAfterLastOp: () => string[];
}

/** Type guard a caller uses to check for the escape hatch above on a plain `Command`
 * (e.g. one just popped off `CommandManager`'s undo/redo stack, which only knows about
 * the shared `Command` shape) — via `in`/duck-typing, not an `instanceof` check, since
 * `createDeleteNodesCommand`'s return value is a plain object literal, not a class instance. */
export function hasRootIdsAfterLastOp(command: Command): command is Command & HasRootIdsAfterLastOp {
    return typeof (command as Partial<HasRootIdsAfterLastOp>).getRootIdsAfterLastOp === 'function';
}

/**
 * Pure decision logic: given the store's node ids immediately before an undo()/redo() call
 * and immediately after, plus the selection as it stood right before the resync, computes
 * which ids should end up selected.
 *
 * - `overrideIds` (from a command's `getRootIdsAfterLastOp()`, when the command that just
 *   ran/undid exposes the escape hatch above) wins outright: the result is exactly those
 *   ids, intersected with what's actually present in `afterIds` — an id the override names
 *   that no longer exists after the op (shouldn't normally happen, but defensive) is
 *   silently dropped rather than selected.
 * - Otherwise, the generic rule (correct for every other command type — see
 *   `HasRootIdsAfterLastOp`'s doc comment): any id newly present after the op gets selected
 *   (covers Add's created id on redo, and Delete's undo() when no override is given); if
 *   nothing new appeared, any previously-selected id that vanished is dropped and every
 *   other previously-selected id that's still present is kept as-is.
 */
export function computeResyncedSelectionIds(
    beforeIds: ReadonlySet<string>,
    afterIds: readonly string[],
    currentSelectedIds: ReadonlySet<string>,
    overrideIds?: readonly string[],
): Set<string> {
    const afterIdSet = new Set(afterIds);

    if (overrideIds) {
        return new Set(overrideIds.filter((id) => afterIdSet.has(id)));
    }

    const newIds = afterIds.filter((id) => !beforeIds.has(id));
    if (newIds.length > 0) {
        return new Set(newIds);
    }

    return new Set([...currentSelectedIds].filter((id) => afterIdSet.has(id)));
}
