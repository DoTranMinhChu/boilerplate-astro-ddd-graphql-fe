import { UploadMedia } from '@core/api/uploadMedia';
import { createSignal } from 'solid-js';
import { baseEventConfig } from './BaseEventConfig';
import { baseIconConfig } from './BaseIconConfig';
import { baseTextConfig } from './BaseTextConfig';

export type MediaConfig = {
  uploadMedia?: UploadMedia;
};

type BaseConfig = typeof baseIconConfig &
  typeof baseTextConfig &
  typeof baseEventConfig &
  MediaConfig;

export const [baseConfig, setConfig] = createSignal<BaseConfig>({
  ...baseIconConfig,
  ...baseTextConfig,
  ...baseEventConfig,
} as BaseConfig);
export const setBaseConfig = (config: BaseConfig) => {
  setConfig({
    ...baseIconConfig,
    ...baseTextConfig,
    ...baseEventConfig,
    ...config,
  });
};
