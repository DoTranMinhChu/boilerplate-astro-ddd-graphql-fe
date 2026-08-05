import { BaseService } from '@core/services/base.service';
import { Admin, fragment, PageInfo, Seo } from '@shared/generated/typed-graphql';

export abstract class CrudService extends BaseService {
  static nodeFragment = fragment(Admin, (n) => [n.id]);
  static pageInfoFragment = fragment(PageInfo, (p) => [
    p.startCursor,
    p.endCursor,
    p.hasNextPage,
    p.hasPreviousPage,
    p.totalCount,
  ]);
  // Dùng chung cho Page/ContentEntry/PageResolverResult — mọi entity/kết quả
  // có block SEO (mục 12 spec CMS) đều tái dùng đúng 1 shape này.
  static seoFragment = fragment(Seo, (s) => [
    s.title, s.description, s.ogTitle, s.ogDescription, s.ogImage, s.twitterImage,
    s.robotsIndex, s.robotsFollow, s.canonicalUrl, s.sitemapPriority, s.sitemapChangeFreq,
  ]);
  // static mediaFragment = MediaService.simpleFragment;
}
