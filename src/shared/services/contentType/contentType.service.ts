import { 
  $, fragment, query, mutation, GetOutput,
  ContentType,
  PaginationArgsInput,
  CreateContentTypeInput,
  UpdateContentTypeInput
} from '@shared/generated/typed-graphql';
import { CrudService } from '../crud.service';
import { PaginationCursor } from '@/core/api/types';

export type ContentTypeDTO = GetOutput<typeof ContentTypeService.fragment>;
export type ContentTypePaginationCursor = PaginationCursor<ContentTypeDTO>;

export class ContentTypeService extends CrudService {
  static apiName = 'contentType' as const;
  static displayName = 'ContentType';

  static fragment = fragment(ContentType, (i) => [
    i.key,
    i.label,
    i.icon,
    i.fields((f) => [
      f.key, f.label, f.type, f.required, f.options,
      f.relationTarget, f.relationMultiple, f.isSlugSource, f.showInListing, f.mockValue,
    ]),
    i.id,
    i.createdAt,
    i.updatedAt,
    i.deletedAt,
  ]);

  static getOneContentType = async (args: { id: string }) => {
    const res = await this.queryApi({
      document: query("getOneContentType", (root) => [
        root.getOneContentType({ id: $('id') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.getOneContentType as ContentTypeDTO;
  };

  static getAllContentType = async (args: { input: PaginationArgsInput }) => {
    const res = await this.queryApi({
      document: query("getAllContentType", (root) => [
        root.getAllContentType({ input: $('input') }, (n) => [
          n.edges((e) => [e.node(() => this.fragment), e.cursor]),
          n.pageInfo((p) => [p.endCursor, p.hasNextPage, p.hasPreviousPage, p.limit, p.startCursor, p.totalCount, p.totalPage])
        ]),
      ]),
      variables: args,
    });
    return res.getAllContentType as ContentTypePaginationCursor;
  };

  static createContentType = async (args: { data: CreateContentTypeInput }) => {
    const res = await this.mutationApi({
      document: mutation("createContentType", (root) => [
        root.createContentType({ data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.createContentType as ContentTypeDTO;
  };

  static updateContentType = async (args: { id: string, data: UpdateContentTypeInput }) => {
    const res = await this.mutationApi({
      document: mutation("updateContentType", (root) => [
        root.updateContentType({ id: $('id'), data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.updateContentType as ContentTypeDTO;
  };

  static deleteContentType = async (args: { id: string }) => {
    const res = await this.mutationApi({
      document: mutation("deleteContentType", (root) => [
        root.deleteContentType({ id: $('id') }),
      ]),
      variables: args,
    });
    return res.deleteContentType;
  };
}