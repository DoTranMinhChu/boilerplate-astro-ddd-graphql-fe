// src/modules/cms/node/primitives/CustomCodeNode.tsx
//
// Phase 2 (Widget Registry v2) — Custom-Code node: admin-authored raw HTML/CSS/JS,
// NOT passed through DOMPurify (see plan's Global Constraints — sanitizing would strip
// <script> and defeat the feature). Trust model matches Webflow/Framer/WordPress's
// "Embed" block: this is admin-authored CMS content (same trust level as any other
// field an authenticated admin can edit), not third-party/visitor input.
//
// Browser quirk this file works around: a <script> tag inserted via `.innerHTML =`
// never executes (security measure baked into the DOM spec) — every mode below that
// injects HTML via innerHTML (direct/shadow) must manually recreate <script> elements
// via `document.createElement('script')` + copy attributes/textContent, then append,
// which DOES execute. The `sandboxed` mode sidesteps this entirely: its `srcdoc` is a
// real document load, where <script> tags execute normally.
import { onMount, onCleanup, createMemo } from 'solid-js';
import type { NodeComponentProps } from '../nodeRegistry';
import { applyNodeStyle } from '../applyNodeStyle';

export interface CustomCodeProps {
    html?: string;
    css?: string;
    js?: string;
    isolationMode?: 'direct' | 'shadow' | 'sandboxed';
}

/** Parses `htmlString` and re-creates every <script> it contains as a fresh, real
 * <script> element appended to `target` — the standard technique every embed-script
 * engine (GTM, Webflow) uses internally to make injected markup's scripts execute.
 * Returns the list of created elements so the caller can remove them on cleanup.
 * Exported (not module-private) so CustomCodeNode.test.ts can exercise it directly
 * without a full Solid component render. */
export function executeScriptsIn(htmlString: string, target: ParentNode & Node): HTMLScriptElement[] {
    const doc = new DOMParser().parseFromString(htmlString, 'text/html');
    const created: HTMLScriptElement[] = [];
    doc.querySelectorAll('script').forEach((oldScript) => {
        const newScript = document.createElement('script');
        for (const attr of Array.from(oldScript.attributes)) newScript.setAttribute(attr.name, attr.value);
        newScript.textContent = oldScript.textContent;
        target.appendChild(newScript);
        created.push(newScript);
    });
    return created;
}

export function CustomCodeNode(props: NodeComponentProps) {
    const codeProps = createMemo<CustomCodeProps>(() => (props.node.props ?? {}) as CustomCodeProps);
    const mode = () => codeProps().isolationMode ?? 'shadow';

    let directWrapperRef: HTMLDivElement | undefined;
    let shadowWrapperRef: HTMLDivElement | undefined;

    // 'direct' and 'shadow' modes both need to inject markup + manually re-execute
    // scripts on mount, and clean up everything they inserted on unmount (same
    // discipline NodeRenderer.tsx's `registerElement` cleanup already established in
    // Phase 1 — a node hidden/deleted must never leak DOM or running listeners).
    onMount(() => {
        if (mode() === 'sandboxed') return; // iframe handles its own script execution via srcdoc load
        const container = mode() === 'shadow'
            ? (shadowWrapperRef?.shadowRoot ?? shadowWrapperRef?.attachShadow({ mode: 'open' }))
            : directWrapperRef;
        if (!container) return;

        const { html = '', css = '', js = '' } = codeProps();
        const styleEl = document.createElement('style');
        styleEl.textContent = css;
        container.appendChild(styleEl);

        const htmlContainer = document.createElement('div');
        htmlContainer.innerHTML = html;
        container.appendChild(htmlContainer);

        let scriptEls = executeScriptsIn(html, container);

        // `js` is a separate bare-script field (distinct from any <script> already
        // inside `html`) — support both authoring styles: a full embed snippet pasted
        // into `html`, or plain script text typed into the dedicated `js` field.
        if (js.trim()) {
            const bareScript = document.createElement('script');
            bareScript.textContent = js;
            container.appendChild(bareScript);
            scriptEls = [...scriptEls, bareScript];
        }

        onCleanup(() => {
            styleEl.remove();
            htmlContainer.remove();
            scriptEls.forEach((s) => s.remove());
        });
    });

    const wrapperStyle = () => applyNodeStyle(props.node.style ?? {});

    if (mode() === 'sandboxed') {
        const { html = '', css = '', js = '' } = codeProps();
        const srcdoc = `<!doctype html><html><head><style>${css}</style></head><body>${html}<script>${js}<\/script></body></html>`;
        return <iframe sandbox="allow-scripts" srcdoc={srcdoc} style={{ ...wrapperStyle(), border: 'none', width: wrapperStyle().width ?? '100%', height: wrapperStyle().height ?? '200px' }} />;
    }

    if (mode() === 'shadow') {
        return <div ref={shadowWrapperRef} style={wrapperStyle()} />;
    }

    return <div ref={directWrapperRef} style={wrapperStyle()} />;
}
