// src/core/components/control/editor/TableToolbar.tsx
import { createEffect, createSignal, onCleanup, Show } from 'solid-js';
import { Floating } from '@core/components/floating/Floating';
import { Icon } from '@shared/components/icons/Icon';
import { t } from '@/shared/i18n/t';
import { closestTable, getSelectedCells } from './commands/table';
import type { EditorCore } from './core/EditorCore';
import { TablePropertiesPanel } from './TablePropertiesPanel';

export function TableToolbar(props: { core: () => EditorCore | undefined }) {
  const [tableEl, setTableEl] = createSignal<HTMLElement>();
  const [showProps, setShowProps] = createSignal(false);

  const updateTarget = () => {
    const core = props.core();
    if (!core) { setTableEl(undefined); return; }
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) { setTableEl(undefined); return; }
    setTableEl(closestTable(core, sel.getRangeAt(0).startContainer) ?? undefined);
  };

  createEffect(() => {
    const core = props.core();
    if (!core) return;
    const off = core.on('selectionchange', updateTarget);
    onCleanup(off);
  });

  const exec = (name: string, ...args: any[]) => props.core()?.exec(name, ...args);
  const mergeCells = () => {
    const core = props.core();
    if (!core) return;
    exec('mergeCells', getSelectedCells(core.root));
  };

  return (
    <Show when={tableEl()}>
      {(el) => (
        <Floating reference={el()} trigger="always" placement="top-start">
          <div class="flex gap-0.5 rounded border border-neutral-200 bg-white p-1 shadow-lg">
            <button type="button" title={t('editor.table.insertRowBefore')} class="rounded p-1 hover:bg-neutral-200" onClick={() => exec('insertRowBefore')}><Icon name="tabler:row-insert-top" /></button>
            <button type="button" title={t('editor.table.insertRowAfter')} class="rounded p-1 hover:bg-neutral-200" onClick={() => exec('insertRowAfter')}><Icon name="tabler:row-insert-bottom" /></button>
            <button type="button" title={t('editor.table.deleteRow')} class="rounded p-1 hover:bg-neutral-200" onClick={() => exec('deleteRow')}><Icon name="tabler:row-remove" /></button>
            <button type="button" title={t('editor.table.insertColumnBefore')} class="rounded p-1 hover:bg-neutral-200" onClick={() => exec('insertColumnBefore')}><Icon name="tabler:column-insert-left" /></button>
            <button type="button" title={t('editor.table.insertColumnAfter')} class="rounded p-1 hover:bg-neutral-200" onClick={() => exec('insertColumnAfter')}><Icon name="tabler:column-insert-right" /></button>
            <button type="button" title={t('editor.table.deleteColumn')} class="rounded p-1 hover:bg-neutral-200" onClick={() => exec('deleteColumn')}><Icon name="tabler:column-remove" /></button>
            <button type="button" title={t('editor.table.mergeCells')} class="rounded p-1 hover:bg-neutral-200" onClick={mergeCells}><Icon name="tabler:table-plus" /></button>
            <button type="button" title={t('editor.table.splitCell')} class="rounded p-1 hover:bg-neutral-200" onClick={() => exec('splitCell')}><Icon name="tabler:table-minus" /></button>
            <button type="button" title={t('editor.table.properties')} class="rounded p-1 hover:bg-neutral-200" onClick={() => setShowProps(true)}><Icon name="tabler:adjustments" /></button>
          </div>
          <Show when={showProps()}>
            <TablePropertiesPanel core={props.core} onClose={() => setShowProps(false)} />
          </Show>
        </Floating>
      )}
    </Show>
  );
}
