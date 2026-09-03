// src/modules/cms/node/primitives/CustomCodeNode.tsx
//
// Intentionally NOT passed through DOMPurify (admin-authored content, same trust tier as any
// other admin-edited field — sanitizing would strip <script> and defeat the feature). <script>
// inserted via .innerHTML= never executes per the DOM spec, so direct/shadow modes must manually
// recreate <script> elements. Must use createEffect (not one-shot onMount) because
// NodeRenderer.tsx dispatches primitives via a bare function call with no Solid component
// boundary, so onMount/plain `if` never re-observe later prop changes.
import { createMemo, createEffect, onCleanup, Switch, Match } from 'solid-js';
import type { NodeComponentProps } from '../nodeRegistry';
import { applyNodeStyle } from '../applyNodeStyle';
import { nodeAnimation } from '../useNodeAnimation';
import type { AnimationTimeline } from '../animationTimeline.types';
import { ECodeIsolationMode } from '../node.constants';

void nodeAnimation;

export interface CustomCodeProps {
    html?: string;
    css?: string;
    js?: string;
    isolationMode?: ECodeIsolationMode;
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

/** Injects `css`/`html`/`js` into `container` (a plain element for 'direct' mode, a
 * ShadowRoot for 'shadow' mode) and returns a cleanup function that removes everything
 * it inserted. Called from a `createEffect`, never `onMount` — see header comment. */
function injectInto(container: ParentNode & Node, html: string, css: string, js: string): () => void {
    const styleEl = document.createElement('style');
    styleEl.textContent = css;
    container.appendChild(styleEl);

    const htmlContainer = document.createElement('div');
    htmlContainer.innerHTML = html;
    container.appendChild(htmlContainer);

    let scriptEls = executeScriptsIn(html, container);

    // `js` is a separate bare-script field (distinct from any <script> already inside
    // `html`) — support both authoring styles: a full embed snippet pasted into `html`,
    // or plain script text typed into the dedicated `js` field.
    if (js.trim()) {
        const bareScript = document.createElement('script');
        bareScript.textContent = js;
        container.appendChild(bareScript);
        scriptEls = [...scriptEls, bareScript];
    }

    return () => {
        styleEl.remove();
        htmlContainer.remove();
        scriptEls.forEach((s) => s.remove());
    };
}

/** Task review (Important): naive template-string interpolation into `srcdoc` doesn't
 * account for a literal `</script`/`</style` substring appearing INSIDE the admin's own
 * js/css (e.g. inside a JS string literal or comment) — the iframe's HTML parser would
 * treat that substring as the real closing tag regardless of JS/CSS syntax context,
 * silently truncating the embedded code with no error surfaced. `</tagName` is escaped
 * to `<\/tagName` — a real HTML parser never recognizes `<\` as the start of a closing
 * tag (a tag name must start with an ASCII letter), so this can't prematurely close the
 * element; once inside the still-open <script>, a JS engine reads `\/` as just an
 * escaped `/`, so the runtime string value is unaffected. (For `<style>`, this is an
 * intentionally narrow, best-effort mitigation — CSS has no equivalent backslash-escape
 * convention, but a literal `</style` inside authored CSS is a rare edge case and this
 * at minimum prevents the tag from closing early.) */
export function escapeClosingTag(str: string, tagName: string): string {
    return str.replace(new RegExp(`</(${tagName})`, 'gi'), '<\\/$1');
}

interface ModeProps {
    html: string;
    css: string;
    js: string;
    style: Record<string, string>;
    animationRef: AnimationTimeline | undefined;
}

function DirectMode(props: ModeProps) {
    let ref: HTMLDivElement | undefined;
    createEffect(() => {
        if (!ref) return;
        const cleanup = injectInto(ref, props.html, props.css, props.js);
        onCleanup(cleanup);
    });
    return <div use:nodeAnimation={props.animationRef} ref={ref} style={props.style} />;
}

function ShadowMode(props: ModeProps) {
    let ref: HTMLDivElement | undefined;
    createEffect(() => {
        const container = ref?.shadowRoot ?? ref?.attachShadow({ mode: 'open' });
        if (!container) return;
        const cleanup = injectInto(container, props.html, props.css, props.js);
        onCleanup(cleanup);
    });
    return <div use:nodeAnimation={props.animationRef} ref={ref} style={props.style} />;
}

function SandboxedMode(props: ModeProps) {
    const srcdoc = () =>
        `<!doctype html><html><head><style>${escapeClosingTag(props.css, 'style')}</style></head><body>${props.html}<script>${escapeClosingTag(props.js, 'script')}<\/script></body></html>`;
    return (
        <iframe
            use:nodeAnimation={props.animationRef}
            sandbox="allow-scripts"
            srcdoc={srcdoc()}
            style={{ ...props.style, border: 'none', width: props.style.width ?? '100%', height: props.style.height ?? '200px' }}
        />
    );
}

export function CustomCodeNode(props: NodeComponentProps) {
    const codeProps = createMemo<CustomCodeProps>(() => (props.node.props ?? {}) as CustomCodeProps);
    const mode = () => codeProps().isolationMode ?? ECodeIsolationMode.SHADOW;
    const wrapperStyle = () => applyNodeStyle(props.node.style ?? {}, props.node.responsiveOverrides, props.context.device());
    const html = () => codeProps().html ?? '';
    const css = () => codeProps().css ?? '';
    const js = () => codeProps().js ?? '';

    return (
        <Switch fallback={<ShadowMode html={html()} css={css()} js={js()} style={wrapperStyle()} animationRef={props.node.animationRef} />}>
            <Match when={mode() === ECodeIsolationMode.DIRECT}>
                <DirectMode html={html()} css={css()} js={js()} style={wrapperStyle()} animationRef={props.node.animationRef} />
            </Match>
            <Match when={mode() === ECodeIsolationMode.SHADOW}>
                <ShadowMode html={html()} css={css()} js={js()} style={wrapperStyle()} animationRef={props.node.animationRef} />
            </Match>
            <Match when={mode() === ECodeIsolationMode.SANDBOXED}>
                <SandboxedMode html={html()} css={css()} js={js()} style={wrapperStyle()} animationRef={props.node.animationRef} />
            </Match>
        </Switch>
    );
}
