import type { EditorCommand, EditorModule } from '../types';
import { isSelectionWrapped, toggleWrap, unwrapSelection } from '../core/Selection';

function markCommand(tag: string): EditorCommand {
  const matches = (el: HTMLElement) => el.tagName === tag;
  return {
    exec: (core) => toggleWrap(core.root, tag.toLowerCase(), matches),
    isActive: (core) => isSelectionWrapped(core.root, matches),
  };
}

const REMOVABLE_MARK_TAGS = ['STRONG', 'EM', 'U', 'S', 'CODE', 'SPAN', 'A'];

export const marksModule: EditorModule = {
  name: 'marks',
  commands: {
    bold: markCommand('STRONG'),
    italic: markCommand('EM'),
    underline: markCommand('U'),
    strike: markCommand('S'),
    code: markCommand('CODE'),
    removeFormat: {
      exec: (core) => {
        let unwrapped = true;
        while (unwrapped) {
          unwrapped = false;
          for (const tag of REMOVABLE_MARK_TAGS) {
            const matches = (el: HTMLElement) => el.tagName === tag;
            if (isSelectionWrapped(core.root, matches)) {
              unwrapSelection(core.root, matches);
              unwrapped = true;
            }
          }
        }
      },
    },
  },
};
