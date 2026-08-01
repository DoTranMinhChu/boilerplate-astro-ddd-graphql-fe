import {
  Alignment,
  Autoformat,
  AutoImage,
  AutoLink,
  BlockQuote,
  Bold,
  Editor as CKEditor,
  ClassicEditor,
  Code,
  CodeBlock,
  EditorConfig,
  Essentials,
  FindAndReplace,
  FontBackgroundColor,
  FontColor,
  FontFamily,
  FontSize,
  GeneralHtmlSupport,
  Heading,
  HorizontalLine,
  Image,
  ImageCaption,
  ImageInsert,
  ImageResize,
  ImageStyle,
  ImageToolbar,
  ImageUpload,
  Indent,
  IndentBlock,
  InlineEditor,
  Italic,
  Link,
  LinkImage,
  List,
  ListProperties,
  MediaEmbed,
  Paragraph,
  PasteFromOffice,
  PluginConstructor,
  RemoveFormat,
  Strikethrough,
  Table,
  TableCaption,
  TableCellProperties,
  TableProperties,
  TableToolbar,
  TextTransformation,
  Underline,
} from 'ckeditor5';
import 'ckeditor5/ckeditor5.css';
// @ts-expect-error: The package is there but shows type declaration error
import coreTranslations from 'ckeditor5/translations/vi';
import { mergeClass } from '@core/helpers/class';
import { mergeRef } from '@core/helpers/ref';
import { createEffect, createSignal, onMount, Ref, untrack } from 'solid-js';
import { createControl } from './createControl';

const builtinPlugins: PluginConstructor<CKEditor>[] = [
  Alignment,
  Autoformat,
  AutoImage,
  AutoLink,
  BlockQuote,
  Bold,
  Code,
  CodeBlock,
  Essentials,
  FindAndReplace,
  FontBackgroundColor,
  FontColor,
  FontFamily,
  FontSize,
  GeneralHtmlSupport,
  Heading,
  HorizontalLine,
  Image,
  ImageCaption,
  ImageInsert,
  ImageResize,
  ImageStyle,
  ImageToolbar,
  ImageUpload,
  Indent,
  IndentBlock,
  Italic,
  Link,
  LinkImage,
  List,
  ListProperties,
  MediaEmbed,
  Paragraph,
  PasteFromOffice,
  Underline,
  Strikethrough,
  Table,
  TableCaption,
  TableCellProperties,
  TableProperties,
  TableToolbar,
  TextTransformation,
  RemoveFormat,
];
const colorConfig = {
  columns: 6,
  colors: [
    {
      color: 'var(--color-main)',
      label: 'Main',
    },
    {
      color: 'var(--color-black)',
      label: 'Black',
    },
    {
      color: 'var(--color-dark)',
      label: 'Dark',
    },
    {
      color: 'var(--color-neutral)',
      label: 'Neutral',
    },
    {
      color: 'var(--color-light)',
      label: 'Light',
    },
    {
      color: 'var(--color-white)',
      label: 'White',
      hasBorder: true,
    },
    {
      color: 'var(--color-red)',
      label: 'Red',
    },
    {
      color: 'var(--color-orange)',
      label: 'Orange',
    },
    {
      color: 'var(--color-yellow)',
      label: 'Yellow',
    },
    {
      color: 'var(--color-lime)',
      label: 'Lime',
    },
    {
      color: 'var(--color-green)',
      label: 'Green',
    },
    {
      color: 'var(--color-teal)',
      label: 'Teal',
    },
    {
      color: 'var(--color-cyan)',
      label: 'Cyan',
    },
    {
      color: 'var(--color-blue)',
      label: 'Blue',
    },
    {
      color: 'var(--color-indigo)',
      label: 'Indigo',
    },
    {
      color: 'var(--color-purple)',
      label: 'Purple',
    },
    {
      color: 'var(--color-pink)',
      label: 'Pink',
    },
    {
      color: 'var(--color-rose)',
      label: 'Rose',
    },
  ],
};
const defaultConfig: EditorConfig = {
  language: 'vi',
  fontBackgroundColor: colorConfig,
  fontColor: colorConfig,
  fontFamily: {
    options: ['default', 'Display'],
  },
  fontSize: {
    options: [
      {
        title: '12',
        model: '12pt',
        view: {
          name: 'span',
          classes: 'text-xs',
          styles: {
            'font-size': '0.75rem',
          },
        },
      },
      {
        title: '14',
        model: '14pt',
        view: {
          name: 'span',
          classes: 'text-sm',
          styles: {
            'font-size': '0.875rem',
          },
        },
      },
      'default',
      {
        title: '18',
        model: '18pt',
        view: {
          name: 'span',
          classes: 'text-lg',
          styles: {
            'font-size': '1.125rem',
          },
        },
      },
      {
        title: '20',
        model: '20pt',
        view: {
          name: 'span',
          classes: 'text-xl',
          styles: {
            'font-size': '1.25rem',
          },
        },
      },
      {
        title: '24',
        model: '24pt',
        view: {
          name: 'span',
          classes: 'text-2xl',
          styles: {
            'font-size': '1.5rem',
          },
        },
      },
    ],
  },
  toolbar: {
    items: [
      'heading',
      '|',
      'bold',
      'italic',
      'alignment',
      '|',
      'fontBackgroundColor',
      'fontColor',
      'fontFamily',
      'fontSize',
      '|',
      'imageInsert',
      'insertTable',
      'mediaEmbed',
      'link',
      '|',
      'bulletedList',
      'numberedList',
      'outdent',
      'indent',
      'horizontalLine',
      '|',
      'underline',
      'strikethrough',
      'blockQuote',
      'code',
      'codeBlock',
      '|',
      'removeFormat',
      '|',
      'undo',
      'redo',
    ],
  },
  image: {
    toolbar: [
      'imageTextAlternative',
      'imageStyle:inline',
      'imageStyle:block',
      'imageStyle:side',
      'linkImage',
    ],
  },
  table: {
    contentToolbar: [
      'tableColumn',
      'tableRow',
      'mergeTableCells',
      'tableCellProperties',
      'tableProperties',
    ],
  },
  translations: [coreTranslations],
};

class Classic extends ClassicEditor {
  static builtinPlugins = builtinPlugins;
  static defaultConfig = defaultConfig;
}

class Inline extends InlineEditor {
  static builtinPlugins = builtinPlugins;
  static defaultConfig = defaultConfig;
}

export interface EditorProps extends FormControlProps<string> {
  inline?: boolean;
  ref?: Ref<HTMLDivElement>;
  language?: 'vi' | 'en';
  //adapter
  uploadAdapterPlugin?: typeof UploadAdapterPlugin;
  onEditor?: (editor: CKEditor) => any;
  onImageUploaded?: (url: string, data: any) => any;
  onImageChange?: ({
    url,
    type,
  }: {
    url: string;
    type: 'insert' | 'remove';
  }) => any;
}
export function Editor(props: EditorProps) {
  const { id, value, onChange, readOnly, error } = createControl<string>(
    'text',
    props,
  );
  const language = () => props.language || 'vi';

  let ref: Ref<HTMLDivElement>;
  let populateRef: HTMLDivElement;
  const Editor = props.inline ? Inline : Classic;
  const [editor, setEditor] = createSignal<CKEditor>();

  const uploadAdapterPlugin = () =>
    props.uploadAdapterPlugin || UploadAdapterPlugin;

  onMount(async () => {
    Editor.create(populateRef, {
      language: language(),
      placeholder: props.placeholder,
      initialData: value(),
      mediaEmbed: {
        previewsInData: true,
      },
      extraPlugins: [uploadAdapterPlugin(), ImageEventPlugin],
      imageEvent: {
        callback: (
          imageEvents: {
            url: string;
            type: 'insert' | 'remove';
          }[],
        ) => {
          imageEvents.forEach((event) => {
            props.onImageChange?.(event);
          });
        },
      },
    } as any).then((res: any) => {
      setEditor(res);

      // data listener
      res.model.document.on('change:data', () => {
        const data = editor()?.getData() || '';
        onChange(data);
      });

      // init style
      const el = ref as HTMLDivElement;
      const style = getComputedStyle(el);
      (el.querySelector('.ck-editor') as HTMLDivElement).style.maxHeight =
        style.maxHeight;
      (el.querySelector('.ck-editor') as HTMLDivElement).style.minHeight =
        style.minHeight;
      const contentMaxHeight = `calc(${style.maxHeight} - 2.5rem)`;
      const contentMinHeight = `calc(${style.minHeight} - 2.5rem)`;
      (el.querySelector('.ck-editor__main') as HTMLDivElement).style.maxHeight =
        contentMaxHeight;
      (el.querySelector('.ck-editor__main') as HTMLDivElement).style.minHeight =
        contentMinHeight;

      (res.plugins.get('ImageUploadEditing') as any).on(
        'uploadComplete',
        (
          _evt: any,
          { data }: { data: any; imageElement: any },
        ) => {
          props.onImageUploaded?.(data.default, data);
        },
      );
      props.onEditor?.(res as any);
    });
  });

  createEffect(() => {
    const editorVal = editor();
    const val = value();
    untrack(() => {
      if (editorVal) {
        if (readOnly()) {
          editorVal.enableReadOnlyMode('editor');
        } else {
          editorVal.disableReadOnlyMode('editor');
        }
        if (editorVal.getData() != val) {
          editorVal.setData(val || '');
        }
      }
    });
  });

  const editorClass = () =>
    mergeClass(
      'box-content bg-white border rounded-sm border-neutral-300 hover:border-neutral-400 min-h-40 max-h-96',
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
      ref={mergeRef(props.ref, (el) => (ref = el))}
      class={editorClass()}
      tabIndex={props.skipTabIndex ? -1 : 0}
    >
      {props.children}
      <div ref={(el) => (populateRef = el)}></div>
    </div>
  );
}

function UploadAdapterPlugin(editor: CKEditor) {
  (editor.plugins.get('FileRepository') as any).createUploadAdapter = (
    loader: any,
  ) => {
    // Configure the URL to the upload script in your back-end here!
    return new UploadAdapter(loader);
  };
}

export class UploadAdapter {
  xhr: XMLHttpRequest | null = null;
  loader: any;

  constructor(loader: any) {
    // The file loader instance to use during the upload.
    this.loader = loader;
  }

  // Starts the upload process.
  upload() {
    return this.loader.file.then(
      (file: File) =>
        new Promise((resolve, reject) => {
          this._initRequest();
          this._initListeners(resolve, reject, file);
          this._sendRequest(file);
        }),
    );
  }

  // Aborts the upload process.
  abort() {
    if (this.xhr) {
      this.xhr.abort();
    }
  }

  // Initializes the XMLHttpRequest object using the URL passed to the constructor.
  _initRequest() {
    const xhr = (this.xhr = new XMLHttpRequest());

    // Note that your request may look different. It is up to you and your editor
    // integration to choose the right communication channel. This example uses
    // a POST request with JSON as a data structure but your configuration
    // could be different.
    xhr.open('POST', 'https://api.imgur.com/3/image', true);
    xhr.setRequestHeader('Authorization', 'Client-ID 76a4f2755819f77');
    xhr.responseType = 'json';
  }

  // Initializes XMLHttpRequest listeners.
  _initListeners(
    resolve: (value: any) => void,
    reject: (reason?: any) => void,
    file: File,
  ) {
    const xhr = this.xhr;
    if (!xhr) return;
    const loader = this.loader;

    xhr.addEventListener('error', () => {
      reject(file.name);
    });

    xhr.addEventListener('abort', () => reject());
    xhr.addEventListener('load', () => {
      const response = xhr.response;

      // This example assumes the XHR server's "response" object will come with
      // an "error" which has its own "message" that can be passed to reject()
      // in the upload promise.
      //
      // Your integration may handle upload errors in a different way so make sure
      // it is done properly. The reject() function must be called when the upload fails.
      if (!response || response.error || !response.success) {
        return reject(
          response
            ? response.error
              ? response.error.message
              : response.data?.error
            : file.name,
        );
      }

      // If the upload is successful, resolve the upload promise with an object containing
      // at least the "default" URL, pointing to the image on the server.
      // This URL will be used to display the image in the content. Learn more in the
      // UploadAdapter#upload documentation.
      resolve({
        default: response.data?.link,
        ...response.data,
      });
    });

    // Upload progress when it is supported. The file loader has the #uploadTotal and #uploaded
    // properties which are used e.g. to display the upload progress bar in the editor
    // user interface.
    if (xhr.upload) {
      xhr.upload.addEventListener('progress', (evt) => {
        if (evt.lengthComputable) {
          loader.uploadTotal = evt.total;
          loader.uploaded = evt.loaded;
        }
      });
    }
  }

  // Prepares the data and sends the request.
  _sendRequest(file: File) {
    // Prepare the form data.
    const xhr = this.xhr;
    if (!xhr) return;
    const data = new FormData();

    data.append('image', file);

    // Important note: This is the right place to implement security mechanisms
    // like authentication and CSRF protection. For instance, you can use
    // XMLHttpRequest.setRequestHeader() to set the request headers containing
    // the CSRF token generated earlier by your application.

    // Send the request.
    xhr.send(data);
  }
}
function ImageEventPlugin(editor: CKEditor) {
  const configuration = editor.config.get('imageEvent') as any;
  const documentationURL =
    'https://github.com/shibbirweb/ckeditor-5-image-remove-event-plugin';

  // Validate has configuration
  if (!configuration) {
    console.warn(
      'CKEditor5 Image Remove Event Plugin : configuration is not defined.',
    );
    console.warn(`View configuration documentation: ${documentationURL}`);
    return;
  }

  // validate configuration type
  if (typeof configuration !== 'object') {
    console.info(
      `CKEditor5 Image Remove Event Plugin: Configuration should be an object. See documentation at: ${documentationURL}`,
    );
    console.warn(
      'CKEditor5 Image Remove Event Plugin: Configuration is not valid.',
    );
  }

  const { callback, additionalElementTypes } = configuration as any;

  // validate event callback
  if (!callback || {}.toString.call(callback) !== '[object Function]') {
    console.info(
      `CKEditor5 Image Remove Event Plugin: Configuration callback property should be a function. See documentation at: ${documentationURL}`,
    );
    console.error(
      'CKEditor5 Image Remove Event Plugin: Callback property is not valid function.',
    );
  }

  // validate additional image element names
  if (additionalElementTypes && !Array.isArray(additionalElementTypes)) {
    console.info(
      `CKEditor5 Image Remove Event Plugin: Configuration 'additionalElementTypes' property should be nullable or an array. See documentation at: ${documentationURL}`,
    );
    console.error(
      `CKEditor5 Image Remove Event Plugin: 'additionalElementTypes' property is not valid function.`,
    );
  }
  return new ImageEvent(editor, configuration);
}
class ImageEvent {
  editor: CKEditor;
  configuration: any;

  constructor(editor: CKEditor, configuration: any) {
    this.editor = editor;
    this.configuration = configuration;

    this.emitCallback();
  }

  emitCallback() {
    const { callback, additionalElementTypes } = this.configuration;
    const editor = this.editor;
    const model = editor.model;

    const defaultElementTypes = ['image', 'imageBlock', 'imageInline'];

    let elementTypes = [...defaultElementTypes];

    if (Array.isArray(additionalElementTypes)) {
      elementTypes = elementTypes.concat(additionalElementTypes);
    }

    model.document.on('change:data', (event) => {
      const differ = (event.source as any).differ;

      // if no difference
      if (differ.isEmpty) {
        return;
      }

      const changes = differ.getChanges({
        includeChangesInGraveyard: true,
      });

      if (changes.length === 0) {
        return;
      }

      let hasNoImageEvent = true;

      // check any image remove or not
      for (let i = 0; i < changes.length; i++) {
        const change = changes[i];
        // if image remove exists
        if (
          change &&
          ['insert', 'remove'].includes(change.type) &&
          elementTypes.includes(change.name)
        ) {
          hasNoImageEvent = false;
          break;
        }
      }

      // if not image remove stop execution
      if (hasNoImageEvent) {
        return;
      }

      // get removed nodes
      const changedImageEvents = changes
        .filter(
          (change: any) =>
            ['insert', 'remove'].includes(change.type) &&
            elementTypes.includes(change.name),
        )
        .map((change: any) => ({
          url: change.attributes.get('src'),
          type: change.type,
        }));
      const urlMap = new Map<string, { url: string; type: string }>();
      // Iterate through the array
      changedImageEvents.forEach((item: any) => {
        // Update the Map with the latest occurrence of each URL
        urlMap.set(item.url, item);
      });

      // invoke the callback
      return callback(Array.from(urlMap.values()));
    });
  }
}
