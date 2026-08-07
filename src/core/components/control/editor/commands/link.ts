import type { EditorCore, EditorModule } from '../types';
import { closestAncestor, isSelectionWrapped, unwrapSelection, wrapSelection } from '../core/Selection';

const SAFE_HREF_PATTERN = /^(https?:|mailto:|tel:|\/|#)/i;

export function isSafeHref(href: string): boolean {
  return SAFE_HREF_PATTERN.test(href.trim());
}

export function findLink(core: EditorCore): HTMLAnchorElement | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  return closestAncestor(core.root, sel.getRangeAt(0).startContainer, (el) => el.tagName === 'A') as HTMLAnchorElement | null;
}

const URL_PATTERN = /(https?:\/\/[^\s<]+)$/i;

function autoLinkLastWord(root: HTMLElement): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return;
  const node = sel.anchorNode;
  if (!node || node.nodeType !== Node.TEXT_NODE) return;
  const text = node.textContent ?? '';
  const cursor = sel.anchorOffset;
  if (cursor === 0 || text[cursor - 1] !== ' ') return;
  const before = text.slice(0, cursor - 1);
  const match = before.match(URL_PATTERN);
  if (!match) return;
  const url = match[0];
  const start = before.length - url.length;
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, cursor);
  const a = document.createElement('a');
  a.href = url;
  a.textContent = url;
  range.deleteContents();
  range.insertNode(a);
  const spaceNode = document.createTextNode(' ');
  a.after(spaceNode);
  const newRange = document.createRange();
  newRange.setStart(spaceNode, 1);
  newRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(newRange);
}

export const linkModule: EditorModule = {
  name: 'link',
  commands: {
    setLink: {
      exec: (core, href: string) => {
        if (!isSafeHref(href)) return;
        const existing = findLink(core);
        if (existing) {
          existing.setAttribute('href', href);
          return;
        }
        wrapSelection(core.root, 'a');
        findLink(core)?.setAttribute('href', href);
      },
    },
    unlink: {
      exec: (core) => unwrapSelection(core.root, (el) => el.tagName === 'A'),
      isActive: (core) => isSelectionWrapped(core.root, (el) => el.tagName === 'A'),
    },
  },
  setup: (core) => {
    const handler = () => autoLinkLastWord(core.root);
    core.root.addEventListener('input', handler);
    return () => core.root.removeEventListener('input', handler);
  },
};
