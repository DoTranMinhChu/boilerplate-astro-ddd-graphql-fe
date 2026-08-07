// src/core/components/control/editor/core/EditorCore.ts
import DOMPurify from 'isomorphic-dompurify';
import type { EditorCommand, EditorModule, ImageChangeEvent } from '../types';
import { HistoryManager } from './HistoryManager';
import { getCurrentRange } from './Selection';

type EditorEventMap = {
  change: (html: string) => void;
  selectionchange: () => void;
  imageChange: (event: ImageChangeEvent) => void;
};

const PASTE_ALLOWED_TAGS = [
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'ul', 'ol', 'li',
  'a', 'img', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'figure', 'figcaption',
  'iframe', 'b', 'strong', 'i', 'em', 'u', 's', 'span', 'br', 'hr',
];
const PASTE_ALLOWED_ATTR = ['href', 'src', 'alt', 'style', 'colspan', 'rowspan', 'class', 'allowfullscreen'];

export class EditorCore {
  readonly root: HTMLElement;
  readonly history: HistoryManager;
  readonly commands: Record<string, EditorCommand> = {};
  private listeners: { [K in keyof EditorEventMap]?: EditorEventMap[K][] } = {};

  constructor(root: HTMLElement, modules: EditorModule[]) {
    this.root = root;
    this.root.contentEditable = 'true';
    this.history = new HistoryManager(root);

    modules.forEach((mod) => Object.assign(this.commands, mod.commands ?? {}));

    this.root.addEventListener('input', this.handleInput);
    this.root.addEventListener('keydown', this.handleKeyDown);
    this.root.addEventListener('paste', this.handlePaste);
    document.addEventListener('selectionchange', this.handleSelectionChange);

    modules.forEach((mod) => mod.setup?.(this));
  }

  destroy(): void {
    this.root.removeEventListener('input', this.handleInput);
    this.root.removeEventListener('keydown', this.handleKeyDown);
    this.root.removeEventListener('paste', this.handlePaste);
    document.removeEventListener('selectionchange', this.handleSelectionChange);
  }

  on<K extends keyof EditorEventMap>(event: K, handler: EditorEventMap[K]): () => void {
    const list = (this.listeners[event] ??= [] as any);
    list.push(handler as any);
    return () => {
      this.listeners[event] = (this.listeners[event] as any[]).filter((h) => h !== handler) as any;
    };
  }

  private emit<K extends keyof EditorEventMap>(event: K, ...args: Parameters<EditorEventMap[K]>): void {
    (this.listeners[event] as any[] | undefined)?.forEach((handler) => handler(...args));
  }

  emitChange(): void {
    this.emit('change', this.getData());
  }

  emitSelectionChange(): void {
    this.emit('selectionchange');
  }

  emitImageChange(event: ImageChangeEvent): void {
    this.emit('imageChange', event);
  }

  /** Commits the current DOM state to history and fires a change event. Used by code
   * that mutates the DOM outside the exec() flow — e.g. a continuous pointer-drag
   * operation, where only the final state should become one undo step. */
  commitHistory(): void {
    this.history.commit();
    this.emitChange();
  }

  exec(name: string, ...args: any[]): void {
    const command = this.commands[name];
    if (!command) return;
    this.root.focus();
    command.exec(this, ...args);
    this.commitHistory();
    this.emitSelectionChange();
  }

  isActive(name: string): boolean {
    const command = this.commands[name];
    return command?.isActive ? command.isActive(this) : false;
  }

  undo(): void {
    this.history.undo();
    this.emitChange();
    this.emitSelectionChange();
  }

  redo(): void {
    this.history.redo();
    this.emitChange();
    this.emitSelectionChange();
  }

  /** Serialized content, with any `data-editor-ui="true"` marked nodes (transient
   * UI-only elements, e.g. an in-progress image-upload placeholder) stripped out. */
  getData(): string {
    const clone = this.root.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[data-editor-ui="true"]').forEach((el) => el.remove());
    return clone.innerHTML;
  }

  setData(html: string): void {
    this.root.innerHTML = html;
    this.history.reset();
  }

  focus(): void {
    this.root.focus();
  }

  private handleInput = (): void => {
    this.history.scheduleTypingCommit();
    this.emitChange();
  };

  private handleSelectionChange = (): void => {
    if (document.activeElement !== this.root && !this.root.contains(document.activeElement)) return;
    this.emitSelectionChange();
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    const isMod = e.ctrlKey || e.metaKey;
    if (!isMod) return;
    const key = e.key.toLowerCase();
    if (key === 'z' && !e.shiftKey) {
      e.preventDefault();
      this.undo();
    } else if ((key === 'z' && e.shiftKey) || key === 'y') {
      e.preventDefault();
      this.redo();
    }
  };

  private handlePaste = (e: ClipboardEvent): void => {
    e.preventDefault();
    const range = getCurrentRange(this.root);
    if (!range) return;
    const html = e.clipboardData?.getData('text/html');
    const text = e.clipboardData?.getData('text/plain') ?? '';

    let fragment: DocumentFragment;
    if (html) {
      const clean = DOMPurify.sanitize(html, { ALLOWED_TAGS: PASTE_ALLOWED_TAGS, ALLOWED_ATTR: PASTE_ALLOWED_ATTR });
      const template = document.createElement('template');
      template.innerHTML = clean;
      fragment = template.content;
    } else {
      fragment = document.createDocumentFragment();
      text.split(/\r?\n/).forEach((line) => {
        const p = document.createElement('p');
        p.textContent = line;
        fragment.appendChild(p);
      });
    }

    range.deleteContents();
    const lastNode = fragment.lastChild;
    range.insertNode(fragment);
    if (lastNode) {
      const newRange = document.createRange();
      newRange.setStartAfter(lastNode);
      newRange.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(newRange);
    }

    this.commitHistory();
    this.emitSelectionChange();
  };
}
