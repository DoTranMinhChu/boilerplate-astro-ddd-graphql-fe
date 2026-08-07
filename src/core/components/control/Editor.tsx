// src/core/components/control/Editor.tsx
import { mergeClass } from '@core/helpers/class';
import { mergeRef } from '@core/helpers/ref';
import { createEffect, createSignal, onCleanup, onMount, Ref, untrack } from 'solid-js';
import { createControl } from './createControl';
import { alignModule } from './editor/commands/align';
import { blocksModule } from './editor/commands/blocks';
import { embedModule } from './editor/commands/embed';
import { fontModule } from './editor/commands/font';
import { createImageModule } from './editor/commands/image';
import { linkModule } from './editor/commands/link';
import { listsModule } from './editor/commands/lists';
import { marksModule } from './editor/commands/marks';
import { tableModule } from './editor/commands/table';
import { EditorCore } from './editor/core/EditorCore';
import { ImageResizeHandles } from './editor/ImageResizeHandles';
import { TableToolbar } from './editor/TableToolbar';
import { Toolbar } from './editor/Toolbar';
import type { EditorHandle, ImageChangeEvent, ImageUploadResult } from './editor/types';

export interface EditorProps extends FormControlProps<string> {
  inline?: boolean;
  ref?: Ref<HTMLDivElement>;
  language?: 'vi' | 'en';
  onEditor?: (editor: EditorHandle) => any;
  onImageUpload?: (file: File) => Promise<ImageUploadResult>;
  onImageUploaded?: (url: string, data: any) => any;
  onImageChange?: (event: ImageChangeEvent) => any;
}

export function Editor(props: EditorProps) {
  const { id, value, onChange, readOnly, error } = createControl<string>('text', props);

  let wrapperRef: HTMLDivElement;
  let contentRef: HTMLDivElement;
  const [core, setCore] = createSignal<EditorCore>();

  onMount(() => {
    const imageModule = createImageModule({
      onImageUpload: props.onImageUpload,
      onImageUploaded: props.onImageUploaded,
      onImageChange: props.onImageChange,
    });
    const instance = new EditorCore(contentRef, [marksModule, blocksModule, listsModule, linkModule, imageModule, tableModule, fontModule, alignModule, embedModule]);
    instance.setData(value() || '');
    instance.on('change', (html) => onChange(html));
    setCore(instance);

    props.onEditor?.({
      getData: () => instance.getData(),
      setData: (html) => instance.setData(html),
      focus: () => instance.focus(),
      exec: (command, ...args) => instance.exec(command, ...args),
      isActive: (command) => instance.isActive(command),
    });

    onCleanup(() => instance.destroy());
  });

  createEffect(() => {
    const instance = core();
    const val = value();
    untrack(() => {
      if (!instance) return;
      instance.root.contentEditable = readOnly() ? 'false' : 'true';
      if (instance.getData() !== (val || '')) {
        instance.setData(val || '');
      }
    });
  });

  const editorClass = () =>
    mergeClass(
      'relative box-content bg-white border rounded-sm border-neutral-300 hover:border-neutral-400 min-h-40 max-h-96 overflow-y-auto',
      'focus-within:border-main focus-within:ring-1 focus-within:ring-main focus-within:outline-hidden',
      readOnly() &&
      'bg-lightest border-neutral-200 hover:border-neutral-300 focus-within:border-neutral-300 focus-within:ring-0',
      error() &&
      'border-danger hover:border-danger-600 focus-within:border-danger-600 focus-within:ring-danger-600',
      props.class,
    );

  return (
    <div
      id={id()}
      ref={mergeRef(props.ref, (el) => (wrapperRef = el))}
      class={editorClass()}
      tabIndex={props.skipTabIndex ? -1 : 0}
    >
      {props.children}
      <Toolbar core={core} />
      <ImageResizeHandles core={core} container={() => wrapperRef} />
      <TableToolbar core={core} />
      <div
        ref={(el) => (contentRef = el)}
        data-placeholder={props.placeholder}
        class="min-h-32 px-3 py-2 text-sm outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-neutral-400 empty:before:pointer-events-none [&_blockquote]:border-l-2 [&_blockquote]:border-neutral-300 [&_blockquote]:pl-3 [&_blockquote]:text-neutral-500 [&_pre]:rounded [&_pre]:bg-neutral-100 [&_pre]:p-2 [&_a]:text-main-600 [&_a]:underline [&_hr]:my-3 [&_hr]:border-neutral-300 [&_.ed-image]:my-3 [&_.ed-image_img]:max-w-full [&_.ed-image--side]:float-right [&_.ed-image--side]:ml-4 [&_.ed-image--side]:w-1/3 [&_.ed-image--inline]:inline-block [&_.ed-image--inline]:align-middle [&_.ed-image_figcaption]:text-center [&_.ed-image_figcaption]:text-xs [&_.ed-image_figcaption]:text-neutral-500 [&_table]:my-3 [&_table]:w-full [&_.ed-cell-selected]:bg-main-50 [&_figure.media]:my-3 [&_figure.image]:my-3 [&_figure.image_img]:max-w-full [&_figure.table]:my-3 [&_figure.table_table]:w-full [&_figure.table_table]:border-collapse [&_figure.table_td]:border [&_figure.table_td]:border-neutral-300 [&_figure.table_td]:p-2"
      />
    </div>
  );
}
