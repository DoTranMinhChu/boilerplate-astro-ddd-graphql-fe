import { createSignal, type Accessor } from 'solid-js';

/**
 * 1 thao tác sửa dữ liệu (thêm/xoá/sửa/di chuyển Node) đóng gói thành 1 Command
 * có cặp execute/undo — nền tảng Undo/Redo dùng chung cho toàn bộ Phase 1
 * (M1a's Layers panel, và M1b/M1c/M1d's numeric panel/canvas drag sau này).
 */
export interface Command {
    /** Hiển thị trong tooltip nút Undo/Redo, vd "Xoá 2 phần tử". */
    label: string;
    execute: () => void | Promise<void>;
    undo: () => void | Promise<void>;
}

const MAX_STACK_SIZE = 100;

/**
 * Stack Solid-reactive (không phải mảng thường) — Task 7's nút Undo/Redo trên header
 * bar cần tự động cập nhật disabled-state/tooltip label ngay khi stack đổi, không
 * cần trigger re-render thủ công. `createSignal` hoạt động tốt ngoài component miễn
 * gọi trong 1 `createRoot`/component scope (đây là instance-per-NodeBuilder-mount,
 * không phải singleton toàn app).
 */
export class CommandManager {
    private undoStack: Accessor<Command[]>;
    private setUndoStack: (updater: (prev: Command[]) => Command[]) => void;
    private redoStack: Accessor<Command[]>;
    private setRedoStack: (updater: (prev: Command[]) => Command[]) => void;

    constructor() {
        const [undoStack, setUndoStack] = createSignal<Command[]>([]);
        const [redoStack, setRedoStack] = createSignal<Command[]>([]);
        this.undoStack = undoStack;
        this.setUndoStack = setUndoStack;
        this.redoStack = redoStack;
        this.setRedoStack = setRedoStack;
    }

    /** Chạy 1 Command mới: execute() ngay, đẩy vào undo stack, xoá redo stack cũ
     * (đúng convention mọi editor thật — 1 thao tác mới sau khi undo sẽ xoá nhánh redo cũ). */
    async run(command: Command): Promise<void> {
        await command.execute();
        this.setUndoStack((prev) => {
            const next = [...prev, command];
            return next.length > MAX_STACK_SIZE ? next.slice(next.length - MAX_STACK_SIZE) : next;
        });
        this.setRedoStack(() => []);
    }

    async undo(): Promise<void> {
        const stack = this.undoStack();
        const command = stack.at(-1);
        if (!command) return;
        await command.undo();
        this.setUndoStack((prev) => prev.slice(0, -1));
        this.setRedoStack((prev) => [...prev, command]);
    }

    async redo(): Promise<void> {
        const stack = this.redoStack();
        const command = stack.at(-1);
        if (!command) return;
        await command.execute();
        this.setRedoStack((prev) => prev.slice(0, -1));
        this.setUndoStack((prev) => [...prev, command]);
    }

    canUndo(): boolean {
        return this.undoStack().length > 0;
    }

    canRedo(): boolean {
        return this.redoStack().length > 0;
    }

    peekUndoLabel(): string | undefined {
        return this.undoStack().at(-1)?.label;
    }

    peekRedoLabel(): string | undefined {
        return this.redoStack().at(-1)?.label;
    }

    /** Full `Command` object (not just its label) currently on top of the undo stack —
     * e.g. used right after redo() to look up the command that was just redone (redo()
     * moves it onto the top of the undo stack), so a caller can check for a command-type
     * -specific escape hatch (see nodeCommands.ts's `createDeleteNodesCommand` /
     * resyncSelectionAfterHistoryOp.ts's `hasRootIdsAfterLastOp`) without this class
     * needing to know anything about that escape hatch itself. Purely additive — does NOT
     * change undo()/redo()'s existing void-ish return signature, and does NOT touch the
     * `Command` interface. */
    peekUndoCommand(): Command | undefined {
        return this.undoStack().at(-1);
    }

    /** Mirror of `peekUndoCommand()` for the redo stack — used right after undo() to look
     * up the command that was just undone (undo() moves it onto the top of the redo stack). */
    peekRedoCommand(): Command | undefined {
        return this.redoStack().at(-1);
    }
}
