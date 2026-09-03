// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@solidjs/testing-library';
import { ArtDirectionKitService } from '@/shared/services/artDirectionKit/artDirectionKit.service';
import { KitStarterFields } from '@modules/cms/admin/KitStarterFields';
import { kitSelection, clearKitSelection } from '@modules/cms/admin/kitStarter';

vi.mock('@/shared/services/artDirectionKit/artDirectionKit.service', () => ({
    ArtDirectionKitService: { getAllArtDirectionKits: vi.fn(), createPageFromKit: vi.fn() },
}));

const KITS = [
    {
        id: 'kit-gaming',
        name: 'Gaming Neon',
        industry: 'gaming',
        templates: [
            { templateKey: 'home', label: 'Trang chủ', sectionComponentIds: ['s1', 's2', 's3', 's4', 's5'] },
            { templateKey: 'project-detail', label: 'Chi tiết giải đấu', sectionComponentIds: ['s6', 's7', 's8', 's9'] },
        ],
    },
    {
        id: 'kit-generic',
        name: 'Baseline Neutral',
        industry: 'generic',
        templates: [
            { templateKey: 'home', label: 'Trang chủ', sectionComponentIds: ['g1', 'g2', 'g3', 'g4', 'g5'] },
            { templateKey: 'about', label: 'Giới thiệu', sectionComponentIds: ['g6', 'g7', 'g8'] },
            { templateKey: 'pricing', label: 'Bảng giá', sectionComponentIds: ['g9', 'g10', 'g11'] },
        ],
    },
];

const selectEl = (container: HTMLElement, testId: string) =>
    container.querySelector(`[data-testid="${testId}"] select`) as HTMLSelectElement;

beforeEach(() => {
    clearKitSelection();
    vi.mocked(ArtDirectionKitService.getAllArtDirectionKits).mockReset();
    vi.mocked(ArtDirectionKitService.getAllArtDirectionKits).mockResolvedValue(KITS as any);
});

describe('KitStarterFields', () => {
    it('lists every kit and starts with NO selection (declining a kit is the default)', async () => {
        const { container } = render(() => <KitStarterFields />);
        await waitFor(() => expect(selectEl(container, 'kit-starter-kit')).toBeTruthy());
        const options = [...selectEl(container, 'kit-starter-kit').options].map((o) => o.textContent);
        expect(options).toEqual(expect.arrayContaining(['Gaming Neon', 'Baseline Neutral']));
        expect(kitSelection()).toBeNull();
        // No kit picked yet ⇒ no template select and no override hint at all.
        expect(container.querySelector('[data-testid="kit-starter-template"]')).toBeNull();
        expect(container.querySelector('[data-testid="kit-starter-override-hint"]')).toBeNull();
    });

    it('shows the chosen kit\'s templates (with their section counts) once a kit is picked', async () => {
        const { container } = render(() => <KitStarterFields />);
        await waitFor(() => expect(selectEl(container, 'kit-starter-kit')).toBeTruthy());
        fireEvent.change(selectEl(container, 'kit-starter-kit'), { target: { value: 'kit-generic' } });

        await waitFor(() => expect(selectEl(container, 'kit-starter-template')).toBeTruthy());
        const labels = [...selectEl(container, 'kit-starter-template').options].map((o) => o.textContent);
        expect(labels).toEqual(expect.arrayContaining(['Trang chủ (5)', 'Giới thiệu (3)', 'Bảng giá (3)']));
        expect(container.querySelector('[data-testid="kit-starter-override-hint"]')).toBeTruthy();
    });

    it('publishes the selection ONLY once BOTH kit and template are chosen', async () => {
        const { container } = render(() => <KitStarterFields />);
        await waitFor(() => expect(selectEl(container, 'kit-starter-kit')).toBeTruthy());

        fireEvent.change(selectEl(container, 'kit-starter-kit'), { target: { value: 'kit-gaming' } });
        expect(kitSelection()).toBeNull();  // half-finished pick must not route the submit

        await waitFor(() => expect(selectEl(container, 'kit-starter-template')).toBeTruthy());
        fireEvent.change(selectEl(container, 'kit-starter-template'), { target: { value: 'project-detail' } });
        await waitFor(() => expect(kitSelection()).toEqual({ kitId: 'kit-gaming', templateKey: 'project-detail' }));
    });

    it('changing the kit invalidates the already-chosen template', async () => {
        const { container } = render(() => <KitStarterFields />);
        await waitFor(() => expect(selectEl(container, 'kit-starter-kit')).toBeTruthy());
        fireEvent.change(selectEl(container, 'kit-starter-kit'), { target: { value: 'kit-gaming' } });
        await waitFor(() => expect(selectEl(container, 'kit-starter-template')).toBeTruthy());
        fireEvent.change(selectEl(container, 'kit-starter-template'), { target: { value: 'home' } });
        await waitFor(() => expect(kitSelection()).toEqual({ kitId: 'kit-gaming', templateKey: 'home' }));

        fireEvent.change(selectEl(container, 'kit-starter-kit'), { target: { value: 'kit-generic' } });
        await waitFor(() => expect(kitSelection()).toBeNull());
    });

    it('clears the selection when the picker unmounts (modal dismissed without submitting)', async () => {
        const { container, unmount } = render(() => <KitStarterFields />);
        await waitFor(() => expect(selectEl(container, 'kit-starter-kit')).toBeTruthy());
        fireEvent.change(selectEl(container, 'kit-starter-kit'), { target: { value: 'kit-gaming' } });
        await waitFor(() => expect(selectEl(container, 'kit-starter-template')).toBeTruthy());
        fireEvent.change(selectEl(container, 'kit-starter-template'), { target: { value: 'home' } });
        await waitFor(() => expect(kitSelection()).not.toBeNull());

        unmount();
        expect(kitSelection()).toBeNull();
    });
});
