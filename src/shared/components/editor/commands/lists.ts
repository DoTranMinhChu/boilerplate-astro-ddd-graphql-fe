import type { EditorCore, EditorModule } from '../types';
import { closestAncestor, closestBlock, getCurrentRange } from '../core/Selection';

function closestListItem(core: EditorCore, node: Node): HTMLLIElement | null {
  return closestAncestor(core.root, node, (el) => el.tagName === 'LI') as HTMLLIElement | null;
}

function toggleList(core: EditorCore, listTag: 'UL' | 'OL'): void {
  const range = getCurrentRange(core.root);
  if (!range) return;
  const li = closestListItem(core, range.startContainer);
  if (li) {
    const list = li.parentElement!;
    if (list.tagName === listTag) {
      let lastNewP: HTMLElement | null = null;
      Array.from(list.children).forEach((child) => {
        const p = document.createElement('p');
        p.innerHTML = (child as HTMLElement).innerHTML;
        list.parentElement!.insertBefore(p, list);
        lastNewP = p;
      });
      list.remove();
      if (lastNewP) {
        const newRange = document.createRange();
        newRange.selectNodeContents(lastNewP);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(newRange);
      }
      return;
    }
    const newList = document.createElement(listTag.toLowerCase());
    newList.innerHTML = list.innerHTML;
    list.replaceWith(newList);
    const newRange = document.createRange();
    newRange.selectNodeContents(newList);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(newRange);
    return;
  }
  const block = closestBlock(range.startContainer, core.root);
  if (!block) return;
  const list = document.createElement(listTag.toLowerCase());
  const newLi = document.createElement('li');
  newLi.innerHTML = block.innerHTML;
  list.appendChild(newLi);
  block.replaceWith(list);
  const newRange = document.createRange();
  newRange.selectNodeContents(list);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(newRange);
}

function isInList(core: EditorCore, listTag: 'UL' | 'OL'): boolean {
  const range = getCurrentRange(core.root);
  const li = range && closestListItem(core, range.startContainer);
  return li?.parentElement?.tagName === listTag;
}

export const listsModule: EditorModule = {
  name: 'lists',
  commands: {
    bulletedList: { exec: (core) => toggleList(core, 'UL'), isActive: (core) => isInList(core, 'UL') },
    numberedList: { exec: (core) => toggleList(core, 'OL'), isActive: (core) => isInList(core, 'OL') },
    indent: {
      exec: (core) => {
        const range = getCurrentRange(core.root);
        const li = range && closestListItem(core, range.startContainer);
        if (!li) return;
        const prev = li.previousElementSibling as HTMLLIElement | null;
        if (!prev) return;
        const list = li.parentElement!;
        const sublistTag = list.tagName.toLowerCase();
        let sublist = prev.querySelector(`:scope > ${sublistTag}`) as HTMLElement | null;
        if (!sublist) {
          sublist = document.createElement(sublistTag);
          prev.appendChild(sublist);
        }
        sublist.appendChild(li);
      },
    },
    outdent: {
      exec: (core) => {
        const range = getCurrentRange(core.root);
        const li = range && closestListItem(core, range.startContainer);
        if (!li) return;
        const parentList = li.parentElement!;
        const grandLi = parentList.parentElement;
        if (!grandLi || grandLi.tagName !== 'LI') return;
        const outerList = grandLi.parentElement!;
        outerList.insertBefore(li, grandLi.nextSibling);
        if (!parentList.children.length) parentList.remove();
      },
    },
  },
};
