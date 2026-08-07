import type { EditorCore, EditorModule } from '../types';
import { closestBlock, getCurrentRange, getSelectedBlocks, setBlockTag, unwrapSelection } from '../core/Selection';

function isBlockTag(core: EditorCore, tag: string): boolean {
  const range = getCurrentRange(core.root);
  const block = range && closestBlock(range.startContainer, core.root);
  return block?.tagName === tag;
}

function isInBlockquote(core: EditorCore): boolean {
  const range = getCurrentRange(core.root);
  const block = range && closestBlock(range.startContainer, core.root);
  let el: HTMLElement | null = block;
  while (el && el !== core.root) {
    if (el.tagName === 'BLOCKQUOTE') return true;
    el = el.parentElement;
  }
  return false;
}

export const blocksModule: EditorModule = {
  name: 'blocks',
  commands: {
    paragraph: { exec: (core) => setBlockTag(core.root, 'p') },
    heading1: { exec: (core) => setBlockTag(core.root, 'h1'), isActive: (core) => isBlockTag(core, 'H1') },
    heading2: { exec: (core) => setBlockTag(core.root, 'h2'), isActive: (core) => isBlockTag(core, 'H2') },
    heading3: { exec: (core) => setBlockTag(core.root, 'h3'), isActive: (core) => isBlockTag(core, 'H3') },
    heading4: { exec: (core) => setBlockTag(core.root, 'h4'), isActive: (core) => isBlockTag(core, 'H4') },
    blockquote: {
      exec: (core) => {
        if (isInBlockquote(core)) {
          unwrapSelection(core.root, (el) => el.tagName === 'BLOCKQUOTE');
          return;
        }
        const range = getCurrentRange(core.root);
        if (!range) return;
        const blocks = getSelectedBlocks(core.root, range);
        if (!blocks.length) return;
        const bq = document.createElement('blockquote');
        blocks[0].replaceWith(bq);
        for (let i = 0; i < blocks.length; i++) {
          bq.appendChild(blocks[i]);
        }
        const newRange = document.createRange();
        newRange.selectNodeContents(bq);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(newRange);
      },
      isActive: (core) => isInBlockquote(core),
    },
    codeBlock: {
      exec: (core) => {
        const range = getCurrentRange(core.root);
        if (!range) return;
        const blocks = getSelectedBlocks(core.root, range);
        if (!blocks.length) return;
        const block = blocks[0];
        if (block.tagName === 'PRE') {
          const p = document.createElement('p');
          p.textContent = block.textContent;
          block.replaceWith(p);
          const newRange = document.createRange();
          newRange.selectNodeContents(p);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(newRange);
        } else {
          const pre = document.createElement('pre');
          const code = document.createElement('code');
          code.textContent = block.textContent;
          pre.appendChild(code);
          block.replaceWith(pre);
          const newRange = document.createRange();
          newRange.selectNodeContents(pre);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(newRange);
        }
      },
      isActive: (core) => isBlockTag(core, 'PRE'),
    },
    horizontalLine: {
      exec: (core) => {
        const range = getCurrentRange(core.root);
        const block = range && closestBlock(range.startContainer, core.root);
        const hr = document.createElement('hr');
        const newP = document.createElement('p');
        newP.appendChild(document.createElement('br'));
        if (block) {
          block.after(hr);
          hr.after(newP);
        } else {
          core.root.appendChild(hr);
          core.root.appendChild(newP);
        }
        const newRange = document.createRange();
        newRange.setStart(newP, 0);
        newRange.collapse(true);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(newRange);
      },
    },
  },
};
