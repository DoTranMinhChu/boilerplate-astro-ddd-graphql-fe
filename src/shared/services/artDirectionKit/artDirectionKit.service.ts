import {
    $, fragment, query, mutation, GetOutput,
    ArtDirectionKit,
    CreateArtDirectionKitInput,
    UpdateArtDirectionKitInput,
} from '@shared/generated/typed-graphql';
import { CrudService } from '../crud.service';
import type { KitTemplate } from '@/modules/cms/artDirectionKit.types';

// `templates` is the Mixed scalar (free-form JSON) — codegen produces `string` for it
// (documented limitation, same pattern as ThemeService's colors/typography/layout/motion
// override). Override here, the one cast point for this service.
type RawArtDirectionKitDTO = GetOutput<typeof ArtDirectionKitService.fragment>;
export type ArtDirectionKitDTO = Omit<RawArtDirectionKitDTO, 'templates'> & {
    templates?: KitTemplate[];
};

export class ArtDirectionKitService extends CrudService {
    static apiName = 'artDirectionKit' as const;
    static displayName = 'ArtDirectionKit';

    static fragment = fragment(ArtDirectionKit, (i) => [
        i.id,
        i.name,
        i.industry,
        i.themeId,
        i.headerPresetId,
        i.footerPresetId,
        i.templates,
        i.createdAt,
        i.updatedAt,
    ]);

    static getAllArtDirectionKits = async () => {
        const res = await this.queryApi({
            document: query('getAllArtDirectionKits', (root) => [
                root.getAllArtDirectionKits(() => this.fragment),
            ]),
            variables: {},
        });
        return (res.getAllArtDirectionKits || []).filter(Boolean) as ArtDirectionKitDTO[];
    };

    static getOneArtDirectionKit = async (args: { id: string }) => {
        const res = await this.queryApi({
            document: query('getOneArtDirectionKit', (root) => [
                root.getOneArtDirectionKit({ id: $('id') }, () => this.fragment),
            ]),
            variables: args,
        });
        return res.getOneArtDirectionKit as ArtDirectionKitDTO;
    };

    static createArtDirectionKit = async (args: { data: CreateArtDirectionKitInput }) => {
        const res = await this.mutationApi({
            document: mutation('createArtDirectionKit', (root) => [
                root.createArtDirectionKit({ data: $('data') }, () => this.fragment),
            ]),
            variables: args,
        });
        return res.createArtDirectionKit as ArtDirectionKitDTO;
    };

    static updateArtDirectionKit = async (args: { id: string; data: UpdateArtDirectionKitInput }) => {
        const res = await this.mutationApi({
            document: mutation('updateArtDirectionKit', (root) => [
                root.updateArtDirectionKit({ id: $('id'), data: $('data') }, () => this.fragment),
            ]),
            variables: args,
        });
        return res.updateArtDirectionKit as ArtDirectionKitDTO;
    };

    static deleteArtDirectionKit = async (args: { id: string }) => {
        const res = await this.mutationApi({
            document: mutation('deleteArtDirectionKit', (root) => [
                root.deleteArtDirectionKit({ id: $('id') }),
            ]),
            variables: args,
        });
        return res.deleteArtDirectionKit;
    };
}
