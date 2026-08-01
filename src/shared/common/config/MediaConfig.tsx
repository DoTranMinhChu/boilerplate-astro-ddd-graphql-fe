
import { UploadMedia } from '@/core/api/uploadMedia';
import { EMediaType } from '@/shared/generated/typed-graphql';
import { MediaService } from '@/shared/services/media/media.service';
import { MediaSetService } from '@/shared/services/mediaSet/mediaSet.service';
import { MediaConfig } from '@core/components/config/BaseConfig';

export const mediaConfig: MediaConfig = {
  uploadMedia: new UploadMedia({
    strategy: 's3',
    createMedia: (data: {
      fileId: string;
      fileName: string;
      fileSize?: number;
      type: EMediaType;
      url: string;
    }) => MediaService.createMedia({ input: data }) as any,
    generatePresignedUrl: (data: {
      contentType: string;
      contentLength: number;
    }) => MediaService.generatePresignedUrl({
      input: data
    }),
    mediaSet: {
      create: (data) => MediaSetService.createMediaSet({ data }) as any,
      update: (id, data) => MediaSetService.updateMediaSet({ id, data }) as any,
    },
  }),
};
