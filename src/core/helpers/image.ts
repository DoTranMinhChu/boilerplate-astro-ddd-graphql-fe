import Compressor from 'compressorjs';

export const DEFAULT_IMAGE_MAX_SIZE_IN_MB = 5;
export const DEFAULT_QUALITY = 0.8;
export const DEFAULT_MAX_WIDTH = 1920;
export const DEFAULT_MAX_HEIGHT = 1080;
export const DEFAULT_IMAGE_ACCEPT = `image/jpeg,image/png,image/gif,image/bmp,image/webp,image/avif`;

export const compressImageFile = async (
  file: File,
  {
    quality = DEFAULT_QUALITY,
    maxWidth = DEFAULT_MAX_WIDTH,
    maxHeight = DEFAULT_MAX_HEIGHT,
    accept = DEFAULT_IMAGE_ACCEPT,
    maxSizeInMb = DEFAULT_IMAGE_MAX_SIZE_IN_MB,
  }: {
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
    accept?: string;
    maxSizeInMb?: number;
  } = {
    quality: DEFAULT_QUALITY,
    maxWidth: DEFAULT_MAX_WIDTH,
    maxHeight: DEFAULT_MAX_HEIGHT,
    accept: DEFAULT_IMAGE_ACCEPT,
    maxSizeInMb: DEFAULT_IMAGE_MAX_SIZE_IN_MB,
  },
) => {
  return new Promise<File>((res, rej) => {
    new Compressor(file, {
      quality,
      maxWidth,
      maxHeight,
      convertTypes: accept,
      convertSize: maxSizeInMb * 1024 * 1024,
      success(result) {
        const finalFile = ensureFile(result, file.name);
        res(finalFile);
      },
      error(err) {
        rej(err.message);
      },
    });
  });
};

function ensureFile(blobOrFile: File | Blob, originalFileName: string) {
  // Check if it's already a File
  if (blobOrFile instanceof File) {
    return blobOrFile;
  }

  // If it's a Blob, convert it to a File
  const file = new File([blobOrFile], originalFileName, {
    type: blobOrFile.type, // Retain the original file type
    lastModified: Date.now(), // Set the current time as last modified
  });

  return file;
}
