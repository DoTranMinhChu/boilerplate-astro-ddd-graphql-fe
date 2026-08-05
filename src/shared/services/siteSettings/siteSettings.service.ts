import {
  $, fragment, query, mutation, GetOutput,
  SiteSettings,
  UpdateSiteSettingsInput,
} from '@shared/generated/typed-graphql';
import { CrudService } from '../crud.service';

export interface NavLink { label: string; href: string }
export interface FooterColumn { title: string; lines: string[] }

// `navLinks`/`footerColumns` are the Mixed scalar (free-form JSON) — typed-graphql-builder
// doesn't recognize the custom scalar and generates `string` instead of `any` for it (see
// the same documented limitation in cms.types.ts). Override here, the one cast point for
// this service, rather than casting at each call site.
type RawSiteSettingsDTO = GetOutput<typeof SiteSettingsService.fragment>;
export type SiteSettingsDTO = Omit<RawSiteSettingsDTO, 'navLinks' | 'footerColumns'> & {
  navLinks?: NavLink[];
  footerColumns?: FooterColumn[];
};

export class SiteSettingsService extends CrudService {
  static apiName = 'siteSettings' as const;
  static displayName = 'SiteSettings';

  static fragment = fragment(SiteSettings, (i) => [
    i.logoText,
    i.navLinks,
    i.hotlineLabel,
    i.hotline,
    i.footerHeading,
    i.footerEmail,
    i.footerColumns,
    i.footerOutlineText,
    i.id,
    i.createdAt,
    i.updatedAt,
  ]);

  // Public — called from CmsPageShell.astro (SSR, unauthenticated) for every page's
  // header/footer, and from the admin settings page.
  static getSiteSettings = async () => {
    const res = await this.queryApi({
      document: query("getSiteSettings", (root) => [
        root.getSiteSettings(() => this.fragment),
      ]),
      variables: {},
    });
    return res.getSiteSettings as SiteSettingsDTO | undefined;
  };

  static updateSiteSettings = async (args: { data: UpdateSiteSettingsInput }) => {
    const res = await this.mutationApi({
      document: mutation("updateSiteSettings", (root) => [
        root.updateSiteSettings({ data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.updateSiteSettings as SiteSettingsDTO;
  };
}
