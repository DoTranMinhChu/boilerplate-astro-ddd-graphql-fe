// src/core/components/control/InputMedia.test.tsx
// @vitest-environment jsdom
//
// Regression tests for the id-vs-url bug: single-mode upload (uploadMedia) and
// multi-mode/GALLERY upload (uploadMedias) used to always call onChange with the raw
// Media.id, even for consumers (CMS Content Entry IMAGE/GALLERY fields) that render the
// value directly as <img src>. Fix: a new `valueMode` prop ('id' default, 'url' opt-in)
// controls what onChange emits, without changing behavior for existing id-consumers
// (manageBrands/manageTenants/manageAgencies, which never pass valueMode).
//
// Also covers the second bug in the same area: the effect that clears the just-uploaded
// thumbnail preview on external value changes used to always compare against
// medias()[0]?.id, which — once onChange started emitting a URL — permanently
// mismatched and wiped the preview every time. Exercised here via onMediaChange, which
// mirrors the component's internal `medias()` signal.
//
// Same matchMedia polyfill + beforeAll-dynamic-import shape as other jsdom component
// tests in this repo (see Confirm.test.tsx header comment): the import chain here
// reaches Lightbox/Modal, which touch matchMedia at module scope.
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, fireEvent, waitFor } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';

if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
        matches: false, media: query, onchange: null,
        addListener: () => {}, removeListener: () => {},
        addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
}

// jsdom does not implement IntersectionObserver, and InputMedia's thumbnail preview goes
// through the shared Img component (createOnScreen, src/core/helpers/screen.ts), which
// calls `new IntersectionObserver(...)` on mount — same stub as TextNode.test.tsx.
if (!('IntersectionObserver' in window)) {
    (window as any).IntersectionObserver = class {
        constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
            return [];
        }
    };
}

let InputMedia: typeof import('@core/components/control/InputMedia')['InputMedia'];
let setBaseConfig: typeof import('@core/components/config/BaseConfig')['setBaseConfig'];
type MediaData = import('@core/components/control/InputMedia').MediaData;

beforeAll(async () => {
    ({ InputMedia } = await import('@core/components/control/InputMedia'));
    ({ setBaseConfig } = await import('@core/components/config/BaseConfig'));
}, 30000);

// jsdom's URL has no createObjectURL — InputMedia's own thumbnail (the blob preview
// shown for the file mid-upload) calls it unconditionally while a media has `.file` set.
if (!('createObjectURL' in URL)) {
    (URL as any).createObjectURL = () => 'blob:test';
}

function makeFile(name: string) {
    return new File(['x'], name, { type: 'image/png' });
}

/**
 * fireEvent.change(input, { target: { files: [...] } }) assigns a plain array to
 * `input.files` under testing-library, which lacks FileList's `.item()` method that
 * InputMedia's single-mode handler calls directly (`e.target.files?.item(0)`). Define a
 * real FileList-shaped object instead.
 */
function uploadFiles(input: HTMLInputElement, files: File[]) {
    const fileList = Object.assign([...files], {
        item: (i: number) => files[i] ?? null,
    });
    Object.defineProperty(input, 'files', { value: fileList, configurable: true });
    fireEvent.change(input);
}

/** Media the mocked uploadMedia.create() "returns" for a given file name. */
function mockUploadMedia() {
    let counter = 0;
    const create = vi.fn(async (_file: File) => {
        counter += 1;
        const id = `media-${counter}`;
        return {
            id, url: `https://cdn.test/${id}.jpg`, fileName: `f${counter}.png`, fileSize: 100,
        };
    });
    setBaseConfig({ uploadMedia: { create } } as any);
    return create;
}

const requiredProps = {
    iconMediaUpload: 'upload-icon' as any,
    mediaName: 'Ảnh',
    type: 'image' as const,
    accept: 'image/png',
    maxSize: 5,
    allowURL: false, // keep the paste-URL button out of the DOM; not exercised here
};

describe('InputMedia valueMode (single mode)', () => {
    it('defaults to id (unchanged behavior): onChange gets the raw Media id', async () => {
        mockUploadMedia();
        const onChange = vi.fn();
        const { container } = render(() => (
            <InputMedia {...requiredProps} value={null} onChange={onChange} fieldless />
        ));
        const input = container.querySelector('input[type="file"]') as HTMLInputElement;
        uploadFiles(input, [makeFile('a.png')]);

        // uploadMedia() first calls onChange(null) synchronously to clear any prior value
        // before the upload resolves — wait for the FINAL call, not just any call.
        await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('media-1'));
    });

    it('valueMode="url": onChange gets the Media url, not the id', async () => {
        mockUploadMedia();
        const onChange = vi.fn();
        const { container } = render(() => (
            <InputMedia {...requiredProps} value={null} onChange={onChange} valueMode="url" fieldless />
        ));
        const input = container.querySelector('input[type="file"]') as HTMLInputElement;
        uploadFiles(input, [makeFile('a.png')]);

        await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('https://cdn.test/media-1.jpg'));
    });

    it('valueMode="url": the just-uploaded thumbnail is NOT wiped once the controlled value round-trips back as a URL', async () => {
        mockUploadMedia();
        const mediaChangeCalls: MediaData[][] = [];

        function Controlled() {
            const [value, setValue] = createSignal<string | null>(null);
            return (
                <InputMedia
                    {...requiredProps}
                    value={value()}
                    onChange={setValue}
                    valueMode="url"
                    onMediaChange={(medias) => mediaChangeCalls.push(medias)}
                    fieldless
                />
            );
        }

        const { container } = render(() => <Controlled />);
        const input = container.querySelector('input[type="file"]') as HTMLInputElement;
        uploadFiles(input, [makeFile('a.png')]);

        // Wait for upload to resolve and the media to appear.
        await waitFor(() => expect(mediaChangeCalls.some((m) => m.length === 1)).toBe(true));

        // The buggy version compared `val !== medias()[0]?.id` even in url mode, which
        // is always true once val is a URL, so it called setMedias([]) — observable here
        // as a later onMediaChange([]) call after the upload had already populated it.
        const afterUpload = mediaChangeCalls.findIndex((m) => m.length === 1);
        const clearedAfter = mediaChangeCalls.slice(afterUpload + 1).some((m) => m.length === 0);
        expect(clearedAfter).toBe(false);
    });

    // Root-caused live (systematic-debugging, 2026-09-01): the Node Builder's "Ảnh" field
    // (FieldRenderer.tsx's InputImage, valueMode="url") mounted fresh with an EXISTING,
    // already-saved node.props.src (never uploaded THIS session — no upload() call ever ran
    // to populate `medias()`) always showed an empty thumbnail, even though the real page
    // renders that exact same value correctly (ImageNode.tsx reads node.props.src directly).
    // The test above only covers the "just uploaded, then the controlled value round-trips
    // back" case — this covers the separate "opening an existing node" case the same
    // `medias()`-population gap also breaks.
    it('valueMode="url": mounting fresh with an EXISTING url value shows a thumbnail (no upload happened this session)', async () => {
        // `onMediaChange` (used by the sibling test above) filters to `x.id` truthy — exactly
        // wrong for observing THIS fix, whose whole point is a synthetic id-less entry seeded
        // straight from the url. And the real rendered <img> is gated behind Img.tsx's own
        // lazyload/IntersectionObserver ("hadOnScreen") logic, which this file's shared
        // no-op IntersectionObserver stub (top of file, matches TextNode.test.tsx's convention)
        // never fires — so neither existing observation mechanism in this file can see it.
        // Locally override IntersectionObserver to fire "intersecting" immediately (real
        // browsers do this for any on-screen element), scoped to just this test so the shared
        // stub other tests rely on is untouched.
        const originalIO = window.IntersectionObserver;
        (window as any).IntersectionObserver = class {
            constructor(private cb: IntersectionObserverCallback) {}
            observe(target: Element) {
                this.cb([{ isIntersecting: true, target } as IntersectionObserverEntry], this as any);
            }
            unobserve() {}
            disconnect() {}
            takeRecords() {
                return [];
            }
        };
        try {
            const onChange = vi.fn();
            const { container } = render(() => (
                <InputMedia
                    {...requiredProps}
                    value="https://cdn.test/already-saved.jpg"
                    onChange={onChange}
                    valueMode="url"
                    fieldless
                />
            ));
            await waitFor(() => {
                const img = container.querySelector('img');
                expect(img?.getAttribute('src')).toContain('already-saved.jpg');
            });
        } finally {
            window.IntersectionObserver = originalIO;
        }
    });
});

describe('InputMedia valueMode (multi mode / GALLERY)', () => {
    it('defaults to id (unchanged behavior): onChange gets an array of raw Media ids', async () => {
        mockUploadMedia();
        const onChange = vi.fn();
        const { container } = render(() => (
            <InputMedia {...requiredProps} multiple={20} value={[]} onChange={onChange} fieldless />
        ));
        const input = container.querySelector('input[type="file"]') as HTMLInputElement;
        uploadFiles(input, [makeFile('a.png'), makeFile('b.png')]);

        await waitFor(() => expect(onChange).toHaveBeenCalled());
        expect(onChange).toHaveBeenLastCalledWith(['media-1', 'media-2']);
    });

    it('valueMode="url": onChange gets an array of Media urls, not ids (GALLERY field fix)', async () => {
        mockUploadMedia();
        const onChange = vi.fn();
        const { container } = render(() => (
            <InputMedia {...requiredProps} multiple={20} value={[]} onChange={onChange} valueMode="url" fieldless />
        ));
        const input = container.querySelector('input[type="file"]') as HTMLInputElement;
        uploadFiles(input, [makeFile('a.png'), makeFile('b.png')]);

        await waitFor(() => expect(onChange).toHaveBeenCalled());
        expect(onChange).toHaveBeenLastCalledWith(['https://cdn.test/media-1.jpg', 'https://cdn.test/media-2.jpg']);
    });
});
