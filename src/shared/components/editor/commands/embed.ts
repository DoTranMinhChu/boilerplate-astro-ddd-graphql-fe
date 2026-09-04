// src/shared/components/editor/commands/embed.ts
import type { EditorModule } from '../types';
import { closestBlock, getCurrentRange } from '../core/Selection';
import { isSafeHref } from './link';

function toEmbedUrl(url: string): string | null {
  const youtube = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

export const embedModule: EditorModule = {
  name: 'embed',
  commands: {
    insertEmbed: {
      exec: (core, url: string) => {
        const range = getCurrentRange(core.root);
        if (!range) return;
        const embedUrl = toEmbedUrl(url);
        if (embedUrl) {
          const figure = document.createElement('figure');
          figure.className = 'media';
          const wrapper = document.createElement('div');
          wrapper.setAttribute('style', 'position:relative;padding-top:56.25%');
          const iframe = document.createElement('iframe');
          iframe.src = embedUrl;
          iframe.setAttribute('style', 'position:absolute;inset:0;width:100%;height:100%');
          iframe.setAttribute('allowfullscreen', 'true');
          wrapper.appendChild(iframe);
          figure.appendChild(wrapper);
          // Block-level: insert relative to the enclosing block so it never ends up nested
          // inline inside a <p>. A table cell is itself a BLOCK_TAG, so `.after()` there
          // would make the figure a stray <tr> child and the parser would foster-parent it
          // out of the table on the next round-trip — nest inside the cell instead.
          const block = closestBlock(range.startContainer, core.root);
          if (block && (block.tagName === 'TD' || block.tagName === 'TH')) {
            block.appendChild(figure);
          } else if (block) {
            block.after(figure);
          } else {
            core.root.appendChild(figure);
          }
          return;
        }
        // Fallback: an inline <a>, which carries no nesting-corruption risk and belongs at
        // the caret where the user confirmed the URL — not after the enclosing block.
        if (!isSafeHref(url)) return;
        const a = document.createElement('a');
        a.href = url;
        a.textContent = url;
        range.collapse(false);
        range.insertNode(a);
      },
    },
  },
};
