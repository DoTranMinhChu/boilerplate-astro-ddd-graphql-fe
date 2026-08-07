// src/core/components/control/editor/commands/image.ts
import type { EditorCore, EditorModule, ImageUploadResult } from '../types';
import { closestAncestor, getCurrentRange } from '../core/Selection';

export interface ImageModuleOptions {
  onImageUpload?: (file: File) => Promise<ImageUploadResult>;
  onImageUploaded?: (url: string, data: any) => any;
  onImageChange?: (event: { url: string; type: 'insert' | 'remove' }) => any;
}

const IMAGE_FIGURE_CLASS = 'ed-image';

export function selectedFigure(core: EditorCore): HTMLElement | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  return closestAncestor(
    core.root,
    sel.getRangeAt(0).startContainer,
    (el) => el.tagName === 'FIGURE' && el.classList.contains(IMAGE_FIGURE_CLASS),
  );
}

export function createImageModule(options: ImageModuleOptions): EditorModule {
  let fileInput: HTMLInputElement | null = null;

  function pickFile(core: EditorCore): void {
    if (!fileInput) {
      fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.style.display = 'none';
      document.body.appendChild(fileInput);
    }
    fileInput.value = '';
    fileInput.onchange = () => {
      const file = fileInput!.files?.[0];
      if (file) insertImage(core, file);
    };
    fileInput.click();
  }

  async function insertImage(core: EditorCore, file: File): Promise<void> {
    const range = getCurrentRange(core.root) ?? document.createRange();
    const figure = document.createElement('figure');
    figure.className = `${IMAGE_FIGURE_CLASS} ed-image--block`;
    figure.setAttribute('data-editor-ui', 'true');
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.style.opacity = '0.5';
    figure.appendChild(img);
    range.collapse(false);
    range.insertNode(figure);

    try {
      const result = options.onImageUpload ? await options.onImageUpload(file) : null;
      figure.removeAttribute('data-editor-ui');
      img.style.opacity = '';
      if (result?.url) {
        img.src = result.url;
        options.onImageUploaded?.(result.url, result);
        options.onImageChange?.({ url: result.url, type: 'insert' });
      }
      core.commitHistory();
    } catch {
      figure.remove();
      core.commitHistory();
    }
  }

  return {
    name: 'image',
    commands: {
      insertImage: { exec: (core) => pickFile(core) },
      setImageStyle: {
        exec: (core, style: 'inline' | 'block' | 'side') => {
          const figure = selectedFigure(core);
          if (!figure) return;
          figure.className = `${IMAGE_FIGURE_CLASS} ed-image--${style}`;
        },
      },
      setImageAlt: {
        exec: (core, alt: string) => {
          const img = selectedFigure(core)?.querySelector('img');
          if (img) img.alt = alt;
        },
      },
      toggleImageCaption: {
        exec: (core) => {
          const figure = selectedFigure(core);
          if (!figure) return;
          const existing = figure.querySelector('figcaption');
          if (existing) {
            existing.remove();
            return;
          }
          const caption = document.createElement('figcaption');
          caption.contentEditable = 'true';
          figure.appendChild(caption);
        },
      },
      setImageLink: {
        exec: (core, href: string) => {
          const figure = selectedFigure(core);
          if (!figure) return;
          let link = figure.closest('a');
          if (!link) {
            link = document.createElement('a');
            figure.replaceWith(link);
            link.appendChild(figure);
          }
          link.setAttribute('href', href);
        },
      },
    },
    setup: (core) => {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.removedNodes.forEach((node) => {
            if (node.nodeType !== Node.ELEMENT_NODE) return;
            const el = node as HTMLElement;
            const images = el.matches('img') ? [el as HTMLImageElement] : Array.from(el.querySelectorAll('img'));
            images.forEach((img) => {
              if (img.src) options.onImageChange?.({ url: img.src, type: 'remove' });
            });
          });
        });
      });
      observer.observe(core.root, { childList: true, subtree: true });
    },
  };
}
