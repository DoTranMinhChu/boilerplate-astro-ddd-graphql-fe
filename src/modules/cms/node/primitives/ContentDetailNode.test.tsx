// src/modules/cms/node/primitives/ContentDetailNode.test.tsx
// @vitest-environment jsdom
//
// Task reviewer Finding 1 (Important, whole-branch review of Canvas Editor v2 Task 12): no
// regression test existed for `contentTypeId()`'s fallback precedence — `props.context.
// contextEntryContentTypeId` (threaded down from CmsPageShell.astro's public SSR /
// NodeBuilder.page.tsx's canvas `canvasContext()`) must win over the legacy static
// `props.node.props.contentTypeId` when BOTH are present, and the static field must still be
// used as a fallback for pages that predate the context field. See node.types.ts's
// `NodeRenderContext.contextEntryContentTypeId` doc + ContentDetailNode.tsx's `contentTypeId()`.
//
// Same jsdom `matchMedia` gap already hit + fixed by nodeRegistry.test.ts/CustomCodeNode.test.ts/
// applyAnimationTimeline.test.ts: ContentDetailNode.tsx statically imports
// `@/modules/cms/animation/useAnimate`, which statically imports `./presetRegistry`, which calls
// `gsap.registerPlugin(ScrollTrigger)` at MODULE-EVALUATION time — that registration reads
// `matchMedia`, which jsdom's `window` doesn't implement. Fixed the same way: stub
// `window.matchMedia` first, then reach `./ContentDetailNode` via a dynamic `import()` inside
// `beforeAll` — static imports are hoisted above any top-level stub placed after them, so a
// plain top-level assignment wouldn't run early enough.
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, waitFor } from '@solidjs/testing-library';
import type { NodeTree, NodeRenderContext } from '../node.types';

if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
}

// Same mocking convention as nodeDataBinding.test.ts: define the mock fn INSIDE the factory
// (referencing an outer `const` here would throw "Cannot access before initialization" — vi.mock
// factories are hoisted above module-scope variable declarations), then re-import the mocked
// module wherever a test needs to assert on/configure the fn.
vi.mock('@/shared/services/contentType/contentType.service', () => ({
    ContentTypeService: {
        getOneContentType: vi.fn(async ({ id }: { id: string }) => ({ id, key: 'ct', label: 'CT', icon: '', fields: [] } as any)),
    },
}));

let ContentDetailNode: typeof import('./ContentDetailNode')['ContentDetailNode'];

beforeAll(async () => {
    ({ ContentDetailNode } = await import('./ContentDetailNode'));
}, 30000);

function node(props: Record<string, any>): NodeTree {
    return {
        id: 'n1',
        pageId: 'p1',
        parentId: undefined,
        order: 0,
        type: 'content-detail',
        layoutMode: 'flow',
        style: {},
        layout: {},
        props,
        dataBinding: { mode: 'static' },
        responsiveOverrides: {},
        createdAt: '',
        updatedAt: '',
        deletedAt: undefined,
        animationRef: undefined,
        children: [],
    } as unknown as NodeTree;
}

function context(overrides: Partial<NodeRenderContext>): NodeRenderContext {
    return {
        contextEntry: {},
        isCustomerLoggedIn: false,
        device: () => 'desktop',
        queryParams: {},
        pathParams: {},
        now: new Date(),
        ...overrides,
    } as NodeRenderContext;
}

describe('ContentDetailNode — contentTypeId() fallback precedence (Canvas Editor v2, Task 12)', () => {
    beforeEach(async () => {
        const { ContentTypeService } = await import('@/shared/services/contentType/contentType.service');
        vi.mocked(ContentTypeService.getOneContentType).mockClear();
    });

    it('prefers context.contextEntryContentTypeId when both context AND the static node.props.contentTypeId are present', async () => {
        const { ContentTypeService } = await import('@/shared/services/contentType/contentType.service');
        const n = node({ contentTypeId: 'ct-static' });
        const ctx = context({ contextEntryContentTypeId: 'ct-from-context' });

        render(() => <ContentDetailNode node={n} context={ctx} />);

        await waitFor(() => expect(ContentTypeService.getOneContentType).toHaveBeenCalledWith({ id: 'ct-from-context' }));
        expect(ContentTypeService.getOneContentType).not.toHaveBeenCalledWith({ id: 'ct-static' });
    });

    it('falls back to the static node.props.contentTypeId when context.contextEntryContentTypeId is undefined', async () => {
        const { ContentTypeService } = await import('@/shared/services/contentType/contentType.service');
        const n = node({ contentTypeId: 'ct-static-only' });
        const ctx = context({ contextEntryContentTypeId: undefined });

        render(() => <ContentDetailNode node={n} context={ctx} />);

        await waitFor(() => expect(ContentTypeService.getOneContentType).toHaveBeenCalledWith({ id: 'ct-static-only' }));
    });
});
