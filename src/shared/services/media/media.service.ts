import {
  $, fragment, mutation, GetOutput,
  Media,
  CreateMediaInput,
  GeneratePresignedUrlInput,
  UpdateMediaInput
} from '@shared/generated/typed-graphql';
import { CrudService } from '../crud.service';
import { PaginationCursor } from '@/core/api/types';

export type MediaDTO = GetOutput<typeof MediaService.fragment>;
export type MediaPaginationCursor = PaginationCursor<MediaDTO>;

export class MediaService extends CrudService {
  static apiName = 'media' as const;
  static displayName = 'Media';
  static shortFragment = fragment(Media, (i) => [
    i.url,
    i.fileId,
    i.type,
    i.setId,
    i.id,

  ]);
  static fragment = fragment(Media, (i) => [
    i.url,
    i.fileSize,
    i.fileName,
    i.fileId,
    i.type,
    i.ownerId,
    i.ownerType,
    i.index,
    i.setId,
    i.id,
    i.createdAt,
    i.updatedAt,
    i.deletedAt,
  ]);


  static createMedia = async (args: { input: CreateMediaInput }) => {
    const res = await this.mutationApi({
      document: mutation("createMedia", (root) => [
        root.createMedia({ input: $('input') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.createMedia! as MediaDTO;
  };
  static updateMedia = async (args: { id: string, data: UpdateMediaInput }) => {
    const res = await this.mutationApi({
      document: mutation("updateMedia", (root) => [
        root.updateMedia({ id: $('id'), input: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.updateMedia as MediaDTO;
  };


  static generatePresignedUrl = async (args: { input: GeneratePresignedUrlInput }) => {
    const res = await this.mutationApi({
      document: mutation("generatePresignedUrl", (root) => [
        root.generatePresignedUrl({ input: $('input') }, (i) => [i.fileId, i.url]),
      ]),
      variables: args,
    });
    return res.generatePresignedUrl as any
  }
}