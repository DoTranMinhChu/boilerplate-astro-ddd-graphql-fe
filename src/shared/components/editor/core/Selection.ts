import type { SelectionPath } from '../types';

const BLOCK_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE', 'LI', 'DIV', 'TD', 'TH']);

function getNodePath(root: HTMLElement, node: Node): number[] {
  const path: number[] = [];
  let current: Node | null = node;
  while (current && current !== root) {
    const parent: Node | null = current.parentNode;
    if (!parent) break;
    const index = Array.prototype.indexOf.call(parent.childNodes, current);
    path.unshift(index);
    current = parent;
  }
  return path;
}

function getNodeByPath(root: HTMLElement, path: number[]): Node | null {
  let current: Node = root;
  for (const index of path) {
    if (!current.childNodes[index]) return null;
    current = current.childNodes[index];
  }
  return current;
}

export function saveSelectionPath(root: HTMLElement): SelectionPath | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
  return {
    start: getNodePath(root, range.startContainer),
    startOffset: range.startOffset,
    end: getNodePath(root, range.endContainer),
    endOffset: range.endOffset,
  };
}

export function restoreSelectionPath(root: HTMLElement, path: SelectionPath | null): void {
  if (!path) return;
  const startNode = getNodeByPath(root, path.start);
  const endNode = getNodeByPath(root, path.end);
  if (!startNode || !endNode) return;
  const range = document.createRange();
  try {
    const startMax = startNode.nodeType === Node.TEXT_NODE ? (startNode.textContent?.length ?? 0) : startNode.childNodes.length;
    const endMax = endNode.nodeType === Node.TEXT_NODE ? (endNode.textContent?.length ?? 0) : endNode.childNodes.length;
    range.setStart(startNode, Math.min(path.startOffset, startMax));
    range.setEnd(endNode, Math.min(path.endOffset, endMax));
  } catch {
    return;
  }
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

export function getCurrentRange(root: HTMLElement): Range | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return null;
  return range;
}

export function closestAncestor(root: HTMLElement, node: Node, matches: (el: HTMLElement) => boolean): HTMLElement | null {
  let el: Node | null = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
  while (el && el !== root) {
    if (el.nodeType === Node.ELEMENT_NODE && matches(el as HTMLElement)) return el as HTMLElement;
    el = el.parentNode;
  }
  return null;
}

export function closestBlock(node: Node, root: HTMLElement): HTMLElement | null {
  return closestAncestor(root, node, (el) => BLOCK_TAGS.has(el.tagName));
}

export function getSelectedBlocks(root: HTMLElement, range: Range): HTMLElement[] {
  const startBlock = closestBlock(range.startContainer, root);
  const endBlock = closestBlock(range.endContainer, root);
  if (!startBlock) return [];
  if (!endBlock || startBlock === endBlock) return [startBlock];
  const blocks: HTMLElement[] = [];
  let node: Node | null = startBlock;
  while (node) {
    if (node.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has((node as HTMLElement).tagName)) {
      blocks.push(node as HTMLElement);
    }
    if (node === endBlock) break;
    node = node.nextSibling;
  }
  return blocks.length ? blocks : [startBlock];
}

export function setBlockTag(root: HTMLElement, tagName: string): void {
  const range = getCurrentRange(root);
  if (!range) return;
  const blocks = getSelectedBlocks(root, range);
  let lastNewEl: HTMLElement | null = null;
  blocks.forEach((block) => {
    const newEl = document.createElement(tagName);
    newEl.innerHTML = block.innerHTML;
    block.replaceWith(newEl);
    lastNewEl = newEl;
  });
  if (lastNewEl) {
    const newRange = document.createRange();
    newRange.selectNodeContents(lastNewEl);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(newRange);
  }
}

export function setBlockStyle(root: HTMLElement, prop: string, value: string): void {
  const range = getCurrentRange(root);
  if (!range) return;
  getSelectedBlocks(root, range).forEach((block) => block.style.setProperty(prop, value));
}

export function wrapSelection(root: HTMLElement, tagName: string, style?: Partial<CSSStyleDeclaration>): HTMLElement | null {
  const range = getCurrentRange(root);
  if (!range || range.collapsed) return null;
  const wrapper = document.createElement(tagName);
  if (style) Object.assign(wrapper.style, style);
  wrapper.appendChild(range.extractContents());
  range.insertNode(wrapper);
  const newRange = document.createRange();
  newRange.selectNodeContents(wrapper);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(newRange);
  return wrapper;
}

export function unwrapSelection(root: HTMLElement, matches: (el: HTMLElement) => boolean): void {
  const range = getCurrentRange(root);
  if (!range) return;
  const el = closestAncestor(root, range.commonAncestorContainer, matches);
  if (!el) return;
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

export function isSelectionWrapped(root: HTMLElement, matches: (el: HTMLElement) => boolean): boolean {
  const range = getCurrentRange(root);
  if (!range) return false;
  return !!closestAncestor(root, range.commonAncestorContainer, matches);
}

export function toggleWrap(root: HTMLElement, tagName: string, matches: (el: HTMLElement) => boolean): void {
  if (isSelectionWrapped(root, matches)) {
    unwrapSelection(root, matches);
  } else {
    wrapSelection(root, tagName);
  }
}
