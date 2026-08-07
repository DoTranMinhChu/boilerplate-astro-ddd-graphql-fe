// src/core/components/control/editor/TablePropertiesPanel.tsx
import { createSignal } from 'solid-js';
import { t } from '@/shared/i18n/t';
import type { EditorCore } from './core/EditorCore';

export function TablePropertiesPanel(props: { core: () => EditorCore | undefined; onClose: () => void }) {
  const [scope, setScope] = createSignal<'table' | 'cell'>('table');
  const [borderStyle, setBorderStyle] = createSignal('solid');
  const [borderWidth, setBorderWidth] = createSignal('1px');
  const [borderColor, setBorderColor] = createSignal('#cccccc');
  const [background, setBackground] = createSignal('#ffffff');
  const [padding, setPadding] = createSignal('8px');
  const [align, setAlign] = createSignal<'left' | 'center' | 'right'>('left');

  const apply = () => {
    const core = props.core();
    if (!core) return;
    const style: Partial<CSSStyleDeclaration> = {
      border: `${borderWidth()} ${borderStyle()} ${borderColor()}`,
      backgroundColor: background(),
      padding: padding(),
      textAlign: align(),
    };
    core.exec(scope() === 'table' ? 'setTableStyle' : 'setCellStyle', style);
    props.onClose();
  };

  return (
    <div class="absolute z-20 mt-1 w-64 rounded border border-neutral-200 bg-white p-3 shadow-lg">
      <div class="mb-2 flex gap-3 text-xs">
        <label class="flex items-center gap-1">
          <input type="radio" checked={scope() === 'table'} onChange={() => setScope('table')} />
          {t('editor.table.scopeTable')}
        </label>
        <label class="flex items-center gap-1">
          <input type="radio" checked={scope() === 'cell'} onChange={() => setScope('cell')} />
          {t('editor.table.scopeCell')}
        </label>
      </div>
      <div class="grid grid-cols-2 gap-2 text-xs">
        <select class="rounded border border-neutral-200 px-1 py-1" value={borderStyle()} onChange={(e) => setBorderStyle(e.currentTarget.value)}>
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
          <option value="dotted">Dotted</option>
          <option value="none">None</option>
        </select>
        <input class="rounded border border-neutral-200 px-1 py-1" value={borderWidth()} onInput={(e) => setBorderWidth(e.currentTarget.value)} placeholder="1px" />
        <label class="flex items-center gap-1">{t('editor.table.borderColor')} <input type="color" value={borderColor()} onInput={(e) => setBorderColor(e.currentTarget.value)} /></label>
        <label class="flex items-center gap-1">{t('editor.table.background')} <input type="color" value={background()} onInput={(e) => setBackground(e.currentTarget.value)} /></label>
        <input class="rounded border border-neutral-200 px-1 py-1" value={padding()} onInput={(e) => setPadding(e.currentTarget.value)} placeholder="8px" />
        <select class="rounded border border-neutral-200 px-1 py-1" value={align()} onChange={(e) => setAlign(e.currentTarget.value as any)}>
          <option value="left">{t('editor.toolbar.alignLeft')}</option>
          <option value="center">{t('editor.toolbar.alignCenter')}</option>
          <option value="right">{t('editor.toolbar.alignRight')}</option>
        </select>
      </div>
      <div class="mt-2 flex justify-end gap-1">
        <button type="button" class="rounded px-2 py-1 text-xs hover:bg-neutral-100" onClick={props.onClose}>{t('editor.table.cancel')}</button>
        <button type="button" class="rounded bg-main-600 px-2 py-1 text-xs text-white" onClick={apply}>{t('editor.table.apply')}</button>
      </div>
    </div>
  );
}
