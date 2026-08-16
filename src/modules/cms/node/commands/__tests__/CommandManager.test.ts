import { describe, it, expect, vi } from 'vitest';
import { createRoot } from 'solid-js';
import { CommandManager } from '../CommandManager';

function makeCommand(label: string, log: string[]) {
    return {
        label,
        execute: vi.fn(async () => { log.push(`execute:${label}`); }),
        undo: vi.fn(async () => { log.push(`undo:${label}`); }),
    };
}

// CommandManager uses createSignal internally (Task 7 needs live-reactive
// canUndo/canRedo for the header Undo/Redo buttons) — instantiate within
// createRoot in every test, matching this codebase's own convention for
// testing Solid primitives outside a component tree (see NodeSelectionContext's
// tests, Task 2).
describe('CommandManager', () => {
    it('run() executes the command and makes it undoable', async () => {
        await createRoot(async (dispose) => {
            const manager = new CommandManager();
            const log: string[] = [];
            const cmd = makeCommand('add', log);

            await manager.run(cmd);

            expect(cmd.execute).toHaveBeenCalledTimes(1);
            expect(log).toEqual(['execute:add']);
            expect(manager.canUndo()).toBe(true);
            expect(manager.canRedo()).toBe(false);
            expect(manager.peekUndoLabel()).toBe('add');
            dispose();
        });
    });

    it('undo() calls the command\'s undo and moves it to the redo stack', async () => {
        await createRoot(async (dispose) => {
            const manager = new CommandManager();
            const log: string[] = [];
            const cmd = makeCommand('delete', log);
            await manager.run(cmd);

            await manager.undo();

            expect(cmd.undo).toHaveBeenCalledTimes(1);
            expect(log).toEqual(['execute:delete', 'undo:delete']);
            expect(manager.canUndo()).toBe(false);
            expect(manager.canRedo()).toBe(true);
            expect(manager.peekRedoLabel()).toBe('delete');
            dispose();
        });
    });

    it('redo() re-executes the command and moves it back to the undo stack', async () => {
        await createRoot(async (dispose) => {
            const manager = new CommandManager();
            const log: string[] = [];
            const cmd = makeCommand('move', log);
            await manager.run(cmd);
            await manager.undo();

            await manager.redo();

            expect(log).toEqual(['execute:move', 'undo:move', 'execute:move']);
            expect(manager.canUndo()).toBe(true);
            expect(manager.canRedo()).toBe(false);
            dispose();
        });
    });

    it('running a new command after undo() clears the redo stack', async () => {
        await createRoot(async (dispose) => {
            const manager = new CommandManager();
            const log: string[] = [];
            const cmd1 = makeCommand('first', log);
            const cmd2 = makeCommand('second', log);
            await manager.run(cmd1);
            await manager.undo();

            await manager.run(cmd2);

            expect(manager.canRedo()).toBe(false);
            dispose();
        });
    });

    it('undo() on an empty stack is a no-op, does not throw', async () => {
        await createRoot(async (dispose) => {
            const manager = new CommandManager();
            await expect(manager.undo()).resolves.toBeUndefined();
            expect(manager.canUndo()).toBe(false);
            dispose();
        });
    });

    it('redo() on an empty stack is a no-op, does not throw', async () => {
        await createRoot(async (dispose) => {
            const manager = new CommandManager();
            await expect(manager.redo()).resolves.toBeUndefined();
            dispose();
        });
    });

    it('peekUndoCommand()/peekRedoCommand() expose the full Command object (Task 7 fix — resyncSelectionAfterHistoryOp needs the command instance, not just its label)', async () => {
        await createRoot(async (dispose) => {
            const manager = new CommandManager();
            const log: string[] = [];
            const cmd = makeCommand('delete', log);
            await manager.run(cmd);
            expect(manager.peekUndoCommand()).toBe(cmd);
            expect(manager.peekRedoCommand()).toBeUndefined();

            await manager.undo();
            // undo() moves the command onto the top of the redo stack.
            expect(manager.peekRedoCommand()).toBe(cmd);
            expect(manager.peekUndoCommand()).toBeUndefined();

            await manager.redo();
            // redo() moves it back onto the top of the undo stack.
            expect(manager.peekUndoCommand()).toBe(cmd);
            expect(manager.peekRedoCommand()).toBeUndefined();
            dispose();
        });
    });

    // Phase 1d — reset() is called by NodeBuilder.page.tsx's reloadNodes() whenever the
    // whole node tree is replaced by fresh server data (e.g. Version History restore);
    // every Command on either stack would reference now-nonexistent node ids.
    it('reset() clears both stacks so canUndo()/canRedo() both become false', async () => {
        await createRoot(async (dispose) => {
            const manager = new CommandManager();
            const log: string[] = [];
            const cmd = makeCommand('add', log);
            await manager.run(cmd);
            await manager.undo();
            // Sanity check the fixture's state before reset(): undo stack already empty
            // (the one run() was popped by undo()), redo stack populated by that undo().
            expect(manager.canUndo()).toBe(false);
            expect(manager.canRedo()).toBe(true);

            manager.reset();

            expect(manager.canUndo()).toBe(false);
            expect(manager.canRedo()).toBe(false);
            dispose();
        });
    });

    it('reset() after run()+undo() (both stacks populated) clears both', async () => {
        await createRoot(async (dispose) => {
            const manager = new CommandManager();
            const log: string[] = [];
            const cmd1 = makeCommand('first', log);
            const cmd2 = makeCommand('second', log);
            await manager.run(cmd1);
            await manager.run(cmd2);
            await manager.undo();
            // Now undo stack has cmd1, redo stack has cmd2 -- both non-empty.
            expect(manager.canUndo()).toBe(true);
            expect(manager.canRedo()).toBe(true);

            manager.reset();

            expect(manager.canUndo()).toBe(false);
            expect(manager.canRedo()).toBe(false);
            dispose();
        });
    });

    it('undo() after reset() is a no-op, does not throw', async () => {
        await createRoot(async (dispose) => {
            const manager = new CommandManager();
            const log: string[] = [];
            const cmd = makeCommand('add', log);
            await manager.run(cmd);

            manager.reset();

            await expect(manager.undo()).resolves.toBeUndefined();
            expect(log).toEqual(['execute:add']); // undo() never actually ran against the cleared stack
            expect(manager.canUndo()).toBe(false);
            expect(manager.canRedo()).toBe(false);
            dispose();
        });
    });

    it('redo() after reset() is a no-op, does not throw', async () => {
        await createRoot(async (dispose) => {
            const manager = new CommandManager();
            const log: string[] = [];
            const cmd = makeCommand('add', log);
            await manager.run(cmd);
            await manager.undo();

            manager.reset();

            await expect(manager.redo()).resolves.toBeUndefined();
            expect(log).toEqual(['execute:add', 'undo:add']); // redo() never actually re-ran against the cleared stack
            expect(manager.canUndo()).toBe(false);
            expect(manager.canRedo()).toBe(false);
            dispose();
        });
    });

    it('caps the undo stack at 100 entries, dropping the oldest', async () => {
        await createRoot(async (dispose) => {
            const manager = new CommandManager();
            const log: string[] = [];
            for (let i = 0; i < 105; i++) {
                await manager.run(makeCommand(`cmd-${i}`, log));
            }
            // Undo 100 times should succeed; the 101st should be a no-op (oldest 5 were dropped).
            for (let i = 0; i < 100; i++) await manager.undo();
            expect(manager.canUndo()).toBe(false);
            dispose();
        });
    });
});
