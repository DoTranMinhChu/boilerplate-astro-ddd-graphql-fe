// src/core/components/control/editor/commands/embed.ts
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
        let node: HTMLElement;
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
          node = figure;
        } else {
          if (!isSafeHref(url)) return;
          const a = document.createElement('a');
          a.href = url;
          a.textContent = url;
          node = a;
        }
        const block = closestBlock(range.startContainer, core.root);
        if (block) {
          block.after(node);
        } else {
          core.root.appendChild(node);
        }
      },
    },
  },
};
