import { joinClass } from '@core/helpers/class';
import {
  compressImageFile,
  DEFAULT_IMAGE_ACCEPT,
  DEFAULT_IMAGE_MAX_SIZE_IN_MB,
  DEFAULT_MAX_HEIGHT,
  DEFAULT_MAX_WIDTH,
  DEFAULT_QUALITY,
} from '@core/helpers/image';
import { baseConfig } from '../config/BaseConfig';
import { ImageSize } from '../utilities/Img';
import { InputMedia, InputMediaProps } from './InputMedia';

export interface InputImageProps extends InputMediaProps {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  maxSizeInMb?: number;
  size?: ImageSize;
  /**
   * ID của MediaSet để gắn ảnh upload vào.
   * Pass-through xuống InputMedia → uploadMedia.create(file, { setId }).
   * Optional — nếu không truyền thì hành vi giống cũ.
   */
  mediaSetId?: string;
}

export function InputImage(props: InputImageProps) {
  const quality = () => props.quality || DEFAULT_QUALITY;
  const maxWidth = () => props.maxWidth || DEFAULT_MAX_WIDTH;
  const maxHeight = () => props.maxHeight || DEFAULT_MAX_HEIGHT;
  const maxSizeInMb = () => props.maxSizeInMb || DEFAULT_IMAGE_MAX_SIZE_IN_MB;
  const accept = () => props.accept || DEFAULT_IMAGE_ACCEPT;
  const size = () => props.size || (props.freeform ? 'small' : 'thumb');

  return (
    <InputMedia
      allowURL
      type="image"
      size={size()}
      maxSize={maxSizeInMb()}
      accept={accept()}
      iconMediaUpload={baseConfig().iconImageUpload()}
      mediaName={baseConfig().imageLabel}
      mediaClass={joinClass(`h-14`, props.mediaClass)}
      setMode={props.setMode}
      setUpdateMode={props.setUpdateMode || "auto"}
      compressFn={async (file) =>
        await compressImageFile(file, {
          quality: quality(),
          maxWidth: maxWidth(),
          maxHeight: maxHeight(),
          accept: accept(),
          maxSizeInMb: maxSizeInMb(),
        })
      }
      {...props}
    />
  );
}