import { generateId } from '@core/helpers/util';
import { createSignal } from 'solid-js';
import { baseConfig } from '../config/BaseConfig';
import { Videobox } from '../dialog/Videobox';
import { InputMedia, InputMediaProps } from './InputMedia';

export interface InputVideoProps extends InputMediaProps {}
export function InputVideo(props: InputVideoProps) {
  const id = generateId();
  const [openVideobox, setOpenVideobox] = createSignal<MouseEvent>();

  return (
    <InputMedia
      allowURL={false}
      type="video"
      video
      maxSize={50}
      accept={`video/mp4,video/webm,video/ogg`}
      iconMediaUpload={baseConfig().iconVideoUpload()}
      mediaName={baseConfig().videoLabel}
      {...props}
    >
      {(video) => {
        if (!video || !video.src) return <></>;
        const { src } = video;
        return (
          <div class="group flex-center absolute top-0 left-0 h-full w-full cursor-pointer rounded-sm bg-black">
            <video
              class="h-full w-full rounded-sm"
              onClick={(e) => setOpenVideobox(e)}
            >
              <source src={src} />
            </video>
            <i class="pointer-events-none absolute text-3xl text-white opacity-90 transition group-hover:scale-125 group-hover:opacity-100">
              {baseConfig().iconVideoPlay()}
            </i>
            <Videobox
              id={id}
              src={src}
              isOpen={openVideobox()}
              onClose={() => {
                setOpenVideobox();
              }}
            />
          </div>
        );
      }}
    </InputMedia>
  );
}
