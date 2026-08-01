import { baseConfig } from '../config/BaseConfig';
import { InputFile, InputFileProps } from './InputFile';

export interface InputAudioProps extends InputFileProps {}
export function InputAudio(props: InputAudioProps) {
  return (
    <InputFile
      accept={`audio/mp3,audio/wav,audio/ogg`}
      iconMediaUpload={baseConfig().iconAudioUpload()}
      name={baseConfig().audioLabel}
      {...props}
    />
  );
}
