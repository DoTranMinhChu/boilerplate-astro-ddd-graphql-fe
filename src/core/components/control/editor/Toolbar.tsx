import { createRenderEffect, createSignal, For, onCleanup, Show } from 'solid-js';
import { Icon } from '@shared/components/icons/Icon';
import { Floating } from '@core/components/floating/Floating';
import { t } from '@/shared/i18n/t';
import type { EditorCore } from './core/EditorCore';
import { findLink } from './commands/link';

function ToolbarButton(props: { active?: boolean; onClick: () => void; icon: string; label: string }) {
  return (
    <button
      type="button"
      title={props.label}
      class={`rounded p-1 hover:bg-neutral-200 ${props.active ? 'bg-neutral-300 text-main-700' : ''}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={props.onClick}
    >
      <Icon name={props.icon} />
    </button>
  );
}

const HEADINGS = [
  { value: 'paragraph', label: () => t('editor.toolbar.paragraph') },
  { value: 'heading1', label: () => 'H1' },
  { value: 'heading2', label: () => 'H2' },
  { value: 'heading3', label: () => 'H3' },
  { value: 'heading4', label: () => 'H4' },
];

export function Toolbar(props: { core: () => EditorCore | undefined }) {
  const [, setTick] = createSignal(0);
  let unsubscribe: (() => void) | undefined;

  createRenderEffect(() => {
    const core = props.core();
    if (!core || unsubscribe) return;
    unsubscribe = core.on('selectionchange', () => setTick((n) => n + 1));
  });
  onCleanup(() => unsubscribe?.());

  const active = (name: string) => props.core()?.isActive(name) ?? false;
  const exec = (name: string, ...args: any[]) => props.core()?.exec(name, ...args);

  const currentHeading = () => HEADINGS.find((h) => h.value !== 'paragraph' && active(h.value))?.value ?? 'paragraph';

  const [showLink, setShowLink] = createSignal(false);
  let linkButtonRef: HTMLButtonElement | undefined;
  const [linkValue, setLinkValue] = createSignal('');

  const openLink = () => {
    setLinkValue(findLink(props.core()!)?.getAttribute('href') ?? '');
    setShowLink(true);
  };
  const confirmLink = () => {
    if (linkValue()) exec('setLink', linkValue());
    setShowLink(false);
  };

  return (
    <div class="flex flex-wrap items-center gap-0.5 border-b border-neutral-200 bg-neutral-50 p-1">
      <select
        class="rounded border border-neutral-200 bg-white px-1 py-0.5 text-xs"
        value={currentHeading()}
        onChange={(e) => exec(e.currentTarget.value)}
      >
        <For each={HEADINGS}>{(h) => <option value={h.value}>{h.label()}</option>}</For>
      </select>
      <ToolbarButton active={active('bold')} onClick={() => exec('bold')} icon="tabler:bold" label={t('editor.toolbar.bold')} />
      <ToolbarButton active={active('italic')} onClick={() => exec('italic')} icon="tabler:italic" label={t('editor.toolbar.italic')} />
      <ToolbarButton active={active('underline')} onClick={() => exec('underline')} icon="tabler:underline" label={t('editor.toolbar.underline')} />
      <ToolbarButton active={active('strike')} onClick={() => exec('strike')} icon="tabler:strikethrough" label={t('editor.toolbar.strike')} />
      <ToolbarButton active={active('code')} onClick={() => exec('code')} icon="tabler:code" label={t('editor.toolbar.code')} />
      <ToolbarButton active={active('blockquote')} onClick={() => exec('blockquote')} icon="tabler:blockquote" label={t('editor.toolbar.blockquote')} />
      <ToolbarButton active={active('codeBlock')} onClick={() => exec('codeBlock')} icon="tabler:source-code" label={t('editor.toolbar.codeBlock')} />
      <ToolbarButton onClick={() => exec('horizontalLine')} icon="tabler:separator-horizontal" label={t('editor.toolbar.horizontalLine')} />
      <ToolbarButton active={active('bulletedList')} onClick={() => exec('bulletedList')} icon="tabler:list" label={t('editor.toolbar.bulletedList')} />
      <ToolbarButton active={active('numberedList')} onClick={() => exec('numberedList')} icon="tabler:list-numbers" label={t('editor.toolbar.numberedList')} />
      <ToolbarButton onClick={() => exec('outdent')} icon="tabler:indent-decrease" label={t('editor.toolbar.outdent')} />
      <ToolbarButton onClick={() => exec('indent')} icon="tabler:indent-increase" label={t('editor.toolbar.indent')} />
      <button
        ref={linkButtonRef}
        type="button"
        title={t('editor.toolbar.link')}
        class="rounded p-1 hover:bg-neutral-200"
        onMouseDown={(e) => e.preventDefault()}
        onClick={openLink}
      >
        <Icon name="tabler:link" />
      </button>
      <Show when={linkButtonRef}>
        <Floating reference={linkButtonRef!} open={showLink()} trigger="manual" placement="bottom-start">
          <div class="flex gap-1 rounded border border-neutral-200 bg-white p-2 shadow-lg">
            <input
              class="rounded border border-neutral-200 px-2 py-1 text-xs"
              placeholder="https://..."
              value={linkValue()}
              onInput={(e) => setLinkValue(e.currentTarget.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmLink()}
            />
            <button type="button" class="rounded bg-main-600 px-2 py-1 text-xs text-white" onClick={confirmLink}>
              {t('editor.toolbar.linkApply')}
            </button>
          </div>
        </Floating>
      </Show>
      <ToolbarButton onClick={() => exec('removeFormat')} icon="tabler:clear-formatting" label={t('editor.toolbar.removeFormat')} />
      <ToolbarButton onClick={() => props.core()?.undo()} icon="tabler:arrow-back-up" label={t('editor.toolbar.undo')} />
      <ToolbarButton onClick={() => props.core()?.redo()} icon="tabler:arrow-forward-up" label={t('editor.toolbar.redo')} />
    </div>
  );
}
