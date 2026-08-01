import { Button } from '@core/components/button/Button';
import { baseConfig } from '@core/components/config/BaseConfig';
import { closeModal } from '@core/components/modal/ModalProvider';
import { mergeClass } from '@core/helpers/class';
import { Show, createSignal } from 'solid-js';
import { Dialog, DialogProps } from './Dialog';

export interface LightboxProps extends DialogProps {
  src: string;
  alt?: string;
  imageClass?: string;
}
export function Lightbox(props: LightboxProps) {
  const [imageLoaded, setImageLoaded] = createSignal(false);

  const lightboxClass = () =>
    mergeClass(
      'relative max-w-(--breakpoint-md) bg-transparent shadow-none border-none flex-col-center min-w-16 min-h-16',
      props.class,
    );
  const imageClass = () =>
    mergeClass(
      `w-auto h-auto object-contain rounded-sm min-w-60 p-4`,
      imageLoaded() ? '' : 'pointer-events-none',
      props.scrollable ? '' : 'max-h-full',
      props.imageClass,
    );

  return (
    <>
      <Dialog {...props} class={lightboxClass()}>
        <Show when={!imageLoaded()}>
          <div class="flex-center pointer-events-none fixed top-0 left-0 h-full w-full text-5xl">
            {baseConfig().iconSpinner()}
          </div>
        </Show>
        <img
          src={props.src}
          alt={props.alt}
          class={imageClass()}
          onLoad={() => {
            setImageLoaded(true);
          }}
          tabIndex={-1}
        />
        <Show when={imageLoaded()}>
          <Button
            sm
            light
            class="absolute top-0 right-0 z-100 rounded-full border border-neutral-200 shadow-sm"
            icon={baseConfig().iconClose()}
            onClick={() => {
              closeModal(props.id);
            }}
          />
        </Show>
      </Dialog>
    </>
  );
}
