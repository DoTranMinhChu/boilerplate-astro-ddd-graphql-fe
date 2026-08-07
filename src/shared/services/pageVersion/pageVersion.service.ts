import { $, fragment, query, mutation, GetOutput, PageVersion } from '@shared/generated/typed-graphql';
import { CrudService } from '../crud.service';

export type PageVersionDTO = GetOutput<typeof PageVersionService.fragment>;

export class PageVersionService extends CrudService {
  static apiName = 'pageVersion' as const;
  static displayName = 'PageVersion';

  // Không lấy `snapshot` — panel Lịch sử chỉ cần liệt kê + khôi phục theo id,
  // nội dung snapshot được áp dụng phía backend, không cần thiết ở FE.
  static fragment = fragment(PageVersion, (i) => [
    i.id,
    i.pageId,
    i.publishedBy,
    i.label,
    i.createdAt,
  ]);

  static getPageVersions = async (args: { pageId: string }) => {
    const res = await this.queryApi({
      document: query('getPageVersions', (root) => [
        root.getPageVersions({ pageId: $('pageId') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.getPageVersions as PageVersionDTO[];
  };

  static restorePageVersion = async (args: { pageId: string; versionId: string }) => {
    const res = await this.mutationApi({
      document: mutation('restorePageVersion', (root) => [
        root.restorePageVersion({ pageId: $('pageId'), versionId: $('versionId') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.restorePageVersion as PageVersionDTO;
  };
}
