import { Button } from '@core/components/button/Button';
import { baseConfig } from '@core/components/config/BaseConfig';
import { closeModal } from '@core/components/modal/ModalProvider';
import { mergeClass } from '@core/helpers/class';
import { Dialog, DialogProps } from './Dialog';

export interface VideoboxProps extends DialogProps {
  src: string;
  alt?: string;
  videoClass?: string;
}
export function Videobox(props: VideoboxProps) {
  const lightboxClass = () =>
    mergeClass(
      'relative max-w-(--breakpoint-md) bg-transparent shadow-none border-none flex-col-center min-w-16 min-h-16',
      props.class,
    );
  const videoClass = () =>
    mergeClass(
      `w-auto h-auto object-contain rounded-sm min-w-60 p-4`,
      props.scrollable ? '' : 'max-h-full',
      props.videoClass,
    );

  return (
    <>
      <Dialog {...props} class={lightboxClass()}>
        {/* <Show when={!videoLoaded()}>
          <div class="pointer-events-none fixed left-0 top-0 h-full w-full text-5xl flex-center">
            {baseConfig().iconSpinner()}
          </div>
        </Show> */}
        <video class={videoClass()} controls>
          <source
            src={props.src}
            // onCanPlay={(e) => {
            //   setVideoLoaded(true);
            // }}
          />
        </video>
        <Button
          sm
          light
          class="absolute top-0 right-0 z-100 rounded-full border border-neutral-200 shadow-sm"
          icon={baseConfig().iconClose()}
          onClick={() => {
            closeModal(props.id);
          }}
        />
      </Dialog>
    </>
  );
}
