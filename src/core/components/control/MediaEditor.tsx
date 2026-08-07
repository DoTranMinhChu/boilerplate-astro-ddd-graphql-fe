import {
  compressImageFile,
  DEFAULT_IMAGE_MAX_SIZE_IN_MB,
} from '@core/helpers/image';
import { Util } from '@core/helpers/util';
import {
  createEffect,
  createSignal,
  lazy,
  mergeProps,
  untrack,
} from 'solid-js';
import { baseConfig } from '../config/BaseConfig';
import { toast } from '../toast/ToastProvider';
import type { EditorProps } from './Editor';
import { createControl } from './createControl';
import type { EditorHandle, ImageUploadResult } from './editor/types';

const Editor = lazy(() =>
  import('./Editor').then((module) => ({
    default: module.Editor,
  })),
);

type MediaSet = {
  content: string;
  medias: string[];
};
type MediaData = {
  id: string | undefined;
  url: string | undefined;
  fileName: string | undefined;
  fileSize: number | undefined;
};
const DEFAULT_MAX_MEDIAS = 10;
export interface MediaEditorProps extends EditorProps {
  /** Media data */
  medias: MediaData | MediaData[] | undefined;
  maxMedias?: number;
}
export function MediaEditor(props: MediaEditorProps) {
  const defaultValue = props.defaultValue || {
    content: '',
    medias: [],
  };
  const mergedProps = mergeProps(props, {
    defaultValue,
  });
  const [_editor, setEditor] = createSignal<EditorHandle>();
  const { id, value, onChange, readOnly, error, name, hasInited } =
    createControl<MediaSet>('object', mergedProps as any);
  const [editorValue, setEditorValue] = createSignal<string>(value()?.content);
  const [mediaDatas, setMediaDatas] = createSignal<MediaData[]>([]);

  createEffect(() => {
    if (props.medias) {
      untrack(() => {
        if (Array.isArray(props.medias)) {
          setMediaDatas([...mediaDatas(), ...props.medias]);
        } else {
          setMediaDatas([...mediaDatas(), props.medias!]);
        }
      });
    }
  });
  createEffect(() => {
    const content = value()?.content;
    untrack(() => {
      if (content !== editorValue()) {
        setEditorValue(content);
      }
    });
  });

  const onImageUploaded = (_url: string, data: any) => {
    const mediaId = data.id;
    if (mediaId) {
      setMediaDatas([...mediaDatas(), data]);
      onChange({
        ...value(),
        medias: Util.unique([...value().medias, mediaId]),
      });
    }
  };

  const onImageChange = ({
    url,
    type,
  }: {
    url: string;
    type: 'insert' | 'remove';
  }) => {
    if (!url) return;
    const media = mediaDatas().find((x) => x.url == url);
    if (media) {
      const mediaId = media.id!;
      const medias = [...value().medias];
      switch (type) {
        case 'insert': {
          medias.push(mediaId);
          onChange({ ...value(), medias: Util.unique([...medias]) });
          break;
        }
        case 'remove': {
          const index = medias.findIndex((id) => id == mediaId);
          if (index >= 0) {
            medias.splice(index, 1);
            onChange({ ...value(), medias: Util.unique([...medias]) });
          }
          break;
        }
      }
    }
  };

  const maxMedias = () => props.maxMedias || DEFAULT_MAX_MEDIAS;

  return (
    <>
      <div class="text-xsm mb-1.5 rounded-sm bg-neutral-50 px-2 py-1">
        {baseConfig().editorMaxMediasLabel(value().medias.length, maxMedias())}
      </div>
      <Editor
        onImageUpload={handleImageUpload}
        {...props}
        value={editorValue()}
        onChange={(val: string) => {
          if (hasInited()) {
            setEditorValue(val);
            onChange({
              ...value(),
              content: val,
            });
          }
        }}
        id={id()}
        readOnly={readOnly()}
        error={error()}
        name={name()}
        onEditor={setEditor}
        onImageUploaded={onImageUploaded}
        onImageChange={onImageChange}
        fieldless
      />
    </>
  );
}

async function handleImageUpload(file: File): Promise<ImageUploadResult> {
  const compressedFile = await compressImageFile(file);
  if (compressedFile.size > DEFAULT_IMAGE_MAX_SIZE_IN_MB * 1024 * 1024) {
    toast().info(baseConfig().mediaUploadExceedMaxSizeLabel(DEFAULT_IMAGE_MAX_SIZE_IN_MB));
    throw new Error('exceeds-max-size');
  }
  if (!baseConfig().uploadMedia) {
    toast().info('No upload media found!');
    throw new Error('no-upload-media');
  }
  const res = await baseConfig().uploadMedia!.create(compressedFile);
  if (!res) throw new Error('upload-failed');
  return { ...res, url: res.url };
}
