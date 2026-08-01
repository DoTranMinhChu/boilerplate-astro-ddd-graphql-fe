import { QRCodeToDataURLOptions, toDataURL } from 'qrcode';

export const generateQrDataUrl = async (
  data: string,
  options: QRCodeToDataURLOptions = {
    margin: 0,
  },
) => {
  const res = await toDataURL(data, options);
  return res as string;
};
