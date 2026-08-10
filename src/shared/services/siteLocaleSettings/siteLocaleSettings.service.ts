import {
  $, fragment, query, mutation, GetOutput,
  SiteLocaleSettings,
  UpdateSiteLocaleSettingsInput,
} from '@shared/generated/typed-graphql';
import { CrudService } from '../crud.service';

// `enabledLocales` là scalar Mixed (free-form JSON ở BE) — typed-graphql-builder không
// nhận diện custom scalar này nên sinh ra kiểu `string` thay vì `string[]` (cùng hạn chế
// đã ghi trong headerPreset.service.ts cho navLinks/animation). Override tại đây, điểm
// cast duy nhất, thay vì cast rải rác ở từng call site. Giữ `enabledLocales` OPTIONAL
// (không required) trong override — để type còn lại `string[] | undefined`, có chung
// nhánh `undefined` với kiểu gốc `string | undefined` nên cast qua lại không bị TS chặn
// vì "insufficient overlap" (ts2352).
type RawSiteLocaleSettingsDTO = GetOutput<typeof SiteLocaleSettingsService.fragment>;
export type SiteLocaleSettingsDTO = Omit<RawSiteLocaleSettingsDTO, 'enabledLocales'> & {
  enabledLocales?: string[];
};

export type UpdateSiteLocaleSettingsInputDTO = Omit<UpdateSiteLocaleSettingsInput, 'enabledLocales'> & {
  enabledLocales?: string[];
};

export class SiteLocaleSettingsService extends CrudService {
  static apiName = 'siteLocaleSettings' as const;
  static displayName = 'SiteLocaleSettings';

  static fragment = fragment(SiteLocaleSettings, (i) => [
    i.enabledLocales,
    i.defaultLocale,
    i.id,
    i.createdAt,
    i.updatedAt,
  ]);

  /** Singleton thật ở BE (SiteLocaleSettingsService.getSettings() tự tạo bản ghi mặc
   * định ['vi'] nếu DB chưa có) — không nhận id/args, luôn trả về đúng 1 bản ghi. */
  static getSiteLocaleSettings = async () => {
    const res = await this.queryApi({
      document: query("getSiteLocaleSettings", (root) => [
        root.getSiteLocaleSettings(() => this.fragment),
      ]),
      variables: {},
    });
    return res.getSiteLocaleSettings as SiteLocaleSettingsDTO;
  };

  static updateSiteLocaleSettings = async (data: UpdateSiteLocaleSettingsInputDTO) => {
    const res = await this.mutationApi({
      document: mutation("updateSiteLocaleSettings", (root) => [
        root.updateSiteLocaleSettings({ data: $('data') }, () => this.fragment),
      ]),
      variables: { data: data as UpdateSiteLocaleSettingsInput },
    });
    return res.updateSiteLocaleSettings as SiteLocaleSettingsDTO;
  };
}
