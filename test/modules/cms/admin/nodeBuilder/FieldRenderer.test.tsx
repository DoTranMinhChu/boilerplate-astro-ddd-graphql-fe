// src/modules/cms/admin/nodeBuilder/FieldRenderer.test.tsx
// @vitest-environment jsdom
//
// Phase 8 (targetUI rebuild) dogfooding find: the 'image' control branch mounted
// <InputImage> without `valueMode="url"`, so InputMedia's upload path (see
// InputMedia.test.tsx's own header comment — a previously-fixed id-vs-url bug for OTHER
// consumers) defaulted to emitting the bare Media `id`. Every image-primitive/Section
// image field driven through this FieldRenderer stores that value verbatim as
// `node.props.src`/`node.props.image`, and ImageNode.tsx (src/modules/cms/node/
// primitives/ImageNode.tsx:215) renders it directly as `<img src={src()}>` with no
// id→url lookup step — so a freshly-uploaded image always rendered as a broken image
// (the bare id resolves as a relative URL against the current admin route, e.g.
// `/admin/cms/node-builder?pageId=...` → `/admin/cms/{id}`, which 200s with the SPA's
// own index.html, not the image). Reproduced live via a real S3-backed upload in the
// Node Builder's Hero background field. Fix: pass `valueMode="url"`, matching the exact
// prop InputMedia.test.tsx already documents as the fix for this bug class elsewhere.
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, fireEvent, waitFor } from '@solidjs/testing-library';
import type { FieldDescriptor } from '@/modules/cms/node/node.fieldSchema.types';

if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
        matches: false, media: query, onchange: null,
        addListener: () => {}, removeListener: () => {},
        addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
}
if (!('IntersectionObserver' in window)) {
    (window as any).IntersectionObserver = class {
        constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() { return []; }
    };
}
if (!('createObjectURL' in URL)) {
    (URL as any).createObjectURL = () => 'blob:test';
}

// InputImage (unlike plain InputMedia) runs every file through `compressImageFile`
// (compressorjs, real Image/Canvas decoding) before upload — jsdom has no real canvas,
// so the compressor's success/error callbacks never fire and the chain hangs forever.
// Stub it as an identity passthrough so the upload path under test can actually resolve;
// InputMedia.test.tsx sidesteps this same gap by testing InputMedia directly instead of
// through InputImage.
vi.mock('@core/helpers/image', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@core/helpers/image')>();
    return { ...actual, compressImageFile: async (file: File) => file };
});

let FieldRenderer: typeof import('@modules/cms/admin/nodeBuilder/FieldRenderer')['FieldRenderer'];
let setBaseConfig: typeof import('@core/components/config/BaseConfig')['setBaseConfig'];

beforeAll(async () => {
    ({ FieldRenderer } = await import('@modules/cms/admin/nodeBuilder/FieldRenderer'));
    ({ setBaseConfig } = await import('@core/components/config/BaseConfig'));
}, 30000);

function makeFile(name: string) {
    return new File(['x'], name, { type: 'image/png' });
}

/** Same FileList-shaping workaround InputMedia.test.tsx uses — testing-library's
 * fireEvent.change assigns a plain array to `input.files`, which lacks `.item()`. */
function uploadFiles(input: HTMLInputElement, files: File[]) {
    const fileList = Object.assign([...files], { item: (i: number) => files[i] ?? null });
    Object.defineProperty(input, 'files', { value: fileList, configurable: true });
    fireEvent.change(input);
}

function mockUploadMedia() {
    const create = vi.fn(async (_file: File) => ({
        id: 'media-1', url: 'https://cdn.test/media-1.jpg', fileName: 'f.png', fileSize: 100,
    }));
    setBaseConfig({ uploadMedia: { create } } as any);
    return create;
}

describe("FieldRenderer's 'image' control", () => {
    it('a freshly-uploaded image reports the real Media url, not the bare id — so ImageNode.tsx\'s direct `<img src>` gets a renderable value', async () => {
        mockUploadMedia();
        const onChange = vi.fn();
        const field: FieldDescriptor = { key: 'src', control: 'image', labelKey: 'cms.node.image.src' as any };
        const { container } = render(() => (
            <FieldRenderer field={field} value="" onChange={onChange} />
        ));
        const input = container.querySelector('input[type="file"]') as HTMLInputElement;
        expect(input).toBeTruthy();
        uploadFiles(input, [makeFile('a.png')]);

        await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('https://cdn.test/media-1.jpg'));
        expect(onChange).not.toHaveBeenCalledWith('media-1');
    });
});
