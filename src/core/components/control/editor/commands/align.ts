// src/core/components/control/editor/commands/align.ts
import type { EditorCore, EditorModule } from '../types';
import { closestBlock, getCurrentRange, setBlockStyle } from '../core/Selection';

function isAligned(core: EditorCore, value: string): boolean {
  const range = getCurrentRange(core.root);
  const block = range && closestBlock(range.startContainer, core.root);
  return block?.style.textAlign === value;
}

export const alignModule: EditorModule = {
  name: 'align',
  commands: {
    alignLeft: { exec: (core) => setBlockStyle(core.root, 'text-align', 'left'), isActive: (core) => isAligned(core, 'left') },
    alignCenter: { exec: (core) => setBlockStyle(core.root, 'text-align', 'center'), isActive: (core) => isAligned(core, 'center') },
    alignRight: { exec: (core) => setBlockStyle(core.root, 'text-align', 'right'), isActive: (core) => isAligned(core, 'right') },
    alignJustify: { exec: (core) => setBlockStyle(core.root, 'text-align', 'justify'), isActive: (core) => isAligned(core, 'justify') },
  },
};
