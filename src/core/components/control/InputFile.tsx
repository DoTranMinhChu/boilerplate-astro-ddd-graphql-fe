import { formatFileSize } from '@core/helpers/number';
import { onMount } from 'solid-js';
import { baseConfig } from '../config/BaseConfig';
import { createTooltip } from '../tooltip/createTooltip';
import { InputMedia, InputMediaProps } from './InputMedia';

export interface InputFileProps extends InputMediaProps {}
export function InputFile(props: InputFileProps) {
  return (
    <InputMedia
      allowURL={false}
      type="file"
      ratio={'19/8'}
      hideRatioLabel
      maxSize={10}
      accept={`*/*`}
      iconMediaUpload={baseConfig().iconFileUpload()}
      mediaClass="min-w-32"
      mediaName={baseConfig().fileLabel}
      {...props}
    >
      {(file) => {
        if (!file || !file.src) return <></>;

        const { src, name, fileSize } = file;
        let ref: HTMLDivElement;
        if (!name || !src) return <></>;

        const lastIndex = name.lastIndexOf('.');
        const fileName = name.substring(0, lastIndex);
        const fileExtension = name.substring(lastIndex + 1);

        onMount(() => {
          createTooltip(ref, fileName);
        });

        return (
          <div
            class="group absolute left-0 top-0 h-full w-full cursor-pointer whitespace-nowrap p-1 flex-column"
            onClick={() => {
              window.open(src, '_blank');
            }}
          >
            <div
              class="flex flex-1 items-end px-1 pb-0.5 text-sm font-medium group-hover:text-main"
              ref={(el) => (ref = el)}
            >
              <span class="mr-1 mt-1">{baseConfig().iconFile()}</span>
              <span class="flex-1 overflow-hidden text-ellipsis">
                {fileName}
              </span>
            </div>
            <div class="flex justify-between rounded-xs bg-neutral-50 px-1 py-0.5 text-xs group-hover:bg-main-100">
              <span class="flex-1 font-bold uppercase">{fileExtension}</span>
              <span class="flex-1 text-right">{formatFileSize(fileSize)}</span>
            </div>
          </div>
        );
      }}
    </InputMedia>
  );
}
