import type { SelectionPath } from '../types';
import { saveSelectionPath, restoreSelectionPath } from './Selection';

const MAX_HISTORY = 100;
const TYPING_DEBOUNCE_MS = 500;

interface HistoryEntry {
  html: string;
  selection: SelectionPath | null;
}

export class HistoryManager {
  private root: HTMLElement;
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private typingTimer: ReturnType<typeof setTimeout> | null = null;
  private isApplying = false;

  constructor(root: HTMLElement) {
    this.root = root;
    this.undoStack = [this.snapshot()];
  }

  private snapshot(): HistoryEntry {
    return { html: this.root.innerHTML, selection: saveSelectionPath(this.root) };
  }

  /** Call immediately after a command finishes mutating the DOM. */
  commit(): void {
    if (this.isApplying) return;
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }
    this.push();
  }

  /** Call on every `input` event; debounces continuous typing into one snapshot per pause. */
  scheduleTypingCommit(): void {
    if (this.isApplying) return;
    if (this.typingTimer) clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => {
      this.push();
      this.typingTimer = null;
    }, TYPING_DEBOUNCE_MS);
  }

  private push(): void {
    const current = this.snapshot();
    const top = this.undoStack[this.undoStack.length - 1];
    if (top && top.html === current.html) return;
    this.undoStack.push(current);
    if (this.undoStack.length > MAX_HISTORY) this.undoStack.shift();
    this.redoStack = [];
  }

  canUndo(): boolean {
    return this.undoStack.length > 1;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo(): void {
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
      this.push();
    }
    if (!this.canUndo()) return;
    const current = this.undoStack.pop()!;
    this.redoStack.push(current);
    this.apply(this.undoStack[this.undoStack.length - 1]);
  }

  redo(): void {
    if (!this.canRedo()) return;
    const next = this.redoStack.pop()!;
    this.undoStack.push(next);
    this.apply(next);
  }

  private apply(entry: HistoryEntry): void {
    this.isApplying = true;
    this.root.innerHTML = entry.html;
    restoreSelectionPath(this.root, entry.selection);
    this.isApplying = false;
  }

  /** Call after loading new external content (e.g. `setData`) — clears history so the
   * freshly-loaded content becomes the new undo baseline. */
  reset(): void {
    this.undoStack = [this.snapshot()];
    this.redoStack = [];
  }
}
