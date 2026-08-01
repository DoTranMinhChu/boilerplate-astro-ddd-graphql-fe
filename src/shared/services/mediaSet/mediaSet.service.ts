import {
  $, fragment, query, mutation, GetOutput,
  MediaSet,
  PaginationArgsInput,
  CreateMediaSetInput,
  UpdateMediaSetInput
} from '@shared/generated/typed-graphql';
import { CrudService } from '../crud.service';
import { PaginationCursor } from '@/core/api/types';
import { MediaService } from '../media/media.service';

export type MediaSetDTO = GetOutput<typeof MediaSetService.fragment>;
export type MediaSetPaginationCursor = PaginationCursor<MediaSetDTO>;

export class MediaSetService extends CrudService {
  static apiName = 'mediaSet' as const;
  static displayName = 'MediaSet';
  static shortFragment = fragment(MediaSet, (i) => [
    i.content,
    i.id,
    i.createdAt,
    i.medias(_i => MediaService.shortFragment)
  ]);
  static fragment = fragment(MediaSet, (i) => [
    i.content,
    i.id,
    i.createdAt,
    i.updatedAt,
    i.deletedAt,
    i.medias(_i => MediaService.shortFragment)
  ]);


  static getOneMediaSet = async (args: { id: string }) => {
    const res = await this.queryApi({
      document: query("getOneMediaSet", (root) => [
        root.getOneMediaSet({ id: $('id') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.getOneMediaSet as MediaSetDTO;
  };

  static getAllMediaSet = async (args: { input: PaginationArgsInput, }) => {
    const res = await this.queryApi({
      document: query("getAllMediaSet", (root) => [
        root.getAllMediaSet({ input: $('input') }, (n) => [
          n.edges((e) => [e.node(() => this.fragment), e.cursor]),
          n.pageInfo((p) => [p.endCursor, p.hasNextPage, p.hasPreviousPage, p.limit, p.startCursor, p.totalCount, p.totalPage])
        ]),
      ]),
      variables: args,
    });
    return res.getAllMediaSet as MediaSetPaginationCursor;
  };

  static createMediaSet = async (args: { data: CreateMediaSetInput }) => {
    const res = await this.mutationApi({
      document: mutation("createMediaSet", (root) => [
        root.createMediaSet({ data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.createMediaSet as MediaSetDTO;
  };

  static updateMediaSet = async (args: { id: string, data: UpdateMediaSetInput }) => {
    const res = await this.mutationApi({
      document: mutation("updateMediaSet", (root) => [
        root.updateMediaSet({ id: $('id'), data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.updateMediaSet as MediaSetDTO;
  };

  static deleteMediaSet = async (args: { id: string }) => {
    const res = await this.mutationApi({
      document: mutation("deleteMediaSet", (root) => [
        root.deleteMediaSet({ id: $('id') }),
      ]),
      variables: args,
    });
    return res.deleteMediaSet;
  };
}