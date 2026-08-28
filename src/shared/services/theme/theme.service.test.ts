import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
    beforeEach(() => {
        vi.spyOn(ThemeService as any, 'queryApi').mockResolvedValue({
            getAllThemes: [{ id: 't1', name: 'Mặc định', isDefault: true }],
        });
        vi.spyOn(ThemeService as any, 'mutationApi').mockResolvedValue({
            createTheme: { id: 't2', name: 'Gaming', isDefault: false },
        });
    });

    it('getAllThemes returns the raw list', async () => {
        const result = await ThemeService.getAllThemes();
        expect(result).toEqual([{ id: 't1', name: 'Mặc định', isDefault: true }]);
    });

    it('getAllThemesCursor wraps the list in a fake pagination cursor shape', async () => {
        const result = await ThemeService.getAllThemesCursor();
        expect(result.edges).toEqual([{ node: { id: 't1', name: 'Mặc định', isDefault: true }, cursor: 't1' }]);
        expect(result.pageInfo.totalCount).toBe(1);
    });

    it('createTheme calls the mutation and returns the created theme', async () => {
        const result = await ThemeService.createTheme({ data: { name: 'Gaming' } as any });
        expect(result).toEqual({ id: 't2', name: 'Gaming', isDefault: false });
    });
});
