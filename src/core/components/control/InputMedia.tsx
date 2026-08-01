// @core/components/control/InputMedia.tsx
//
// setMode=true  → value = mediaSetId (string | null)
//
// setUpdateMode:
//   'form' (DEFAULT) → tích lũy mediaIds, chỉ gọi createMediaSet/updateMediaSet
//                       khi form submit (DatatableFormlog tự gọi resolve)
//   'auto'           → gọi API ngay sau mỗi thay đổi (add/remove/reorder)
//
// mediaSet API đọc từ baseConfig().uploadMedia (UploadMedia instance)
// → app setup 1 lần trong MediaConfig, không cần truyền prop từng nơi dùng.
//
// Tất cả mode cũ (single, multiple) GIỮ NGUYÊN.

import { Lightbox } from '@core/components/dialog/Lightbox';
import { Dropdown } from '@core/components/disclosure/Dropdown';
import { mergeClass } from '@core/helpers/class';
import { checkMobileOrTablet } from '@core/helpers/device';
import { checkUrlValid } from '@core/helpers/string';
import { generateId } from '@core/helpers/util';
import {
  For,
  Show,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
  splitProps,
  untrack,
} from 'solid-js';
import { Button } from '../button/Button';
import { baseConfig } from '../config/BaseConfig';
import { toast } from '../toast/ToastProvider';
import { Img, ImgProps } from '../utilities/Img';
import { createControl } from './createControl';
import { Input } from './Input';
import { InputWrapperProps } from './InputWrapper';

export const DEFAULT_MULTIPLE_IMAGES_SIZE = 12;

// Registry toàn cục: fieldId → resolveFn
// DatatableFormlog đọc registry này khi submit để resolve tất cả setMode fields
export const mediaSetResolverRegistry = new Map<
  string,
  () => Promise<string | null>
>();

export type MediaType = 'image' | 'video' | 'audio' | 'file';

export type MediaData = {
  id: string | undefined;
  url: string | undefined;
  fileName: string | undefined;
  fileSize: number | undefined;
};

export type MediaState = {
  key: string;
  file: File | null;
  loading: boolean;
  error: boolean;
};

export interface InputMediaProps extends Omit<
  InternalInputMediaProps,
  'allowURL' | 'maxSize' | 'accept' | 'iconMediaUpload' | 'type' | 'mediaName'
> {
  allowURL?: boolean;
  maxSize?: number;
  accept?: string;
  iconMediaUpload?: JSX.Element;
}

interface InternalInputMediaProps<T = string | string[] | null>
  extends
  FormControlProps<T>,
  Omit<InputWrapperProps, 'onClear'>,
  Pick<ImgProps, 'ratio' | 'freeform' | 'square' | 'video' | 'contain' | 'size'> {
  hideRatioLabel?: boolean;
  inputClass?: string;
  mediaClass?: string;
  iconMediaUpload: JSX.Element;
  maxSize: number;
  allowURL: boolean;
  accept: string;
  multiple?: number;
  medias?: MediaData | MediaData[] | null;
  type: MediaType;
  mediaName: string;
  viewOnly?: boolean;
  extraText?: string;
  /** Single upload: gán media vào set có sẵn */
  mediaSetId?: string;

  // ── setMode ──────────────────────────────────────────────────────────────
  /** value = mediaSetId thay vì mediaId */
  setMode?: boolean;
  /**
   * 'form' (default): chỉ resolve khi form submit
   * 'auto': gọi API ngay sau mỗi add/remove/reorder
   */
  setUpdateMode?: 'auto' | 'form';

  onMediaChange?: (medias: MediaData[]) => any;
  compressFn?: (file: File) => Promise<File>;
  children?: ({
    src, name, fileSize,
  }: { src: string; name: string; fileSize: number }) => JSX.Element;
}

export function InputMedia(props: InternalInputMediaProps) {
  const [wrapperProps] = splitProps(props, [
    'class', 'prefix', 'prefixClass', 'icon', 'iconClass',
    'suffix', 'suffixClass', 'endIcon', 'endIconClass',
    'ref', 'onWrapperFocus', 'onWrapperBlur', 'setMode', 'setUpdateMode', 'mediaSetId'
  ]);

  const controlType = () => (props.setMode || !props.multiple) ? 'id' : 'array';

  const { id, name, value, onChange, readOnly, error, hasInited } =
    createControl<string | string[] | null>(controlType() as any, props);

  const [isDragging, setIsDragging] = createSignal(false);
  const [medias, setMedias] = createSignal<(MediaData & MediaState)[]>([]);
  const [uploading, setUploading] = createSignal(false);
  const [syncingSet, setSyncingSet] = createSignal(false);

  // pendingMediaIds !== null → có thay đổi chờ submit (form mode)
  // pendingMediaIds === null → chưa có thay đổi
  const [pendingMediaIds, setPendingMediaIds] = createSignal<string[] | null>(null);

  const maxSize = () => props.maxSize || 25;
  const allowURL = () => props.allowURL ?? true;
  const accept = () => props.accept;
  const isMobileOrTablet = checkMobileOrTablet();

  // ── Mode flags ────────────────────────────────────────────────────────────

  const isSetMode = () => !!props.setMode;
  const isAutoMode = () => isSetMode() && props.setUpdateMode === 'auto';
  const isFormMode = () => isSetMode() && props.setUpdateMode !== 'auto';


  const isMultiMode = () => !!props.multiple || isSetMode();

  // ── currentSetId: dùng ref nội bộ để tránh stale closure ─────────────────
  //
  // Bug gốc: applyMediaSet đọc currentSetId() từ value() — nhưng value() là
  // signal từ createControl, không cập nhật đồng bộ trong cùng một async call.
  // Fix: dùng localSetId ref riêng, sync ngay khi onChange được gọi.
  //
  let localSetIdRef: string | null = null;

  // Sync localSetIdRef từ value() khi component init (edit mode)
  createEffect(() => {
    if (isSetMode() && hasInited()) {
      const v = value() as string | null;
      untrack(() => {
        // Chỉ sync một chiều: value → ref (không ghi đè sau khi đã có)
        if (v && !localSetIdRef) localSetIdRef = v;
      });
    }
  });

  const getCurrentSetId = (): string | null => {
    if (!isSetMode()) return null;
    // Ưu tiên ref nội bộ (luôn mới nhất), fallback về value()
    return localSetIdRef ?? (value() as string | null);
  };

  const setCurrentSetId = (id: string | null) => {
    localSetIdRef = id;
    onChange(id as any);
  };

  // ── MediaSet API ──────────────────────────────────────────────────────────

  const requireUploadMedia = () => {
    const um = baseConfig().uploadMedia;
    if (!um) throw new Error('[InputMedia setMode] baseConfig().uploadMedia chưa được cấu hình.');
    return um;
  };

  const applyMediaSet = async (newMediaIds: string[]): Promise<string> => {
    const um = requireUploadMedia();
    const setId = getCurrentSetId(); // đọc ref nội bộ, luôn đúng
    if (setId) {
      await um.updateMediaSet(setId, newMediaIds);
      return setId;
    }
    const set = await um.createMediaSet(newMediaIds);
    return set.id;
  };

  // ── resolvePendingMediaSet ────────────────────────────────────────────────
  //
  // Được DatatableFormlog gọi trước khi submit (form mode).

  const resolvePendingMediaSet = async (): Promise<string | null> => {
    if (!isFormMode()) return getCurrentSetId();

    const ids = pendingMediaIds();
    if (ids === null) return getCurrentSetId(); // không có thay đổi

    if (ids.length === 0) {
      setCurrentSetId(null);
      setPendingMediaIds(null);
      return null;
    }

    setSyncingSet(true);
    try {
      const setId = await applyMediaSet(ids);
      setCurrentSetId(setId);
      setPendingMediaIds(null);
      return setId;
    } catch (err: any) {
      toast().danger('Lỗi lưu bộ ảnh', err?.message);
      throw err;
    } finally {
      setSyncingSet(false);
    }
  };

  // ── Đăng ký resolver vào registry ────────────────────────────────────────
  // Key = field name khi có (để DatatableFormlog biết inject vào field nào),
  // fallback về component id khi fieldless.

  const registryKey = () => name() || id();

  onMount(() => {
    if (isFormMode()) {
      mediaSetResolverRegistry.set(registryKey(), resolvePendingMediaSet);
    }
  });

  onCleanup(() => {
    if (isFormMode()) {
      mediaSetResolverRegistry.delete(registryKey());
    }
  });

  // ── onMediaIdsChanged ─────────────────────────────────────────────────────
  //
  // Chỉ gọi sau khi TẤT CẢ files trong batch đã upload xong (xem uploadMedias).
  // Tránh gọi nhiều lần với ids thiếu khi upload song song.

  const onMediaIdsChanged = async (newMediaIds: string[]) => {
    if (!isSetMode()) {
      onChange(newMediaIds as any);
      return;
    }
    if (isAutoMode()) {
      setSyncingSet(true);
      try {
        const setId = await applyMediaSet(newMediaIds);
        // Luôn gọi setCurrentSetId để cập nhật ref + onChange
        setCurrentSetId(setId);
      } catch (err: any) {
        toast().danger('Lỗi đồng bộ bộ ảnh', err?.message);
      } finally {
        setSyncingSet(false);
      }
    } else {
      // form mode: chỉ lưu pending, không gọi API
      setPendingMediaIds([...newMediaIds]);
    }
  };

  // ── Effects ───────────────────────────────────────────────────────────────

  createEffect(() => { props.onMediaChange?.(medias().filter((x) => x.id)); });

  const mediaIds = () => medias().map((x) => x.id || '').filter(Boolean);

  createEffect(() => {
    if (hasInited() && props.medias) {
      untrack(() => {
        const incoming = Array.isArray(props.medias) ? props.medias : [props.medias!];
        setMedias([
          ...medias(),
          ...incoming.map((media) => ({
            ...media,
            key: generateId(),
            file: null,
            loading: false,
            error: false,
          })),
        ]);
      });
    }
  });

  createEffect(() => {
    if (hasInited()) {
      const val = value();
      untrack(() => {
        if (isSetMode()) return;
        if (props.multiple) return;
        if (val !== medias()[0]?.id) setMedias([]);
      });
    }
  });

  // ── Styles ────────────────────────────────────────────────────────────────

  const inputMediaClass = () =>
    mergeClass(`relative flex flex-wrap items-start gap-2`, props.class);

  const mediaClass = () => {
    const hasMedia = isSetMode()
      ? medias().length > 0
      : (props.multiple && (value() as string[])?.length) ||
      (!props.multiple && (value() || uploading()));
    return mergeClass(
      'min-h-14',
      'self-auto h-auto rounded-sm border border-neutral-200',
      hasMedia ? 'border-solid' : 'border-dashed',
      error() && 'border-danger',
      props.mediaClass,
    );
  };

  const imageActionWrapperClass = () =>
    mergeClass(
      'flex items-center gap-2 text-sm',
      !isMultiMode() && uploading() && 'opacity-80 pointer-events-none',
    );

  let uploadInputRef!: HTMLInputElement;

  // ── Upload helpers ────────────────────────────────────────────────────────

  const uploadCreate = async (file: File) =>
    baseConfig().uploadMedia!.create(file, { setId: props.mediaSetId });

  const uploadFromLink = async (url: string) => {
    if (!baseConfig().uploadMedia) { toast().info('No upload media found!'); return; }
    let file!: File;
    try {
      setUploading(true);
      new URL(url);
      file = await baseConfig().uploadMedia!.getFileFromUrl(url);
      if (!file.size) throw Error('media_invalid');
      if (isMultiMode()) await uploadMedias([file]);
      else await uploadMedia(file);
    } catch (err: any) {
      toast().danger(
        file ? baseConfig().mediaFailedLabel(props.mediaName)
          : baseConfig().mediaUploadFromURLFailedLabel(props.mediaName),
        err?.message,
      );
    } finally {
      setUploading(false);
    }
  };

  const uploadMedia = async (file: File) => {
    if (!baseConfig().uploadMedia) { toast().info('No upload media found!'); return; }
    if (!verifyFileAccept(file, props.accept)) {
      toast().info(baseConfig().mediaUploadInvalidFormatLabel(
        props.mediaName,
        props.accept.split(',').map((t) => t.split('/').pop()).join(', '),
      ));
      return;
    }
    try {
      onChange(null);
      setUploading(true);
      const uploadFile = props.compressFn ? await props.compressFn(file) : file;
      const newMedia = {
        id: '', url: '', fileName: '', fileSize: 0,
        key: '', file: uploadFile, loading: true, error: false,
      };
      setMedias([newMedia]);
      if (uploadFile.size > maxSize() * 1024 * 1024) {
        toast().info(baseConfig().mediaUploadExceedMaxSizeLabel(maxSize()));
        return;
      }
      const res = await uploadCreate(uploadFile);
      if (res) {
        setMedias([{ ...newMedia, ...res, loading: false }]);
        onChange(res.id || null);
      }
    } catch (err: any) {
      toast().danger(baseConfig().mediaFailedLabel(props.mediaName), err?.message);
      setMedias([]);
    } finally {
      setUploading(false);
    }
  };

  const uploadMedias = async (files: File[]) => {
    if (!baseConfig().uploadMedia) { toast().info('No upload media found!'); return; }

    const limit = props.multiple ?? Infinity;
    if (files.length + medias().length > limit) {
      toast().info(baseConfig().mediaUploadExceedMaxNumberLabel(props.multiple!, props.mediaName));
      return;
    }
    if (!files.every((f) => verifyFileAccept(f, props.accept))) {
      toast().info(baseConfig().mediaUploadInvalidFormatLabel(
        props.mediaName,
        props.accept.split(',').map((t) => t.split('/').pop()).join(', '),
      ));
      return;
    }

    const newMedias: (MediaData & MediaState)[] = files.map(() => ({
      id: undefined, url: '', fileName: '', fileSize: 0,
      key: generateId(), file: null, loading: true, error: false,
    }));
    const startIndex = medias().length;
    setMedias((prev) => [...prev, ...newMedias]);

    // Upload song song nhưng KHÔNG gọi onMediaIdsChanged trong từng file
    // → chờ tất cả xong rồi gọi 1 lần với danh sách ids đầy đủ
    await Promise.all(
      newMedias.map(async (newMedia, index) => {
        try {
          const file = files[index];
          const uploadFile = props.compressFn ? await props.compressFn(file) : file;
          setMedias((prev) => {
            prev[startIndex + index] = { ...prev[startIndex + index], file: uploadFile };
            return [...prev];
          });
          if (uploadFile.size > maxSize() * 1024 * 1024) {
            const msg = baseConfig().mediaUploadExceedMaxSizeLabel(maxSize());
            toast().info(msg);
            throw new Error(msg);
          }
          const media = await uploadCreate(uploadFile);
          setMedias((prev) => {
            const i = prev.findIndex((x) => x.key === newMedia.key);
            if (i < 0) return prev;
            prev[i] = { ...prev[i], ...media, loading: false, file: uploadFile };
            return [...prev];
          });
        } catch (err: any) {
          toast().danger(baseConfig().mediaFailedLabel(props.mediaName), err?.message);
          setMedias((prev) => {
            const i = prev.findIndex((x) => x.key === newMedia.key);
            if (i < 0) return prev;
            prev[i] = { ...prev[i], loading: false, error: true };
            return [...prev];
          });
        }
      }),
    );

    // Gọi 1 lần duy nhất sau khi tất cả files đã xong
    // mediaIds() lúc này đã có đủ ids của cả batch
    await onMediaIdsChanged(mediaIds());
  };

  // ── Reorder / Remove ──────────────────────────────────────────────────────

  const handleReorder = async (newList: (MediaData & MediaState)[]) => {
    setMedias(newList);
    await onMediaIdsChanged(newList.map((x) => x.id).filter(Boolean) as string[]);
  };

  const handleRemove = async (key: string) => {
    let remaining: (MediaData & MediaState)[] = [];
    setMedias((prev) => {
      const i = prev.findIndex((x) => x.key === key);
      if (i >= 0) prev.splice(i, 1);
      remaining = [...prev];
      return remaining;
    });
    await onMediaIdsChanged(remaining.map((x) => x.id).filter(Boolean) as string[]);
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const ratioLabel = () =>
    props.ratio === 'square' ? '1:1'
      : props.ratio === 'video' ? '16:9'
        : props.ratio ? (props.ratio as string).replace('/', ':').trim()
          : '1:1';

  const [fileInputValue, setFileInputValue] = createSignal('');
  const iconMediaUpload = () => props.iconMediaUpload || baseConfig().iconSpinner();
  const onSingleUploadClick = () => { if (!uploading() && !value()) uploadInputRef.click(); };

  const subText = () => {
    if (isSetMode()) return `${medias().length}`;
    if (props.multiple) return `${(value() as string[])?.length || 0}/${props.multiple}`;
    return '';
  };

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <div
      id={id()}
      class={inputMediaClass()}
      ref={props.ref}
      onDragEnter={() => setIsDragging(true)}
      onDragLeave={(e) => {
        if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsDragging(false);
      }}
    >
      {/* Multi-thumbnails */}
      <Show when={isMultiMode() && medias().length > 0}>
        <For each={medias()}>
          {(media) => (
            <InputImg
              type={props.type}
              iconMediaUpload={media.loading ? baseConfig().iconSpinner() : iconMediaUpload()}
              iconClass={wrapperProps.iconClass}
              class={mergeClass(mediaClass(), media.loading && 'bg-neutral-100', media.error && 'bg-danger-100')}
              name={media.fileName}
              fileSize={media.fileSize}
              size={props.size}
              ratio={props.ratio}
              freeform={props.freeform}
              square={props.square}
              video={props.video}
              contain={props.contain}
              disabled={media.loading || syncingSet()}
              hasError={media.error}
              loading={media.loading}
              src={media.file ? URL.createObjectURL(media.file) : media.url}
              children={props.children}
              hasAction={!props.viewOnly}
              onLeftClick={async () => {
                const index = medias().findIndex((x) => x.key === media.key);
                if (index <= 0) return;
                const next = [...medias()];
                [next[index - 1], next[index]] = [next[index], next[index - 1]];
                await handleReorder(next);
              }}
              onRightClick={async () => {
                const index = medias().findIndex((x) => x.key === media.key);
                if (index >= medias().length - 1) return;
                const next = [...medias()];
                [next[index + 1], next[index]] = [next[index], next[index + 1]];
                await handleReorder(next);
              }}
              onRemoveClick={() => handleRemove(media.key)}
            />
          )}
        </For>
      </Show>

      {/* Add button / single preview */}
      <InputImg
        type={props.type}
        iconClass={wrapperProps.iconClass}
        name={medias()?.[0]?.fileName}
        fileSize={medias()?.[0]?.fileSize}
        size={props.size}
        ratio={props.ratio}
        freeform={props.freeform}
        square={props.square}
        video={props.video}
        contain={props.contain}
        subText={isMultiMode() && !props.viewOnly ? subText() : ''}
        loading={isMultiMode() ? false : uploading()}
        src={
          isMultiMode()
            ? ''
            : medias()?.[0]?.file
              ? URL.createObjectURL(medias()[0].file as File)
              : (medias()?.[0]?.url as string)
        }
        iconMediaUpload={iconMediaUpload()}
        disabled={uploading() || syncingSet() || readOnly() || props.viewOnly || false}
        hasError={false}
        class={mediaClass()}
        children={props.children}
        {...(isMultiMode()
          ? { onClick: () => uploadInputRef.click() }
          : value() ? {} : { onClick: onSingleUploadClick }
        )}
      />

      {/* Syncing overlay */}
      <Show when={syncingSet()}>
        <div class="absolute inset-0 z-20 flex items-center justify-center rounded-sm bg-white/60 text-xs text-neutral-500">
          Đang lưu bộ ảnh...
        </div>
      </Show>

      {/* Hidden file input */}
      <input
        type="file"
        class="hidden"
        accept={props.type === 'image' ? 'image/*' : accept()}
        multiple={isMultiMode()}
        ref={(el) => (uploadInputRef = el)}
        value={fileInputValue()}
        onChange={(e) => {
          if (readOnly() || props.viewOnly) return;
          if (isMultiMode()) {
            const files = e.target.files;
            if (files) uploadMedias(Array.from(files));
          } else {
            const file = e.target.files?.item(0);
            if (file) uploadMedia(file);
          }
          setFileInputValue('');
        }}
        readOnly={readOnly()}
      />

      {/* Action bar */}
      <Show when={!props.viewOnly}>
        <div>
          <div class={imageActionWrapperClass()}>
            <Show when={isMultiMode() || !value()}>
              <Button
                sm light
                icon={baseConfig().iconUpload()}
                label={baseConfig().mediaUploadLabel(props.mediaName)}
                onClick={() => uploadInputRef.click()}
                disabled={readOnly() || syncingSet()}
              />
              <Show when={!isMobileOrTablet && allowURL()}>
                <span>{baseConfig().mediaOr}</span>
                <Button
                  sm outline
                  disabled={readOnly() || syncingSet()}
                  label={baseConfig().mediaPasteLabel(props.mediaName)}
                  class="bg-lightest focus-within:border-main focus-within:bg-main-50 focus-within:text-main hover:bg-neutral-50"
                  onClick={(e) => {
                    const input = (e.currentTarget as HTMLButtonElement).querySelector('input');
                    input?.focus();
                  }}
                >
                  <Input
                    onPaste={(e) => {
                      if (!e.clipboardData) return;
                      const url = e.clipboardData.getData('text');
                      if (checkUrlValid(url)) {
                        uploadFromLink(url);
                        (e.target as HTMLInputElement)?.blur();
                        return;
                      }
                      const files = e.clipboardData.files;
                      if (!files.length) return;
                      if (isMultiMode()) uploadMedias(Array.from(files));
                      else uploadMedia(files[0]);
                      (e.target as HTMLInputElement)?.blur();
                    }}
                    class="absolute top-0 left-0 h-full w-full opacity-0"
                    fieldless
                  />
                </Button>
              </Show>
            </Show>
            <Show when={!isMultiMode() && value()}>
              <Button
                sm outline
                label={baseConfig().mediaClearLabel(props.mediaName)}
                onClick={() => { onChange(null); setFileInputValue(''); }}
                disabled={readOnly()}
              />
            </Show>
          </div>
          <div class="mt-1 text-xsm font-medium text-neutral">
            {!props.hideRatioLabel && props.ratio !== 'freeform'
              ? `${baseConfig().mediaUploadRatioLabel(ratioLabel())}. `
              : ''}
            {baseConfig().mediaUploadMaxSizeLabel(maxSize())}. {props.extraText}
          </div>
        </div>
      </Show>

      {/* Drag overlay */}
      <Show when={isDragging()}>
        <div
          class="absolute top-0 left-0 z-10 flex-col-center h-full w-full gap-0.5 rounded-sm border border-dashed border-light bg-white text-sm font-medium"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            const files = e.dataTransfer?.files;
            if (files?.length) {
              if (isMultiMode()) uploadMedias(Array.from(files));
              else uploadMedia(files[0]);
            }
            e.preventDefault();
            setIsDragging(false);
          }}
        >
          {baseConfig().iconUpload()}
          {baseConfig().mediaDragLabel(props.mediaName)}
        </div>
      </Show>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// InputImg
// ─────────────────────────────────────────────────────────────────────────────

function InputImg(
  props: ImgProps & {
    type: MediaType;
    iconMediaUpload: JSX.Element;
    iconClass?: string;
    name?: string;
    fileSize?: string | number;
    disabled: boolean;
    loading?: boolean;
    hasError: boolean;
    subText?: string;
    hasAction?: boolean;
    onLeftClick?: () => any;
    onRemoveClick?: () => any;
    onRightClick?: () => any;
    children?: ({ src, name, fileSize }: { src: string; name: string; fileSize: number }) => JSX.Element;
  },
) {
  let ref!: HTMLElement;
  const isMobileOrTablet = checkMobileOrTablet();
  const iconClass = () => mergeClass('text-xl flex', props.loading && 'text-neutral-800', props.iconClass);
  const imgClass = () => mergeClass(props.loading && 'opacity-50', props.class);
  const uniqueId = generateId();
  const [openLightbox, setOpenLightbox] = createSignal<MouseEvent>();

  return (
    <div class={`group relative ${props.disabled ? 'pointer-events-none opacity-50' : ''}`}>
      <Img
        {...props}
        class={imgClass()}
        ref={(el) => (ref = el)}
        shouldOpenLightboxOnClick={!isMobileOrTablet}
        src={props.hasError || props.type !== 'image' ? '' : props.src}
      />
      {props.children?.({ src: props.src, name: props.name, fileSize: props.fileSize })}

      <Show when={props.hasError || props.loading || !props.src}>
        <span class={`pointer-events-none absolute top-0 left-0 z-10 flex-col-center h-full w-full ${props.hasError ? 'text-danger' : props.disabled ? '' : 'group-hover:text-main'}`}>
          <i class={iconClass()}>
            {props.hasError
              ? baseConfig().iconDanger()
              : props.loading
                ? baseConfig().iconSpinner()
                : props.iconMediaUpload}
          </i>
          <Show when={props.subText}>
            <span class="mt-0.5 text-xs">{props.subText}</span>
          </Show>
        </span>
      </Show>

      <Show when={props.hasAction}>
        {/* Mobile */}
        <Show when={isMobileOrTablet}>
          <Dropdown reference={ref} class="min-w-0 flex-row gap-1">
            <Dropdown.Button light icon={baseConfig().iconArrowLeft()} onClick={props.onLeftClick} />
            <Dropdown.Button light danger icon={baseConfig().iconX()} onClick={props.onRemoveClick} />
            <Show when={!props.hasError && props.type === 'image' && props.src}>
              <Dropdown.Button light info icon={baseConfig().iconEyeOn()} onClick={(e) => setOpenLightbox(e)} />
            </Show>
            <Dropdown.Button light icon={baseConfig().iconArrowRight()} onClick={props.onRightClick} />
          </Dropdown>
          <Show when={!props.hasError && props.type === 'image' && props.src}>
            <Lightbox id={uniqueId} src={props.src as string} isOpen={openLightbox()} onClose={() => setOpenLightbox()} />
          </Show>
        </Show>

        {/* Desktop */}
        <Show when={!isMobileOrTablet}>
          <div class="absolute -bottom-1 left-1/2 z-10 hidden -translate-x-1/2 rounded-full border border-neutral-100 bg-white group-hover:flex">
            <Button class="h-5 w-5 rounded-full" flat compact iconClass="text-sm" icon={baseConfig().iconArrowLeft()} onClick={props.onLeftClick} />
            <Button class="h-5 w-5 rounded-full" flat compact iconClass="text-sm" interactDanger icon={baseConfig().iconX()} onClick={props.onRemoveClick} />
            <Button class="h-5 w-5 rounded-full" flat compact iconClass="text-sm" icon={baseConfig().iconArrowRight()} onClick={props.onRightClick} />
          </div>
        </Show>
      </Show>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function verifyFileAccept(file: File, accept: string): boolean {
  if (!accept) return true;
  const type = file.type;
  const allowed = accept.split(',').map((x) => x.trim());
  if (allowed.includes('*/*')) return true;
  return allowed.includes(type) || allowed.includes(type.split('/')[0] + '/*');
}
