import type { EditorCore } from './core/EditorCore';

export type { EditorCore };

export interface SelectionPath {
  start: number[];
  startOffset: number;
  end: number[];
  endOffset: number;
}

export interface EditorCommand {
  exec: (core: EditorCore, ...args: any[]) => void;
  isActive?: (core: EditorCore) => boolean;
}

export interface EditorModule {
  name: string;
  commands?: Record<string, EditorCommand>;
  setup?: (core: EditorCore) => void | (() => void);
}

export interface EditorHandle {
  getData: () => string;
  setData: (html: string) => void;
  focus: () => void;
  exec: (command: string, ...args: any[]) => void;
  isActive: (command: string) => boolean;
}

export interface ImageUploadResult {
  url: string;
  [key: string]: any;
}

export interface ImageChangeEvent {
  url: string;
  type: 'insert' | 'remove';
}
