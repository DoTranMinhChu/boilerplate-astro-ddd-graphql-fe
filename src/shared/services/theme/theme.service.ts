import {
    $, fragment, query, mutation, GetOutput,
    Theme,
    CreateThemeInput,
    UpdateThemeInput,
} from '@shared/generated/typed-graphql';
import { CrudService } from '../crud.service';
import type { PaginationCursor } from '@/core/api/types';
import type { ThemeColors, ThemeTypography, ThemeLayout, ThemeMotion } from '@/modules/theme/theme.types';

// `colors`/`typography`/`layout`/`motion` are the Mixed scalar (free-form JSON) — codegen
// produces `string` for it (documented limitation, same pattern as HeaderPresetService's
// navLinks/animation override). Override here, the one cast point for this service.
type RawThemeDTO = GetOutput<typeof ThemeService.fragment>;
export type ThemeDTO = Omit<RawThemeDTO, 'colors' | 'typography' | 'layout' | 'motion'> & {
    colors?: ThemeColors;
    typography?: ThemeTypography;
    layout?: ThemeLayout;
    motion?: ThemeMotion;
};

export class ThemeService extends CrudService {
    static apiName = 'theme' as const;
    static displayName = 'Theme';

    static fragment = fragment(Theme, (i) => [
        i.name,
        i.isDefault,
        i.colors,
        i.typography,
        i.layout,
        i.motion,
        i.id,
        i.createdAt,
        i.updatedAt,
    ]);

    static getAllThemes = async () => {
        const res = await this.queryApi({
            document: query("getAllThemes", (root) => [
                root.getAllThemes(() => this.fragment),
            ]),
            variables: {},
        });
        return (res.getAllThemes || []).filter(Boolean) as ThemeDTO[];
    };

    /** Bọc danh sách phẳng thành shape cursor giả — Theme không cần phân trang thật (số lượng
     * theme luôn nhỏ), nhưng generateDatatable() cần shape edges/pageInfo — cùng pattern
     * HeaderPresetService.getAllHeaderPresetsCursor(). */
    static getAllThemesCursor = async (): Promise<PaginationCursor<ThemeDTO>> => {
        const items = await this.getAllThemes();
        return {
            edges: items.map((node) => ({ node, cursor: node.id! })),
            pageInfo: { hasNextPage: false, hasPreviousPage: false, totalCount: items.length, totalPage: 1, limit: items.length },
        };
    };

    static getOneTheme = async (args: { id: string }) => {
        const res = await this.queryApi({
            document: query("getOneTheme", (root) => [
                root.getOneTheme({ id: $('id') }, () => this.fragment),
            ]),
            variables: args,
        });
        return res.getOneTheme as ThemeDTO;
    };

    static createTheme = async (args: { data: CreateThemeInput }) => {
        const res = await this.mutationApi({
            document: mutation("createTheme", (root) => [
                root.createTheme({ data: $('data') }, () => this.fragment),
            ]),
            variables: args,
        });
        return res.createTheme as ThemeDTO;
    };

    static updateTheme = async (args: { id: string, data: UpdateThemeInput }) => {
        const res = await this.mutationApi({
            document: mutation("updateTheme", (root) => [
                root.updateTheme({ id: $('id'), data: $('data') }, () => this.fragment),
            ]),
            variables: args,
        });
        return res.updateTheme as ThemeDTO;
    };

    static deleteTheme = async (args: { id: string }) => {
        const res = await this.mutationApi({
            document: mutation("deleteTheme", (root) => [
                root.deleteTheme({ id: $('id') }),
            ]),
            variables: args,
        });
        return res.deleteTheme;
    };

    static setDefaultTheme = async (args: { id: string }) => {
        const res = await this.mutationApi({
            document: mutation("setDefaultTheme", (root) => [
                root.setDefaultTheme({ id: $('id') }, () => this.fragment),
            ]),
            variables: args,
        });
        return res.setDefaultTheme as ThemeDTO;
    };
}
