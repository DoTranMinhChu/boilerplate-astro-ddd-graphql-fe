// src/shared/components/editor/commands/font.ts
import type { EditorModule } from '../types';
import { wrapSelection } from '../core/Selection';

export const FONT_COLORS = [
  { color: 'var(--color-main)', label: 'Main' },
  { color: 'var(--color-black)', label: 'Black' },
  { color: 'var(--color-dark)', label: 'Dark' },
  { color: 'var(--color-neutral)', label: 'Neutral' },
  { color: 'var(--color-light)', label: 'Light' },
  { color: 'var(--color-white)', label: 'White' },
  { color: 'var(--color-red)', label: 'Red' },
  { color: 'var(--color-orange)', label: 'Orange' },
  { color: 'var(--color-yellow)', label: 'Yellow' },
  { color: 'var(--color-lime)', label: 'Lime' },
  { color: 'var(--color-green)', label: 'Green' },
  { color: 'var(--color-teal)', label: 'Teal' },
  { color: 'var(--color-cyan)', label: 'Cyan' },
  { color: 'var(--color-blue)', label: 'Blue' },
  { color: 'var(--color-indigo)', label: 'Indigo' },
  { color: 'var(--color-purple)', label: 'Purple' },
  { color: 'var(--color-pink)', label: 'Pink' },
  { color: 'var(--color-rose)', label: 'Rose' },
];

export const FONT_SIZES = [
  { title: '12', value: '0.75rem' },
  { title: '14', value: '0.875rem' },
  { title: 'default', value: '' },
  { title: '18', value: '1.125rem' },
  { title: '20', value: '1.25rem' },
  { title: '24', value: '1.5rem' },
];

export const FONT_FAMILIES = [
  { title: 'Default', value: '' },
  { title: 'Serif', value: 'serif' },
  { title: 'Sans-serif', value: 'sans-serif' },
  { title: 'Monospace', value: 'monospace' },
];

export const fontModule: EditorModule = {
  name: 'font',
  commands: {
    setFontColor: { exec: (core, color: string) => wrapSelection(core.root, 'span', { color }) },
    setFontSize: { exec: (core, size: string) => wrapSelection(core.root, 'span', { fontSize: size || undefined }) },
    setFontFamily: { exec: (core, family: string) => wrapSelection(core.root, 'span', { fontFamily: family }) },
  },
};
