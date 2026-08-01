import { generateQrDataUrl } from '@core/helpers/qr';
import { createEffect, createSignal } from 'solid-js';
import { Img, ImgProps } from './Img';

export interface QRCodeImageProps extends Omit<ImgProps, 'src'> {
  text: string;
}
export function QRCodeImage(props: QRCodeImageProps) {
  const [dataUrl, setDataUrl] = createSignal<string>();

  createEffect(() => {
    generateQrDataUrl(props.text).then(setDataUrl);
  });
  return <Img contain square {...props} src={dataUrl()} />;
}
