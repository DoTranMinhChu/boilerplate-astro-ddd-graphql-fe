import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PageService } from '@/shared/services/page/page.service';
import { ArtDirectionKitService } from '@/shared/services/artDirectionKit/artDirectionKit.service';
import {
    createPageWithOptionalKit,
    buildCreatePageFromKitInput,
    setKitSelection,
    clearKitSelection,
    kitSelection,
} from '../kitStarter';

vi.mock('@/shared/services/page/page.service', () => ({
    PageService: { createPage: vi.fn() },
}));
vi.mock('@/shared/services/artDirectionKit/artDirectionKit.service', () => ({
    ArtDirectionKitService: { createPageFromKit: vi.fn(), getAllArtDirectionKits: vi.fn() },
}));

const FORM_VALUES = {
    internalName: 'Trang chủ Gaming',
    path: '/gaming',
    pageType: 'STATIC_MODULAR',
    templateKey: 'nguoi-dung-tu-go',
    contentTypeId: 'ct-1',
    themeId: 'theme-admin-picked',
    headerPresetId: 'header-admin-picked',
    footerPresetId: 'footer-admin-picked',
} as any;

beforeEach(() => {
    clearKitSelection();
    vi.mocked(PageService.createPage).mockReset();
    vi.mocked(ArtDirectionKitService.createPageFromKit).mockReset();
    vi.mocked(PageService.createPage).mockResolvedValue({ id: 'page-plain' } as any);
    vi.mocked(ArtDirectionKitService.createPageFromKit).mockResolvedValue({ id: 'page-from-kit' } as any);
});

describe('createPageWithOptionalKit — no kit chosen (the default)', () => {
    it('calls PageService.createPage with the UNTOUCHED form values, and never createPageFromKit', async () => {
        const page = await createPageWithOptionalKit(FORM_VALUES);
        expect(ArtDirectionKitService.createPageFromKit).not.toHaveBeenCalled();
        expect(PageService.createPage).toHaveBeenCalledTimes(1);
        expect(PageService.createPage).toHaveBeenCalledWith({ data: FORM_VALUES });
        // Same object identity — nothing is cloned, filtered or rewritten on this path.
        expect(vi.mocked(PageService.createPage).mock.calls[0][0].data).toBe(FORM_VALUES);
        expect(page.id).toBe('page-plain');
    });
});

describe('createPageWithOptionalKit — kit chosen', () => {
    it('calls createPageFromKit instead of createPage', async () => {
        setKitSelection({ kitId: 'kit-gaming', templateKey: 'home' });
        const page = await createPageWithOptionalKit(FORM_VALUES);
        expect(PageService.createPage).not.toHaveBeenCalled();
        expect(ArtDirectionKitService.createPageFromKit).toHaveBeenCalledTimes(1);
        expect(page.id).toBe('page-from-kit');
    });

    it('forwards kitId/templateKey/path/internalName + the optional passthroughs, and NOT theme/header/footer/templateKey-from-the-form', async () => {
        setKitSelection({ kitId: 'kit-gaming', templateKey: 'home' });
        await createPageWithOptionalKit(FORM_VALUES);
        const sent = vi.mocked(ArtDirectionKitService.createPageFromKit).mock.calls[0][0].data as any;
        expect(sent).toEqual({
            kitId: 'kit-gaming',
            templateKey: 'home',
            path: '/gaming',
            internalName: 'Trang chủ Gaming',
            pageType: 'STATIC_MODULAR',
            contentTypeId: 'ct-1',
        });
        expect(sent.themeId).toBeUndefined();
        expect(sent.headerPresetId).toBeUndefined();
        expect(sent.footerPresetId).toBeUndefined();
        // The kit's own template supplies templateKey — the form's free-text value is dropped.
        expect(sent.templateKey).not.toBe('nguoi-dung-tu-go');
    });

    it('clears the selection after a SUCCESSFUL create, so the next page is blank by default', async () => {
        setKitSelection({ kitId: 'kit-gaming', templateKey: 'home' });
        await createPageWithOptionalKit(FORM_VALUES);
        expect(kitSelection()).toBeNull();

        await createPageWithOptionalKit(FORM_VALUES);
        expect(PageService.createPage).toHaveBeenCalledTimes(1);
    });

    it('KEEPS the selection when the create fails, so the admin can fix the form and resubmit', async () => {
        setKitSelection({ kitId: 'kit-gaming', templateKey: 'home' });
        vi.mocked(ArtDirectionKitService.createPageFromKit).mockRejectedValueOnce(new Error('đường dẫn đã tồn tại'));
        await expect(createPageWithOptionalKit(FORM_VALUES)).rejects.toThrow('đường dẫn đã tồn tại');
        expect(kitSelection()).toEqual({ kitId: 'kit-gaming', templateKey: 'home' });
    });
});

describe('buildCreatePageFromKitInput', () => {
    it('omits every optional field the form left empty rather than sending undefined/empty strings', () => {
        const input = buildCreatePageFromKitInput(
            { kitId: 'kit-1', templateKey: 'about' },
            { internalName: 'Giới thiệu', path: '/gioi-thieu' } as any,
        );
        expect(input).toEqual({ kitId: 'kit-1', templateKey: 'about', path: '/gioi-thieu', internalName: 'Giới thiệu' });
        expect('pageType' in input).toBe(false);
        expect('locale' in input).toBe(false);
        expect('contentTypeId' in input).toBe(false);
    });

    it('forwards locale when the form carries one', () => {
        const input = buildCreatePageFromKitInput(
            { kitId: 'kit-1', templateKey: 'home' },
            { internalName: 'EN home', path: '/en', locale: 'en' } as any,
        );
        expect(input.locale).toBe('en');
    });
});
