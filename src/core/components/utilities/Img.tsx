import { mergeClass } from '@core/helpers/class';
import { createOnScreen } from '@core/helpers/screen';
import { generateId } from '@core/helpers/util';
import { createEffect, createSignal } from 'solid-js';
import { baseConfig } from '../config/BaseConfig';
import { Lightbox } from '../dialog/Lightbox';

const DEFAULT_BLANK_IMAGE = `data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7`;
export type ExceptionImageType = 'blank' | 'default';
export type ImageSize =
  | 'thumb' // 150px
  | 'small' // 320px
  | 'medium' // 768px
  | 'large' // 1280px
  | 'fullwidth' // 2560px
  | 'optimized'; // 1920px
export type ImgProps = BaseProps &
  OmitStrict<
    JSX.ImgHTMLAttributes<HTMLImageElement>,
    'src' | 'alt' | 'loading' | 'children'
  > & {
    src?: string | JSX.Element | undefined;
    size?: ImageSize;
    alt?: string;
    isAvatar?: boolean;
    /** Square: 1 / 1. Video: 16 / 9. Accept a ratio number or a string with M / N format */
    ratio?: 'freeform' | 'square' | 'video' | number | (string & {});
    freeform?: boolean;
    square?: boolean;
    video?: boolean;
    bordered?: boolean;
    contain?: boolean;
    defaultImage?: string;
    blankImage?: string;
    emptyState?: ExceptionImageType;
    errorState?: ExceptionImageType;
    onClick?: (e: MouseEvent) => any;
    shouldOpenLightboxOnClick?: boolean;
    lazyload?: boolean;
  };
export function Img(props: ImgProps) {
  const id = generateId();
  const [hasError, setHasError] = createSignal(false);
  const [hasLoaded, setHasLoaded] = createSignal(
    import.meta.env.SSR ? true : false,
  );
  const shouldOpenLightboxOnClick = () =>
    props.src && hasLoaded() && !hasError() && props.shouldOpenLightboxOnClick
      ? true
      : false;
  const ratio = () =>
    props.ratio ||
    ((props.square || props.isAvatar) && 'square') ||
    (props.video && 'video') ||
    (props.freeform && 'freeform');
  const lazyload = () => props.lazyload ?? (import.meta.env.SSR ? false : true);
  const typeClass = () => (props.contain ? `object-contain` : `object-cover`);
  const clickable = () => !!props.onClick || shouldOpenLightboxOnClick();
  const imgClass = () =>
    mergeClass(
      'relative',
      props.bordered
        ? `border border-neutral-200  ${clickable() ? 'hover:border-neutral-300' : ''}`
        : ``,
      typeClass(),
      ratio() == 'square'
        ? `aspect-square`
        : ratio() == 'video'
          ? 'aspect-video'
          : '',
      props.isAvatar ? 'rounded-full' : 'rounded',
      !hasError() &&
      !hasLoaded() &&
      ratio() !== 'freeform' &&
      'bg-neutral-50 animate-pulse',
      clickable() && `cursor-pointer`,
      props.class,
    );
  const style = () => {
    return {
      ...(props.ratio ? { 'aspect-ratio': props.ratio } : {}),
      ...(props.style as JSX.CSSProperties),
    } as JSX.CSSProperties;
  };
  const defaultImage = () => props.defaultImage || baseConfig().defaultImage;
  const blankImage = () => props.blankImage || DEFAULT_BLANK_IMAGE;
  const emptyState = () => props.emptyState || 'blank';
  const errorState = () => props.errorState || 'default';
  const src = () => {
    if (!props.src) {
      if (emptyState() == 'blank') {
        return blankImage();
      } else {
        return defaultImage();
      }
    } else if (hasError()) {
      if (errorState() == 'blank') {
        return blankImage();
      } else {
        return defaultImage();
      }
    } else {
      return props.src;
    }
  };
  const size = () => props.size || 'thumb';
  const optimizedSrc = () =>
    (props.src && typeof props.src === 'string' && props.src.startsWith('http')
      ? getSrcWithSize(props.src, size())
      : src()) as string;

  const [ref, setRef] = createSignal<HTMLImageElement>();
  const { unobserve, hadOnScreen } = createOnScreen({ ref, margin: 8 });

  const finalSrc = () =>
    lazyload()
      ? hadOnScreen()
        ? optimizedSrc()
        : blankImage()
      : optimizedSrc();

  createEffect(() => {
    if (props.src) {
      setHasError(false);
    }
  });

  createEffect(() => {
    if (hadOnScreen()) {
      unobserve();
    }
  });

  const [openLightbox, setOpenLightbox] = createSignal<MouseEvent>();

  return (
    <>
      {typeof props.src !== 'function' && typeof props.src !== 'object' ? (
        <>
          <img
            {...props}
            ref={setRef}
            class={imgClass()}
            src={finalSrc()}
            alt={props.alt}
            style={style()}
            onLoadStart={() => {
              setHasError(false);
              setHasLoaded(false);
            }}
            onLoad={(e) => {
              setHasLoaded(true);
              if (typeof props.onLoad === 'function') {
                props.onLoad(e);
              }
            }}
            onError={() => {
              setHasError(true);
            }}
            onClick={(e) => {
              if (props.onClick) {
                props.onClick(e);
              } else if (
                hasLoaded() &&
                !hasError() &&
                shouldOpenLightboxOnClick()
              ) {
                setOpenLightbox(e);
              }
            }}
          />
          {shouldOpenLightboxOnClick() && (
            <Lightbox
              id={id}
              src={src() as string}
              isOpen={openLightbox()}
              onClose={() => {
                setOpenLightbox();
              }}
            />
          )}
        </>
      ) : (
        props.src
      )}
    </>
  );
}

function getSrcWithSize(src: string, size: string) {
  const url = new URL(src);
  url.searchParams.append('size', size);
  return url.toString();
}
