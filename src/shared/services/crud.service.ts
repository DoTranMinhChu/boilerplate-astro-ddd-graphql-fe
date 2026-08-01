import { BaseService } from '@core/services/base.service';
import { Admin, fragment, PageInfo } from '@shared/generated/typed-graphql';

export abstract class CrudService extends BaseService {
  static nodeFragment = fragment(Admin, (n) => [n.id]);
  static pageInfoFragment = fragment(PageInfo, (p) => [
    p.startCursor,
    p.endCursor,
    p.hasNextPage,
    p.hasPreviousPage,
    p.totalCount,
  ]);
  // static mediaFragment = MediaService.simpleFragment;
}
