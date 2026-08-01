// @core/api/uploadMedia.ts

type UploadMediaStrategy = 's3';

type MediaData = {
  fileSize: number;
  fileName: string;
  fileId: string;
  type: EMediaType;
  url: string;
  isExternal: boolean;
  setId?: string;
};

enum EMediaType {
  FILE = 'FILE',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
}

type MediaCreateInput = {
  fileId: string;
  fileName: string;
  fileSize?: number;
  type: EMediaType;
  url: string;
  setId?: string;
};

// ── MediaSet types ────────────────────────────────────────────────────────────

export type MediaSetInput = {
  content?: string;
  mediaIds?: string[];
};

export type MediaSetResult = {
  id: string;
};

export type MediaSetConfig = {
  create: (data: MediaSetInput) => Promise<MediaSetResult>;
  update: (id: string, data: MediaSetInput) => Promise<MediaSetResult>;
};

// ── Constructor input ─────────────────────────────────────────────────────────

type UploadMediaConstructorInput = {
  strategy: UploadMediaStrategy;
  createMedia: (data: MediaCreateInput) => Promise<
    ({ id: string; fileSize: number } & Omit<MediaData, 'fileSize'>) | undefined
  >;
  generatePresignedUrl: ({
    contentType,
    contentLength,
  }: {
    contentType: string;
    contentLength: number;
  }) => Promise<{ url: string; fileId: string } | undefined>;
  /**
   * Optional — chỉ cần khi app dùng InputImage setMode.
   * Nếu không truyền mà gọi createMediaSet / updateMediaSet sẽ throw lỗi rõ ràng.
   */
  mediaSet?: MediaSetConfig;
};

// ─────────────────────────────────────────────────────────────────────────────

export class UploadMedia {
  private strategy: UploadMediaStrategy;
  private createMedia: UploadMediaConstructorInput['createMedia'];
  private generatePresignedUrl: UploadMediaConstructorInput['generatePresignedUrl'];
  private mediaSet?: MediaSetConfig;

  constructor({
    strategy,
    createMedia,
    generatePresignedUrl,
    mediaSet,
  }: UploadMediaConstructorInput) {
    this.strategy = strategy;
    this.createMedia = createMedia;
    this.generatePresignedUrl = generatePresignedUrl;
    this.mediaSet = mediaSet;
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private getFileType(file: File): EMediaType {
    if (file.type.match('image.*')) return EMediaType.IMAGE;
    if (file.type.match('video.*')) return EMediaType.VIDEO;
    if (file.type.match('audio.*')) return EMediaType.AUDIO;
    return EMediaType.FILE;
  }

  private async uploadFileS3(file: File, { url, fileId }: { url: string; fileId: string }) {
    const res = await fetch(url, {
      method: 'PUT',
      body: file,
      mode: 'cors',
      headers: {
        'Content-Type': file.type,
        'Content-Length': file.size.toString(),
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      },
    });
    if (!res.ok) throw new Error('Dữ liệu tải lên không hợp lệ');

    return {
      url: res.url,
      fileSize: file.size,
      fileName: file.name,
      fileId: fileId,
      type: this.getFileType(file),
      isExternal: false,
    } as MediaData;
  }

  private requireMediaSet(): MediaSetConfig {
    if (!this.mediaSet) {
      throw new Error(
        '[UploadMedia] mediaSet chưa được cấu hình.\n' +
        'Truyền mediaSet vào constructor của UploadMedia để dùng tính năng này.',
      );
    }
    return this.mediaSet;
  }

  // ── Public ────────────────────────────────────────────────────────────────

  /** Upload 1 file lên S3 rồi tạo Media record. */
  async create(file: File, { setId }: { setId?: string } = {}) {
    try {
      let mediaData: MediaData | undefined;
      switch (this.strategy) {
        case 's3': {
          const presignedUrl = await this.generatePresignedUrl({
            contentType: file.type,
            contentLength: file.size,
          });
     
          if (!presignedUrl) throw new Error('Dữ liệu tải lên không hợp lệ');
          mediaData = await this.uploadFileS3(file, presignedUrl);
          break;
        }
      }
      if (!mediaData) throw new Error('Tải lên thất bại');
      console.log("mediaData ==> ", mediaData)
      const { fileId, fileName, fileSize, type, url, setId: _mediaSetId } = mediaData;

      const res = await this.createMedia({
        fileId, fileName, fileSize, type, url,
        setId: _mediaSetId || setId,
      });
      return res!;
    } catch (err: any) {
      throw new Error(err?.message);
    }
  }

  /** Tạo MediaSet mới với danh sách mediaIds. Dùng bởi InputMedia setMode. */
  async createMediaSet(mediaIds: string[]): Promise<MediaSetResult> {
    return this.requireMediaSet().create({ mediaIds });
  }

  /** Cập nhật danh sách media trong set (replace toàn bộ). Dùng bởi InputMedia setMode. */
  async updateMediaSet(setId: string, mediaIds: string[]): Promise<void> {
    await this.requireMediaSet().update(setId, { mediaIds });
  }

  /** Lấy File object từ URL. */
  async getFileFromUrl(fileUrl: string): Promise<File> {
    const response = await fetch(fileUrl, { credentials: 'omit', mode: 'no-cors' });
    const url = new URL(fileUrl);
    const contentType = response.headers.get('content-type');
    const blob = await response.blob();
    const fileName = url.pathname.split('/').pop() || 'image';
    return new File([blob], fileName, { type: contentType || undefined });
  }
}